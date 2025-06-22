import { Brick } from './brick.js';
import { createPowerUp, showPowerUpText } from './powerup.js';
import { POWERUPS_PER_LEVEL, distributePowerups } from './powerupConfig.js';
import { BRICK_AREA_WIDTH_PERCENT, BRICK_AREA_TOP_PERCENT } from './config.js';

export class Level {
    constructor(app) {
        this.app = app;
        this.brickRowCount = 15; // Default to 15x15
        this.brickColumnCount = 15;
        
        // Calculate brick dimensions
        const totalBrickAreaWidth = this.app.screen.width * BRICK_AREA_WIDTH_PERCENT; // Use configurable percentage of screen width
        this.brickPadding = 3; // Reduced padding to fit more bricks
        
        // Calculate brick size to fit all columns
        this.brickWidth = (totalBrickAreaWidth - (this.brickPadding * (this.brickColumnCount - 1))) / this.brickColumnCount;
        this.brickHeight = this.brickWidth; // Keep 1:1 aspect ratio
        
        // Center the brick area
        this.brickOffsetLeft = (this.app.screen.width - totalBrickAreaWidth) / 2;
        this.brickOffsetTop = this.app.screen.height * BRICK_AREA_TOP_PERCENT; // Use configurable percentage from top
        
        this.currentLevel = 1;
        
        // Create brick container
        this.brickContainer = new PIXI.Container();
        
        // Initialize empty brick array
        this.bricks = new Array(this.brickColumnCount);
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = new Array(this.brickRowCount).fill(null);
        }
    }
    
    adjustGridSize(rows, cols) {
        // Only adjust if the size is different
        if (rows !== this.brickRowCount || cols !== this.brickColumnCount) {
            console.log(`Adjusting grid size from ${this.brickRowCount}x${this.brickColumnCount} to ${rows}x${cols}`);
            
            this.brickRowCount = rows;
            this.brickColumnCount = cols;
            
            // Recalculate brick dimensions for new grid size
            const totalBrickAreaWidth = this.app.screen.width * BRICK_AREA_WIDTH_PERCENT;
            this.brickWidth = (totalBrickAreaWidth - (this.brickPadding * (this.brickColumnCount - 1))) / this.brickColumnCount;
            this.brickHeight = this.brickWidth;
            
            // Recalculate offsets
            this.brickOffsetLeft = (this.app.screen.width - totalBrickAreaWidth) / 2;
            this.brickOffsetTop = this.app.screen.height * BRICK_AREA_TOP_PERCENT;
            
            // Reinitialize brick array with new size
            this.bricks = new Array(this.brickColumnCount);
            for (let c = 0; c < this.brickColumnCount; c++) {
                this.bricks[c] = new Array(this.brickRowCount).fill(null);
            }
        }
    }
    
    handleBrickDestroyed(c, r) {
        const brick = this.bricks[c]?.[r];
        if (!brick) return;
    
        const { x, y } = brick;
        const info = brick.brickInfo || {};
    
        // 🔥 Sjekk om brikken inneholder powerup
        if (info.powerUpType) {
            // Transform coordinates to be relative to objectsContainer
            const globalX = x + brick.width / 2 + this.brickContainer.x;
            const globalY = y + brick.height / 2 + this.brickContainer.y;
            const powerUp = createPowerUp(info.powerUpType.toLowerCase(), globalX, globalY);
            
            if (this.game && this.game.powerUpContainer) {
                this.game.powerUpContainer.addChild(powerUp.sprite);
                powerUp.activate();
    
                // Legg til i spill-liste hvis du ønsker å oppdatere dem løpende
                if (!this.game.activePowerUps) {
                    this.game.activePowerUps = [];
                }
                this.game.activePowerUps.push(powerUp);

                // Show powerup text with configuration
                if (powerUp.shouldShowText()) {
                    const config = powerUp.getConfig();
                    showPowerUpText(powerUp.getText(), globalX, globalY, this.app, config);
                }
            }
        }

        // Fjern brikkens sprite
        if (brick.sprite?.parent) {
            brick.sprite.parent.removeChild(brick.sprite);
        }
    
        brick.destroy();
        this.bricks[c][r] = null;
    }
    
    async loadLevel(levelNumber) {
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
        } catch (error) {
            // Create a default level if loading fails
            this.createDefaultLevel();
        }
    }

    clearBricks() {
        // Destroy all brick graphics
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c]?.[r];
                if (brick) {
                    if (brick.sprite && brick.sprite.parent) {
                        brick.sprite.parent.removeChild(brick.sprite);
                    }
                    brick.destroy();
                }
            }
        }
        
        // Remove all children from container
        while (this.brickContainer.children.length > 0) {
            this.brickContainer.removeChild(this.brickContainer.children[0]);
        }
        
        // Reset the brick array with current grid size
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = new Array(this.brickRowCount).fill(null);
        }
    }

    createBricksFromData(levelData) {
        // Handle both old format (2D array) and new format (object with bricks property)
        let bricksData;
        if (levelData.bricks) {
            // New format from level editor
            bricksData = levelData.bricks;
            console.log('Loading level with new format (object with bricks property)');
        } else {
            // Old format (direct 2D array)
            bricksData = levelData;
            console.log('Loading level with old format (direct 2D array)');
        }

        // Detect level size from loaded data
        const detectedRows = bricksData.length;
        const detectedCols = bricksData[0] ? bricksData[0].length : 15;
        
        console.log(`Detected level size: ${detectedRows}x${detectedCols}`);
        
        // Adjust grid size if needed
        this.adjustGridSize(detectedRows, detectedCols);

        // Ensure container is empty before creating new bricks
        while (this.brickContainer.children.length > 0) {
            this.brickContainer.removeChild(this.brickContainer.children[0]);
        }

        const normalBricks = [];
        const glassBricks = [];
        const strongBricks = [];
        let emptySpaces = 0;

        // Create bricks based on level data
        for (let r = 0; r < bricksData.length; r++) {
            for (let c = 0; c < bricksData[r].length; c++) {
                const brickInfo = bricksData[r][c];
                
                // Handle empty bricks (holes) - they should be marked as destroyed
                if (brickInfo.type === 'empty') {
                    brickInfo.destroyed = true;
                    emptySpaces++;
                }
                
                if (!brickInfo.destroyed) {
                    const x = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
                    const y = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                    const type = brickInfo.type || 'normal';
                    
                    // Skip creating bricks for empty type (should be destroyed anyway)
                    if (type === 'empty') {
                        emptySpaces++;
                        continue;
                    }
                    
                    const brick = new Brick(x, y, this.brickWidth, this.brickHeight, type);
                    brick.column = c;
                    brick.row = r;
                    brick.brickInfo = brickInfo; // Set the brickInfo property
                    this.brickContainer.addChild(brick.sprite);
                    this.bricks[c][r] = brick;

                    if (type === 'normal') {
                        normalBricks.push(brick);
                    } else if (type === 'glass') {
                        glassBricks.push(brick);
                    } else if (type === 'strong') {
                        strongBricks.push(brick);
                    }
                } else {
                    // Mark position as empty in the bricks array
                    this.bricks[c][r] = null;
                    if (brickInfo.type === 'empty') {
                        emptySpaces++;
                    }
                }
            }
        }

        console.log(`Created ${normalBricks.length} normal bricks, ${glassBricks.length} glass bricks, ${strongBricks.length} strong bricks, and ${emptySpaces} empty spaces (holes)`);

        // Smart powerup distribution based on available bricks
        distributePowerups(normalBricks, glassBricks);
        
        console.log(`Level loaded successfully with grid size: ${this.brickRowCount}x${this.brickColumnCount}`);
    }

    createDefaultLevel() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const x = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
                const y = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                const brick = new Brick(x, y, this.brickWidth, this.brickHeight, 'normal');
                this.brickContainer.addChild(brick.sprite);
                this.bricks[c][r] = brick;
            }
        }
    }
    
    update() {
        let allDestroyed = true;
        let activeBricks = 0;
        let destroyedBricks = 0;
        let strongBricks = 0;
        let finishLevelBricks = 0;
        let bigBonusBricks = 0;
        let glassBricks = 0;

        // First pass: count bricks and mark destroyed ones
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c]?.[r];
                if (brick) {
                    // Skip strong bricks in level completion check - they don't block progression
                    if (brick.brickInfo && brick.brickInfo.type === 'strong') {
                        strongBricks++;
                        continue;
                    }
                    
                    // Skip finishlevel bricks in level completion check - they don't block progression
                    if (brick.brickInfo && brick.brickInfo.type === 'finishlevel') {
                        finishLevelBricks++;
                        continue;
                    }

                    // Skip bigbonus bricks in level completion check - they don't block progression
                    if (brick.brickInfo && brick.brickInfo.type === 'bigbonus') {
                        bigBonusBricks++;
                        continue;
                    }

                    // Skip glass bricks in level completion check - they don't block progression
                    if (brick.brickInfo && brick.brickInfo.type === 'glass') {
                        glassBricks++;
                        continue;
                    }
                    
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

        // Log level completion status only when there are changes (destroyed bricks)
        if (destroyedBricks > 0 && (strongBricks > 0 || finishLevelBricks > 0 || bigBonusBricks > 0 || glassBricks > 0)) {
            console.log(`🏗️ Level completion check: ${activeBricks} active bricks, ${strongBricks} strong bricks, ${finishLevelBricks} finish level bricks, ${bigBonusBricks} big bonus bricks, ${glassBricks} glass bricks (excluded from completion)`);
        }

        // Force stage update if there were destroyed bricks
        if (destroyedBricks > 0) {
            this.app.stage.removeChildren();
            this.app.stage.addChild(this.brickContainer);
            
            // Re-add all active bricks
            for (let c = 0; c < this.brickColumnCount; c++) {
                for (let r = 0; r < this.brickRowCount; r++) {
                    const activeBrick = this.bricks[c]?.[r];
                    if (activeBrick && activeBrick.status === 1 && activeBrick.sprite) {
                        this.brickContainer.addChild(activeBrick.sprite);
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