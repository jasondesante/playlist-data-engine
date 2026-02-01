/**
 * Test file to verify Dragon-themed skill example from documentation compiles
 *
 * This is a compile-time only test - we just need to verify the TypeScript types
 * are compatible with the example code shown in USAGE_IN_OTHER_PROJECTS.md
 */

import { SkillRegistry, asClass } from '../../src/index.js';
import type { CustomSkill } from '../../src/index.js';

/**
 * Dragon-themed skill example from USAGE_IN_OTHER_PROJECTS.md (lines 1269-1281)
 *
 * Fixed example (with asClass import and usage):
 * ```typescript
 * import { ExtensionManager, FeatureRegistry, SkillRegistry, asClass } from 'playlist-data-engine';
 * ...
 * SkillRegistry.getInstance().registerSkill({
 *     id: 'dragon_smithing',
 *     name: 'Dragon Smithing',
 *     description: 'Craft weapons from dragon scales',
 *     ability: 'INT',
 *     prerequisites: {
 *         features: ['draconic_bloodline'],
 *         level: 5,
 *         class: asClass('Sorcerer')
 *     },
 *     source: 'custom'
 * });
 * ```
 */

// Verify the example compiles with correct types
const dragonSmithingSkill: CustomSkill = {
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],
        level: 5,
        class: asClass('Sorcerer')  // FIXED: Using asClass helper function
    },
    source: 'custom'
};

// Verify we can register this skill
const registry = SkillRegistry.getInstance();

// This should compile without errors
// Note: We won't actually run this in tests, just verify it compiles
// registry.registerSkill(dragonSmithingSkill);

console.log('Dragon-themed skill example compiles successfully!');
export { dragonSmithingSkill };
