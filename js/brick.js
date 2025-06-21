import { ASSETS } from './assets.js';
import { getPowerUpConfig } from './powerupConfig.js';

export class Brick {
    constructor(x, y, width, height, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.status = 1; // 1 = active, 0 = destroyed
        this.column = -1;
        this.row = -1;
        this.hitCount = 0; // Track hits for glass bricks
        this.isBroken = false; // Track broken state for glass bricks

        this.createSprite();
    }

    createSprite() {
        // Create new sprite object
        const texturePath = this.getTexturePath();
        const texture = PIXI.Texture.from(texturePath);

        this.sprite = new PIXI.Sprite(texture);
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        this.sprite.width = this.width;
        this.sprite.height = this.height;
        this.sprite.visible = this.status === 1;
    }

    getTexturePath() {
        switch (this.type) {
            case 'special': return ASSETS.images.bricks.brick_special;
            case 'sausage': return ASSETS.images.bricks.brick_sausage;
            case 'extra': return ASSETS.images.bricks.brick_extra; 
            case 'strong': return ASSETS.images.bricks.brick_strong;
            case 'glass': 
                return this.isBroken ? ASSETS.images.bricks.brick_glass_broken : ASSETS.images.bricks.brick_glass;
            case 'finishlevel': return ASSETS.images.bricks.brick_finishlevel;
            case 'bigbonus': return ASSETS.images.bricks.brick_bigbonus;
            case 'empty': return ASSETS.images.bricks.brick_normal; // Fallback for empty bricks
            default: return ASSETS.images.bricks.brick_normal;
        }
    }

    destroy() {
        this.status = 0;
        if (this.sprite && this.sprite.parent) {
            this.sprite.parent.removeChild(this.sprite);
        }
        this.sprite?.destroy();
        this.sprite = null;
    }

    hide() {
        this.status = 0;
        if (this.sprite) {
            this.sprite.visible = false;
        }
    }

    show() {
        this.status = 1;
        if (!this.sprite) {
            this.createSprite();
        } else {
            this.sprite.visible = true;
        }
    }

    reset() {
        this.status = 1;
        this.hitCount = 0;
        this.isBroken = false;
        if (this.sprite) {
            this.sprite.visible = true;
        } else {
            this.createSprite();
        }
    }

    hit() {
        // Empty bricks cannot be hit
        if (this.type === 'empty') {
            return false;
        }
        
        if (this.type === 'strong') {
            // Strong bricks are unbreakable by normal hits
            return false; // Don't destroy the brick
        } else if (this.type === 'glass') {
            this.hitCount++;
            
            if (this.hitCount === 1) {
                // First hit - show broken glass effect
                this.isBroken = true;
                this.createBrokenGlassEffect();
                this.updateSprite();
                return false; // Don't destroy yet
            } else if (this.hitCount >= 2) {
                // Second hit - destroy the brick
                return true; // Destroy the brick
            }
        }
        return true; // Default behavior for other brick types
    }

    // Method to handle strong brick destruction by powerups
    hitByPowerup(powerupType) {
        // Empty bricks cannot be hit by powerups
        if (this.type === 'empty') {
            return false;
        }
        
        if (this.type === 'strong') {
            // Import the powerup config to check if this powerup can break strong bricks
            const config = getPowerUpConfig(powerupType);
            if (config && config.canBreakStrongBricks) {
                // This powerup can break strong bricks
                return true; // Allow destruction
            }
            return false; // Default: don't destroy strong bricks
        }
        return this.hit(); // Use normal hit logic for other brick types
    }

    createBrokenGlassEffect() {
        // Create glass shatter effect
        if (this.sprite && this.sprite.parent) {
            // Create glass shatter particles
            const shatterContainer = new PIXI.Container();
            shatterContainer.x = this.x + this.width / 2;
            shatterContainer.y = this.y + this.height / 2;
            
            // Create multiple small glass pieces
            for (let i = 0; i < 8; i++) {
                const shard = new PIXI.Graphics();
                shard.beginFill(0x87CEEB, 0.8); // Light blue with transparency
                shard.drawRect(0, 0, 3, 3);
                shard.endFill();
                
                // Random position around the brick
                shard.x = (Math.random() - 0.5) * this.width;
                shard.y = (Math.random() - 0.5) * this.height;
                
                // Add to shatter container
                shatterContainer.addChild(shard);
            }
            
            // Add to the same parent as the brick
            this.sprite.parent.addChild(shatterContainer);
            
            // Animate the shatter effect
            let alpha = 1;
            const fadeOut = () => {
                alpha -= 0.05;
                shatterContainer.alpha = alpha;
                if (alpha > 0) {
                    requestAnimationFrame(fadeOut);
                } else {
                    if (shatterContainer.parent) {
                        shatterContainer.parent.removeChild(shatterContainer);
                    }
                }
            };
            fadeOut();
        }
    }

    updateSprite() {
        if (this.sprite) {
            const newTexturePath = this.getTexturePath();
            this.sprite.texture = PIXI.Texture.from(newTexturePath);
        }
    }
} 