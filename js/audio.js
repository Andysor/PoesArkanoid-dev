import { POESKLAP_COOLDOWN } from './config.js';
import { ASSETS } from './assets.js';

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

const glassBreakSoundPool = Array.from({length: 5}, () => {
    const a = new Audio();
    a.volume = 0.6;
    return a;
});
let glassBreakSoundIndex = 0;

const glassDestroyedSoundPool = Array.from({length: 3}, () => {
    const a = new Audio();
    a.volume = 0.7;
    return a;
});
let glassDestroyedSoundIndex = 0;

// Initialize audio system
export function initializeAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Expose audio context globally for mobile unlock
        window.audioContext = audioContext;
        audioEnabled = true;
        
        // Preload sounds
        hitSoundPool.forEach(sound => {
            sound.src = ASSETS.sounds.hit;
            sound.load();
        });
        
        lifeLossSoundPool.forEach(sound => {
            sound.src = ASSETS.sounds.lifeLoss;
            sound.load();
        });
        
        poesklapSoundPool.forEach(sound => {
            sound.src = ASSETS.sounds.poesKlap;
            sound.load();
        });
        
        brannasSoundPool.forEach(sound => {
            sound.src = ASSETS.sounds.brannas;
            sound.load();
        });
        
        glassBreakSoundPool.forEach(sound => {
            sound.src = ASSETS.sounds.brick_glass_break;
            sound.load();
        });
        
        glassDestroyedSoundPool.forEach(sound => {
            sound.src = ASSETS.sounds.brick_glass_destroyed;
            sound.load();
        });
        
        console.log('🔊 Audio system initialized successfully');
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

export function playGlassBreakSound() {
    if (!audioEnabled) return;
    const sound = glassBreakSoundPool[glassBreakSoundIndex];
    sound.currentTime = 0;
    sound.play().catch(e => console.warn('Failed to play glass break sound:', e));
    glassBreakSoundIndex = (glassBreakSoundIndex + 1) % glassBreakSoundPool.length;
}

export function playGlassDestroyedSound() {
    if (!audioEnabled) return;
    const sound = glassDestroyedSoundPool[glassDestroyedSoundIndex];
    sound.currentTime = 0;
    sound.play().catch(e => console.warn('Failed to play glass destroyed sound:', e));
    glassDestroyedSoundIndex = (glassDestroyedSoundIndex + 1) % glassDestroyedSoundPool.length;
} 