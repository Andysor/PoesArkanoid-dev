import { BASE_INITIAL_SPEED, BASE_MAX_SPEED, LEVEL_SPEED_INCREASE, COMPONENT_SPEED, BALL_RADIUS } from './config.js';
import { playHitSound } from './audio.js';
import { BallTrail } from './ballTrail.js';
import { ASSETS, loadImage } from './assets.js';

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
        this.speed = BASE_INITIAL_SPEED;
        this.dx = 0; // Start with no movement
        this.dy = 0;
        this.isMoving = false;
        this.level = null; // Initialize level reference
        this.isExtraBall = isExtraBall;
        
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
    
        // Reset movement state
        this.isMoving = false;
        this.dx = 0;
        this.dy = 0;
    
        // Calculate position
        const paddleX = paddle.graphics.x;
        const paddleY = paddle.graphics.y;

        const ballX = paddleX + (paddle.width - this.graphics.width) / 2;
        const ballY = paddleY - this.graphics.height - 2;
    
        // Update graphics position
        this.graphics.x = ballX;
        this.graphics.y = ballY;
    
        console.log('🎯 placeOnPaddle called', {
            ballX,
            ballY,
            paddleX: paddle.graphics.x,
            paddleY: paddle.graphics.y,
            time: Date.now(),
            paddleWidth: paddle.graphics.width
        });
    }
    

    start() {
        if (this.isMoving) return;
        
        console.log("🚀 Ball start triggered", { isMoving: this.isMoving, isExtraBall: this.isExtraBall });
        
        this.speed = BASE_INITIAL_SPEED;

        console.log('🎮 Ball START: Resetting speed to', this.speed); // debug

        // Set initial velocity
        this.dx = this.speed * Math.cos(Math.PI / 4); // 45 degrees
        this.dy = -this.speed * Math.sin(Math.PI / 4); // Moving upward
        this.isMoving = true;
        
        // Add some randomness to the initial direction
        this.addRandomFactor();
    }
    
    update(paddle, level) {
        if (!this.isMoving) {
            // Keep ball on paddle when not moving
            if (!this.isExtraBall) {
                this.graphics.x = paddle.graphics.x + (paddle.width / 2);
                this.graphics.y = paddle.graphics.y - this.radius;
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
        
        const paddleTop = paddle.graphics.y;
        const paddleBottom = paddle.graphics.y + paddle.height;
        const paddleLeft = paddle.graphics.x;
        const paddleRight = paddle.graphics.x + paddle.width;
        
        // Check if ball is moving downward and is above the paddle
        if (this.dy > 0 && 
            ballBottom >= paddleTop && 
            ballTop <= paddleBottom &&
            ballRight >= paddleLeft && 
            ballLeft <= paddleRight) {
            
            // Calculate hit position relative to paddle center
            const hitPoint = (this.graphics.x - (paddle.graphics.x + paddle.width / 2)) / (paddle.width / 2);
            
            // Set new direction
            this.dx = hitPoint * this.speed;
            this.dy = -Math.abs(this.dy);
            
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
        this.speed = BASE_INITIAL_SPEED;
    
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
        const maxSpeed = BASE_MAX_SPEED * (1 + level * LEVEL_SPEED_INCREASE);
        this.speed = Math.min(this.speed * 1.1, maxSpeed);
        console.log('🎮 Speed increased to', this.speed); // debug
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
            
            // Determine which side of the brick was hit
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
            
            // Notify level to handle brick destruction
            this.level.handleBrickDestroyed(c, r);
            
            // Add score
            if (this.game) {
                this.game.addScore(10);
            }
            
            // Handle special brick effects
            if (brick.brickInfo) {
                if (brick.brickInfo.type === 'special') {
                    // Handle special brick effect
                    if (brick.brickInfo.effect === 'extend') {
                        if (this.game && this.game.paddle) {
                            this.game.paddle.extend();
                        }
                    } else if (brick.brickInfo.effect === 'shrink') {
                        if (this.game && this.game.paddle) {
                            this.game.paddle.shrink();
                        }
                    }
                } else if (brick.brickInfo.type === 'sausage') {
                    // Handle sausage brick effect (bonus score)
                    if (this.game) {
                        this.game.addScore(50); // Bonus score for sausage
                    }
                } else if (brick.brickInfo.type === 'extra') {
                    // Handle extra ball effect
                    if (this.game) {
                        Ball.createExtraBall(this.app, this.graphics.x, this.graphics.y, this.speed, -this.dx, -this.dy);
                        console.log('🎾 Extra ball triggered from special brick'); 
                    }
                }
            }
            
            return true;
        }
        return false;
    }

    static createExtraBall(app, x, y, speed, dx, dy) {
        console.log('Creating extra ball:', {
            position: { x, y },
            speed,
            direction: { dx, dy },
            currentBalls: Ball.balls.length
        });
    
        if (!Ball.textures.extra) {
            console.error('❌ Extra ball texture not loaded.');
            return null;
        }
    
        const extraBall = new Ball(app, true);
    
        extraBall.graphics.x = x;
        extraBall.graphics.y = y;
        extraBall.speed = speed;
        extraBall.graphics.isBallGraphic = true; // For korrekt opprydding
    
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
        } else {
            console.warn('⚠️ No mainBall found — setting level and game to null');
            extraBall.level = null;
            extraBall.game = null;
        }
    
        if (extraBall.game?.objectsContainer) {
            extraBall.game.objectsContainer.addChild(extraBall.graphics);
        } else {
            app.stage.addChild(extraBall.graphics); // Fallback hvis game mangler
        }
    
        console.log('Extra ball created:', {
            speed: extraBall.speed,
            direction: { dx: extraBall.dx, dy: extraBall.dy },
            isMoving: extraBall.isMoving,
            totalBalls: Ball.balls.length
        });
    
        return extraBall;
    }
    

    static resetAll(app, game, levelInstance) {
        console.log('Before resetAll - Current balls:', Ball.balls.map(b => ({
            isExtra: b.isExtraBall,
            isMoving: b.isMoving,
            dx: b.dx,
            dy: b.dy
        })));
    
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
        mainBall.speed = BASE_INITIAL_SPEED;
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
        
        console.log('🆕 New main ball created', {
            graphicsX: mainBall.graphics.x,
            graphicsY: mainBall.graphics.y,
            isMoving: mainBall.isMoving,
            ballsCount: Ball.balls.length
        });
        
        
    
        if (mainBall.game?.objectsContainer) {
            mainBall.game.objectsContainer.addChild(mainBall.graphics);
        }
    
        console.log('After resetAll - Current balls:', Ball.balls.map(b => ({
            isExtra: b.isExtraBall,
            isMoving: b.isMoving,
            dx: b.dx,
            dy: b.dy
        })));
    
        console.log('✔ Objects in container after reset:', game.objectsContainer?.children.length);
        console.log('✔ Balls in memory after reset:', Ball.balls.length);

        return mainBall;
    }
    
    
} 