import { loadHighscores, saveHighscore } from './firebase-init.js';
import { ASSETS, loadImage } from './assets.js';

export class GameOverManager {
    constructor(app) {
        console.log('🎮 GameOverManager: Initializing...');
        this.app = app;
        
        // Create canvas elements
        this.gameOverCanvas = document.createElement('canvas');
        this.highscoreCanvas = document.createElement('canvas');
        
        // Set canvas dimensions to match game screen
        [this.gameOverCanvas, this.highscoreCanvas].forEach(canvas => {
            // Set internal resolution to match game
            canvas.width = app.screen.width;
            canvas.height = app.screen.height;
            
            // Set display size to match game canvas
            canvas.style.width = app.view.style.width;
            canvas.style.height = app.view.style.height;
            
            // Position canvas on top of game
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.pointerEvents = 'none';
            canvas.style.display = 'none';
            
            // Add to DOM
            app.view.parentElement.appendChild(canvas);
        });
        
        // Get contexts
        this.gameOverCtx = this.gameOverCanvas.getContext('2d');
        this.highscoreCtx = this.highscoreCanvas.getContext('2d');
        
        // Initialize state
        this.currentScore = 0;
        
        // Pre-load character images for high score display
        this.characterImages = {};
        this.loadCharacterImages();
        
        console.log('🎮 GameOverManager: Initialized with canvases', {
            width: app.screen.width,
            height: app.screen.height,
            styleWidth: app.view.style.width,
            styleHeight: app.view.style.height
        });
    }
    
    async loadCharacterImages() {
        const characterKeys = Object.keys(ASSETS.images.characters);
        for (const key of characterKeys) {
            const img = loadImage(ASSETS.images.characters[key]);
            await new Promise((resolve) => {
                img.onload = () => {
                    this.characterImages[key] = img;
                    resolve();
                };
            });
        }
        console.log('🎮 Character images loaded for high score display');
    }
    
    handleGameOver = async (score, game) => {
        console.log('💀 Game Over: Lives depleted');
        
        // Store game instance
        this.game = game;
        
        // Stop the game loop
        this.app.ticker.stop();
        
        // Hide all game elements
        if (this.app.stage.children) {
            this.app.stage.children.forEach(child => {
                child.visible = false;
            });
        }
        
        // Update score
        this.currentScore = score;
        
        // Save high score to Firebase
        try {
            const playerName = game.playerName || 'Player';
            const level = game.level || 1;
            const character = game.selectedCharacter || 'rugbyball';
            
            console.log('🔥 Attempting to save high score:', {
                playerName,
                score,
                level,
                character
            });
            
            await saveHighscore(playerName, score, level, character);
            console.log('✅ High score saved successfully');
        } catch (error) {
            console.error('❌ Failed to save high score:', error);
            // Don't break the game flow - continue to show game over screen
            console.log('⚠️ Continuing with game over screen despite save failure');
        }
        
        // Show game over screen
        this.showGameOverScreen();
    }
    
    showGameOverScreen = () => {
        // Clear canvas
        this.gameOverCtx.clearRect(0, 0, this.gameOverCanvas.width, this.gameOverCanvas.height);
        
        // Draw semi-transparent black background
        this.gameOverCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.gameOverCtx.fillRect(0, 0, this.gameOverCanvas.width, this.gameOverCanvas.height);
        
        // Draw game over text
        this.gameOverCtx.fillStyle = '#ff0000';
        this.gameOverCtx.font = '48px Arial';
        this.gameOverCtx.textAlign = 'center';
        this.gameOverCtx.fillText('SPEL VERBY!', this.gameOverCanvas.width / 2, 80);
        
        // Draw score
        this.gameOverCtx.fillStyle = '#ffffff';
        this.gameOverCtx.font = '28px Arial';
        this.gameOverCtx.fillText(`Score: ${this.currentScore}`, this.gameOverCanvas.width / 2, 130);
        
        // Show canvas and make it interactive
        this.gameOverCanvas.style.display = 'block';
        this.gameOverCanvas.style.pointerEvents = 'auto';
        
        // Add click handler
        this.gameOverCanvas.onclick = () => {
            console.log('🔄 Click detected on game over screen');
            this.showHighScoreScreen();
        };
    }
    
    showHighScoreScreen = async () => {
        // Hide game over screen
        this.gameOverCanvas.style.display = 'none';
        this.gameOverCanvas.style.pointerEvents = 'none';
        
        // Clear canvas
        this.highscoreCtx.clearRect(0, 0, this.highscoreCanvas.width, this.highscoreCanvas.height);
        
        // Draw semi-transparent black background
        this.highscoreCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.highscoreCtx.fillRect(0, 0, this.highscoreCanvas.width, this.highscoreCanvas.height);
        
        // Draw title
        this.highscoreCtx.fillStyle = '#ffffff';
        this.highscoreCtx.font = '36px Arial';
        this.highscoreCtx.textAlign = 'center';
        this.highscoreCtx.fillText('HIGH SCORES', this.highscoreCanvas.width / 2, 50);
        
        // Load and display high scores
        const highscores = await loadHighscores();
        console.log('📊 High scores loaded:', highscores);
        
        // Draw column headers
        this.highscoreCtx.font = '16px Arial';
        this.highscoreCtx.fillStyle = '#ffff00';
        this.highscoreCtx.textAlign = 'left';
        
        const startX = 20;
        const charX = startX + 30;
        const nameX = charX + 50;
        const scoreX = nameX + 100;
        const levelX = scoreX + 80;
        const dateX = levelX + 80;
        
        this.highscoreCtx.fillText('', startX, 110);
        this.highscoreCtx.fillText('Char.', charX, 110);
        this.highscoreCtx.fillText('Name', nameX, 110);
        this.highscoreCtx.fillText('Score', scoreX, 110);
        this.highscoreCtx.fillText('Level', levelX, 110);
        this.highscoreCtx.fillText('Date', dateX, 110);
        
        // Display high scores
        this.highscoreCtx.font = '14px Arial';
        highscores.forEach((score, index) => {
            const yPos = 150 + index * 45;
            
            // Draw rank
            this.highscoreCtx.fillStyle = '#ffffff';
            this.highscoreCtx.fillText(`${index + 1}.`, startX, yPos);
            
            // Draw character image if available
            if (score.character && this.characterImages[score.character]) {
                const charImg = this.characterImages[score.character];
                const charSize = 30;
                this.highscoreCtx.drawImage(
                    charImg, 
                    charX, 
                    yPos - charSize + 10, 
                    charSize, 
                    charSize
                );
            }
            
            // Draw name
            this.highscoreCtx.fillStyle = '#ffffff';
            this.highscoreCtx.fillText(
                score.name || 'Unknown',
                nameX,
                yPos
            );
            
            // Draw score
            this.highscoreCtx.fillStyle = '#ffff00';
            this.highscoreCtx.fillText(
                score.score || 0,
                scoreX,
                yPos
            );
            
            // Draw level
            this.highscoreCtx.fillStyle = '#00ffff';
            this.highscoreCtx.fillText(
                score.level || 1,
                levelX,
                yPos
            );
            
            // Draw date
            if (score.date) {
                this.highscoreCtx.fillStyle = '#cccccc';
                const date = score.date.toDate ? score.date.toDate() : new Date(score.date);
                const dateStr = date.toLocaleDateString();
                this.highscoreCtx.fillText(
                    dateStr,
                    dateX,
                    yPos
                );
            }
        });
        
        // Draw click to continue text
        this.highscoreCtx.textAlign = 'center';
        this.highscoreCtx.fillStyle = '#ffffff';
        this.highscoreCtx.font = '18px Arial';
        this.highscoreCtx.fillText(
            'Click to continue',
            this.highscoreCanvas.width / 2,
            this.highscoreCanvas.height - 50
        );
        
        // Show canvas and make it interactive
        this.highscoreCanvas.style.display = 'block';
        this.highscoreCanvas.style.pointerEvents = 'auto';
        
        // Add click handler
        this.highscoreCanvas.onclick = () => {
            console.log('🔄 Click detected on high score screen');
            this.startNewGame();
        };
    }
    
    startNewGame = () => {
        console.log('🔄 Starting new game');
        
        // Hide high score screen
        this.highscoreCanvas.style.display = 'none';
        this.highscoreCanvas.style.pointerEvents = 'none';
        
        // Show all game elements
        if (this.app.stage.children) {
            this.app.stage.children.forEach(child => {
                child.visible = true;
            });
        }
        
        // Start the game loop
        this.app.ticker.start();
        
        // Reset game state and start the game
        if (this.game) {
            this.game.restart();
        } else {
            console.error('Game instance not found');
        }
    }
} 