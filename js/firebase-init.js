import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyCLqLsgbNjF4u5moiX5cSlDAIYLsGOLuvo",
    authDomain: "poes-game.firebaseapp.com",
    projectId: "poes-game",
    storageBucket: "poes-game.firebasestorage.app",
    messagingSenderId: "108944813654",
    appId: "1:108944813654:web:0691c4d001ff22ce2d95f7",
    measurementId: "G-V5RRLNKDVZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let highscoreList = [];

async function loadHighscores() {
    try {
        const highscoresRef = collection(db, "highscores_new");
        const q = query(highscoresRef, orderBy("score", "desc"), limit(10));
        const snapshot = await getDocs(q);
        
        highscoreList = snapshot.docs.map(doc => doc.data());
        return highscoreList;
    } catch (error) {
        console.error("Error loading highscores:", error);
        return [];
    }
}

async function saveHighscore(playerName, score, level, character) {
    try {
        const highscoresRef = collection(db, "highscores_new");
        
        // Create high score document with the same fields as in the database
        const highscoreData = {
            name: playerName,
            score: score,
            level: level,
            character: character,
            date: serverTimestamp()
        };
        
        console.log('🔥 Saving high score to highscores_new:', highscoreData);
        
        const docRef = await addDoc(highscoresRef, highscoreData);
        console.log('✅ High score saved with ID:', docRef.id);
        
        return docRef.id;
    } catch (error) {
        console.error("Error saving highscore:", error);
        throw error;
    }
}

export { db, loadHighscores, saveHighscore }; 