/**
 * Tests for OSE Parameter Modes
 *
 * Tests the helper functions for converting mode configurations to actual values.
 */

import { describe, it, expect } from 'vitest';
import {
    // Types
    HopSizeMode,
    HopSizeConfig,
    MelBandsMode,
    MelBandsConfig,
    GaussianSmoothMode,
    GaussianSmoothConfig,
    // Constants
    HOP_SIZE_PRESETS,
    MEL_BANDS_PRESETS,
    GAUSSIAN_SMOOTH_PRESETS,
    // Helper functions
    getHopSizeMs,
    getMelBands,
    getGaussianSmoothMs,
} from '../../../src/core/types/BeatMap.js';

// ============================================================================
// Hop Size Mode Tests
// ============================================================================

describe('getHopSizeMs', () => {
    describe('preset modes', () => {
        it('should return 10ms for efficient mode', () => {
            const config: HopSizeConfig = { mode: 'efficient' };
            expect(getHopSizeMs(config)).toBe(10);
        });

        it('should return 4ms for standard mode (Ellis 2007 paper spec)', () => {
            const config: HopSizeConfig = { mode: 'standard' };
            expect(getHopSizeMs(config)).toBe(4);
        });

        it('should return 2ms for hq mode', () => {
            const config: HopSizeConfig = { mode: 'hq' };
            expect(getHopSizeMs(config)).toBe(2);
        });
    });

    describe('custom mode', () => {
        it('should return custom value when mode is custom', () => {
            const config: HopSizeConfig = { mode: 'custom', customValue: 5 };
            expect(getHopSizeMs(config)).toBe(5);
        });

        it('should return custom value of 1ms (minimum allowed)', () => {
            const config: HopSizeConfig = { mode: 'custom', customValue: 1 };
            expect(getHopSizeMs(config)).toBe(1);
        });

        it('should return custom value of 50ms (maximum allowed)', () => {
            const config: HopSizeConfig = { mode: 'custom', customValue: 50 };
            expect(getHopSizeMs(config)).toBe(50);
        });

        it('should clamp value below minimum to 1ms', () => {
            const config: HopSizeConfig = { mode: 'custom', customValue: 0 };
            expect(getHopSizeMs(config)).toBe(1);
        });

        it('should clamp negative value to 1ms', () => {
            const config: HopSizeConfig = { mode: 'custom', customValue: -10 };
            expect(getHopSizeMs(config)).toBe(1);
        });

        it('should clamp value above maximum to 50ms', () => {
            const config: HopSizeConfig = { mode: 'custom', customValue: 100 };
            expect(getHopSizeMs(config)).toBe(50);
        });

        it('should clamp very large value to 50ms', () => {
            const config: HopSizeConfig = { mode: 'custom', customValue: 1000 };
            expect(getHopSizeMs(config)).toBe(50);
        });

        it('should fallback to standard (4ms) when customValue is undefined', () => {
            const config: HopSizeConfig = { mode: 'custom' };
            expect(getHopSizeMs(config)).toBe(4);
        });

        it('should handle fractional values', () => {
            const config: HopSizeConfig = { mode: 'custom', customValue: 3.5 };
            expect(getHopSizeMs(config)).toBe(3.5);
        });
    });

    describe('default parameter', () => {
        it('should return 4ms (standard) when no config is provided', () => {
            expect(getHopSizeMs()).toBe(4);
        });

        it('should return 4ms when undefined is passed', () => {
            expect(getHopSizeMs(undefined)).toBe(4);
        });
    });
});

// ============================================================================
// Mel Bands Mode Tests
// ============================================================================

describe('getMelBands', () => {
    describe('preset modes', () => {
        it('should return 40 bands for standard mode', () => {
            const config: MelBandsConfig = { mode: 'standard' };
            expect(getMelBands(config)).toBe(40);
        });

        it('should return 64 bands for detailed mode', () => {
            const config: MelBandsConfig = { mode: 'detailed' };
            expect(getMelBands(config)).toBe(64);
        });

        it('should return 80 bands for maximum mode', () => {
            const config: MelBandsConfig = { mode: 'maximum' };
            expect(getMelBands(config)).toBe(80);
        });
    });

    describe('default parameter', () => {
        it('should return 40 (standard) when no config is provided', () => {
            expect(getMelBands()).toBe(40);
        });

        it('should return 40 when undefined is passed', () => {
            expect(getMelBands(undefined)).toBe(40);
        });
    });
});

// ============================================================================
// Gaussian Smooth Mode Tests
// ============================================================================

describe('getGaussianSmoothMs', () => {
    describe('preset modes', () => {
        it('should return 10ms for minimal mode', () => {
            const config: GaussianSmoothConfig = { mode: 'minimal' };
            expect(getGaussianSmoothMs(config)).toBe(10);
        });

        it('should return 20ms for standard mode (paper default)', () => {
            const config: GaussianSmoothConfig = { mode: 'standard' };
            expect(getGaussianSmoothMs(config)).toBe(20);
        });

        it('should return 40ms for smooth mode', () => {
            const config: GaussianSmoothConfig = { mode: 'smooth' };
            expect(getGaussianSmoothMs(config)).toBe(40);
        });
    });

    describe('default parameter', () => {
        it('should return 20ms (standard) when no config is provided', () => {
            expect(getGaussianSmoothMs()).toBe(20);
        });

        it('should return 20ms when undefined is passed', () => {
            expect(getGaussianSmoothMs(undefined)).toBe(20);
        });
    });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('HOP_SIZE_PRESETS', () => {
    it('should have efficient value of 10ms', () => {
        expect(HOP_SIZE_PRESETS.efficient).toBe(10);
    });

    it('should have standard value of 4ms', () => {
        expect(HOP_SIZE_PRESETS.standard).toBe(4);
    });

    it('should have hq value of 2ms', () => {
        expect(HOP_SIZE_PRESETS.hq).toBe(2);
    });
});

describe('MEL_BANDS_PRESETS', () => {
    it('should have standard value of 40', () => {
        expect(MEL_BANDS_PRESETS.standard).toBe(40);
    });

    it('should have detailed value of 64', () => {
        expect(MEL_BANDS_PRESETS.detailed).toBe(64);
    });

    it('should have maximum value of 80', () => {
        expect(MEL_BANDS_PRESETS.maximum).toBe(80);
    });
});

describe('GAUSSIAN_SMOOTH_PRESETS', () => {
    it('should have minimal value of 10ms', () => {
        expect(GAUSSIAN_SMOOTH_PRESETS.minimal).toBe(10);
    });

    it('should have standard value of 20ms', () => {
        expect(GAUSSIAN_SMOOTH_PRESETS.standard).toBe(20);
    });

    it('should have smooth value of 40ms', () => {
        expect(GAUSSIAN_SMOOTH_PRESETS.smooth).toBe(40);
    });
});

// ============================================================================
// Type Coverage Tests
// ============================================================================

describe('Type coverage', () => {
    it('should support all HopSizeMode values', () => {
        const modes: HopSizeMode[] = ['efficient', 'standard', 'hq', 'custom'];
        for (const mode of modes) {
            const config: HopSizeConfig = { mode };
            expect(typeof getHopSizeMs(config)).toBe('number');
        }
    });

    it('should support all MelBandsMode values', () => {
        const modes: MelBandsMode[] = ['standard', 'detailed', 'maximum'];
        for (const mode of modes) {
            const config: MelBandsConfig = { mode };
            expect(typeof getMelBands(config)).toBe('number');
        }
    });

    it('should support all GaussianSmoothMode values', () => {
        const modes: GaussianSmoothMode[] = ['minimal', 'standard', 'smooth'];
        for (const mode of modes) {
            const config: GaussianSmoothConfig = { mode };
            expect(typeof getGaussianSmoothMs(config)).toBe('number');
        }
    });
});
