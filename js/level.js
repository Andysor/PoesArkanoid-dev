import { Brick } from './brick.js';
import { createPowerUp } from './powerup.js';

export class Level {
    constructor(app) {
        this.app = app;
        this.brickRowCount = 9;
        this.brickColumnCount = 15;
        
        // Calculate brick dimensions
        const totalBrickAreaWidth = this.app.screen.width * 0.9; // Use 90% of screen width
        this.brickPadding = 3; // Reduced padding to fit more bricks
        
        // Calculate brick size to fit all columns
        this.brickWidth = (totalBrickAreaWidth - (this.brickPadding * (this.brickColumnCount - 1))) / this.brickColumnCount;
        this.brickHeight = this.brickWidth; // Keep 1:1 aspect ratio
        
        // Center the brick area
        this.brickOffsetLeft = (this.app.screen.width - totalBrickAreaWidth) / 2;
        this.brickOffsetTop = this.app.screen.height * 0.05; // 5% from top
        
        console.log('Brick dimensions:', {
            screenWidth: this.app.screen.width,
            screenHeight: this.app.screen.height,
            brickWidth: this.brickWidth,
            brickHeight: this.brickHeight,
            totalBrickAreaWidth,
            brickOffsetLeft: this.brickOffsetLeft,
            brickOffsetTop: this.brickOffsetTop,
            totalHeight: (this.brickHeight * this.brickRowCount) + (this.brickPadding * (this.brickRowCount - 1))
        });
        
        this.currentLevel = 1;
        
        // Create brick container
        this.brickContainer = new PIXI.Container();
        
        // Initialize empty brick array
        this.bricks = new Array(this.brickColumnCount);
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = new Array(this.brickRowCount).fill(null);
        }
        console.log('Brick array initialized:', {
            columns: this.bricks.length,
            rows: this.bricks[0].length,
            totalCells: this.bricks.length * this.bricks[0].length,
            nullCells: this.bricks.flat().filter(b => b === null).length
        });
    }
    
    handleBrickDestroyed(c, r) {
        const brick = this.bricks[c]?.[r];
        if (brick) {
            // Create power-up if it's a special brick type
            if (brick.brickInfo && brick.brickInfo.type === 'sausage') {
                const powerUp = createPowerUp('sausage', brick.x, brick.y);
                if (this.game && this.game.powerUpContainer) {
                    this.game.powerUpContainer.addChild(powerUp.sprite);
                    powerUp.activate();
                }
            }
            
            // Remove brick from array
            this.bricks[c][r] = null;
            
            // Remove brick graphics from container and destroy brick
            if (brick.graphics && brick.graphics.parent) {
                brick.graphics.parent.removeChild(brick.graphics);
            }
            
            // Destroy the brick object
            brick.destroy();

            console.log('✅ Brick destruction complete, container children:', this.brickContainer.children.length);
        }
    }
    
    async loadLevel(levelNumber) {
        console.log('Loading level:', levelNumber);
        
        // Only clear if we have bricks
        if (this.bricks.flat().some(b => b !== null)) {
            this.clearBricks();
        }
        
        try {
            // Force a fresh load of the level data
            const response = await fetch(`./assets/levels/level${levelNumber}.json?t=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`Failed to load level ${levelNumber}`);
            }
            const levelData = await response.json();
            
            // Reset current level
            this.currentLevel = levelNumber;
            
            // Create new bricks from level data
            this.createBricksFromData(levelData);
            
            console.log(`Loaded level ${levelNumber} with ${this.brickContainer.children.length} bricks`);
        } catch (error) {
            console.error('Error loading level:', error);
            // Create a default level if loading fails
            this.createDefaultLevel();
        }
    }

    clearBricks() {
        console.log('Clearing bricks:', {
            beforeBrickCount: this.bricks.flat().filter(b => b !== null).length,
            beforeContainerChildren: this.brickContainer.children.length
        });

        // Destroy all brick graphics
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c]?.[r];
                if (brick) {
                    if (brick.graphics && brick.graphics.parent) {
                        brick.graphics.parent.removeChild(brick.graphics);
                    }
                    brick.destroy();
                }
            }
        }
        
        // Remove all children from container
        while (this.brickContainer.children.length > 0) {
            this.brickContainer.removeChild(this.brickContainer.children[0]);
        }
        
        // Reset the brick array
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = new Array(this.brickRowCount).fill(null);
        }

        console.log('Bricks cleared:', {
            afterBrickCount: this.bricks.flat().filter(b => b !== null).length,
            afterContainerChildren: this.brickContainer.children.length
        });
    }

    createBricksFromData(levelData) {
        console.log('Creating bricks from level data:', {
            rows: levelData.length,
            columns: levelData[0].length,
            expectedRows: this.brickRowCount,
            expectedColumns: this.brickColumnCount
        });

        // Ensure container is empty before creating new bricks
        while (this.brickContainer.children.length > 0) {
            this.brickContainer.removeChild(this.brickContainer.children[0]);
        }

        // Create bricks based on level data
        for (let r = 0; r < levelData.length; r++) {
            for (let c = 0; c < levelData[r].length; c++) {
                const brickInfo = levelData[r][c];
                if (!brickInfo.destroyed) {
                    const x = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
                    const y = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                    const type = brickInfo.type || 'normal';
                    const brick = new Brick(x, y, this.brickWidth, this.brickHeight, type);
                    brick.column = c;
                    brick.row = r;
                    brick.brickInfo = brickInfo; // Set the brickInfo property
                    this.brickContainer.addChild(brick.graphics);
                    this.bricks[c][r] = brick;
                }
            }
        }

        console.log('Brick array after creation:', {
            totalBricks: this.bricks.flat().filter(b => b !== null).length,
            containerChildren: this.brickContainer.children.length,
            arrayState: this.bricks.map(col => col.map(b => b ? 1 : 0))
        });
    }

    createDefaultLevel() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const x = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
                const y = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                const brick = new Brick(x, y, this.brickWidth, this.brickHeight, 'normal');
                this.brickContainer.addChild(brick.graphics);
                this.bricks[c][r] = brick;
            }
        }
    }
    
    update() {
        let allDestroyed = true;
        let activeBricks = 0;
        let destroyedBricks = 0;

        // First pass: count bricks and mark destroyed ones
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c]?.[r];
                if (brick) {
                    if (brick.status === 1) {
                        allDestroyed = false;
                        activeBricks++;
                    } else {
                        destroyedBricks++;
                        this.bricks[c][r] = null;
                    }
                }
            }
        }

        // Force stage update if there were destroyed bricks
        if (destroyedBricks > 0) {
            this.app.stage.removeChildren();
            this.app.stage.addChild(this.brickContainer);
            
            // Re-add all active bricks
            for (let c = 0; c < this.brickColumnCount; c++) {
                for (let r = 0; r < this.brickRowCount; r++) {
                    const activeBrick = this.bricks[c]?.[r];
                    if (activeBrick && activeBrick.status === 1 && activeBrick.graphics) {
                        this.brickContainer.addChild(activeBrick.graphics);
                    }
                }
            }
        }

        return allDestroyed;
    }
    
    getBrickDimensions() {
        return {
            width: this.brickWidth,
            height: this.brickHeight,
            padding: this.brickPadding,
            offsetTop: this.brickOffsetTop,
            offsetLeft: this.brickOffsetLeft
        };
    }

    checkCollision(ball) {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c]?.[r];
                if (brick && brick.status === 1) {
                    if (ball.x > brick.x && 
                        ball.x < brick.x + this.brickWidth && 
                        ball.y > brick.y && 
                        ball.y < brick.y + this.brickHeight) {
                        
                        // Handle collision
                        ball.dy = -ball.dy;
                        this.handleBrickDestroyed(c, r);
                        return true;
                    }
                }
            }
        }
        return false;
    }
} 