import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ColorExtractor } from '../../src/core/analysis/ColorExtractor';

describe('ColorExtractor', () => {
    let extractor: ColorExtractor;
    let mockContext: { drawImage: ReturnType<typeof vi.fn>; getImageData: ReturnType<typeof vi.fn> };
    let mockCanvas: { width: number; height: number; getContext: ReturnType<typeof vi.fn> };
    let loadedSrc: string | undefined;

    beforeEach(() => {
        // Mock Canvas API
        mockContext = {
            drawImage: vi.fn(),
            getImageData: vi.fn().mockReturnValue({
                data: new Uint8ClampedArray([
                    255, 0, 0, 255,   // Red
                    0, 255, 0, 255,   // Green
                    0, 0, 255, 255,   // Blue
                    255, 255, 255, 255 // White
                ]),
                width: 2,
                height: 2
            })
        };

        mockCanvas = {
            width: 100,
            height: 100,
            getContext: vi.fn().mockReturnValue(mockContext)
        };

        // Mock document.createElement
        vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
            if (tagName === 'canvas') return mockCanvas as unknown as HTMLCanvasElement;
            return document.createElement(tagName);
        });

        // Track loaded src
        loadedSrc = undefined;

        // Mock Image
        global.Image = class {
            onload: () => void = () => { };
            onerror: (e: unknown) => void = () => { };
            src: string = '';
            crossOrigin: string = '';
            constructor() {
                setTimeout(() => {
                    loadedSrc = this.src;
                    this.onload();
                }, 10); // Simulate async load
            }
        } as unknown as typeof Image;

        extractor = new ColorExtractor();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should extract a palette from an image', async () => {
        const palette = await extractor.extractPalette('test.jpg');

        expect(palette).toBeDefined();
        expect(palette.primary_color).toBeDefined();
        expect(palette.colors.length).toBeGreaterThan(0);
        expect(mockContext.drawImage).toHaveBeenCalled();
        expect(mockContext.getImageData).toHaveBeenCalled();
    });

    it('should handle monochrome images', async () => {
        mockContext.getImageData.mockReturnValue({
            data: new Uint8ClampedArray([
                100, 100, 100, 255,
                100, 100, 100, 255
            ]),
            width: 2,
            height: 1
        });

        const palette = await extractor.extractPalette('mono.jpg');
        expect(palette.is_monochrome).toBe(true);
        expect(palette.saturation).toBeLessThan(0.1);
    });

    it('should use fallback palette on error', async () => {
        // Force error by mocking getContext to return null
        mockCanvas.getContext.mockReturnValue(null);
        // Re-instantiate to pick up the null context
        extractor = new ColorExtractor();

        const palette = await extractor.extractPalette('error.jpg');
        expect(palette.primary_color).toBe('#000000'); // Fallback primary
        expect(palette.is_monochrome).toBe(true);
    });

    describe('resolveUrl option', () => {
        it('should call resolveUrl callback with the image URL', async () => {
            const resolveUrl = vi.fn().mockResolvedValue('resolved-url.jpg');
            extractor = new ColorExtractor({ resolveUrl });

            await extractor.extractPalette('original-url.jpg');

            expect(resolveUrl).toHaveBeenCalledWith('original-url.jpg');
        });

        it('should use resolved URL to load the image', async () => {
            const resolveUrl = vi.fn().mockResolvedValue('https://arweave.net/resolved-image.jpg');
            extractor = new ColorExtractor({ resolveUrl });

            await extractor.extractPalette('https://turbo-gateway.com/original-image.jpg');

            // Wait for the image to load and check the src
            await new Promise(resolve => setTimeout(resolve, 20));
            expect(loadedSrc).toBe('https://arweave.net/resolved-image.jpg');
        });

        it('should use custom resolveUrl over default arweaveGatewayManager', async () => {
            const customResolver = vi.fn().mockImplementation(
                (url: string) => Promise.resolve(url.replace('arweave.net', 'custom-gateway.com'))
            );
            extractor = new ColorExtractor({ resolveUrl: customResolver });

            await extractor.extractPalette('https://arweave.net/abc123');

            expect(customResolver).toHaveBeenCalledWith('https://arweave.net/abc123');
            await new Promise(resolve => setTimeout(resolve, 20));
            expect(loadedSrc).toBe('https://custom-gateway.com/abc123');
        });

        it('should handle ar:// protocol URLs via resolveUrl', async () => {
            const resolveUrl = vi.fn().mockResolvedValue('https://arweave.net/converted-txid');
            extractor = new ColorExtractor({ resolveUrl });

            await extractor.extractPalette('ar://abc123');

            expect(resolveUrl).toHaveBeenCalledWith('ar://abc123');
        });
    });
});
