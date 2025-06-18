import { POWERUPS_PER_LEVEL } from './config.js';
import { ASSETS, loadImage } from './assets.js';

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
                console.log(`✅ Loaded texture for: ${type}`);
            }
        });

        // Wait for all textures to load
        await Promise.all(loadPromises);
        console.log('✅ All item textures loaded');
    }

    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 2;
        this.active = false;
        this.duration = 0;
        this.endTime = 0;

        // Create PIXI sprite
        this.sprite = new PIXI.Sprite(PowerUp.textures[this.type.toLowerCase()]);
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(0.05);
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
        this.sprite.visible = true;
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
}

export function createPowerUp(type, x, y) {
    const powerUp = new PowerUp(type, x, y);
    
    // Set duration based on type
    switch(type) {
        case 'brannas':
            powerUp.duration = 10000; // 10 seconds
            break;
        case 'extra_life':
            powerUp.duration = 0; // Instant
            break;
        case 'skull':
            powerUp.duration = 5000; // 5 seconds
            break;
        case 'coin_gold':
            powerUp.duration = 0; // Instant
            break;
        case 'coin_silver':
            powerUp.duration = 0; // Instant
            break;
    }
    
    return powerUp;
}

export function getRandomPowerUp(x, y) {
    const types = Object.keys(POWERUPS_PER_LEVEL);
    const randomType = types[Math.floor(Math.random() * types.length)];
    return createPowerUp(randomType, x, y);
} 