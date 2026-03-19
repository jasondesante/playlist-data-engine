/**
 * Unit tests for Enemy Legendary Generation System
 *
 * Tests legendary action generation, legendary resistances,
 * archetype action pools, and boss rarity integration.
 */

import { describe, it, expect } from 'vitest';
import { LegendaryGenerator, LEGENDARY_ACTIONS, LEGENDARY_RESISTANCES, LEGENDARY_ACTION_COUNT } from '../../src/core/generation/LegendaryGenerator.js';
import { SeededRNG } from '../../src/utils/random.js';
import type { EnemyArchetype, EnemyRarity } from '../../src/core/types/Enemy.js';

describe('LegendaryGenerator', () => {
    describe('LEGENDARY_ACTIONS Constant', () => {
        it('should have actions for each archetype', () => {
            expect(LEGENDARY_ACTIONS.brute).toBeDefined();
            expect(LEGENDARY_ACTIONS.brute.length).toBeGreaterThan(0);

            expect(LEGENDARY_ACTIONS.archer).toBeDefined();
            expect(LEGENDARY_ACTIONS.archer.length).toBeGreaterThan(0);

            expect(LEGENDARY_ACTIONS.support).toBeDefined();
            expect(LEGENDARY_ACTIONS.support.length).toBeGreaterThan(0);
        });

        it('should have at least one movement action per archetype', () => {
            const bruteMovement = LEGENDARY_ACTIONS.brute.filter(a => a.tags?.includes('movement'));
            expect(bruteMovement.length).toBeGreaterThan(0);

            const archerMovement = LEGENDARY_ACTIONS.archer.filter(a => a.tags?.includes('movement'));
            expect(archerMovement.length).toBeGreaterThan(0);

            const supportMovement = LEGENDARY_ACTIONS.support.filter(a => a.tags?.includes('movement'));
            expect(supportMovement.length).toBeGreaterThan(0);
        });

        it('should have actions with varying costs (1, 2, 3)', () => {
            const allActions = [
                ...LEGENDARY_ACTIONS.brute,
                ...LEGENDARY_ACTIONS.archer,
                ...LEGENDARY_ACTIONS.support
            ];

            const cost1Actions = allActions.filter(a => a.cost === 1);
            const cost2Actions = allActions.filter(a => a.cost === 2);
            const cost3Actions = allActions.filter(a => a.cost === 3);

            expect(cost1Actions.length).toBeGreaterThan(0);
            expect(cost2Actions.length).toBeGreaterThan(0);
            expect(cost3Actions.length).toBeGreaterThan(0);
        });

        it('should have unique action IDs across all archetypes', () => {
            const allActions = [
                ...LEGENDARY_ACTIONS.brute,
                ...LEGENDARY_ACTIONS.archer,
                ...LEGENDARY_ACTIONS.support
            ];

            const ids = allActions.map(a => a.id);
            const uniqueIds = new Set(ids);

            expect(ids.length).toBe(uniqueIds.size);
        });
    });

    describe('LEGENDARY_RESISTANCES Constant', () => {
        it('should define resistances for CR 1-21', () => {
            expect(LEGENDARY_RESISTANCES[1]).toBe(3);
            expect(LEGENDARY_RESISTANCES[4]).toBe(3);
            expect(LEGENDARY_RESISTANCES[10]).toBe(3);
            expect(LEGENDARY_RESISTANCES[15]).toBe(4);
            expect(LEGENDARY_RESISTANCES[20]).toBe(5);
            expect(LEGENDARY_RESISTANCES[21]).toBe(6);
        });

        it('should increase resistances at CR 11 and 16', () => {
            expect(LEGENDARY_RESISTANCES[10]).toBeLessThan(LEGENDARY_RESISTANCES[11]);
            expect(LEGENDARY_RESISTANCES[15]).toBeLessThan(LEGENDARY_RESISTANCES[16]);
        });
    });

    describe('LEGENDARY_ACTION_COUNT Constant', () => {
        it('should be 3 for standard boss generation', () => {
            expect(LEGENDARY_ACTION_COUNT).toBe(3);
        });
    });

    describe('generate()', () => {
        it('should generate legendary config for brute boss', () => {
            const config = LegendaryGenerator.generate({
                archetype: 'brute',
                cr: 8,
                seed: 'brute-boss-1'
            });

            expect(config).toBeDefined();
            expect(config.resistances).toBe(3);
            expect(config.actions).toBeDefined();
            expect(config.actions.length).toBe(LEGENDARY_ACTION_COUNT);
        });

        it('should generate legendary config for archer boss', () => {
            const config = LegendaryGenerator.generate({
                archetype: 'archer',
                cr: 10,
                seed: 'archer-boss-1'
            });

            expect(config.actions.length).toBe(LEGENDARY_ACTION_COUNT);
            expect(config.resistances).toBe(3);
        });

        it('should generate legendary config for support boss', () => {
            const config = LegendaryGenerator.generate({
                archetype: 'support',
                cr: 15,
                seed: 'support-boss-1'
            });

            expect(config.actions.length).toBe(LEGENDARY_ACTION_COUNT);
            expect(config.resistances).toBe(4);
        });

        it('should be deterministic with same seed', () => {
            const config1 = LegendaryGenerator.generate({
                archetype: 'brute',
                cr: 8,
                seed: 'deterministic-test'
            });

            const config2 = LegendaryGenerator.generate({
                archetype: 'brute',
                cr: 8,
                seed: 'deterministic-test'
            });

            expect(config1.actions.map(a => a.id)).toEqual(config2.actions.map(a => a.id));
            expect(config1.resistances).toBe(config2.resistances);
        });

        it('should produce different results with different seeds', () => {
            const config1 = LegendaryGenerator.generate({
                archetype: 'brute',
                cr: 8,
                seed: 'seed-1'
            });

            const config2 = LegendaryGenerator.generate({
                archetype: 'brute',
                cr: 8,
                seed: 'seed-2'
            });

            // At least one action should be different
            const actions1 = config1.actions.map(a => a.id);
            const actions2 = config2.actions.map(a => a.id);
            const hasDifference = actions1.some((id, i) => id !== actions2[i]);

            expect(hasDifference).toBe(true);
        });

        it('should include at least one movement action', () => {
            const config = LegendaryGenerator.generate({
                archetype: 'brute',
                cr: 8,
                seed: 'movement-test'
            });

            const hasMovementAction = config.actions.some(a => a.tags?.includes('movement'));
            expect(hasMovementAction).toBe(true);
        });

        it('should return correct resistances for each CR tier', () => {
            const cr1 = LegendaryGenerator.generate({
                archetype: 'brute',
                cr: 1,
                seed: 'cr-test-1'
            });

            const cr12 = LegendaryGenerator.generate({
                archetype: 'brute',
                cr: 12,
                seed: 'cr-test-12'
            });

            const cr20 = LegendaryGenerator.generate({
                archetype: 'brute',
                cr: 20,
                seed: 'cr-test-20'
            });

            expect(cr1.resistances).toBe(3);
            expect(cr12.resistances).toBe(4);
            expect(cr20.resistances).toBe(5);
        });

        it('should optionally include lair action hint', () => {
            // Generate multiple times to test randomness (20% chance)
            const configs = [];
            for (let i = 0; i < 50; i++) {
                const config = LegendaryGenerator.generate({
                    archetype: 'brute',
                    cr: 8,
                    seed: `lair-test-${i}`
                });
                configs.push(config);
            }

            const withHints = configs.filter(c => c.lairActionHint);
            // Should have some hints (around 20% of 50 = ~10)
            expect(withHints.length).toBeGreaterThan(0);
            expect(withHints.length).toBeLessThan(50);
        });

        it('should have lair hints appropriate to archetype', () => {
            // Test brute lair hints
            for (let i = 0; i < 100; i++) {
                const config = LegendaryGenerator.generate({
                    archetype: 'brute',
                    cr: 8,
                    seed: `brute-hint-${i}`
                });

                if (config.lairActionHint) {
                    // Brute hints should mention cave-in, tremors, or walls
                    const hint = config.lairActionHint.toLowerCase();
                    const hasBruteTheme =
                        hint.includes('cave') ||
                        hint.includes('tremor') ||
                        hint.includes('wall');
                    expect(hasBruteTheme).toBe(true);
                }
            }
        });
    });

    describe('generateWithRNG()', () => {
        it('should work with existing RNG instance', () => {
            const rng = new SeededRNG('rng-test');

            const config = LegendaryGenerator.generateWithRNG({
                archetype: 'archer',
                cr: 8,
                rng
            });

            expect(config.actions.length).toBe(LEGENDARY_ACTION_COUNT);
            expect(config.resistances).toBe(3);
        });
    });

    describe('getResistancesForCR()', () => {
        it('should return 3 for CR 1-4', () => {
            expect(LegendaryGenerator.getResistancesForCR(1)).toBe(3);
            expect(LegendaryGenerator.getResistancesForCR(2)).toBe(3);
            expect(LegendaryGenerator.getResistancesForCR(3)).toBe(3);
            expect(LegendaryGenerator.getResistancesForCR(4)).toBe(3);
        });

        it('should return 3 for CR 5-10', () => {
            expect(LegendaryGenerator.getResistancesForCR(5)).toBe(3);
            expect(LegendaryGenerator.getResistancesForCR(8)).toBe(3);
            expect(LegendaryGenerator.getResistancesForCR(10)).toBe(3);
        });

        it('should return 4 for CR 11-15', () => {
            expect(LegendaryGenerator.getResistancesForCR(11)).toBe(4);
            expect(LegendaryGenerator.getResistancesForCR(13)).toBe(4);
            expect(LegendaryGenerator.getResistancesForCR(15)).toBe(4);
        });

        it('should return 5 for CR 16-20', () => {
            expect(LegendaryGenerator.getResistancesForCR(16)).toBe(5);
            expect(LegendaryGenerator.getResistancesForCR(18)).toBe(5);
            expect(LegendaryGenerator.getResistancesForCR(20)).toBe(5);
        });

        it('should return 6 for CR 21+', () => {
            expect(LegendaryGenerator.getResistancesForCR(21)).toBe(6);
            expect(LegendaryGenerator.getResistancesForCR(25)).toBe(6);
            expect(LegendaryGenerator.getResistancesForCR(30)).toBe(6);
        });

        it('should return 3 as default for CR below 1', () => {
            expect(LegendaryGenerator.getResistancesForCR(0)).toBe(3);
            expect(LegendaryGenerator.getResistancesForCR(0.5)).toBe(3);
        });
    });

    describe('getActionById()', () => {
        it('should find brute action by ID', () => {
            const action = LegendaryGenerator.getActionById('tail_attack');
            expect(action).toBeDefined();
            expect(action?.id).toBe('tail_attack');
            expect(action?.archetypes).toContain('brute');
        });

        it('should find archer action by ID', () => {
            const action = LegendaryGenerator.getActionById('snipe');
            expect(action).toBeDefined();
            expect(action?.id).toBe('snipe');
            expect(action?.archetypes).toContain('archer');
        });

        it('should find support action by ID', () => {
            const action = LegendaryGenerator.getActionById('rally');
            expect(action).toBeDefined();
            expect(action?.id).toBe('rally');
            expect(action?.archetypes).toContain('support');
        });

        it('should find universal action by ID', () => {
            const action = LegendaryGenerator.getActionById('teleport');
            expect(action).toBeDefined();
            expect(action?.id).toBe('teleport');
            expect(action?.archetypes).toContain('brute');
            expect(action?.archetypes).toContain('archer');
            expect(action?.archetypes).toContain('support');
        });

        it('should return undefined for unknown action ID', () => {
            const action = LegendaryGenerator.getActionById('nonexistent_action');
            expect(action).toBeUndefined();
        });
    });

    describe('getActionsForArchetype()', () => {
        it('should return brute actions plus universal actions', () => {
            const actions = LegendaryGenerator.getActionsForArchetype('brute');
            const bruteOnlyCount = LEGENDARY_ACTIONS.brute.length;

            expect(actions.length).toBeGreaterThan(bruteOnlyCount);
            // Should have universal actions (teleport, detect)
            expect(actions.some(a => a.id === 'teleport')).toBe(true);
            expect(actions.some(a => a.id === 'detect')).toBe(true);
        });

        it('should return archer actions plus universal actions', () => {
            const actions = LegendaryGenerator.getActionsForArchetype('archer');

            expect(actions.length).toBeGreaterThan(LEGENDARY_ACTIONS.archer.length);
            expect(actions.some(a => a.id === 'teleport')).toBe(true);
        });

        it('should return support actions plus universal actions', () => {
            const actions = LegendaryGenerator.getActionsForArchetype('support');

            expect(actions.length).toBeGreaterThan(LEGENDARY_ACTIONS.support.length);
            expect(actions.some(a => a.id === 'teleport')).toBe(true);
        });
    });

    describe('shouldHaveLegendary()', () => {
        it('should return true for boss rarity', () => {
            expect(LegendaryGenerator.shouldHaveLegendary('boss')).toBe(true);
        });

        it('should return false for non-boss rarities', () => {
            expect(LegendaryGenerator.shouldHaveLegendary('common')).toBe(false);
            expect(LegendaryGenerator.shouldHaveLegendary('uncommon')).toBe(false);
            expect(LegendaryGenerator.shouldHaveLegendary('elite')).toBe(false);
        });
    });

    describe('Legendary Action Properties', () => {
        it('should have all required properties on each action', () => {
            const allActions = [
                ...LEGENDARY_ACTIONS.brute,
                ...LEGENDARY_ACTIONS.archer,
                ...LEGENDARY_ACTIONS.support
            ];

            allActions.forEach(action => {
                expect(action.id).toBeDefined();
                expect(typeof action.id).toBe('string');

                expect(action.name).toBeDefined();
                expect(typeof action.name).toBe('string');

                expect(action.description).toBeDefined();
                expect(typeof action.description).toBe('string');

                expect(action.cost).toBeDefined();
                expect([1, 2, 3]).toContain(action.cost);

                expect(action.effect).toBeDefined();
                expect(typeof action.effect).toBe('string');

                expect(action.archetypes).toBeDefined();
                expect(Array.isArray(action.archetypes)).toBe(true);
                expect(action.archetypes.length).toBeGreaterThan(0);
            });
        });

        it('should have damage on damaging actions', () => {
            const damagingActions = [
                ...LEGENDARY_ACTIONS.brute,
                ...LEGENDARY_ACTIONS.archer,
                ...LEGENDARY_ACTIONS.support
            ].filter(a => a.damage);

            expect(damagingActions.length).toBeGreaterThan(0);

            damagingActions.forEach(action => {
                expect(action.damage).toBeDefined();
                expect(action.damageType).toBeDefined();
            });
        });

        it('should have tags on most actions', () => {
            const allActions = [
                ...LEGENDARY_ACTIONS.brute,
                ...LEGENDARY_ACTIONS.archer,
                ...LEGENDARY_ACTIONS.support
            ];

            const actionsWithTags = allActions.filter(a => a.tags && a.tags.length > 0);
            // Most actions should have tags
            expect(actionsWithTags.length).toBeGreaterThan(allActions.length / 2);
        });
    });

    describe('Archetype Action Themes', () => {
        it('should have melee-focused actions for brute', () => {
            const meleeActions = LEGENDARY_ACTIONS.brute.filter(a =>
                a.tags?.includes('melee')
            );
            expect(meleeActions.length).toBeGreaterThan(0);
        });

        it('should have ranged-focused actions for archer', () => {
            const rangedActions = LEGENDARY_ACTIONS.archer.filter(a =>
                a.tags?.includes('ranged')
            );
            expect(rangedActions.length).toBeGreaterThan(0);
        });

        it('should have support-focused actions for support', () => {
            const supportActions = LEGENDARY_ACTIONS.support.filter(a =>
                a.tags?.includes('ally') ||
                a.tags?.includes('heal') ||
                a.tags?.includes('buff')
            );
            expect(supportActions.length).toBeGreaterThan(0);
        });
    });
});
