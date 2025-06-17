import { POWERUPS_PER_LEVEL } from './config.js';
import { ASSETS, loadImage } from './assets.js';

export class PowerUp {
    static textures = {};  // Add static textures object

    static async loadTextures() {  // Add static loadTextures method
        if (!PowerUp.textures.sausage) {
            const sausageImg = loadImage(ASSETS.images.items.sausage);
            PowerUp.textures.sausage = await new Promise(resolve => {
                sausageImg.onload = () => resolve(PIXI.Texture.from(sausageImg));
            });
        }
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
    


    this.sprite = new PIXI.Sprite(PowerUp.textures[this.type.toLowerCase()]);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(0.5);
    this.sprite.x = x;
    this.sprite.y = y;
    
    this.sprite.visible = false;
    
}
 
//Load textures
static textures = {};

static async loadTextures() {
    if (!PowerUp.textures.sausage) {
        const sausageImg = loadImage(ASSETS.images.items.sausage);
        PowerUp.textures.sausage = await new Promise(resolve => {
            sausageImg.onload = () => resolve(PIXI.Texture.from(sausageImg));
        });
    }
}

update() {
    if (!this.active) return;
    
    this.sprite.y += this.speed;
    

    if (this.sprite.y > this.sprite.parent.height) {
        this.active = false;
        this.sprite.visible = false;
        if (this.sprite.parent) {
            this.sprite.parent.removeChild(this.sprite);
        }
    
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
        case 'BRANNAS':
            powerUp.duration = 10000; // 10 seconds
            break;
        case 'EXTRA_LIFE':
            powerUp.duration = 0; // Instant
            break;
        case 'SKULL':
            powerUp.duration = 5000; // 5 seconds
            break;
        case 'COIN':
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