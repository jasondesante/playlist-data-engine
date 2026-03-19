/**
 * Spell Test Fixtures
 *
 * Complete, valid spell objects for testing.
 *
 * These fixtures provide complete spell objects with all required fields
 * to avoid validation errors when registering spells via ExtensionManager.
 *
 * Based on the Spell interface from src/core/spells/SpellTypes.ts:
 * - id?: string (optional)
 * - name: string (required)
 * - level: number (required)
 * - school: SpellSchool (required)
 * - casting_time: string (required)
 * - range: string (required)
 * - components: string[] (required)
 * - duration: string (required)
 * - description?: string (optional)
 * - prerequisites?: SpellPrerequisite (optional)
 */

import type { Spell } from '../../src/core/spells/SpellTypes.js';

/**
 * Complete test spells with all required fields
 *
 * These are commonly used in integration tests for custom spell registration.
 * Each spell includes all required fields to pass ExtensionManager validation.
 */
export const completeTestSpells: Spell[] = [
    {
        id: 'phoenix_fire',
        name: 'Phoenix Fire',
        level: 5,
        school: 'Evocation',
        casting_time: '1 action',
        range: '60 feet',
        components: ['V', 'S', 'M'],
        duration: 'Instantaneous',
        description: 'A burst of flame damages enemies in a 20-foot radius.',
    },
    {
        id: 'mind_shield',
        name: 'Mind Shield',
        level: 2,
        school: 'Abjuration',
        casting_time: '1 bonus action',
        range: 'Self',
        components: ['V', 'S'],
        duration: 'Concentration, up to 1 hour',
        description: 'Protects against mental effects and charm spells.',
    },
    {
        id: 'time_warp',
        name: 'Time Warp',
        level: 3,
        school: 'Transmutation',
        casting_time: '1 action',
        range: '30 feet',
        components: ['V', 'S'],
        duration: 'Concentration, up to 1 minute',
        description: 'Alters time for targets, speeding allies or slowing enemies.',
    },
    {
        id: 'arcane_spark',
        name: 'Arcane Spark',
        level: 0,
        school: 'Evocation',
        casting_time: '1 action',
        range: '60 feet',
        components: ['V', 'S'],
        duration: 'Instantaneous',
        description: 'A small spark of arcane energy deals minor damage.',
    },
    {
        id: 'fire_storm',
        name: 'Fire Storm',
        level: 4,
        school: 'Evocation',
        casting_time: '1 action',
        range: '120 feet',
        components: ['V', 'S'],
        duration: 'Instantaneous',
        description: 'A storm of fire rains down in a large area.',
    },
    {
        id: 'ice_storm',
        name: 'Ice Storm',
        level: 4,
        school: 'Evocation',
        casting_time: '1 action',
        range: '120 feet',
        components: ['V', 'S', 'M'],
        duration: 'Instantaneous',
        description: 'Great hailstones pound down in a 20-foot radius cylinder.',
    },
    {
        id: 'frost_nova',
        name: 'Frost Nova',
        level: 3,
        school: 'Evocation',
        casting_time: '1 action',
        range: '15 ft cone',
        components: ['V', 'S'],
        duration: 'Instantaneous',
        description: 'A burst of cold damages and slows enemies.',
    },
];

/**
 * Factory function to create a test spell with optional overrides
 *
 * Creates a complete, valid spell with sensible defaults.
 * Override any properties to create custom test spells.
 *
 * @example
 * ```ts
 * const testSpell = createTestSpell({ name: 'Custom Spell', level: 3 });
 * ```
 */
export const createTestSpell = (overrides?: Partial<Spell>): Spell => ({
    id: 'test_spell',
    name: 'Test Spell',
    level: 1,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 feet',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: 'A test spell for unit testing.',
    ...overrides,
});

/**
 * Factory function to create multiple test spells
 *
 * Creates an array of complete, valid spells with incremental IDs.
 *
 * @example
 * ```ts
 * const spells = createTestSpells(3, { level: 2 });
 * // Creates 3 spells: test_spell_0, test_spell_1, test_spell_2, all level 2
 * ```
 */
export const createTestSpells = (
    count: number,
    overrides?: Partial<Spell>
): Spell[] =>
    Array.from({ length: count }, (_, i) =>
        createTestSpell({
            id: `test_spell_${i}`,
            name: `Test Spell ${i}`,
            ...overrides,
        })
    );

/**
 * Spell lookup map for easy access by name
 *
 * @example
 * ```ts
 * const phoenixFire = spellByName['Phoenix Fire'];
 * ```
 */
export const spellByName: Record<string, Spell> = Object.fromEntries(
    completeTestSpells.map(spell => [spell.name, spell])
);

/**
 * Spell lookup map for easy access by ID
 *
 * @example
 * ```ts
 * const phoenixFire = spellById['phoenix_fire'];
 * ```
 */
export const spellById: Record<string, Spell> = Object.fromEntries(
    completeTestSpells.map(spell => [spell.id || spell.name.toLowerCase().replace(/\s+/g, '_'), spell])
);

/**
 * Common spell components for creating variations
 */
export const spellComponents = {
    verbal: ['V'],
    somatic: ['S'],
    material: ['M'],
    verbalSomatic: ['V', 'S'],
    verbalMaterial: ['V', 'M'],
    somaticMaterial: ['S', 'M'],
    all: ['V', 'S', 'M'],
} as const;

/**
 * Common casting times for creating variations
 */
export const castingTimes = {
    action: '1 action',
    bonusAction: '1 bonus action',
    reaction: '1 reaction',
    minute: '1 minute',
    hour: '1 hour',
} as const;

/**
 * Common ranges for creating variations
 */
export const spellRanges = {
    self: 'Self',
    touch: 'Touch',
    thirtyFeet: '30 feet',
    sixtyFeet: '60 feet',
    oneHundredTwentyFeet: '120 feet',
} as const;

/**
 * Common durations for creating variations
 */
export const spellDurations = {
    instantaneous: 'Instantaneous',
    oneRound: '1 round',
    oneMinute: '1 minute',
    tenMinutes: '10 minutes',
    oneHour: '1 hour',
    eightHours: '8 hours',
    concentrationUpToOneMinute: 'Concentration, up to 1 minute',
    concentrationUpToTenMinutes: 'Concentration, up to 10 minutes',
    concentrationUpToOneHour: 'Concentration, up to 1 hour',
} as const;
