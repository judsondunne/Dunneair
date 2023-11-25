

const { initializeApp } = require('firebase/app');
const { getDatabase } = require('firebase/database');

const firebaseConfig = {
    apiKey: "AIzaSyCTbBhVfSzjTSwRjZRsmmsQ4o-Mpp4Zv5k",
    authDomain: "dunne-air-20f72.firebaseapp.com",
    projectId: "dunne-air-20f72",
    storageBucket: "dunne-air-20f72.appspot.com",
    messagingSenderId: "629860912946",
    appId: "1:629860912946:web:ab1563f0e2c174f470d12b",
    measurementId: "G-YXR3HW939F"
  };

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

module.exports = database;