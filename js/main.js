// Import game components
import { Game } from './game.js';
import { Paddle } from './paddle.js';
import { Ball } from './ball.js';
import { Level } from './level.js';
import { db, loadHighscores } from './firebase-init.js';

// Game configuration
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const GAME_CONFIG = {
    width: isMobile ? 720 : 800,
    height: isMobile ? 1280 : 600,
    backgroundColor: 0x000000,
    resolution: 1, // Force 1:1 pixel ratio
    autoDensity: false, // Disable automatic density scaling
    antialias: true
};

// Initialize PIXI Application
const app = new PIXI.Application({
    width: isMobile ? 720 : 800,
    height: isMobile ? 1280 : 600,
    backgroundColor: 0x000000,
    resolution: 1,
    autoDensity: false,
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
style.position = 'absolute';
style.width = '100%';
style.height = '100%';
style.objectFit = 'contain';

// Log initial dimensions for debugging
console.log('Initial dimensions:', {
    screen: {
        width: window.innerWidth,
        height: window.innerHeight
    },
    canvas: {
        width: app.view.width,
        height: app.view.height,
        styleWidth: app.view.style.width,
        styleHeight: app.view.style.height
    },
    renderer: {
        width: app.renderer.width,
        height: app.renderer.height,
        resolution: app.renderer.resolution
    },
    game: {
        width: app.screen.width,
        height: app.screen.height
    }
});

// Hide canvas initially
app.view.style.display = 'none';

// Game state
let gameStarted = false;
let playerName = '';
let game = null;
let paddle = null;
let ball = null;

// DOM Elements
const nameInputContainer = document.getElementById('name-input-container');
const nameInput = document.getElementById('name-input');
const startButton = document.getElementById('start-button');

// Initialize game components after PIXI is ready
setTimeout(() => {
    if (!game && app.stage) {
        game = new Game(app);
        paddle = new Paddle(app);
        ball = new Ball(app);
        
        // Set up references
        ball.setLevel(game.levelInstance);
        ball.game = game;
    }
}, 100); // Small delay to ensure PIXI is fully initialized

// Event Listeners
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
        gameStarted = true;
        game.start();
    });
});

// Game loop
app.ticker.add(() => {
    if (gameStarted && game) {
        // Ensure ball and paddle are on stage
        if (!ball.graphics.parent) {
            app.stage.addChild(ball.graphics);
        }
        if (!paddle.graphics.parent) {
            app.stage.addChild(paddle.graphics);
        }
        
        // Ensure UI elements are visible
        if (game.scoreText && !game.scoreText.parent) {
            app.stage.addChild(game.scoreText);
        }
        if (game.livesText && !game.livesText.parent) {
            app.stage.addChild(game.livesText);
        }
        if (game.levelText && !game.levelText.parent) {
            app.stage.addChild(game.levelText);
        }
        
        game.update();
        paddle.update();
        const result = ball.update(paddle, game.levelInstance);
        if (result.lifeLost) {
            game.loseLife();
        }
        if (result.brickHit) {
            game.addScore(10);
        }
        game.levelInstance.update();
    }
});

// Handle window resize
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

// Handle space key to start game
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !game.gameStarted && !game.gameOver) {
        game.start();
        game.ball.start();
    }
});

// Handle click to restart
app.stage.addEventListener('click', () => {
    if (game.gameOver) {
        game.restart();
        game.ball.start();
    }
}); 