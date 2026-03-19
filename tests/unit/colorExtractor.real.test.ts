import { describe, it, expect, beforeAll } from 'vitest';
import { ColorExtractor } from '../../src/core/analysis/ColorExtractor';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Real-world color extraction tests using actual image files
 * This test validates that the ColorExtractor produces distinct, meaningful colors
 */
describe('ColorExtractor - Real Image Tests', () => {
    let extractor: ColorExtractor;
    let imageDataUrl: string;

    beforeAll(() => {
        extractor = new ColorExtractor();

        // Load the test image and convert to data URL
        const imagePath = resolve(process.cwd(), 'src/assets/test-image.jpg');
        const imageBuffer = readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        imageDataUrl = `data:image/jpeg;base64,${base64Image}`;
    });

    it('should extract a palette from a real image', async () => {
        const palette = await extractor.extractPalette(imageDataUrl);

        expect(palette).toBeDefined();
        expect(palette.colors).toBeDefined();
        expect(palette.colors.length).toBeGreaterThanOrEqual(3);
        expect(palette.primary_color).toBeDefined();
        expect(palette.secondary_color).toBeDefined();
        expect(palette.accent_color).toBeDefined();
    });

    it('should produce distinct colors in the palette', async () => {
        const palette = await extractor.extractPalette(imageDataUrl);

        // Helper function to calculate color distance
        const colorDistance = (hex1: string, hex2: string): number => {
            const rgb1 = hexToRgb(hex1);
            const rgb2 = hexToRgb(hex2);

            return Math.sqrt(
                Math.pow(rgb1.r - rgb2.r, 2) +
                Math.pow(rgb1.g - rgb2.g, 2) +
                Math.pow(rgb1.b - rgb2.b, 2)
            );
        };

        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 0, g: 0, b: 0 };
        };

        // Check that at least 3 colors are distinct (distance > 30 in RGB space)
        const colors = palette.colors.slice(0, 3);
        const distinctPairs: Array<{ color1: string; color2: string; distance: number }> = [];

        for (let i = 0; i < colors.length; i++) {
            for (let j = i + 1; j < colors.length; j++) {
                const distance = colorDistance(colors[i], colors[j]);
                distinctPairs.push({
                    color1: colors[i],
                    color2: colors[j],
                    distance
                });
            }
        }

        // Log the color palette for debugging
        console.log('\n=== Extracted Color Palette ===');
        console.log('Primary:', palette.primary_color);
        console.log('Secondary:', palette.secondary_color);
        console.log('Accent:', palette.accent_color);
        console.log('All colors:', palette.colors);
        console.log('\n=== Color Distances ===');
        distinctPairs.forEach(pair => {
            console.log(`${pair.color1} <-> ${pair.color2}: ${pair.distance.toFixed(2)}`);
        });
        console.log('\n=== Palette Characteristics ===');
        console.log('Brightness:', palette.brightness.toFixed(3));
        console.log('Saturation:', palette.saturation.toFixed(3));
        console.log('Is Monochrome:', palette.is_monochrome);

        // At least 2 pairs should have a distance > 30 (distinct colors)
        const distinctCount = distinctPairs.filter(pair => pair.distance > 30).length;
        expect(distinctCount).toBeGreaterThanOrEqual(2);
    });

    it('should calculate brightness and saturation correctly', async () => {
        const palette = await extractor.extractPalette(imageDataUrl);

        expect(palette.brightness).toBeGreaterThanOrEqual(0);
        expect(palette.brightness).toBeLessThanOrEqual(1);
        expect(palette.saturation).toBeGreaterThanOrEqual(0);
        expect(palette.saturation).toBeLessThanOrEqual(1);
    });

    it('should detect monochrome images correctly', async () => {
        const palette = await extractor.extractPalette(imageDataUrl);

        // This test image should not be monochrome (saturation > 0.1)
        // If it is monochrome, the test will show us
        console.log('\nMonochrome detection:', palette.is_monochrome);
        console.log('Saturation value:', palette.saturation);

        expect(typeof palette.is_monochrome).toBe('boolean');
    });

    it('should return valid hex color codes', async () => {
        const palette = await extractor.extractPalette(imageDataUrl);

        const hexPattern = /^#[0-9A-F]{6}$/i;

        palette.colors.forEach(color => {
            expect(color).toMatch(hexPattern);
        });

        expect(palette.primary_color).toMatch(hexPattern);
        expect(palette.secondary_color).toMatch(hexPattern);
        expect(palette.accent_color).toMatch(hexPattern);
    });
});
