// Powerup Effects Manager
export class PowerupEffects {
    constructor(app) {
        this.app = app;
        this.activeEffects = new Map();
        this.originalPositions = new Map();
        
        // Detect mobile device for reduced effects
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // On very low-end mobile devices, disable some effects entirely
        this.isLowEndMobile = this.isMobile && (
            navigator.hardwareConcurrency <= 2 || 
            /Android.*[1-4]\.|iPhone.*OS [1-8]_/i.test(navigator.userAgent)
        );
        
        if (this.isMobile) {
            console.log('📱 PowerupEffects: Mobile device detected - using reduced effects');
        }
        
        if (this.isLowEndMobile) {
            console.log('📱 PowerupEffects: Low-end mobile detected - disabling complex effects');
        }
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
        try {
            const effectId = 'particle_burst_' + Date.now();
            const particles = [];
            
            // Reduce particle count and duration on mobile
            const actualCount = this.isMobile ? Math.min(count, 8) : count;
            const maxDuration = this.isMobile ? 3000 : 5000; // 3 seconds on mobile, 5 on desktop
            
            // Additional safety check for very high particle counts
            const safeCount = Math.min(actualCount, 50);
            
            console.log('🎆 Creating particle burst:', {
                effectId,
                requestedCount: count,
                actualCount,
                safeCount,
                isMobile: this.isMobile,
                maxDuration,
                position: { x, y },
                color: '0x' + color.toString(16)
            });
            
            // Create particle container
            const particleContainer = new PIXI.Container();
            this.app.stage.addChild(particleContainer);

            // Create particles
            for (let i = 0; i < safeCount; i++) {
                try {
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
                } catch (error) {
                    console.error('❌ PowerupEffects: Error creating particle', i, error);
                    break; // Stop creating particles if there's an error
                }
            }

            console.log('🎆 Particle burst created:', {
                effectId,
                particlesCreated: particles.length,
                containerChildren: particleContainer.children.length,
                activeEffects: this.activeEffects.size
            });

            const particleEffect = {
                id: effectId,
                type: 'particle_burst',
                particles: particles,
                container: particleContainer,
                startTime: Date.now(),
                maxDuration: maxDuration, // Use mobile-optimized duration
                update: () => {
                    try {
                        const currentTime = Date.now();
                        const elapsed = currentTime - particleEffect.startTime;
                        
                        // Safety timeout - force cleanup if effect runs too long
                        if (elapsed > particleEffect.maxDuration) {
                            console.log('⚠️ PowerupEffects: Particle effect timeout, forcing cleanup', {
                                effectId,
                                elapsed,
                                maxDuration: particleEffect.maxDuration
                            });
                            this.removeEffect(effectId);
                            return false;
                        }
                        
                        let allDead = true;
                        let aliveCount = 0;
                        
                        particles.forEach((particle, index) => {
                            try {
                                if (particle && particle.life > 0) {
                                    // Update position
                                    particle.x += particle.vx;
                                    particle.y += particle.vy;
                                    
                                    // Apply gravity
                                    particle.vy += 0.2;
                                    
                                    // Decay life
                                    particle.life -= particle.decay;
                                    particle.alpha = particle.life;
                                    
                                    allDead = false;
                                    aliveCount++;
                                }
                            } catch (error) {
                                console.error('❌ PowerupEffects: Error updating particle', index, error);
                                // Mark particle as dead if there's an error
                                if (particle) {
                                    particle.life = 0;
                                }
                            }
                        });
                        
                        // Log particle status every 30 frames (about 0.5 seconds at 60fps)
                        if (Math.random() < 0.02) { // ~2% chance per frame
                            console.log('🎆 Particle update:', {
                                effectId,
                                aliveCount,
                                totalParticles: particles.length,
                                elapsed: Math.round(elapsed),
                                allDead
                            });
                        }
                        
                        if (allDead) {
                            console.log('🎆 Particle effect complete:', {
                                effectId,
                                totalParticles: particles.length,
                                duration: elapsed
                            });
                            this.removeEffect(effectId);
                            return false;
                        }
                        return true;
                    } catch (error) {
                        console.error('❌ PowerupEffects: Error in particle effect update', error);
                        this.removeEffect(effectId);
                        return false;
                    }
                }
            };

            this.activeEffects.set(effectId, particleEffect);
            console.log('🎆 Particle effect registered:', {
                effectId,
                totalActiveEffects: this.activeEffects.size
            });
            return effectId;
        } catch (error) {
            console.error('❌ PowerupEffects: Error creating particle burst', error);
            return null;
        }
    }

    // Wave effect for powerups
    createWaveEffect(x, y, color = 0x00FFFF, duration = 1000) {
        const effectId = 'wave_' + Date.now();
        
        // Reduce duration on mobile
        const actualDuration = this.isMobile ? Math.min(duration, 600) : duration;
        const maxDuration = this.isMobile ? Math.max(actualDuration, 2000) : Math.max(actualDuration, 3000);
        
        const wave = new PIXI.Graphics();
        this.app.stage.addChild(wave);

        const startTime = Date.now();
        const waveEffect = {
            id: effectId,
            type: 'wave',
            startTime: startTime,
            duration: actualDuration,
            maxDuration: maxDuration, // Use mobile-optimized duration
            wave: wave,
            update: (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / actualDuration, 1);
                
                // Safety timeout - force cleanup if effect runs too long
                if (elapsed > waveEffect.maxDuration) {
                    console.log('⚠️ PowerupEffects: Wave effect timeout, forcing cleanup');
                    this.removeEffect(effectId);
                    return false;
                }
                
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
        try {
            console.log('🧹 Removing effect:', {
                effectId,
                totalActiveEffects: this.activeEffects.size
            });
            
            const effect = this.activeEffects.get(effectId);
            if (effect) {
                console.log('🧹 Effect details:', {
                    effectId,
                    type: effect.type,
                    hasContainer: !!effect.container,
                    hasParticles: !!(effect.particles && effect.particles.length),
                    hasFlash: !!effect.flash,
                    hasWave: !!effect.wave
                });
                
                // Clean up effect-specific resources
                if (effect.type === 'flash' && effect.flash) {
                    try {
                        if (effect.flash.parent) {
                            effect.flash.parent.removeChild(effect.flash);
                            console.log('🧹 Flash effect removed from parent');
                        }
                        effect.flash.destroy();
                        console.log('🧹 Flash effect destroyed');
                    } catch (error) {
                        console.error('❌ PowerupEffects: Error removing flash effect', error);
                    }
                } else if (effect.type === 'particle_burst' && effect.container) {
                    try {
                        console.log('🧹 Cleaning up particle burst:', {
                            effectId,
                            containerChildren: effect.container.children.length,
                            particlesCount: effect.particles ? effect.particles.length : 0
                        });
                        
                        if (effect.container.parent) {
                            effect.container.parent.removeChild(effect.container);
                            console.log('🧹 Particle container removed from parent');
                        }
                        effect.container.destroy();
                        console.log('🧹 Particle container destroyed');
                    } catch (error) {
                        console.error('❌ PowerupEffects: Error removing particle effect', error);
                    }
                } else if (effect.type === 'wave' && effect.wave) {
                    try {
                        if (effect.wave.parent) {
                            effect.wave.parent.removeChild(effect.wave);
                            console.log('🧹 Wave effect removed from parent');
                        }
                        effect.wave.destroy();
                        console.log('🧹 Wave effect destroyed');
                    } catch (error) {
                        console.error('❌ PowerupEffects: Error removing wave effect', error);
                    }
                }
                
                // Restore original positions for screen shake
                if (effect.type === 'screen_shake' && effect.containers) {
                    try {
                        effect.containers.forEach(container => {
                            const originalPos = this.originalPositions.get(container);
                            if (originalPos) {
                                container.x = originalPos.x;
                                container.y = originalPos.y;
                            }
                        });
                        console.log('🧹 Screen shake positions restored');
                    } catch (error) {
                        console.error('❌ PowerupEffects: Error restoring screen shake positions', error);
                    }
                }
                
                this.activeEffects.delete(effectId);
                console.log('🧹 Effect removed from active effects map:', {
                    effectId,
                    remainingActiveEffects: this.activeEffects.size
                });
            } else {
                // Effect not found - this can happen due to race conditions during cleanup
                // Don't warn about it since it's harmless
                console.log('🧹 PowerupEffects: Effect already removed (race condition):', effectId);
            }
        } catch (error) {
            console.error('❌ PowerupEffects: Error in removeEffect', effectId, error);
            // Force remove from map even if cleanup fails
            this.activeEffects.delete(effectId);
        }
    }

    // Remove all effects
    clearAllEffects() {
        console.log('🧹 PowerupEffects: Clearing all effects, count:', this.activeEffects.size);
        
        const effectIds = Array.from(this.activeEffects.keys());
        console.log('🧹 Effect IDs to remove:', effectIds);
        
        effectIds.forEach(id => this.removeEffect(id));
        
        // Additional cleanup: scan stage for any remaining graphics that might be leftover effects
        if (this.app && this.app.stage) {
            const stageChildren = [...this.app.stage.children];
            let cleanedCount = 0;
            
            console.log('🧹 Scanning stage for leftover graphics, total children:', stageChildren.length);
            
            stageChildren.forEach((child, index) => {
                // Look for graphics objects that might be leftover effects
                if (child instanceof PIXI.Graphics) {
                    // Check if this graphics object looks like an effect (small, colored circles or rectangles)
                    const bounds = child.getBounds();
                    const isSmall = bounds.width < 50 && bounds.height < 50;
                    const hasAlpha = child.alpha !== undefined && child.alpha < 1;
                    
                    if (isSmall || hasAlpha) {
                        console.log('🧹 Found leftover graphics:', {
                            index,
                            bounds: { width: bounds.width, height: bounds.height },
                            alpha: child.alpha,
                            isSmall,
                            hasAlpha
                        });
                        
                        if (child.parent) {
                            child.parent.removeChild(child);
                        }
                        child.destroy();
                        cleanedCount++;
                    }
                }
            });
            
            if (cleanedCount > 0) {
                console.log('🧹 PowerupEffects: Cleaned up', cleanedCount, 'additional graphics objects');
            } else {
                console.log('🧹 PowerupEffects: No leftover graphics found');
            }
        }
        
        // Clear original positions map
        this.originalPositions.clear();
        console.log('🧹 PowerupEffects: Clear all effects complete');
    }

    // Update all active effects (call this in game loop)
    update() {
        try {
            const currentTime = Date.now();
            const effectIds = Array.from(this.activeEffects.keys());
            
            // Safety check: if too many effects are active, force cleanup
            if (this.activeEffects.size > 50) {
                console.warn('⚠️ PowerupEffects: Too many active effects (' + this.activeEffects.size + '), forcing cleanup');
                this.clearAllEffects();
                return;
            }
            
            effectIds.forEach(effectId => {
                try {
                    const effect = this.activeEffects.get(effectId);
                    if (effect && effect.update) {
                        const shouldContinue = effect.update(currentTime);
                        if (!shouldContinue) {
                            this.removeEffect(effectId);
                        }
                    }
                } catch (error) {
                    console.error('❌ PowerupEffects: Error updating effect', effectId, error);
                    // Remove the problematic effect
                    this.removeEffect(effectId);
                }
            });
        } catch (error) {
            console.error('❌ PowerupEffects: Critical error in update loop', error);
            // Force cleanup on critical error
            this.forceCleanup();
        }
    }

    // Trigger effect for specific powerup
    triggerPowerupEffect(powerupType, x = null, y = null) {
        console.log('🎆 Triggering powerup effect:', {
            powerupType,
            position: { x, y },
            isMobile: this.isMobile,
            isLowEndMobile: this.isLowEndMobile,
            activeEffects: this.activeEffects.size
        });
        
        // Skip complex effects on low-end mobile devices
        if (this.isLowEndMobile) {
            console.log('📱 PowerupEffects: Skipping complex effect on low-end mobile:', powerupType);
            return;
        }
        
        let effectId = null;
        
        switch (powerupType.toLowerCase()) {
            case 'poesklap':
            case 'extraball':
                // Screen shake for poesklap/extra ball
                this.shakeScreen(8, 400);
                // Add particle burst at ball position
                if (x !== null && y !== null) {
                    const particleCount = this.isMobile ? 8 : 15;
                    effectId = this.createParticleBurst(x, y, 0xFFFF00, particleCount);
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
                    effectId = this.createWaveEffect(x, y, 0x00FF00, 800);
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
                    const particleCount = this.isMobile ? 5 : 10;
                    effectId = this.createParticleBurst(x, y, 0xFFD700, particleCount);
                }
                break;
                
            case 'coin_silver':
                // Silver particle burst
                if (x !== null && y !== null) {
                    const particleCount = this.isMobile ? 4 : 8;
                    effectId = this.createParticleBurst(x, y, 0xC0C0C0, particleCount);
                }
                break;
                
            case 'large_paddle':
            case 'small_paddle':
                // Blue wave effect for paddle powerups
                if (x !== null && y !== null) {
                    effectId = this.createWaveEffect(x, y, 0x0080FF, 600);
                }
                break;
                
            default:
                // Default particle burst for unknown powerups
                if (x !== null && y !== null) {
                    const particleCount = this.isMobile ? 3 : 5;
                    effectId = this.createParticleBurst(x, y, 0xFFFFFF, particleCount);
                }
                break;
        }
        
        console.log('🎆 Powerup effect triggered:', {
            powerupType,
            effectId,
            finalActiveEffects: this.activeEffects.size
        });
    }

    // Force cleanup all effects (for emergency cleanup)
    forceCleanup() {
        console.log('🚨 PowerupEffects: Force cleanup initiated');
        
        // Clear all tracked effects
        this.clearAllEffects();
        
        // Additional aggressive cleanup: remove ALL graphics from stage that look like effects
        if (this.app && this.app.stage) {
            const stageChildren = [...this.app.stage.children];
            let cleanedCount = 0;
            
            console.log('🚨 Force cleanup: scanning', stageChildren.length, 'stage children');
            
            stageChildren.forEach((child, index) => {
                if (child instanceof PIXI.Graphics) {
                    const bounds = child.getBounds();
                    const isSmall = bounds.width < 200 && bounds.height < 200;
                    
                    if (isSmall) {
                        console.log('🚨 Force cleanup: removing graphics', {
                            index,
                            bounds: { width: bounds.width, height: bounds.height }
                        });
                        
                        if (child.parent) {
                            child.parent.removeChild(child);
                        }
                        child.destroy();
                        cleanedCount++;
                    }
                }
            });
            
            if (cleanedCount > 0) {
                console.log('🚨 PowerupEffects: Force cleanup removed', cleanedCount, 'graphics objects');
            } else {
                console.log('🚨 PowerupEffects: Force cleanup - no graphics to remove');
            }
        }
        
        console.log('🚨 PowerupEffects: Force cleanup complete');
    }
} 