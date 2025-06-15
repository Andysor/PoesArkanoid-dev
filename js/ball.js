import { BASE_INITIAL_SPEED, BASE_MAX_SPEED, LEVEL_SPEED_INCREASE, COMPONENT_SPEED } from './config.js';
import { playHitSound } from './audio.js';

export class Ball {
    constructor(app) {
        this.app = app;
        this.radius = 10;
        this.speed = BASE_INITIAL_SPEED;
        this.dx = 0; // Start with no movement
        this.dy = 0;
        this.isMoving = false;
        this.level = null; // Initialize level reference
        
        // Create ball graphics
        this.graphics = new PIXI.Graphics();
        this.graphics.beginFill(0xFFFFFF);
        this.graphics.drawCircle(0, 0, this.radius);
        this.graphics.endFill();
        
        // Set initial position
        this.graphics.x = app.screen.width / 2;
        this.graphics.y = app.screen.height - 30;
        
        app.stage.addChild(this.graphics);

        // Add event listeners for starting the ball
        document.addEventListener('keydown', this.handleStartInput.bind(this));
        this.app.view.addEventListener('touchstart', this.handleStartInput.bind(this));
    }
    
    setLevel(level) {
        this.level = level;
    }
    
    handleStartInput(e) {
        if (!this.isMoving && (e.code === 'Space' || e.type === 'touchstart')) {
            this.start();
        }
    }
    
    update(paddle, level) {
        if (!this.isMoving) {
            // Keep ball on paddle when not moving
            this.graphics.x = paddle.graphics.x + (paddle.width / 2);
            this.graphics.y = paddle.graphics.y - this.radius;
            return { brickHit: false, lifeLost: false };
        }

        // Store previous position
        const prevX = this.graphics.x;
        const prevY = this.graphics.y;
        
        // Move ball
        this.graphics.x += this.dx;
        this.graphics.y += this.dy;
        
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
        if (this.graphics.y + this.radius >= paddle.graphics.y &&
            this.graphics.x >= paddle.graphics.x &&
            this.graphics.x <= paddle.graphics.x + paddle.width) {
            
            // Calculate hit position relative to paddle center
            const hitPoint = (this.graphics.x - (paddle.graphics.x + paddle.width / 2)) / (paddle.width / 2);
            
            // Set new direction
            this.dx = hitPoint * this.speed;
            this.dy = -Math.abs(this.dy);
            
            // Ensure ball is above paddle
            this.graphics.y = paddle.graphics.y - this.radius;
            
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
            this.reset();
            return { brickHit: false, lifeLost: true };
        }
        
        return { brickHit, lifeLost: false };
    }
    
    reset() {
        this.isMoving = false;
        this.dx = 0;
        this.dy = 0;
        // Position will be updated in the next update call
    }

    start() {
        this.isMoving = true;
        this.dx = COMPONENT_SPEED;
        this.dy = -COMPONENT_SPEED;
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
            
            // Play hit sound
            if (this.game) {
                this.game.playSound('hit');
            }
            
            // Add score
            if (this.game) {
                this.game.addScore(10);
            }
            
            // Handle special brick effects
            if (brick.brickInfo) {
                if (brick.brickInfo.type === 'special') {
                    // Handle special brick effect
                    console.log('Special brick hit!');
                } else if (brick.brickInfo.type === 'sausage') {
                    // Handle sausage brick effect
                    console.log('Sausage brick hit!');
                } else if (brick.brickInfo.type === 'extra') {
                    // Handle extra brick effect
                    console.log('Extra brick hit!');
                }
            }
            
            return true;
        }
        return false;
    }
} 