handleBrickDestroyed(c, r) {
    // Remove brick from array
    this.bricks[c][r] = null;
    
    // Remove brick graphics
    if (this.brickContainer.children) {
        const brick = this.brickContainer.children.find(child => 
            child.x === c * this.brickWidth && 
            child.y === r * this.brickHeight
        );
        if (brick) {
            this.brickContainer.removeChild(brick);
        }
    }
} 