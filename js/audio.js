import { POESKLAP_COOLDOWN } from './config.js';
import { ASSETS } from './assets.js';

// Enhanced mobile detection for audio optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isEdge = /Edg/.test(navigator.userAgent);
const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
const isIOSSafari = isIOS && isSafari;

// Additional iOS Safari detection
const isIOSSafariStrict = isIOS && isSafari && !window.navigator.standalone;
const isIOSWebApp = isIOS && window.navigator.standalone;

console.log('🔊 Audio platform detection:', {
    isMobile,
    isIOS,
    isSafari,
    isIOSSafari,
    isIOSSafariStrict,
    isIOSWebApp,
    isEdge,
    userAgent: navigator.userAgent
});

// Audio context and state
let audioContext = null;
let audioEnabled = false;
let lastPoesklapTime = 0;
let userInteracted = false; // Track if user has interacted
let iosAudioUnlocked = false; // Specific flag for iOS audio unlock
let audioHealthCheckInterval = null; // For monitoring audio health
let lastSuccessfulPlay = Date.now(); // Track when audio last worked
let audioFailureCount = 0; // Track consecutive failures

// Web Audio API buffers for iOS Safari
let audioBuffers = {};
let audioContextInitialized = false;

// Mobile-optimized sound playing with throttling and iOS/Edge support
let lastSoundTime = 0;
const SOUND_THROTTLE_MS = isMobile ? 50 : 0; // 50ms throttle on mobile

// Simple iOS Safari audio fallback using a single audio element
let iosSafariAudioElement = null;

function createIOSSafariAudioElement() {
    if (iosSafariAudioElement) return;
    
    iosSafariAudioElement = new Audio();
    iosSafariAudioElement.preload = 'none';
    iosSafariAudioElement.autoplay = false;
    iosSafariAudioElement.playsInline = true;
    iosSafariAudioElement.webkitPlaysinline = true;
    iosSafariAudioElement.setAttribute('webkit-playsinline', 'true');
    iosSafariAudioElement.setAttribute('playsinline', 'true');
    iosSafariAudioElement.setAttribute('x-webkit-airplay', 'allow');
    
    console.log('🔊 Created iOS Safari single audio element');
}

function playSoundWithIOSSafariElement(soundUrl, volume = 0.5) {
    if (!iosSafariAudioElement) {
        createIOSSafariAudioElement();
    }
    
    try {
        iosSafariAudioElement.src = soundUrl;
        iosSafariAudioElement.volume = volume;
        iosSafariAudioElement.currentTime = 0;
        
        const playPromise = iosSafariAudioElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('🔊 iOS Safari single element played successfully');
                lastSuccessfulPlay = Date.now();
                audioFailureCount = 0;
            }).catch(e => {
                console.warn('🔊 iOS Safari single element play failed:', e.message);
                audioFailureCount++;
            });
        }
    } catch (e) {
        console.warn('🔊 iOS Safari single element error:', e.message);
        audioFailureCount++;
    }
}

// iOS-specific audio creation with fallbacks
function createAudioElement(src) {
    const audio = new Audio();
    
    // iOS Safari-specific settings
    if (isIOSSafari) {
        audio.preload = 'none'; // iOS Safari prefers no preload
        audio.autoplay = false;
        audio.playsInline = true;
        audio.webkitPlaysinline = true;
        audio.muted = false;
        audio.controls = false;
        audio.loop = false;
        // iOS Safari specific attributes
        audio.setAttribute('webkit-playsinline', 'true');
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('x-webkit-airplay', 'allow');
        // Additional iOS Safari optimizations for AAC
        audio.setAttribute('webkit-playsinline', 'true');
        audio.setAttribute('preload', 'none');
    } else if (isIOS) {
        // Other iOS browsers
        audio.preload = 'metadata';
        audio.autoplay = false;
        audio.playsInline = true;
        audio.webkitPlaysinline = true;
        audio.muted = false;
    } else if (isEdge) {
        // Edge-specific settings
        audio.preload = 'metadata';
        audio.autoplay = false;
    } else {
        // Standard browser handling
        audio.preload = 'auto';
    }
    
    audio.src = src;
    return audio;
}

// Optimized sound pools for mobile
const hitSoundPool = Array.from({length: isMobile ? 8 : 20}, () => {
    const a = createAudioElement(ASSETS.sounds.hit);
    a.volume = 0.1;
    return a;
});
let hitSoundIndex = 0;

const lifeLossSoundPool = Array.from({length: isMobile ? 2 : 3}, () => {
    const a = createAudioElement(ASSETS.sounds.lifeloss);
    a.volume = 0.3;
    return a;
});
let lifeLossSoundIndex = 0;

const poesklapSoundPool = Array.from({length: isMobile ? 1 : 2}, () => {
    const a = createAudioElement(ASSETS.sounds.poesklap);
    a.volume = 1;
    return a;
});
let poesklapSoundIndex = 0;

const brannasSoundPool = Array.from({length: isMobile ? 1 : 2}, () => {
    const a = createAudioElement(ASSETS.sounds.brannas);
    a.volume = 0.8;
    return a;
});
let brannasSoundIndex = 0;

const glassBreakSoundPool = Array.from({length: isMobile ? 2 : 5}, () => {
    const a = createAudioElement(ASSETS.sounds.brick_glass_break);
    a.volume = 0.4;
    return a;
});
let glassBreakSoundIndex = 0;

const glassDestroyedSoundPool = Array.from({length: isMobile ? 1 : 3}, () => {
    const a = createAudioElement(ASSETS.sounds.brick_glass_destroyed);
    a.volume = 0.5;
    return a;
});
let glassDestroyedSoundIndex = 0;

// Initialize audio system
async function initAudio() {
    console.log('🔊 Initializing audio system...');
    console.log(`🔊 Platform: iOS=${isIOS}, Safari=${isSafari}, iOS Safari=${isIOSSafari}, Edge=${isEdge}, Mobile=${isMobile}`);
    
    // For iOS Safari, use Web Audio API
    if (isIOSSafari) {
        console.log('🔊 iOS Safari detected - using Web Audio API');
        await initializeWebAudioAPI();
    } else {
        // For other browsers, use traditional Audio elements
        console.log('🔊 Using traditional Audio elements');
        // Sound pools are already created above using Array.from
    }
    
    // iOS Safari specific initialization
    if (isIOSSafari) {
        console.log('🔊 iOS Safari detected - setting up special audio handling');
        unlockIOSSafariAudio();
        continuousIOSSafariUnlock();
    }
    
    // Set up user interaction listeners for audio unlock
    const unlockAudio = () => {
        if (!userInteracted) {
            console.log('🔊 User interaction detected - unlocking audio');
            userInteracted = true;
            
            // For iOS Safari, try unlock again
            if (isIOSSafari && !iosAudioUnlocked) {
                unlockIOSSafariAudio();
            }
        }
    };
    
    // Multiple event types for better coverage
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('mousedown', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
    
    // iOS Safari specific events
    if (isIOSSafari) {
        document.addEventListener('gesturestart', unlockAudio, { once: true });
        document.addEventListener('gesturechange', unlockAudio, { once: true });
        document.addEventListener('gestureend', unlockAudio, { once: true });
    }
    
    audioEnabled = true;
    console.log('🔊 Audio system initialized');
    
    // Start audio health monitoring
    startAudioHealthMonitoring();
}

// Toggle audio for mobile users
export function toggleAudio() {
    audioEnabled = !audioEnabled;
    console.log(`🔊 Audio ${audioEnabled ? 'enabled' : 'disabled'}`);
    return audioEnabled;
}

// Get audio status
export function isAudioEnabled() {
    return audioEnabled;
}

// Sound playing functions
export function playHitSound() {
    if (!audioEnabled) return;
    
    if (isIOSSafari) {
        if (audioContextInitialized) {
            playSoundWithWebAudio('hit', 0.1);
        } else {
            playSoundWithIOSSafariElement(ASSETS.sounds.hit, 0.1);
        }
    } else {
        const sound = hitSoundPool[hitSoundIndex];
        playSoundOptimized(sound, 'hit sound');
        hitSoundIndex = (hitSoundIndex + 1) % hitSoundPool.length;
    }
}

export function playLifeLossSound() {
    if (!audioEnabled) return;
    
    if (isIOSSafari) {
        if (audioContextInitialized) {
            playSoundWithWebAudio('lifeloss', 0.3);
        } else {
            playSoundWithIOSSafariElement(ASSETS.sounds.lifeloss, 0.3);
        }
    } else {
        const sound = lifeLossSoundPool[lifeLossSoundIndex];
        playSoundOptimized(sound, 'life loss sound');
        lifeLossSoundIndex = (lifeLossSoundIndex + 1) % lifeLossSoundPool.length;
    }
}

export function playPoesklapSound() {
    if (!audioEnabled) return;
    const now = Date.now();
    if (now - lastPoesklapTime < POESKLAP_COOLDOWN) return;
    
    if (isIOSSafari) {
        if (audioContextInitialized) {
            playSoundWithWebAudio('poesklap', 0.8);
        } else {
            playSoundWithIOSSafariElement(ASSETS.sounds.poesklap, 0.8);
        }
    } else {
        const sound = poesklapSoundPool[poesklapSoundIndex];
        playSoundOptimized(sound, 'poesklap sound');
        poesklapSoundIndex = (poesklapSoundIndex + 1) % poesklapSoundPool.length;
    }
    lastPoesklapTime = now;
}

export function playBrannasSound() {
    if (!audioEnabled) return;
    
    if (isIOSSafari) {
        if (audioContextInitialized) {
            playSoundWithWebAudio('brannas', 0.8);
        } else {
            playSoundWithIOSSafariElement(ASSETS.sounds.brannas, 0.8);
        }
    } else {
        const sound = brannasSoundPool[brannasSoundIndex];
        playSoundOptimized(sound, 'brannas sound');
        brannasSoundIndex = (brannasSoundIndex + 1) % brannasSoundPool.length;
    }
}

export function playGlassBreakSound() {
    if (!audioEnabled) return;
    
    if (isIOSSafari) {
        if (audioContextInitialized) {
            playSoundWithWebAudio('glassBreak', 0.6);
        } else {
            playSoundWithIOSSafariElement(ASSETS.sounds.brick_glass_break, 0.6);
        }
    } else {
        const sound = glassBreakSoundPool[glassBreakSoundIndex];
        playSoundOptimized(sound, 'glass break sound');
        glassBreakSoundIndex = (glassBreakSoundIndex + 1) % glassBreakSoundPool.length;
    }
}

export function playGlassDestroyedSound() {
    if (!audioEnabled) return;
    
    if (isIOSSafari) {
        if (audioContextInitialized) {
            playSoundWithWebAudio('glassDestroyed', 0.7);
        } else {
            playSoundWithIOSSafariElement(ASSETS.sounds.brick_glass_destroyed, 0.7);
        }
    } else {
        const sound = glassDestroyedSoundPool[glassDestroyedSoundIndex];
        playSoundOptimized(sound, 'glass destroyed sound');
        glassDestroyedSoundIndex = (glassDestroyedSoundIndex + 1) % glassDestroyedSoundPool.length;
    }
}

function playSoundOptimized(sound, soundName) {
    if (!audioEnabled) return;
    
    // iOS Safari requires special handling
    if (isIOSSafari && !iosAudioUnlocked) {
        console.log(`🔊 iOS Safari audio not unlocked yet - skipping ${soundName}`);
        audioFailureCount++;
        return;
    }
    
    // Check user interaction for other iOS browsers
    if (isIOS && !userInteracted) {
        console.log(`🔊 iOS audio not unlocked yet - skipping ${soundName}`);
        audioFailureCount++;
        return;
    }
    
    // Throttle sounds on mobile to prevent lag
    const now = Date.now();
    if (isMobile && now - lastSoundTime < SOUND_THROTTLE_MS) {
        return;
    }
    
    try {
        // iOS Safari specific handling
        if (isIOSSafari) {
            // iOS Safari requires fresh audio instance for each play
            const freshAudio = new Audio(sound.src);
            freshAudio.volume = sound.volume;
            freshAudio.playsInline = true;
            freshAudio.webkitPlaysinline = true;
            freshAudio.setAttribute('webkit-playsinline', 'true');
            freshAudio.setAttribute('playsinline', 'true');
            
            freshAudio.play().then(() => {
                console.log(`🔊 iOS Safari played ${soundName} successfully`);
                lastSuccessfulPlay = Date.now();
                audioFailureCount = 0;
            }).catch(e => {
                console.warn(`🔊 iOS Safari audio failed - ${soundName}:`, e.message);
                audioFailureCount++;
                // Try with original sound as fallback
                sound.currentTime = 0;
                sound.play().then(() => {
                    console.log(`🔊 iOS Safari fallback successful - ${soundName}`);
                    lastSuccessfulPlay = Date.now();
                    audioFailureCount = 0;
                }).catch(e2 => {
                    console.warn(`🔊 iOS Safari fallback failed - ${soundName}:`, e2.message);
                    audioFailureCount++;
                });
            });
        } else if (isIOS || isEdge) {
            // Other iOS browsers and Edge
            sound.currentTime = 0;
            sound.volume = sound.volume || 0.5;
            
            if (isIOS) {
                sound.play().then(() => {
                    // Success - audio is playing
                    lastSuccessfulPlay = Date.now();
                    audioFailureCount = 0;
                }).catch(e => {
                    console.warn(`iOS audio warning - ${soundName}:`, e.message);
                    audioFailureCount++;
                    // Try alternative method for iOS
                    setTimeout(() => {
                        sound.play().then(() => {
                            lastSuccessfulPlay = Date.now();
                            audioFailureCount = 0;
                        }).catch(e2 => {
                            console.warn(`iOS audio fallback failed - ${soundName}:`, e2.message);
                            audioFailureCount++;
                        });
                    }, 10);
                });
            } else {
                // Edge and other browsers
                const playPromise = sound.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        lastSuccessfulPlay = Date.now();
                        audioFailureCount = 0;
                    }).catch(e => {
                        console.warn(`Edge audio warning - ${soundName}:`, e.message);
                        audioFailureCount++;
                    });
                }
            }
        } else {
            // Standard browser handling
            sound.currentTime = 0;
            const playPromise = sound.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    lastSuccessfulPlay = Date.now();
                    audioFailureCount = 0;
                }).catch(e => {
                    console.warn(`Failed to play ${soundName}:`, e);
                    audioFailureCount++;
                });
            }
        }
        
        lastSoundTime = now;
    } catch (e) {
        console.warn(`Audio error - ${soundName}:`, e.message);
        audioFailureCount++;
    }
}

// iOS Safari-specific audio unlock function
function unlockIOSSafariAudio() {
    if (!isIOSSafari) return;
    
    console.log('🔊 Attempting iOS Safari audio unlock...');
    
    // Method 1: Create and play a silent audio
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    silentAudio.volume = 0;
    silentAudio.playsInline = true;
    silentAudio.webkitPlaysinline = true;
    
    silentAudio.play().then(() => {
        console.log('🔊 iOS Safari audio unlocked via silent audio');
        iosAudioUnlocked = true;
        userInteracted = true;
    }).catch(e => {
        console.warn('🔊 Silent audio method failed:', e.message);
        
        // Method 2: Try with user gesture
        const unlockWithGesture = () => {
            const testAudio = new Audio();
            testAudio.src = ASSETS.sounds.hit;
            testAudio.volume = 0;
            testAudio.playsInline = true;
            testAudio.webkitPlaysinline = true;
            
            testAudio.play().then(() => {
                console.log('🔊 iOS Safari audio unlocked via gesture');
                iosAudioUnlocked = true;
                userInteracted = true;
            }).catch(e2 => {
                console.warn('🔊 Gesture method failed:', e2.message);
            });
            
            // Remove listeners
            document.removeEventListener('touchstart', unlockWithGesture);
            document.removeEventListener('mousedown', unlockWithGesture);
        };
        
        document.addEventListener('touchstart', unlockWithGesture, { once: true });
        document.addEventListener('mousedown', unlockWithGesture, { once: true });
    });
}

// Manual audio unlock function for game to call
export function forceAudioUnlock() {
    console.log('🔊 Force audio unlock requested');
    
    if (isIOSSafari) {
        unlockIOSSafariAudio();
        continuousIOSSafariUnlock();
    } else {
        userInteracted = true;
    }
    
    // Try to play a test sound
    const testSound = new Audio(ASSETS.sounds.hit);
    testSound.volume = 0;
    testSound.playsInline = true;
    testSound.webkitPlaysinline = true;
    
    testSound.play().then(() => {
        console.log('🔊 Force unlock successful');
        userInteracted = true;
        if (isIOSSafari) {
            iosAudioUnlocked = true;
        }
    }).catch(e => {
        console.warn('🔊 Force unlock failed:', e.message);
    });
}

// Continuous iOS Safari audio unlock attempt
function continuousIOSSafariUnlock() {
    if (!isIOSSafari) return;
    
    console.log('🔊 Starting continuous iOS Safari audio unlock attempts...');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    const attemptUnlock = () => {
        if (attempts >= maxAttempts || iosAudioUnlocked) {
            console.log(`🔊 iOS Safari unlock attempts finished. Success: ${iosAudioUnlocked}, Attempts: ${attempts}`);
            return;
        }
        
        attempts++;
        console.log(`🔊 iOS Safari unlock attempt ${attempts}/${maxAttempts}`);
        
        // Try different methods
        const methods = [
            () => {
                const audio = new Audio();
                audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
                audio.volume = 0;
                audio.playsInline = true;
                audio.webkitPlaysinline = true;
                return audio.play();
            },
            () => {
                const audio = new Audio(ASSETS.sounds.hit);
                audio.volume = 0;
                audio.playsInline = true;
                audio.webkitPlaysinline = true;
                return audio.play();
            },
            () => {
                const audio = new Audio();
                audio.src = ASSETS.sounds.hit;
                audio.volume = 0;
                audio.playsInline = true;
                audio.webkitPlaysinline = true;
                audio.setAttribute('webkit-playsinline', 'true');
                audio.setAttribute('playsinline', 'true');
                return audio.play();
            }
        ];
        
        const method = methods[attempts % methods.length];
        
        method().then(() => {
            console.log(`🔊 iOS Safari unlock successful on attempt ${attempts}`);
            iosAudioUnlocked = true;
            userInteracted = true;
        }).catch(e => {
            console.warn(`🔊 iOS Safari unlock attempt ${attempts} failed:`, e.message);
            // Try again after a delay
            setTimeout(attemptUnlock, 500);
        });
    };
    
    // Start the first attempt
    attemptUnlock();
}

// Audio health monitoring and recovery
function startAudioHealthMonitoring() {
    if (audioHealthCheckInterval) {
        clearInterval(audioHealthCheckInterval);
    }
    
    audioHealthCheckInterval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastPlay = now - lastSuccessfulPlay;
        
        // If no successful play in 60 seconds (increased from 30), try to recover
        if (timeSinceLastPlay > 60000 && audioEnabled) {
            console.log('🔊 Audio health check: No successful play detected, attempting recovery...');
            attemptAudioRecovery();
        }
        
        // If too many consecutive failures, force unlock and refresh pools
        if (audioFailureCount > 10) { // Increased from 5
            console.log('🔊 Audio health check: Too many failures, forcing audio unlock and refreshing pools...');
            forceAudioUnlock();
            refreshSoundPools();
            audioFailureCount = 0;
        }
        
        // Periodic sound pool refresh for iOS Safari (every 5 minutes instead of 2)
        if (isIOSSafari && now % 300000 < 10000) { // Every ~5 minutes
            console.log('🔊 Audio health check: Periodic sound pool refresh for iOS Safari...');
            refreshSoundPools();
        }
    }, 30000); // Check every 30 seconds instead of 10
}

function attemptAudioRecovery() {
    console.log('🔊 Attempting audio recovery...');
    
    if (isIOSSafari) {
        // iOS Safari specific recovery
        const testAudio = new Audio();
        testAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
        testAudio.volume = 0;
        testAudio.playsInline = true;
        testAudio.webkitPlaysinline = true;
        
        testAudio.play().then(() => {
            console.log('🔊 Audio recovery successful');
            lastSuccessfulPlay = Date.now();
            audioFailureCount = 0;
        }).catch(e => {
            console.warn('🔊 Audio recovery failed:', e.message);
            audioFailureCount++;
            // Try more aggressive recovery
            unlockIOSSafariAudio();
        });
    } else {
        // Other browsers - just reset failure count
        audioFailureCount = 0;
    }
}

// Refresh sound pools to prevent staleness
function refreshSoundPools() {
    console.log('🔊 Refreshing sound pools...');
    
    // Refresh hit sound pool
    hitSoundPool.forEach((sound, index) => {
        const newSound = createAudioElement(ASSETS.sounds.hit);
        newSound.volume = 0.1;
        hitSoundPool[index] = newSound;
    });
    
    // Refresh life loss sound pool
    lifeLossSoundPool.forEach((sound, index) => {
        const newSound = createAudioElement(ASSETS.sounds.lifeloss);
        newSound.volume = 0.3;
        lifeLossSoundPool[index] = newSound;
    });
    
    // Refresh poesklap sound pool
    poesklapSoundPool.forEach((sound, index) => {
        const newSound = createAudioElement(ASSETS.sounds.poesklap);
        newSound.volume = 0.8;
        poesklapSoundPool[index] = newSound;
    });
    
    // Refresh brannas sound pool
    brannasSoundPool.forEach((sound, index) => {
        const newSound = createAudioElement(ASSETS.sounds.brannas);
        newSound.volume = 0.8;
        brannasSoundPool[index] = newSound;
    });
    
    // Refresh glass break sound pool
    glassBreakSoundPool.forEach((sound, index) => {
        const newSound = createAudioElement(ASSETS.sounds.brick_glass_break);
        newSound.volume = 0.6;
        glassBreakSoundPool[index] = newSound;
    });
    
    // Refresh glass destroyed sound pool
    glassDestroyedSoundPool.forEach((sound, index) => {
        const newSound = createAudioElement(ASSETS.sounds.brick_glass_destroyed);
        newSound.volume = 0.7;
        glassDestroyedSoundPool[index] = newSound;
    });
    
    console.log('🔊 Sound pools refreshed');
}

// Cleanup function to stop health monitoring
export function cleanupAudio() {
    if (audioHealthCheckInterval) {
        clearInterval(audioHealthCheckInterval);
        audioHealthCheckInterval = null;
    }
    console.log('🔊 Audio cleanup completed');
}

// Export the initialization function
export async function initializeAudio() {
    await initAudio();
}

// Initialize Web Audio API for iOS Safari
async function initializeWebAudioAPI() {
    if (audioContextInitialized) return;
    
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Load audio buffers
        await loadAudioBuffers();
        
        audioContextInitialized = true;
        console.log('🔊 Web Audio API initialized successfully');
    } catch (e) {
        console.warn('🔊 Web Audio API initialization failed:', e.message);
    }
}

// Load audio files as buffers
async function loadAudioBuffers() {
    const soundFiles = [
        { name: 'hit', url: ASSETS.sounds.hit },
        { name: 'lifeloss', url: ASSETS.sounds.lifeloss },
        { name: 'poesklap', url: ASSETS.sounds.poesklap },
        { name: 'brannas', url: ASSETS.sounds.brannas },
        { name: 'glassBreak', url: ASSETS.sounds.brick_glass_break },
        { name: 'glassDestroyed', url: ASSETS.sounds.brick_glass_destroyed },
        { name: 'gameOver', url: ASSETS.sounds.gameOver1 }
    ];
    
    for (const sound of soundFiles) {
        try {
            const response = await fetch(sound.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBuffers[sound.name] = audioBuffer;
            console.log(`🔊 Loaded audio buffer: ${sound.name}`);
        } catch (e) {
            console.warn(`🔊 Failed to load audio buffer: ${sound.name}`, e.message);
        }
    }
}

// Play sound using Web Audio API
function playSoundWithWebAudio(soundName, volume = 0.5) {
    if (!audioContext || !audioBuffers[soundName]) {
        console.warn(`🔊 Web Audio not available for: ${soundName}`);
        return false;
    }
    
    try {
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Create buffer source
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        source.buffer = audioBuffers[soundName];
        gainNode.gain.value = volume;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play the sound
        source.start(0);
        
        console.log(`🔊 Web Audio played: ${soundName}`);
        lastSuccessfulPlay = Date.now();
        audioFailureCount = 0;
        return true;
    } catch (e) {
        console.warn(`🔊 Web Audio play failed: ${soundName}`, e.message);
        audioFailureCount++;
        return false;
    }
} 