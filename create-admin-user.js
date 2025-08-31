const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, doc, setDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApkOtrZclteNQqHqJPShfUH8Cdeda_wYI",
  authDomain: "misp-646af.firebaseapp.com",
  projectId: "misp-646af",
  storageBucket: "misp-646af.appspot.com",
  messagingSenderId: "107131687627361556937",
  appId: "1:833357430468:web:5b0ef690634185ceced391",
  databaseURL: "https://misp-646af-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdminUser() {
  console.log('🔐 Creating admin user account...\n');

  try {
    // Admin user credentials
    const adminEmail = 'admin@ridewise.com';
    const adminPassword = 'Admin@123456';
    const adminName = 'Admin User';

    console.log('1️⃣ Creating Firebase Auth user...');
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const adminUser = userCredential.user;
    
    console.log('✅ Firebase Auth user created successfully:', adminUser.uid);
    console.log('📧 Email:', adminEmail);

    console.log('\n2️⃣ Creating Firestore user document with admin role...');
    
    // Create user document in Firestore with admin role
    const userData = {
      uid: adminUser.uid,
      email: adminEmail,
      displayName: adminName,
      role: 'admin',
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {
        firstName: 'Admin',
        lastName: 'User',
        phoneNumber: '+1234567890',
        profilePicture: null,
        isVerified: true,
        isActive: true
      },
      preferences: {
        notifications: true,
        emailUpdates: true,
        pushNotifications: true
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

    console.log('\n3️⃣ Creating admin profile in admin collection...');
    
    // Create additional admin profile
    const adminProfile = {
      uid: adminUser.uid,
      email: adminEmail,
      name: adminName,
      role: 'admin',
      permissions: userData.permissions,
      lastLogin: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'admins', adminUser.uid), adminProfile);
    console.log('✅ Admin profile created in admins collection');

    console.log('\n🎉 Admin user creation completed successfully!');
    console.log('\n📋 Admin Account Details:');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    console.log('   UID:', adminUser.uid);
    console.log('   Role: admin');
    console.log('\n⚠️  Please save these credentials securely!');
    console.log('🔐 You can now log in to the admin dashboard using these credentials.');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('\nℹ️  Admin user already exists. Checking current role...');
      
      // Try to sign in and check role
      try {
        const signInResult = await auth.signInWithEmailAndPassword('admin@ridewise.com', 'Admin@123456');
        const user = signInResult.user;
        
        // Check if user document exists and has admin role
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists && userDoc.data().role === 'admin') {
          console.log('✅ Admin user already exists and has correct role');
        } else {
          console.log('⚠️  User exists but may not have admin role. Please check manually.');
        }
      } catch (signInError) {
        console.error('❌ Error signing in to existing admin account:', signInError);
      }
    }
  }
}

// Run the function
createAdminUser()
  .then(() => {
    console.log('\n🏁 Script execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script execution failed:', error);
    process.exit(1);
  });
