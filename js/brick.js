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
        this.createGraphics();
    }

    createGraphics() {
        // Create new graphics object
        this.graphics = new PIXI.Graphics();
        this.draw();
    }

    draw() {
        if (!this.graphics) {
            this.createGraphics();
        }

        if (this.status === 0) {
            this.graphics.clear();
            this.graphics.visible = false;
            return;
        }

        const g = this.graphics;
        g.clear();
        // Determine color by type
        let baseColor = 0x0099ff; // default blue
        if (this.type === 'special') baseColor = 0xff0000;
        else if (this.type === 'sausage') baseColor = 0xffd700;
        else if (this.type === 'extra') baseColor = 0x00ff00;
        // Draw shadow
        g.beginFill(0x111111, 0.25);
        g.drawRect(4, 6, this.width, this.height);
        g.endFill();
        // Draw main brick
        g.beginFill(baseColor);
        g.drawRect(0, 0, this.width, this.height);
        g.endFill();
        // Draw highlight
        g.beginFill(0xffffff, 0.18);
        g.drawRect(4, 4, this.width - 8, this.height * 0.22);
        g.endFill();
        // Set position
        g.x = this.x;
        g.y = this.y;
        g.visible = true;
    }

    destroy() {
        this.status = 0;
        if (this.graphics) {
            // First remove from parent if it exists
            if (this.graphics.parent) {
                this.graphics.parent.removeChild(this.graphics);
            }
            
            // Remove all event listeners and clear graphics
            this.graphics.removeAllListeners();
            this.graphics.clear();
            
            // Set graphics to null without destroying
            this.graphics = null;
        }
    }

    hide() {
        this.status = 0;
        if (this.graphics) {
            this.graphics.clear();
            this.graphics.visible = false;
        }
    }

    show() {
        this.status = 1;
        if (!this.graphics) {
            this.createGraphics();
        }
        this.draw();
    }

    reset() {
        this.status = 1;
        this.createGraphics();
    }
} 