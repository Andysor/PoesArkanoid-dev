import { ASSETS } from './assets.js';

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
        if (this.sprite) {
            this.sprite.visible = true;
        } else {
            this.createSprite();
        }
    }
} 