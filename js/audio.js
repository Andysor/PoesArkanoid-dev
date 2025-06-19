import { POESKLAP_COOLDOWN } from './config.js';
import { ASSETS } from './assets.js';
import { POWERUP_BEHAVIOR_CONFIG, GAME_SOUNDS_CONFIG, getPowerUpConfig } from './powerupConfig.js';

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

// Dynamic sound pools based on powerup configuration
const soundPools = {};
const soundPoolIndices = {};

// Initialize sound pools from powerup configuration
function initializePowerUpSoundPools() {
    console.log('🔊 Initializing powerup sound pools from configuration...');
    console.log('🔊 POWERUP_BEHAVIOR_CONFIG keys:', Object.keys(POWERUP_BEHAVIOR_CONFIG));
    console.log('🔊 GAME_SOUNDS_CONFIG keys:', Object.keys(GAME_SOUNDS_CONFIG));
    console.log('🔊 Initial soundPools state:', Object.keys(soundPools));
    
    // Initialize powerup sounds
    Object.entries(POWERUP_BEHAVIOR_CONFIG).forEach(([powerupType, config]) => {
        console.log(`🔊 Processing powerup: ${powerupType}`, {
            playSound: config.playSound,
            sound: config.sound,
            hasSound: !!config.sound && config.sound !== null
        });
        
        if (config.playSound && config.sound && config.sound !== null) {
            createSoundPool(config.sound, 0.5); // Default volume for powerups
        } else if (config.playSound && (!config.sound || config.sound === null)) {
            console.log(`🔊 Skipping sound pool for ${powerupType} - no sound configured`);
        } else if (!config.playSound) {
            console.log(`🔊 Skipping sound pool for ${powerupType} - sound disabled`);
        }
    });
    
    // Initialize game sounds
    Object.entries(GAME_SOUNDS_CONFIG).forEach(([soundType, config]) => {
        console.log(`🔊 Processing game sound: ${soundType}`, {
            playSound: config.playSound,
            sound: config.sound,
            volume: config.volume,
            poolSize: config.poolSize
        });
        
        if (config.playSound && config.sound) {
            createSoundPool(config.sound, config.volume, config.poolSize);
        }
    });
    
    console.log('🔊 Final sound pools created:', Object.keys(soundPools));
    console.log('🔊 Sound pool indices:', soundPoolIndices);
}

// Helper function to create a sound pool
function createSoundPool(soundName, volume, poolSizeType = 'mobile') {
    // Check if the sound exists in ASSETS
    if (!ASSETS.sounds[soundName]) {
        console.warn(`🔊 Sound not found in ASSETS: ${soundName}`);
        console.warn(`🔊 Available sounds in ASSETS:`, Object.keys(ASSETS.sounds));
        return false;
    }
    
    const poolSize = poolSizeType === 'mobile' ? (isMobile ? 2 : 4) : (isMobile ? 4 : 8);
    
    console.log(`🔊 Creating sound pool for ${soundName} with ${poolSize} instances at volume ${volume}`);
    
    soundPools[soundName] = Array.from({length: poolSize}, () => {
        const audio = createAudioElement(ASSETS.sounds[soundName]);
        audio.volume = volume;
        return audio;
    });
    
    soundPoolIndices[soundName] = 0;
    
    console.log(`🔊 Successfully created sound pool for ${soundName} (${poolSize} instances, volume: ${volume})`);
    return true;
}

// Get volume for a sound type
function getSoundVolume(soundType) {
    const volumeMap = {
        'hit': 0.1,
        'lifeloss': 0.3,
        'poesklap': 0.8,
        'brannas': 0.8,
        'brick_glass_break': 0.4,
        'brick_glass_destroyed': 0.5,
        'extra_life': 0.6,
        'gameOver1': 0.7
    };
    return volumeMap[soundType] || 0.5;
}

// Play powerup sound based on configuration
export function playPowerUpSound(powerupType) {
    console.log(`🔊 playPowerUpSound called with: "${powerupType}"`);
    
    const config = getPowerUpConfig(powerupType);
    console.log(`🔊 Powerup config result:`, config);
    
    if (!config) {
        console.log(`🔊 No config found for powerup: ${powerupType}`);
        return;
    }
    
    if (!config.playSound) {
        console.log(`🔊 Sound disabled for powerup: ${powerupType}`);
        return;
    }
    
    if (!config.sound || config.sound === null) {
        console.log(`🔊 No sound configured for powerup: ${powerupType}`);
        return;
    }
    
    console.log(`🔊 Playing powerup sound: ${config.sound} for ${powerupType}`);
    playSoundByName(config.sound);
}

// Generic sound playing function
export function playSoundByName(soundName) {
    console.log(`🔊 playSoundByName called with: "${soundName}"`);
    console.log(`🔊 Audio state check:`, {
        audioEnabled,
        userInteracted,
        isMobile,
        isIOSSafari,
        audioContextInitialized,
        soundPoolsAvailable: Object.keys(soundPools),
        requestedSoundPool: soundPools[soundName] ? `found (${soundPools[soundName].length} instances)` : 'not found'
    });
    
    if (!audioEnabled) {
        console.log(`🔊 Audio disabled, skipping sound: ${soundName}`);
        return;
    }
    
    console.log(`🔊 Platform detection:`, {
        isIOSSafari,
        audioContextInitialized,
        hasAudioContext: !!audioContext,
        audioContextState: audioContext?.state
    });
    
    // Use Web Audio API for iOS Safari
    if (isIOSSafari && audioContextInitialized) {
        console.log(`🔊 Using Web Audio API for: ${soundName}`);
        const volume = getSoundVolume(soundName);
        console.log(`🔊 Web Audio volume: ${volume}`);
        const result = playSoundWithWebAudio(soundName, volume);
        console.log(`🔊 Web Audio result: ${result ? 'success' : 'failed'}`);
    } else if (isIOSSafari) {
        // iOS Safari fallback
        console.log(`🔊 Using iOS Safari fallback for: ${soundName}`);
        const volume = getSoundVolume(soundName);
        console.log(`🔊 iOS Safari fallback volume: ${volume}`);
        console.log(`🔊 iOS Safari fallback URL: ${ASSETS.sounds[soundName]}`);
        playSoundWithIOSSafariElement(ASSETS.sounds[soundName], volume);
    } else {
        // Traditional audio elements - let playSoundOptimized handle throttling
        console.log(`🔊 Using traditional audio elements for: ${soundName}`);
        const pool = soundPools[soundName];
        console.log(`🔊 Sound pool details:`, {
            poolExists: !!pool,
            poolLength: pool?.length || 0,
            currentIndex: soundPoolIndices[soundName] || 0,
            availablePools: Object.keys(soundPools)
        });
        
        if (pool && pool.length > 0) {
            const currentIndex = soundPoolIndices[soundName];
            const sound = pool[currentIndex];
            console.log(`🔊 Playing sound from pool: ${soundName} (index: ${currentIndex}/${pool.length})`);
            console.log(`🔊 Sound element details:`, {
                hasSound: !!sound,
                soundType: sound?.constructor?.name,
                soundSrc: sound?.src,
                soundVolume: sound?.volume,
                soundReadyState: sound?.readyState
            });
            
            // Let playSoundOptimized handle throttling like the original functions
            playSoundOptimized(sound, `${soundName} sound`);
            soundPoolIndices[soundName] = (currentIndex + 1) % pool.length;
            console.log(`🔊 Updated pool index to: ${soundPoolIndices[soundName]}`);
        } else {
            console.warn(`🔊 No sound pool found for: ${soundName}`);
            console.warn(`🔊 Available sound pools:`, Object.keys(soundPools));
            console.warn(`🔊 This might mean the sound pool wasn't created during initialization`);
            console.warn(`🔊 Check if ${soundName} is defined in GAME_SOUNDS_CONFIG`);
        }
    }
    
    console.log(`🔊 playSoundByName completed for: ${soundName}`);
}

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

// Initialize audio system
async function initAudio() {
    console.log('🔊 Initializing audio system...');
    console.log(`🔊 Platform: iOS=${isIOS}, Safari=${isSafari}, iOS Safari=${isIOSSafari}, Edge=${isEdge}, Mobile=${isMobile}`);
    
    // Initialize powerup sound pools from configuration
    initializePowerUpSoundPools();
    
    // For iOS Safari, use Web Audio API
    if (isIOSSafari) {
        console.log('🔊 iOS Safari detected - using Web Audio API');
        await initializeWebAudioAPI();
    } else {
        // For other browsers, use traditional Audio elements
        console.log('🔊 Using traditional Audio elements');
        // Sound pools are created dynamically by initializePowerUpSoundPools()
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
    
    // Refresh dynamic powerup sound pools
    Object.entries(soundPools).forEach(([soundName, pool]) => {
        pool.forEach((sound, index) => {
            const newSound = createAudioElement(ASSETS.sounds[soundName]);
            newSound.volume = getSoundVolume(soundName);
            pool[index] = newSound;
        });
    });
    
    console.log('🔊 Sound pools refreshed (dynamic powerup pools)');
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
    // Load all sounds from GAME_SOUNDS_CONFIG dynamically
    const soundFiles = Object.entries(GAME_SOUNDS_CONFIG).map(([soundType, config]) => ({
        name: config.sound,
        url: ASSETS.sounds[config.sound]
    }));
    
    // Also load any sounds that might not be in GAME_SOUNDS_CONFIG but are in ASSETS
    const assetSounds = Object.entries(ASSETS.sounds).filter(([soundName, url]) => {
        // Only include sounds that aren't already being loaded
        return !soundFiles.some(sf => sf.name === soundName);
    }).map(([soundName, url]) => ({
        name: soundName,
        url: url
    }));
    
    const allSoundFiles = [...soundFiles, ...assetSounds];
    
    console.log(`🔊 Loading ${allSoundFiles.length} audio buffers for Web Audio API...`);
    
    for (const sound of allSoundFiles) {
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
    
    console.log(`🔊 Web Audio buffers loaded:`, Object.keys(audioBuffers));
}

// Play sound using Web Audio API
function playSoundWithWebAudio(soundName, volume = 0.5) {
    // Use the sound name directly - no more hardcoded mapping
    const bufferName = soundName;
    
    if (!audioContext || !audioBuffers[bufferName]) {
        console.warn(`🔊 Web Audio not available for: ${soundName} (buffer: ${bufferName})`);
        console.warn(`🔊 Available Web Audio buffers:`, Object.keys(audioBuffers));
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
        
        source.buffer = audioBuffers[bufferName];
        gainNode.gain.value = volume;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play the sound
        source.start(0);
        
        console.log(`🔊 Web Audio played: ${soundName} (buffer: ${bufferName})`);
        lastSuccessfulPlay = Date.now();
        audioFailureCount = 0;
        return true;
    } catch (e) {
        console.warn(`🔊 Web Audio play failed: ${soundName}`, e.message);
        audioFailureCount++;
        return false;
    }
}

// Dynamic function to add new powerup sounds
export function addPowerUpSound(powerupType, soundName, volume = 0.5) {
    console.log(`🔊 Adding new powerup sound: ${powerupType} -> ${soundName} (volume: ${volume})`);
    
    // Check if the sound exists in ASSETS
    if (!ASSETS.sounds[soundName]) {
        console.warn(`🔊 Sound not found in ASSETS: ${soundName}`);
        return false;
    }
    
    const poolSize = isMobile ? 2 : 4;
    
    // Create traditional audio pool
    soundPools[soundName] = Array.from({length: poolSize}, () => {
        const audio = createAudioElement(ASSETS.sounds[soundName]);
        audio.volume = volume;
        return audio;
    });
    
    soundPoolIndices[soundName] = 0;
    
    // Also load Web Audio API buffer if available
    if (audioContext && audioContextInitialized) {
        loadAudioBufferForSound(soundName);
    }
    
    console.log(`🔊 Successfully added sound pool for ${soundName} (${poolSize} instances)`);
    return true;
}

// Load audio buffer for Web Audio API
async function loadAudioBufferForSound(soundName) {
    if (!audioContext || !ASSETS.sounds[soundName]) {
        return false;
    }
    
    try {
        const response = await fetch(ASSETS.sounds[soundName]);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers[soundName] = audioBuffer;
        console.log(`🔊 Loaded Web Audio buffer for: ${soundName}`);
        return true;
    } catch (e) {
        console.warn(`🔊 Failed to load Web Audio buffer for: ${soundName}`, e.message);
        return false;
    }
}

// Function to remove a powerup sound
export function removePowerUpSound(soundName) {
    if (soundPools[soundName]) {
        delete soundPools[soundName];
        delete soundPoolIndices[soundName];
        console.log(`🔊 Removed sound pool for: ${soundName}`);
        return true;
    }
    return false;
}

// Function to list all available powerup sounds
export function listPowerUpSounds() {
    return {
        soundPools: Object.keys(soundPools),
        soundPoolIndices: soundPoolIndices,
        totalPools: Object.keys(soundPools).length
    };
}

// Export function to dynamically load Web Audio buffer
export async function loadWebAudioBuffer(soundName) {
    if (!audioContextInitialized) {
        console.warn(`🔊 Web Audio API not initialized, cannot load buffer for: ${soundName}`);
        return false;
    }
    
    return await loadAudioBufferForSound(soundName);
}

// Export function to get available Web Audio buffers
export function getAvailableWebAudioBuffers() {
    return Object.keys(audioBuffers);
} 