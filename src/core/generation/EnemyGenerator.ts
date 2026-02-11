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
import type {
    EnemyTemplate,
    EnemyRarity,
    EnemyArchetype,
    EnemyCategory,
    EnemyGenerationOptions,
    SignatureAbility
} from '../types/Enemy.js';
import { SeededRNG } from '../../utils/random.js';
import { DEFAULT_ENEMY_TEMPLATES } from '../../constants/DefaultEnemies.js';
import { getRarityConfig } from '../../constants/EnemyRarity.js';
import { FeatureQuery } from '../features/FeatureQuery.js';

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
     * Archetype tag mappings for feature selection
     *
     * Maps each enemy archetype to feature tags that are appropriate
     * for selecting extra abilities from FeatureQuery.
     *
     * Brutes benefit from durability and melee damage abilities
     * Archers benefit from accuracy and mobility abilities
     * Support enemies benefit from healing and buff abilities
     */
    private static readonly ARCHETYPE_TAGS: Record<EnemyArchetype, string[]> = {
        brute: ['combat', 'damage', 'defense', 'melee', 'durability'],
        archer: ['combat', 'ranged', 'accuracy', 'mobility', 'stealth'],
        support: ['support', 'healing', 'buff', 'control', 'utility']
    };

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
     * Generate all abilities for an enemy
     *
     * Returns an array containing:
     * 1. The signature ability (scaled by rarity)
     * 2. Extra abilities selected from FeatureQuery based on archetype
     *
     * @param template - Enemy template
     * @param rarity - Enemy rarity tier
     * @param rng - Seeded RNG for deterministic selection
     * @returns Array of ability objects compatible with CharacterSheet
     *
     * @example
     * ```typescript
     * const abilities = generateAbilities(orcTemplate, 'elite', rng);
     * // Returns: [scaledSignatureAbility, extraFeature1, extraFeature2]
     * ```
     */
    private static generateAbilities(
        template: EnemyTemplate,
        rarity: EnemyRarity,
        rng: SeededRNG
    ): Record<string, unknown>[] {
        // Start with signature ability
        const signatureAbility = EnemyGenerator.scaleSignatureAbility(
            template.signatureAbility,
            rarity
        );

        const abilities: Record<string, unknown>[] = [signatureAbility];

        // Get extra ability count from rarity config
        const rarityConfig = getRarityConfig(rarity);
        const extraCount = rarityConfig.extraAbilityCount;

        // Only add extra abilities for higher rarities
        if (extraCount > 0) {
            const extraAbilities = EnemyGenerator.selectExtraAbilities(
                template.archetype,
                extraCount,
                rng
            );

            // Add extra abilities to the array
            abilities.push(...extraAbilities);
        }

        return abilities;
    }

    /**
     * Select extra abilities from FeatureQuery based on archetype
     *
     * Filters class features by archetype-appropriate tags and randomly
     * selects the requested number of abilities.
     *
     * @param archetype - Enemy archetype for tag filtering
     * @param count - Number of abilities to select
     * @param rng - Seeded RNG for deterministic selection
     * @returns Array of selected feature objects
     */
    private static selectExtraAbilities(
        archetype: EnemyArchetype,
        count: number,
        rng: SeededRNG
    ): Record<string, unknown>[] {
        // Get tags for this archetype
        const archetypeTags = EnemyGenerator.ARCHETYPE_TAGS[archetype];

        // Get FeatureQuery instance
        const featureQuery = FeatureQuery.getInstance();

        // Get all class features using public API
        const featuresMap = featureQuery.getAllClassFeatures();
        const allFeatures: typeof featuresMap extends Map<string, infer T> ? T : never[] = [];
        for (const features of featuresMap.values()) {
            allFeatures.push(...features);
        }

        // Filter features by archetype tags
        // A feature matches if it has at least one matching tag
        const matchingFeatures = allFeatures.filter(feature => {
            if (!feature.tags || feature.tags.length === 0) {
                return false;
            }

            // Check if any feature tag matches any archetype tag
            return feature.tags.some(tag =>
                archetypeTags.some(archetypeTag =>
                    tag.toLowerCase().includes(archetypeTag.toLowerCase()) ||
                    archetypeTag.toLowerCase().includes(tag.toLowerCase())
                )
            );
        });

        // If no matching features, return empty array
        if (matchingFeatures.length === 0) {
            return [];
        }

        // Randomly select the requested number of features
        const selected: typeof allFeatures = [];

        // Create a copy of matching features to avoid duplicates
        const available = [...matchingFeatures];

        for (let i = 0; i < count && available.length > 0; i++) {
            const index = rng.randomInt(0, available.length);
            selected.push(available[index]!);
            available.splice(index, 1);
        }

        // Convert features to ability objects
        return selected.map(feature => ({
            id: feature.id,
            name: feature.name,
            description: feature.description,
            type: feature.type,
            class: 'Enemy' as const,
            level: 1,
            source: feature.source,
            tags: feature.tags || [],
            effects: feature.effects || []
        }));
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

        // Generate all abilities (signature + extras from FeatureQuery)
        const abilities = EnemyGenerator.generateAbilities(template, rarity, rng);

        // Note: Resistances/immunities for Elite+ enemies will be integrated in V2
        // when CharacterSheet type is extended to support them
        // Currently tracked via template.resistances but not applied to character sheet

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            race: 'Enemy' as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            class_features: abilities.map((a: any) => (a.id || a.name || `${a}`)),

            // No equipment - enemies use natural weapons
            equipment: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
