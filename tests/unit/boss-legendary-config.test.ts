/**
 * Unit tests for Boss Enemy Enhancements - Legendary Config on Character Sheet
 *
 * Tests that boss enemies have legendary_config populated with:
 * - resistances_per_day
 * - legendary actions
 * - lair action hint
 */

import { describe, it, expect } from 'vitest';
import { EnemyGenerator } from '../../src/core/generation/EnemyGenerator.js';

describe('Boss Enemy Enhancements - Legendary Config', () => {
    it('should include legendary_config with resistances for boss rarity', () => {
        const boss = EnemyGenerator.generate({
            seed: 'test-boss-legendary',
            templateId: 'orc',
            rarity: 'boss'
        });

        expect(boss.legendary_config).toBeDefined();
        expect(boss.legendary_config?.resistances_per_day).toBe(3);
        expect(boss.legendary_config?.actions).toBeDefined();
        expect(boss.legendary_config?.actions.length).toBe(3);
    });

    it('should include legendary action details in config', () => {
        const boss = EnemyGenerator.generate({
            seed: 'test-boss-actions',
            templateId: 'orc',
            rarity: 'boss'
        });

        const actions = boss.legendary_config?.actions || [];
        expect(actions.length).toBe(3);

        // Each action should have required fields
        actions.forEach(action => {
            expect(action.id).toBeDefined();
            expect(typeof action.id).toBe('string');

            expect(action.name).toBeDefined();
            expect(typeof action.name).toBe('string');

            expect(action.cost).toBeDefined();
            expect([1, 2, 3]).toContain(action.cost);

            expect(action.effect).toBeDefined();
            expect(typeof action.effect).toBe('string');
        });
    });

    it('should include lair_action_hint when generated', () => {
        // Generate multiple times to test randomness (20% chance)
        const bosses = [];
        for (let i = 0; i < 50; i++) {
            const boss = EnemyGenerator.generate({
                seed: `lair-test-${i}`,
                templateId: 'orc',
                rarity: 'boss'
            });
            bosses.push(boss);
        }

        const withHints = bosses.filter(b => b.legendary_config?.lair_action_hint);
        // Should have some hints (around 20% of 50 = ~10)
        expect(withHints.length).toBeGreaterThan(0);
        expect(withHints.length).toBeLessThan(50);
    });

    it('should NOT include legendary_config for non-boss rarity', () => {
        const elite = EnemyGenerator.generate({
            seed: 'test-elite',
            templateId: 'orc',
            rarity: 'elite'
        });

        expect(elite.legendary_config).toBeUndefined();
    });

    it('should NOT include legendary_config for common rarity', () => {
        const common = EnemyGenerator.generate({
            seed: 'test-common',
            templateId: 'orc',
            rarity: 'common'
        });

        expect(common.legendary_config).toBeUndefined();
    });

    it('should be deterministic with same seed', () => {
        const boss1 = EnemyGenerator.generate({
            seed: 'deterministic-boss',
            templateId: 'bear',
            rarity: 'boss'
        });

        const boss2 = EnemyGenerator.generate({
            seed: 'deterministic-boss',
            templateId: 'bear',
            rarity: 'boss'
        });

        expect(boss1.legendary_config?.resistances_per_day)
            .toBe(boss2.legendary_config?.resistances_per_day);

        const actions1 = boss1.legendary_config?.actions?.map(a => a.id) || [];
        const actions2 = boss2.legendary_config?.actions?.map(a => a.id) || [];
        expect(actions1).toEqual(actions2);

        expect(boss1.legendary_config?.lair_action_hint)
            .toBe(boss2.legendary_config?.lair_action_hint);
    });

    it('should produce different results with different seeds', () => {
        const boss1 = EnemyGenerator.generate({
            seed: 'boss-seed-1',
            templateId: 'orc',
            rarity: 'boss'
        });

        const boss2 = EnemyGenerator.generate({
            seed: 'boss-seed-2',
            templateId: 'orc',
            rarity: 'boss'
        });

        // At least one action should be different
        const actions1 = boss1.legendary_config?.actions?.map(a => a.id) || [];
        const actions2 = boss2.legendary_config?.actions?.map(a => a.id) || [];
        const hasDifference = actions1.some((id, i) => id !== actions2[i]);

        expect(hasDifference).toBe(true);
    });
});
