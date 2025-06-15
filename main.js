// Game loop
app.ticker.add(() => {
    if (gameStarted && game) {
        console.log('Game loop:', {
            totalBalls: Ball.balls.length,
            gameStarted: game.gameStarted,
            gameOver: game.gameOver,
            waitingForInput: game.waitingForInput
        });
        game.update();
    }
}); 