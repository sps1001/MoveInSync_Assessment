import { auth, db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  updateDoc 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin';
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    profilePicture: string | null;
    isVerified: boolean;
    isActive: boolean;
  };
  permissions: {
    canManageUsers: boolean;
    canViewAnalytics: boolean;
    canManageRides: boolean;
    canManageFeedback: boolean;
    canAccessAdminPanel: boolean;
  };
}

export interface AdminProfile {
  uid: string;
  email: string;
  name: string;
  role: 'admin';
  permissions: AdminUser['permissions'];
  lastLogin: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class AdminService {
  private static instance: AdminService;
  private currentAdmin: AdminUser | null = null;

  private constructor() {}

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  /**
   * Create an admin user account
   * This should be called once during app setup
   */
  async createAdminUser(email: string, password: string, displayName: string): Promise<AdminUser | null> {
    try {
      console.log('🔐 Creating admin user account...');

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const adminUser = userCredential.user;

      console.log('✅ Firebase Auth user created successfully:', adminUser.uid);

      // Create user document in Firestore with admin role
      const userData: AdminUser = {
        uid: adminUser.uid,
        email: email,
        displayName: displayName,
        role: 'admin',
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: {
          firstName: displayName.split(' ')[0] || 'Admin',
          lastName: displayName.split(' ').slice(1).join(' ') || 'User',
          phoneNumber: '+1234567890',
          profilePicture: null,
          isVerified: true,
          isActive: true
        },
        permissions: {
          canManageUsers: true,
          canViewAnalytics: true,
          canManageRides: true,
          canManageFeedback: true,
          canAccessAdminPanel: true
        }
      };

      // Add to users collection
      await setDoc(doc(db, 'users', adminUser.uid), userData);
      console.log('✅ Firestore user document created with admin role');

      // Create additional admin profile
      const adminProfile: AdminProfile = {
        uid: adminUser.uid,
        email: email,
        name: displayName,
        role: 'admin',
        permissions: userData.permissions,
        lastLogin: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'admins', adminUser.uid), adminProfile);
      console.log('✅ Admin profile created in admins collection');

      this.currentAdmin = userData;
      console.log('🎉 Admin user creation completed successfully!');
      
      return userData;
    } catch (error) {
      console.error('❌ Error creating admin user:', error);
      return null;
    }
  }

  /**
   * Sign in as admin user
   */
  async signInAsAdmin(email: string, password: string): Promise<AdminUser | null> {
    try {
      console.log('🔐 Signing in as admin...');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user has admin role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        console.log('❌ User document not found');
        return null;
      }

      const userData = userDoc.data() as AdminUser;
      
      if (userData.role !== 'admin' || !userData.isAdmin) {
        console.log('❌ User does not have admin privileges');
        return null;
      }

      // Update last login
      await updateDoc(doc(db, 'admins', user.uid), {
        lastLogin: new Date(),
        updatedAt: new Date()
      });

      this.currentAdmin = userData;
      console.log('✅ Admin sign in successful');
      
      return userData;
    } catch (error) {
      console.error('❌ Error signing in as admin:', error);
      return null;
    }
  }

  /**
   * Check if current user has admin access
   */
  async checkAdminAccess(): Promise<boolean> {
    try {
      if (!auth.currentUser) {
        return false;
      }

      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data() as AdminUser;
      return userData.role === 'admin' && userData.isAdmin;
    } catch (error) {
      console.error('Error checking admin access:', error);
      return false;
    }
  }

  /**
   * Get current admin user
   */
  getCurrentAdmin(): AdminUser | null {
    return this.currentAdmin;
  }

  /**
   * Sign out admin
   */
  signOutAdmin(): void {
    this.currentAdmin = null;
    auth.signOut();
  }

  /**
   * Get all admin users
   */
  async getAllAdmins(): Promise<AdminUser[]> {
    try {
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'admin'),
        where('isAdmin', '==', true)
      );

      const snapshot = await getDocs(adminsQuery);
      const admins: AdminUser[] = [];

      snapshot.forEach((doc) => {
        admins.push(doc.data() as AdminUser);
      });

      return admins;
    } catch (error) {
      console.error('Error getting all admins:', error);
      return [];
    }
  }

  /**
   * Update admin permissions
   */
  async updateAdminPermissions(uid: string, permissions: Partial<AdminUser['permissions']>): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        permissions: { ...permissions },
        updatedAt: new Date()
      });

      await updateDoc(doc(db, 'admins', uid), {
        permissions: { ...permissions },
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error updating admin permissions:', error);
      return false;
    }
  }
}

export const adminService = AdminService.getInstance();
export default AdminService;
