import type { Class } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { SeededRNG } from '../../utils/random.js';

export interface CharacterAppearance {
    // Deterministic features (from seed)
    body_type: 'slender' | 'athletic' | 'muscular' | 'stocky';
    skin_tone: string;
    hair_style: string;
    hair_color: string;
    eye_color: string;
    facial_features: string[];

    // Dynamic features (from audio/visual)
    primary_color?: string;
    secondary_color?: string;
    aura_color?: string;
}

// Predefined appearance palettes
const BODY_TYPES: Array<'slender' | 'athletic' | 'muscular' | 'stocky'> = ['slender', 'athletic', 'muscular', 'stocky'];


const SKIN_TONES = [
    '#F5E6D3', // Fair
    '#E8C4A0', // Light
    '#D4A574', // Medium
    '#C68642', // Tan
    '#8D5524', // Brown
    '#5C3317', // Dark
];

const HAIR_COLORS = [
    '#1C1C1C', // Black
    '#3B2414', // Dark Brown
    '#6A4E23', // Brown
    '#A67B5B', // Light Brown
    '#D4AF37', // Blonde
    '#E9C2A6', // Light Blonde
    '#B55239', // Auburn
    '#DC143C', // Red
    '#C0C0C0', // Gray
    '#FFFFFF', // White
];

const EYE_COLORS = [
    '#3B2414', // Brown
    '#6F4E37', // Hazel
    '#228B22', // Green
    '#4169E1', // Blue
    '#708090', // Gray
    '#000000', // Black
];

const HAIR_STYLES = [
    'short',
    'long',
    'bald',
    'braided',
    'curly',
    'wavy',
    'straight',
    'ponytail',
    'mohawk',
    'dreadlocks',
];

const FACIAL_FEATURES = [
    'scar on cheek',
    'tattoo on forehead',
    'piercing',
    'freckles',
    'beard',
    'mustache',
    'clean-shaven',
    'birthmark',
    'sharp jawline',
    'soft features',
];

// Magical classes that receive aura colors
const MAGICAL_CLASSES: Class[] = [
    'Wizard',
    'Sorcerer',
    'Warlock',
    'Bard',
    'Cleric',
    'Druid',
    'Paladin',
];

export class AppearanceGenerator {
    /**
     * Generate character appearance from seed and audio profile
     */
    static generate(
        seed: string,
        characterClass: Class,
        audioProfile: AudioProfile
    ): CharacterAppearance {
        const rng = new SeededRNG(seed);

        // Generate deterministic features
        const body_type = rng.randomChoice(BODY_TYPES);
        const skin_tone = rng.randomChoice(SKIN_TONES);
        const hair_style = rng.randomChoice(HAIR_STYLES);
        const hair_color = rng.randomChoice(HAIR_COLORS);
        const eye_color = rng.randomChoice(EYE_COLORS);

        // Generate 1-3 facial features
        const numFeatures = rng.randomInt(1, 4);
        const shuffledFeatures = rng.shuffle(FACIAL_FEATURES);
        const facial_features = shuffledFeatures.slice(0, numFeatures);

        // Generate dynamic features from audio/visual data
        const colorPalette = audioProfile.color_palette;
        const primary_color = colorPalette?.primary_color;
        const secondary_color = colorPalette?.secondary_color;

        // Generate aura color for magical classes
        let aura_color: string | undefined;
        if (MAGICAL_CLASSES.includes(characterClass)) {
            aura_color = this.generateAuraColor(characterClass, colorPalette?.primary_color);
        }


        return {
            body_type,
            skin_tone,
            hair_style,
            hair_color,
            eye_color,
            facial_features,
            primary_color,
            secondary_color,
            aura_color,
        };
    }

    /**
     * Generate aura color for magical classes
     */
    private static generateAuraColor(
        characterClass: Class,
        primaryColor: string | undefined
    ): string {
        // If we have a primary color from the palette, use a variation of it
        if (primaryColor) {
            return this.adjustColorBrightness(primaryColor, 1.3);
        }

        // Otherwise, use class-specific default aura colors
        const classAuraColors: Record<string, string> = {
            Wizard: '#4169E1', // Royal Blue
            Sorcerer: '#DC143C', // Crimson
            Warlock: '#8B008B', // Dark Magenta
            Bard: '#FFD700', // Gold
            Cleric: '#F0E68C', // Khaki (holy light)
            Druid: '#228B22', // Forest Green
            Paladin: '#FFE4B5', // Moccasin (divine light)
        };

        return classAuraColors[characterClass] || '#FFFFFF';
    }

    /**
     * Adjust color brightness by a factor
     */
    private static adjustColorBrightness(hexColor: string, factor: number): string {
        // Remove # if present
        const hex = hexColor.replace('#', '');

        // Parse RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Adjust brightness
        const newR = Math.min(255, Math.floor(r * factor));
        const newG = Math.min(255, Math.floor(g * factor));
        const newB = Math.min(255, Math.floor(b * factor));

        // Convert back to hex
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    }
}
