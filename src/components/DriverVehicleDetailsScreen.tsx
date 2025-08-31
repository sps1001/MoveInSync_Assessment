import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../service/firebase';
import { useTheme } from '../service/themeContext';

const DriverVehicleDetailsScreen = () => {
  const { isDarkMode } = useTheme();
  const [vehicleDetails, setVehicleDetails] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    licensePlate: '',
  });

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchDetails = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, 'drivers', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.vehicleInfo) {
            setVehicleDetails(data.vehicleInfo);
            setIsEditing(true);
          }
          if (data.isVerified) {
            setIsVerified(true);
          }
        }
      } catch (error) {
        console.error('Error fetching vehicle details:', error);
      }
    };

    fetchDetails();
  }, []);

  const handleSubmit = async () => {
    const { color, licensePlate, make, model, year } = vehicleDetails;

    if (!color || !licensePlate || !make || !model || !year) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      const docRef = doc(db, 'drivers', user.uid);

      await setDoc(
        docRef,
        {
          vehicleInfo: {
            color,
            licensePlate,
            make,
            model,
            year,
          },
          isVerified: true, // ✅ Set to true after valid vehicle info
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setIsVerified(true); // ✅ Update state after save
      Alert.alert('Success', isEditing ? 'Vehicle details updated and verified.' : 'Vehicle details added and verified.');
      setIsEditing(true);
    } catch (error) {
      console.error('Error saving vehicle details:', error);
      Alert.alert('Error', 'Failed to save vehicle details.');
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(isDarkMode);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isEditing ? 'Update Vehicle Details' : 'Add Vehicle Details'}</Text>

      {/* ✅ Verification Badge */}
      <Text style={[styles.verificationStatus, { color: isVerified ? 'green' : '#6b7280' }]}>
        {isVerified ? '🔒 Verified' : '🔓 Not Verified'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Color (e.g., Black)"
        placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
        value={vehicleDetails.color}
        onChangeText={(text) => setVehicleDetails({ ...vehicleDetails, color: text })}
      />

      <TextInput
        style={styles.input}
        placeholder="License Plate (e.g., RJ14BC1234)"
        placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
        value={vehicleDetails.licensePlate}
        onChangeText={(text) => setVehicleDetails({ ...vehicleDetails, licensePlate: text })}
      />

      <TextInput
        style={styles.input}
        placeholder="Make (e.g., Toyota)"
        placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
        value={vehicleDetails.make}
        onChangeText={(text) => setVehicleDetails({ ...vehicleDetails, make: text })}
      />

      <TextInput
        style={styles.input}
        placeholder="Model (e.g., Innova)"
        placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
        value={vehicleDetails.model}
        onChangeText={(text) => setVehicleDetails({ ...vehicleDetails, model: text })}
      />

      <TextInput
        style={styles.input}
        placeholder="Year (e.g., 2020)"
        placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
        keyboardType="numeric"
        value={vehicleDetails.year}
        onChangeText={(text) => setVehicleDetails({ ...vehicleDetails, year: text })}
      />

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {isEditing ? 'Update' : 'Add'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: isDarkMode ? '#121212' : '#f9f9f9',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? '#f3f4f6' : '#1f2937',
      marginBottom: 10,
      textAlign: 'center',
    },
    verificationStatus: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 16,
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
    submitButton: {
      backgroundColor: '#3b82f6',
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    submitButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

export default DriverVehicleDetailsScreen;
