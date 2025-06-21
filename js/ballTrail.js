export class BallTrail {
    constructor(app, trailColor = 0xf58a42) {
        this.app = app;
        this.particles = [];
        this.maxParticles = 15;
        this.particleLifetime = 12; // frames
        this.trailColor = trailColor;
        this.trailAlpha = 0.5;
        
        // Create container for particles
        this.container = new PIXI.Container();
        app.stage.addChild(this.container);
    }
    
    addParticle(x, y, radius) {
        // Create new particle
        const particle = new PIXI.Graphics();
        particle.beginFill(this.trailColor, this.trailAlpha);
        particle.drawCircle(0, 0, radius * 0.8);
        particle.endFill();
        
        // Set initial position
        particle.x = x;
        particle.y = y;
        
        // Add to container and particles array
        this.container.addChild(particle);
        this.particles.push({
            graphics: particle,
            life: this.particleLifetime
        });
        
        // Remove oldest particle if we exceed max particles
        if (this.particles.length > this.maxParticles) {
            const oldest = this.particles.shift();
            this.container.removeChild(oldest.graphics);
        }
    }
    
    update() {
        // Update all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life--;
            
            // Fade out based on remaining life
            particle.graphics.alpha = (particle.life / this.particleLifetime) * this.trailAlpha;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.container.removeChild(particle.graphics);
                this.particles.splice(i, 1);
            }
        }
    }
    
    clear() {
        // Remove all particles
        this.particles.forEach(particle => {
            this.container.removeChild(particle.graphics);
        });
        this.particles = [];
    }
} 