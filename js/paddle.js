export class Paddle {
    constructor(app) {
        this.app = app;
        this.width = 100;
        this.height = 20;
        this.speed = 7;
        
        // Create paddle graphics
        this.graphics = new PIXI.Graphics();
        this.graphics.beginFill(0x0095DD);
        this.graphics.drawRect(0, 0, this.width, this.height);
        this.graphics.endFill();
        
        // Set initial position
        this.graphics.x = (app.screen.width - this.width) / 2;
        this.graphics.y = app.screen.height - 50;
        this.graphics.name = 'paddle';
        
        app.stage.addChild(this.graphics);
        
        // Set up keyboard controls
        this.rightPressed = false;
        this.leftPressed = false;
        
        // Add keyboard event listeners
        document.addEventListener('keydown', this.keyDownHandler.bind(this));
        document.addEventListener('keyup', this.keyUpHandler.bind(this));
        
        // Add touch/mouse event listeners
        this.app.view.addEventListener('mousemove', this.mouseMoveHandler.bind(this));
        this.app.view.addEventListener('touchmove', this.touchMoveHandler.bind(this));
    }
    
    keyDownHandler(e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            this.rightPressed = true;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            this.leftPressed = true;
        }
    }
    
    keyUpHandler(e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            this.rightPressed = false;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            this.leftPressed = false;
        }
    }
    
    mouseMoveHandler(e) {
        const relativeX = e.clientX - this.app.view.getBoundingClientRect().left;
        const gameX = (relativeX / this.app.view.clientWidth) * this.app.screen.width;
        this.graphics.x = Math.max(0, Math.min(gameX - this.width / 2, this.app.screen.width - this.width));
    }
    
    touchMoveHandler(e) {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        const relativeX = touch.clientX - this.app.view.getBoundingClientRect().left;
        const gameX = (relativeX / this.app.view.clientWidth) * this.app.screen.width;
        this.graphics.x = Math.max(0, Math.min(gameX - this.width / 2, this.app.screen.width - this.width));
    }
    
    update() {
        // Handle keyboard movement
        if (this.rightPressed && this.graphics.x < this.app.screen.width - this.width) {
            this.graphics.x += this.speed;
        } else if (this.leftPressed && this.graphics.x > 0) {
            this.graphics.x -= this.speed;
        }
    }
    
    get x() {
        return this.graphics.x;
    }
    
    get y() {
        return this.graphics.y;
    }
} 