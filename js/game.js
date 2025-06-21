import { ASSETS, loadImage, loadSound, loadLevel } from './assets.js';
import { db, loadHighscores } from './firebase-init.js';
import { collection, addDoc, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
    BASE_INITIAL_SPEED, 
    BASE_MAX_SPEED, 
    LEVEL_SPEED_INCREASE, 
    SPEED_INCREASE_INTERVAL, 
    SPEED_INCREASE_FACTOR,
    COMPONENT_SPEED,
    getScreenRelativeSpeed,
    BASE_INITIAL_SPEED_PERCENT,
    BASE_MAX_SPEED_PERCENT,
    TIME_BONUS_CONFIG
} from './config.js';
import { Level } from './level.js';
import { GameOverManager } from './gameOverManager.js';
import { Ball } from './ball.js';
import { Paddle } from './paddle.js';
import { PowerUp } from './powerup.js';
import { forceAudioUnlock, playSoundByName } from './audio.js';
import { getPowerUpConfig } from './powerupConfig.js';
import { PowerupEffects } from './powerupEffects.js';

export class Game {
    constructor(app) {
        if (!app || !app.stage) {
            console.error('PIXI application not properly initialized');
            return;
        }

        this.app = app;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameStarted = false;
        this.readyToStart = false;
        this.playerName = '';
        this.selectedCharacter = 'rugbyball'; // Default character
        this.gameOver = false;
        this.showHighscores = false;
        this.levelLoaded = false;
        this.loadingNextLevel = false;
        this.paddleHeads = 3;
        this.characterChosen = false;
        this.brannasActive = false;
        this.brannasEndTime = 0;
        this.extraBalls = [];
        this.fallingTexts = [];
        this.waitingForInput = true;
        this.inputMode = 'waitForStart'; // 'playing', 'gameover', etc.
        this.boundHandleGameStart = this.handleGameStart.bind(this);
        this.boundHandlePointerMove = this.handlePointerMove.bind(this);
        this.boundHandlePointerUp = this.handlePointerUp.bind(this);
        this.boundHandlePointerDown = this.handlePointerDown.bind(this);
        
        // FPS monitoring
        this.fpsCounter = {
            frames: 0,
            lastTime: Date.now(),
            currentFps: 60,
            lowFpsThreshold: 60,
            lowFpsLogged: false
        };
        
        // Level completion time tracking
        this.levelStartTime = null;
        this.levelCompletionTimeBonus = 0;
        
        // Speed increase tracking
        this.lastSpeedIncreaseTime = null;
        
        // Make stage interactive
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen;
        
        // Add pointer event listeners
        this.app.stage.on('pointerdown', this.boundHandlePointerDown);
        this.app.stage.on('pointermove', this.boundHandlePointerMove);
        this.app.stage.on('pointerup', this.boundHandlePointerUp);

        // Create game container
        this.gameContainer = new PIXI.Container();
        this.app.stage.addChild(this.gameContainer);

        // Create game objects container (for background, bricks, paddle, ball)
        this.objectsContainer = new PIXI.Container();
        this.gameContainer.addChild(this.objectsContainer);
        
        // Create UI container (for score, lives, level) - add directly to stage to ensure it renders on top
        this.uiContainer = new PIXI.Container();
        this.uiContainer.zIndex = 1000; // Set high z-index to ensure it renders on top
        
        // Create score text
        this.scoreText = new PIXI.Text('Score: 0', {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 0xffffff
        });
        this.scoreText.position.set(app.screen.width - 170, 10);
        this.uiContainer.addChild(this.scoreText);
        
        // Create lives text (will be replaced with sprites when textures load)
        this.livesText = new PIXI.Text('Lives: 3', {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 0xffffff
        });
        this.livesText.position.set(app.screen.width - 200, 10);
        this.uiContainer.addChild(this.livesText);
        
        // Create level text
        this.levelText = new PIXI.Text('Level: 1', {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 0xffffff
        });
        this.levelText.position.set(app.screen.width / 2 - 50, 10);
        this.uiContainer.addChild(this.levelText);
        
        // Create game over manager
        this.gameOverManager = new GameOverManager(app);
        
        // Create power-up container
        this.powerUpContainer = new PIXI.Container();
        this.objectsContainer.addChild(this.powerUpContainer);

        // Initialize power-ups array
        this.activePowerUps = [];

        // Initialize powerup effects system
        this.powerupEffects = new PowerupEffects(app);

        // Add window focus/blur handlers for mobile cleanup
        this.boundHandleWindowBlur = this.handleWindowBlur.bind(this);
        this.boundHandleWindowFocus = this.handleWindowFocus.bind(this);
        window.addEventListener('blur', this.boundHandleWindowBlur);
        window.addEventListener('focus', this.boundHandleWindowFocus);
        window.addEventListener('visibilitychange', this.boundHandleWindowBlur);

        // Load power-up textures
        PowerUp.loadTextures().then(() => {
           // Power-ups loaded
        });
        
        // Initialize level instance
        this.levelInstance = new Level(app);
        this.objectsContainer.addChild(this.levelInstance.brickContainer);
        this.levelInstance.game = this;
        
        // Initialize level background
        this.levelBackground = null;
        this.levelBackgroundContainer = new PIXI.Container();
        this.objectsContainer.addChildAt(this.levelBackgroundContainer, 0); // Add at bottom layer
        
        // Initialize paddle
        this.paddle = new Paddle(app);
        this.objectsContainer.addChild(this.paddle.graphics);
        
        // Load ball textures and initialize main ball
        Ball.loadTextures().then(() => {
            this.ball = new Ball(this.app);
            this.ball.game = this;
            this.ball.setLevel(this.levelInstance);
            this.objectsContainer.addChild(this.ball.graphics);
        });
        
        // Load images
        this.images = {
            sausage: loadImage(ASSETS.images.items.sausage),
            coin_gold: loadImage(ASSETS.images.items.coin_gold),
            coin_silver: loadImage(ASSETS.images.items.coin_silver),
            brannas: loadImage(ASSETS.images.items.brannas)
        };

        // Create containers
        this.gameOverContainer = new PIXI.Container();
        this.characterSelectContainer = new PIXI.Container();
        
        // Add containers to stage
        this.app.stage.addChild(this.gameOverContainer);
        this.app.stage.addChild(this.characterSelectContainer);
        
        // Load character images for lives display
        this.characterTextures = {};
        this.livesSprites = [];
        this.loadCharacterTextures();
        
        // Add UI container last to ensure it renders on top
        this.app.stage.addChild(this.uiContainer);
    }

    async loadCharacterTextures() {
        const characterPaths = {
            saflag: ASSETS.images.characters.saflag,
            springbok: ASSETS.images.characters.springbok,
            voortrekker: ASSETS.images.characters.voortrekker,
            braai: ASSETS.images.characters.braai,
            rugbyball: ASSETS.images.characters.rugbyball
        };
        
        for (const [key, path] of Object.entries(characterPaths)) {
            try {
                const texture = PIXI.Texture.from(path);
                this.characterTextures[key] = texture;
            } catch (error) {
                console.error(`Failed to load character texture for ${key}:`, error);
            }
        }
        
        // Update lives display after textures are loaded
        this.updateLives();
    }

    //Handle pointer move
    handlePointerMove(e) {
        if (this.inputMode === 'playing' || this.inputMode === 'moving') {
            // Move paddle if in playing mode or moving mode (before launch)
            if (this.paddle && this.paddle.handlePointerMove) {
                this.paddle.handlePointerMove(e);
            }
            
            // If in moving mode and waiting for input, make ball follow paddle
            if (this.inputMode === 'moving' && this.waitingForInput && this.ball && !this.ball.isMoving) {
                this.ball.placeOnPaddle(this.paddle);
            }
        }
        
        // Handle input mode transitions
        if (this.inputMode === 'waitForStart' && this.waitingForInput && this.movementStartX !== null) {
            // Check if movement threshold is met
            const deltaX = Math.abs(e.data.global.x - this.movementStartX);
            const deltaY = Math.abs(e.data.global.y - this.movementStartY);
            const totalMovement = deltaX + deltaY;
            
            if (totalMovement >= 10) { // 10 pixel movement threshold
                console.log('🎯 Movement threshold met:', {
                    deltaX: deltaX,
                    deltaY: deltaY,
                    totalMovement: totalMovement,
                    threshold: 10
                });
                
                // Transition to moving mode
                this.inputMode = 'moving';
                
                // Move paddle to current position
                if (this.paddle && this.paddle.handlePointerMove) {
                    this.paddle.handlePointerMove(e);
                }
                
                // Make ball follow paddle immediately
                if (this.ball && !this.ball.isMoving) {
                    this.ball.placeOnPaddle(this.paddle);
                }
            }
        }
    }

    //Handle pointer down (start movement tracking)
    handlePointerDown(e) {
        console.log('🎯 Pointer down - Starting movement tracking:', {
            inputMode: this.inputMode,
            waitingForInput: this.waitingForInput,
            x: e.data.global.x,
            y: e.data.global.y
        });
        
        // Only track movement if waiting for input
        if (this.inputMode === 'waitForStart' && this.waitingForInput) {
            this.movementStartX = e.data.global.x;
            this.movementStartY = e.data.global.y;
        }
    }

    //Handle pointer up (ball launch)
    handlePointerUp(e) {
        console.log('🎯 Pointer up - Input received:', {
            inputMode: this.inputMode,
            waitingForInput: this.waitingForInput,
            movementStartX: this.movementStartX,
            movementStartY: this.movementStartY
        });
        
        // Reset movement tracking
        this.movementStartX = null;
        this.movementStartY = null;
    }

    //Center paddle and place ball
    centerPaddleAndPlaceBall() {
        // Use centralized paddle positioning
        this.paddle.setStartingPosition();

        if (!this.paddle || !this.ball) {
            console.error('🎯 centerPaddleAndPlaceBall - Missing paddle or ball!');
            return;
        }

        // Place ball immediately (synchronously) to avoid race conditions
        this.ball.placeOnPaddle(this.paddle);
    }

    // Unified method for creating and setting up a new ball
    createAndSetupBall() {
        // Create new main ball using resetAll to ensure proper setup
        this.ball = Ball.resetAll(this.app, this, this.levelInstance);
        
        // Add the new ball to the container
        if (this.objectsContainer) {
            this.objectsContainer.addChild(this.ball.graphics);
            
            // Ensure the ball is visible
            this.ball.graphics.visible = true;
        } else {
            console.error('🎯 createAndSetupBall - No objects container found!');
        }
        
        // Center paddle and place the new ball
        this.centerPaddleAndPlaceBall();
        
        return this.ball;
    }

    //Reset game state
    async resetGameState(keepScore = false) {
        try {
            console.log('🔄 resetGameState - Starting reset');
            
            // Reset game state
        if (!keepScore) {
                this.score = 0;
                this.level = 1; // Reset to level 1 for fresh game
            }
            this.lives = 3;
            this.gameStarted = false;
            this.gameOver = false; // Reset game over flag
            this.showHighscores = false; // Reset high scores flag
            this.waitingForInput = true;
            this.inputMode = 'waitForStart';
            this.levelLoaded = false;
            this.loadingNextLevel = false;
            this.brannasActive = false;
            this.brannasEndTime = 0;
            this.extraBalls = [];
            this.fallingTexts = [];
            
            // Reset movement tracking
            this.movementStartX = null;
            this.movementStartY = null;
        
            // Reset level completion time tracking
            this.levelStartTime = null;
            this.levelCompletionTimeBonus = 0;
            
            // Clear powerup effects
            if (this.powerupEffects) {
                this.powerupEffects.clearAllEffects();
            }
            
            // Clear active power-ups
            if (this.activePowerUps && this.activePowerUps.length > 0) {
                console.log('🧹 Clearing active power-ups:', this.activePowerUps.length);
            this.activePowerUps.forEach(powerUp => {
                if (powerUp && powerUp.deactivate) {
                    powerUp.deactivate();
                }
            });
            this.activePowerUps = [];
        }
        
            // Clear power-up container
            if (this.powerUpContainer) {
                while (this.powerUpContainer.children.length > 0) {
                    const child = this.powerUpContainer.children[0];
                    this.powerUpContainer.removeChild(child);
                    if (child.destroy) {
                        child.destroy();
                    }
                }
            }
        
            // Reset ball speed
            this.resetBallSpeed(true);
            
            // Load level data and create bricks
            console.log('🔄 resetGameState - About to load level:', this.level);
            await this.levelInstance.loadLevel(this.level);
            console.log('🔄 resetGameState - Level loaded successfully');
        
            // Load level background (non-blocking)
            this.loadLevelBackground(this.level).catch(error => {
                console.error('🔄 resetGameState - Background loading failed:', error);
            });
            console.log('🔄 resetGameState - Background loading started (non-blocking)');
            
            this.levelLoaded = true;
            this.loadingNextLevel = false;

            // Create and setup ball
            console.log('🔄 resetGameState - About to create ball');
            this.createAndSetupBall();
            console.log('🆕 New ball placed after resetGameState');
            
            // Ready for input
            this.waitingForInput = true;
            this.inputMode = 'waitForStart';

            // Update lives display
            this.updateLives();

            // Remove any existing pointerdown listeners to prevent immediate launch
            this.app.stage.off('pointerdown', this.boundHandleGameStart);
            
            console.log('🔄 resetGameState - Reset complete');
            return true;
        } catch (error) {
            console.error('🔄 resetGameState - Error during reset:', error);
            throw error;
        }
    }
    
    
    handleGameOverClick(e) {
        if (!this.gameOver) return;
        
        if (!this.showHighscores) {
            console.log('🔄 Transition: Game Over -> High Scores');
            // Stop the game and hide game elements
            this.gameStarted = false;
            this.scoreText.visible = false;
            this.levelText.visible = false;
            
            // Hide game elements (bricks, paddle, ball)
            if (this.app.stage.children) {
                this.app.stage.children.forEach(child => {
                    if (child !== this.gameOverContainer && 
                        child !== this.scoreText && 
                        child !== this.levelText) {
                        child.visible = false;
                    }
                });
            }
            
            this.showHighscores = true;
            this.loadHighscores();
        } else {
            console.log('🎮 Before High Scores -> New Game:', {
                gameStarted: this.gameStarted,
                gameOver: this.gameOver,
                showHighscores: this.showHighscores,
                waitingForInput: this.waitingForInput
            });

            // First hide the high score screen
            this.gameOverContainer.visible = false;
            this.showHighscores = false;
            this.gameOver = false;
            this.waitingForInput = true;

            // Remove all pointer event listeners
            this.app.stage.removeAllListeners('pointermove');

            console.log('🔄 After state reset:', {
                gameStarted: this.gameStarted,
                gameOver: this.gameOver,
                showHighscores: this.showHighscores,
                waitingForInput: this.waitingForInput
            });

            // Initialize fresh game state (async)
            this.resetGameState(false).then(() => {
            console.log('🔄 After game initialization:', {
                gameStarted: this.gameStarted,
                gameOver: this.gameOver,
                showHighscores: this.showHighscores,
                waitingForInput: this.waitingForInput
                });
            });

            // No need to add pointerdown listener here since it's already set up in constructor
        }
    }

    handleStartInput(e) {
        if (e?.preventDefault) e.preventDefault();
    
        if (this.isMoving) return;
    
        console.log("🚀 Ball start triggered");
        this.start();
    }

    handleGameStart(e) {
        console.log('🎮 handleGameStart - Input received:', {
            waitingForInput: this.waitingForInput,
            gameStarted: this.gameStarted,
            inputMode: this.inputMode,
            ballExists: !!this.ball,
            ballIsMoving: this.ball?.isMoving
        });
        
        if (this.waitingForInput) {
            console.log('🎮 Game Start: Input received, ball will start moving');
            this.waitingForInput = false;
            this.inputMode = 'playing'; // 🎮 Viktig!
    
            // Start the game (this sets up speed increase timer)
            this.start();
    
            // Start ball
            console.log('🎮 handleGameStart - Ball.balls array:', {
                length: Ball.balls.length,
                balls: Ball.balls.map(b => ({ isExtraBall: b.isExtraBall, isMoving: b.isMoving }))
            });
            
            const mainBall = Ball.balls.find(b => !b.isExtraBall);
            console.log('🎮 handleGameStart - Main ball found:', {
                mainBallExists: !!mainBall,
                mainBallIsMoving: mainBall?.isMoving,
                totalBalls: Ball.balls.length,
                mainBallDetails: mainBall ? {
                    isExtraBall: mainBall.isExtraBall,
                    isMoving: mainBall.isMoving,
                    dx: mainBall.dx,
                    dy: mainBall.dy,
                    graphicsExists: !!mainBall.graphics
                } : null
            });
            
            if (mainBall && !mainBall.isMoving) {
                console.log('🎮 handleGameStart - Starting main ball');
                mainBall.start();
                console.log('🎮 handleGameStart - Main ball started:', {
                    isMoving: mainBall.isMoving,
                    dx: mainBall.dx,
                    dy: mainBall.dy
                });
            } else {
                console.warn('🎮 handleGameStart - Cannot start ball:', {
                    mainBallExists: !!mainBall,
                    mainBallIsMoving: mainBall?.isMoving,
                    mainBallDetails: mainBall ? {
                        isExtraBall: mainBall.isExtraBall,
                        isMoving: mainBall.isMoving,
                        dx: mainBall.dx,
                        dy: mainBall.dy
                    } : null
                });
            }
        } else {
            console.log('🎮 handleGameStart - Ignored input (not waiting for input)');
        }
    }
    
    displayHighscores(highscoreList) {
        // Clear existing highscore display
        while (this.gameOverContainer.children.length > 3) {
            this.gameOverContainer.removeChild(this.gameOverContainer.children[3]);
        }

        if (!highscoreList || highscoreList.length === 0) {
            // Show message if no highscores
            const noScoresText = new PIXI.Text('Geen hoë tellings nie', {
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xFFFFFF,
                align: 'center'
            });
            noScoresText.anchor.set(0.5);
            noScoresText.x = this.app.screen.width / 2;
            noScoresText.y = 230;
            this.gameOverContainer.addChild(noScoresText);
            return;
        }

        const fontSize = Math.max(12, Math.floor(this.app.screen.height * 0.018));
        const lineHeight = fontSize * 2;
        const imgSize = fontSize * 2;

        // Column positions
        const xImg = 10;
        const xName = xImg + imgSize + 6;
        const xScore = xName + 250;
        const xLevel = xScore + 100;
        const xDate = xLevel + 100;
        const yStart = 230;

        // Add column headers
        const headers = new PIXI.Text('Naam\tPunte\tLvl\tDatum', {
            fontFamily: 'Arial',
            fontSize: fontSize,
            fill: 0xFFFFFF,
            fontWeight: 'bold'
        });
        headers.x = xName;
        headers.y = yStart;
        this.gameOverContainer.addChild(headers);

        // Add each highscore entry
        highscoreList.forEach((entry, i) => {
            const y = yStart + lineHeight * (i + 1);
            const textYOffset = imgSize / 1.3;

            // Character image
            const img = PIXI.Sprite.from(entry.character || ASSETS.images.characters.RugbyBall);
            img.width = imgSize;
            img.height = imgSize;
            img.x = xImg;
            img.y = y - imgSize + fontSize;
            this.gameOverContainer.addChild(img);

            // Name
            const nameText = new PIXI.Text(entry.name, {
                fontFamily: 'Arial',
                fontSize: fontSize,
                fill: 0xFFFFFF
            });
            nameText.x = xName;
            nameText.y = y + textYOffset - imgSize + fontSize;
            this.gameOverContainer.addChild(nameText);

            // Score
            const scoreText = new PIXI.Text(entry.score, {
                fontFamily: 'Arial',
                fontSize: fontSize,
                fill: 0xFFFFFF
            });
            scoreText.x = xScore;
            scoreText.y = y + textYOffset - imgSize + fontSize;
            this.gameOverContainer.addChild(scoreText);

            // Level
            const levelText = new PIXI.Text(entry.level || 1, {
                fontFamily: 'Arial',
                fontSize: fontSize,
                fill: 0xFFFFFF
            });
            levelText.x = xLevel;
            levelText.y = y + textYOffset - imgSize + fontSize;
            this.gameOverContainer.addChild(levelText);

            // Date
            const dateStr = entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '';
            const dateText = new PIXI.Text(dateStr, {
                fontFamily: 'Arial',
                fontSize: fontSize,
                fill: 0xFFFFFF
            });
            dateText.x = xDate;
            dateText.y = y + textYOffset - imgSize + fontSize;
            this.gameOverContainer.addChild(dateText);
        });

        // Add tap to restart text
        const tapToRestartText = new PIXI.Text('Raak vir \'n nuwe spel', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0xFFFFFF,
            align: 'center'
        });
        tapToRestartText.anchor.set(0.5);
        tapToRestartText.x = this.app.screen.width / 2;
        tapToRestartText.y = yStart + lineHeight * (highscoreList.length + 2);
        this.gameOverContainer.addChild(tapToRestartText);
    }

    async loadHighscores() {
        try {
            // Clear existing display first
            while (this.gameOverContainer.children.length > 3) {
                this.gameOverContainer.removeChild(this.gameOverContainer.children[3]);
            }

            const highscoresRef = collection(db, "highscores");
            const q = query(highscoresRef, orderBy("score", "desc"), limit(10));
            const snapshot = await getDocs(q);

            const highscoreList = snapshot.docs.map(doc => doc.data());
            this.displayHighscores(highscoreList);
            // Show the container after loading highscores
            this.gameOverContainer.visible = true;
        } catch (error) {
            console.error("Error loading highscores:", error);
            // Show error message
            const errorText = new PIXI.Text('Fout met laai van hoë tellings', {
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xFF0000,
                align: 'center'
            });
            errorText.anchor.set(0.5);
            errorText.x = this.app.screen.width / 2;
            errorText.y = 230;
            this.gameOverContainer.addChild(errorText);
            this.gameOverContainer.visible = true;
        }
    }
    
    playSound(type) {
        // Use the dynamic sound system from audio.js
        playSoundByName(type);
    }
    
    async loadLevelData(levelNum) {
        return await loadLevel(levelNum);
    }
    
    async loadLevelBackground(levelNum) {
        console.log(`🎨 loadLevelBackground - Starting to load background for level ${levelNum}`);
        
        // Clear existing background
        if (this.levelBackground) {
            this.levelBackgroundContainer.removeChild(this.levelBackground);
            this.levelBackground = null;
        }
        
        // Try to load the level background
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
        let backgroundLoaded = false;
        
        for (const ext of imageExtensions) {
            try {
                const imagePath = `./assets/images/levels/level${levelNum}.${ext}`;
                console.log(`🎨 loadLevelBackground - Trying ${imagePath}`);
                
                // Check if the image exists first using fetch
                const response = await fetch(imagePath, { method: 'HEAD' });
                if (!response.ok) {
                    console.log(`🎨 Image not found: ${imagePath}`);
                    continue;
                }
                
                // Create background sprite using PIXI's texture loading
                const texture = PIXI.Texture.from(imagePath);
                
                // Wait for texture to load with timeout
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error(`Texture loading timeout for ${imagePath}`));
                    }, 5000); // 5 second timeout
                    
                    if (texture.baseTexture.valid) {
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        texture.baseTexture.once('loaded', () => {
                            clearTimeout(timeout);
                            resolve();
                        });
                        texture.baseTexture.once('error', (error) => {
                            clearTimeout(timeout);
                            // Don't reject, just resolve to continue to next extension
                            console.log(`🎨 Texture error for ${imagePath}, trying next extension`);
                            resolve();
                        });
                    }
                });
                
                // Check if texture is valid after loading
                if (!texture.baseTexture.valid) {
                    console.log(`🎨 Texture not valid after loading: ${imagePath}`);
                    continue;
                }
                
                this.levelBackground = new PIXI.Sprite(texture);
                
                // Scale background to match screen dimensions exactly (like bricks do)
                this.levelBackground.width = this.app.screen.width;
                this.levelBackground.height = this.app.screen.height;
                this.levelBackground.x = 0;
                this.levelBackground.y = 0;
                
                this.levelBackgroundContainer.addChild(this.levelBackground);
                backgroundLoaded = true;
                console.log(`🎨 Level ${levelNum} background loaded: level${levelNum}.${ext}`);
                break;
                
            } catch (error) {
                // Continue to next extension
                console.log(`🎨 Failed to load level${levelNum}.${ext}:`, error.message);
                continue;
            }
        }
        
        // If no background found for this level, try level1 as fallback
        if (!backgroundLoaded && levelNum !== 1) {
            console.log(`🎨 Level ${levelNum} background not found, trying level1 as fallback`);
            await this.loadLevelBackground(1);
        } else if (!backgroundLoaded) {
            console.log(`🎨 No background found for level ${levelNum}, using default background`);
        }
        
        console.log(`🎨 loadLevelBackground - Completed for level ${levelNum}`);
    }
    
    start() {
        // Don't return early if game is already started - we need this for ball launching after life loss
        if (!this.gameStarted) {
        this.gameStarted = true;
        console.log('🎮 Starting game...');
        
        // Start speed increase timer
        this.lastSpeedIncreaseTime = Date.now();
            
            // Record level start time for completion bonus
            if (!this.levelStartTime) {
                this.levelStartTime = Date.now();
                console.log('⏱️ Level start time recorded:', this.levelStartTime);
            }
        
        // Show UI elements
        if (this.scoreText) this.scoreText.visible = true;
        if (this.livesText) this.livesText.visible = true;
        if (this.levelText) this.levelText.visible = true;
            
            // Update lives display to ensure it's visible
            this.updateLives();
        
        // Show game elements
        if (this.app.stage.children) {
            this.app.stage.children.forEach(child => {
                if (child !== this.gameOverManager.gameOverContainer && 
                    child !== this.gameOverManager.highscoreContainer) {
                    child.visible = true;
                }
            });
        }
        
        // Start the game loop
        this.app.ticker.start();
        
        // Force audio unlock
        forceAudioUnlock();
        }
        
        // Always set waitingForInput to false when starting (for ball launch)
        this.waitingForInput = false;
    }
    
    restart() {
        // Reset game state (async) - start fresh game
        this.resetGameState(false).then(() => {
            // After reset, set the game to wait for input instead of starting immediately
            this.waitingForInput = true;
            this.inputMode = 'waitForStart';
            this.gameStarted = false;
            
            // Remove any existing pointerdown listeners to prevent immediate launch
            this.app.stage.off('pointerdown', this.boundHandleGameStart);
        });
    }
    
    update() {
        // Don't process any game logic if showing high scores or game over
        if (this.showHighscores || this.gameOver) {
            console.log('🎮 Game paused:', { showHighscores: this.showHighscores, gameOver: this.gameOver });
            return;
        }
        
        // Don't update if game hasn't started
        if (!this.gameStarted) {
            return;
        }
        
        // Check for game over
        if (this.lives <= 0) {
            this.updateLives();
            return;
        }
        
        if(!this.levelLoaded || this.loadingNextLevel) return;

        // Update paddle
        if (this.paddle) {
            this.paddle.update();
        }
        
        // Update all balls (allow this even when waiting for input so ball follows paddle)
        let lifeLost = false;
        let brickHit = false;
        
        if (Ball.balls && Ball.balls.length > 0) {
            // Check for expired extra balls and remove them
            Ball.balls = Ball.balls.filter(ball => {
                if (ball && ball.isExpired && ball.isExpired()) {
                    console.log('⏰ Removing expired extra ball');
                    if (ball.graphics && ball.graphics.parent) {
                        ball.graphics.parent.removeChild(ball.graphics);
                    }
                    if (ball.trail) {
                        ball.trail.clear();
                    }
                    return false;
                }
                return true;
            });
            
            Ball.balls.forEach(ball => {
                if (ball && ball.update) {
                    const result = ball.update(this.paddle, this.levelInstance);
                    
                    if (result.lifeLost) {
                        lifeLost = true;
                    }
                    if (result.brickHit) {
                        brickHit = true;
                    }
                }
            });
        }
        
        // Only process game logic if in playing mode (not moving mode) and not waiting for input
        if (this.inputMode === 'playing' && !this.waitingForInput) {
        // Handle life lost
        if (lifeLost) {
            this.loseLife();
            this.inputMode = 'waitForStart';
            this.waitingForInput = true;
        }
        
        // Handle brick hit
        if (brickHit) {
            this.addScore(10);
        }
        
        // Update level
        if (this.levelInstance) {
            this.levelInstance.update();
        }
        
        // Maintain ball speed (apply time-based increases)
        this.maintainBallSpeed();
        
        // Check for level completion
        if (this.checkLevelComplete()) {
            this.nextLevel();
        }

        // Update power-ups
        if (this.activePowerUps) {
            this.activePowerUps = this.activePowerUps.filter(powerUp => {
                if (!powerUp.active) {
                    return false;
                }

                powerUp.update();

                // Check collision with paddle
                if (this.paddle && this.checkPowerUpCollision(powerUp, this.paddle)) {
                    this.handlePowerUpCollection(powerUp);
                    return false;
                }

                return true;
            });
        }
        
        // Check brannas effect expiration
        if (this.brannasActive && Date.now() > this.brannasEndTime) {
            this.brannasActive = false;
        }
        
        // Update powerup effects
        if (this.powerupEffects) {
            this.powerupEffects.update();
            }
        }
        
        // Update UI elements (always update these)
        this.updateScore();
        this.updateLevel();

        // Periodic cleanup of leftover graphics (run every 5 seconds instead of every frame)
        const now = Date.now();
        if (!this.lastCleanupTime || now - this.lastCleanupTime > 5000) {
            this.lastCleanupTime = now;
            
            // Memory monitoring
            if (performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
                const memoryLimit = performance.memory.jsHeapSizeLimit / 1024 / 1024; // MB
                const memoryPercent = (memoryUsage / memoryLimit) * 100;
                
                console.log('🧠 Memory usage:', {
                    used: Math.round(memoryUsage) + 'MB',
                    limit: Math.round(memoryLimit) + 'MB',
                    percent: Math.round(memoryPercent) + '%'
                });
                
                // Force cleanup if memory usage is high
                if (memoryPercent > 80) {
                    console.warn('⚠️ High memory usage detected, forcing cleanup');
                    if (this.powerupEffects) {
                        this.powerupEffects.forceCleanup();
                    }
                }
            }
            
            // Additional cleanup: remove any remaining graphics from stage that might be leftover effects
            if (this.app.stage) {
                const stageChildren = [...this.app.stage.children];
                let cleanedCount = 0;
                
                stageChildren.forEach(child => {
                    // Remove any graphics objects that might be leftover effects
                    if (child instanceof PIXI.Graphics && 
                        child !== this.paddle?.graphics && 
                        child !== this.ball?.graphics &&
                        !this.gameContainer?.children.includes(child) &&
                        !this.uiContainer?.children.includes(child)) {
                        
                        // Additional check for small graphics that are likely effects
                        const bounds = child.getBounds();
                        const isSmall = bounds.width < 100 && bounds.height < 100;
                        const hasAlpha = child.alpha !== undefined && child.alpha < 1;
                        
                        if (isSmall || hasAlpha) {
                            if (child.parent) {
                                child.parent.removeChild(child);
                            }
                            child.destroy();
                            cleanedCount++;
                        }
                    }
                });
                
                if (cleanedCount > 0) {
                    console.log('🧹 Game: Cleaned up', cleanedCount, 'leftover graphics objects');
                }
            }
        }
    }
    
    updateScore() {
        this.scoreText.text = `Score: ${this.score}`;
    }
    
    updateLives() {
        console.log('🔄 ENTERED updateLives method');
        
        // Always update the text first
        if (this.livesText) {
            this.livesText.text = `Lives: ${this.lives}`;
        }
        
        // Convert selectedCharacter to lowercase for texture lookup
        const textureKey = this.selectedCharacter.toLowerCase();
        
        // If textures are loaded, also update sprites
        if (this.characterTextures[textureKey]) {
            console.log('🎮 Updating lives sprites...');
            
            // Clear existing lives sprites
            this.livesSprites.forEach(sprite => {
                if (sprite.parent) {
                    sprite.parent.removeChild(sprite);
                }
            });
            this.livesSprites = [];

            // Create new lives sprites (oldest to newest, left to right)
            for (let i = 0; i < this.lives; i++) {
                const sprite = new PIXI.Sprite(this.characterTextures[textureKey]);
                sprite.width = 20;
                sprite.height = 20;
                sprite.x = 20 + (i * 25); // Left side positioning: oldest life on left, newest on right
                sprite.y = 10;
                this.uiContainer.addChild(sprite);
                this.livesSprites.push(sprite);
            }
            
            console.log('🎮 Total lives sprites created:', this.livesSprites.length);
            
            // Hide text when sprites are shown
            if (this.livesText) this.livesText.visible = false;
        } else {
            console.log('⚠️ Character textures not loaded yet, using text only');
        }
        
        if (this.lives <= 0 && !this.gameOver) {
            console.log('🎮 Game over state triggered');
            this.gameOver = true;
            this.gameStarted = false;
            this.waitingForInput = true;
            
            // Hide game elements
            this.scoreText.visible = false;
            if (this.livesText) this.livesText.visible = false;
            this.levelText.visible = false;
            
            // Delegate all game over handling to GameOverManager
            this.gameOverManager.handleGameOver(this.score, this);
        }
    }
    
    updateLevel() {
        this.levelText.text = `Level: ${this.level}`;
    }
    
    addScore(points) {
        this.score += points;
        this.updateScore();
    }
    
    loseLife() {
        console.log('💔 LOSE LIFE - Starting life loss process');
        
        // Reset speed increases (start fresh with new life)
        this.resetBallSpeed(true);
        
        // Clear ALL balls (extra balls + main ball)
        Ball.clearAll();
        
        // Clear active power-ups
        if (this.activePowerUps && this.activePowerUps.length > 0) {
            console.log('🧹 Clearing active power-ups on life loss:', this.activePowerUps.length);
            this.activePowerUps.forEach(powerUp => {
                if (powerUp && powerUp.deactivate) {
                    powerUp.deactivate();
                }
            });
            this.activePowerUps = [];
        }
        
        // Clear power-up container
        if (this.powerUpContainer) {
            while (this.powerUpContainer.children.length > 0) {
                const child = this.powerUpContainer.children[0];
                this.powerUpContainer.removeChild(child);
                if (child.destroy) {
                    child.destroy();
                }
            }
        }
        
        // Create a new main ball using unified method
        this.createAndSetupBall();

        // Update lives and set waiting state
        this.lives--;
        console.log('🔄 About to call updateLives with lives:', this.lives);
        try {
        this.updateLives();
        } catch (error) {
            console.error('❌ Error in updateLives:', error);
        }
        this.playSound('lifeloss');
        this.waitingForInput = true;
        this.inputMode = 'waitForStart'; // Allow paddle movement again
        
        // Set up input handlers for paddle movement and ball launching
        if (typeof setupInputHandlers === 'function') {
            setupInputHandlers();
        }
        
        console.log('💔 LOSE LIFE - State updated:', {
            lives: this.lives,
            waitingForInput: this.waitingForInput,
            gameStarted: this.gameStarted,
            inputMode: this.inputMode,
            ballExists: !!this.ball,
            totalBalls: Ball.balls.length
        });
    }
    
    nextLevel() {
        console.log('🎮 nextLevel - Starting next level, current level:', this.level);
        
        // Clear any remaining powerup effects before level transition
        if (this.powerupEffects) {
            this.powerupEffects.clearAllEffects();
            // Force cleanup for mobile devices that might have persistent effects
            this.powerupEffects.forceCleanup();
        }
        
        // Calculate level completion time bonus
        if (this.levelStartTime) {
            const completionTime = Date.now() - this.levelStartTime;
            const timeInSeconds = Math.floor(completionTime / 1000);
            
            // Time bonus calculation using config settings
            let timeBonus = 0;
            if (timeInSeconds <= TIME_BONUS_CONFIG.EXCELLENT_THRESHOLD) {
                timeBonus = TIME_BONUS_CONFIG.EXCELLENT_BASE_BONUS + 
                           (TIME_BONUS_CONFIG.EXCELLENT_THRESHOLD - timeInSeconds) * TIME_BONUS_CONFIG.EXCELLENT_PER_SECOND;
            } else if (timeInSeconds <= TIME_BONUS_CONFIG.GOOD_THRESHOLD) {
                timeBonus = TIME_BONUS_CONFIG.GOOD_BASE_BONUS + 
                           (TIME_BONUS_CONFIG.GOOD_THRESHOLD - timeInSeconds) * TIME_BONUS_CONFIG.GOOD_PER_SECOND;
            } else if (timeInSeconds <= TIME_BONUS_CONFIG.DECENT_THRESHOLD) {
                timeBonus = TIME_BONUS_CONFIG.DECENT_BASE_BONUS + 
                           (TIME_BONUS_CONFIG.DECENT_THRESHOLD - timeInSeconds) * TIME_BONUS_CONFIG.DECENT_PER_SECOND;
            }
            
            if (timeBonus > 0) {
                this.addScore(timeBonus);
                this.levelCompletionTimeBonus = timeBonus;
                
                console.log('⏱️ Level completion time bonus:', {
                    level: this.level,
                    completionTime: timeInSeconds + ' seconds',
                    timeBonus: timeBonus + ' points',
                    totalScore: this.score
                });
                
                // Show time bonus text on screen
                this.showTimeBonusText(timeBonus, timeInSeconds);
            }
        }
        
        this.level++;
        this.updateLevel();
        
        console.log('🎮 nextLevel - About to call resetGameState for level:', this.level);
        
        // Use resetGameState with keepScore=true to preserve score (async)
        this.resetGameState(true).then(() => {
            console.log('🎮 nextLevel - resetGameState completed successfully');
            
            // Reset level start time for the new level
            this.levelStartTime = null;
        
        // Apply level speed increase after reset
        this.applyLevelSpeedIncrease();
            
            console.log('🎮 Next level setup complete:', {
                level: this.level,
                ballExists: !!this.ball,
                totalBalls: Ball.balls.length,
                waitingForInput: this.waitingForInput
            });
        }).catch((error) => {
            console.error('🎮 nextLevel - Error during resetGameState:', error);
        });
    }
    
    showTimeBonusText(bonus, timeInSeconds) {
        // Create time bonus text using config settings
        const bonusText = new PIXI.Text(`⏱️ TIME BONUS!\n${timeInSeconds}s → +${bonus}`, {
            fontFamily: 'Arial',
            fontSize: TIME_BONUS_CONFIG.BONUS_TEXT_SIZE,
            fill: TIME_BONUS_CONFIG.BONUS_TEXT_COLOR,
            align: 'center',
            fontWeight: 'bold',
            stroke: TIME_BONUS_CONFIG.BONUS_TEXT_STROKE,
            strokeThickness: 2
        });
        
        // Position in center of screen
        bonusText.anchor.set(0.5);
        bonusText.x = this.app.screen.width / 2;
        bonusText.y = this.app.screen.height / 2;
        
        // Add to UI container
        this.uiContainer.addChild(bonusText);
        
        // Animate the text using config settings with proper duration
        const startTime = Date.now();
        const duration = TIME_BONUS_CONFIG.BONUS_ANIMATION_DURATION;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Calculate alpha and scale based on progress
            const alpha = 1 - progress;
            const scale = 1 + (progress * 0.5); // Scale up to 1.5x over the duration
            
            bonusText.alpha = alpha;
            bonusText.scale.set(scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Remove text when animation is complete
                if (bonusText.parent) {
                    bonusText.parent.removeChild(bonusText);
                }
            }
        };
        
        // Start animation after a short delay
        setTimeout(animate, 500);
    }
    
    applyLevelSpeedIncrease() {
        // Get the new level's speed settings
        const speeds = this.getMaxSpeedForLevel(this.level);
        
        // Set the ball to the new level's initial speed
        if (this.ball) {
            this.ball.speedPercent = speeds.initial;
            this.ball.speed = getScreenRelativeSpeed(this.ball.speedPercent, this.app);
            
            // Update ball velocity if it's moving
            if (this.ball.isMoving) {
                const angle = Math.atan2(this.ball.dy, this.ball.dx);
                this.ball.dx = this.ball.speed * Math.cos(angle);
                this.ball.dy = this.ball.speed * Math.sin(angle);
            }
        }
        
        console.log(`🎮 Level ${this.level} speed applied:`, {
            initialSpeedPercent: speeds.initial,
            maxSpeedPercent: speeds.max,
            actualSpeed: this.ball?.speed
        });
    }
    
    checkLevelComplete() {
        if (!this.levelInstance) return false;
        
        // Use the level's update method which properly excludes strong bricks
        return this.levelInstance.update();
    }
    
    showGameOver() {
        // Only show game over if not already in game over state
        if (this.gameOver) return;
        
        console.log('💀 Game Over: Lives depleted');
        this.gameOver = true;
        this.gameStarted = false;
        
        // Clear any remaining powerup effects
        if (this.powerupEffects) {
            this.powerupEffects.clearAllEffects();
            // Force cleanup for mobile devices that might have persistent effects
            this.powerupEffects.forceCleanup();
        }
        
        // Stop the game loop
        this.app.ticker.stop();
        
        // Show game over screen
        this.gameOverContainer.visible = true;
        
        // Show game over screen
        this.gameOverManager.showGameOver(this.score, () => {
            this.showHighscores = true;
            this.gameOver = false;
            this.resetGameState().then(() => {
            this.app.ticker.start();
            });
        });
    }

    resetBallSpeed(resetTimeBasedIncreases = true) {
        // Reset to base speed using percentage-based system
        this.initialSpeedPercent = BASE_INITIAL_SPEED_PERCENT;
        this.maxSpeedPercent = BASE_MAX_SPEED_PERCENT;
        
        // Reset speed timer and multiplier only if requested
        if (resetTimeBasedIncreases) {
            this.lastSpeedIncreaseTime = null;
            this.speedMultiplier = 1;
        } else {
            // If keeping time-based increases, update the timer to current time
            // so the speed calculation is based on the current moment
            this.lastSpeedIncreaseTime = Date.now();
        }
    }

    getMaxSpeedForLevel(level) {
        return {
            initial: BASE_INITIAL_SPEED_PERCENT * (1 + (level - 1) * LEVEL_SPEED_INCREASE),
            max: BASE_MAX_SPEED_PERCENT * (1 + (level - 1) * LEVEL_SPEED_INCREASE)
        };
    }

    maintainBallSpeed() {
        if (!this.gameStarted || this.gameOver || (this.ball.dx === 0 && this.ball.dy === 0)) {
            return;
        }

        // Calculate time-based multiplier
        const timeBasedMultiplier = this.lastSpeedIncreaseTime ? 
            Math.pow(SPEED_INCREASE_FACTOR, Math.floor((Date.now() - this.lastSpeedIncreaseTime) / SPEED_INCREASE_INTERVAL)) : 1;
        
        // Get speeds for current level (now in percentages)
        const speeds = this.getMaxSpeedForLevel(this.level);
        
        // Calculate target speed percentage with time multiplier
        const targetSpeedPercent = speeds.initial * timeBasedMultiplier;
        
        // Cap at maximum allowed speed percentage for level
        const finalTargetSpeedPercent = Math.min(targetSpeedPercent, speeds.max);
        
        // Convert to actual pixels per frame
        const finalTargetSpeed = getScreenRelativeSpeed(finalTargetSpeedPercent, this.app);

        const currentSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        
        // Only adjust speed if difference is significant (more than 1%)
        if (Math.abs(currentSpeed - finalTargetSpeed) > finalTargetSpeed * 0.01) {
            const angle = Math.atan2(this.ball.dy, this.ball.dx);
            this.ball.dx = finalTargetSpeed * Math.cos(angle);
            this.ball.dy = finalTargetSpeed * Math.sin(angle);
            
            // Update ball's speed properties to keep them in sync
            this.ball.speed = finalTargetSpeed;
            this.ball.speedPercent = finalTargetSpeedPercent;
        }
    }

    setBallSpeed(speedPercent) {
        const speed = getScreenRelativeSpeed(speedPercent, this.app);
        const currentAngle = Math.atan2(this.ball.dy, this.ball.dx);
        this.ball.dx = speed * Math.cos(currentAngle);
        this.ball.dy = speed * Math.sin(currentAngle);
    }

    isBrannasActive() {
        return this.brannasActive && Date.now() <= this.brannasEndTime;
    }

    handleCharacterSelect() {
        // Hide character select screen
        this.characterSelectContainer.visible = false;
        
        // Initialize fresh game state (async)
        this.resetGameState();
    }

    checkPowerUpCollision(powerUp, paddle) {
        // Use actual paddle dimensions (consistent with ball collision detection)
        const paddleTop = paddle.sprite.y - paddle.height / 2;
        const paddleBottom = paddle.sprite.y + paddle.height / 2;
        const paddleLeft = paddle.sprite.x - paddle.width / 2;
        const paddleRight = paddle.sprite.x + paddle.width / 2;

        // Use logical power-up bounds (since sprite has anchor at 0.5)
        const powerUpSize = 30 * 0.3; // 30px * 0.3 scale = 9px
        const powerUpTop = powerUp.sprite.y - powerUpSize / 2;
        const powerUpBottom = powerUp.sprite.y + powerUpSize / 2;
        const powerUpLeft = powerUp.sprite.x - powerUpSize / 2;
        const powerUpRight = powerUp.sprite.x + powerUpSize / 2;

        const collision = (
            powerUpLeft < paddleRight &&
            powerUpRight > paddleLeft &&
            powerUpTop < paddleBottom &&
            powerUpBottom > paddleTop
        );

        return collision;
    }

    handlePowerUpCollection(powerUp) {
        // Get powerup configuration for scoring
        const powerupConfig = getPowerUpConfig(powerUp.type);
        
        // Play sound using the new configuration-based system
        playSoundByName(powerUp.type);
        
        // Trigger powerup effects
        if (this.powerupEffects) {
            this.powerupEffects.triggerPowerupEffect(powerUp.type, powerUp.sprite.x, powerUp.sprite.y);
        }
        
        // Handle powerup effects
        switch(powerUp.type.toLowerCase()) {
            case 'brannas':
                // Activate brannas effect - balls destroy all bricks without deflection
                this.brannasActive = true;
                this.brannasEndTime = Date.now() + (powerupConfig?.duration || 10000);
                break;
            case 'extra_life':
                this.lives++;
                this.updateLives();
                break;
            case 'skull':
                // Handle skull effect - cause loss of life
                this.loseLife();
                break;
            case 'powerup_largepaddle':
                this.paddle.extend();
                break;
            case 'powerup_smallpaddle':
                this.paddle.shrink();
                break;
            case 'extraball':
                // Create extra ball with duration from config
                if (this.ball) {
                    const duration = powerupConfig?.duration || 0;
                    Ball.createExtraBall(this.app, this.ball.graphics.x, this.ball.graphics.y, this.ball.speed, this.ball.dx, this.ball.dy, duration);
                }
                break;
        }
        
        // Add score for powerups that have a score configuration
        if (powerupConfig && powerupConfig.score && powerupConfig.score > 0) {
            this.addScore(powerupConfig.score);
        }
        
        powerUp.deactivate();
    }

    handleWindowBlur() {
        console.log('🎮 Window blurred - cleaning up effects');
        // Only clean up effects, don't end the game
        if (this.powerupEffects) {
            this.powerupEffects.forceCleanup();
        }
    }

    handleWindowFocus() {
        console.log('🎮 Window focused - game resumed');
        // No special action needed on focus
    }
    
    // Cleanup method to remove event listeners and clean up resources
    cleanup() {
        console.log('🧹 Game: Starting cleanup');
        
        // Remove window event listeners
        window.removeEventListener('blur', this.boundHandleWindowBlur);
        window.removeEventListener('focus', this.boundHandleWindowFocus);
        window.removeEventListener('visibilitychange', this.boundHandleWindowBlur);
        
        // Remove stage event listeners
        this.app.stage.off('pointermove', this.boundHandlePointerMove);
        this.app.stage.off('pointerdown', this.boundHandleGameStart);
        
        // Force cleanup all effects
        if (this.powerupEffects) {
            this.powerupEffects.forceCleanup();
        }
        
        // Clear all balls
        Ball.clearAll();
        
        // Clear powerups
        if (this.activePowerUps) {
            this.activePowerUps.forEach(powerUp => {
                if (powerUp && powerUp.deactivate) {
                    powerUp.deactivate();
                }
            });
            this.activePowerUps = [];
        }
        
        // Clear level
        if (this.levelInstance) {
            this.levelInstance.clearBricks();
        }
        
        console.log('🧹 Game: Cleanup complete');
    }
} 