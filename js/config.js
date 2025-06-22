// Game version
export const GAME_VERSION = '0.1.0';

// Debug mode flag - set to true to enable debug logging and features
export const DEBUG_MODE = false;

// Test mode flag
export const TEST_MODE = false;

// Level layout settings
export const BRICK_AREA_WIDTH_PERCENT = 0.95; // 95% of screen width (reduced from 90% to minimize edge gaps)
export const BRICK_AREA_TOP_PERCENT = 0.05; // 5% from top of screen

// Ball settings - now in percentage of screen width per second
export const BASE_INITIAL_SPEED_PERCENT = 0.8; // 80% of screen width per second
export const BASE_MAX_SPEED_PERCENT = 2; // 200% of screen width per second
export const LEVEL_SPEED_INCREASE = 0.1; // 20% increase per level
export const BALL_RADIUS = window.innerWidth * 0.02; // 1% of screen width

// Function to convert percentage speed to actual pixels per frame
export function getScreenRelativeSpeed(percentSpeed, app) {
    const screenWidth = app.screen.width;
    const targetPixelsPerSecond = screenWidth * percentSpeed;
    const targetPixelsPerFrame = targetPixelsPerSecond / 60; // Assuming 60 FPS
    return targetPixelsPerFrame;
}

// Legacy speed constants for backward compatibility (will be converted)
export const BASE_INITIAL_SPEED = 8;
export const BASE_MAX_SPEED = 24;
export const COMPONENT_SPEED = BASE_INITIAL_SPEED / Math.sqrt(2);

// Paddle settings
export const PADDLE_WIDTH = window.innerWidth * 0.2; // 20% of screen width
export const PADDLE_HEIGHT = window.innerHeight * 0.05; // 5% of screen height
export const PADDLE_SPEED = 7;

// Brick settings
export const BRICK_WIDTH = window.innerWidth * 0.05; // 5% of screen width
export const BRICK_HEIGHT = window.innerHeight * 0.02; // 2% of screen height
export const BRICK_PADDING = window.innerWidth * 0.01; // 1% of screen width

// Power-up settings
export const POWER_UP_CHANCE = 0.2;
export const POWER_UP_DURATION = 10000; // 10 seconds
export const POWER_UP_FALLING_SPEED = 6; // 🎯 POWERUP FALLING SPEED - Increase for faster, decrease for slower

// Game settings
export const MAX_LEVEL = 100;
export const INITIAL_LIVES = 3;
export const POINTS_PER_BRICK = 10;

// Speed-related constants
export const SPEED_INCREASE_INTERVAL = 10000; // Every 10 seconds
export const SPEED_INCREASE_FACTOR = 1.1; // 10% increase

// Paddle constants
export const PADDLE_BOTTOM_MARGIN = 100; // Distance from bottom of screen to paddle
export const PADDLE_HOVER_OFFSET = 0.1; // Screen height from touch point to paddle center

// Audio constants
export const POESKLAP_COOLDOWN = 500; // milliseconds between poesklap sounds 

// Brick sound settings
export const BRICK_SOUND_CONFIG = {
    ENABLE_NORMAL_BRICK_SOUNDS: true, // Set to false to disable normal brick hit sounds
    NORMAL_BRICK_SOUND_VOLUME: 0.3,   // Volume for normal brick hit sounds (0.0 to 1.0)
};

// Level completion time bonus settings
export const TIME_BONUS_CONFIG = {
    // Time thresholds (in seconds)
    EXCELLENT_THRESHOLD: 30,    // Under 30 seconds = excellent
    GOOD_THRESHOLD: 60,         // Under 60 seconds = good
    DECENT_THRESHOLD: 120,      // Under 120 seconds = decent
    
    // Bonus points for each tier
    EXCELLENT_BASE_BONUS: 5000,     // Base bonus for excellent time
    EXCELLENT_PER_SECOND: 500,      // Additional points per second under excellent threshold
    GOOD_BASE_BONUS: 2500,           // Base bonus for good time
    GOOD_PER_SECOND: 250,            // Additional points per second under good threshold
    DECENT_BASE_BONUS: 1000,         // Base bonus for decent time
    DECENT_PER_SECOND: 100,           // Additional points per second under decent threshold
    
    // Visual settings
    BONUS_TEXT_COLOR: 0x00FF00,     // Green color for bonus text
    BONUS_TEXT_STROKE: 0x000000,    // Black outline
    BONUS_TEXT_SIZE: 32,            // Font size
    BONUS_ANIMATION_DURATION: 4000, // Animation duration in milliseconds
    BONUS_FADE_SPEED: 0.02,         // How fast text fades out
    BONUS_SCALE_SPEED: 0.01         // How fast text scales up
};

// Special brick settings
export const SPECIAL_BRICK_CONFIG = {
    // Big bonus brick settings
    BIG_BONUS_SCORE: 1000,          // Points awarded for hitting big bonus brick
    BIG_BONUS_TEXT_COLOR: 0xFFD700, // Gold color for bonus text
    BIG_BONUS_TEXT_SIZE: 24,        // Font size for bonus text
    BIG_BONUS_ANIMATION_DURATION: 2000, // Animation duration in milliseconds
    BIG_BONUS_MOVE_DISTANCE: 50,    // How far the text moves up during animation
    
    // Finish level brick settings
    FINISH_LEVEL_SCORE: 10,         // Points awarded for hitting finish level brick
    FINISH_LEVEL_DELAY: 100         // Delay before forcing level completion (milliseconds)
}; 