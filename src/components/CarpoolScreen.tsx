import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../service/firebase';
import { useTheme } from '../service/themeContext';

interface Trip {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  [key: string]: any; // For any additional properties
}

interface User {
  id: string;
  isActive: boolean;
  [key: string]: any; // For any additional properties
}

const CarpoolScreen = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);

  useEffect(() => {
    const carpoolRef = collection(db, 'carpool');
    const unsubscribeTrips = onSnapshot(carpoolRef, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Trip[];
      setTrips(tripsData);
    });

    const usersRef = collection(db, 'users');
    const activeUsersQuery = query(usersRef, where('isActive', '==', true));
    const unsubscribeUsers = onSnapshot(activeUsersQuery, (snapshot) => {
      const activeUsersList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as User[];
      setActiveUsers(activeUsersList);
    });

    return () => {
      unsubscribeTrips();
      unsubscribeUsers();
    };
  }, []);

  const handleGroupClick = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      navigation.navigate('GroupDetails' as never, {
        groupId: trip.id,
        route: `${trip.from} ➝ ${trip.to}`,
        date: trip.date,
        time: trip.time,
      } as never);
    }
  };

  const handleOfferRide = (tripId) => {
    navigation.navigate('OfferRide', {
      tripId,
      users: activeUsers,
    });
  };

  const handleInboxClick = () => {
    navigation.navigate('Inbox');
  };

  const themeStyles = getStyles(isDarkMode);

  return (
    <View style={themeStyles.container}>
      <Text style={themeStyles.heading}>Available Carpool Trips</Text>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={themeStyles.card}>
            <Text style={themeStyles.driverName}>
              {item.from} ➝ {item.to}
            </Text>
            <Text style={themeStyles.text}>Date: {item.date}</Text>
            <Text style={themeStyles.text}>Time: {item.time}</Text>
            <TouchableOpacity style={themeStyles.button} onPress={() => handleGroupClick(item.id)}>
              <Text style={themeStyles.buttonText}>View Members</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[themeStyles.button, themeStyles.offerButton]}
              onPress={() => handleOfferRide(item.id)}
            >
              <Text style={themeStyles.buttonText}>
                Offer a Ride ({activeUsers.length} users online)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={[themeStyles.button, themeStyles.inboxButton]} onPress={handleInboxClick}>
        <Text style={themeStyles.buttonText}>Go to Inbox</Text>
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: isDarkMode ? '#121212' : '#f9f9f9',
    },
    heading: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 10,
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    text: {
      color: isDarkMode ? '#cccccc' : '#333333',
    },
    card: {
      backgroundColor: isDarkMode ? '#1f1f1f' : '#f8f9fa',
      padding: 15,
      borderRadius: 8,
      marginBottom: 10,
    },
    driverName: {
      fontWeight: 'bold',
      fontSize: 18,
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    button: {
      backgroundColor: '#3b82f6',
      padding: 10,
      borderRadius: 8,
      marginTop: 10,
      alignItems: 'center',
    },
    offerButton: {
      backgroundColor: '#34d399',
    },
    inboxButton: {
      backgroundColor: '#f59e0b',
      marginTop: 20,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

export default CarpoolScreen;
