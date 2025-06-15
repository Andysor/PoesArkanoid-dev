initializeGameState() {
    console.log('🎮 Initializing game state...');
    
    // Reset game state
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameStarted = false;
    this.gameOver = false;
    this.waitingForInput = true;
    this.showHighscores = false;
    this.extraBalls = [];
    
    // Reset UI elements
    this.scoreText.text = `Score: ${this.score}`;
    this.livesText.text = `Lives: ${this.lives}`;
    this.levelText.text = `Level: ${this.level}`;
    
    // Show UI elements
    this.scoreText.visible = true;
    this.livesText.visible = true;
    this.levelText.visible = true;
    
    // Reset level
    if (this.levelInstance) {
        this.levelInstance.restartLevel();
    }
    
    // Reset paddle position
    if (this.paddle) {
        this.paddle.graphics.x = (this.app.screen.width - this.paddle.graphics.width) / 2;
        this.paddle.graphics.y = this.app.screen.height - this.paddle.graphics.height - 20;
    }
    
    // Reset all balls and get new main ball
    this.ball = Ball.resetAll(this.app, this, this.levelInstance);
    
    // Show game elements
    this.gameContainer.visible = true;
} 