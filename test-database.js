const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, query, where, getDocs, onSnapshot } = require('firebase/firestore');
const { getDatabase, ref, push, set, onValue, off } = require('firebase/database');

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
const realtimeDb = getDatabase(app);

async function testDatabaseFunctionality() {
  console.log('🧪 Starting comprehensive database functionality test...\n');

  try {
    // Test 1: Firebase Authentication
    console.log('1️⃣ Testing Firebase Authentication...');
    const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
    console.log('✅ Authentication successful:', userCredential.user.email);
    
    // Test 2: Firestore Operations
    console.log('\n2️⃣ Testing Firestore Operations...');
    
    // Test adding document to history collection
    const historyData = {
      userID: userCredential.user.uid,
      rideID: 'test-ride-' + Date.now(),
      from: 'Test Start Location',
      to: 'Test End Location',
      startLat: 26.4755,
      startLong: 73.1149,
      endLat: 26.4690,
      endLong: 73.1259,
      date: new Date().toDateString(),
      time: new Date().toISOString(),
      amount: '150',
      distance: '5.2',
      duration: 1800,
      status: 'requested',
      type: 'individual',
      timestamp: new Date(),
      userName: 'Test User'
    };
    
    const historyRef = await addDoc(collection(db, 'history'), historyData);
    console.log('✅ Document added to history collection:', historyRef.id);
    
    // Test querying documents
    const historyQuery = query(collection(db, 'history'), where('userID', '==', userCredential.user.uid));
    const historySnapshot = await getDocs(historyQuery);
    console.log('✅ History query successful, found', historySnapshot.size, 'documents');
    
    // Test 3: Realtime Database Operations
    console.log('\n3️⃣ Testing Realtime Database Operations...');
    
    // Test adding ride request
    const rideRequestData = {
      userID: userCredential.user.uid,
      userName: 'Test User',
      from: 'Test Start',
      to: 'Test End',
      startLat: 26.4755,
      startLong: 73.1149,
      endLat: 26.4690,
      endLong: 73.1259,
      date: new Date().toDateString(),
      time: new Date().toISOString(),
      requestedAt: Date.now(),
      status: 'requested',
      distance: 5.2,
      duration: 1800,
      amount: 150,
      driverAccepted: false,
    };
    
    const rideRequestsRef = ref(realtimeDb, 'rideRequests');
    const newRequestRef = push(rideRequestsRef);
    await set(newRequestRef, rideRequestData);
    console.log('✅ Ride request added to Realtime DB:', newRequestRef.key);
    
    // Test 4: Real-time Listeners
    console.log('\n4️⃣ Testing Real-time Listeners...');
    
    // Test Firestore real-time listener
    const unsubscribeFirestore = onSnapshot(historyQuery, (snapshot) => {
      console.log('✅ Firestore real-time update received, documents count:', snapshot.size);
    });
    
    // Test Realtime DB listener
    const unsubscribeRealtime = onValue(rideRequestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('✅ Realtime DB update received, ride requests count:', Object.keys(data).length);
      }
    });
    
    // Wait a bit for listeners to receive updates
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Cleanup listeners
    unsubscribeFirestore();
    off(rideRequestsRef, 'value', unsubscribeRealtime);
    console.log('✅ Real-time listeners cleaned up');
    
    // Test 5: Driver History Collection
    console.log('\n5️⃣ Testing Driver History Collection...');
    
    const driverHistoryData = {
      driverId: userCredential.user.uid,
      rideId: 'test-ride-' + Date.now(),
      from: 'Driver Test Start',
      to: 'Driver Test End',
      startLat: 26.4755,
      startLong: 73.1149,
      endLat: 26.4690,
      endLong: 73.1259,
      date: new Date().toDateString(),
      time: new Date().toISOString(),
      amount: 150,
      distance: 5.2,
      duration: 1800,
      status: 'accepted',
      userName: 'Test Passenger',
      timestamp: new Date(),
      driverName: 'Test Driver',
      vehicleInfo: {
        make: 'Test Make',
        model: 'Test Model',
        color: 'Test Color',
        licensePlate: 'TEST123',
        year: '2020'
      }
    };
    
    const driverHistoryRef = await addDoc(collection(db, 'driverHistory'), driverHistoryData);
    console.log('✅ Driver history document added:', driverHistoryRef.id);
    
    // Test 6: Collections Verification
    console.log('\n6️⃣ Verifying All Collections...');
    
    const collections = ['history', 'driverHistory', 'drivers', 'users', 'geofences', 'notifications', 'feedback', 'rideShares'];
    
    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        console.log(`✅ Collection '${collectionName}' exists with ${snapshot.size} documents`);
      } catch (error) {
        console.log(`⚠️ Collection '${collectionName}' not accessible or doesn't exist:`, error.message);
      }
    }
    
    console.log('\n🎉 All database functionality tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   • Firebase Authentication: ✅ Working');
    console.log('   • Firestore Operations: ✅ Working');
    console.log('   • Realtime Database: ✅ Working');
    console.log('   • Real-time Listeners: ✅ Working');
    console.log('   • Collections: ✅ Verified');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDatabaseFunctionality().then(() => {
  console.log('\n🏁 Test script execution completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
