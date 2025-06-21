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
        canBreakStrongBricks: true,        // Brannas can break strong bricks
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
        canBreakStrongBricks: false,       // Extra ball cannot break strong bricks
    },
    large_paddle: {
        spriteKey: 'powerup_largepaddle',
        showSprite: true,
        showText: true,
        text: 'GROOT!',
        textPosition: 'center',
        textSize: 28,
        textBlink: false,
        playSound: false,                   // No sound for paddle powerups
        sound: null,
        activateOn: 'screen',
        duration: 10000,
        score: 0,
        canBreakStrongBricks: false,       // Paddle powerups cannot break strong bricks
    },
    small_paddle: {
        spriteKey: 'powerup_smallpaddle',
        showSprite: true,
        showText: true,
        text: 'KLEIN!',
        textPosition: 'center',
        textSize: 28,
        textBlink: false,
        playSound: false,                   // No sound for paddle powerups
        sound: null,
        activateOn: 'screen',
        duration: 10000,
        score: 0,
        canBreakStrongBricks: false,       // Paddle powerups cannot break strong bricks
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
        canBreakStrongBricks: false,       // Extra life cannot break strong bricks
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
        canBreakStrongBricks: false,       // Skull cannot break strong bricks
    },
    coin_gold: {
        spriteKey: 'coin_gold',
        showSprite: true,
        showText: true,
        text: '100',
        textPosition: 'paddle',
        textSize: 28,
        textBlink: false,
        playSound: true,                   
        sound: 'coin_gold',
        activateOn: 'paddle',
        duration: 0,
        score: 100,
        canBreakStrongBricks: false,       // Coins cannot break strong bricks
    },
    coin_silver: {
        spriteKey: 'coin_silver',
        showSprite: true,
        showText: true,
        text: '25',
        textPosition: 'paddle',
        textSize: 28,
        textBlink: false,
        playSound: true,                   
        sound: 'coin_silver',
        activateOn: 'paddle',
        duration: 0,
        score: 25,
        canBreakStrongBricks: false,       // Coins cannot break strong bricks
    },
};

// Brick score configuration
export const BRICK_SCORE_CONFIG = {
    normal: 10,
    glass_first_hit: 5,
    glass_destroyed: 20,
    sausage: 50,
    extra: 50,
    strong: 30,  // Strong bricks give more points when destroyed
    default: 10
};

// Power-up distribution per level
export const POWERUPS_PER_LEVEL = {
    BRANNAS: 1,     // One brannas power-up per level
    EXTRA_LIFE: 1,  // One extra life power-up per level
    SKULL: 3,       // One skull power-up per level
    COIN_GOLD: 20,   // Five gold coin power-ups per level
    COIN_SILVER: 40,  // Ten silver coin power-ups per level
    POWERUP_LARGEPADDLE: 3, // Three large paddle power-ups per level
    POWERUP_SMALLPADDLE: 3  // Three small paddle power-ups per level
};

// Smart powerup distribution configuration
export const POWERUP_DISTRIBUTION_CONFIG = {
    // Maximum percentage of bricks that can have powerups
    MAX_POWERUP_PERCENTAGE: 0.4, // 40% of bricks can have powerups
    
    // Minimum powerups to place (even in tiny levels)
    MIN_POWERUPS: 1,
    
    // Powerup distribution ratios (percentages of max powerups)
    RATIOS: {
        BRANNAS: 0.03,        // 3% - rare
        EXTRA_LIFE: 0.01,     // 1% - rare
        SKULL: 0.03,          // 3% - uncommon
        COIN_GOLD: 0.1,      // 10% - common
        COIN_SILVER: 0.2,    // 20% - common
        POWERUP_LARGEPADDLE: 0.05, // 5% - rare
        POWERUP_SMALLPADDLE: 0.05  // 5% - rare
    },
    
    // Fallback powerup type if no powerups are placed due to rounding
    FALLBACK_POWERUP: 'COIN_SILVER'
};

// Smart powerup distribution function
export function distributePowerups(normalBricks, glassBricks) {
    // Create weighted brick array for powerup distribution
    const weightedBricks = [];
    normalBricks.forEach(brick => {
        weightedBricks.push(brick); // Normal weight
    });
    glassBricks.forEach(brick => {
        // Add each glass brick 3 times (3x weight)
        weightedBricks.push(brick);
        weightedBricks.push(brick);
        weightedBricks.push(brick);
    });

    if (weightedBricks.length === 0) {
        console.log('No bricks available for powerup distribution');
        return;
    }

    // Shuffle the weighted bricks
    const shuffled = weightedBricks.sort(() => Math.random() - 0.5);
    
    // Calculate how many powerups we can reasonably place
    const totalBricks = weightedBricks.length;
    const maxPowerups = Math.max(
        POWERUP_DISTRIBUTION_CONFIG.MIN_POWERUPS, 
        Math.min(totalBricks, Math.floor(totalBricks * POWERUP_DISTRIBUTION_CONFIG.MAX_POWERUP_PERCENTAGE))
    );
    
    console.log(`Distributing powerups: ${totalBricks} weighted bricks available, max ${maxPowerups} powerups`);

    let powerupIndex = 0;
    let totalPlaced = 0;
    const powerupComposition = {}; // Track what powerups were placed
    
    // Distribute powerups based on ratios
    for (const [type, ratio] of Object.entries(POWERUP_DISTRIBUTION_CONFIG.RATIOS)) {
        const count = Math.max(0, Math.floor(maxPowerups * ratio));
        
        if (count > 0) {
            console.log(`Placing ${count} ${type} powerups`);
            powerupComposition[type] = count;
            
            for (let i = 0; i < count && powerupIndex < shuffled.length; i++, powerupIndex++) {
                const targetBrick = shuffled[powerupIndex];
                if (!targetBrick.brickInfo) {
                    targetBrick.brickInfo = {};
                }
                targetBrick.brickInfo.powerUpType = type;
                totalPlaced++;
            }
        } else {
            powerupComposition[type] = 0;
        }
    }

    // If no powerups were placed due to rounding, place at least one fallback powerup
    if (totalPlaced === 0 && shuffled.length > 0) {
        console.log(`No powerups placed due to rounding, placing at least one ${POWERUP_DISTRIBUTION_CONFIG.FALLBACK_POWERUP}`);
        const targetBrick = shuffled[0];
        if (!targetBrick.brickInfo) {
            targetBrick.brickInfo = {};
        }
        targetBrick.brickInfo.powerUpType = POWERUP_DISTRIBUTION_CONFIG.FALLBACK_POWERUP;
        totalPlaced = 1;
        powerupComposition[POWERUP_DISTRIBUTION_CONFIG.FALLBACK_POWERUP] = 1;
    }

    // Log the powerup composition breakdown
    console.log('🎯 LEVEL POWERUP COMPOSITION:');
    console.log('═'.repeat(50));
    console.log(`📊 Total Powerups: ${totalPlaced} / ${maxPowerups} maximum`);
    console.log(`🧱 Available Bricks: ${totalBricks} (${normalBricks.length} normal, ${glassBricks.length} glass)`);
    console.log('─'.repeat(50));
    
    // Sort powerups by count (highest first)
    const sortedPowerups = Object.entries(powerupComposition)
        .sort(([,a], [,b]) => b - a)
        .filter(([,count]) => count > 0);
    
    if (sortedPowerups.length === 0) {
        console.log('❌ No powerups placed');
    } else {
        sortedPowerups.forEach(([type, count]) => {
            const percentage = ((count / totalPlaced) * 100).toFixed(1);
            const ratio = POWERUP_DISTRIBUTION_CONFIG.RATIOS[type];
            const ratioPercent = (ratio * 100).toFixed(1);
            console.log(`🎁 ${type.padEnd(20)}: ${count.toString().padStart(2)} (${percentage}% of placed, ${ratioPercent}% target)`);
        });
    }
    
    console.log('═'.repeat(50));

    console.log(`Total powerups placed: ${totalPlaced} out of ${maxPowerups} maximum`);
}

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
