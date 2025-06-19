// Game version
export const GAME_VERSION = '0.1.0';

// Test mode flag
export const TEST_MODE = false;

// Ball settings
export const BASE_INITIAL_SPEED = 6;
export const BASE_MAX_SPEED = 18;
export const LEVEL_SPEED_INCREASE = 0.15;
export const BALL_RADIUS = window.innerWidth * 0.02; // 1% of screen width

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
export const COMPONENT_SPEED = BASE_INITIAL_SPEED / Math.sqrt(2);
export const SPEED_INCREASE_INTERVAL = 10000; // Every 10 seconds
export const SPEED_INCREASE_FACTOR = 1.1; // 10% increase

// Paddle constants
export const PADDLE_BOTTOM_MARGIN = 100; // Distance from bottom of screen to paddle
export const PADDLE_HOVER_OFFSET = 0.1; // Screen height from touch point to paddle center

// Audio constants
export const POESKLAP_COOLDOWN = 500; // milliseconds between poesklap sounds 