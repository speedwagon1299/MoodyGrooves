// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCgYT2csxYyt3k0mG2LVvE9NLXC53qGtlk",
    authDomain: "moodygrooves-9de87.firebaseapp.com",
    projectId: "moodygrooves-9de87",
    storageBucket: "moodygrooves-9de87.firebasestorage.app",
    messagingSenderId: "351407185728",
    appId: "1:351407185728:web:1f360465a45bf66b0964a5",
    measurementId: "G-DEE1ZSF25J",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
