import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../service/themeContext';
import { adminService } from '../service/adminService';

const AdminSetup = () => {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('admin@ridewise.com');
  const [password, setPassword] = useState('Admin@123456');
  const [confirmPassword, setConfirmPassword] = useState('Admin@123456');
  const [displayName, setDisplayName] = useState('Admin User');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCreateAdmin = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      const adminUser = await adminService.createAdminUser(email, password, displayName);
      
      if (adminUser) {
        setSuccess(true);
        Alert.alert(
          'Success!',
          `Admin user created successfully!\n\nEmail: ${email}\nPassword: ${password}\n\nPlease save these credentials securely!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to create admin user. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      Alert.alert('Error', 'Failed to create admin user. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAdminLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const adminUser = await adminService.signInAsAdmin(email, password);
      
      if (adminUser) {
        Alert.alert(
          'Success!',
          `Admin login successful!\n\nWelcome, ${adminUser.displayName}!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Admin login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Error testing admin login:', error);
      Alert.alert('Error', 'Admin login failed. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.successContainer}>
          <Text style={[styles.successTitle, isDarkMode && styles.darkText]}>
            ✅ Admin User Created Successfully!
          </Text>
          <Text style={[styles.successText, isDarkMode && styles.darkText]}>
            You can now use these credentials to log in to the admin dashboard:
          </Text>
          <View style={styles.credentialsContainer}>
            <Text style={[styles.credentialLabel, isDarkMode && styles.darkText]}>
              Email: <Text style={styles.credentialValue}>{email}</Text>
            </Text>
            <Text style={[styles.credentialLabel, isDarkMode && styles.darkText]}>
              Password: <Text style={styles.credentialValue}>{password}</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setSuccess(false)}
          >
            <Text style={styles.buttonText}>Create Another Admin</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.content}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          🔐 Admin User Setup
        </Text>
        
        <Text style={[styles.subtitle, isDarkMode && styles.darkText]}>
          Create the first admin user account for the RideWise application.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Display Name</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.darkInput]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter admin display name"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Email</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.darkInput]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter admin email"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Password</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.darkInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter admin password"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.darkInput]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm admin password"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              secureTextEntry
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleCreateAdmin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Admin User</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleTestAdminLogin}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Test Admin Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={[styles.infoTitle, isDarkMode && styles.darkText]}>
            ℹ️ Important Information
          </Text>
          <Text style={[styles.infoText, isDarkMode && styles.darkText]}>
            • This will create a new Firebase Auth user with admin privileges{'\n'}
            • The admin user will have full access to the admin dashboard{'\n'}
            • Store the credentials securely - they cannot be recovered{'\n'}
            • You can create additional admin users later{'\n'}
            • The admin user will be added to both 'users' and 'admins' collections
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  darkContainer: {
    backgroundColor: '#1a1a1a',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  darkInput: {
    borderColor: '#444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  infoContainer: {
    backgroundColor: '#e8f4fd',
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  darkInfoContainer: {
    backgroundColor: '#1a2a3a',
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#28a745',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  credentialsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 8,
    marginBottom: 30,
    width: '100%',
  },
  credentialLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  credentialValue: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
});

export default AdminSetup;
