export class Paddle {
    constructor(app) {
        this.app = app;
        this.width = 100;
        this.height = 20;
        this.speed = 7;
        this.baseWidth = 100;

        // Create paddle graphics
        this.graphics = new PIXI.Graphics();
        this.graphics.beginFill(0x0095DD);
        this.graphics.drawRect(0, 0, this.width, this.height);
        this.graphics.endFill();

        // Set initial position
        this.graphics.x = (app.screen.width - this.width) / 2;
        this.graphics.y = app.screen.height - (app.screen.height * 0.1);

        this.graphics.name = 'paddle';

        // Initialize target position for lerp
        this.targetX = this.graphics.x;
        this.targetY = this.graphics.y;

        this.app.stage.eventMode = 'static';
        this.app.stage.on('pointermove', this.handlePointerMove.bind(this));
    }

    handlePointerMove(e) {
        this.targetX = e.global.x - this.width / 2;
        this.targetY = e.global.y - this.height / 2;
    }

    update() {
        const lerp = 0.2;

        // Lerp toward target
        this.graphics.x += (this.targetX - this.graphics.x) * lerp;
        this.graphics.y += (this.targetY - this.graphics.y) * lerp;

        // Bound X
        this.graphics.x = Math.max(0, Math.min(this.graphics.x, this.app.screen.width - this.width));

        // Bound Y
        const minY = this.app.screen.height * 0.5;
        const maxY = this.app.screen.height - this.height - 20;
        this.graphics.y = Math.max(minY, Math.min(this.graphics.y, maxY));
    }

    extend() {
        this.width = this.baseWidth * 1.5;
        this.updateGraphics();
    }

    shrink() {
        this.width = this.baseWidth * 0.75;
        this.updateGraphics();
    }

    updateGraphics() {
        this.graphics.clear();
        this.graphics.beginFill(0x0095DD);
        this.graphics.drawRect(0, 0, this.width, this.height);
        this.graphics.endFill();

        const centerX = this.graphics.x + this.graphics.width / 2;
        this.graphics.x = centerX - this.width / 2;
    }

    get x() {
        return this.graphics.x;
    }

    get y() {
        return this.graphics.y;
    }
}
