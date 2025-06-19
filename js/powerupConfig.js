export const POWERUP_BEHAVIOR_CONFIG = {
    brannas: {
        spriteKey: 'brannas',       // må matche assets.js
        showSprite: true,
        showText: true,
        text: 'BRANNAS!',
        textPosition: 'center',             // 'center' eller 'brick'
        textSize: 32,
        textBlink: true,
        playSound: true,
        sound: 'brannas',                  // Fixed: use brannas sound instead of brick_glass_break
        activateOn: 'screen',              // 'brick', 'paddle', 'screen'
        duration: 5000,
        score: 100,
    },
    extraball: {
        spriteKey: 'extraball',
        showSprite: true,
        showText: true,
        text: 'POESKLAP!',
        textPosition: 'center',
        textSize: 32,
        textBlink: true,
        playSound: true,
        sound: 'poesklap',
        activateOn: 'screen',
        duration: 10000,
        score: 100,
    },
    large_paddle: {
        spriteKey: 'powerup_largepaddle',
        showSprite: true,
        showText: false,
        text: 'GROOT!',
        textPosition: 'center',
        textSize: 28,
        textBlink: false,
        playSound: false,                   // No sound for paddle powerups
        sound: null,
        activateOn: 'paddle',
        duration: 10000,
        score: 0,
    },
    small_paddle: {
        spriteKey: 'powerup_smallpaddle',
        showSprite: true,
        showText: false,
        text: 'KLEIN!',
        textPosition: 'center',
        textSize: 28,
        textBlink: false,
        playSound: false,                   // No sound for paddle powerups
        sound: null,
        activateOn: 'paddle',
        duration: 10000,
        score: 0,
    },
    extra_life: {
        spriteKey: 'extra_life',
        showSprite: true,
        showText: false,
        text: 'LIEFLING!',
        textPosition: 'center',
        textSize: 28,
        textBlink: false,
        playSound: true,
        sound: 'extra_life',
        activateOn: 'brick',
        duration: 0,
        score: 0,
    },
    skull: {
        spriteKey: 'skull',
        showSprite: true,
        showText: false,
        text: 'DOOD!',
        textPosition: 'center',
        textSize: 28,
        textBlink: false,
        playSound: false,                   // No sound for skull powerup
        sound: null,
        activateOn: 'brick',
        duration: 0,
        score: 0,
    },
    coin_gold: {
        spriteKey: 'coin_gold',
        showSprite: true,
        showText: true,
        text: '100',
        textPosition: 'paddle',
        textSize: 28,
        textBlink: false,
        playSound: true,                   // No sound for coin powerups
        sound: 'coin_gold',
        activateOn: 'paddle',
        duration: 0,
        score: 100,
    },
    coin_silver: {
        spriteKey: 'coin_silver',
        showSprite: true,
        showText: true,
        text: '25',
        textPosition: 'paddle',
        textSize: 28,
        textBlink: false,
        playSound: true,                   // No sound for coin powerups
        sound: 'coin_silver',
        activateOn: 'paddle',
        duration: 0,
        score: 25,
    },
};

// Brick score configuration
export const BRICK_SCORE_CONFIG = {
    normal: 10,
    glass_first_hit: 5,
    glass_destroyed: 20,
    sausage: 50,
    extra: 50,
    default: 10
};

// Power-up distribution per level
export const POWERUPS_PER_LEVEL = {
    BRANNAS: 1,     // One brannas power-up per level
    EXTRA_LIFE: 1,  // One extra life power-up per level
    SKULL: 3,       // One skull power-up per level
    COIN_GOLD: 10,   // Five gold coin power-ups per level
    COIN_SILVER: 20,  // Ten silver coin power-ups per level
    POWERUP_LARGEPADDLE: 3, // Three large paddle power-ups per level
    POWERUP_SMALLPADDLE: 3  // Three small paddle power-ups per level
};

// Game sounds that aren't powerups but need sound pools
export const GAME_SOUNDS_CONFIG = {
    hit: {
        playSound: true,
        sound: 'hit',
        volume: 0.1,
        poolSize: 'mobile' // 'mobile' = 2 instances, 'desktop' = 4 instances
    },
    lifeloss: {
        playSound: true,
        sound: 'lifeloss',
        volume: 0.3,
        poolSize: 'mobile'
    },
    
    
    brick_glass_break: {
        playSound: true,
        sound: 'brick_glass_break',
        volume: 0.4,
        poolSize: 'desktop'
    },
    brick_glass_destroyed: {
        playSound: true,
        sound: 'brick_glass_destroyed',
        volume: 0.5,
        poolSize: 'desktop'
    },
    
    
};

// Helper function to get powerup config by type
export function getPowerUpConfig(type) {
    // Convert to lowercase for case-insensitive matching
    let normalizedType = type.toLowerCase();
    
    // Remove 'powerup_' prefix if present
    if (normalizedType.startsWith('powerup_')) {
        normalizedType = normalizedType.replace('powerup_', '');
    }
    
    // Map uppercase powerup types from POWERUPS_PER_LEVEL to lowercase config keys
    const powerupTypeMapping = {
        'brannas': 'brannas',
        'extra_life': 'extra_life',
        'skull': 'skull',
        'coin_gold': 'coin_gold',
        'coin_silver': 'coin_silver',
        'largepaddle': 'large_paddle',
        'smallpaddle': 'small_paddle',
        'extralife': 'extra_life',
        'coingold': 'coin_gold',
        'coinsilver': 'coin_silver',
        'large_paddle': 'large_paddle',
        'small_paddle': 'small_paddle'
    };
    
    // Try the mapping first
    if (powerupTypeMapping[normalizedType]) {
        const mappedType = powerupTypeMapping[normalizedType];
        if (POWERUP_BEHAVIOR_CONFIG[mappedType]) {
            return POWERUP_BEHAVIOR_CONFIG[mappedType];
        }
    }
    
    // Try to find the config directly first
    if (POWERUP_BEHAVIOR_CONFIG[normalizedType]) {
        return POWERUP_BEHAVIOR_CONFIG[normalizedType];
    }
    
    // If not found, try some common variations
    const variations = [
        normalizedType,
        normalizedType.replace('_', ''),
        normalizedType.replace(/_/g, ''),
        `powerup_${normalizedType}`,
        normalizedType.replace('powerup', '')
    ];
    
    for (const variation of variations) {
        if (POWERUP_BEHAVIOR_CONFIG[variation]) {
            return POWERUP_BEHAVIOR_CONFIG[variation];
        }
    }
    
    return null;
}

// Helper function to get sprite key for a powerup type
export function getPowerUpSpriteKey(type) {
    const config = getPowerUpConfig(type);
    return config ? config.spriteKey : type.toLowerCase();
}
