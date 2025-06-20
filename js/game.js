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
    BASE_MAX_SPEED_PERCENT
} from './config.js';
import { Level } from './level.js';
import { GameOverManager } from './gameOverManager.js';
import { Ball } from './ball.js';
import { Paddle } from './paddle.js';
import { PowerUp } from './powerup.js';
import { forceAudioUnlock, playSoundByName } from './audio.js';
import { getPowerUpConfig } from './powerupConfig.js';

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
        this.selectedCharacter = ASSETS.images.characters.RugbyBall;
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
        
        // Make stage interactive
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen;
        
        // Add pointer move listener
        this.app.stage.on('pointermove', this.boundHandlePointerMove);

        // Add pointer down listener for ball launching
        this.app.stage.on('pointerdown', this.boundHandleGameStart);

        // Create game container
        this.gameContainer = new PIXI.Container();
        this.app.stage.addChild(this.gameContainer);

        // Create game objects container (for background, bricks, paddle, ball)
        this.objectsContainer = new PIXI.Container();
        this.gameContainer.addChild(this.objectsContainer);
        
        // Create UI container (for score, lives, level) - add after objects so it renders on top
        this.uiContainer = new PIXI.Container();
        this.gameContainer.addChild(this.uiContainer);
        
        // Create score text
        this.scoreText = new PIXI.Text('Score: 0', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff
        });
        this.scoreText.position.set(10, 10);
        this.uiContainer.addChild(this.scoreText);
        
        // Create lives text
        this.livesText = new PIXI.Text('Lives: 3', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff
        });
        this.livesText.position.set(app.screen.width - 100, 10);
        this.uiContainer.addChild(this.livesText);
        
        // Create level text
        this.levelText = new PIXI.Text('Level: 1', {
            fontFamily: 'Arial',
            fontSize: 24,
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
    }

    //Handle pointer move
    handlePointerMove(e) {
        if (this.inputMode === 'playing') {
            // Move paddle if in playing mode
            if (this.paddle && this.paddle.handlePointerMove) {
                this.paddle.handlePointerMove(e);
            }
        }
        // Removed the handleGameStart call from waitForStart mode to prevent auto-start
    }

    //Center paddle and place ball
    centerPaddleAndPlaceBall() {
        console.log('🎯 centerPaddleAndPlaceBall - Starting ball placement');
        console.log('🎯 centerPaddleAndPlaceBall - Paddle state:', {
            paddleExists: !!this.paddle,
            paddlePosition: this.paddle ? { x: this.paddle.sprite.x, y: this.paddle.sprite.y } : null,
            paddleSize: this.paddle ? { width: this.paddle.width, height: this.paddle.height } : null
        });
        console.log('🎯 centerPaddleAndPlaceBall - Ball state:', {
            ballExists: !!this.ball,
            ballIsMoving: this.ball?.isMoving,
            ballPosition: this.ball ? { x: this.ball.graphics.x, y: this.ball.graphics.y } : null
        });
        
        // Use centralized paddle positioning
        this.paddle.setStartingPosition();
        console.log('🎯 centerPaddleAndPlaceBall - Paddle repositioned to:', {
            x: this.paddle.sprite.x,
            y: this.paddle.sprite.y
        });

        if (!this.paddle || !this.ball) {
            console.error('🎯 centerPaddleAndPlaceBall - Missing paddle or ball!');
            return;
        }

        // Wait 1 frame before placing ball
        requestAnimationFrame(() => {
            console.log('🎬 Calling placeOnPaddle. Paddle at:', {
                x: this.paddle.sprite.x,
                y: this.paddle.sprite.y
            });
            console.log('🎬 Ball before placeOnPaddle:', {
                ballX: this.ball.graphics.x,
                ballY: this.ball.graphics.y,
                inBallArray: Ball.balls.includes(this.ball)
            });
            this.ball.placeOnPaddle(this.paddle);

            console.log('✅ Ball after placeOnPaddle:', {
                ballX: this.ball.graphics.x,
                ballY: this.ball.graphics.y
            });
            console.log('✅ centerPaddleAndPlaceBall - Final state:', {
                ballIsMoving: this.ball.isMoving,
                waitingForInput: this.waitingForInput,
                gameStarted: this.gameStarted
            });
        });
    }

    //Reset game state
    resetGameState(keepScore = false) {
        console.log('🎮 Resetting game state...');
        
        // 1. Reset state
        if (!keepScore) this.score = 0;
        this.lives = 3;
        if (!keepScore) this.level = 1;
        this.gameStarted = false;
        this.gameOver = false;
        this.waitingForInput = false;
        this.showHighscores = false;
        this.extraBalls = [];
        this.levelLoaded = false;
        this.loadingNextLevel = true;
        this.brannasActive = false;
        this.brannasEndTime = 0;
    
        // 2. Reset ball speed (important: reset speed increases)
        // When keeping score (level progression), preserve time-based increases
        this.resetBallSpeed(!keepScore);
    
        // 3. Reset UI
        this.scoreText.text = `Score: ${this.score}`;
        this.livesText.text = `Lives: ${this.lives}`;
        this.levelText.text = `Level: ${this.level}`;
        this.scoreText.visible = true;
        this.livesText.visible = true;
        this.levelText.visible = true;
    
        // 4. Reset paddle position
        if (this.paddle) {
            this.paddle.setStartingPosition();
        }
    
        // 5. Load level
        this.levelInstance.loadLevel(this.level).then(async () => {
            // Load level background
            await this.loadLevelBackground(this.level);
            
            this.levelLoaded = true;
            this.loadingNextLevel = false;
    
            // 6. Reset all balls and get new main ball
            this.ball = Ball.resetAll(this.app, this, this.levelInstance);
            this.ball.placeOnPaddle(this.paddle);
    
            console.log('🆕 New ball placed after resetGameState');
    
            // 7. Ready for input
            this.waitingForInput = true;
            this.inputMode = 'waitForStart';
    
            // Ensure we're listening for input
            this.app.stage.off('pointerdown', this.boundHandleGameStart);
            this.app.stage.on('pointerdown', this.boundHandleGameStart);
        });
    }
    
    
    handleGameOverClick(e) {
        if (!this.gameOver) return;
        
        if (!this.showHighscores) {
            console.log('🔄 Transition: Game Over -> High Scores');
            // Stop the game and hide game elements
            this.gameStarted = false;
            this.scoreText.visible = false;
            this.livesText.visible = false;
            this.levelText.visible = false;
            
            // Hide game elements (bricks, paddle, ball)
            if (this.app.stage.children) {
                this.app.stage.children.forEach(child => {
                    if (child !== this.gameOverContainer && 
                        child !== this.scoreText && 
                        child !== this.livesText && 
                        child !== this.levelText) {
                        child.visible = false;
                    }
                });
            }
            
            this.showHighscores = true;
            this.loadHighscores();
        } else {
            console.log('🔄 Before High Scores -> New Game:', {
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

            // Initialize fresh game state
            this.resetGameState();

            console.log('🔄 After game initialization:', {
                gameStarted: this.gameStarted,
                gameOver: this.gameOver,
                showHighscores: this.showHighscores,
                waitingForInput: this.waitingForInput
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
            const mainBall = Ball.balls.find(b => !b.isExtraBall);
            console.log('🎮 handleGameStart - Main ball found:', {
                mainBallExists: !!mainBall,
                mainBallIsMoving: mainBall?.isMoving,
                totalBalls: Ball.balls.length
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
                    mainBallIsMoving: mainBall?.isMoving
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
                
                // Create background sprite using PIXI's texture loading
                const texture = PIXI.Texture.from(imagePath);
                
                // Wait for texture to load
                await new Promise((resolve, reject) => {
                    if (texture.baseTexture.valid) {
                        resolve();
                    } else {
                        texture.baseTexture.once('loaded', resolve);
                        texture.baseTexture.once('error', reject);
                    }
                });
                
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
    }
    
    start() {
        if (this.gameStarted) return;
        this.gameStarted = true;
        this.waitingForInput = false;
        console.log('🎮 Starting game...');
        
        // Start speed increase timer
        this.lastSpeedIncreaseTime = Date.now();
        
        // Show UI elements
        if (this.scoreText) this.scoreText.visible = true;
        if (this.livesText) this.livesText.visible = true;
        if (this.levelText) this.levelText.visible = true;
        
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
    
    restart() {
        // Reset game state
        this.resetGameState();
        
        // Start the game
        this.start();
    }
    
    update() {
        // Don't process any game logic if showing high scores or game over
        if (this.showHighscores || this.gameOver) {
            console.log('🎮 Game paused:', { showHighscores: this.showHighscores, gameOver: this.gameOver });
            return;
        }
        
        // Don't update if game hasn't started or is waiting for input
        if (!this.gameStarted || this.waitingForInput) {
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
        
        // Update all balls
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
        
        // Update UI elements
        this.updateScore();
        this.updateLives();
        this.updateLevel();
        
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
    }
    
    updateScore() {
        this.scoreText.text = `Score: ${this.score}`;
    }
    
    updateLives() {
        this.livesText.text = `Lives: ${this.lives}`;
        if (this.lives <= 0 && !this.gameOver) {
            console.log('🎮 Game over state triggered');
            this.gameOver = true;
            this.gameStarted = false;
            this.waitingForInput = true;
            
            // Hide game elements
            this.scoreText.visible = false;
            this.livesText.visible = false;
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
        
        // Create a new main ball
        this.ball = new Ball(this.app, false);
        this.ball.setLevel(this.levelInstance);
        this.ball.game = this;
        
        // Add the new ball to the container
        if (this.objectsContainer) {
            this.objectsContainer.addChild(this.ball.graphics);
        }
        
        // Center paddle and place the new ball
        this.centerPaddleAndPlaceBall();

        // Update lives and set waiting state
        this.lives--;
        this.updateLives();
        this.playSound('lifeloss');
        this.waitingForInput = true;
        
        console.log('💔 LOSE LIFE - State updated:', {
            lives: this.lives,
            waitingForInput: this.waitingForInput,
            gameStarted: this.gameStarted,
            inputMode: this.inputMode
        });
    }
    
    nextLevel() {
        this.level++;
        this.updateLevel();
        
        // Use resetGameState with keepScore=true to preserve score
        this.resetGameState(true);
        
        // Apply level speed increase after reset
        this.applyLevelSpeedIncrease();
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
        
        // Check if there are any remaining bricks
        const remainingBricks = this.levelInstance.bricks.flat().filter(brick => brick !== null).length;
        return remainingBricks === 0;
    }
    
    showGameOver() {
        // Only show game over if not already in game over state
        if (this.gameOver) return;
        
        console.log('💀 Game Over: Lives depleted');
        this.gameOver = true;
        this.gameStarted = false;
        
        // Stop the game loop
        this.app.ticker.stop();
        
        // Show game over screen
        this.gameOverContainer.visible = true;
        
        // Show game over screen
        this.gameOverManager.showGameOver(this.score, () => {
            this.showHighscores = true;
            this.gameOver = false;
            this.resetGameState();
            this.app.ticker.start();
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
        
        // Debug logging every 5 seconds
        const now = Date.now();
        if (!this.lastSpeedDebugTime || now - this.lastSpeedDebugTime > 5000) {
            console.log('🎮 Speed Debug:', {
                gameStarted: this.gameStarted,
                lastSpeedIncreaseTime: this.lastSpeedIncreaseTime,
                timeSinceStart: this.lastSpeedIncreaseTime ? now - this.lastSpeedIncreaseTime : 'N/A',
                timeBasedMultiplier: timeBasedMultiplier,
                speeds: speeds,
                targetSpeedPercent: targetSpeedPercent,
                finalTargetSpeedPercent: finalTargetSpeedPercent,
                finalTargetSpeed: finalTargetSpeed,
                currentSpeed: currentSpeed,
                ballSpeedPercent: this.ball.speedPercent,
                ballSpeed: this.ball.speed
            });
            this.lastSpeedDebugTime = now;
        }
        
        // Only adjust speed if difference is significant (more than 1%)
        if (Math.abs(currentSpeed - finalTargetSpeed) > finalTargetSpeed * 0.01) {
            const angle = Math.atan2(this.ball.dy, this.ball.dx);
            this.ball.dx = finalTargetSpeed * Math.cos(angle);
            this.ball.dy = finalTargetSpeed * Math.sin(angle);
            
            // Update ball's speed properties to keep them in sync
            this.ball.speed = finalTargetSpeed;
            this.ball.speedPercent = finalTargetSpeedPercent;
            
            console.log('🎮 Speed adjusted:', {
                from: currentSpeed,
                to: finalTargetSpeed,
                multiplier: timeBasedMultiplier
            });
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
        
        // Initialize fresh game state
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

        // Debug collision detection
        if (powerUp.sprite.y < paddleBottom + 50 && powerUp.sprite.y > paddleTop - 50) {
            console.log('🎯 Power-up collision debug:', {
                powerUpType: powerUp.type,
                powerUpLogicalBounds: {
                    x: powerUp.sprite.x,
                    y: powerUp.sprite.y,
                    size: powerUpSize,
                    top: powerUpTop,
                    bottom: powerUpBottom,
                    left: powerUpLeft,
                    right: powerUpRight
                },
                paddleBounds: {
                    top: paddleTop,
                    bottom: paddleBottom,
                    left: paddleLeft,
                    right: paddleRight
                },
                collision: collision,
                distance: paddleTop - powerUpBottom
            });
        }

        return collision;
    }

    handlePowerUpCollection(powerUp) {
        // Get powerup configuration for scoring
        const powerupConfig = getPowerUpConfig(powerUp.type);
        
        // Play sound using the new configuration-based system
        playSoundByName(powerUp.type);
        
        // Handle powerup effects
        switch(powerUp.type.toLowerCase()) {
            case 'brannas':
                // Activate brannas effect - balls destroy all bricks without deflection
                this.brannasActive = true;
                this.brannasEndTime = Date.now() + (powerupConfig?.duration || 10000);
                break;
            case 'extra_life':
                this.lives++;
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
} 