import { POWERUPS_PER_LEVEL, getPowerUpConfig, getPowerUpSpriteKey } from './powerupConfig.js';
import { ASSETS, loadImage } from './assets.js';
import { POWER_UP_FALLING_SPEED } from './config.js';

export class PowerUp {
    static textures = {};

    static async loadTextures() {
        // Get all item types from ASSETS.images.items
        const itemTypes = Object.keys(ASSETS.images.items);
        
        // Create an array of promises for loading all textures
        const loadPromises = itemTypes.map(async (type) => {
            if (!PowerUp.textures[type]) {
                const img = loadImage(ASSETS.images.items[type]);
                PowerUp.textures[type] = await new Promise(resolve => {
                    img.onload = () => resolve(PIXI.Texture.from(img));
                });
            }
        });

        // Wait for all textures to load
        await Promise.all(loadPromises);
    }

    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.active = false;
        this.duration = 0;
        this.endTime = 0;
        this.config = getPowerUpConfig(type);
        
        // Use individual fallSpeed from config, or fallback to global default
        this.speed = this.config?.fallSpeed || POWER_UP_FALLING_SPEED;

        // Create PIXI sprite using the sprite key from config
        const spriteKey = getPowerUpSpriteKey(type);
        this.sprite = new PIXI.Sprite(PowerUp.textures[spriteKey]);
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(0.3);
        this.sprite.x = x;
        this.sprite.y = y;
        this.sprite.visible = false;
    }

    update() {
        if (!this.active) return;
        
        this.sprite.y += this.speed;
        
        // Check if power-up is out of bounds
        const screenHeight = window.innerHeight || 800;
        if (this.sprite.y > screenHeight) {
            this.deactivate();
        }
    }

    activate() {
        this.active = true;
        this.startTime = Date.now();
        this.endTime = this.startTime + this.duration;
        this.sprite.visible = this.config?.showSprite !== false;
    }

    deactivate() {
        this.active = false;
        this.sprite.visible = false;
        if (this.sprite.parent) {
            this.sprite.parent.removeChild(this.sprite);
        }
    }

    isExpired() {
        return Date.now() > this.endTime;
    }

    // Get configuration for this powerup
    getConfig() {
        return this.config;
    }

    // Check if this powerup should show text
    shouldShowText() {
        return this.config?.showText === true;
    }

    // Get text for this powerup
    getText() {
        return this.config?.text || this.type.toUpperCase();
    }

    // Get text size for this powerup
    getTextSize() {
        return this.config?.textSize || 18;
    }

    // Check if text should blink
    shouldBlinkText() {
        return this.config?.textBlink === true;
    }

    // Check if sound should be played
    shouldPlaySound() {
        return this.config?.playSound === true;
    }

    // Get sound for this powerup
    getSound() {
        return this.config?.sound || null;
    }

    // Get activation point
    getActivationPoint() {
        return this.config?.activateOn || 'paddle';
    }
}

export function createPowerUp(type, x, y) {
    const powerUp = new PowerUp(type, x, y);
    
    // Set duration from config
    if (powerUp.config) {
        powerUp.duration = powerUp.config.duration || 0;
    }
    
    return powerUp;
}

export function getRandomPowerUp(x, y) {
    const types = Object.keys(POWERUPS_PER_LEVEL);
    const randomType = types[Math.floor(Math.random() * types.length)];
    return createPowerUp(randomType, x, y);
} 

export function showPowerUpText(text, x, y, app, config = {}) {
    const fontSize = config.textSize || 18;
    const shouldBlink = config.textBlink || false;
    
    const label = new PIXI.Text(text, {
        fontFamily: 'Arial',
        fontSize: fontSize,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 3
    });

    label.anchor.set(0.5);
    label.x = x;
    label.y = y;

    app.stage.addChild(label);

    // Fade and move up, then remove
    app.ticker.addOnce(() => {
        const start = performance.now();
        const duration = 1000;
        let blinkState = true;

        function animateLabel(time) {
            const elapsed = time - start;
            const t = Math.min(elapsed / duration, 1);
            label.y -= 0.5;
            label.alpha = 1 - t;
            
            // Handle blinking if enabled
            if (shouldBlink && t < 0.8) {
                if (Math.floor(elapsed / 100) % 2 === 0) {
                    label.visible = blinkState;
                } else {
                    label.visible = !blinkState;
                    blinkState = !blinkState;
                }
            }
            
            if (t < 1) {
                requestAnimationFrame(animateLabel);
            } else {
                app.stage.removeChild(label);
                label.destroy();
            }
        }

        requestAnimationFrame(animateLabel);
    });
}