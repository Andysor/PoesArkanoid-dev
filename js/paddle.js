import { PADDLE_HOVER_OFFSET, PADDLE_BOTTOM_MARGIN, POWER_UP_DURATION } from './config.js';
import { ASSETS } from './assets.js';

export class Paddle {
    constructor(app) {
        this.app = app;
        this.width = 100;
        this.height = 50;
        this.speed = 5;
        this.baseWidth = 100;

        // Power-up duration tracking
        this.powerUpEndTime = 0;
        this.isExtended = false;
        this.isShrunk = false;

        // Create paddle sprite instead of graphics
        this.sprite = PIXI.Sprite.from(ASSETS.images.items.paddle_main);
        this.sprite.width = this.width;
        this.sprite.height = this.height;
        this.sprite.anchor.set(0.5, 0.5); // Center the anchor point

        // Set initial position using centralized method
        this.setStartingPosition();

        this.sprite.name = 'paddle';

        // Initialize target position for lerp
        this.targetX = this.sprite.x;
        this.targetY = this.sprite.y;

        //this.app.stage.eventMode = 'static';
        //this.app.stage.on('pointermove', this.handlePointerMove.bind(this));
    }

    setStartingPosition() {
        // Center horizontally
        this.sprite.x = this.app.screen.width / 2;
        
        // Position from bottom using config value
        this.sprite.y = this.app.screen.height - PADDLE_BOTTOM_MARGIN;
        
        // Update target positions to match
        this.targetX = this.sprite.x;
        this.targetY = this.sprite.y;
    }

    handlePointerMove(e) {
        this.targetX = e.global.x;
        
       // Set Y position to hover 15% of screen height above the touch point
        const hoverOffset = this.app.screen.height * PADDLE_HOVER_OFFSET;
        this.targetY = e.global.y - hoverOffset;
    }

    update() {
        // Check power-up status first
        this.updatePowerUpStatus();

        const lerp = 0.2;

        // Lerp toward target
        this.sprite.x += (this.targetX - this.sprite.x) * lerp;
        this.sprite.y += (this.targetY - this.sprite.y) * lerp;

        // Bound X
        const minX = this.width / 2;
        const maxX = this.app.screen.width - this.width / 2;
        this.sprite.x = Math.max(minX, Math.min(this.sprite.x, maxX));

        // Bound Y
        const minY = this.app.screen.height * 0.6;
        const maxY = this.app.screen.height - PADDLE_BOTTOM_MARGIN;
        this.sprite.y = Math.max(minY, Math.min(this.sprite.y, maxY));
    }

    extend() {
        this.width = this.baseWidth * 1.5;
        this.isExtended = true;
        this.isShrunk = false;
        this.powerUpEndTime = Date.now() + POWER_UP_DURATION;
        this.updateSprite();
        console.log('🔵 Paddle extended for', POWER_UP_DURATION / 1000, 'seconds');
    }

    shrink() {
        this.width = this.baseWidth * 0.75;
        this.isShrunk = true;
        this.isExtended = false;
        this.powerUpEndTime = Date.now() + POWER_UP_DURATION;
        this.updateSprite();
        console.log('🔴 Paddle shrunk for', POWER_UP_DURATION / 1000, 'seconds');
    }

    reset() {
        this.width = this.baseWidth;
        this.isExtended = false;
        this.isShrunk = false;
        this.powerUpEndTime = 0;
        this.updateSprite();
    }

    updateSprite() {
        // Store current center position
        const centerX = this.sprite.x;
        const centerY = this.sprite.y;
        
        // Update only sprite width, keep height constant
        this.sprite.width = this.width;
        // Keep the original height from the sprite texture
        this.sprite.height = this.height;
        
        // Restore center position
        this.sprite.x = centerX;
        this.sprite.y = centerY;
    }

    get x() {
        return this.sprite.x - this.width / 2;
    }

    get y() {
        return this.sprite.y - this.height / 2;
    }

    get graphics() {
        // For backward compatibility with existing code
        return this.sprite;
    }

    updatePowerUpStatus() {
        // Check if power-up duration has expired
        if (this.powerUpEndTime > 0 && Date.now() > this.powerUpEndTime) {
            console.log('⏰ Power-up expired, resetting paddle to base size');
            this.reset();
        }
    }
}
