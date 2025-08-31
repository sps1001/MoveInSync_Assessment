# RideWise - Complete Ride-Sharing Application

A comprehensive ride-sharing application built with React Native, Firebase, and real-time location tracking.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure login/signup with Firebase Auth
- **Ride Booking**: Complete ride booking flow with location selection
- **Driver Management**: Driver registration, verification, and dashboard
- **Real-time Tracking**: Live location updates during rides
- **Fare Calculation**: Dynamic fare calculation based on distance, time, and traffic
- **Ride History**: Complete ride history for both users and drivers
- **Notifications**: Push notifications for ride updates

### Advanced Features
- **Geofencing**: Location-based alerts and notifications
- **Companion Tracking**: Allow trusted contacts to track rides
- **Ride Sharing**: Share ride details via multiple platforms
- **Feedback System**: Comprehensive rating and feedback system
- **Analytics**: Detailed analytics for drivers and admins
- **Dark Mode**: Theme support with automatic switching

## 🛠️ Technology Stack

- **Frontend**: React Native 0.79.5
- **Backend**: Firebase (Firestore + Realtime Database)
- **Authentication**: Firebase Auth
- **Location Services**: Expo Location + Google Maps API
- **Notifications**: Expo Notifications
- **State Management**: React Context + Hooks
- **Navigation**: React Navigation 7

## 📱 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd MoveInSync_Assessment
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Firebase Configuration
API_KEY=your_firebase_api_key
AUTH_DOMAIN=your_project.firebaseapp.com
PROJECT_ID=your_project_id
STORAGE_BUCKET=your_project.appspot.com
MESSAGING_SENDER_ID=your_sender_id
APP_ID=your_app_id
DATABASE_URL=https://your_project-default-rtdb.firebaseio.com

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 4. Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication, Firestore, and Realtime Database
3. Set up Firestore security rules
4. Configure Realtime Database rules
5. Add your app to the project

### 5. Google Maps Setup
1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps, Directions, and Geocoding APIs
3. Add the API key to your `.env` file

### 6. Run the Application
```bash
# Start the development server
npm start
# or
expo start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## 🗄️ Database Structure

### Firestore Collections
- **users**: User profiles and preferences
- **drivers**: Driver information and verification status
- **history**: Complete ride history for users
- **driverHistory**: Complete ride history for drivers
- **geofences**: Location-based alerts
- **notifications**: Push notification data
- **feedback**: User ratings and feedback
- **rideShares**: Ride sharing analytics

### Realtime Database
- **rideRequests**: Active ride requests and status
- **rideTracking**: Real-time location tracking data

## 🔄 Real-time Features

### Ride Request Flow
1. User books a ride → Creates entry in Realtime DB
2. Driver sees request → Updates status to 'accepted'
3. Location tracking starts → Real-time updates
4. Ride completion → Updates both databases

### Real-time Updates
- **Firestore**: Uses `onSnapshot` for real-time document updates
- **Realtime DB**: Uses `onValue` for real-time data changes
- **Location Tracking**: Updates every 10 seconds during active rides

## 🧪 Testing

### Database Functionality Test
Run the comprehensive test script:
```bash
node test-database.js
```

This script tests:
- Firebase Authentication
- Firestore Operations
- Realtime Database Operations
- Real-time Listeners
- Collection Verification

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Ride booking with location selection
- [ ] Driver registration and verification
- [ ] Ride request acceptance
- [ ] Real-time location tracking
- [ ] Ride completion
- [ ] History updates
- [ ] Notifications

## 🐛 Troubleshooting

### Common Issues

#### 1. Estimated Fare Button Not Showing
- Ensure both start and end locations are set
- Check Google Maps API key configuration
- Verify location permissions

#### 2. Ride Requests Not Appearing
- Check driver availability status
- Verify driver verification status
- Check location permissions
- Ensure driver is within 25km radius

#### 3. Real-time Updates Not Working
- Check Firebase configuration
- Verify internet connection
- Check Firestore security rules
- Ensure proper listener cleanup

#### 4. Location Tracking Issues
- Check location permissions
- Verify GPS is enabled
- Check device location services
- Ensure proper error handling

### Debug Mode
Enable debug logging by checking console output for:
- 🔄 Real-time updates
- 🚗 Location tracking
- 📍 Geofence triggers
- 🔔 Notification delivery

## 📊 Performance Optimization

### Database Optimization
- Use compound queries for complex filtering
- Implement pagination for large datasets
- Use batch operations for multiple updates
- Optimize real-time listeners

### Location Optimization
- Adjust tracking frequency based on ride status
- Implement geofencing for efficient location checks
- Use background location updates sparingly
- Cache location data when appropriate

## 🔒 Security Considerations

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Drivers can only access their own data
    match /drivers/{driverId} {
      allow read, write: if request.auth != null && request.auth.uid == driverId;
    }
    
    // Ride history access control
    match /history/{document} {
      allow read, write: if request.auth != null && 
        (resource.data.userID == request.auth.uid || 
         resource.data.driverId == request.auth.uid);
    }
  }
}
```

### Realtime Database Rules
```json
{
  "rules": {
    "rideRequests": {
      "$rideId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "rideTracking": {
      "$rideId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## 🚀 Deployment

### Expo Build
```bash
# Build for Android
expo build:android

# Build for iOS
expo build:ios
```

### App Store Deployment
1. Configure app.json with proper metadata
2. Set up code signing certificates
3. Build production APK/IPA
4. Submit to respective app stores

## 📈 Monitoring & Analytics

### Firebase Analytics
- Track user engagement
- Monitor ride completion rates
- Analyze driver performance
- Track app crashes and errors

### Custom Metrics
- Ride success rates
- Driver response times
- User satisfaction scores
- Geographic usage patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review Firebase documentation
- Consult React Native documentation

## 🔄 Version History

- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Added real-time updates and improved error handling
- **v1.2.0**: Enhanced location tracking and geofencing
- **v1.3.0**: Added companion tracking and ride sharing
- **v1.4.0**: Improved performance and security

---

**Note**: This application requires proper Firebase and Google Maps API setup to function correctly. Ensure all environment variables and API keys are properly configured before running the application.