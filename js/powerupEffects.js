// Powerup Effects Manager
export class PowerupEffects {
    constructor(app) {
        this.app = app;
        this.activeEffects = new Map();
        this.originalPositions = new Map();
    }

    // Screen shake effect for poesklap powerup
    shakeScreen(intensity = 10, duration = 500) {
        const effectId = 'screen_shake_' + Date.now();
        
        // Store original positions of all containers
        const containers = [this.app.stage];
        containers.forEach(container => {
            if (!this.originalPositions.has(container)) {
                this.originalPositions.set(container, {
                    x: container.x,
                    y: container.y
                });
            }
        });

        const startTime = Date.now();
        const shakeEffect = {
            id: effectId,
            type: 'screen_shake',
            startTime: startTime,
            duration: duration,
            intensity: intensity,
            containers: containers,
            update: (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function to reduce shake intensity over time
                const easeOut = 1 - Math.pow(progress, 2);
                const currentIntensity = intensity * easeOut;
                
                // Apply random shake to all containers
                containers.forEach(container => {
                    const originalPos = this.originalPositions.get(container);
                    if (originalPos) {
                        const shakeX = (Math.random() - 0.5) * currentIntensity;
                        const shakeY = (Math.random() - 0.5) * currentIntensity;
                        container.x = originalPos.x + shakeX;
                        container.y = originalPos.y + shakeY;
                    }
                });
                
                // Remove effect when complete
                if (progress >= 1) {
                    this.removeEffect(effectId);
                    return false; // Stop updating
                }
                return true; // Continue updating
            }
        };

        this.activeEffects.set(effectId, shakeEffect);
        return effectId;
    }

    // Flash effect for powerups
    flashScreen(color = 0xFFFFFF, duration = 200) {
        const effectId = 'flash_' + Date.now();
        
        // Create flash overlay
        const flash = new PIXI.Graphics();
        flash.beginFill(color, 0.3);
        flash.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        flash.endFill();
        flash.alpha = 0;
        
        // Add to stage
        this.app.stage.addChild(flash);

        const startTime = Date.now();
        const flashEffect = {
            id: effectId,
            type: 'flash',
            startTime: startTime,
            duration: duration,
            flash: flash,
            update: (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                if (progress <= 0.5) {
                    // Fade in
                    flash.alpha = (progress * 2) * 0.3;
                } else {
                    // Fade out
                    flash.alpha = (1 - (progress - 0.5) * 2) * 0.3;
                }
                
                if (progress >= 1) {
                    this.removeEffect(effectId);
                    return false;
                }
                return true;
            }
        };

        this.activeEffects.set(effectId, flashEffect);
        return effectId;
    }

    // Particle burst effect
    createParticleBurst(x, y, color = 0xFFFFFF, count = 20) {
        const effectId = 'particle_burst_' + Date.now();
        const particles = [];
        
        // Create particle container
        const particleContainer = new PIXI.Container();
        this.app.stage.addChild(particleContainer);

        // Create particles
        for (let i = 0; i < count; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(color);
            particle.drawCircle(0, 0, Math.random() * 3 + 1);
            particle.endFill();
            
            particle.x = x;
            particle.y = y;
            particle.vx = (Math.random() - 0.5) * 10;
            particle.vy = (Math.random() - 0.5) * 10;
            particle.life = 1.0;
            particle.decay = Math.random() * 0.02 + 0.01;
            
            particleContainer.addChild(particle);
            particles.push(particle);
        }

        const particleEffect = {
            id: effectId,
            type: 'particle_burst',
            particles: particles,
            container: particleContainer,
            update: () => {
                let allDead = true;
                
                particles.forEach(particle => {
                    if (particle.life > 0) {
                        // Update position
                        particle.x += particle.vx;
                        particle.y += particle.vy;
                        
                        // Apply gravity
                        particle.vy += 0.2;
                        
                        // Decay life
                        particle.life -= particle.decay;
                        particle.alpha = particle.life;
                        
                        allDead = false;
                    }
                });
                
                if (allDead) {
                    this.removeEffect(effectId);
                    return false;
                }
                return true;
            }
        };

        this.activeEffects.set(effectId, particleEffect);
        return effectId;
    }

    // Wave effect for powerups
    createWaveEffect(x, y, color = 0x00FFFF, duration = 1000) {
        const effectId = 'wave_' + Date.now();
        
        const wave = new PIXI.Graphics();
        this.app.stage.addChild(wave);

        const startTime = Date.now();
        const waveEffect = {
            id: effectId,
            type: 'wave',
            startTime: startTime,
            duration: duration,
            wave: wave,
            update: (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Clear previous wave
                wave.clear();
                
                // Draw expanding circle
                const radius = progress * 200;
                const alpha = (1 - progress) * 0.5;
                
                wave.lineStyle(3, color, alpha);
                wave.drawCircle(x, y, radius);
                
                if (progress >= 1) {
                    this.removeEffect(effectId);
                    return false;
                }
                return true;
            }
        };

        this.activeEffects.set(effectId, waveEffect);
        return effectId;
    }

    // Remove specific effect
    removeEffect(effectId) {
        const effect = this.activeEffects.get(effectId);
        if (effect) {
            // Clean up effect-specific resources
            if (effect.type === 'flash' && effect.flash) {
                if (effect.flash.parent) {
                    effect.flash.parent.removeChild(effect.flash);
                }
                effect.flash.destroy();
            } else if (effect.type === 'particle_burst' && effect.container) {
                if (effect.container.parent) {
                    effect.container.parent.removeChild(effect.container);
                }
                effect.container.destroy();
            } else if (effect.type === 'wave' && effect.wave) {
                if (effect.wave.parent) {
                    effect.wave.parent.removeChild(effect.wave);
                }
                effect.wave.destroy();
            }
            
            // Restore original positions for screen shake
            if (effect.type === 'screen_shake' && effect.containers) {
                effect.containers.forEach(container => {
                    const originalPos = this.originalPositions.get(container);
                    if (originalPos) {
                        container.x = originalPos.x;
                        container.y = originalPos.y;
                    }
                });
            }
            
            this.activeEffects.delete(effectId);
        }
    }

    // Remove all effects
    clearAllEffects() {
        const effectIds = Array.from(this.activeEffects.keys());
        effectIds.forEach(id => this.removeEffect(id));
    }

    // Update all active effects (call this in game loop)
    update() {
        const currentTime = Date.now();
        const effectIds = Array.from(this.activeEffects.keys());
        
        effectIds.forEach(effectId => {
            const effect = this.activeEffects.get(effectId);
            if (effect && effect.update) {
                const shouldContinue = effect.update(currentTime);
                if (!shouldContinue) {
                    this.removeEffect(effectId);
                }
            }
        });
    }

    // Trigger effect for specific powerup
    triggerPowerupEffect(powerupType, x = null, y = null) {
        switch (powerupType.toLowerCase()) {
            case 'poesklap':
            case 'extraball':
                // Screen shake for poesklap/extra ball
                this.shakeScreen(8, 400);
                // Add particle burst at ball position
                if (x !== null && y !== null) {
                    this.createParticleBurst(x, y, 0xFFFF00, 15);
                }
                break;
                
            case 'brannas':
                // Flash effect for brannas
                this.flashScreen(0xFF0000, 300);
                // Screen shake
                this.shakeScreen(12, 600);
                break;
                
            case 'extra_life':
                // Green flash for extra life
                this.flashScreen(0x00FF00, 400);
                // Wave effect
                if (x !== null && y !== null) {
                    this.createWaveEffect(x, y, 0x00FF00, 800);
                }
                break;
                
            case 'skull':
                // Red flash for skull
                this.flashScreen(0xFF0000, 200);
                // Strong screen shake
                this.shakeScreen(15, 500);
                break;
                
            case 'coin_gold':
                // Golden particle burst
                if (x !== null && y !== null) {
                    this.createParticleBurst(x, y, 0xFFD700, 10);
                }
                break;
                
            case 'coin_silver':
                // Silver particle burst
                if (x !== null && y !== null) {
                    this.createParticleBurst(x, y, 0xC0C0C0, 8);
                }
                break;
                
            case 'large_paddle':
            case 'small_paddle':
                // Blue wave effect for paddle powerups
                if (x !== null && y !== null) {
                    this.createWaveEffect(x, y, 0x0080FF, 600);
                }
                break;
                
            default:
                // Default particle burst for unknown powerups
                if (x !== null && y !== null) {
                    this.createParticleBurst(x, y, 0xFFFFFF, 5);
                }
                break;
        }
    }
} 