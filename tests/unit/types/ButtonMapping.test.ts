/**
 * Unit Tests for Button Mapping Configuration (Phase 2, Task 2.1)
 *
 * Essential tests for the configuration types and helpers:
 * - validateButtonMappingConfig
 * - mergeButtonMappingConfig
 * - getConsecutiveKeyLimit
 * - CONSECUTIVE_KEY_LIMITS
 * - DEFAULT_BUTTON_MAPPING_CONFIG
 */

import { describe, it, expect } from 'vitest';
import {
    validateButtonMappingConfig,
    mergeButtonMappingConfig,
    getConsecutiveKeyLimit,
    CONSECUTIVE_KEY_LIMITS,
    DEFAULT_BUTTON_MAPPING_CONFIG,
    type ButtonMappingConfig,
} from '../../../src/core/types/ButtonMapping.js';

// =============================================================================
// DEFAULT_BUTTON_MAPPING_CONFIG Tests
// =============================================================================

describe('DEFAULT_BUTTON_MAPPING_CONFIG', () => {
    it('should have sensible default values', () => {
        expect(DEFAULT_BUTTON_MAPPING_CONFIG.difficulty).toBe('medium');
        expect(DEFAULT_BUTTON_MAPPING_CONFIG.controllerMode).toBe('ddr');
        expect(DEFAULT_BUTTON_MAPPING_CONFIG.pitchInfluenceWeight).toBe(1.0);
        expect(DEFAULT_BUTTON_MAPPING_CONFIG.emphasizeDownbeats).toBe(true);
        expect(DEFAULT_BUTTON_MAPPING_CONFIG.emphasizeSyncopation).toBe(false);
        expect(DEFAULT_BUTTON_MAPPING_CONFIG.consecutiveSameKeyLimit).toBe(8);
        expect(DEFAULT_BUTTON_MAPPING_CONFIG.patternMemory).toBe(4);
        expect(DEFAULT_BUTTON_MAPPING_CONFIG.useRhythmBand).toBe(true);
    });
});

// =============================================================================
// CONSECUTIVE_KEY_LIMITS Tests
// =============================================================================

describe('CONSECUTIVE_KEY_LIMITS', () => {
    it('should have correct difficulty-based limits (easy=12, medium=8, hard=6)', () => {
        expect(CONSECUTIVE_KEY_LIMITS.easy).toBe(12);
        expect(CONSECUTIVE_KEY_LIMITS.medium).toBe(8);
        expect(CONSECUTIVE_KEY_LIMITS.hard).toBe(6);
    });

    it('should have decreasing limits as difficulty increases', () => {
        expect(CONSECUTIVE_KEY_LIMITS.easy).toBeGreaterThan(CONSECUTIVE_KEY_LIMITS.medium);
        expect(CONSECUTIVE_KEY_LIMITS.medium).toBeGreaterThan(CONSECUTIVE_KEY_LIMITS.hard);
    });
});

// =============================================================================
// getConsecutiveKeyLimit Tests
// =============================================================================

describe('getConsecutiveKeyLimit', () => {
    it('should return correct limit for each difficulty', () => {
        expect(getConsecutiveKeyLimit('easy')).toBe(12);
        expect(getConsecutiveKeyLimit('medium')).toBe(8);
        expect(getConsecutiveKeyLimit('hard')).toBe(6);
    });

    it('should return medium limit (8) for custom difficulty', () => {
        expect(getConsecutiveKeyLimit('custom')).toBe(8);
    });
});

// =============================================================================
// validateButtonMappingConfig Tests
// =============================================================================

describe('validateButtonMappingConfig', () => {
    it('should return valid for an empty config', () => {
        const result = validateButtonMappingConfig({});
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should return valid for a complete valid config', () => {
        const result = validateButtonMappingConfig({
            difficulty: 'medium',
            controllerMode: 'ddr',
            pitchInfluenceWeight: 0.5,
            consecutiveSameKeyLimit: 10,
            patternMemory: 4,
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject pitchInfluenceWeight below 0', () => {
        const result = validateButtonMappingConfig({
            pitchInfluenceWeight: -0.1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('pitchInfluenceWeight must be between 0 and 1, got -0.1');
    });

    it('should reject pitchInfluenceWeight above 1', () => {
        const result = validateButtonMappingConfig({
            pitchInfluenceWeight: 1.5,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('pitchInfluenceWeight must be between 0 and 1, got 1.5');
    });

    it('should accept pitchInfluenceWeight at boundaries (0 and 1)', () => {
        expect(validateButtonMappingConfig({ pitchInfluenceWeight: 0 }).valid).toBe(true);
        expect(validateButtonMappingConfig({ pitchInfluenceWeight: 1 }).valid).toBe(true);
    });

    it('should reject negative consecutiveSameKeyLimit', () => {
        const result = validateButtonMappingConfig({
            consecutiveSameKeyLimit: 0,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('consecutiveSameKeyLimit must be at least 1');
    });

    it('should reject negative patternMemory', () => {
        const result = validateButtonMappingConfig({
            patternMemory: -1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('patternMemory must be non-negative, got -1');
    });

    it('should reject invalid controllerMode', () => {
        const result = validateButtonMappingConfig({
            controllerMode: 'invalid' as 'ddr' | 'guitar_hero',
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("controllerMode must be 'ddr' or 'guitar_hero'");
    });

    it('should accept both valid controller modes', () => {
        expect(validateButtonMappingConfig({ controllerMode: 'ddr' }).valid).toBe(true);
        expect(validateButtonMappingConfig({ controllerMode: 'guitar_hero' }).valid).toBe(true);
    });

    it('should accumulate multiple errors', () => {
        const result = validateButtonMappingConfig({
            pitchInfluenceWeight: 2.0,
            consecutiveSameKeyLimit: -5,
            patternMemory: -1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(3);
    });
});

// =============================================================================
// mergeButtonMappingConfig Tests
// =============================================================================

describe('mergeButtonMappingConfig', () => {
    it('should return default config when no partial provided', () => {
        const result = mergeButtonMappingConfig();
        expect(result).toEqual(DEFAULT_BUTTON_MAPPING_CONFIG);
    });

    it('should return default config when partial is undefined', () => {
        const result = mergeButtonMappingConfig(undefined);
        expect(result).toEqual(DEFAULT_BUTTON_MAPPING_CONFIG);
    });

    it('should return default config when partial is empty object', () => {
        const result = mergeButtonMappingConfig({});
        expect(result).toEqual(DEFAULT_BUTTON_MAPPING_CONFIG);
    });

    it('should merge partial values with defaults', () => {
        const result = mergeButtonMappingConfig({
            controllerMode: 'guitar_hero',
            pitchInfluenceWeight: 0.5,
        });

        expect(result.controllerMode).toBe('guitar_hero');
        expect(result.pitchInfluenceWeight).toBe(0.5);
        // Defaults preserved
        expect(result.difficulty).toBe('medium');
        expect(result.emphasizeDownbeats).toBe(true);
        expect(result.consecutiveSameKeyLimit).toBe(8);
    });

    it('should apply difficulty-based consecutiveSameKeyLimit when difficulty changes', () => {
        const result = mergeButtonMappingConfig({
            difficulty: 'hard',
        });

        expect(result.difficulty).toBe('hard');
        expect(result.consecutiveSameKeyLimit).toBe(6); // hard limit
    });

    it('should preserve explicit consecutiveSameKeyLimit even when difficulty changes', () => {
        const result = mergeButtonMappingConfig({
            difficulty: 'hard',
            consecutiveSameKeyLimit: 10, // Explicit value
        });

        expect(result.difficulty).toBe('hard');
        expect(result.consecutiveSameKeyLimit).toBe(10); // Preserved explicit value
    });

    it('should not modify the original defaults', () => {
        const originalDefaults = { ...DEFAULT_BUTTON_MAPPING_CONFIG };

        mergeButtonMappingConfig({
            difficulty: 'hard',
            controllerMode: 'guitar_hero',
            pitchInfluenceWeight: 0.0,
        });

        expect(DEFAULT_BUTTON_MAPPING_CONFIG.difficulty).toBe(originalDefaults.difficulty);
        expect(DEFAULT_BUTTON_MAPPING_CONFIG.controllerMode).toBe(originalDefaults.controllerMode);
    });
});
