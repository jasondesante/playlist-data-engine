/**
 * EnemyGenerator - Generates enemy characters from templates
 *
 * Provides deterministic enemy generation based on:
 * - Enemy templates (base stats, signature abilities)
 * - Rarity tiers (stat scaling, ability scaling)
 * - Audio profiles (template selection influence)
 *
 * All generation is seeded for reproducibility.
 */

import type { CharacterSheet, AbilityScores } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import type { PlaylistTrack } from '../types/Playlist.js';
import type {
    EnemyTemplate,
    EnemyRarity,
    EnemyArchetype,
    EnemyCategory,
    EnemyGenerationOptions,
    SignatureAbility,
    RarityConfig
} from '../types/Enemy.js';
import { SeededRNG } from '../../utils/random.js';
import { DEFAULT_ENEMY_TEMPLATES } from '../../constants/DefaultEnemies.js';
import { getRarityConfig, RARITY_CONFIGS } from '../../constants/EnemyRarity.js';

/**
 * EnemyGenerator - Static class for enemy generation
 *
 * Generates enemy CharacterSheet instances from templates with:
 * - Deterministic seeded randomness
 * - Rarity-based stat scaling
 * - Signature ability dice scaling
 * - Audio-influenced template selection
 *
 * @example
 * ```typescript
 * // Generate a specific elite orc
 * const orc = EnemyGenerator.generate({
 *   seed: 'my-encounter',
 *   templateId: 'orc',
 *   rarity: 'elite'
 * });
 *
 * // Generate a random humanoid brute
 * const enemy = EnemyGenerator.generate({
 *   seed: 'random-1',
 *   category: 'humanoid',
 *   archetype: 'brute',
 *   rarity: 'common'
 * });
 * ```
 */
export class EnemyGenerator {
    /**
     * Get a seeded RNG instance with optional index offset
     *
     * Creates a deterministic RNG from seed. When index is provided,
     * appends it to the seed for unique sequences per enemy.
     *
     * @param seed - Base seed string
     * @param index - Optional index for unique sequences
     * @returns Seeded RNG instance
     */
    private static getSeededRNG(seed: string, index?: number): SeededRNG {
        const derivedSeed = index !== undefined ? `${seed}-${index}` : seed;
        return new SeededRNG(derivedSeed);
    }

    /**
     * Scale ability scores based on rarity tier
     *
     * Applies the rarity multiplier to each ability score.
     * Results are rounded to nearest integer.
     *
     * @param baseStats - Base ability scores from template
     * @param rarity - Rarity tier for scaling
     * @returns Scaled ability scores
     *
     * @example
     * ```typescript
     * scaleStatsForRarity({ STR: 16, DEX: 12, CON: 14 }, 'elite');
     * // Returns: { STR: 20, DEX: 15, CON: 18 } (1.25x multiplier)
     * ```
     */
    private static scaleStatsForRarity(
        baseStats: AbilityScores,
        rarity: EnemyRarity
    ): AbilityScores {
        const config = getRarityConfig(rarity);
        const multiplier = config.statMultiplier;

        return {
            STR: Math.round(baseStats.STR * multiplier),
            DEX: Math.round(baseStats.DEX * multiplier),
            CON: Math.round(baseStats.CON * multiplier),
            INT: Math.round(baseStats.INT * multiplier),
            WIS: Math.round(baseStats.WIS * multiplier),
            CHA: Math.round(baseStats.CHA * multiplier)
        };
    }

    /**
     * Get an enemy template by ID
     *
     * Searches the default enemy templates for a matching ID.
     *
     * @param id - Template ID (e.g., 'orc', 'goblin-archer')
     * @returns Template if found, undefined otherwise
     *
     * @example
     * ```typescript
     * const orc = getTemplateById('orc');
     * if (orc) {
     *   console.log(orc.name); // 'Orc'
     * }
     * ```
     */
    static getTemplateById(id: string): EnemyTemplate | undefined {
        return DEFAULT_ENEMY_TEMPLATES.find(t => t.id === id);
    }

    /**
     * Select a template based on filters and audio profile
     *
     * Filters templates by category/archetype if specified.
     * If audio profile is provided, weights selection by audio preference.
     *
     * @param rng - Seeded RNG for deterministic selection
     * @param category - Optional category filter
     * @param archetype - Optional archetype filter
     * @param audioProfile - Optional audio profile for weighting
     * @returns Selected enemy template
     */
    private static selectTemplate(
        rng: SeededRNG,
        category?: EnemyCategory,
        archetype?: EnemyArchetype,
        audioProfile?: AudioProfile
    ): EnemyTemplate {
        // Start with all templates
        let candidates = [...DEFAULT_ENEMY_TEMPLATES];

        // Filter by category if specified
        if (category) {
            candidates = candidates.filter(t => t.category === category);
        }

        // Filter by archetype if specified
        if (archetype) {
            candidates = candidates.filter(t => t.archetype === archetype);
        }

        // If no candidates match filters, throw error
        if (candidates.length === 0) {
            throw new Error(
                `No enemy templates match filters: category=${category}, archetype=${archetype}`
            );
        }

        // If audio profile provided, use weighted selection
        if (audioProfile) {
            return EnemyGenerator.weightedSelectionByAudio(candidates, audioProfile, rng);
        }

        // Otherwise use uniform random selection
        return rng.randomChoice(candidates);
    }

    /**
     * Select template using audio profile for weighting
     *
     * Calculates weight for each template based on audio preference match:
     * - bass_dominance → bass weight
     * - mid_dominance → mid weight
     * - treble_dominance → treble weight
     *
     * Simple dot product approach: multiply audio values by template weights.
     *
     * @param templates - Candidate templates
     * @param audioProfile - Audio profile for weighting
     * @param rng - RNG for final selection
     * @returns Selected template
     */
    private static weightedSelectionByAudio(
        templates: EnemyTemplate[],
        audioProfile: AudioProfile,
        rng: SeededRNG
    ): EnemyTemplate {
        // Build weighted choices
        const weightedChoices: [EnemyTemplate, number][] = templates.map(template => {
            const { audioPreference } = template;

            // Calculate match score using dot product
            // Higher audio dominance × higher template preference = higher weight
            const score =
                (audioProfile.bass_dominance || 0) * audioPreference.bass +
                (audioProfile.mid_dominance || 0) * audioPreference.mid +
                (audioProfile.treble_dominance || 0) * audioPreference.treble;

            // Use score as weight (minimum 0.1 to avoid zero weights)
            return [template, Math.max(0.1, score)];
        });

        return rng.weightedChoice(weightedChoices);
    }

    /**
     * Generate a signature ability with rarity-scaled damage die
     *
     * Creates a Feature-compatible object from the template's signature ability,
     * scaling the damage die based on rarity tier.
     *
     * @param signatureAbility - Base signature ability from template
     * @param rarity - Rarity tier for die scaling
     * @returns Scaled signature ability as a feature object
     */
    private static scaleSignatureAbility(
        signatureAbility: SignatureAbility,
        rarity: EnemyRarity
    ): Record<string, unknown> {
        const config = getRarityConfig(rarity);
        const scaledDie = `d${config.signatureDieSize}`;

        // Build feature object compatible with ClassFeature format
        return {
            id: signatureAbility.id,
            name: signatureAbility.name,
            description: signatureAbility.description,
            type: 'active' as const,
            class: 'Enemy' as const, // Placeholder class for enemy abilities
            level: 1,
            source: 'default' as const,
            tags: [signatureAbility.attackType, signatureAbility.damageType],
            effects: [],
            // Include attack data for combat use
            attack: {
                name: signatureAbility.name,
                damage: `${scaledDie} + ${EnemyGenerator.getAbilityModifierForRarity(rarity)}`,
                damage_dice: scaledDie,
                damage_type: signatureAbility.damageType,
                type: signatureAbility.attackType,
                range: signatureAbility.range,
                properties: signatureAbility.properties
            }
        };
    }

    /**
     * Get ability modifier value for rarity (for damage bonus)
     *
     * Returns an appropriate modifier based on rarity tier.
     * Common: +2, Uncommon: +3, Elite: +4, Boss: +6
     *
     * @param rarity - Rarity tier
     * @returns Ability modifier
     */
    private static getAbilityModifierForRarity(rarity: EnemyRarity): number {
        const modifiers: Record<EnemyRarity, number> = {
            common: 2,
            uncommon: 3,
            elite: 4,
            boss: 6
        };
        return modifiers[rarity] || 2;
    }

    /**
     * Generate a single enemy character
     *
     * Creates a CharacterSheet representing an enemy with:
     * - Template-based stats scaled by rarity
     * - Signature ability with scaled damage die
     * - Extra abilities from FeatureQuery (for higher rarities)
     * - Resistances for Elite+ tiers
     *
     * @param options - Generation options
     * @returns Enemy character sheet
     *
     * @throws Error if templateId not found
     * @throws Error if audioProfile provided without track
     *
     * @example
     * ```typescript
     * // Generate a specific elite orc
     * const orc = EnemyGenerator.generate({
     *   seed: 'my-encounter',
     *   templateId: 'orc',
     *   rarity: 'elite'
     * });
     *
     * // Generate with audio influence
     * const enemy = EnemyGenerator.generate({
     *   seed: 'battle-1',
     *   audioProfile: profile,
     *   track: trackData,
     *   rarity: 'uncommon'
     * });
     * ```
     */
    static generate(options: EnemyGenerationOptions): CharacterSheet {
        const {
            seed,
            templateId,
            rarity = 'common',
            difficultyMultiplier = 1.0,
            audioProfile,
            track
        } = options;

        // Validate: track required if audioProfile provided
        if (audioProfile && !track) {
            throw new Error('track is required when audioProfile is provided');
        }

        // Create RNG
        const rng = EnemyGenerator.getSeededRNG(seed);

        // Select template (by ID or via selection)
        let template: EnemyTemplate;
        if (templateId) {
            const found = EnemyGenerator.getTemplateById(templateId);
            if (!found) {
                throw new Error(`Unknown enemy template ID: ${templateId}`);
            }
            template = found;
        } else {
            // Get category/archetype from options if specified
            const category = (options as { category?: EnemyCategory }).category;
            const archetype = (options as { archetype?: EnemyArchetype }).archetype;
            template = EnemyGenerator.selectTemplate(rng, category, archetype, audioProfile);
        }

        // Scale stats by rarity
        const scaledStats = EnemyGenerator.scaleStatsForRarity(template.baseStats, rarity);

        // Calculate ability modifiers from scaled stats
        const abilityModifiers: AbilityScores = {
            STR: Math.floor((scaledStats.STR - 10) / 2),
            DEX: Math.floor((scaledStats.DEX - 10) / 2),
            CON: Math.floor((scaledStats.CON - 10) / 2),
            INT: Math.floor((scaledStats.INT - 10) / 2),
            WIS: Math.floor((scaledStats.WIS - 10) / 2),
            CHA: Math.floor((scaledStats.CHA - 10) / 2)
        };

        // Calculate HP and AC
        const rarityConfig = getRarityConfig(rarity);
        let maxHp = Math.round(template.baseHP * rarityConfig.statMultiplier);

        // Apply difficulty multiplier to HP
        if (difficultyMultiplier !== 1.0) {
            maxHp = Math.round(maxHp * difficultyMultiplier);
        }

        // AC = base AC + DEX modifier
        const armorClass = template.baseAC + abilityModifiers.DEX;

        // Calculate level from CR (simplified formula)
        // For V1, we use a simple level 1-3 mapping based on rarity
        const level = EnemyGenerator.getLevelForRarity(rarity);

        // Proficiency bonus based on level
        const proficiencyBonus = Math.ceil(1 + (level - 1) / 4);

        // Generate signature ability
        const signatureAbility = EnemyGenerator.scaleSignatureAbility(
            template.signatureAbility,
            rarity
        );

        // Build abilities array
        const abilities: unknown[] = [signatureAbility];

        // Add extra abilities for higher rarities
        const extraAbilityCount = rarityConfig.extraAbilityCount;
        if (extraAbilityCount > 0) {
            // TODO: Task 8 - Query FeatureQuery for archetype abilities
            // For now, we only add the signature ability
            // Extra abilities will be added in Task 8
        }

        // Build resistances/immunities for Elite+ enemies
        let resistances: string[] | undefined;
        let immunities: string[] | undefined;

        if (rarityConfig.hasResistances && template.resistances) {
            resistances = template.resistances.resistances;
            immunities = template.resistances.immunities;
        }

        // Create natural weapon attack based on signature ability
        const naturalWeapon = {
            name: template.signatureAbility.name,
            damage: `${EnemyGenerator.getDamageDieForRarity(rarity)} + ${EnemyGenerator.getAbilityModifierForRarity(rarity)}`,
            damage_dice: EnemyGenerator.getDamageDieForRarity(rarity),
            damage_type: template.signatureAbility.damageType,
            type: template.signatureAbility.attackType,
            range: template.signatureAbility.range,
            properties: template.signatureAbility.properties || [],
            equipped: true
        };

        // Build the character sheet
        const character: CharacterSheet = {
            // Use template name as enemy name
            name: template.name,

            // Enemies don't use standard race/class - use placeholder values
            race: 'Enemy' as any,
            class: 'Monster' as any,
            subrace: rarity,
            level,

            // Scaled stats
            ability_scores: scaledStats,
            ability_modifiers: abilityModifiers,
            proficiency_bonus: proficiencyBonus,

            // Combat stats
            hp: {
                current: maxHp,
                max: maxHp,
                temp: 0
            },
            armor_class: armorClass,
            initiative: abilityModifiers.DEX,
            speed: template.baseSpeed,

            // Empty skills (enemies don't have skill proficiencies in V1)
            skills: {},

            // Empty saving throws (enemies use standard saves based on stats)
            saving_throws: {
                STR: true,
                DEX: true,
                CON: true,
                INT: false,
                WIS: false,
                CHA: false
            },

            // Use abilities array with signature + extras
            racial_traits: [], // Enemies don't have racial traits
            class_features: abilities.map((a: any) => (a.id || a.name || `${a}`)),

            // No equipment - enemies use natural weapons
            equipment: {
                weapons: [naturalWeapon as any],
                armor: [],
                items: [],
                totalWeight: 0,
                equippedWeight: 0
            },

            // Empty spells (V1 - spells as features only)
            spells: {
                spell_slots: {},
                known_spells: [],
                cantrips: []
            },

            // XP tracking
            xp: {
                current: 0,
                next_level: 0
            },

            // Metadata
            seed,
            generated_at: new Date().toISOString()
        };

        return character;
    }

    /**
     * Get character level based on rarity
     *
     * Simple rarity-to-level mapping for V1.
     * Common: 1, Uncommon: 2, Elite: 3, Boss: 4
     *
     * @param rarity - Enemy rarity tier
     * @returns Character level
     */
    private static getLevelForRarity(rarity: EnemyRarity): number {
        const levels: Record<EnemyRarity, number> = {
            common: 1,
            uncommon: 2,
            elite: 3,
            boss: 4
        };
        return levels[rarity] || 1;
    }

    /**
     * Get damage die notation for rarity
     *
     * Returns the die size used for damage based on rarity tier.
     *
     * @param rarity - Enemy rarity tier
     * @returns Die notation (e.g., 'd6', 'd8')
     */
    private static getDamageDieForRarity(rarity: EnemyRarity): string {
        const config = getRarityConfig(rarity);
        return `d${config.signatureDieSize}`;
    }
}
