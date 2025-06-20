import { BASE_INITIAL_SPEED, BASE_MAX_SPEED, LEVEL_SPEED_INCREASE, COMPONENT_SPEED, BALL_RADIUS, getScreenRelativeSpeed, BASE_INITIAL_SPEED_PERCENT, BASE_MAX_SPEED_PERCENT } from './config.js';
import { playSoundByName } from './audio.js';
import { BallTrail } from './ballTrail.js';
import { ASSETS, loadImage } from './assets.js';
import { createPowerUp, showPowerUpText } from './powerup.js';
import { getPowerUpConfig, BRICK_SCORE_CONFIG } from './powerupConfig.js';

export class Ball {
    static balls = []; // Static array to track all balls
    static textures = {
        main: null,
        extra: null
    };

    static async loadTextures() {
        if (!Ball.textures.main) {
            const mainBallImg = loadImage(ASSETS.images.items.ball);
            Ball.textures.main = await new Promise(resolve => {
                mainBallImg.onload = () => resolve(PIXI.Texture.from(mainBallImg));
            });
        }
        if (!Ball.textures.extra) {
            const extraBallImg = loadImage(ASSETS.images.items.extraball);
            Ball.textures.extra = await new Promise(resolve => {
                extraBallImg.onload = () => resolve(PIXI.Texture.from(extraBallImg));
            });
        }
    }

    static clearAll() {
        // Remove all balls from the stage
        Ball.balls.forEach(ball => {
            if (ball.game && ball.game.objectsContainer) {
                ball.game.objectsContainer.removeChild(ball.graphics);
            }
            if (ball.trail) {
                ball.trail.clear();
            }
        });
        // Clear the array
        Ball.balls = [];
    }

    constructor(app, isExtraBall = false) {
        this.app = app;
        this.radius = BALL_RADIUS;
        this.speedPercent = BASE_INITIAL_SPEED_PERCENT; // Store percentage speed
        this.speed = getScreenRelativeSpeed(this.speedPercent, this.app); // Convert to pixels per frame
        this.dx = 0; // Start with no movement
        this.dy = 0;
        this.isMoving = false;
        this.level = null; // Initialize level reference
        this.isExtraBall = isExtraBall;
        
        // Duration tracking for extra balls
        this.duration = 0;
        this.startTime = 0;
        this.endTime = 0;
        
        // Create ball sprite
        const texture = isExtraBall ? Ball.textures.extra : Ball.textures.main;
        if (!texture) {
            console.error('Ball texture not loaded:', { isExtraBall });
            return;
        }
        this.graphics = new PIXI.Sprite(texture);
        this.graphics.isBallGraphic = true; // Add this line for easy removal
        const originalSize = texture.width;
        this.graphics.anchor.set(0.5); // Center the sprite
        this.graphics.scale.set(this.radius * 2 / 1024);
        this.graphics.alpha = 1; // Ensure full opacity
        this.graphics.blendMode = PIXI.BLEND_MODES.NORMAL; // Use normal blending
        
        // Set initial position
        this.graphics.x = app.screen.width / 2;
        this.graphics.y = app.screen.height / 10;

        // Add to static balls array
        Ball.balls.push(this);

        // Initialize trail effect with different colors for regular and extra balls
        this.trail = new BallTrail(app, isExtraBall ? 0x42f5f5 : 0xf58a42); // Cyan for extra balls, orange for regular balls
    }
    
    setLevel(level) {
        this.level = level;
    }
    
    placeOnPaddle(paddle) {
        if (!paddle) {
            console.error('No paddle provided for ball placement');
            return;
        }
    
        // Only reset if not already moving
        if (!this.isMoving) {
        this.dx = 0;
        this.dy = 0;
        }
        // Don't reset isMoving if ball is already in motion
    
        // Calculate position using sprite with centered anchor
        const ballX = paddle.sprite.x;
        const ballY = paddle.sprite.y - paddle.height / 2 - this.radius - 2;
    
        // Update graphics position
        this.graphics.x = ballX;
        this.graphics.y = ballY;
    
        console.log('🎯 placeOnPaddle called', {
            ballX,
            ballY,
            paddleX: paddle.sprite.x,
            paddleY: paddle.sprite.y,
            time: Date.now(),
            paddleWidth: paddle.width
        });
    }
    

    start() {
        if (this.isMoving) {
            console.log("🚀 Ball start ignored - already moving", { isExtraBall: this.isExtraBall });
            return;
        }
        
        console.log("🚀 Ball start triggered", { isMoving: this.isMoving, isExtraBall: this.isExtraBall });
        
        this.speedPercent = BASE_INITIAL_SPEED_PERCENT;
        this.speed = getScreenRelativeSpeed(this.speedPercent, this.app);

        console.log('🎮 Ball START: Resetting speed to', this.speed, 'pixels/frame (', this.speedPercent * 100, '% of screen width/second)'); // debug

        // Set initial velocity
        this.dx = this.speed * Math.cos(Math.PI / 4); // 45 degrees
        this.dy = -this.speed * Math.sin(Math.PI / 4); // Moving upward
        this.isMoving = true;
        
        console.log('🎮 Ball START: Velocity set', { dx: this.dx, dy: this.dy, isMoving: this.isMoving });
        
        // Add some randomness to the initial direction
        this.addRandomFactor();
        
        console.log('🎮 Ball START: Final velocity after random factor', { dx: this.dx, dy: this.dy });
    }
    
    update(paddle, level) {
        if (!this.isMoving) {
            // Keep ball on paddle when not moving
            if (!this.isExtraBall) {
                const oldX = this.graphics.x;
                const oldY = this.graphics.y;
                this.graphics.x = paddle.sprite.x;
                this.graphics.y = paddle.sprite.y - paddle.height / 2 - this.radius;
                console.log('🎯 Ball following paddle:', {
                    oldPosition: { x: oldX, y: oldY },
                    newPosition: { x: this.graphics.x, y: this.graphics.y },
                    paddlePosition: { x: paddle.sprite.x, y: paddle.sprite.y },
                    isExtraBall: this.isExtraBall
                });
            }
            return { brickHit: false, lifeLost: false };
        }

        // Store previous position
        const prevX = this.graphics.x;
        const prevY = this.graphics.y;
        
        // Move ball
        this.graphics.x += this.dx;
        this.graphics.y += this.dy;
        
        // Add trail particle at previous position
        this.trail.addParticle(prevX, prevY, this.radius);
        
        // Update trail effect
        this.trail.update();
        
        // Wall collision with position correction
        if (this.graphics.x - this.radius < 0) {
            this.graphics.x = this.radius;
            this.dx = Math.abs(this.dx);
        } else if (this.graphics.x + this.radius > this.app.screen.width) {
            this.graphics.x = this.app.screen.width - this.radius;
            this.dx = -Math.abs(this.dx);
        }
        
        if (this.graphics.y - this.radius < 0) {
            this.graphics.y = this.radius;
            this.dy = Math.abs(this.dy);
        }
        
        // Paddle collision with position correction
        const ballBottom = this.graphics.y + this.radius;
        const ballTop = this.graphics.y - this.radius;
        const ballLeft = this.graphics.x - this.radius;
        const ballRight = this.graphics.x + this.radius;
        
        // Paddle bounds using sprite with centered anchor
        const paddleTop = paddle.sprite.y - paddle.height / 2;
        const paddleBottom = paddle.sprite.y + paddle.height / 2;
        const paddleLeft = paddle.sprite.x - paddle.width / 2;
        const paddleRight = paddle.sprite.x + paddle.width / 2;
        
        // Check if ball is moving downward and is above the paddle
        if (this.dy > 0 && 
            ballBottom >= paddleTop && 
            ballTop <= paddleBottom &&
            ballRight >= paddleLeft && 
            ballLeft <= paddleRight) {
            
            // Calculate hit position relative to paddle center
            const hitPoint = (this.graphics.x - paddle.sprite.x) / (paddle.width / 2);
            
            // Add paddle velocity influence to the ball direction
            const paddleVelocityInfluence = paddle.velocityX * 0.5; // Adjust this multiplier as needed
            
            // Set new direction with paddle movement influence
            this.dx = hitPoint * this.speed + paddleVelocityInfluence;
            this.dy = -Math.abs(this.dy);
            
            // Normalize speed to maintain consistent ball velocity
            const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
            this.dx = (this.dx / currentSpeed) * this.speed;
            this.dy = (this.dy / currentSpeed) * this.speed;
            
            // Ensure ball is above paddle
            this.graphics.y = paddleTop - this.radius;
            
            this.addRandomFactor();
        }
        
        // Check for brick collisions
        let brickHit = false;
        for (let c = 0; c < level.brickColumnCount; c++) {
            for (let r = 0; r < level.brickRowCount; r++) {
                const brick = level.bricks[c]?.[r];
                if (this.handleBrickCollision(brick, c, r)) {
                    brickHit = true;
                    this.addRandomFactor();
                    break;
                }
            }
            if (brickHit) break;
        }
        
        // Check for bottom collision (lose life)
        if (this.graphics.y + this.radius >= this.app.screen.height) {
            if (!this.isExtraBall) {
                // Only trigger life loss for the main ball
                this.reset();
                return { brickHit: false, lifeLost: true };
            } else {
                // For extra balls, just remove them
                this.reset();
                return { brickHit: false, lifeLost: false };
            }
        }
        
        return { brickHit, lifeLost: false };
    }
    
    reset() {
        this.isMoving = false;
        this.dx = 0;
        this.dy = 0;
        this.speedPercent = BASE_INITIAL_SPEED_PERCENT;
        this.speed = getScreenRelativeSpeed(this.speedPercent, this.app);
    
        if (this.trail) {
            this.trail.clear();
        }
    
        if (this.graphics?.parent) {
            this.graphics.parent.removeChild(this.graphics);
        }
    
        if (!this.isExtraBall) {
            this.graphics.x = this.app.screen.width / 2;
            this.graphics.y = this.app.screen.height / 10;
    
            if (this.game?.objectsContainer && !this.game.objectsContainer.children.includes(this.graphics)) {
                this.game.objectsContainer.addChild(this.graphics);
            }
        } else {
            const index = Ball.balls.indexOf(this);
            if (index !== -1) {
                Ball.balls.splice(index, 1);
            }
        }
    }
    
    addRandomFactor() {
        const randomFactor = (Math.random() - 0.5) * 0.2;
        this.dx += randomFactor;
        this.dy += randomFactor;
        
        // Normalize speed
        const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        this.dx = (this.dx / currentSpeed) * this.speed;
        this.dy = (this.dy / currentSpeed) * this.speed;
    }

    handleWallCollision(screen) {
        let collision = false;
        const screenWidth = screen ? screen.width : this.app.screen.width;
        const screenHeight = screen ? screen.height : this.app.screen.height;
        
        if (this.graphics.x - this.radius < 0) {
            this.graphics.x = this.radius;
            this.dx = Math.abs(this.dx);
            collision = true;
        }
        else if (this.graphics.x + this.radius > screenWidth) {
            this.graphics.x = screenWidth - this.radius;
            this.dx = -Math.abs(this.dx);
            collision = true;
        }
        if (this.graphics.y - this.radius < 0) {
            this.graphics.y = this.radius;
            this.dy = Math.abs(this.dy);
            collision = true;
        }

        if (collision) {
            let angle = Math.atan2(this.dy, this.dx);
            
            if (Math.abs(angle) < Math.PI / 6) {
                angle = Math.PI / 6 * Math.sign(angle);
            } else if (Math.abs(angle) > Math.PI - Math.PI / 6) {
                angle = (Math.PI - Math.PI / 6) * Math.sign(angle);
            }
            
            this.dx = this.speed * Math.cos(angle);
            this.dy = this.speed * Math.sin(angle);
            
            this.addRandomFactor();
        }
    }

    increaseSpeed(level) {
        const maxSpeedPercent = BASE_MAX_SPEED_PERCENT * (1 + level * LEVEL_SPEED_INCREASE);
        this.speedPercent = Math.min(this.speedPercent * 1.1, maxSpeedPercent);
        this.speed = getScreenRelativeSpeed(this.speedPercent, this.app);
        console.log('🎮 Speed increased to', this.speed, 'pixels/frame (', this.speedPercent * 100, '% of screen width/second)'); // debug
        const angle = Math.atan2(this.dy, this.dx);
        this.dx = this.speed * Math.cos(angle);
        this.dy = this.speed * Math.sin(angle);
    }

    handleBrickCollision(brick, c, r) {
        if (!this.level || !brick || brick.status !== 1) {
            return false;
        }
        
        // Get brick dimensions
        const brickLeft = brick.x;
        const brickRight = brick.x + this.level.brickWidth;
        const brickTop = brick.y;
        const brickBottom = brick.y + this.level.brickHeight;
        
        // Get ball boundaries
        const ballLeft = this.graphics.x - this.radius;
        const ballRight = this.graphics.x + this.radius;
        const ballTop = this.graphics.y - this.radius;
        const ballBottom = this.graphics.y + this.radius;
        
        // Check for collision
        if (ballRight >= brickLeft && 
            ballLeft <= brickRight && 
            ballBottom >= brickTop && 
            ballTop <= brickBottom) {
            
            // Check if brannas effect is active
            const brannasActive = this.game && this.game.isBrannasActive();
            
            if (!brannasActive) {
                // Normal collision - determine which side of the brick was hit
                const ballCenterX = this.graphics.x;
                const ballCenterY = this.graphics.y;
                const brickCenterX = brick.x + this.level.brickWidth / 2;
                const brickCenterY = brick.y + this.level.brickHeight / 2;
                
                // Calculate collision side
                const dx = ballCenterX - brickCenterX;
                const dy = ballCenterY - brickCenterY;
                
                // Position correction based on collision side
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal collision
                    this.dx = -this.dx;
                    if (dx > 0) {
                        this.graphics.x = brickRight + this.radius;
                    } else {
                        this.graphics.x = brickLeft - this.radius;
                    }
                } else {
                    // Vertical collision
                    this.dy = -this.dy;
                    if (dy > 0) {
                        this.graphics.y = brickBottom + this.radius;
                    } else {
                        this.graphics.y = brickTop - this.radius;
                    }
                }
            }
            // If brannas is active, no deflection occurs - ball continues straight through
            
            // Handle special brick effects
            if (brick.brickInfo) {
                if (brick.brickInfo.type === 'glass') {
                    // Don't process if brick is already destroyed
                    if (brick.status !== 1) {
                        return true;
                    }
                    
                    // Handle glass brick hit
                    const shouldDestroy = brick.hit();
                    
                    if (shouldDestroy) {
                        // Second hit - destroy the brick
                        playSoundByName('brick_glass_destroyed');
                        this.level.handleBrickDestroyed(c, r);
                        if (this.game) {
                            this.game.addScore(BRICK_SCORE_CONFIG.glass_destroyed || 20);
                        }
                    } else {
                        // First hit - just show broken effect
                        playSoundByName('brick_glass_break');
                        if (this.game) {
                            this.game.addScore(BRICK_SCORE_CONFIG.glass_first_hit || 5);
                        }
                    }
                } else if (brick.brickInfo.type === 'strong') {
                    // Strong bricks are unbreakable by normal hits
                    // They can only be destroyed by specific powerups like brannas
                    console.log('💪 Strong brick hit - unbreakable by normal hits', {
                        brickPosition: { x: brick.x, y: brick.y },
                        ballPosition: { x: this.graphics.x, y: this.graphics.y },
                        brannasActive: this.game ? this.game.isBrannasActive() : false
                    });
                    
                    // Check if brannas effect is active
                    if (this.game && this.game.isBrannasActive()) {
                        console.log('🔥 Brannas active - destroying strong brick!');
                        this.level.handleBrickDestroyed(c, r);
                        if (this.game) {
                            this.game.addScore(BRICK_SCORE_CONFIG.strong || 30);
                        }
                        return true; // Allow destruction
                    }
                    
                    // Ball bounces off strong brick but doesn't destroy it
                    console.log('💪 Strong brick collision - ball bouncing off');
                    return true; // Return true to indicate collision occurred
                } else if (brick.brickInfo.type === 'sausage') {
                    // Create falling sausage power-up
                    if (this.game) {
                        const powerUp = createPowerUp('sausage', brick.x, brick.y);
                        if (this.game.powerUpContainer) {
                            this.game.powerUpContainer.addChild(powerUp.sprite);
                            if (!this.game.activePowerUps) {
                                this.game.activePowerUps = [];
                            }
                            this.game.activePowerUps.push(powerUp);
                            powerUp.activate();
                        }
                        this.game.addScore(BRICK_SCORE_CONFIG.sausage || 50);
                    }
                    // Destroy the brick
                    this.level.handleBrickDestroyed(c, r);
                } else if (brick.brickInfo.type === 'extra') {
                    // Handle extra ball effect
                    // Get extra ball configuration from powerupConfig
                    const extraBallConfig = getPowerUpConfig('extraball');
                    
                    if (this.game) {
                        const duration = extraBallConfig?.duration || 0;
                        
                        Ball.createExtraBall(this.app, this.graphics.x, this.graphics.y, this.speed, -this.dx, -this.dy, duration);
                    }
                    // Show extra ball text effect if configured to show text
                    if (extraBallConfig && extraBallConfig.showText && this.game) {
                    // Calculate text position based on config
                        let textX, textY;
                        if (extraBallConfig.textPosition === 'center') {
                            textX = this.game.app.screen.width / 2;
                            textY = this.game.app.screen.height / 2;
                        } else {
                            // Show at brick location
                            textX = brick.x + this.level.brickWidth / 2;
                            textY = brick.y + this.level.brickHeight / 2;
                        }
        
                    showPowerUpText(extraBallConfig.text, textX, textY, this.game.app, extraBallConfig);
    }
                    // Destroy the brick
                    this.level.handleBrickDestroyed(c, r);
                    if (this.game) {
                        // Get score from extraball powerup config
                        const extraBallScore = extraBallConfig?.score || BRICK_SCORE_CONFIG.extra || 10;
                        this.game.addScore(extraBallScore);
                    }
                } else {
                    // Default brick destruction
                    this.level.handleBrickDestroyed(c, r);
                    if (this.game) {
                        this.game.addScore(BRICK_SCORE_CONFIG.normal || 10);
                    }
                }
            } else {
                // Default brick destruction for bricks without brickInfo
                this.level.handleBrickDestroyed(c, r);
                if (this.game) {
                    this.game.addScore(BRICK_SCORE_CONFIG.default || 10);
                }
            }
            
            return true;
        }
        return false;
    }

    static createExtraBall(app, x, y, speed, dx, dy, duration = 0) {
        if (!Ball.textures.extra) {
            return null;
        }
    
        // Play poesklap sound for extra ball
        playSoundByName('poesklap');
    
        const extraBall = new Ball(app, true);
    
        extraBall.graphics.x = x;
        extraBall.graphics.y = y;
        extraBall.speed = speed;
        extraBall.graphics.isBallGraphic = true; // For korrekt opprydding
    
        // Set duration if provided
        if (duration > 0) {
            extraBall.setDuration(duration);
        }
    
        // Spre litt på retningen
        const currentAngle = Math.atan2(dy, dx);
        const angleOffset = Math.PI / 4; // 45 grader
        const newAngle = currentAngle + angleOffset;
    
        extraBall.dx = speed * Math.cos(newAngle);
        extraBall.dy = speed * Math.sin(newAngle);
        extraBall.isMoving = true;
    
        const mainBall = Ball.balls.find(b => !b.isExtraBall);
        if (mainBall) {
            extraBall.level = mainBall.level;
            extraBall.game = mainBall.game;
            
            // Trigger powerup effects for extra ball creation
            if (extraBall.game && extraBall.game.powerupEffects) {
                extraBall.game.powerupEffects.triggerPowerupEffect('extraball', x, y);
            }
        } else {
            extraBall.level = null;
            extraBall.game = null;
        }
    
        if (extraBall.game?.objectsContainer) {
            extraBall.game.objectsContainer.addChild(extraBall.graphics);
        } else {
            app.stage.addChild(extraBall.graphics); // Fallback hvis game mangler
        }
    
        return extraBall;
    }
    

    static resetAll(app, game, levelInstance) {
        // Remove all ball graphics and clear trails
        Ball.balls.forEach(ball => {
            if (ball.graphics && ball.graphics.parent) {
                ball.graphics.parent.removeChild(ball.graphics);
            }
            if (ball.trail) {
                ball.trail.clear();
            }
        });
    
        // Clear balls array
        Ball.balls = [];
    
        // Remove lingering ball graphics
        if (game?.objectsContainer) {
            const lingering = game.objectsContainer.children.filter(child =>
                child.isBallGraphic || child instanceof PIXI.Sprite && child.texture?.baseTexture?.resource?.url?.includes('ball')
            );
            lingering.forEach(child => game.objectsContainer.removeChild(child));
            console.log(`🧹 Removed lingering ball graphics (post-clear): ${lingering.length}`);
        }
        

        // Check if balls array is empty
        if (Ball.balls.length !== 0) {
            console.warn('❗ Ball.balls not empty after clearing:', Ball.balls);
        }

        // Create new main ball
        const mainBall = new Ball(app, false);
        Ball.balls.push(mainBall);
        mainBall.speedPercent = BASE_INITIAL_SPEED_PERCENT;
        mainBall.speed = getScreenRelativeSpeed(mainBall.speedPercent, app);
        mainBall.dx = 0;
        mainBall.dy = 0;
        mainBall.isMoving = false;
        //mainBall.graphics.x = app.screen.width / 2;
        //mainBall.graphics.y = app.screen.height / 10;
        mainBall.trail.clear();
        mainBall.setLevel(levelInstance);
        mainBall.game = game;
        mainBall.graphics.isBallGraphic = true;
        Ball.balls = [mainBall]; // Reset balls array
        
        if (mainBall.game?.objectsContainer) {
            mainBall.game.objectsContainer.addChild(mainBall.graphics);
        }

        return mainBall;
    }
    
    // Get activation point
    getActivationPoint() {
        return this.config?.activateOn || 'paddle';
    }

    // Set duration for extra balls
    setDuration(duration) {
        this.duration = duration;
        this.startTime = Date.now();
        this.endTime = this.startTime + duration;
    }

    // Check if extra ball has expired
    isExpired() {
        if (!this.isExtraBall || this.duration === 0) {
            return false; // Main balls and permanent extra balls don't expire
        }
        return Date.now() > this.endTime;
    }
} 