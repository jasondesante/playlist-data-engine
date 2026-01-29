import type { Class } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { SeededRNG } from '../../utils/random.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { WeightedSelector } from '../extensions/WeightedSelector.js';
import { ensureAppearanceDefaultsInitialized } from '../extensions/initializeDefaults.js';

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
     *
     * Uses the ExtensionManager to get appearance options (defaults + custom)
     * and WeightedSelector for spawn rate control.
     */
    static generate(
        seed: string,
        characterClass: Class,
        audioProfile: AudioProfile
    ): CharacterAppearance {
        // Ensure defaults are initialized
        ensureAppearanceDefaultsInitialized();

        const rng = new SeededRNG(seed);
        const manager = ExtensionManager.getInstance();

        // Get extended appearance data (defaults + custom)
        const bodyTypes = manager.get('appearance.bodyTypes');
        const bodyWeights = manager.getWeights('appearance.bodyTypes');
        const body_mode = manager.getMode('appearance.bodyTypes') || 'default';

        const skinTones = manager.get('appearance.skinTones');
        const skinWeights = manager.getWeights('appearance.skinTones');
        const skin_mode = manager.getMode('appearance.skinTones') || 'default';

        const hairStyles = manager.get('appearance.hairStyles');
        const hairStyleWeights = manager.getWeights('appearance.hairStyles');
        const hairStyle_mode = manager.getMode('appearance.hairStyles') || 'default';

        const hairColors = manager.get('appearance.hairColors');
        const hairColorWeights = manager.getWeights('appearance.hairColors');
        const hairColor_mode = manager.getMode('appearance.hairColors') || 'default';

        const eyeColors = manager.get('appearance.eyeColors');
        const eyeWeights = manager.getWeights('appearance.eyeColors');
        const eye_mode = manager.getMode('appearance.eyeColors') || 'default';

        const facialFeatures = manager.get('appearance.facialFeatures');
        const featureWeights = manager.getWeights('appearance.facialFeatures');
        const feature_mode = manager.getMode('appearance.facialFeatures') || 'default';

        // Generate deterministic features using weighted selection
        const body_type = WeightedSelector.select(bodyTypes, bodyWeights, rng, body_mode);
        const skin_tone = WeightedSelector.select(skinTones, skinWeights, rng, skin_mode);
        const hair_style = WeightedSelector.select(hairStyles, hairStyleWeights, rng, hairStyle_mode);
        const hair_color = WeightedSelector.select(hairColors, hairColorWeights, rng, hairColor_mode);
        const eye_color = WeightedSelector.select(eyeColors, eyeWeights, rng, eye_mode);

        // Generate 1-3 facial features using weighted selection without duplicates
        const numFeatures = rng.randomInt(1, 4);
        const selected_facial_features = WeightedSelector.selectMultiple(
            facialFeatures,
            featureWeights,
            rng,
            numFeatures,
            feature_mode
        );

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
            facial_features: selected_facial_features,
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
