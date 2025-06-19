import { POESKLAP_COOLDOWN } from './config.js';
import { ASSETS } from './assets.js';
import { POWERUP_BEHAVIOR_CONFIG, GAME_SOUNDS_CONFIG, getPowerUpConfig } from './powerupConfig.js';

// Simple mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Audio context and state
let audioContext = null;
let audioEnabled = false;
let lastPoesklapTime = 0;
let userInteracted = false;
let audioBuffers = {};
let audioContextInitialized = false;

// Sound pools for traditional fallback
const soundPools = {};
const soundPoolIndices = {};

// Initialize sound pools from powerup configuration
function initializePowerUpSoundPools() {
    // Initialize powerup sounds
    Object.entries(POWERUP_BEHAVIOR_CONFIG).forEach(([powerupType, config]) => {
        if (config.playSound && config.sound && config.sound !== null) {
            createSoundPool(config.sound, 0.5);
        }
    });
    
    // Initialize game sounds
    Object.entries(GAME_SOUNDS_CONFIG).forEach(([soundType, config]) => {
        if (config.playSound && config.sound) {
            createSoundPool(config.sound, config.volume, config.poolSize);
        }
    });
}

// Helper function to create a sound pool
function createSoundPool(soundName, volume, poolSizeType = 'mobile') {
    if (!ASSETS.sounds[soundName]) {
        return false;
    }
    
    const poolSize = poolSizeType === 'mobile' ? (isMobile ? 2 : 4) : (isMobile ? 4 : 8);
    
    soundPools[soundName] = Array.from({length: poolSize}, () => {
        const audio = new Audio(ASSETS.sounds[soundName]);
        audio.volume = volume;
        return audio;
    });
    
    soundPoolIndices[soundName] = 0;
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
    const config = getPowerUpConfig(powerupType);
    
    if (!config || !config.playSound || !config.sound || config.sound === null) {
        return;
    }
    
    playSoundByName(config.sound);
}

// Generic sound playing function
export function playSoundByName(soundName) {
    if (!audioEnabled) {
        return;
    }
    
    // Try Web Audio API first
    if (audioContextInitialized && audioContext && audioBuffers[soundName]) {
        const volume = getSoundVolume(soundName);
        const result = playSoundWithWebAudio(soundName, volume);
        if (result) return;
    }
    
    // Fallback to traditional audio elements
    const pool = soundPools[soundName];
    
    if (pool && pool.length > 0) {
        const currentIndex = soundPoolIndices[soundName];
        const sound = pool[currentIndex];
        
        sound.currentTime = 0;
        const playPromise = sound.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                // Silent fail
            });
        }
        
        soundPoolIndices[soundName] = (currentIndex + 1) % pool.length;
    }
}

// Initialize audio system
async function initAudio() {
    // Set up user interaction listeners for audio unlock
    const unlockAudio = async () => {
        if (!userInteracted) {
            userInteracted = true;
            
            // Initialize audio after user interaction
            initializePowerUpSoundPools();
            
            // Try to initialize Web Audio API
            try {
                await initializeWebAudioAPI();
            } catch (e) {
                // Fallback to traditional audio elements
            }
            
            audioEnabled = true;
        }
    };
    
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('mousedown', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
}

// Toggle audio for mobile users
export function toggleAudio() {
    audioEnabled = !audioEnabled;
    return audioEnabled;
}

// Get audio status
export function isAudioEnabled() {
    return audioEnabled;
}

// Initialize Web Audio API
async function initializeWebAudioAPI() {
    if (audioContextInitialized) return;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        await loadAudioBuffers();
        audioContextInitialized = true;
    } catch (e) {
        // Silent fail
    }
}

// Load audio files as buffers
async function loadAudioBuffers() {
    const soundFiles = Object.entries(GAME_SOUNDS_CONFIG).map(([soundType, config]) => ({
        name: config.sound,
        url: ASSETS.sounds[config.sound]
    }));
    
    const assetSounds = Object.entries(ASSETS.sounds).filter(([soundName, url]) => {
        return !soundFiles.some(sf => sf.name === soundName);
    }).map(([soundName, url]) => ({
        name: soundName,
        url: url
    }));
    
    const allSoundFiles = [...soundFiles, ...assetSounds];
    
    for (const sound of allSoundFiles) {
        try {
            const response = await fetch(sound.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBuffers[sound.name] = audioBuffer;
        } catch (e) {
            // Silent fail
        }
    }
}

// Play sound using Web Audio API
function playSoundWithWebAudio(soundName, volume = 0.5) {
    if (!audioContext || !audioBuffers[soundName]) {
        return false;
    }
    
    try {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        source.buffer = audioBuffers[soundName];
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        source.start(0);
        return true;
    } catch (e) {
        return false;
    }
}

// Export the initialization function
export async function initializeAudio() {
    await initAudio();
}

// Force audio unlock function for game to call
export function forceAudioUnlock() {
    userInteracted = true;
    
    // Initialize audio if not already done
    if (!audioEnabled) {
        initializePowerUpSoundPools();
        initializeWebAudioAPI().then(() => {
            audioEnabled = true;
        }).catch(() => {
            audioEnabled = true;
        });
    }
    
    // Try to resume audio context if suspended
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Test function to play sound at maximum volume
export function testAudioAtMaxVolume(soundName = 'poesklap') {
    if (!audioEnabled) {
        return;
    }
    
    // Try Web Audio API with max volume
    if (audioContextInitialized && audioContext && audioBuffers[soundName]) {
        try {
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            
            source.buffer = audioBuffers[soundName];
            gainNode.gain.value = 1.0; // Maximum volume
            
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            source.start(0);
            
            // Check if audio is actually playing after a short delay
            setTimeout(() => {
                checkAudioPlayback();
            }, 100);
            
        } catch (e) {
            // Silent fail
        }
    }
}

// Function to check if audio is actually playing
function checkAudioPlayback() {
    if (audioContext && audioContext.state === 'running') {
        // Show a message to the user if they're on iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            const notice = document.getElementById('ios-audio-notice');
            if (notice) {
                notice.innerHTML = `
                    <strong>🔊 Audio is Working!</strong><br>
                    If you can't hear sounds, turn off silent mode on your iPhone
                    <button onclick="this.parentElement.style.display='none'" style="background: white; color: #ff6b6b; border: none; padding: 5px 10px; border-radius: 4px; margin-top: 10px; font-weight: bold;">Got it</button>
                `;
                notice.style.display = 'block';
            }
        }
    }
} 