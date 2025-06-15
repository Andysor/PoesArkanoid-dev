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
            Sausage: './assets/images/items/Sausage.png',
            Coin: './assets/images/items/Coin.png',
            Brannas: './assets/images/items/Brannas.png'
        },
        levels: (name, ext = '.png') => `./assets/images/levels/${name}${ext}`
    },
    sounds: {
        hit: './assets/sounds/hit.mp3',
        lifeLoss: './assets/sounds/lifeLoss.mp3',
        poesKlap: './assets/sounds/poesKlap.mp3',
        brannas: './assets/sounds/brannas.mp3'
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