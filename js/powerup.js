import { POWERUPS_PER_LEVEL } from './config.js';

export class PowerUp {
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
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        
        // Set color based on power-up type
        switch(this.type) {
            case 'BRANNAS':
                ctx.fillStyle = '#FF0000';
                break;
            case 'EXTRA_LIFE':
                ctx.fillStyle = '#00FF00';
                break;
            case 'SKULL':
                ctx.fillStyle = '#000000';
                break;
            case 'COIN':
                ctx.fillStyle = '#FFD700';
                break;
            default:
                ctx.fillStyle = '#FFFFFF';
        }
        
        ctx.fill();
        ctx.closePath();
    }

    update(canvas) {
        if (!this.active) return;

        this.y += this.speed;

        // Check if power-up is out of bounds
        if (this.y > canvas.height) {
            this.active = false;
        }
    }

    activate() {
        this.active = true;
        this.startTime = Date.now();
        this.endTime = this.startTime + this.duration;
    }

    deactivate() {
        this.active = false;
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