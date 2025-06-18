// Asset paths
export const ASSETS = {
    images: {
        characters: {
            SAFlag: './assets/images/characters/SAFlag.png',
            Springbok: './assets/images/characters/Springbok.png',
            Voortrekker: './assets/images/characters/Voortrekker.png',
            Braai: './assets/images/characters/Braai.png',
            RugbyBall: './assets/images/characters/RugbyBall.png'
        },
        items: {
            sausage: './assets/images/items/sausage.png',
            coin_gold: './assets/images/items/coin_gold.png',
            coin_silver: './assets/images/items/coin_silver.png',
            brannas: './assets/images/items/brannas.png',
            ball: './assets/images/items/ball.png',
            extraball: './assets/images/items/extraball.png',
            paddle_main: './assets/images/items/paddle_main.png',
            powerup_largepaddle: './assets/images/items/powerup_largepaddle.png',
            powerup_smallpaddle: './assets/images/items/powerup_smallpaddle.png'
        },
        bricks: {
            brick_normal: './assets/images/bricks/brick_normal.png',
            brick_special: './assets/images/bricks/brick_special.png',
            brick_sausage: './assets/images/bricks/brick_sausage.png',
            brick_extra: './assets/images/bricks/brick_extra.png',
            brick_glass: './assets/images/bricks/brick_glass.png',
            brick_glass_broken: './assets/images/bricks/brick_glass_broken.png',
            
        },
        levels: (name, ext = '.png') => `./assets/images/levels/${name}${ext}`
    },
    sounds: {
        hit: './assets/sounds/hit.m4a',
        lifeloss: './assets/sounds/lifeloss.m4a',
        gameOver1: './assets/sounds/game_over1.m4a',
        poesklap: './assets/sounds/poesklap.m4a',
        brannas: './assets/sounds/brannas.m4a',
        brick_glass_break: './assets/sounds/brick_glass_break.m4a',
        brick_glass_destroyed: './assets/sounds/brick_glass_destroyed.m4a'
    },
    levels: (levelNum) => `./assets/levels/level${levelNum}.json`
};

// Asset loading functions
export function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

export function loadSound(src) {
    return new Audio(src);
}

export async function loadLevel(levelNum) {
    try {
        const response = await fetch(ASSETS.levels(levelNum));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading level:', error);
        // Load a random level as fallback
        const randomLevel = Math.floor(Math.random() * 20) + 1;
        return fetch(ASSETS.levels(randomLevel));
    }
} 