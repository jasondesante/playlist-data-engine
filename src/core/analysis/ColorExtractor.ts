import type { ColorPalette } from '../types/AudioProfile';
import { arweaveGatewayManager } from '../../utils/arweaveGatewayManager.js';

/**
 * Configuration options for ColorExtractor.
 *
 * Gateway resolution is automatic - Arweave URLs are resolved with fallback
 * using the default arweaveGatewayManager. No configuration needed.
 */
export interface ColorExtractorOptions {
    // Reserved for future options
}

/**
 * Extract color palettes from images using k-means and median-cut algorithms
 * Analyzes image pixels to identify dominant colors and brightness characteristics
 */
export class ColorExtractor {
    private canvas: HTMLCanvasElement | null = null;
    private context: CanvasRenderingContext2D | null = null;

    /**
     * Initialize ColorExtractor with canvas for image processing
     * Canvas is only created in browser environments (safe for Node.js)
     *
     * @param _options - Configuration options (reserved for future use)
     */
    constructor(_options: ColorExtractorOptions = {}) {

        if (typeof document !== 'undefined') {
            this.canvas = document.createElement('canvas');
            this.canvas.width = 100;
            this.canvas.height = 100;
            this.context = this.canvas.getContext('2d', { willReadFrequently: true });
        }
    }

    /**
     * Extract dominant colors from image URL
     *
     * Applies k-means clustering (primary) or median-cut (fallback) to identify
     * the 4 most representative colors in the image. Analyzes color frequency,
     * brightness, saturation, and monochrome characteristics.
     *
     * Arweave URLs are automatically resolved with gateway fallback via
     * arweaveGatewayManager.resolveUrl - no configuration needed.
     *
     * @param {string} imageUrl - URL of the image to analyze
     * @returns {Promise<ColorPalette>} Color palette with dominant colors and characteristics
     * @throws {Error} If canvas is not supported in the environment
     *
     * @example
     * const extractor = new ColorExtractor();
     * const palette = await extractor.extractPalette('https://example.com/image.jpg');
     * console.log(`Primary color: ${palette.primary_color}`);
     */
    public async extractPalette(imageUrl: string): Promise<ColorPalette> {
        try {
            if (!this.context || !this.canvas) {
                throw new Error('Canvas not supported in this environment');
            }

            // Resolve URL using arweaveGatewayManager (automatic gateway fallback)
            const resolvedUrl = await arweaveGatewayManager.resolveUrl(imageUrl);

            const image = await this.loadImage(resolvedUrl);
            this.context.drawImage(image, 0, 0, 100, 100);
            const imageData = this.context.getImageData(0, 0, 100, 100);
            const pixels = this.getPixels(imageData);

            if (pixels.length === 0) {
                return this.getFallbackPalette();
            }

            // Try k-means first, fall back to median cut if needed
            let colors = this.kMeans(pixels, 4);
            if (colors.length < 4) {
                colors = this.medianCut(pixels, 4);
            }

            const sortedColors = this.sortColorsByFrequency(pixels, colors);
            return this.analyzePalette(sortedColors);
        } catch (error) {
            console.warn('Color extraction failed, using fallback:', error);
            return this.getFallbackPalette();
        }
    }

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = url;
        });
    }

    private getPixels(imageData: ImageData): number[][] {
        const pixels: number[][] = [];
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];
            if (a >= 128) { // Ignore transparent pixels
                pixels.push([r, g, b]);
            }
        }
        return pixels;
    }

    /**
     * K-means clustering algorithm for color quantization
     */
    private kMeans(pixels: number[][], k: number): number[][] {
        if (pixels.length === 0) return [];
        if (pixels.length < k) return pixels;

        // Initialize centroids randomly from pixels
        let centroids: number[][] = [];
        const indices = new Set<number>();
        while (centroids.length < k && centroids.length < pixels.length) {
            const idx = Math.floor(Math.random() * pixels.length);
            if (!indices.has(idx)) {
                indices.add(idx);
                centroids.push([...pixels[idx]]);
            }
        }

        for (let iteration = 0; iteration < 10; iteration++) {
            const clusters: number[][][] = Array.from({ length: k }, () => []);

            // Assign pixels to nearest centroid
            for (const pixel of pixels) {
                let minDist = Infinity;
                let clusterIndex = 0;
                for (let j = 0; j < centroids.length; j++) {
                    const dist = this.distance(pixel, centroids[j]);
                    if (dist < minDist) {
                        minDist = dist;
                        clusterIndex = j;
                    }
                }
                clusters[clusterIndex].push(pixel);
            }

            // Update centroids
            const newCentroids: number[][] = [];
            for (let i = 0; i < k; i++) {
                if (clusters[i].length === 0) {
                    newCentroids.push(centroids[i]);
                } else {
                    const sum = clusters[i].reduce(
                        (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
                        [0, 0, 0]
                    );
                    newCentroids.push([
                        Math.round(sum[0] / clusters[i].length),
                        Math.round(sum[1] / clusters[i].length),
                        Math.round(sum[2] / clusters[i].length)
                    ]);
                }
            }

            // Check for convergence
            if (newCentroids.every((c, i) => c[0] === centroids[i][0] && c[1] === centroids[i][1] && c[2] === centroids[i][2])) {
                break;
            }

            centroids = newCentroids;
        }

        return centroids;
    }

    /**
     * Median cut algorithm for color quantization (fallback)
     */
    private medianCut(pixels: number[][], k: number): number[][] {
        if (pixels.length === 0) return [];

        const result: number[][] = [];
        const boxes: Array<{ pixels: number[][], depth: number }> = [
            { pixels: [...pixels], depth: 0 }
        ];

        while (boxes.length < k && boxes.length > 0) {
            // Find box with largest range
            let maxBox = boxes[0];
            let maxBoxIndex = 0;
            let maxRange = 0;

            for (let i = 0; i < boxes.length; i++) {
                const range = this.getBoxRange(boxes[i].pixels);
                if (range > maxRange) {
                    maxRange = range;
                    maxBox = boxes[i];
                    maxBoxIndex = i;
                }
            }

            if (maxBox.pixels.length <= 1) break;

            // Split the box
            const sorted = this.sortPixelsByChannel(maxBox.pixels, maxBox.depth % 3);
            const mid = Math.floor(sorted.length / 2);

            boxes.splice(maxBoxIndex, 1);
            boxes.push(
                { pixels: sorted.slice(0, mid), depth: maxBox.depth + 1 },
                { pixels: sorted.slice(mid), depth: maxBox.depth + 1 }
            );
        }

        // Convert boxes to average colors
        for (const box of boxes) {
            if (box.pixels.length > 0) {
                const avg = box.pixels.reduce(
                    (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
                    [0, 0, 0]
                );
                result.push([
                    Math.round(avg[0] / box.pixels.length),
                    Math.round(avg[1] / box.pixels.length),
                    Math.round(avg[2] / box.pixels.length)
                ]);
            }
        }

        return result.slice(0, k);
    }

    private getBoxRange(pixels: number[][]): number {
        if (pixels.length === 0) return 0;

        let minR = Infinity, maxR = -Infinity;
        let minG = Infinity, maxG = -Infinity;
        let minB = Infinity, maxB = -Infinity;

        for (const [r, g, b] of pixels) {
            minR = Math.min(minR, r);
            maxR = Math.max(maxR, r);
            minG = Math.min(minG, g);
            maxG = Math.max(maxG, g);
            minB = Math.min(minB, b);
            maxB = Math.max(maxB, b);
        }

        return Math.max(maxR - minR, maxG - minG, maxB - minB);
    }

    private sortPixelsByChannel(pixels: number[][], channel: number): number[][] {
        return [...pixels].sort((a, b) => a[channel] - b[channel]);
    }

    private distance(p1: number[], p2: number[]): number {
        return Math.sqrt(
            Math.pow(p1[0] - p2[0], 2) +
            Math.pow(p1[1] - p2[1], 2) +
            Math.pow(p1[2] - p2[2], 2)
        );
    }

    private sortColorsByFrequency(pixels: number[][], colors: number[][]): number[][] {
        // Count frequency of each color in the original pixels
        const colorFrequency: Map<string, number> = new Map();

        for (const pixel of pixels) {
            let nearest = colors[0];
            let minDist = Infinity;
            for (const color of colors) {
                const dist = this.distance(pixel, color);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = color;
                }
            }
            const key = `${nearest[0]},${nearest[1]},${nearest[2]}`;
            colorFrequency.set(key, (colorFrequency.get(key) || 0) + 1);
        }

        return colors.sort((a, b) => {
            const keyA = `${a[0]},${a[1]},${a[2]}`;
            const keyB = `${b[0]},${b[1]},${b[2]}`;
            return (colorFrequency.get(keyB) || 0) - (colorFrequency.get(keyA) || 0);
        });
    }

    private analyzePalette(colors: number[][]): ColorPalette {
        const hexColors = colors.map(c => this.rgbToHex(c[0], c[1], c[2]));

        // Ensure we have at least 1 color
        if (hexColors.length === 0) {
            return this.getFallbackPalette();
        }

        const primaryColor = hexColors[0];
        const secondaryColor = hexColors[1];
        const accentColor = hexColors[2];

        const brightness = this.getBrightness(colors[0]);
        const saturation = this.getSaturation(colors[0]);
        const isMonochrome = saturation < 0.1;

        return {
            colors: hexColors,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            accent_color: accentColor,
            brightness: brightness / 255,
            saturation,
            is_monochrome: isMonochrome
        };
    }

    private getBrightness(rgb: number[]): number {
        return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    }

    private getSaturation(rgb: number[]): number {
        const max = Math.max(rgb[0], rgb[1], rgb[2]);
        const min = Math.min(rgb[0], rgb[1], rgb[2]);
        if (max === 0) return 0;
        return (max - min) / max;
    }

    private rgbToHex(r: number, g: number, b: number): string {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    private getFallbackPalette(): ColorPalette {
        return {
            colors: ['#000000', '#333333', '#666666'],
            primary_color: '#000000',
            secondary_color: '#333333',
            accent_color: '#666666',
            brightness: 0,
            saturation: 0,
            is_monochrome: true
        };
    }
}
