import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { auth, db } from './firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeService();
  }

  async initializeService() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('ride-updates', {
          name: 'Ride Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('geofence', {
          name: 'Geofence Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF00FF00',
          sound: 'default',
        });
      }

      this.isInitialized = true;
      console.log('✅ Notification service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing notification service:', error);
    }
  }

  // Send local notification (works in Expo Go)
  async sendLocalNotification(title: string, body: string, data?: any, channelId: string = 'default') {
    try {
      if (!this.isInitialized) {
        await this.initializeService();
      }

      const notificationContent = {
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId,
      };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Send immediately
      });

      console.log('📱 Local notification sent:', title);
      return true;
    } catch (error) {
      console.error('❌ Error sending local notification:', error);
      return false;
    }
  }

  // Send ride update notification
  async sendRideUpdateNotification(rideId: string, message: string, data?: any) {
    return this.sendLocalNotification(
      '🚗 Ride Update',
      message,
      { ...data, rideId, type: 'ride-update' },
      'ride-updates'
    );
  }

  // Send geofence notification
  async sendGeofenceNotification(location: string, message: string) {
    return this.sendLocalNotification(
      '📍 Location Alert',
      message,
      { type: 'geofence', location },
      'geofence'
    );
  }

  // Send trip completion notification
  async sendTripCompletionNotification(driverName: string, destination: string) {
    return this.sendLocalNotification(
      '✅ Trip Completed',
      `Your ride with ${driverName} to ${destination} has been completed!`,
      { type: 'trip-completion' },
      'ride-updates'
    );
  }

  // Send companion notification
  async sendCompanionNotification(travelerName: string, message: string) {
    return this.sendLocalNotification(
      '👥 Companion Update',
      message,
      { type: 'companion', travelerName },
      'ride-updates'
    );
  }

  // Schedule notification for future delivery
  async scheduleNotification(title: string, body: string, triggerDate: Date, data?: any) {
    try {
      if (!this.isInitialized) {
        await this.initializeService();
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: {
          date: triggerDate,
        },
      });

      console.log('📅 Notification scheduled for:', triggerDate);
      return true;
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      return false;
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ All scheduled notifications cancelled');
    } catch (error) {
      console.error('❌ Error cancelling notifications:', error);
    }
  }

  // Get notification permissions status
  async getNotificationPermissions() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('❌ Error getting notification permissions:', error);
      return 'denied';
    }
  }

  // Save notification token to user profile (for future FCM implementation)
  async saveNotificationToken(userId: string, token: string) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notificationToken: token,
        notificationSettings: {
          rideUpdates: true,
          geofenceAlerts: true,
          companionUpdates: true,
          tripCompletion: true,
        },
        lastTokenUpdate: new Date(),
      });
      console.log('💾 Notification token saved for user:', userId);
    } catch (error) {
      console.error('❌ Error saving notification token:', error);
    }
  }

  // Test notification (for debugging)
  async testNotification() {
    return this.sendLocalNotification(
      '🧪 Test Notification',
      'This is a test notification to verify the system is working!',
      { type: 'test' }
    );
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
