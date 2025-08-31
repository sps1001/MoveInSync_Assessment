import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, writeBatch, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, push, set ,get,update, onValue, off} from 'firebase/database';
import { auth, db, realtimeDb } from '../service/firebase';
import { useTheme } from '../service/themeContext';
import * as Location from 'expo-location';
import { navigate } from 'expo-router/build/global-state/routing';
import locationTrackingService from '../service/locationTrackingService';

import AsyncStorage from '@react-native-async-storage/async-storage';

const RideRequests = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  
  const [rideRequests, setRideRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [driverAvailable, setDriverAvailable] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'requested' | 'completed'>('all');


  useEffect(() => {
    const checkDriverStatus = async () => {
      // Use Firebase Auth instead of AsyncStorage
      const uid = auth.currentUser?.uid;
      if (!uid) {
        console.log('No authenticated user found');
        return;
      }

      const driverDoc = await getDoc(doc(db, 'drivers', uid));
      if (driverDoc.exists()) {
        const data = driverDoc.data();
        setDriverAvailable(data.status === 'available' ? true : false);
        setIsVerified(data.isVerified);
        console.log('Driver status checked:', { uid, status: data.status, isVerified: data.isVerified });
      } else {
        setDriverAvailable(false);
        console.log('No driver document found for UID:', uid);
      }
    };

    checkDriverStatus();
  }, []);

  // Add real-time listener for driver status changes
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const driverRef = doc(db, 'drivers', uid);
    
    const unsubscribe = onSnapshot(driverRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const newStatus = data.status === 'available' ? true : false;
        setDriverAvailable(newStatus);
        setIsVerified(data.isVerified);
        console.log('Driver status updated in real-time:', { uid, status: data.status, isVerified: data.isVerified });
        
        // If driver just became available, automatically fetch ride requests
        if (newStatus && rideRequests.length === 0) {
          console.log('Driver became available, fetching ride requests...');
          fetchRideRequests();
        }
      }
    });

    return () => unsubscribe();
  }, [rideRequests.length]);
  
  useEffect(() => {
    // Only fetch ride requests if driver is available
    if (driverAvailable) {
      fetchRideRequests();
    }
  }, [driverAvailable]);
  
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (val: number) => (val * Math.PI) / 180;
    const R = 6371; // Earth radius in km
  
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
  
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  const fetchRideRequests = async () => {
    try {
      setLoading(true);
      
      // Check if driver is available before proceeding
      if (!driverAvailable) {
        console.log('Driver not available, skipping ride request fetch');
        setRideRequests([]);
        setLoading(false);
        return;
      }

      // Get driver's current location
      console.log('Requesting location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission denied');
        console.error('Location permission denied');
        return;
      }
      console.log('Fetching current location...');
      const {
        coords: { latitude: driverLat, longitude: driverLon },
      } = await Location.getCurrentPositionAsync({});

      console.log(`Driver's location: ${driverLat}, ${driverLon}`);
  
      const snapshot = await get(ref(realtimeDb, 'rideRequests'));
      console.log('All ride requests:', snapshot.val()); 
  
      if (snapshot.exists()) {
        const data = snapshot.val();
        const filtered: any[] = [];
  
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          // Include both requested and completed rides
          if (
            (value.status === 'requested' || value.status === 'completed') &&
            value.startLat &&
            value.startLong
          ) {
            const distance = haversineDistance(
              driverLat,
              driverLon,
              value.startLat,
              value.startLong
            );
            console.log(`Distance to ${key}: ${distance} km`);
  
            if (distance <= 25) {
              filtered.push({
                id: key,
                ...value,
                dist: distance.toFixed(2)
              });
            }
          }
        });
        console.log('Filtered ride requests:', filtered);
        setRideRequests(filtered);
      } else {
        setRideRequests([]);
      }
    } catch (err) {
      console.error("Error fetching ride requests:", err);
      Alert.alert("Failed", "Could not fetch ride requests");
    } finally {
      setLoading(false);
    }
  };
  
  // New function to reset rejected rides to requested
  const resetRejectedRides = async () => {
    try {
      setLoading(true);
      
      // Fetch rejected rides
      const rejectedQuery = query(
        collection(db, 'carpool'),
        where('status', '==', 'rejected')
      );
      
      const rejectedSnapshot = await getDocs(rejectedQuery);
      
      if (rejectedSnapshot.empty) {
        Alert.alert('Info', 'No rejected rides to reset');
        setLoading(false);
        return;
      }
      
      // Use batch to update multiple documents
      const batch = writeBatch(db);
      let count = 0;
      
      rejectedSnapshot.forEach((document) => {
        batch.update(doc(db, 'carpool', document.id), {
          status: 'requested',
          rejectedBy: null,
          rejectedAt: null
        });
        count++;
      });
      
      await batch.commit();
      Alert.alert('Success', `${count} rejected rides have been reset and are now available`);
      
      // Refresh the list to show the newly available rides
      fetchRideRequests();
      
    } catch (error) {
      console.error('Error resetting rejected rides:', error);
      Alert.alert('Error', `Failed to reset rejected rides: ${error.message}`);
      setLoading(false);
    }
  };
  
  const fetchAllRides = async () => {
    try {
      setLoading(true);
      
      // Fetch both requested and rejected rides
      const q = query(
        collection(db, 'carpool'),
        where('status', 'in', ['requested', 'rejected'])
      );
      
      const querySnapshot = await getDocs(q);
      const requests: any[] = [];
      
      querySnapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setRideRequests(requests);
      Alert.alert('Refreshed', `Found ${requests.length} rides (including rejected)`);
    } catch (error) {
      console.error('Error fetching all rides:', error);
      Alert.alert('Error', 'Could not load all ride requests');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAcceptRide = async (rideId: string) => {
    if (!auth.currentUser) return;
  
    try {
      setProcessingId(rideId);
      
      const uid = auth.currentUser?.uid;
      if (!uid) {
        throw new Error('Driver ID not found');
      }
      
      const driverRef = doc(db, 'drivers', uid);
      const driverSnap = await getDoc(driverRef);
  
      let driverData: any;
      let vehicleInfo: any;
      if (driverSnap.exists()) {
         driverData = driverSnap.data();
         console.log("Driver Data:", driverData);
         vehicleInfo = driverData.vehicleInfo;
        
        console.log("Vehicle Info:", vehicleInfo);
      }
      const rideRef = ref(realtimeDb, `rideRequests/${rideId}`);
      const rideSnap = await get(rideRef);
  
      if (!rideSnap.exists()) {
        throw new Error("Ride not found");
      }
  
      const rideData = rideSnap.val();
      const origin = {
        latitude: rideData.startLat,
        longitude: rideData.startLong
      };
      const destination = {
        latitude: rideData.endLat,
        longitude: rideData.endLong
      };
      let driverName: string;
      
      const driverDoc = await getDoc(doc(db, 'drivers', uid));
      if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          driverName = driverData.username;
      } else {
          driverName = 'Driver';
      }
      const timestamp = new Date();
  
      // ✅ Get driver current location using expo-location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }
  
      const {
        coords: { latitude, longitude },
      } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
  
      // ✅ Update ride request in Realtime DB
      await update(rideRef, {
        status: 'active',
        driverId: auth.currentUser.uid,
        driverName: driverName,
        driverPhone: auth.currentUser.phoneNumber || 'N/A',
        driverLocation: {
          latitude,
          longitude,
        },
        vehicleInfo: {
          make: vehicleInfo?.make || 'N/A',
          model: vehicleInfo?.model || 'N/A',
          color: vehicleInfo?.color || 'N/A',
          licensePlate: vehicleInfo?.licensePlate || 'N/A',
          year: vehicleInfo?.year || 'N/A',
        },
        driverAccepted: true,
        acceptedAt: new Date().toISOString(),
      });

      // ✅ Start location tracking for this ride
      try {
        await locationTrackingService.startDriverTracking(rideId, auth.currentUser.uid);
        console.log('🚗 Location tracking started for ride:', rideId);
      } catch (trackingError) {
        console.error('Warning: Could not start location tracking:', trackingError);
        // Don't fail the ride acceptance if tracking fails
      }
  
      setRideRequests(prev => prev.filter(ride => ride.id !== rideId));
      Alert.alert('Success', 'Ride accepted successfully!');
      (navigation as any).navigate('DriverRouteScreen', {
        origin,
        destination,
        realtimeId: rideId,
      });
  
    } catch (error: any) {
      console.error('Error accepting ride:', error);
      Alert.alert('Error', `Failed to accept ride: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };
  

  const handleRejectRide = async (rideId) => {
    if (!auth.currentUser) return;
  
    try {
      setProcessingId(rideId);
  
      const rideRef = ref(realtimeDb, `rideRequests/${rideId}`);
      const rideSnap = await get(rideRef);
  
      if (!rideSnap.exists()) {
        throw new Error("Ride not found");
      }
  
      await update(rideRef, {
        status: 'rejected',
        rejectedBy: auth.currentUser.uid,
        rejectedAt: new Date().toISOString()
      });
  
      // ✅ Update UI
      setRideRequests(prev => prev.filter(ride => ride.id !== rideId));
      Alert.alert('Success', 'Ride request rejected');
    } catch (error) {
      console.error('Error rejecting ride:', error);
      Alert.alert('Error', `Failed to reject ride: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };
  
  const styles = getStyles(isDarkMode);
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  if (!driverAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Text style={styles.iconText}>🚫</Text>
        </View>
        <Text style={styles.title}>You're Unavailable</Text>
        <Text style={styles.subtitle}>
          To receive ride requests, please change your status to available.
        </Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={() => {
            // Force refresh driver status
            const uid = auth.currentUser?.uid;
            if (uid) {
              getDoc(doc(db, 'drivers', uid)).then((snapshot) => {
                if (snapshot.exists()) {
                  const data = snapshot.data();
                  setDriverAvailable(data.status === 'available' ? true : false);
                  setIsVerified(data.isVerified);
                }
              });
            }
          }}
        >
          <Text style={styles.refreshButtonText}>Refresh Status</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!isVerified) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-lg font-semibold text-gray-600">You are not verified . Verify your details first</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Debug status display */}
      <View style={[styles.debugStatus, { backgroundColor: driverAvailable ? '#10b981' : '#ef4444' }]}>
        <Text style={styles.debugStatusText}>
          Driver Status: {driverAvailable ? 'Available' : 'Unavailable'} | 
          Verified: {isVerified ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.debugStatusText}>
          Auth UID: {auth.currentUser?.uid || 'None'} | 
          Loading: {loading ? 'Yes' : 'No'}
        </Text>
      </View>
      
      <View style={styles.headerRow}>
        <Text style={styles.title}>Available Ride Requests</Text>
      </View>
      
      {rideRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No ride requests available</Text>
          <View style={styles.refreshButtonGroup}>
            <TouchableOpacity style={styles.refreshButton} onPress={fetchRideRequests}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.refreshButton, styles.advancedRefreshButton]} 
              onPress={resetRejectedRides}
            >
              <Text style={styles.refreshButtonText}>Reset Rejected Rides</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={rideRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.routeText}>{item.from} → {item.to}</Text>
                <View style={[
                  styles.statusBadge,
                  item.status === 'rejected' ? styles.rejectedBadge : styles.requestedBadge
                ]}>
                  <Text style={styles.statusText}>
                    {item.status === 'rejected' ? 'Rejected' : 'Requested'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.dateText}>{item.date} at {item.time}</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Distance from you:</Text>
                <Text style={styles.detailValue}>{item.dist || 'Not specified'} km</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Route Distance :</Text>
                <Text style={styles.detailValue}>{item.distance || 'Not specified'} km</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Est. Fare:</Text>
                <Text style={styles.detailValue}>{item.amount || 'Not calculated'}</Text>
              </View>
              
              {/* Only show action buttons for non-rejected rides */}
              {item.status !== 'Completed' && (
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRide(item.id)}
                    disabled={processingId === item.id}
                  >
                    {processingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Accept</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.rejectButton}
                    onPress={() => handleRejectRide(item.id)}
                    disabled={processingId === item.id}
                  >
                    <Text style={styles.buttonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
};

const getStyles = (isDarkMode) => StyleSheet.create({
  // Styles remain the same
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: isDarkMode ? '#121212' : '#f9f9f9',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#121212' : '#f9f9f9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: isDarkMode ? '#d1d5db' : '#4b5563',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: isDarkMode ? '#f3f4f6' : '#1f2937',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: isDarkMode ? '#9ca3af' : '#6b7280',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  card: {
    backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: isDarkMode ? '#f3f4f6' : '#1f2937',
  },
  dateText: {
    fontSize: 16,
    color: isDarkMode ? '#d1d5db' : '#4b5563',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: isDarkMode ? '#9ca3af' : '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#d1d5db' : '#4b5563',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  acceptButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshButtonGroup: {
    flexDirection: 'row',
    marginTop: 12,
  },
  advancedRefreshButton: {
    backgroundColor: '#6366f1',
    marginLeft: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  requestedBadge: {
    backgroundColor: '#3b82f6',
  },
  rejectedBadge: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 8,
    color: '#6b7280', // Tailwind's gray-500
    textAlign: 'center',
  },
  iconText: {
    fontSize: 60,
    textAlign: 'center',
  },
  debugStatus: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  debugStatusText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
});

export default RideRequests;