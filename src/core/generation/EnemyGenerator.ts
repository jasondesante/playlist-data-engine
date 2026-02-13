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
    EncounterGenerationOptions,
    SignatureAbility
} from '../types/Enemy.js';
import { SeededRNG } from '../../utils/random.js';
import { DEFAULT_ENEMY_TEMPLATES } from '../../constants/DefaultEnemies.js';
import { getRarityConfig } from '../../constants/EnemyRarity.js';
import { FeatureQuery } from '../features/FeatureQuery.js';
import { PartyAnalyzer } from '../combat/PartyAnalyzer.js';
import {
    getCRFromXP,
    getXPForCR,
    getEncounterMultiplier,
    getXPBudgetForParty
} from '../../constants/EncounterBalance.js';
import { EnemyEquipmentGenerator } from './EnemyEquipmentGenerator.js';
import { SpellcastingGenerator } from './SpellcastingGenerator.js';
import { LegendaryGenerator } from './LegendaryGenerator.js';
import { DEFAULT_EQUIPMENT } from '../../constants/DefaultEquipment.js';

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
     * Maximum stat increase from audio influence
     *
     * This prevents extreme stat values from audio profiles.
     * Audio influence is additive to rarity scaling, not multiplicative.
     */
    private static readonly MAX_AUDIO_INFLUENCE = 2;

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
     * Apply audio influence to ability scores
     *
     * Applies subtle stat adjustments based on audio profile characteristics.
     * This is additive to rarity scaling, providing flavor rather than major power shifts.
     *
     * Frequency band → stat mapping:
     * - Bass dominance → +1 to STR and CON
     * - Treble dominance → +1 to DEX
     * - Mid dominance → +1 to WIS and CHA
     * - Balanced → +1 to all (smaller bonus)
     *
     * Maximum total increase from audio influence is capped at +2 per stat
     * to prevent extreme values.
     *
     * @param stats - Base ability scores to modify
     * @param audioProfile - Audio profile for influence calculation
     * @returns Modified ability scores with audio influence applied
     *
     * @example
     * ```typescript
     * const stats = { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 8, CHA: 8 };
     * const audioProfile = { bass_dominance: 0.8, mid_dominance: 0.1, treble_dominance: 0.1 };
     * const modified = applyAudioStatInfluence(stats, audioProfile);
     * // Returns: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 8, CHA: 8 } (bass → STR, CON)
     * ```
     */
    private static applyAudioStatInfluence(
        stats: AbilityScores,
        audioProfile: AudioProfile
    ): AbilityScores {
        const { bass_dominance = 0, mid_dominance = 0, treble_dominance = 0 } = audioProfile;

        // Calculate influence bonuses (each max 1 point per dominant frequency)
        let strBonus = 0;
        let dexBonus = 0;
        let conBonus = 0;
        let wisBonus = 0;
        let chaBonus = 0;

        // Bass influence → STR and CON
        if (bass_dominance > 0.6) {
            strBonus = 1;
            conBonus = 1;
        } else if (bass_dominance > 0.4) {
            // Moderate bass gives partial bonus to one stat
            strBonus = 1;
        }

        // Treble influence → DEX
        if (treble_dominance > 0.6) {
            dexBonus = 1;
        }

        // Mid influence → WIS and CHA
        if (mid_dominance > 0.6) {
            wisBonus = 1;
            chaBonus = 1;
        } else if (mid_dominance > 0.4) {
            // Moderate mid gives partial bonus to one stat
            wisBonus = 1;
        }

        // Balanced audio (no single frequency dominates) → small bonus to all
        const isBalanced =
            bass_dominance < 0.5 &&
            mid_dominance < 0.5 &&
            treble_dominance < 0.5 &&
            Math.abs(bass_dominance - mid_dominance) < 0.2 &&
            Math.abs(mid_dominance - treble_dominance) < 0.2;

        if (isBalanced) {
            strBonus = 1;
            dexBonus = 1;
            conBonus = 1;
            wisBonus = 1;
            chaBonus = 1;
        }

        // Apply bonuses with cap
        return {
            STR: Math.min(stats.STR + strBonus, stats.STR + EnemyGenerator.MAX_AUDIO_INFLUENCE),
            DEX: Math.min(stats.DEX + dexBonus, stats.DEX + EnemyGenerator.MAX_AUDIO_INFLUENCE),
            CON: Math.min(stats.CON + conBonus, stats.CON + EnemyGenerator.MAX_AUDIO_INFLUENCE),
            INT: stats.INT, // INT not affected by audio
            WIS: Math.min(stats.WIS + wisBonus, stats.WIS + EnemyGenerator.MAX_AUDIO_INFLUENCE),
            CHA: Math.min(stats.CHA + chaBonus, stats.CHA + EnemyGenerator.MAX_AUDIO_INFLUENCE)
        };
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
        rng: SeededRNG,
        cr?: number
    ): Record<string, unknown>[] {
        // Start with signature ability
        const signatureAbility = EnemyGenerator.scaleSignatureAbility(
            template.signatureAbility,
            rarity
        );

        const abilities: Record<string, unknown>[] = [signatureAbility];

        // Check if enemy should have spellcasting
        if (SpellcastingGenerator.shouldHaveSpellcasting(template.archetype, rarity)) {
            const spellCR = cr || EnemyGenerator.getCRForRarity(rarity);
            const spellConfig = SpellcastingGenerator.generateSpellListWithRNG({
                archetype: template.archetype,
                rarity,
                cr: spellCR,
                rng
            });

            // Convert spells to feature objects with isSpell property
            const spellFeatures = SpellcastingGenerator.spellsToFeatures(spellConfig);

            // Add spell features to abilities
            abilities.push(...spellFeatures as Record<string, unknown>[]);
        }

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
     * - Audio-influenced stat adjustments (when audioProfile provided)
     * - Signature ability with scaled damage die
     * - Extra abilities from FeatureQuery (for higher rarities)
     * - Resistances for Elite+ tiers
     *
     * Audio influence applies subtle stat bonuses based on frequency dominance:
     * - Bass → STR/CON, Treble → DEX, Mid → WIS/CHA, Balanced → +1 to all
     * - Maximum +2 increase per stat from audio (capped)
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
     * // Generate with audio influence (bass-heavy audio → stronger STR/CON)
     * const enemy = EnemyGenerator.generate({
     *   seed: 'battle-1',
     *   audioProfile: { bass_dominance: 0.8, mid_dominance: 0.1, treble_dominance: 0.1 },
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
        let scaledStats = EnemyGenerator.scaleStatsForRarity(template.baseStats, rarity);

        // Apply audio influence if audioProfile provided
        if (audioProfile) {
            scaledStats = EnemyGenerator.applyAudioStatInfluence(scaledStats, audioProfile);
        }

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

        // Calculate level from CR (simplified formula)
        // For V1, we use a simple level 1-3 mapping based on rarity
        const level = EnemyGenerator.getLevelForRarity(rarity);

        // Proficiency bonus based on level
        const proficiencyBonus = Math.ceil(1 + (level - 1) / 4);

        // Calculate CR for spell slot determination
        const cr = EnemyGenerator.getCRForRarity(rarity);

        // Generate all abilities (signature + extras from FeatureQuery)
        const abilities = EnemyGenerator.generateAbilities(template, rarity, rng, cr);

        // Generate legendary actions for boss rarity
        let legendaryActions: Record<string, unknown>[] = [];
        if (LegendaryGenerator.shouldHaveLegendary(rarity)) {
            // Create dedicated RNG for legendary action generation
            const legendaryRNG = EnemyGenerator.getSeededRNG(`${seed}-legendary`);
            const legendaryConfig = LegendaryGenerator.generateWithRNG({
                archetype: template.archetype,
                cr,
                rng: legendaryRNG
            });

            // Convert legendary actions to feature objects
            legendaryActions = legendaryConfig.actions.map(action => ({
                id: action.id,
                name: action.name,
                description: action.description,
                type: 'active' as const,
                class: 'Enemy' as const,
                level: 1,
                source: 'legendary' as const,
                tags: action.tags || ['legendary'],
                effects: [],
                // Include legendary-specific data
                legendary_cost: action.cost,
                legendary_effect: action.effect,
                legendary_damage: action.damage,
                legendary_damage_type: action.damageType
            }));

            // Add legendary actions to abilities
            abilities.push(...legendaryActions);
        }

        // Note: Resistances/immunities for Elite+ enemies will be integrated in V2
        // when CharacterSheet type is extended to support them
        // Currently tracked via template.resistances but not applied to character sheet

        // Generate equipment for this enemy
        const equipmentConfig = EnemyEquipmentGenerator.generate({
            archetype: template.archetype,
            rarity,
            seed: `${seed}-equipment`
        });

        // Build weapon array from equipment config
        const weapons: Array<{ name: string; damage: string; damage_dice: string; damage_type: string; type: string; range?: number; properties?: string[]; equipped: boolean }> = [];

        if (equipmentConfig.weapon) {
            const weaponName = EnemyEquipmentGenerator.getEquipmentName(equipmentConfig.weapon.id);
            const weaponData = DEFAULT_EQUIPMENT[weaponName];

            if (weaponData) {
                // Use signature ability damage die (scales by rarity: d6->d8->d10->d12)
                const signatureDamageDie = EnemyGenerator.getDamageDieForRarity(rarity);
                weapons.push({
                    name: weaponName,
                    damage: `${signatureDamageDie} + ${EnemyGenerator.getAbilityModifierForRarity(rarity)}`,
                    damage_dice: signatureDamageDie,
                    damage_type: weaponData.damage?.damageType || template.signatureAbility.damageType,
                    type: template.signatureAbility.attackType,
                    range: template.signatureAbility.range,
                    properties: equipmentConfig.weapon.properties || [],
                    equipped: true
                });
            }
        }

        // If no weapon generated, use signature ability as natural weapon
        if (weapons.length === 0) {
            weapons.push({
                name: template.signatureAbility.name,
                damage: `${EnemyGenerator.getDamageDieForRarity(rarity)} + ${EnemyGenerator.getAbilityModifierForRarity(rarity)}`,
                damage_dice: EnemyGenerator.getDamageDieForRarity(rarity),
                damage_type: template.signatureAbility.damageType,
                type: template.signatureAbility.attackType,
                range: template.signatureAbility.range,
                properties: template.signatureAbility.properties || [],
                equipped: true
            });
        }

        // Build armor array from equipment config
        const armor: string[] = [];
        let acModifier = 0;

        if (equipmentConfig.armor) {
            const armorName = EnemyEquipmentGenerator.getEquipmentName(equipmentConfig.armor.id);
            armor.push(armorName);
            // Use armor's AC bonus instead of base template AC
            if (equipmentConfig.armor.acBonus) {
                acModifier = equipmentConfig.armor.acBonus - template.baseAC;
            }
        }

        // Shield bonus
        if (equipmentConfig.shield) {
            const shieldName = EnemyEquipmentGenerator.getEquipmentName(equipmentConfig.shield.id);
            armor.push(shieldName);
            if (equipmentConfig.shield.acBonus) {
                acModifier += equipmentConfig.shield.acBonus;
            }
        }

        // Recalculate AC with equipment modifiers
        const armorClass = template.baseAC + abilityModifiers.DEX + acModifier;

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

            // Equipment - enemies now use generated equipment
            equipment: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                weapons: weapons as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                armor: armor as any,
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

    /**
     * Generate a CR from rarity for encounter calculations
     *
     * Maps rarity tiers to approximate Challenge Rating values.
     * Common: CR 1/4, Uncommon: CR 1/2, Elite: CR 1, Boss: CR 2
     *
     * @param rarity - Enemy rarity tier
     * @returns Approximate CR value
     */
    private static getCRForRarity(rarity: EnemyRarity): number {
        const crMap: Record<EnemyRarity, number> = {
            common: 0.25,
            uncommon: 0.5,
            elite: 1.0,
            boss: 2.0
        };
        return crMap[rarity] || 0.25;
    }

    /**
     * Get rarity from approximate CR
     *
     * Maps CR values back to rarity tiers for encounter building.
     * CR < 0.5: common, CR < 1: uncommon, CR < 2: elite, CR >= 2: boss
     *
     * @param cr - Challenge Rating value
     * @returns Corresponding rarity tier
     */
    private static getRarityFromCR(cr: number): EnemyRarity {
        if (cr < 0.5) return 'common';
        if (cr < 1.0) return 'uncommon';
        if (cr < 2.0) return 'elite';
        return 'boss';
    }

    /**
     * Generate a balanced encounter for a party
     *
     * Uses PartyAnalyzer to determine appropriate enemy strength based on party level
     * and desired difficulty. Supports leader promotion for larger groups.
     *
     * @param party - Array of party members' character sheets
     * @param options - Encounter generation options
     * @returns Array of generated enemies
     *
     * @example
     * ```typescript
     * const enemies = EnemyGenerator.generateEncounter(party, {
     *   seed: 'dungeon-1',
     *   difficulty: 'medium',
     *   count: 5
     * });
     * // Returns 5 enemies balanced for the party's level
     * // One enemy will be promoted to uncommon as leader
     * ```
     */
    static generateEncounter(
        party: CharacterSheet[],
        options: EncounterGenerationOptions
    ): CharacterSheet[] {
        const {
            seed,
            count,
            difficulty = 'medium',
            baseRarity = 'common',
            difficultyMultiplier = 1.0,
            category,
            archetype,
            templateId,
            enemyMix = 'uniform',
            templates,
            audioProfile,
            track,
            enableLeaderPromotion = true
        } = options;

        // Validate: track required if audioProfile provided
        if (audioProfile && !track) {
            throw new Error('track is required when audioProfile is provided');
        }

        // Handle empty party or zero count
        if (count <= 0) {
            return [];
        }

        // Calculate XP budget from party
        const partyLevels = party.map(p => p.level);
        const xpBudget = getXPBudgetForParty(partyLevels, difficulty);

        // Apply difficulty multiplier
        const adjustedBudget = Math.round(xpBudget * difficultyMultiplier);

        // Get encounter multiplier for the count
        const encounterMultiplier = getEncounterMultiplier(count);

        // Calculate effective XP budget per enemy (after multiplier)
        // Formula: (totalBudget / multiplier) / count
        const xpPerEnemy = Math.round((adjustedBudget / encounterMultiplier) / count);

        // Convert to CR
        let targetCR = getCRFromXP(xpPerEnemy);

        // Apply slight variance for variety (+/- 1 step)
        const rng = EnemyGenerator.getSeededRNG(seed);
        const varianceRoll = rng.random();
        if (varianceRoll < 0.25) {
            // Slightly harder
            targetCR = Math.min(targetCR * 1.5, 30);
        } else if (varianceRoll > 0.75) {
            // Slightly easier
            targetCR = Math.max(targetCR * 0.67, 0.125);
        }

        // Determine rarity from CR
        const rarity = EnemyGenerator.getRarityFromCR(targetCR);

        // Select templates for mix mode
        const selectedTemplates = EnemyGenerator.selectTemplatesForMix(
            count,
            rng,
            enemyMix,
            templates,
            category,
            archetype,
            audioProfile
        );

        // Generate each enemy
        const enemies: CharacterSheet[] = [];
        for (let i = 0; i < count; i++) {
            const template = selectedTemplates[i];
            if (!template) {
                throw new Error(`No template available for enemy at index ${i}`);
            }

            const enemy = EnemyGenerator.generate({
                seed: `${seed}-${i}`,
                templateId: template.id,
                rarity,
                difficultyMultiplier,
                audioProfile,
                track
            });

            enemies.push(enemy);
        }

        // Apply leader promotion
        if (enableLeaderPromotion) {
            EnemyGenerator.applyLeaderPromotion(enemies, rng, baseRarity);
        }

        return enemies;
    }

    /**
     * Generate an encounter based on target CR (no party needed)
     *
     * Creates enemies at a specific Challenge Rating, independent of any party.
     * Useful for pre-planned encounters or when the party strength is unknown.
     *
     * @param options - Encounter generation options (must include targetCR)
     * @returns Array of generated enemies
     *
     * @example
     * ```typescript
     * const enemies = EnemyGenerator.generateEncounterByCR({
     *   seed: 'cr5-encounter',
     *   targetCR: 5,
     *   count: 3
     * });
     * // Returns 3 enemies at approximately CR 5 each
     * ```
     */
    static generateEncounterByCR(options: EncounterGenerationOptions): CharacterSheet[] {
        const {
            seed,
            count = 1,
            targetCR = 1,
            baseRarity = 'common',
            difficultyMultiplier = 1.0,
            category,
            archetype,
            templateId,
            enemyMix = 'uniform',
            templates,
            audioProfile,
            track,
            enableLeaderPromotion = true
        } = options;

        // Validate: track required if audioProfile provided
        if (audioProfile && !track) {
            throw new Error('track is required when audioProfile is provided');
        }

        // Handle zero count
        if (count <= 0) {
            return [];
        }

        // Validate targetCR
        if (targetCR < 0) {
            throw new Error(`Invalid targetCR: ${targetCR}. Must be >= 0`);
        }

        // Get encounter multiplier for the count
        const encounterMultiplier = getEncounterMultiplier(count);

        // Apply multiplier to target CR (groups of weaker enemies)
        // When multiplier > 1, we can use slightly higher CR since action economy favors players
        let effectiveCR = targetCR;
        if (encounterMultiplier > 1 && count > 1) {
            // Slightly reduce individual CR for groups
            effectiveCR = Math.max(targetCR / Math.sqrt(encounterMultiplier), 0.125);
        }

        // Determine rarity from CR
        const rarity = EnemyGenerator.getRarityFromCR(effectiveCR);

        // Create RNG
        const rng = EnemyGenerator.getSeededRNG(seed);

        // Select templates for mix mode
        const selectedTemplates = EnemyGenerator.selectTemplatesForMix(
            count,
            rng,
            enemyMix,
            templates,
            category,
            archetype,
            audioProfile
        );

        // Generate each enemy
        const enemies: CharacterSheet[] = [];
        for (let i = 0; i < count; i++) {
            const template = selectedTemplates[i];
            if (!template) {
                throw new Error(`No template available for enemy at index ${i}`);
            }

            const enemy = EnemyGenerator.generate({
                seed: `${seed}-${i}`,
                templateId: template.id,
                rarity,
                difficultyMultiplier,
                audioProfile,
                track
            });

            enemies.push(enemy);
        }

        // Apply leader promotion
        if (enableLeaderPromotion) {
            EnemyGenerator.applyLeaderPromotion(enemies, rng, baseRarity);
        }

        return enemies;
    }

    /**
     * Select templates for each enemy in an encounter based on mix mode
     *
     * Handles uniform, custom, category, and random mix modes.
     *
     * @param count - Number of enemies to generate
     * @param rng - Seeded RNG for deterministic selection
     * @param enemyMix - Mix mode to use
     * @param templates - Custom template list for 'custom' mode
     * @param category - Category filter for 'category' mode
     * @param archetype - Archetype filter
     * @param audioProfile - Optional audio profile for weighting
     * @returns Array of selected templates (one per enemy)
     */
    private static selectTemplatesForMix(
        count: number,
        rng: SeededRNG,
        enemyMix: 'uniform' | 'custom' | 'category' | 'random',
        templates?: string[],
        category?: EnemyCategory,
        archetype?: EnemyArchetype,
        audioProfile?: AudioProfile
    ): EnemyTemplate[] {
        const result: EnemyTemplate[] = [];

        if (enemyMix === 'custom' && templates) {
            // Custom mix: use provided templates directly
            for (let i = 0; i < count; i++) {
                const templateId = templates[i % templates.length];
                const template = EnemyGenerator.getTemplateById(templateId);
                if (!template) {
                    throw new Error(`Unknown template ID in custom mix: ${templateId}`);
                }
                result.push(template);
            }
        } else if (enemyMix === 'category') {
            // Category mode: validate category is provided, then mix enemies from the same category
            if (!category) {
                throw new Error('category option is required when using enemyMix: "category"');
            }

            // For each enemy, randomly select from templates in the specified category
            for (let i = 0; i < count; i++) {
                const template = EnemyGenerator.selectTemplate(
                    rng,
                    category,
                    archetype,
                    audioProfile
                );
                result.push(template);
            }
        } else if (enemyMix === 'random') {
            // Random mode: select from ALL available templates independently
            // Each enemy can be any template, creating thematically disjoint encounters
            for (let i = 0; i < count; i++) {
                const template = EnemyGenerator.selectTemplate(
                    rng,
                    undefined, // No category filter - select from all
                    archetype,
                    audioProfile
                );
                result.push(template);
            }
        } else {
            // Uniform mode: select one template for all enemies
            const singleTemplate = EnemyGenerator.selectTemplate(
                rng,
                category,
                archetype,
                audioProfile
            );

            // All enemies use the same template
            for (let i = 0; i < count; i++) {
                result.push(singleTemplate);
            }
        }

        return result;
    }

    /**
     * Apply leader promotion to a group of enemies
     *
     * Promotes one or more enemies to higher rarity tiers based on group size.
     * This creates "leader" enemies that are stronger than their followers.
     *
     * Promotion rules:
     * - 4-6 enemies: 1 enemy promoted +1 tier
     * - 7-9 enemies: 1 enemy promoted +2 tiers
     * - 10+ enemies: 2 enemies promoted (1 one tier, 1 two tiers)
     *
     * @param enemies - Array of generated enemies (will be modified in place)
     * @param rng - Seeded RNG for deterministic selection
     * @param baseRarity - The base rarity before promotion
     */
    private static applyLeaderPromotion(
        enemies: CharacterSheet[],
        rng: SeededRNG,
        baseRarity: EnemyRarity
    ): void {
        const count = enemies.length;

        if (count < 4) {
            // No leader for small groups
            return;
        }

        // Determine promotion rules
        const promotions: Array<{ index: number; rarity: EnemyRarity }> = [];

        if (count >= 4 && count <= 6) {
            // One leader, one tier up
            const leaderIndex = rng.randomInt(0, count);
            const newRarity = EnemyGenerator.promoteRarity(baseRarity, 1);
            promotions.push({ index: leaderIndex, rarity: newRarity });
        } else if (count >= 7 && count <= 9) {
            // One leader, two tiers up
            const leaderIndex = rng.randomInt(0, count);
            const newRarity = EnemyGenerator.promoteRarity(baseRarity, 2);
            promotions.push({ index: leaderIndex, rarity: newRarity });
        } else if (count >= 10) {
            // Two leaders: one one tier, one two tiers
            const leader1Index = rng.randomInt(0, count);
            let leader2Index = rng.randomInt(0, count);
            // Ensure second leader is different from first
            while (leader2Index === leader1Index && count > 1) {
                leader2Index = rng.randomInt(0, count);
            }
            promotions.push(
                { index: leader1Index, rarity: EnemyGenerator.promoteRarity(baseRarity, 1) },
                { index: leader2Index, rarity: EnemyGenerator.promoteRarity(baseRarity, 2) }
            );
        }

        // Re-generate promoted enemies with new rarity
        for (const promotion of promotions) {
            const originalEnemy = enemies[promotion.index];
            // Get the template ID from the enemy's name (which matches template name)
            const templateId = originalEnemy.name.toLowerCase().replace(/\s+/g, '-');
            const template = EnemyGenerator.getTemplateById(templateId);

            if (template) {
                const promotedEnemy = EnemyGenerator.generate({
                    seed: originalEnemy.seed as string + '-promoted',
                    templateId: template.id,
                    rarity: promotion.rarity
                });
                enemies[promotion.index] = promotedEnemy;
            }
        }
    }

    /**
     * Promote a rarity by a number of tiers
     *
     * Increases rarity tier by specified amount, capped at 'boss'.
     *
     * @param currentRarity - Starting rarity
     * @param tiers - Number of tiers to promote
     * @returns Promoted rarity (capped at 'boss')
     *
     * @example
     * ```typescript
     * promoteRarity('common', 1); // 'uncommon'
     * promoteRarity('uncommon', 2); // 'boss'
     * promoteRarity('elite', 5); // 'boss' (capped)
     * ```
     */
    private static promoteRarity(currentRarity: EnemyRarity, tiers: number): EnemyRarity {
        const rarities: EnemyRarity[] = ['common', 'uncommon', 'elite', 'boss'];
        const currentIndex = rarities.indexOf(currentRarity);
        const newIndex = Math.min(currentIndex + tiers, rarities.length - 1);
        return rarities[newIndex];
    }
}
