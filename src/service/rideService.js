// service/rideService.js
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export const offerRide = async (driverId, driverName, start, end, seats) => {
  try {
    const rideData = {
      driverId,
      driverName,
      startLocation: start,
      endLocation: end,
      availableSeats: seats,
      timestamp: Timestamp.now(),
      passengers: [],
      status: 'active', // active, completed, cancelled
    };

    const rideRef = await addDoc(collection(db, 'rides'), rideData);
    console.log('Ride added successfully with ID:', rideRef.id);
    return rideRef.id;
  } catch (error) {
    console.error('Error offering ride:', error);
    return null;
  }
};
