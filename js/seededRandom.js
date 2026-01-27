// Seeded Random Number Generator using Mulberry32 algorithm
// Provides reproducible random numbers for map generation replay

export class SeededRandom {
    constructor(seed) {
        // Convert string seed to number if necessary
        if (typeof seed === 'string') {
            this.seed = this.hashString(seed);
            console.log(`SeededRandom: string seed "${seed}" hashed to ${this.seed}`);
        } else {
            this.seed = seed;
            console.log(`SeededRandom: numeric seed ${seed}`);
        }
        this.state = this.seed;
        console.log(`SeededRandom initialized: seed=${this.seed}, state=${this.state}`);
    }

    // Hash a string to a 32-bit integer
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) || 1; // Ensure non-zero
    }

    // Mulberry32 PRNG - fast and high quality
    random() {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        const result = ((t ^ t >>> 14) >>> 0) / 4294967296;
        // Debug: log first few random values
        if (this._debugCount === undefined) this._debugCount = 0;
        if (this._debugCount < 20) {
            console.log(`SeededRandom[${this._debugCount}]: seed=${this.seed}, state=${this.state}, result=${result}`);
            this._debugCount++;
        }
        return result;
    }

    // Get random integer between min (inclusive) and max (exclusive)
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min)) + min;
    }

    // Get random float between min and max
    randomFloat(min, max) {
        return this.random() * (max - min) + min;
    }

    // Reset the generator to initial state
    reset() {
        this.state = this.seed;
    }
}

// Generate a unique map seed
export function generateMapSeed() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomPart}`;
}
