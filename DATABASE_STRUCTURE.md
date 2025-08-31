# RideWise Database Structure Guide

## Overview
This document defines the consistent data structure used across the RideWise application to ensure data consistency between Firestore and Realtime Database.

## Collections

### 1. Users Collection (`users`)
**Firestore Collection**
```typescript
interface User {
  uid: string;           // Document ID (Firebase Auth UID)
  username: string;      // User's chosen username
  email: string;         // User's email
  createdAt: Timestamp;  // Account creation timestamp
  userType: 'user' | 'driver' | 'admin'; // User role
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  };
}
```

### 2. Drivers Collection (`drivers`)
**Firestore Collection**
```typescript
interface Driver {
  uid: string;           // Document ID (Firebase Auth UID)
  username: string;      // Driver's username
  email: string;         // Driver's email
  isVerified: boolean;   // Driver verification status
  status: 'available' | 'busy' | 'offline'; // Current status
  vehicleDetails?: {
    make: string;
    model: string;
    year: string;
    plateNumber: string;
    color: string;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    lastUpdated: Timestamp;
  };
  rating: number;        // Average rating (1-5)
  totalRides: number;    // Total completed rides
  createdAt: Timestamp;
}
```

### 3. History Collection (`history`)
**Firestore Collection** - Stores all ride records
```typescript
interface RideHistory {
  id: string;            // Document ID
  userID: string;        // User's UID (consistent field name)
  rideID: string;        // Unique ride identifier
  from: string;          // Starting location
  to: string;            // Destination location
  startLat: number;      // Start latitude
  startLong: number;     // Start longitude
  endLat: number;        // End latitude
  endLong: number;       // End longitude
  date: string;          // Date string (e.g., "Mon Jan 01 2024")
  time: string;          // Time string (e.g., "14:30:00")
  amount: string;        // Ride cost (string for consistency)
  distance: string;      // Distance in km (string for consistency)
  duration: number;      // Duration in seconds
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  type: 'individual' | 'carpool'; // Ride type
  timestamp: Timestamp;  // When the record was created
  driverID?: string;     // Driver's UID (if assigned)
  driverName?: string;   // Driver's name (if assigned)
  userName?: string;     // User's name
}
```

### 4. Ride Requests (`rideRequests`)
**Realtime Database** - For real-time ride matching
```typescript
interface RideRequest {
  userId: string;        // User's UID
  userName: string;      // User's name
  from: string;          // Starting location
  to: string;            // Destination location
  startLat: number;      // Start latitude
  startLong: number;     // Start longitude
  endLat: number;        // End latitude
  endLong: number;       // End longitude
  date: string;          // Date string
  time: string;          // Time string
  requestedAt: number;   // Timestamp
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  distance: number;      // Distance in km
  duration: number;      // Duration in seconds
  amount: number;        // Ride cost
  driverAccepted: boolean; // Whether driver accepted
}
```

### 5. Groups Collection (`groups`)
**Firestore Collection** - For carpooling groups
```typescript
interface Group {
  id: string;            // Document ID
  name: string;          // Group name
  description?: string;  // Group description
  createdBy: string;     // Creator's UID
  members: string[];     // Array of member UIDs
  maxMembers: number;    // Maximum group size
  createdAt: Timestamp;
  isActive: boolean;     // Whether group is active
}
```

### 6. Members Collection (`members`)
**Firestore Collection** - Group membership details
```typescript
interface Member {
  id: string;            // Document ID
  groupID: string;       // Group ID
  userID: string;        // User's UID
  username: string;      // User's username
  joinedAt: Timestamp;   // When they joined
  role: 'admin' | 'member'; // Role in group
}
```

## Key Consistency Rules

### 1. Field Naming
- **Always use `userID`** (not `userId`) in Firestore
- **Always use `rideID`** (not `rideId`) in Firestore
- **Use `driverID`** for driver references
- **Use `groupID`** for group references

### 2. Data Types
- **Amounts**: Store as strings in Firestore for consistency
- **Distances**: Store as strings in Firestore for consistency
- **Timestamps**: Use Firestore Timestamp objects
- **Coordinates**: Use numbers for latitude/longitude

### 3. Status Values
- **Ride Status**: `requested`, `accepted`, `in_progress`, `completed`, `cancelled`
- **Driver Status**: `available`, `busy`, `offline`
- **User Type**: `user`, `driver`, `admin`

### 4. Database Usage
- **Firestore**: For persistent data, user profiles, ride history, groups
- **Realtime Database**: For real-time features like ride requests, live tracking

## Migration Notes

If you have existing data with different field names:
1. Update your code to use the new field names
2. Consider migrating existing data to match the new structure
3. Use fallback values in your components (as implemented in AdminDashboard)

## Example Usage

```typescript
// Creating a new ride request
const rideData = {
  userID: auth.currentUser.uid,
  rideID: generateUniqueId(),
  from: startLocation,
  to: endLocation,
  // ... other fields
};

// Save to both databases
await addDoc(collection(db, 'history'), rideData);
await set(ref(realtimeDb, `rideRequests/${requestId}`), rideData);
```
