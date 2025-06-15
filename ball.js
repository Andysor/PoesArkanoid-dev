export class Ball {
    static balls = []; // Static array to track all balls
    static textures = {
        main: null,
        extra: null
    };

    static createExtraBall(app, x, y, speed, dx, dy) {
        console.log('Creating extra ball:', {
            position: { x, y },
            speed,
            direction: { dx, dy },
            currentBalls: Ball.balls.length
        });
        
        const extraBall = new Ball(app, true);
        extraBall.graphics.x = x;
        extraBall.graphics.y = y;
        extraBall.speed = speed;
        
        // Calculate a different angle for the extra ball
        const currentAngle = Math.atan2(dy, dx);
        const angleOffset = Math.PI / 4; // 45 degrees
        const newAngle = currentAngle + angleOffset;
        
        // Set new direction based on the angle
        extraBall.dx = speed * Math.cos(newAngle);
        extraBall.dy = speed * Math.sin(newAngle);
        extraBall.isMoving = true; // Start moving immediately

        // Get references from the main ball
        const mainBall = Ball.balls.find(ball => !ball.isExtraBall);
        if (mainBall) {
            extraBall.level = mainBall.level;
            extraBall.game = mainBall.game;
            
            // Ensure the ball is added to the game's object container
            if (extraBall.game && extraBall.game.objectsContainer) {
                // Remove from any existing container first
                if (extraBall.graphics.parent) {
                    extraBall.graphics.parent.removeChild(extraBall.graphics);
                }
                extraBall.game.objectsContainer.addChild(extraBall.graphics);
            }
        } else {
            console.error('Main ball not found when creating extra ball');
        }
        
        console.log('Extra ball created:', {
            speed: extraBall.speed,
            direction: { dx: extraBall.dx, dy: extraBall.dy },
            isMoving: extraBall.isMoving,
            totalBalls: Ball.balls.length,
            hasGameRef: !!extraBall.game,
            hasLevelRef: !!extraBall.level,
            position: { x: extraBall.graphics.x, y: extraBall.graphics.y }
        });
        
        return extraBall;
    }

    reset() {
        console.log('Resetting ball:', {
            isExtraBall: this.isExtraBall,
            isMoving: this.isMoving,
            dx: this.dx,
            dy: this.dy,
            speed: this.speed
        });

        // Only reset movement properties for main ball
        if (!this.isExtraBall) {
            this.isMoving = false;
            this.dx = 0;
            this.dy = 0;
            this.speed = BASE_INITIAL_SPEED;
            this.trail.clear();
            
            // Position will be updated in the next update call
            this.graphics.x = this.app.screen.width / 2;
            this.graphics.y = this.app.screen.height / 10;
        } else {
            // For extra balls, remove them from the game
            console.log('Removing extra ball from game');
            if (this.game && this.game.objectsContainer) {
                this.game.objectsContainer.removeChild(this.graphics);
            }
            // Remove from balls array
            const index = Ball.balls.indexOf(this);
            if (index > -1) {
                Ball.balls.splice(index, 1);
            }
        }
    }

    static resetAll(app, game, levelInstance) {
        console.log('Resetting all balls:', {
            currentBalls: Ball.balls.length,
            hasGame: !!game,
            hasLevel: !!levelInstance
        });

        // Clear all existing balls first
        Ball.clearAll();
        
        // Create a new main ball
        const mainBall = new Ball(app, false);
        mainBall.game = game;
        mainBall.setLevel(levelInstance);
        
        // Add to game container
        if (game && game.objectsContainer) {
            game.objectsContainer.addChild(mainBall.graphics);
        }
        
        console.log('Reset complete:', {
            newBallCount: Ball.balls.length,
            mainBallCreated: !!mainBall,
            hasGameRef: !!mainBall.game,
            hasLevelRef: !!mainBall.level
        });
        
        return mainBall;
    }

    static clearAll() {
        console.log('Clearing all balls:', Ball.balls.length);
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
        const originalSize = texture.width;
        this.graphics.anchor.set(0.5); // Center the sprite
        this.graphics.scale.set(this.radius * 2 / 1024);
        this.graphics.alpha = 1; // Ensure full opacity
        this.graphics.blendMode = PIXI.BLEND_MODES.NORMAL; // Use normal blending
        
        // Set initial position
        this.graphics.x = app.screen.width / 2;
        this.graphics.y = app.screen.height / 10;

        // Add event listeners for starting the ball (only for main ball)
        if (!isExtraBall) {
            document.addEventListener('keydown', this.handleStartInput.bind(this));
            this.app.view.addEventListener('touchstart', this.handleStartInput.bind(this));
        }

        // Add to static balls array
        Ball.balls.push(this);

        // Initialize trail effect with different colors for regular and extra balls
        this.trail = new BallTrail(app, isExtraBall ? 0x42f5f5 : 0xf58a42); // Cyan for extra balls, orange for regular balls
    }

    update(paddle, level) {
        console.log('Ball update:', {
            isExtraBall: this.isExtraBall,
            isMoving: this.isMoving,
            dx: this.dx,
            dy: this.dy,
            speed: this.speed,
            position: { x: this.graphics.x, y: this.graphics.y },
            hasGame: !!this.game,
            hasLevel: !!this.level
        });

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

    start() {
        console.log('Starting ball:', {
            isExtraBall: this.isExtraBall,
            currentSpeed: this.speed,
            currentDx: this.dx,
            currentDy: this.dy,
            isMoving: this.isMoving
        });
        this.isMoving = true;
        this.dx = COMPONENT_SPEED;
        this.dy = -COMPONENT_SPEED;
        console.log('Ball started:', {
            newSpeed: this.speed,
            newDx: this.dx,
            newDy: this.dy,
            isMoving: this.isMoving
        });
    }
} 