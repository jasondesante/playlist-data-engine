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
import { SpellcastingGenerator, type SpellcastingConfig } from './SpellcastingGenerator.js';
import { LegendaryGenerator, type LegendaryAction, type LegendaryConfig } from './LegendaryGenerator.js';
import { DEFAULT_EQUIPMENT } from '../../constants/DefaultEquipment.js';
import { crToLevel } from './CRLevelConverter.js';

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
     * Scale ability scores based on rarity tier and optional CR
     *
     * Applies the rarity multiplier to each ability score.
     * If CR is provided, also applies fractional CR reduction for sub-level enemies.
     * Results are rounded to nearest integer.
     *
     * The multipliers are applied in order:
     * 1. Fractional CR multiplier (if CR < 1) - reduces stats for sub-level enemies
     * 2. Rarity multiplier - minor complexity-based stat adjustment (max 12%)
     *
     * DESIGN PRINCIPLE: Rarity affects complexity, CR affects power.
     * The rarity statMultiplier is intentionally small (1.0-1.12) to avoid
     * overpowering enemies. CR handles the primary power scaling.
     *
     * @param baseStats - Base ability scores from template
     * @param rarity - Rarity tier for scaling
     * @param cr - Optional Challenge Rating for fractional CR stat reduction
     * @returns Scaled ability scores
     *
     * @example
     * ```typescript
     * // Rarity only (backward compatible)
     * scaleStatsForRarity({ STR: 16, DEX: 12, CON: 14 }, 'elite');
     * // Returns: { STR: 17, DEX: 13, CON: 15 } (1.07x multiplier - minor complexity boost)
     *
     * // With fractional CR (CR 0.25 = 75% stats before rarity)
     * scaleStatsForRarity({ STR: 16, DEX: 12, CON: 14 }, 'elite', 0.25);
     * // Returns: { STR: 13, DEX: 10, CON: 11 } (0.75 * 1.07 = 0.8025x multiplier)
     * ```
     */
    private static scaleStatsForRarity(
        baseStats: AbilityScores,
        rarity: EnemyRarity,
        cr?: number
    ): AbilityScores {
        const config = getRarityConfig(rarity);

        // Build combined multiplier:
        // 1. Start with rarity multiplier
        let multiplier = config.statMultiplier;

        // 2. Apply fractional CR reduction ONLY when CR is explicitly provided
        //    This is for when CR is passed as a separate parameter (Task 1.4)
        //    We do NOT apply this when deriving CR from rarity (backward compat)
        if (cr !== undefined) {
            const crMultiplier = EnemyGenerator.getStatMultiplierForFractionalCR(cr);
            multiplier = crMultiplier * multiplier;
        }

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
     * Boss title suffixes for name generation
     *
     * Used to add epic titles to boss enemies.
     */
    private static readonly BOSS_TITLES = [
        'the Destroyer',
        'the Unbreakable',
        'the Annihilator',
        'the Fearless',
        'the Ancient',
        'Lord of Ruin',
        'the World-Ender',
        'the Eternal',
        'King of Ruin',
        'the Indomitable',
        'the Void Walker',
        'Master of Destruction',
        'the Fallen',
        'the Ascendant',
        'the Heartless',
        'Sovereign of Pain',
        'the Soul Render',
        'the Undying',
        'the Chaos Bringer',
        'Lord of Death',
        'the World Breaker',
        'the Timeless',
        'the Forgotten'
    ];

    /**
     * Boss title prefixes for name generation
     *
     * Alternative title format for boss enemies.
     */
    private static readonly BOSS_PREFIXES = [
        'Great',
        'Eternal',
        'Ancient',
        'Dread',
        'High',
        'Dark',
        'Void',
        'Blood',
        'Iron',
        'Storm'
    ];

    /**
     * Generate boss-specific name enhancements
     *
     * Adds epic title or prefix to boss name for flavor.
     * Format options:
     * - "{name}, {title}" (e.g., "Orc, the Destroyer")
     * - "{prefix} {name}" (e.g., "Great Orc")
     * - "{name} of {realm}" (e.g., "Orc of the Void")
     *
     * @param baseName - Base enemy name from template
     * @param rng - Seeded RNG for deterministic selection
     * @returns Enhanced boss name
     *
     * @example
     * ```typescript
     * generateBossName('Orc', rng); // "Orc, the Destroyer"
     * generateBossName('Bear', rng); // "Great Bear"
     * generateBossName('Dragon', rng); // "Dragon of the Void"
     * ```
     */
    private static generateBossName(baseName: string, rng: SeededRNG): string {
        const formatRoll = rng.random();

        // 50%: suffix format "{name}, {title}"
        if (formatRoll < 0.5) {
            const title = rng.randomChoice(EnemyGenerator.BOSS_TITLES);
            return `${baseName}, ${title}`;
        }

        // 30%: prefix format "{prefix} {name}"
        if (formatRoll < 0.8) {
            const prefix = rng.randomChoice(EnemyGenerator.BOSS_PREFIXES);
            return `${prefix} ${baseName}`;
        }

        // 20%: of-format "{name} of {realm}"
        const realms = [
            'the Void', 'Ruin', 'Pain', 'Death', 'the Abyss',
            'the Forgotten Lands', 'Eternal Night', 'Chaos', 'Doom',
            'the Broken World', 'Shadows', 'the Endless Void'
        ];
        const realm = rng.randomChoice(realms);
        return `${baseName} of ${realm}`;
    }

    /**
     * Generate boss-specific ability enhancements
     *
     * For boss rarity, enhances the signature ability and adds an ultimate ability:
     * - Signature ability damage dice are doubled (d12 → 2d12)
     * - Ultimate ability: One powerful ability usable once per encounter
     *
     * @param template - Enemy template
     * @param signatureAbility - Already scaled signature ability
     * @param rng - Seeded RNG for deterministic selection
     * @returns Array of boss-enhanced abilities
     *
     * @example
     * ```typescript
     * const bossFeatures = generateBossFeatures(orcTemplate, scaledSignature, rng);
     * // Returns: [enhancedSignatureAbility, ultimateAbility]
     * ```
     */
    private static generateBossFeatures(
        template: EnemyTemplate,
        signatureAbility: Record<string, unknown>,
        rng: SeededRNG
    ): Record<string, unknown>[] {
        const bossFeatures: Record<string, unknown>[] = [];

        // Enhance signature ability: double the damage dice for boss
        // d6 → 2d6, d8 → 2d8, d10 → 2d10, d12 → 2d12
        const enhancedSignature = { ...signatureAbility };
        if (enhancedSignature.attack && typeof enhancedSignature.attack === 'object') {
            const attack = enhancedSignature.attack as { damage_dice?: string; damage?: string };
            if (attack.damage_dice) {
                // Extract die size and double it
                const match = attack.damage_dice.match(/^d(\d+)$/);
                if (match) {
                    const dieSize = parseInt(match[1]!, 10);
                    attack.damage_dice = `2d${dieSize}`;
                    // Also update the full damage string
                    const damageMatch = attack.damage?.match(/^(\d+d\d+)(\s*\+\s*\d+)?$/);
                    if (damageMatch) {
                        const baseDice = damageMatch[1];
                        const modifier = damageMatch[2] || '';
                        attack.damage = `${baseDice.replace(/^d\d+$/, `2d${dieSize}`)}${modifier}`;
                    }
                }
            }
        }
        bossFeatures.push(enhancedSignature);

        // Generate ultimate ability based on archetype
        const ultimateAbility = EnemyGenerator.generateUltimateAbility(template.archetype, rng);
        bossFeatures.push(ultimateAbility);

        return bossFeatures;
    }

    /**
     * Generate an ultimate ability for boss enemies
     *
     * Creates a powerful ability usable once per encounter.
     * Each archetype has its own pool of ultimate abilities.
     *
     * @param archetype - Enemy archetype for ability selection
     * @param rng - Seeded RNG for deterministic selection
     * @returns Ultimate ability as a feature object
     */
    private static generateUltimateAbility(
        archetype: EnemyArchetype,
        rng: SeededRNG
    ): Record<string, unknown> {
        // Ultimate ability pools by archetype
        const bruteUltimates: Array<{ id: string; name: string; description: string; damage: string; damageType: string }> = [
            {
                id: 'cataclysmic_smash',
                name: 'Cataclysmic Smash',
                description: 'The boss unleashes all its power in a devastating blow that cracks the earth itself.',
                damage: '6d12 + 10',
                damageType: 'bludgeoning'
            },
            {
                id: 'unbreaking_frenzy',
                name: 'Unbreaking Frenzy',
                description: 'The boss enters a state of pure rage, attacking everything nearby with impossible speed.',
                damage: '4d10 + 8',
                damageType: 'slashing'
            },
            {
                id: 'world_ender',
                name: 'World Ender',
                description: 'A single attack charged with all the boss\'s strength, capable of felling the mightiest foes.',
                damage: '8d8 + 12',
                damageType: 'bludgeoning'
            }
        ];

        const archerUltimates: Array<{ id: string; name: string; description: string; damage: string; damageType: string }> = [
            {
                id: 'phantom_ barrage',
                name: 'Phantom Barrage',
                description: 'The boss fires ethereal arrows that phase through cover, striking all enemies in a massive cone.',
                damage: '5d8 + 8',
                damageType: 'piercing'
            },
            {
                id: 'death_from_above',
                name: 'Death from Above',
                description: 'The boss leaps impossibly high, then rains destruction in a devastating area attack.',
                damage: '4d10 + 10',
                damageType: 'piercing'
            },
            {
                id: 'final_Stand',
                name: 'Final Stand',
                description: 'With uncanny precision, the boss fires a single arrow that cannot miss, dealing massive damage.',
                damage: '10d6 + 15',
                damageType: 'piercing'
            }
        ];

        type UltimateAbilityWithDamage = {
            id: string;
            name: string;
            description: string;
            damage: string;
            damageType: string;
        };

        type UltimateAbilityWithEffect = {
            id: string;
            name: string;
            description: string;
            effect: string;
        };

        const supportUltimates: UltimateAbilityWithEffect[] = [
            {
                id: 'dark_miracle',
                name: 'Dark Miracle',
                description: 'The boss performs a ritual of incredible power, completely healing itself and all allies.',
                effect: 'Heal self and all allies for 50% max HP'
            },
            {
                id: 'soul_anchor',
                name: 'Soul Anchor',
                description: 'The boss binds the souls of all creatures nearby, preventing all movement and actions for a duration.',
                effect: 'AoE stun/paralyze all creatures, no save'
            },
            {
                id: 'realm_of_despair',
                name: 'Realm of Despair',
                description: 'The boss projects an aura of pure hopelessness, weakening all enemies\' attacks and defenses.',
                effect: 'All enemies have disadvantage on attacks and -2 AC'
            }
        ];

        // Select ultimate based on archetype
        let selected: UltimateAbilityWithDamage | UltimateAbilityWithEffect;
        let damageType = 'bludgeoning';

        switch (archetype) {
            case 'brute':
                selected = rng.randomChoice(bruteUltimates) as UltimateAbilityWithDamage | UltimateAbilityWithEffect;
                damageType = 'bludgeoning';
                break;
            case 'archer':
                selected = rng.randomChoice(archerUltimates) as UltimateAbilityWithDamage | UltimateAbilityWithEffect;
                damageType = 'piercing';
                break;
            case 'support':
                selected = rng.randomChoice(supportUltimates) as UltimateAbilityWithDamage | UltimateAbilityWithEffect;
                break;
            default:
                selected = rng.randomChoice(bruteUltimates) as UltimateAbilityWithDamage | UltimateAbilityWithEffect;
                damageType = 'bludgeoning';
        }

        // Build ultimate ability feature object
        const ultimate: Record<string, unknown> = {
            id: selected.id,
            name: selected.name,
            description: selected.description,
            type: 'ultimate' as const,
            class: 'Enemy' as const,
            level: 1,
            source: 'boss' as const,
            tags: ['ultimate', 'once_per_encounter', archetype],
            effects: [],
            uses_per_encounter: 1,
            max_uses_per_encounter: 1
        };

        // Add damage info for combat abilities
        if ('damage' in selected) {
            const damageAbility = selected as UltimateAbilityWithDamage;
            ultimate.attack = {
                name: damageAbility.name,
                damage: damageAbility.damage,
                damage_dice: damageAbility.damage,
                damage_type: damageType,
                type: archetype === 'archer' ? 'ranged' : 'melee',
                properties: ['ultimate', 'once_per_encounter']
            };
        } else {
            const effectAbility = selected as UltimateAbilityWithEffect;
            ultimate.effect = effectAbility.effect;
        }

        return ultimate;
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
    ): { abilities: Record<string, unknown>[]; spellConfig?: SpellcastingConfig } {
        // Start with signature ability
        const signatureAbility = EnemyGenerator.scaleSignatureAbility(
            template.signatureAbility,
            rarity
        );

        const abilities: Record<string, unknown>[] = [signatureAbility];
        let spellConfig: SpellcastingConfig | undefined;

        // Check if enemy should have spellcasting
        if (SpellcastingGenerator.shouldHaveSpellcasting(template.archetype, rarity)) {
            const spellCR = cr || EnemyGenerator.getCRForRarity(rarity);
            spellConfig = SpellcastingGenerator.generateSpellListWithRNG({
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

        return { abilities, spellConfig };
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
            cr: explicitCR,
            level: explicitLevel,
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

        // Calculate CR: use explicit CR or derive from rarity
        const cr = explicitCR ?? EnemyGenerator.getCRForRarity(rarity);

        // Calculate level: use explicit level override, or derive from CR
        // Level is now determined by CR, not rarity (per Task 1.4)
        const level = explicitLevel ?? EnemyGenerator.getLevelFromCR(cr);

        // Scale stats by rarity, passing CR for fractional CR stat reduction
        // When CR is explicitly provided (not derived from rarity), apply fractional reduction
        let scaledStats = EnemyGenerator.scaleStatsForRarity(
            template.baseStats,
            rarity,
            explicitCR // Only pass CR if explicitly provided (not derived from rarity)
        );

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

        // Calculate HP with rarity multiplier
        // Apply fractional CR reduction only when CR is explicitly provided (not derived from rarity)
        let hpMultiplier = rarityConfig.statMultiplier;
        if (explicitCR !== undefined) {
            const crMultiplier = EnemyGenerator.getStatMultiplierForFractionalCR(cr);
            hpMultiplier = crMultiplier * hpMultiplier;
        }
        let maxHp = Math.round(template.baseHP * hpMultiplier);

        // Apply difficulty multiplier to HP
        if (difficultyMultiplier !== 1.0) {
            maxHp = Math.round(maxHp * difficultyMultiplier);
        }

        // Proficiency bonus based on level (level now comes from CR, not rarity)
        const proficiencyBonus = Math.ceil(1 + (level - 1) / 4);

        // Check if enemy should have spellcasting (using cr calculated above)
        const shouldHaveSpells = SpellcastingGenerator.shouldHaveSpellcasting(template.archetype, rarity);

        // Generate all abilities (signature + extras from FeatureQuery)
        const { abilities: generatedAbilities, spellConfig } = EnemyGenerator.generateAbilities(template, rarity, rng, cr);

        // Apply boss-specific enhancements for boss rarity
        // This replaces the signature ability with an enhanced version (double damage dice)
        // and adds an ultimate ability usable once per encounter
        // Boss enemies do NOT get spellcasting - they get ultimate abilities instead
        let abilities = generatedAbilities;
        if (rarity === 'boss') {
            // Extract the original signature ability (first element) for enhancement
            const signatureAbility = abilities[0];
            const bossFeatures = EnemyGenerator.generateBossFeatures(
                template,
                signatureAbility,
                rng
            );
            // Replace abilities with boss-enhanced versions
            abilities = bossFeatures;
        }

        // Generate legendary actions for boss rarity
        let legendaryActions: Record<string, unknown>[] = [];
        let legendaryConfig: LegendaryConfig | undefined;
        if (LegendaryGenerator.shouldHaveLegendary(rarity)) {
            // Create dedicated RNG for legendary action generation
            const legendaryRNG = EnemyGenerator.getSeededRNG(`${seed}-legendary`);
            legendaryConfig = LegendaryGenerator.generateWithRNG({
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
            // Use template name as enemy name, with boss enhancement
            name: rarity === 'boss' ? EnemyGenerator.generateBossName(template.name, rng) : template.name,

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

            // Spells — populated from SpellcastingConfig when enemy has spellcasting
            // Boss enemies have spellConfig but abilities are replaced; spells remain populated
            // for future use but are not active in boss combat (boss uses ultimate abilities)
            spells: spellConfig ? {
                spell_slots: Object.fromEntries(
                    Object.entries(spellConfig.slots).map(([level, count]) => [
                        Number(level),
                        { total: count, used: 0 }
                    ])
                ),
                known_spells: spellConfig.spells.map(s => s.name),
                cantrips: spellConfig.cantrips.map(s => s.name)
            } : {
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
            generated_at: new Date().toISOString(),

            // CR for frontend validation (enables verifying CR → level mapping)
            // Undefined if CR was not explicitly provided (backward compat)
            ...(cr !== undefined ? { cr } : {}),

            // Legendary configuration for boss enemies
            ...(legendaryConfig ? {
                legendary_config: {
                    resistances_per_day: legendaryConfig.resistances,
                    actions: legendaryConfig.actions.map(action => ({
                        id: action.id,
                        name: action.name,
                        cost: action.cost,
                        effect: action.effect,
                        damage: action.damage,
                        damage_type: action.damageType
                    })),
                    lair_action_hint: legendaryConfig.lairActionHint
                }
            } : {})
        };

        return character;
    }

    /**
     * Get character level based on Challenge Rating
     *
     * In D&D 5e, CR is approximately equal to level for most creatures.
     * A CR 5 enemy is roughly equivalent to a level 5 character.
     *
     * This method uses CRLevelConverter.crToLevel() for the conversion,
     * which handles:
     * - CR 0.25 → level 0.25 (sub-level enemy, reduced base stats)
     * - CR 0.5 → level 0.5 (sub-level enemy, reduced base stats)
     * - CR 1+ → level = CR (standard mapping)
     *
     * Fractional CRs represent "sub-level" enemies that are weaker than
     * a level 1 character. These should have reduced stats applied via
     * getStatMultiplierForFractionalCR().
     *
     * @param cr - Challenge Rating (supports fractional values like 0.25, 0.5)
     * @returns Character level (may be fractional for sub-level enemies)
     *
     * @example
     * ```typescript
     * getLevelFromCR(0.25); // 0.25 (sub-level)
     * getLevelFromCR(0.5);  // 0.5 (sub-level)
     * getLevelFromCR(1);    // 1
     * getLevelFromCR(5);    // 5
     * getLevelFromCR(10);   // 10
     * ```
     */
    private static getLevelFromCR(cr: number): number {
        return crToLevel(cr);
    }

    /**
     * Get stat multiplier for fractional CR enemies
     *
     * Sub-level enemies (CR < 1) have reduced base stats to represent
     * their weaker nature. This multiplier is applied BEFORE the rarity
     * stat multiplier.
     *
     * Multiplier values:
     * - CR < 0.5 (e.g., CR 0.25): 75% base stats
     * - CR 0.5-0.99: 85% base stats
     * - CR 1+: 100% base stats (no reduction)
     *
     * @param cr - Challenge Rating (supports fractional values)
     * @returns Stat multiplier (0.75, 0.85, or 1.0)
     *
     * @example
     * ```typescript
     * getStatMultiplierForFractionalCR(0.25); // 0.75
     * getStatMultiplierForFractionalCR(0.5);  // 0.85
     * getStatMultiplierForFractionalCR(1);    // 1.0
     * getStatMultiplierForFractionalCR(5);    // 1.0
     * ```
     */
    private static getStatMultiplierForFractionalCR(cr: number): number {
        if (cr < 0.5) return 0.75;  // CR 0.25 = 75% stats
        if (cr < 1.0) return 0.85;  // CR 0.5 = 85% stats
        return 1.0;                  // CR 1+ = full stats
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
     * Generate a balanced encounter for a party
     *
     * Uses PartyAnalyzer to determine appropriate enemy strength based on party level
     * and desired difficulty. Supports leader promotion for larger groups.
     *
     * @param party - Array of party members' character sheets
     * @param options - Encounter generation options
     * @returns Array of generated enemies
     *
     * @throws Error if baseRarity='boss' and count > 1 (boss encounters must be single enemy)
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
     *
     * @example
     * ```typescript
     * // Boss encounters must be single enemy (1vparty design)
     * const boss = EnemyGenerator.generateEncounter(party, {
     *   seed: 'boss-fight',
     *   difficulty: 'deadly',
     *   count: 1,
     *   baseRarity: 'boss'
     * });
     * // Returns 1 boss enemy designed for solo encounter
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
            scaleRarityWithCR = false,
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

        // Validate: boss encounters must be single enemy (Task 2.4)
        // Boss enemies are designed for 1vparty encounters and should not be generated in groups
        if (baseRarity === 'boss' && count > 1) {
            throw new Error(
                `Boss encounters must have count=1. Requested count=${count} with baseRarity='boss'. ` +
                `Boss enemies are designed for solo encounters against a party. ` +
                `Use a lower rarity (common/uncommon/elite) for multi-enemy encounters, ` +
                `or set count=1 for a boss encounter.`
            );
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

        // Calculate rarity distribution based on scaleRarityWithCR option (Task 2.3)
        // When enabled, rarity scales gradually with CR
        // When disabled (default), use explicit baseRarity for all enemies
        const rarityDistribution = scaleRarityWithCR
            ? EnemyGenerator.getRarityDistribution(count, targetCR)
            : Array(count).fill(baseRarity) as EnemyRarity[];

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
                cr: targetCR, // Pass CR for proper level scaling (Task 1.4)
                rarity: rarityDistribution[i], // Use distributed rarity (Task 2.3)
                difficultyMultiplier,
                audioProfile,
                track
            });

            enemies.push(enemy);
        }

        // Apply leader promotion (skip if scaleRarityWithCR is enabled - already scaled)
        if (enableLeaderPromotion && !scaleRarityWithCR) {
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
     * @throws Error if baseRarity='boss' and count > 1 (boss encounters must be single enemy)
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
     *
     * @example
     * ```typescript
     * // Boss encounters must be single enemy (1vparty design)
     * const boss = EnemyGenerator.generateEncounterByCR({
     *   seed: 'boss-fight',
     *   targetCR: 10,
     *   count: 1,
     *   baseRarity: 'boss'
     * });
     * // Returns 1 boss enemy designed for solo encounter
     * ```
     */
    static generateEncounterByCR(options: EncounterGenerationOptions): CharacterSheet[] {
        const {
            seed,
            count = 1,
            targetCR = 1,
            baseRarity = 'common',
            scaleRarityWithCR = false,
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

        // Validate: boss encounters must be single enemy (Task 2.4)
        // Boss enemies are designed for 1vparty encounters and should not be generated in groups
        if (baseRarity === 'boss' && count > 1) {
            throw new Error(
                `Boss encounters must have count=1. Requested count=${count} with baseRarity='boss'. ` +
                `Boss enemies are designed for solo encounters against a party. ` +
                `Use a lower rarity (common/uncommon/elite) for multi-enemy encounters, ` +
                `or set count=1 for a boss encounter.`
            );
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

        // Calculate rarity distribution based on scaleRarityWithCR option (Task 2.3)
        // When enabled, rarity scales gradually with CR
        // When disabled (default), use explicit baseRarity for all enemies
        // Note: Use targetCR for rarity scaling (user-specified), not effectiveCR (internal)
        const rarityDistribution = scaleRarityWithCR
            ? EnemyGenerator.getRarityDistribution(count, targetCR)
            : Array(count).fill(baseRarity) as EnemyRarity[];

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
                cr: effectiveCR, // Pass CR for proper level scaling (Task 1.4)
                rarity: rarityDistribution[i], // Use distributed rarity (Task 2.3)
                difficultyMultiplier,
                audioProfile,
                track
            });

            enemies.push(enemy);
        }

        // Apply leader promotion (skip if scaleRarityWithCR is enabled - already scaled)
        if (enableLeaderPromotion && !scaleRarityWithCR) {
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
    // =========================================
    // CR-Based Gradual Rarity Scaling (Task 2.3)
    // =========================================

    /**
     * CR tier definitions for gradual rarity scaling
     *
     * When scaleRarityWithCR is enabled, higher CR encounters
     * automatically include upgraded rarities to match difficulty.
     */
    private static readonly CR_TIERS = {
        LOW:         { min: 0,    max: 2,   upgrades: 0 },  // CR 0-2
        LOW_MEDIUM:  { min: 3,    max: 5,   upgrades: 1 },  // CR 3-5
        MEDIUM:      { min: 6,    max: 10,  upgrades: 2 },  // CR 6-10
        MEDIUM_HIGH: { min: 11,   max: 15,  upgrades: 3 },  // CR 11-15
        HIGH:        { min: 16,   max: 20,  upgrades: 4 },  // CR 16-20
        VERY_HIGH:   { min: 21,   max: 30,  upgrades: 5 },  // CR 21-30
        EPIC:        { min: 31,   max: Infinity, upgrades: 6 }, // CR 31+
    };

    /**
     * Calculate the number of rarity upgrade points based on CR
     *
     * Higher CR encounters get more upgrade points to distribute
     * across enemies, creating more challenging encounters.
     *
     * @param cr - Challenge Rating
     * @returns Number of upgrade points to distribute
     *
     * @example
     * ```typescript
     * calculateUpgradePoints(1);  // 0 (Low tier)
     * calculateUpgradePoints(4);  // 1 (Low-Medium tier)
     * calculateUpgradePoints(8);  // 2 (Medium tier)
     * calculateUpgradePoints(18); // 4 (High tier)
     * calculateUpgradePoints(35); // 6 (Epic tier)
     * ```
     */
    private static calculateUpgradePoints(cr: number): number {
        if (cr >= EnemyGenerator.CR_TIERS.EPIC.min) return 6;        // Epic: CR 31+
        if (cr >= EnemyGenerator.CR_TIERS.VERY_HIGH.min) return 5;   // Very High: CR 21-30
        if (cr >= EnemyGenerator.CR_TIERS.HIGH.min) return 4;        // High: CR 16-20
        if (cr >= EnemyGenerator.CR_TIERS.MEDIUM_HIGH.min) return 3; // Medium-High: CR 11-15
        if (cr >= EnemyGenerator.CR_TIERS.MEDIUM.min) return 2;      // Medium: CR 6-10
        if (cr >= EnemyGenerator.CR_TIERS.LOW_MEDIUM.min) return 1;  // Low-Medium: CR 3-5
        return 0;                                                     // Low: CR 0-2
    }

    /**
     * Upgrade rarity by one step, capped at elite
     *
     * CR-based scaling caps at 'elite' to preserve 'boss' for
     * explicit boss encounters only.
     *
     * @param rarity - Current rarity
     * @returns Upgraded rarity (capped at elite)
     */
    private static upgradeRarity(rarity: EnemyRarity): EnemyRarity {
        if (rarity === 'common') return 'uncommon';
        if (rarity === 'uncommon') return 'elite';
        return 'elite'; // Already elite or boss, cap at elite
    }

    /**
     * Calculate rarity distribution for enemies based on CR
     *
     * Distributes upgrade points across enemies one at a time,
     * ensuring even distribution of upgraded enemies.
     *
     * @param enemyCount - Number of enemies in the encounter
     * @param cr - Challenge Rating
     * @returns Array of rarities (one per enemy)
     *
     * @example
     * ```typescript
     * getRarityDistribution(3, 1);  // [common, common, common]
     * getRarityDistribution(3, 4);  // [uncommon, common, common]
     * getRarityDistribution(3, 8);  // [uncommon, uncommon, common]
     * getRarityDistribution(3, 18); // [elite, uncommon, uncommon]
     * getRarityDistribution(3, 35); // [elite, elite, elite]
     * ```
     */
    private static getRarityDistribution(enemyCount: number, cr: number): EnemyRarity[] {
        const upgradePoints = EnemyGenerator.calculateUpgradePoints(cr);
        const rarities: EnemyRarity[] = Array(enemyCount).fill('common') as EnemyRarity[];

        // Distribute upgrades one at a time across enemies
        for (let i = 0; i < upgradePoints; i++) {
            const enemyIndex = i % enemyCount;
            rarities[enemyIndex] = EnemyGenerator.upgradeRarity(rarities[enemyIndex]);
        }

        return rarities;
    }

    /**
     * Promote rarity by a number of tiers
     *
     * Used by leader promotion system. Caps at boss tier.
     *
     * @param currentRarity - Starting rarity
     * @param tiers - Number of tiers to promote
     * @returns Promoted rarity
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
