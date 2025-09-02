import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { auth } from '../service/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useTheme } from '../service/themeContext';

const ResetPassword = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }
  
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }
  
    if (newPassword.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.');
      return;
    }
  
    try {
      const user = auth.currentUser;
  
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, oldPassword);
  
        // Step 1: Re-authenticate
        await reauthenticateWithCredential(user, credential);
  
        // Step 2: Update password
        await updatePassword(user, newPassword);
  
        Alert.alert('Success', 'Password updated successfully.');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'User not signed in.');
      }
    } catch (error) {
      console.error('Password update error:', error);
      Alert.alert('Error', error.message || 'Failed to update password.');
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.darkBackground]}>
      <Text style={[styles.title, isDarkMode && styles.darkText]}>Change Password</Text>

      <TextInput
        style={[styles.input, isDarkMode && styles.darkInput]}
        placeholder="Current Password"
        placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
        secureTextEntry
        onChangeText={setOldPassword}
        value={oldPassword}
      />

      <TextInput
        style={[styles.input, isDarkMode && styles.darkInput]}
        placeholder="New Password"
        placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
        secureTextEntry
        onChangeText={setNewPassword}
        value={newPassword}
      />
      <TextInput
        style={[styles.input, isDarkMode && styles.darkInput]}
        placeholder="Confirm Password"
        placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
        secureTextEntry
        onChangeText={setConfirmPassword}
        value={confirmPassword}
      />

      <TouchableOpacity style={[styles.button, isDarkMode && styles.darkButton]} onPress={handleChangePassword}>
        <Text style={styles.buttonText}>Update Password</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, isDarkMode && styles.darkText]}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ResetPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3c72',
    justifyContent: 'center',
    padding: 24,
  },
  darkBackground: {
    backgroundColor: '#000',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  darkText: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#000',
  },
  darkInput: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
  },
  button: {
    backgroundColor: '#ff6a00',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
    marginBottom: 20,
  },
  darkButton: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  backText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});