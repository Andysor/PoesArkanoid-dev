// Asset paths
export const ASSETS = {
    images: {
        characters: {
            saflag: './assets/images/characters/saflag.png',
            springbok: './assets/images/characters/springbok.png',
            voortrekker: './assets/images/characters/voortrekker.png',
            braai: './assets/images/characters/braai.png',
            rugbyball: './assets/images/characters/rugbyball.png'
        },
        items: {
            sausage: './assets/images/items/sausage.png',
            coin_gold: './assets/images/items/coin_gold.png',
            coin_silver: './assets/images/items/coin_silver.png',
            brannas: './assets/images/items/brannas.png',
            ball: './assets/images/items/ball.png',
            extraball: './assets/images/items/extra_ball.png',
            paddle_main: './assets/images/items/paddle_main.png',
            powerup_largepaddle: './assets/images/items/powerup_largepaddle.png',
            powerup_smallpaddle: './assets/images/items/powerup_smallpaddle.png',
            extra_life: './assets/images/items/extra_life.png',
            skull: './assets/images/items/skull.png',
        },
        bricks: {
            brick_normal: './assets/images/bricks/brick_normal.png',
            brick_special: './assets/images/bricks/brick_special.png',
            brick_sausage: './assets/images/bricks/brick_sausage.png',
            brick_extra: './assets/images/bricks/brick_extra.png',
            brick_glass: './assets/images/bricks/brick_glass.png',
            brick_glass_broken: './assets/images/bricks/brick_glass_broken.png',
            brick_strong: './assets/images/bricks/brick_strong.png',
            brick_finishlevel: './assets/images/bricks/brick_finishlevel.png',
            brick_bigbonus: './assets/images/bricks/brick_bigbonus.png',
        },
        levels: (name, ext = '.png') => `./assets/images/levels/${name}${ext}`
    },
    sounds: {
        normal: './assets/sounds/normal.mp3',
        lifeloss: './assets/sounds/masepoes.m4a',
        poesklap: './assets/sounds/poesklap.m4a',
        brannas: './assets/sounds/brannas.m4a',
        brick_glass_break: './assets/sounds/brick_glass_break.m4a',
        brick_glass_destroyed: './assets/sounds/brick_glass_destroyed.m4a',
        extra_life: './assets/sounds/extra_life.m4a',
        coin_silver: './assets/sounds/coin_silver.m4a',
        coin_gold: './assets/sounds/coin_gold.m4a',
        gameOver1: './assets/sounds/game_over1.m4a',
        groot: './assets/sounds/groot.mp3',
        klein: './assets/sounds/klein.mp3',
        strong: './assets/sounds/strong.m4a',
        bigbonus: './assets/sounds/bigbonus.m4a',
        
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
        // Return null instead of trying to load a random level
        return null;
    }
} 