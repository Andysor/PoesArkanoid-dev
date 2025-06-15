import { POESKLAP_COOLDOWN } from './config.js';

// Audio context and state
let audioContext = null;
let audioEnabled = false;
let lastPoesklapTime = 0;

// Sound pools
const hitSoundPool = Array.from({length: 20}, () => {
    const a = new Audio();
    a.volume = 0.1;
    return a;
});
let hitSoundIndex = 0;

const lifeLossSoundPool = Array.from({length: 3}, () => {
    const a = new Audio();
    a.volume = 0.3;
    return a;
});
let lifeLossSoundIndex = 0;

const poesklapSoundPool = Array.from({length: 2}, () => {
    const a = new Audio();
    a.volume = 0.8;
    return a;
});
let poesklapSoundIndex = 0;

const brannasSoundPool = Array.from({length: 2}, () => {
    const a = new Audio();
    a.volume = 0.8;
    return a;
});
let brannasSoundIndex = 0;

// Initialize audio system
export function initializeAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioEnabled = true;
        
        // Preload sounds
        hitSoundPool.forEach(sound => {
            sound.src = './assets/sounds/hit.mp3';
            sound.load();
        });
        
        lifeLossSoundPool.forEach(sound => {
            sound.src = './assets/sounds/lifeloss.mp3';
            sound.load();
        });
        
        poesklapSoundPool.forEach(sound => {
            sound.src = './assets/sounds/poesklap.mp3';
            sound.load();
        });
        
        brannasSoundPool.forEach(sound => {
            sound.src = './assets/sounds/brannas.mp3';
            sound.load();
        });
    } catch (e) {
        console.error('Audio initialization failed:', e);
        audioEnabled = false;
    }
}

// Sound playing functions
export function playHitSound() {
    if (!audioEnabled) return;
    const sound = hitSoundPool[hitSoundIndex];
    sound.currentTime = 0;
    sound.play().catch(e => console.warn('Failed to play hit sound:', e));
    hitSoundIndex = (hitSoundIndex + 1) % hitSoundPool.length;
}

export function playLifeLossSound() {
    if (!audioEnabled) return;
    const sound = lifeLossSoundPool[lifeLossSoundIndex];
    sound.currentTime = 0;
    sound.play().catch(e => console.warn('Failed to play life loss sound:', e));
    lifeLossSoundIndex = (lifeLossSoundIndex + 1) % lifeLossSoundPool.length;
}

export function playPoesklapSound() {
    if (!audioEnabled) return;
    const now = Date.now();
    if (now - lastPoesklapTime < POESKLAP_COOLDOWN) return;
    
    const sound = poesklapSoundPool[poesklapSoundIndex];
    sound.currentTime = 0;
    sound.play().catch(e => console.warn('Failed to play poesklap sound:', e));
    poesklapSoundIndex = (poesklapSoundIndex + 1) % poesklapSoundPool.length;
    lastPoesklapTime = now;
}

export function playBrannasSound() {
    if (!audioEnabled) return;
    const sound = brannasSoundPool[brannasSoundIndex];
    sound.currentTime = 0;
    sound.play().catch(e => console.warn('Failed to play brannas sound:', e));
    brannasSoundIndex = (brannasSoundIndex + 1) % brannasSoundPool.length;
} 