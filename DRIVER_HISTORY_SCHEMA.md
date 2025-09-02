# 🚗 Driver History Database Schema - RideWise

## 📊 **Overview**
This document defines the complete database schema for the driver history system, ensuring proper data flow from ride creation to completion and history display.

## 🔥 **Firestore Collections Structure**

### **1. `users` Collection (Passengers)**
```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  email: string;                  // User email
  username: string;               // Display name
  userType: 'user';              // Must be 'user'
  createdAt: Date;               // Account creation date
  isActive: boolean;             // Account status
  profile?: {                    // Optional profile info
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  };
}
```

### **2. `drivers` Collection**
```typescript
interface Driver {
  uid: string;                    // Firebase Auth UID
  email: string;                  // Driver email
  username: string;               // Driver username
  userType: 'driver';            // Must be 'driver'
  isVerified: boolean;           // Driver verification status
  status: 'available' | 'unavailable' | 'busy'; // Current status
  vehicleDetails?: {              // Vehicle information
    make: string;
    model: string;
    year: string;
    color: string;
    licensePlate: string;
  };
  createdAt: Date;               // Account creation date
  updatedAt: Date;               // Last update timestamp
}
```

### **3. `history` Collection (Main Ride Records)**
```typescript
interface RideHistory {
  id: string;                    // Document ID
  userID: string;                // Passenger UID
  driverID?: string;             // Driver UID (when assigned)
  rideID: string;                // Realtime DB ride ID
  from: string;                  // Pickup location
  to: string;                    // Destination location
  startLat: number;              // Pickup latitude
  startLong: number;             // Pickup longitude
  endLat: number;                // Destination latitude
  endLong: number;               // Destination longitude
  date: string;                  // Ride date (e.g., "Sun Aug 31 2025")
  time: string;                  // Ride time (ISO string)
  amount: string;                // Ride cost (string for consistency)
  distance: string;              // Distance in km (string for consistency)
  duration: number;              // Duration in seconds
  status: 'requested' | 'active' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  type: 'individual' | 'carpool'; // Ride type
  timestamp: Date;               // When record was created
  userName: string;              // Passenger name
  
  // Driver assignment fields
  driverAccepted?: boolean;      // Whether driver accepted
  acceptedAt?: Date;             // When driver accepted
  driverName?: string;           // Driver's name
  
  // Ride progression fields
  rideStarted?: boolean;         // Whether ride started
  rideStartedAt?: Date;          // When ride started
  rideCompleted?: boolean;       // Whether ride completed
  rideCompletedAt?: Date;        // When ride completed
  
  // Driver earnings (optional)
  driverEarnings?: number;       // Driver's earnings from this ride
}
```

### **4. `carpool` Collection (Optional - for carpool rides)**
```typescript
interface CarpoolRide {
  id: string;                    // Document ID
  rideID: string;                // Realtime DB ride ID
  userID: string;                // Passenger UID
  driverID?: string;             // Driver UID (when assigned)
  from: string;                  // Pickup location
  to: string;                    // Destination location
  date: string;                  // Ride date
  time: string;                  // Ride time
  status: 'requested' | 'active' | 'completed' | 'cancelled';
  amount: number;                // Ride cost
  distance: number;              // Distance in km
  createdAt: Date;               // Creation timestamp
}
```

## ⚡ **Realtime Database Structure**

### **1. `rideRequests` Node**
```typescript
interface RideRequest {
  [requestId: string]: {         // Dynamic key for each request
    userID: string;              // Passenger UID
    userName: string;            // Passenger name
    from: string;                // Pickup location
    to: string;                  // Destination location
    startLat: number;            // Pickup latitude
    startLong: number;           // Pickup longitude
    endLat: number;              // Destination latitude
    endLong: number;             // Destination longitude
    date: string;                // Ride date
    time: string;                // Ride time
    requestedAt: number;         // Request timestamp
    status: 'requested' | 'active' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
    distance: number;            // Distance in km
    duration: number;            // Duration in seconds
    amount: number;              // Ride cost
    driverAccepted: boolean;     // Driver acceptance status
    
    // Driver information (when accepted)
    driverId?: string;           // Driver's UID
    driverName?: string;         // Driver's name
    driverPhone?: string;        // Driver's phone
    driverLocation?: {           // Driver's current location
      latitude: number;
      longitude: number;
      timestamp: string;
    };
    vehicleInfo?: {              // Vehicle details
      make: string;
      model: string;
      color: string;
      licensePlate: string;
      year: string;
    };
    
    // Ride progression
    acceptedAt?: string;         // Driver acceptance timestamp
    rideStartedAt?: string;      // Ride start timestamp
    rideCompletedAt?: string;    // Ride completion timestamp
    rideCancelledAt?: string;    // Ride cancellation timestamp
  };
}
```

### **2. `rideTracking` Node**
```typescript
interface RideTracking {
  [rideId: string]: {            // Dynamic key for each ride
    driverLocation: {            // Driver's current location
      latitude: number;
      longitude: number;
      timestamp: string;
      accuracy?: number;
      speed?: number;
      heading?: number;
    };
    lastUpdated: string;         // Last location update timestamp
  };
}
```

## 🔄 **Data Flow Diagram**

```
1. Passenger Books Ride
   ↓
   rideRequests (Realtime DB) + history (Firestore)
   ↓
2. Driver Accepts Ride
   ↓
   Update rideRequests + Update history.driverID
   ↓
3. Ride Progresses
   ↓
   Update rideRequests.status + Update history.status
   ↓
4. Ride Completes
   ↓
   Update rideRequests + Update history + Driver History Display
```

## 📱 **Driver History Query Logic**

### **Correct Query for Driver History:**
```typescript
// In DriverRideHistory.tsx
const fetchRideHistory = async () => {
  const uid = auth.currentUser?.uid;
  
  // Query the main 'history' collection for rides where this driver was assigned
  const q = query(
    collection(db, 'history'),
    where('driverID', '==', uid)
  );
  
  const querySnapshot = await getDocs(q);
  // Process results...
};
```

### **Key Points:**
1. **Use `history` collection** (not `driverHistory`)
2. **Query by `driverID` field** (not `driverId`)
3. **Include both individual and carpool rides**
4. **Sort by timestamp** for proper ordering

## 🚨 **Common Issues & Solutions**

### **Issue 1: Driver History Not Showing**
- **Cause**: Querying wrong collection or field
- **Solution**: Use `history` collection with `driverID` field

### **Issue 2: Missing Driver Information**
- **Cause**: `driverID` not being saved when ride accepted
- **Solution**: Update history document when driver accepts ride

### **Issue 3: Incomplete Ride Status**
- **Cause**: Status not being updated in both databases
- **Solution**: Update both Realtime DB and Firestore

## ✅ **Implementation Checklist**

- [ ] **Ride Creation**: Save to both `rideRequests` and `history`
- [ ] **Ride Acceptance**: Update `driverID` in history collection
- [ ] **Ride Progression**: Update status in both databases
- [ ] **Ride Completion**: Mark as completed in all collections
- [ ] **Driver History**: Query `history` collection by `driverID`
- [ ] **Data Consistency**: Ensure both databases stay synchronized

## 🔧 **Testing the System**

1. **Create a ride request** (should appear in both databases)
2. **Accept the ride** (should update `driverID` in history)
3. **Complete the ride** (should update status everywhere)
4. **Check driver history** (should show completed ride)

This schema ensures that driver history is properly maintained and displayed, with all ride data consistently stored across both Firestore and Realtime Database.
