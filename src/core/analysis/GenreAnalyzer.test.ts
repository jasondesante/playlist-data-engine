import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenreAnalyzer } from './GenreAnalyzer.js';

// Mock fetch
global.fetch = vi.fn();

// Mock AudioContext
class MockAudioContext {
    decodeAudioData = vi.fn().mockResolvedValue({
        getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
        duration: 2.5
    });
}
(global as any).window = {
    AudioContext: MockAudioContext
};

// Mock dynamically imported essentia.js and essentia.js-model
vi.mock('essentia.js', () => ({
    EssentiaWASM: vi.fn(),
    Essentia: vi.fn(),
    EssentiaModel: {
        Extractor: class {
            constructor() { }
            predict = vi.fn().mockResolvedValue(
                // Mock array of 87 probabilities where index 73 ('rock') has high probability
                Array.from({ length: 87 }, (_, i) => i === 73 ? 0.95 : i === 34 ? 0.8 : 0.01) // 34 = electronic
            )
        }
    }
}));

describe('GenreAnalyzer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default options', () => {
        const analyzer = new GenreAnalyzer();
        // Since options is private, we can't easily assert exactly, but we know it instantiated
        expect(analyzer).toBeInstanceOf(GenreAnalyzer);
    });

    it('should analyze genre and return a GenreProfile', async () => {
        // Setup mock fetch response
        (global.fetch as any).mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        const analyzer = new GenreAnalyzer({ topN: 3, threshold: 0.1 });
        const profile = await analyzer.analyzeGenre('https://example.com/test-audio.mp3');

        expect(profile).toBeDefined();
        // Check if map to jamendo tags worked
        expect(profile.genres.length).toBe(2);

        // Ensure probabilities mapped and sorted correctly
        expect(profile.genres[0].name).toBe('rock');
        expect(profile.genres[0].confidence).toBe(0.95);
        expect(profile.genres[1].name).toBe('electronic');
        expect(profile.genres[1].confidence).toBe(0.8);

        expect(profile.primary_genre).toBe('rock');
        expect(profile.analysis_metadata.duration_analyzed).toBe(2.5);
    });

    it('should throw an error if audio fetch fails', async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

        const analyzer = new GenreAnalyzer();
        await expect(analyzer.analyzeGenre('invalid-url')).rejects.toThrow('Network error');
    });
});
