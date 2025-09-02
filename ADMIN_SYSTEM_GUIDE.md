# 👑 RideWise Admin System Guide

## Overview
The RideWise application now includes a comprehensive admin authentication system that provides secure access to administrative functions. This system ensures that only authorized administrators can access sensitive system data and management features.

## 🔐 Roles in RideWise

### 1. **User** (`user`)
- **Purpose**: Regular passengers who book rides
- **Access**: Book rides, view ride history, manage profile
- **Permissions**: Limited to personal data and ride booking

### 2. **Driver** (`driver`)
- **Purpose**: Drivers who offer rides to passengers
- **Access**: Accept ride requests, manage vehicle details, view earnings
- **Permissions**: Access to ride requests and driver-specific features

### 3. **Admin** (`admin`)
- **Purpose**: System administrators with full access
- **Access**: Monitor all rides, view analytics, manage system
- **Permissions**: Full system access with role-based controls

## 🚀 Admin Authentication Features

### ✅ **What's Implemented**
- **Secure Admin Login**: Dedicated admin login screen with role verification
- **Role-Based Access Control**: Only users with `userType: 'admin'` can access admin panel
- **Session Management**: Admin sessions are properly managed and stored
- **Logout Functionality**: Secure logout with session cleanup
- **Access Verification**: Real-time verification of admin privileges

### 🔒 **Security Features**
- **Firebase Authentication**: Uses Firebase Auth for secure user authentication
- **Role Verification**: Double-checks user role in Firestore before granting access
- **Session Storage**: Secure storage of admin credentials in AsyncStorage
- **Access Denial**: Automatic redirection for unauthorized access attempts

## 📱 How to Use the Admin System

### **1. Accessing Admin Panel**
1. Open the RideWise app
2. On the Landing Page, tap the **👑 Admin** button
3. You'll be redirected to the Admin Login screen
4. Enter your admin email and password
5. Tap "Access Admin Panel"

### **2. Admin Dashboard Features**
- **Ride Monitoring**: View all rides in the system
- **Statistics**: See total rides, carpool vs individual ride counts
- **Filtering**: Filter rides by type (all, carpool, individual)
- **Real-time Updates**: Live data updates from Firebase
- **Logout**: Secure logout button in the header

### **3. Logging Out**
- Tap the **Logout** button in the admin dashboard header
- You'll be automatically redirected to the main landing page
- All admin session data is cleared

## 🛠️ Setting Up Admin Users

### **Option 1: Using the Setup Script (Recommended)**
1. **Install Dependencies**:
   ```bash
   npm install firebase
   ```

2. **Configure Firebase**:
   - Open `scripts/setup-admin.js`
   - Update the `firebaseConfig` object with your Firebase project details
   - Get these values from your Firebase Console → Project Settings → General

3. **Run the Setup Script**:
   ```bash
   node scripts/setup-admin.js
   ```

4. **Follow the Prompts**:
   - Enter admin email
   - Enter secure password (min 6 characters)
   - Confirm password
   - Enter admin username

### **Option 2: Manual Setup**
1. **Create User Account**:
   - Use Firebase Console → Authentication → Users
   - Create a new user with email/password

2. **Set Admin Role**:
   - Go to Firestore → `users` collection
   - Create a document with the user's UID
   - Set `userType: 'admin'`
   - Set `isActive: true`

## 🗄️ Database Structure for Admin Users

### **Users Collection Document Structure**
```typescript
interface AdminUser {
  uid: string;                    // Firebase Auth UID
  email: string;                  // Admin email
  username: string;               // Admin username
  userType: 'admin';             // Must be 'admin'
  createdAt: Date;               // Account creation date
  isActive: boolean;             // Account status
  permissions: string[];         // Admin permissions
  profile?: {                    // Optional profile info
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}
```

### **Example Admin User Document**
```json
{
  "uid": "admin_user_uid_here",
  "email": "admin@ridewise.com",
  "username": "system_admin",
  "userType": "admin",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "isActive": true,
  "permissions": ["read", "write", "delete", "admin"],
  "profile": {
    "firstName": "System",
    "lastName": "Administrator"
  }
}
```

## 🔧 Admin Service Functions

The `AdminService` class provides utility functions for managing admin users:

### **Core Functions**
- `createAdminUser()` - Create new admin accounts
- `verifyAdminAccess()` - Check if user has admin privileges
- `getAdminUser()` - Retrieve admin user details
- `updateAdminPermissions()` - Modify admin permissions
- `deactivateAdmin()` - Deactivate admin accounts

### **Usage Example**
```typescript
import AdminService from '../service/adminService';

// Verify admin access
const isAdmin = await AdminService.verifyAdminAccess(userUid);

// Create new admin (use with caution)
const newAdmin = await AdminService.createAdminUser(
  'newadmin@ridewise.com',
  'securepassword',
  'new_admin_user'
);
```

## 🚨 Security Best Practices

### **1. Password Security**
- Use strong passwords (min 8 characters)
- Include uppercase, lowercase, numbers, and symbols
- Never share admin credentials
- Change passwords regularly

### **2. Access Control**
- Only grant admin access to trusted individuals
- Regularly review admin user list
- Deactivate unused admin accounts
- Monitor admin activity logs

### **3. Firebase Security Rules**
Ensure your Firestore security rules include admin access control:

```javascript
// Example Firestore security rule
match /users/{userId} {
  allow read, write: if request.auth != null && 
    (request.auth.uid == userId || 
     get(/databases/$(database.name)/documents/users/$(request.auth.uid)).data.userType == 'admin');
}
```

## 🐛 Troubleshooting

### **Common Issues**

1. **"Access Denied" Error**
   - Verify the user has `userType: 'admin'` in Firestore
   - Check if `isActive` is set to `true`
   - Ensure the user document exists in the `users` collection

2. **Login Fails**
   - Check Firebase Authentication settings
   - Verify email/password are correct
   - Ensure Firebase project is properly configured

3. **Admin Dashboard Not Loading**
   - Check internet connection
   - Verify Firebase configuration
   - Check browser console for errors

### **Debug Steps**
1. Check Firebase Console → Authentication → Users
2. Verify Firestore → `users` collection has admin document
3. Check AsyncStorage for stored credentials
4. Review Firebase security rules

## 📞 Support

If you encounter issues with the admin system:

1. **Check the logs** in your Firebase Console
2. **Verify your configuration** matches the Firebase project
3. **Review security rules** for proper access control
4. **Test with a simple admin account** first

## 🔄 Future Enhancements

### **Planned Features**
- **Multi-level Admin Roles**: Super admin, moderator, support
- **Admin Activity Logging**: Track all admin actions
- **Permission Management**: Granular permission controls
- **Admin Dashboard Analytics**: Enhanced reporting and insights
- **User Management**: Admin ability to manage other users

### **Customization Options**
- **Custom Admin Themes**: Personalized admin interface
- **Notification Preferences**: Admin-specific alerts
- **Export Functions**: Data export capabilities
- **Bulk Operations**: Mass user/ride management

---

**⚠️ Important**: The admin system provides full access to your application data. Always use strong security practices and regularly audit admin access.
