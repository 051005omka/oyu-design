
/* FIREBASE CONFIGURATION & INITIALIZATION */
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project
// 3. Enable "Firestore Database" (Start in Test Mode)
// 4. Enable "Authentication" (Sign-in method: Email/Password)
// 5. Go to Project Settings -> General -> "Your apps" -> Web app (</>) -> Copy config
// 6. Paste the values below:

const firebaseConfig = {
    apiKey: "AIzaSyAxfAzAqJqeQnIgEczyY1mxr48oAy2iFzQ",
    authDomain: "oyu-designgroup.firebaseapp.com",
    projectId: "oyu-designgroup",
    storageBucket: "oyu-designgroup.firebasestorage.app",
    messagingSenderId: "427032427768",
    appId: "1:427032427768:web:51d4a0425e50418f2c0f0d",
    measurementId: "G-MD04T23JX1"
};

// Initialize Firebase
let db = null;
let auth = null;
let storage = null;

try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY" && typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        // storage = firebase.storage(); // Uncomment if you enable Storage
        console.log("Firebase initialized");
    } else {
        console.log("Firebase config missing or SDK not loaded. Using LocalStorage.");
    }
} catch (e) {
    console.error("Firebase init error:", e);
}
