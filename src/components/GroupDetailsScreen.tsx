import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../service/themeContext'; // Adjust path if needed

const GroupDetailsScreen = () => {
  const route = useRoute();
  const { groupId, groupName = '', members = [] } = route.params || {};

  const { isDarkMode } = useTheme();
  const styles = getStyles(isDarkMode);

  const offerRide = () => {
    console.log(`Offering ride to members of ${groupName}`);
    // Optional: Add Firebase notification logic here
    // sendRideOfferNotification(members);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{groupName}</Text>
      <Text style={styles.memberListText}>
        Members: {members.length ? members.join(', ') : 'No members'}
      </Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <Text style={styles.memberName}>{item}</Text>
          </View>
        )}
      />
      <TouchableOpacity style={styles.button} onPress={offerRide}>
        <Text style={styles.buttonText}>Offer a Ride</Text>
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: isDarkMode ? '#121212' : '#ffffff',
    },
    heading: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 10,
      color: isDarkMode ? '#f3f4f6' : '#111827',
    },
    memberListText: {
      fontSize: 16,
      marginBottom: 10,
      color: isDarkMode ? '#d1d5db' : '#374151',
    },
    memberCard: {
      backgroundColor: isDarkMode ? '#1f2937' : '#f8f9fa',
      padding: 10,
      borderRadius: 6,
      marginBottom: 5,
    },
    memberName: {
      color: isDarkMode ? '#f9fafb' : '#111827',
    },
    button: {
      backgroundColor: '#3b82f6',
      padding: 10,
      borderRadius: 8,
      marginTop: 20,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

export default GroupDetailsScreen;
