export class Paddle {
    constructor(app) {
        this.app = app;
        this.width = 100;
        this.height = 20;
        this.speed = 7;
        this.baseWidth = 100; // Store the base width for resizing
        
        // Create paddle graphics
        this.graphics = new PIXI.Graphics();
        this.graphics.beginFill(0x0095DD);
        this.graphics.drawRect(0, 0, this.width, this.height);
        this.graphics.endFill();
        
        // Set initial position
        this.graphics.x = (app.screen.width - this.width) / 2;
        this.graphics.y = app.screen.height - (app.screen.height * 0.1); // 10% from bottom
        this.graphics.name = 'paddle';
        
        // Set up keyboard controls
        this.rightPressed = false;
        this.leftPressed = false;
        this.upPressed = false;
        this.downPressed = false;
        
        // Add keyboard event listeners
        document.addEventListener('keydown', this.keyDownHandler.bind(this));
        document.addEventListener('keyup', this.keyUpHandler.bind(this));
        
        // Add touch/mouse event listeners
        this.app.view.addEventListener('mousemove', this.mouseMoveHandler.bind(this));
        this.app.view.addEventListener('touchmove', this.touchMoveHandler.bind(this));
    }
    
    extend() {
        // Increase paddle width by 50%
        this.width = this.baseWidth * 1.5;
        this.updateGraphics();
    }
    
    shrink() {
        // Decrease paddle width by 25%
        this.width = this.baseWidth * 0.75;
        this.updateGraphics();
    }
    
    updateGraphics() {
        // Update the graphics object with new dimensions
        this.graphics.clear();
        this.graphics.beginFill(0x0095DD);
        this.graphics.drawRect(0, 0, this.width, this.height);
        this.graphics.endFill();
        
        // Keep paddle centered at current position
        const currentCenter = this.graphics.x + (this.graphics.width / 2);
        this.graphics.x = currentCenter - (this.width / 2);
    }
    
    keyDownHandler(e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            this.rightPressed = true;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            this.leftPressed = true;
        } else if (e.key === 'Up' || e.key === 'ArrowUp') {
            this.upPressed = true;
        } else if (e.key === 'Down' || e.key === 'ArrowDown') {
            this.downPressed = true;
        }
    }
    
    keyUpHandler(e) {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            this.rightPressed = false;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            this.leftPressed = false;
        } else if (e.key === 'Up' || e.key === 'ArrowUp') {
            this.upPressed = false;
        } else if (e.key === 'Down' || e.key === 'ArrowDown') {
            this.downPressed = false;
        }
    }
    
    mouseMoveHandler(e) {
        const rect = this.app.view.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const relativeY = e.clientY - rect.top;
        
        // Convert to game coordinates
        const gameX = (relativeX / this.app.view.clientWidth) * this.app.screen.width;
        const gameY = (relativeY / this.app.view.clientHeight) * this.app.screen.height;
        
        // Set X position with bounds
        this.graphics.x = Math.max(0, Math.min(gameX - this.width / 2, this.app.screen.width - this.width));
        
        // Set Y position with bounds
        const minY = this.app.screen.height * 0.5; // Don't go above middle of screen
        const maxY = this.app.screen.height - this.height - 20; // Keep some space from bottom
        this.graphics.y = Math.max(minY, Math.min(gameY - this.height / 2, maxY));
    }
    
    touchMoveHandler(e) {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        const rect = this.app.view.getBoundingClientRect();
        const relativeX = touch.clientX - rect.left;
        const relativeY = touch.clientY - rect.top;
        
        // Convert to game coordinates
        const gameX = (relativeX / this.app.view.clientWidth) * this.app.screen.width;
        const gameY = (relativeY / this.app.view.clientHeight) * this.app.screen.height;
        
        // Set X position with bounds
        this.graphics.x = Math.max(0, Math.min(gameX - this.width / 2, this.app.screen.width - this.width));
        
        // Set Y position with bounds
        const minY = this.app.screen.height * 0.5; // Don't go above middle of screen
        const maxY = this.app.screen.height - this.height - 20; // Keep some space from bottom
        this.graphics.y = Math.max(minY, Math.min(gameY - this.height / 2, maxY));
    }
    
    update() {
        // Handle keyboard movement
        if (this.rightPressed && this.graphics.x < this.app.screen.width - this.width) {
            this.graphics.x += this.speed;
        } else if (this.leftPressed && this.graphics.x > 0) {
            this.graphics.x -= this.speed;
        }
        
        // Handle vertical movement
        const minY = this.app.screen.height * 0.5; // Don't go above middle of screen
        const maxY = this.app.screen.height - this.height - 20; // Keep some space from bottom
        
        if (this.upPressed && this.graphics.y > minY) {
            this.graphics.y -= this.speed;
        } else if (this.downPressed && this.graphics.y < maxY) {
            this.graphics.y += this.speed;
        }
    }
    
    get x() {
        return this.graphics.x;
    }
    
    get y() {
        return this.graphics.y;
    }
} 