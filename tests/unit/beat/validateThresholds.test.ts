/**
 * Tests for validateThresholds helper function
 *
 * Tests validation of accuracy thresholds for rhythm game difficulty settings.
 */

import { describe, it, expect } from 'vitest';
import {
    validateThresholds,
    type ThresholdValidationResult,
    type AccuracyThresholds,
    EASY_ACCURACY_THRESHOLDS,
    MEDIUM_ACCURACY_THRESHOLDS,
    HARD_ACCURACY_THRESHOLDS,
} from '../../../src/core/types/BeatMap.js';

describe('validateThresholds', () => {
    describe('valid thresholds', () => {
        it('should validate complete valid thresholds', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: 0.050,
                great: 0.100,
                good: 0.150,
                ok: 0.200,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate preset thresholds', () => {
            expect(validateThresholds(EASY_ACCURACY_THRESHOLDS).valid).toBe(true);
            expect(validateThresholds(MEDIUM_ACCURACY_THRESHOLDS).valid).toBe(true);
            expect(validateThresholds(HARD_ACCURACY_THRESHOLDS).valid).toBe(true);
        });

        it('should validate partial valid thresholds (ascending order)', () => {
            const partial: Partial<AccuracyThresholds> = {
                perfect: 0.050,
                great: 0.100,
            };

            const result = validateThresholds(partial);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate single threshold', () => {
            const single: Partial<AccuracyThresholds> = {
                perfect: 0.050,
            };

            const result = validateThresholds(single);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate empty thresholds object', () => {
            const result = validateThresholds({});

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate non-consecutive thresholds (skipping middle)', () => {
            const nonConsecutive: Partial<AccuracyThresholds> = {
                perfect: 0.050,
                ok: 0.200,
            };

            const result = validateThresholds(nonConsecutive);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate zero values', () => {
            const zeroThresholds: Partial<AccuracyThresholds> = {
                perfect: 0,
                great: 0.100,
            };

            const result = validateThresholds(zeroThresholds);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('invalid ascending order', () => {
        it('should fail when great is less than perfect', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: 0.100,
                great: 0.050,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('great (0.05) must be greater than perfect (0.1)');
        });

        it('should fail when good is less than great', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                great: 0.100,
                good: 0.050,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('good (0.05) must be greater than great (0.1)');
        });

        it('should fail when ok is less than good', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                good: 0.150,
                ok: 0.100,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('ok (0.1) must be greater than good (0.15)');
        });

        it('should fail when ok is less than perfect (skipping middle)', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: 0.150,
                ok: 0.100,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('ok (0.1) must be greater than perfect (0.15)');
        });

        it('should fail when all thresholds are equal', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: 0.100,
                great: 0.100,
                good: 0.100,
                ok: 0.100,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should report multiple order errors', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: 0.200,
                great: 0.100,
                good: 0.050,
                ok: 0.025,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(3); // great < perfect, good < great, ok < good
        });
    });

    describe('invalid values', () => {
        it('should fail for negative perfect', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: -0.050,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('perfect') && e.includes('positive'))).toBe(true);
        });

        it('should fail for negative great', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                great: -0.100,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('great') && e.includes('positive'))).toBe(true);
        });

        it('should fail for negative good', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                good: -0.150,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('good') && e.includes('positive'))).toBe(true);
        });

        it('should fail for negative ok', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                ok: -0.200,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('ok') && e.includes('positive'))).toBe(true);
        });

        it('should return early for value errors (not checking order)', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: -0.100,
                great: -0.050, // Would fail order check too, but value check happens first
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(false);
            // Should only have value errors, not order errors
            expect(result.errors.every(e => e.includes('positive') || e.includes('number'))).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should validate very small positive values', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: 0.001,
                great: 0.002,
                good: 0.003,
                ok: 0.004,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(true);
        });

        it('should validate very large values', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: 1.0,
                great: 2.0,
                good: 3.0,
                ok: 4.0,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(true);
        });

        it('should validate thresholds with decimal precision', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: 0.0101,
                great: 0.0255,
                good: 0.0509,
                ok: 0.1001,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(true);
        });

        it('should handle extremely close values (but still ascending)', () => {
            const thresholds: Partial<AccuracyThresholds> = {
                perfect: 0.010,
                great: 0.0100001,
            };

            const result = validateThresholds(thresholds);

            expect(result.valid).toBe(true);
        });
    });

    describe('return type', () => {
        it('should return ThresholdValidationResult with valid boolean', () => {
            const result = validateThresholds({ perfect: 0.050 });

            expect(typeof result.valid).toBe('boolean');
            expect(Array.isArray(result.errors)).toBe(true);
        });

        it('should return new object each call', () => {
            const result1 = validateThresholds({ perfect: 0.050 });
            const result2 = validateThresholds({ perfect: 0.050 });

            expect(result1).not.toBe(result2);
            expect(result1).toEqual(result2);
        });
    });
});
