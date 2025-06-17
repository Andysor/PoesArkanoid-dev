// Import game components
import { Game } from './game.js';
import { Paddle } from './paddle.js';
import { Ball } from './ball.js';
import { Level } from './level.js';
import { db, loadHighscores } from './firebase-init.js';

// Game configuration
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const GAME_WIDTH = isMobile ? 600 : 800;
const GAME_HEIGHT = isMobile ? 1200: 600;

const GAME_CONFIG = {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,   
};

// Initialize PIXI Application
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true
});

// Add canvas to the page
document.body.appendChild(app.view);

// Initialize Firebase
console.log('🔥 Initializing Firebase...');
loadHighscores().then(() => {
    console.log('✅ Firebase initialized successfully');
}).catch(error => {
    console.error('❌ Firebase initialization failed:', error);
});

// Set canvas style to fill the window while maintaining aspect ratio
const style = app.view.style;

// Hide canvas initially
app.view.style.display = 'none';

// Game state
let gameStarted = false;
let playerName = '';
let game = null;
let paddle = null;

// DOM Elements
const nameInputContainer = document.getElementById('name-input-container');
const nameInput = document.getElementById('name-input');
const startButton = document.getElementById('start-button');

// Initialize game components after PIXI is ready
setTimeout(() => {
    if (!game && app.stage) {
        game = new Game(app);
        paddle = game.paddle;
        
        // Set up PIXI event handlers
        app.stage.eventMode = 'static';
        app.stage.on('pointerdown', handleGameRestart);
    }
}, 100);

// DOM Event Listeners for UI elements
startButton.addEventListener('click', () => {
    playerName = nameInput.value.trim() || 'Player';
    if (!playerName) {
        alert("Please enter your name!");
        nameInput.focus();
        return;
    }
    nameInputContainer.style.display = 'none';
    document.getElementById('character-select').style.display = 'block';
});

// Set up character selection
document.querySelectorAll('.char-opt').forEach(img => {
    img.addEventListener('click', function() {
        if (!game || game.characterChosen) return;
        game.characterChosen = true;
        game.selectedCharacter = this.dataset.img;
        document.querySelectorAll('.char-opt').forEach(i => i.style.border = "2px solid #fff");
        this.style.border = "4px solid gold";
        
        document.getElementById('character-select').style.display = "none";
        app.view.style.display = 'block';
        
        // Start the game when pointer is down
        app.stage.once('pointerdown', () => {
            if (!game.gameStarted && !game.gameOver) {
                game.start();
            }
        });
        
        gameStarted = true;
        //game.start();
    });
});

// Game loop
app.ticker.add(() => {
    if (gameStarted && game) {
        game.update();
        paddle.update();
        game.levelInstance.update();
    }
});

// Handle window resize (keep as DOM event since it's a window-level event)
window.addEventListener('resize', () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Different aspect ratios and max sizes for mobile and desktop
    const aspectRatio = isMobile ? 9/16 : 4/3; // Portrait for mobile, landscape for desktop
    const maxWidth = isMobile ? 720 : 1200; // Increased from 450 to 720 for mobile
    const maxHeight = isMobile ? 1280 : 900; // Increased from 800 to 1280 for mobile
    
    // Set resolution multiplier for mobile
    const resolutionMultiplier = isMobile ? 2 : 1; // Double resolution for mobile
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Calculate dimensions while maintaining aspect ratio
    if (width / height > aspectRatio) {
        width = height * aspectRatio;
    } else {
        height = width / aspectRatio;
    }
    
    // Apply maximum dimensions
    if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
    }
    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }
    
    // Apply resolution multiplier for mobile
    if (isMobile) {
        width *= resolutionMultiplier;
        height *= resolutionMultiplier;
    }
    
    app.renderer.resize(width, height);
    
    // Center the canvas
    app.view.style.position = 'absolute';
    app.view.style.left = '50%';
    app.view.style.top = '50%';
    app.view.style.transform = 'translate(-50%, -50%)';
    
    // Adjust name input container for mobile
    if (isMobile) {
        const nameInputContainer = document.getElementById('name-input-container');
        nameInputContainer.style.width = '90%';
        nameInputContainer.style.maxWidth = '400px';
        nameInputContainer.style.padding = '15px';
    }
});

// PIXI Event Handlers
function handleGameRestart() {
    if (game.gameOver) {
        game.restart();
    }
} 