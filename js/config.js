// Game version
export const GAME_VERSION = '0.1.0';

// Test mode flag
export const TEST_MODE = false;

// Ball settings
export const BASE_INITIAL_SPEED = 7;
export const BASE_MAX_SPEED = 15;
export const LEVEL_SPEED_INCREASE = 0.1;

// Paddle settings
export const PADDLE_WIDTH = 75;
export const PADDLE_HEIGHT = 10;
export const PADDLE_SPEED = 7;

// Brick settings
export const BRICK_WIDTH = 75;
export const BRICK_HEIGHT = 20;
export const BRICK_PADDING = 10;

// Power-up settings
export const POWER_UP_CHANCE = 0.2;
export const POWER_UP_DURATION = 10000; // 10 seconds

// Game settings
export const MAX_LEVEL = 10;
export const INITIAL_LIVES = 3;
export const POINTS_PER_BRICK = 10;

// Power-up constants
export const POWERUPS_PER_LEVEL = {
    BRANNAS: 1,     // One brannas power-up per level
    EXTRA_LIFE: 1,  // One extra life power-up per level
    SKULL: 3,       // Three skull power-ups per level
    COIN: 5         // Five coin power-ups per level
};

// Speed-related constants
export const COMPONENT_SPEED = BASE_INITIAL_SPEED / Math.sqrt(2);
export const SPEED_INCREASE_INTERVAL = 10000; // Every 10 seconds
export const SPEED_INCREASE_FACTOR = 1.1; // 10% increase

// Paddle constants
export const PADDLE_BOTTOM_MARGIN = 250; // Distance from bottom of screen to paddle
export const PADDLE_TOUCH_OFFSET = 150; // Distance from touch point to paddle center

// Audio constants
export const POESKLAP_COOLDOWN = 500; // milliseconds between poesklap sounds 