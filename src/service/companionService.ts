import { auth, db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  deleteDoc,
  orderBy,
  limit 
} from 'firebase/firestore';
import { notificationService } from './notificationService';

export interface CompanionUser {
  id: string;
  uid: string;
  username: string;
  email: string;
  phone?: string;
  profileImage?: string;
  createdAt: Date;
  isActive: boolean;
  lastActive: Date;
  preferences: {
    notifications: boolean;
    trackingDistance: number; // in meters
    autoTracking: boolean;
  };
}

export interface TravelerCompanionLink {
  id: string;
  companionId: string;
  travelerId: string;
  travelerName: string;
  companionName: string;
  status: 'pending' | 'active' | 'paused' | 'removed';
  createdAt: Date;
  updatedAt: Date;
  permissions: {
    canTrack: boolean;
    canGetNotifications: boolean;
    canViewHistory: boolean;
  };
  settings: {
    trackingEnabled: boolean;
    notificationDistance: number; // in meters
    autoTracking: boolean;
  };
}

export interface CompanionTrackingData {
  id: string;
  linkId: string;
  companionId: string;
  travelerId: string;
  rideId: string;
  status: 'tracking' | 'completed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
  };
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimatedArrival?: Date;
  lastUpdate: Date;
}

class CompanionService {
  private currentCompanion: CompanionUser | null = null;
  private activeLinks: Map<string, TravelerCompanionLink> = new Map();
  private trackingData: Map<string, CompanionTrackingData> = new Map();

  constructor() {
    this.initializeService();
  }

  // Initialize the service
  private async initializeService() {
    if (auth.currentUser) {
      await this.loadCompanionProfile();
      await this.loadActiveLinks();
    }
  }

  // Load companion profile
  private async loadCompanionProfile() {
    if (!auth.currentUser) return;

    try {
      const companionDoc = await getDocs(
        query(collection(db, 'companions'), where('uid', '==', auth.currentUser.uid))
      );

      if (!companionDoc.empty) {
        this.currentCompanion = {
          id: companionDoc.docs[0].id,
          ...companionDoc.docs[0].data()
        } as CompanionUser;
      }
    } catch (error) {
      console.error('Error loading companion profile:', error);
    }
  }

  // Load active links
  private async loadActiveLinks() {
    if (!this.currentCompanion) return;

    try {
      const linksQuery = query(
        collection(db, 'travelerCompanionLinks'),
        where('companionId', '==', this.currentCompanion.id),
        where('status', 'in', ['active', 'pending'])
      );

      const snapshot = await getDocs(linksQuery);
      this.activeLinks.clear();

      snapshot.forEach((doc) => {
        const link = { id: doc.id, ...doc.data() } as TravelerCompanionLink;
        this.activeLinks.set(doc.id, link);
      });

      console.log(`Loaded ${this.activeLinks.size} active links`);
    } catch (error) {
      console.error('Error loading active links:', error);
    }
  }

  // Create companion user
  async createCompanionUser(companionData: Omit<CompanionUser, 'id' | 'createdAt' | 'lastActive'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'companions'), {
        ...companionData,
        createdAt: new Date(),
        lastActive: new Date(),
        isActive: true,
        preferences: {
          notifications: true,
          trackingDistance: 500, // 500 meters default
          autoTracking: true,
        },
      });

      console.log('Companion user created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating companion user:', error);
      throw error;
    }
  }

  // Update companion profile
  async updateCompanionProfile(updates: Partial<CompanionUser>): Promise<void> {
    if (!this.currentCompanion) throw new Error('No companion profile loaded');

    try {
      const companionRef = doc(db, 'companions', this.currentCompanion.id);
      await updateDoc(companionRef, {
        ...updates,
        updatedAt: new Date(),
      });

      // Update local cache
      Object.assign(this.currentCompanion, updates);
      console.log('Companion profile updated');
    } catch (error) {
      console.error('Error updating companion profile:', error);
      throw error;
    }
  }

  // Link companion to traveler
  async linkToTraveler(travelerId: string, travelerName: string): Promise<string> {
    if (!this.currentCompanion) throw new Error('No companion profile loaded');

    try {
      // Check if link already exists
      const existingLink = await getDocs(
        query(
          collection(db, 'travelerCompanionLinks'),
          where('companionId', '==', this.currentCompanion.id),
          where('travelerId', '==', travelerId),
          where('status', 'in', ['active', 'pending'])
        )
      );

      if (!existingLink.empty) {
        throw new Error('Already linked to this traveler');
      }

      // Create new link
      const linkData: Omit<TravelerCompanionLink, 'id'> = {
        companionId: this.currentCompanion.id,
        travelerId,
        travelerName,
        companionName: this.currentCompanion.username,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: {
          canTrack: true,
          canGetNotifications: true,
          canViewHistory: true,
        },
        settings: {
          trackingEnabled: true,
          notificationDistance: 200, // 200 meters default
          autoTracking: true,
        },
      };

      const docRef = await addDoc(collection(db, 'travelerCompanionLinks'), linkData);
      
      // Add to local cache
      this.activeLinks.set(docRef.id, { id: docRef.id, ...linkData });

      // Send notification to traveler
      await notificationService.sendCompanionLinkedNotification(
        travelerId,
        this.currentCompanion.username
      );

      console.log('Linked to traveler:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error linking to traveler:', error);
      throw error;
    }
  }

  // Accept traveler link request
  async acceptTravelerLink(linkId: string): Promise<void> {
    try {
      const linkRef = doc(db, 'travelerCompanionLinks', linkId);
      await updateDoc(linkRef, {
        status: 'active',
        updatedAt: new Date(),
      });

      // Update local cache
      const link = this.activeLinks.get(linkId);
      if (link) {
        link.status = 'active';
        link.updatedAt = new Date();
      }

      console.log('Traveler link accepted:', linkId);
    } catch (error) {
      console.error('Error accepting traveler link:', error);
      throw error;
    }
  }

  // Remove traveler link
  async removeTravelerLink(linkId: string): Promise<void> {
    try {
      const linkRef = doc(db, 'travelerCompanionLinks', linkId);
      await updateDoc(linkRef, {
        status: 'removed',
        updatedAt: new Date(),
      });

      // Remove from local cache
      this.activeLinks.delete(linkId);

      console.log('Traveler link removed:', linkId);
    } catch (error) {
      console.error('Error removing traveler link:', error);
      throw error;
    }
  }

  // Start tracking a traveler
  async startTrackingTraveler(linkId: string, rideId: string, destination: { latitude: number; longitude: number; address: string }): Promise<string> {
    if (!this.currentCompanion) throw new Error('No companion profile loaded');

    try {
      const link = this.activeLinks.get(linkId);
      if (!link) throw new Error('Link not found');

      const trackingData: Omit<CompanionTrackingData, 'id'> = {
        linkId,
        companionId: this.currentCompanion.id,
        travelerId: link.travelerId,
        rideId,
        status: 'tracking',
        startTime: new Date(),
        destination,
        lastUpdate: new Date(),
      };

      const docRef = await addDoc(collection(db, 'companionTracking'), trackingData);
      
      // Add to local cache
      this.trackingData.set(docRef.id, { id: docRef.id, ...trackingData });

      console.log('Started tracking traveler:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  }

  // Update tracking location
  async updateTrackingLocation(trackingId: string, location: { latitude: number; longitude: number; accuracy?: number }): Promise<void> {
    try {
      const trackingRef = doc(db, 'companionTracking', trackingId);
      await updateDoc(trackingRef, {
        currentLocation: {
          ...location,
          timestamp: new Date(),
        },
        lastUpdate: new Date(),
      });

      // Update local cache
      const tracking = this.trackingData.get(trackingId);
      if (tracking) {
        tracking.currentLocation = {
          ...location,
          timestamp: new Date(),
        };
        tracking.lastUpdate = new Date();
      }

      console.log('Tracking location updated:', trackingId);
    } catch (error) {
      console.error('Error updating tracking location:', error);
      throw error;
    }
  }

  // Stop tracking
  async stopTracking(trackingId: string, reason: 'completed' | 'cancelled'): Promise<void> {
    try {
      const trackingRef = doc(db, 'companionTracking', trackingId);
      await updateDoc(trackingRef, {
        status: reason,
        endTime: new Date(),
        lastUpdate: new Date(),
      });

      // Update local cache
      const tracking = this.trackingData.get(trackingId);
      if (tracking) {
        tracking.status = reason;
        tracking.endTime = new Date();
        tracking.lastUpdate = new Date();
      }

      console.log('Tracking stopped:', trackingId, reason);
    } catch (error) {
      console.error('Error stopping tracking:', error);
      throw error;
    }
  }

  // Get active tracking data
  getActiveTracking(): CompanionTrackingData[] {
    return Array.from(this.trackingData.values()).filter(t => t.status === 'tracking');
  }

  // Get companion profile
  getCompanionProfile(): CompanionUser | null {
    return this.currentCompanion;
  }

  // Get active links
  getActiveLinks(): TravelerCompanionLink[] {
    return Array.from(this.activeLinks.values());
  }

  // Check if linked to traveler
  isLinkedToTraveler(travelerId: string): boolean {
    return Array.from(this.activeLinks.values()).some(
      link => link.travelerId === travelerId && link.status === 'active'
    );
  }

  // Get tracking data for a specific ride
  getTrackingDataForRide(rideId: string): CompanionTrackingData | null {
    return Array.from(this.trackingData.values()).find(t => t.rideId === rideId) || null;
  }

  // Update link settings
  async updateLinkSettings(linkId: string, settings: Partial<TravelerCompanionLink['settings']>): Promise<void> {
    try {
      const linkRef = doc(db, 'travelerCompanionLinks', linkId);
      await updateDoc(linkRef, {
        'settings': settings,
        updatedAt: new Date(),
      });

      // Update local cache
      const link = this.activeLinks.get(linkId);
      if (link) {
        Object.assign(link.settings, settings);
        link.updatedAt = new Date();
      }

      console.log('Link settings updated:', linkId);
    } catch (error) {
      console.error('Error updating link settings:', error);
      throw error;
    }
  }

  // Get companion statistics
  async getCompanionStats(): Promise<{
    totalLinks: number;
    activeLinks: number;
    totalTrackingSessions: number;
    completedTrackingSessions: number;
  }> {
    if (!this.currentCompanion) throw new Error('No companion profile loaded');

    try {
      const linksQuery = query(
        collection(db, 'travelerCompanionLinks'),
        where('companionId', '==', this.currentCompanion.id)
      );
      const linksSnapshot = await getDocs(linksQuery);

      const trackingQuery = query(
        collection(db, 'companionTracking'),
        where('companionId', '==', this.currentCompanion.id)
      );
      const trackingSnapshot = await getDocs(trackingQuery);

      const totalLinks = linksSnapshot.size;
      const activeLinks = linksSnapshot.docs.filter(doc => doc.data().status === 'active').length;
      const totalTrackingSessions = trackingSnapshot.size;
      const completedTrackingSessions = trackingSnapshot.docs.filter(doc => doc.data().status === 'completed').length;

      return {
        totalLinks,
        activeLinks,
        totalTrackingSessions,
        completedTrackingSessions,
      };
    } catch (error) {
      console.error('Error getting companion stats:', error);
      throw error;
    }
  }

  // Cleanup method
  cleanup() {
    this.activeLinks.clear();
    this.trackingData.clear();
    this.currentCompanion = null;
  }
}

// Export singleton instance
export const companionService = new CompanionService();
export default companionService;
