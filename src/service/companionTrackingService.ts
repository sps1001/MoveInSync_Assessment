import { auth, db, realtimeDb } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { ref, onValue, off, update, get } from 'firebase/database';
import { notificationService } from './notificationService';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface CompanionData {
  id: string;
  travelerId: string;
  travelerName: string;
  companionId: string;
  companionName: string;
  rideId: string;
  status: 'active' | 'inactive' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  lastLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  notifications: {
    tripCompletion: boolean;
    geofenceAlerts: boolean;
    rideUpdates: boolean;
  };
}

export interface CompanionRideInfo {
  rideId: string;
  travelerId: string;
  travelerName: string;
  from: string;
  to: string;
  driverName?: string;
  driverPhone?: string;
  cabNumber?: string;
  status: string;
  estimatedArrival?: Date;
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
}

export interface GeofenceAlert {
  id: string;
  rideId: string;
  location: string;
  type: 'pickup' | 'destination' | 'waypoint';
  triggeredAt: Date;
  companionIds: string[];
  status: 'active' | 'acknowledged' | 'expired';
}

class CompanionTrackingService {
  private activeCompanionships: Map<string, CompanionData> = new Map();
  private activeRides: Map<string, CompanionRideInfo> = new Map();
  private geofenceAlerts: Map<string, GeofenceAlert> = new Map();
  private locationSubscription: Location.LocationSubscription | null = null;
  private rideListeners: Map<string, () => void> = new Map();

  constructor() {
    this.initializeService();
  }

  // Initialize the service
  private async initializeService() {
    if (auth.currentUser) {
      await this.loadActiveCompanionships();
      await this.loadActiveRides();
    }
  }

  // Load active companionships for current user
  private async loadActiveCompanionships() {
    if (!auth.currentUser) return;

    try {
      const companionshipsQuery = query(
        collection(db, 'companionships'),
        where('companionId', '==', auth.currentUser.uid),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(companionshipsQuery);
      this.activeCompanionships.clear();

      snapshot.forEach((doc) => {
        const companionship = { id: doc.id, ...doc.data() } as CompanionData;
        this.activeCompanionships.set(doc.id, companionship);
      });

      console.log(`Loaded ${this.activeCompanionships.size} active companionships`);
    } catch (error) {
      console.error('Error loading active companionships:', error);
    }
  }

  // Load active rides for companionships
  private async loadActiveRides() {
    try {
      for (const companionship of this.activeCompanionships.values()) {
        await this.startTrackingRide(companionship.rideId);
      }
    } catch (error) {
      console.error('Error loading active rides:', error);
    }
  }

  // Start tracking a specific ride
  async startTrackingRide(rideId: string): Promise<void> {
    try {
      // Check if already tracking
      if (this.rideListeners.has(rideId)) {
        console.log(`Already tracking ride: ${rideId}`);
        return;
      }

      const rideRef = ref(realtimeDb, `rideRequests/${rideId}`);
      
      const unsubscribe = onValue(rideRef, (snapshot) => {
        if (snapshot.exists()) {
          const rideData = snapshot.val();
          this.updateRideInfo(rideId, rideData);
          
          // Check for status changes that require notifications
          this.checkRideStatusChanges(rideId, rideData);
          
          // Check geofence conditions
          this.checkGeofenceConditions(rideId, rideData);
        }
      });

      this.rideListeners.set(rideId, unsubscribe);
      console.log(`Started tracking ride: ${rideId}`);
    } catch (error) {
      console.error('Error starting ride tracking:', error);
    }
  }

  // Stop tracking a specific ride
  async stopTrackingRide(rideId: string): Promise<void> {
    try {
      const unsubscribe = this.rideListeners.get(rideId);
      if (unsubscribe) {
        unsubscribe();
        this.rideListeners.delete(rideId);
        this.activeRides.delete(rideId);
        console.log(`Stopped tracking ride: ${rideId}`);
      }
    } catch (error) {
      console.error('Error stopping ride tracking:', error);
    }
  }

  // Update ride information
  private updateRideInfo(rideId: string, rideData: any): void {
    const rideInfo: CompanionRideInfo = {
      rideId,
      travelerId: rideData.userID,
      travelerName: rideData.userName,
      from: rideData.from,
      to: rideData.to,
      driverName: rideData.driverName,
      driverPhone: rideData.driverPhone,
      cabNumber: rideData.vehicleInfo?.licensePlate,
      status: rideData.status,
      estimatedArrival: rideData.estimatedArrival ? new Date(rideData.estimatedArrival) : undefined,
      currentLocation: rideData.driverLocation ? {
        latitude: rideData.driverLocation.latitude,
        longitude: rideData.driverLocation.longitude,
        timestamp: new Date(),
      } : undefined,
    };

    this.activeRides.set(rideId, rideInfo);
  }

  // Check for ride status changes that require notifications
  private checkRideStatusChanges(rideId: string, rideData: any): void {
    const previousRide = this.activeRides.get(rideId);
    if (!previousRide) return;

    const currentStatus = rideData.status;
    const previousStatus = previousRide.status;

    // Trip completion notification
    if (currentStatus === 'completed' && previousStatus !== 'completed') {
      this.sendTripCompletionNotification(rideId, rideData);
    }

    // Driver assigned notification
    if (rideData.driverAccepted && !previousRide.driverName) {
      this.sendDriverAssignedNotification(rideId, rideData);
    }

    // Ride started notification
    if (currentStatus === 'active' && previousStatus !== 'active') {
      this.sendRideStartedNotification(rideId, rideData);
    }
  }

  // Check geofence conditions
  private checkGeofenceConditions(rideId: string, rideData: any): void {
    if (!rideData.driverLocation || !rideData.endLat || !rideData.endLong) return;

    const driverLocation = rideData.driverLocation;
    const destination = { lat: rideData.endLat, lng: rideData.endLong };
    
    // Calculate distance to destination
    const distance = this.calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      destination.lat,
      destination.lng
    );

    // Geofence radius (500 meters)
    const geofenceRadius = 0.5;

    if (distance <= geofenceRadius) {
      this.triggerGeofenceAlert(rideId, 'destination', rideData.to);
    }
  }

  // Calculate distance between two points
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Trigger geofence alert
  private async triggerGeofenceAlert(rideId: string, type: 'pickup' | 'destination' | 'waypoint', location: string): Promise<void> {
    try {
      const alertId = `geofence_${rideId}_${Date.now()}`;
      
      // Get companions for this ride
      const companions = Array.from(this.activeCompanionships.values())
        .filter(c => c.rideId === rideId);

      if (companions.length === 0) return;

      const geofenceAlert: GeofenceAlert = {
        id: alertId,
        rideId,
        location,
        type,
        triggeredAt: new Date(),
        companionIds: companions.map(c => c.companionId),
        status: 'active',
      };

      this.geofenceAlerts.set(alertId, geofenceAlert);

      // Save to Firestore
      await addDoc(collection(db, 'geofenceAlerts'), geofenceAlert);

      // Send notifications to companions
      for (const companion of companions) {
        await this.sendGeofenceNotification(companion.companionId, location, type);
      }

      console.log(`Geofence alert triggered: ${type} at ${location}`);
    } catch (error) {
      console.error('Error triggering geofence alert:', error);
    }
  }

  // Send trip completion notification
  private async sendTripCompletionNotification(rideId: string, rideData: any): Promise<void> {
    try {
      const companions = Array.from(this.activeCompanionships.values())
        .filter(c => c.rideId === rideId);

      for (const companion of companions) {
        if (companion.notifications.tripCompletion) {
          await notificationService.sendCompanionNotification(
            rideData.userName,
            `Trip completed! Your companion has reached ${rideData.to}`
          );
        }
      }

      console.log(`Trip completion notifications sent for ride: ${rideId}`);
    } catch (error) {
      console.error('Error sending trip completion notification:', error);
    }
  }

  // Send driver assigned notification
  private async sendDriverAssignedNotification(rideId: string, rideData: any): Promise<void> {
    try {
      const companions = Array.from(this.activeCompanionships.values())
        .filter(c => c.rideId === rideId);

      for (const companion of companions) {
        if (companion.notifications.rideUpdates) {
          await notificationService.sendCompanionNotification(
            rideData.userName,
            `Driver assigned! ${rideData.driverName} will pick up your companion from ${rideData.from}`
          );
        }
      }

      console.log(`Driver assigned notifications sent for ride: ${rideId}`);
    } catch (error) {
      console.error('Error sending driver assigned notification:', error);
    }
  }

  // Send ride started notification
  private async sendRideStartedNotification(rideId: string, rideData: any): Promise<void> {
    try {
      const companions = Array.from(this.activeCompanionships.values())
        .filter(c => c.rideId === rideId);

      for (const companion of companions) {
        if (companion.notifications.rideUpdates) {
          await notificationService.sendCompanionNotification(
            rideData.userName,
            `Ride started! Your companion is now on the way to ${rideData.to}`
          );
        }
      }

      console.log(`Ride started notifications sent for ride: ${rideId}`);
    } catch (error) {
      console.error('Error sending ride started notification:', error);
    }
  }

  // Send geofence notification
  private async sendGeofenceNotification(companionId: string, location: string, type: string): Promise<void> {
    try {
      await notificationService.sendGeofenceNotification(
        location,
        `🚨 Geofence Alert: Cab is approaching ${location} (${type})`
      );
    } catch (error) {
      console.error('Error sending geofence notification:', error);
    }
  }

  // Create new companionship
  async createCompanionship(travelerId: string, travelerName: string, rideId: string): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const companionshipData: Omit<CompanionData, 'id' | 'createdAt' | 'updatedAt'> = {
        travelerId,
        travelerName,
        companionId: auth.currentUser.uid,
        companionName: auth.currentUser.displayName || 'Companion',
        rideId,
        status: 'active',
        lastLocation: undefined,
        notifications: {
          tripCompletion: true,
          geofenceAlerts: true,
          rideUpdates: true,
        },
      };

      const docRef = await addDoc(collection(db, 'companionships'), {
        ...companionshipData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add to local cache
      const companionship = { id: docRef.id, ...companionshipData, createdAt: new Date(), updatedAt: new Date() };
      this.activeCompanionships.set(docRef.id, companionship);

      // Start tracking the ride
      await this.startTrackingRide(rideId);

      console.log('Companionship created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating companionship:', error);
      throw error;
    }
  }

  // Update companionship
  async updateCompanionship(companionshipId: string, updates: Partial<CompanionData>): Promise<void> {
    try {
      const companionshipRef = doc(db, 'companionships', companionshipId);
      await updateDoc(companionshipRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Update local cache
      const companionship = this.activeCompanionships.get(companionshipId);
      if (companionship) {
        Object.assign(companionship, updates, { updatedAt: new Date() });
      }

      console.log('Companionship updated:', companionshipId);
    } catch (error) {
      console.error('Error updating companionship:', error);
      throw error;
    }
  }

  // End companionship
  async endCompanionship(companionshipId: string): Promise<void> {
    try {
      const companionship = this.activeCompanionships.get(companionshipId);
      if (companionship) {
        // Stop tracking the ride
        await this.stopTrackingRide(companionship.rideId);
      }

      // Update status
      await this.updateCompanionship(companionshipId, { status: 'inactive' });

      // Remove from local cache
      this.activeCompanionships.delete(companionshipId);

      console.log('Companionship ended:', companionshipId);
    } catch (error) {
      console.error('Error ending companionship:', error);
      throw error;
    }
  }

  // Get active companionships for user
  async getUserCompanionships(userId: string, callback: (companionships: CompanionData[]) => void) {
    const q = query(
      collection(db, 'companionships'),
      where('companionId', '==', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const companionships: CompanionData[] = [];
      snapshot.forEach((doc) => {
        companionships.push({
          id: doc.id,
          ...doc.data()
        } as CompanionData);
      });
      
      callback(companionships);
    });
  }

  // Get companionship by ride ID
  async getCompanionshipByRide(rideId: string): Promise<CompanionData | null> {
    try {
      const q = query(
        collection(db, 'companionships'),
        where('rideId', '==', rideId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as CompanionData;
      }

      return null;
    } catch (error) {
      console.error('Error getting companionship by ride:', error);
      return null;
    }
  }

  // Get active rides being tracked
  getActiveRides(): CompanionRideInfo[] {
    return Array.from(this.activeRides.values());
  }

  // Get geofence alerts
  getGeofenceAlerts(): GeofenceAlert[] {
    return Array.from(this.geofenceAlerts.values());
  }

  // Acknowledge geofence alert
  async acknowledgeGeofenceAlert(alertId: string): Promise<void> {
    try {
      const alert = this.geofenceAlerts.get(alertId);
      if (alert) {
        alert.status = 'acknowledged';
        this.geofenceAlerts.set(alertId, alert);

        // Update in Firestore
        const alertRef = doc(db, 'geofenceAlerts', alertId);
        await updateDoc(alertRef, {
          status: 'acknowledged',
          acknowledgedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error acknowledging geofence alert:', error);
    }
  }

  // Cleanup method
  cleanup() {
    // Stop all ride listeners
    for (const [rideId, unsubscribe] of this.rideListeners.entries()) {
      unsubscribe();
      console.log(`Stopped tracking ride: ${rideId}`);
    }
    this.rideListeners.clear();

    // Stop location subscription
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Clear caches
    this.activeCompanionships.clear();
    this.activeRides.clear();
    this.geofenceAlerts.clear();

    console.log('Companion tracking service cleaned up');
  }
}

// Export singleton instance
export const companionTrackingService = new CompanionTrackingService();
export default companionTrackingService;
