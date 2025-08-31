# 🗄️ COMPLETE DATABASE SCHEMA - RideWise Platform

## 📊 **OVERVIEW**
This document outlines the complete database structure for the RideWise ride-sharing platform, including both Firestore and Realtime Database collections.

---

## 🔥 **FIRESTORE COLLECTIONS**

### 1. **users** Collection
```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  email: string;                  // User email
  username: string;               // Display name
  phoneNumber?: string;           // Phone number
  profilePicture?: string;        // Profile image URL
  pushToken?: string;             // FCM push token
  lastTokenUpdate?: Date;         // Last token update
  createdAt: Date;                // Account creation date
  updatedAt: Date;                // Last profile update
  isVerified: boolean;            // Account verification status
  preferences?: {                  // User preferences
    notifications: boolean;
    darkMode: boolean;
    language: string;
  };
}
```

### 2. **drivers** Collection
```typescript
interface Driver {
  uid: string;                    // Firebase Auth UID
  username: string;               // Driver name
  email: string;                  // Driver email
  phoneNumber?: string;           // Phone number
  isVerified: boolean;            // Driver verification status
  status: 'available' | 'unavailable' | 'busy'; // Current status
  rating: number;                 // Average rating (1-5)
  totalRides: number;             // Total completed rides
  vehicleInfo: {                  // Vehicle details
    make: string;                 // Car make (e.g., "Toyota")
    model: string;                // Car model (e.g., "Camry")
    year: string;                 // Manufacturing year
    color: string;                // Vehicle color
    licensePlate: string;         // License plate number
  };
  documents: {                    // Driver documents
    license: string;              // Driver license URL
    insurance: string;            // Insurance document URL
    registration: string;         // Vehicle registration URL
  };
  location?: {                    // Current location
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
  createdAt: Date;                // Account creation date
  updatedAt: Date;                // Last update date
}
```

### 3. **history** Collection
```typescript
interface RideHistory {
  id: string;                     // Auto-generated document ID
  userID: string;                 // User's Firebase UID
  rideID: string;                 // Realtime DB ride ID
  from: string;                   // Pickup location
  to: string;                     // Destination location
  startLat: number;               // Pickup latitude
  startLong: number;              // Pickup longitude
  endLat: number;                 // Destination latitude
  endLong: number;                // Destination longitude
  date: string;                   // Ride date
  time: string;                   // Ride time
  amount: string;                 // Fare amount
  distance: string;               // Distance in km
  duration: number;               // Duration in minutes
  status: string;                 // Ride status
  type: 'individual' | 'carpool'; // Ride type
  timestamp: Date;                // Creation timestamp
  userName: string;               // User's display name
  driverId?: string;              // Driver's UID (if assigned)
  driverName?: string;            // Driver's name (if assigned)
  rating?: number;                // User rating (1-5)
  feedback?: string;              // User feedback
}
```

### 4. **notifications** Collection
```typescript
interface Notification {
  id: string;                     // Auto-generated document ID
  userId: string;                 // Recipient user ID
  type: 'ride_request' | 'ride_accepted' | 'ride_started' | 'ride_completed' | 'geofence' | 'general';
  title: string;                  // Notification title
  body: string;                   // Notification message
  data?: any;                     // Additional data
  read: boolean;                  // Read status
  createdAt: Date;                // Creation timestamp
  expiresAt?: Date;               // Expiration date
  priority: 'low' | 'medium' | 'high';
}
```

### 5. **geofences** Collection
```typescript
interface Geofence {
  id: string;                     // Auto-generated document ID
  userId: string;                 // User who created the geofence
  name: string;                   // Geofence name
  latitude: number;               // Center latitude
  longitude: number;              // Center longitude
  radius: number;                 // Radius in meters
  type: 'pickup' | 'dropoff' | 'custom';
  isActive: boolean;              // Active status
  createdAt: Date;                // Creation timestamp
  expiresAt?: Date;               // Expiration date
  description?: string;           // Additional description
}
```

### 6. **companions** Collection
```typescript
interface Companion {
  id: string;                     // Auto-generated document ID
  userId: string;                 // Companion user ID
  username: string;               // Companion name
  email: string;                  // Companion email
  phoneNumber?: string;           // Phone number
  isActive: boolean;              // Active status
  linkedTravelers: string[];      // Array of linked traveler UIDs
  createdAt: Date;                // Account creation date
  updatedAt: Date;                // Last update date
}
```

### 7. **travelerCompanionLinks** Collection
```typescript
interface TravelerCompanionLink {
  id: string;                     // Auto-generated document ID
  travelerId: string;             // Traveler user ID
  companionId: string;            // Companion user ID
  status: 'pending' | 'accepted' | 'rejected' | 'removed';
  createdAt: Date;                // Link creation date
  acceptedAt?: Date;              // Acceptance date
  removedAt?: Date;               // Removal date
  settings: {                     // Link settings
    locationSharing: boolean;     // Allow location sharing
    rideNotifications: boolean;   // Notify about rides
    emergencyAlerts: boolean;     // Emergency notifications
  };
}
```

### 8. **rideShares** Collection
```typescript
interface RideShare {
  id: string;                     // Auto-generated document ID
  rideId: string;                 // Associated ride ID
  userId: string;                 // User who shared the ride
  shareType: 'whatsapp' | 'sms' | 'link';
  shareMessage: string;           // Custom share message
  shareLink: string;              // Generated share link
  expiresAt: Date;                // Link expiration
  isActive: boolean;              // Active status
  analytics: {                    // Sharing analytics
    views: number;                // Number of views
    clicks: number;               // Number of clicks
    reshares: number;             // Number of reshares
  };
  createdAt: Date;                // Creation timestamp
}
```

### 9. **feedback** Collection
```typescript
interface Feedback {
  id: string;                     // Auto-generated document ID
  rideId: string;                 // Associated ride ID
  userId: string;                 // User who provided feedback
  driverId?: string;              // Driver ID (if applicable)
  ratings: {                      // Detailed ratings
    overall: number;              // Overall rating (1-5)
    punctuality: number;          // Punctuality rating
    cleanliness: number;          // Vehicle cleanliness
    safety: number;               // Safety rating
    communication: number;        // Communication rating
    value: number;                // Value for money
  };
  feedback: {                     // Feedback details
    title: string;                // Feedback title
    description: string;          // Detailed feedback
    category: string;             // Feedback category
    tags: string[];               // Feedback tags
  };
  isAnonymous: boolean;           // Anonymous feedback
  createdAt: Date;                // Submission timestamp
  updatedAt?: Date;               // Last update timestamp
}
```

---

## ⚡ **REALTIME DATABASE STRUCTURE**

### 1. **rideRequests** Node
```typescript
interface RideRequest {
  [requestId: string]: {          // Dynamic key for each request
    userID: string;               // User's Firebase UID
    userName: string;             // User's display name
    from: string;                 // Pickup location
    to: string;                   // Destination location
    startLat: number;             // Pickup latitude
    startLong: number;            // Pickup longitude
    endLat: number;               // Destination latitude
    endLong: number;              // Destination longitude
    date: string;                 // Ride date
    time: string;                 // Ride time
    requestedAt: number;          // Request timestamp
    status: 'requested' | 'active' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
    distance: number;             // Distance in km
    duration: number;             // Duration in minutes
    amount: number;               // Estimated fare
    driverAccepted: boolean;      // Driver acceptance status
    
    // Driver information (when accepted)
    driverId?: string;            // Driver's UID
    driverName?: string;          // Driver's name
    driverPhone?: string;         // Driver's phone
    driverLocation?: {            // Driver's current location
      latitude: number;
      longitude: number;
      timestamp: string;
      accuracy?: number;
      speed?: number;
      heading?: number;
    };
    vehicleInfo?: {               // Vehicle details
      make: string;
      model: string;
      color: string;
      licensePlate: string;
      year: string;
    };
    
    // Ride progression
    acceptedAt?: string;          // Driver acceptance timestamp
    rideStartedAt?: string;       // Ride start timestamp
    rideCompletedAt?: string;     // Ride completion timestamp
    rideCancelledAt?: string;     // Ride cancellation timestamp
    
    // Cancellation details
    cancelledBy?: 'user' | 'driver' | 'system';
    rejectedBy?: string;          // Driver who rejected
    rejectedAt?: string;          // Rejection timestamp
    
    // Location tracking
    lastLocationUpdate?: string;  // Last location update
  };
}
```

### 2. **rideTracking** Node
```typescript
interface RideTracking {
  [rideId: string]: {             // Dynamic key for each ride
    rideId: string;               // Associated ride ID
    driverId: string;             // Driver's UID
    driverLocation: {             // Current driver location
      latitude: number;
      longitude: number;
      timestamp: string;
      accuracy?: number;
      speed?: number;
      heading?: number;
    };
    userLocation?: {              // User's location (if shared)
      latitude: number;
      longitude: number;
      timestamp: string;
      accuracy?: number;
    };
    status: 'active' | 'completed' | 'cancelled';
    startTime: string;            // Ride start timestamp
    estimatedArrival?: string;    // Estimated arrival time
    actualArrival?: string;       // Actual arrival time
    lastUpdated: string;          // Last update timestamp
    statusUpdatedAt?: string;     // Status update timestamp
  };
}
```

### 3. **geofenceEvents** Node
```typescript
interface GeofenceEvent {
  [eventId: string]: {            // Dynamic key for each event
    geofenceId: string;           // Associated geofence ID
    userId: string;               // User who triggered the event
    type: 'enter' | 'exit' | 'dwell';
    latitude: number;             // Event location
    longitude: number;            // Event location
    timestamp: string;            // Event timestamp
    accuracy?: number;            // Location accuracy
    isProcessed: boolean;         // Processing status
  };
}
```

---

## 🔗 **RELATIONSHIPS & INDEXES**

### **Recommended Firestore Indexes:**
```typescript
// users collection
- uid (ascending) - Primary key
- email (ascending) - Unique constraint
- username (ascending) - Search optimization

// drivers collection  
- uid (ascending) - Primary key
- status (ascending) - Query optimization
- isVerified (ascending) - Filter optimization
- rating (descending) - Sort optimization

// history collection
- userID (ascending) - User rides query
- timestamp (descending) - Recent rides
- status (ascending) - Status filtering
- type (ascending) - Ride type filtering

// notifications collection
- userId (ascending) - User notifications
- createdAt (descending) - Recent notifications
- read (ascending) - Unread notifications
- type (ascending) - Notification type filtering

// feedback collection
- rideId (ascending) - Ride-specific feedback
- userId (ascending) - User feedback
- driverId (ascending) - Driver feedback
- createdAt (descending) - Recent feedback
```

### **Realtime Database Rules:**
```json
{
  "rules": {
    "rideRequests": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$requestId": {
        ".validate": "newData.hasChildren(['userID', 'from', 'to', 'status'])"
      }
    },
    "rideTracking": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('rideRequests').child($rideId).child('driverId').val() === auth.uid || root.child('rideRequests').child($rideId).child('userID').val() === auth.uid)"
    },
    "geofenceEvents": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

---

## 📱 **DATA FLOW DIAGRAM**

```
User Books Ride → rideRequests (Realtime DB) → Driver Dashboard (Live Count)
                ↓
            Firestore History → Admin Dashboard
                ↓
        Driver Accepts → Status: 'active' → Start Location Tracking
                ↓
        Ride Progress → Status: 'in_progress' → Continue Tracking
                ↓
        Ride Complete → Status: 'completed' → Stop Tracking → Save to History
                ↓
        User Feedback → Feedback Collection → Analytics
```

---

## 🚀 **PERFORMANCE OPTIMIZATIONS**

1. **Real-time Updates**: Use Realtime Database for live ride status and location
2. **Batch Operations**: Use Firestore batch writes for multiple document updates
3. **Indexing**: Create composite indexes for complex queries
4. **Pagination**: Implement cursor-based pagination for large datasets
5. **Caching**: Cache frequently accessed data on the client side
6. **Offline Support**: Enable offline persistence for critical data

---

## 🔒 **SECURITY CONSIDERATIONS**

1. **Authentication**: All operations require valid Firebase Auth tokens
2. **Authorization**: Users can only access their own data
3. **Data Validation**: Validate all input data before writing to database
4. **Rate Limiting**: Implement rate limiting for API calls
5. **Audit Logging**: Log all critical operations for security monitoring

---

## 📋 **MIGRATION NOTES**

- **Version Control**: Use database versioning for schema changes
- **Backward Compatibility**: Maintain backward compatibility during updates
- **Data Migration**: Plan data migration strategies for major changes
- **Testing**: Test all database operations in staging environment
- **Backup**: Regular database backups before major changes

---

*This schema is designed for scalability, performance, and real-time functionality required by a modern ride-sharing platform.*
