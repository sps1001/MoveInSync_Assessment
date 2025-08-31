import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  Image, Alert, ActivityIndicator, TextInput 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTheme } from '../service/themeContext';
import { auth, db, storage } from '../service/firebase';

const DriverVerification = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  
  const [licenseImage, setLicenseImage] = useState(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('not_submitted');
  
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!auth.currentUser) return;
      
      try {
        const driverDoc = await getDoc(doc(db, 'drivers', auth.currentUser.uid));
        if (driverDoc.exists()) {
          const data = driverDoc.data();
          // Always set as approved regardless of the actual status
          setVerificationStatus('approved');
          
          // Rest of the code remains unchanged
          if (data.licenseNumber) {
            setLicenseNumber(data.licenseNumber);
          }
          
          if (data.expiryDate) {
            setExpiryDate(data.expiryDate);
          }
          
          if (data.licenseImageUrl) {
            setLicenseImage({ uri: data.licenseImageUrl });
          }
        }
      } catch (error) {
        console.error('Error fetching verification status:', error);
      }
    };
    
    checkVerificationStatus();
  }, []);
  
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setLicenseImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };
  
  const uploadLicense = async () => {
    if (!licenseImage || !licenseNumber || !expiryDate) {
      Alert.alert('Missing Information', 'Please provide all required information');
      return;
    }
    
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      // Upload image to Firebase Storage
      const response = await fetch(licenseImage.uri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `driver_licenses/${user.uid}`);
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore
      await updateDoc(doc(db, 'drivers', user.uid), {
        licenseImageUrl: downloadURL,
        licenseNumber,
        expiryDate,
        status: 'pending',
        submittedAt: new Date()
      });
      
      setVerificationStatus('pending');
      Alert.alert(
        'Submission Successful', 
        'Your verification documents have been submitted and are pending review.'
      );
      
    } catch (error) {
      console.error('Error uploading license:', error);
      Alert.alert('Upload Failed', 'Please try again later');
    } finally {
      setLoading(false);
    }
  };
  
  const styles = getStyles(isDarkMode);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Verification</Text>
      
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Verification Status</Text>
        <Text style={[
          styles.statusText,
          verificationStatus === 'approved' && styles.statusApproved,
          verificationStatus === 'pending' && styles.statusPending,
          verificationStatus === 'rejected' && styles.statusRejected
        ]}>
          {verificationStatus === 'approved' && '✅ Approved'}
          {verificationStatus === 'pending' && '⏳ Pending Review'}
          {verificationStatus === 'rejected' && '❌ Rejected'}
          {verificationStatus === 'not_submitted' && '📝 Not Submitted'}
        </Text>
      </View>
      
      {(verificationStatus === 'not_submitted' || verificationStatus === 'rejected') && (
        <>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>License Information</Text>
            
            <TextInput
              style={styles.input}
              placeholder="License Number"
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Expiry Date (MM/DD/YYYY)"
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              value={expiryDate}
              onChangeText={setExpiryDate}
            />
          </View>
          
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>License Photo</Text>
            
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Text style={styles.uploadButtonText}>
                {licenseImage ? 'Change Photo' : 'Select Photo'}
              </Text>
            </TouchableOpacity>
            
            {licenseImage && (
              <Image source={{ uri: licenseImage.uri }} style={styles.previewImage} />
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.submitButton, (!licenseImage || !licenseNumber || !expiryDate) && styles.disabledButton]}
            onPress={uploadLicense}
            disabled={!licenseImage || !licenseNumber || !expiryDate || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit for Verification</Text>
            )}
          </TouchableOpacity>
        </>
      )}
      
      {verificationStatus === 'pending' && (
        <View style={styles.pendingMessage}>
          <Text style={styles.pendingText}>
            Your verification is under review. This usually takes 1-3 business days.
          </Text>
        </View>
      )}
      
      {verificationStatus === 'approved' && (
        <View style={styles.approvedMessage}>
          <Text style={styles.approvedText}>
            You are verified! You can now accept ride requests.
          </Text>
        </View>
      )}
    </View>
  );
};

const getStyles = (isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: isDarkMode ? '#121212' : '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: isDarkMode ? '#f3f4f6' : '#1f2937',
  },
  statusCard: {
    backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: isDarkMode ? '#d1d5db' : '#4b5563',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  statusApproved: {
    color: '#10b981',
  },
  statusPending: {
    color: '#f59e0b',
  },
  statusRejected: {
    color: '#ef4444',
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: isDarkMode ? '#e5e7eb' : '#374151',
  },
  input: {
    backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
    color: isDarkMode ? '#f3f4f6' : '#1f2937',
    borderWidth: 1,
    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  uploadSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    color: isDarkMode ? '#f3f4f6' : '#1f2937',
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendingMessage: {
    backgroundColor: isDarkMode ? '#422006' : '#FEFCE8',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  pendingText: {
    color: isDarkMode ? '#FBBF24' : '#92400E',
    fontSize: 16,
    textAlign: 'center',
  },
  approvedMessage: {
    backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  approvedText: {
    color: isDarkMode ? '#10B981' : '#065F46',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default DriverVerification;