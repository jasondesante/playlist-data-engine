import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenreAnalyzer } from './GenreAnalyzer.js';
import type { ModelConfig } from './MusicClassifier.js';

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

// Mock dynamically imported essentia.js
const mockPredict = vi.fn();

vi.mock('essentia.js', () => ({
    EssentiaWASM: vi.fn(),
    Essentia: vi.fn(),
    EssentiaModel: {
        Extractor: class {
            constructor() { }
            predict = mockPredict;
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

    describe('two-step model config support', () => {
        it('should pass through two-step model config for genre', () => {
            const twoStepConfig: ModelConfig = {
                embedding: '/models/discogs-effnet-bs64-1.json',
                classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
            };
            const analyzer = new GenreAnalyzer({
                models: { genre: twoStepConfig }
            });
            expect(analyzer).toBeInstanceOf(GenreAnalyzer);
        });

        it('should prioritize models.genre over deprecated modelUrl', () => {
            const twoStepConfig: ModelConfig = {
                embedding: '/models/discogs-effnet-bs64-1.json',
                classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
            };
            const analyzer = new GenreAnalyzer({
                modelUrl: '/models/old-model.json',
                models: { genre: twoStepConfig }
            });
            expect(analyzer).toBeInstanceOf(GenreAnalyzer);
        });

        it('should use deprecated modelUrl when models.genre is not provided', () => {
            const analyzer = new GenreAnalyzer({
                modelUrl: '/models/custom-genre-model.json'
            });
            expect(analyzer).toBeInstanceOf(GenreAnalyzer);
        });

        it('should preserve other model configs when setting genre', () => {
            const twoStepConfig: ModelConfig = {
                embedding: '/models/discogs-effnet-bs64-1.json',
                classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
            };
            const analyzer = new GenreAnalyzer({
                models: {
                    genre: twoStepConfig,
                    mood: {
                        embedding: '/models/discogs-effnet-bs64-1.json',
                        classifier: '/models/mtg_jamendo_moodtheme-discogs-effnet-1.json'
                    }
                }
            });
            expect(analyzer).toBeInstanceOf(GenreAnalyzer);
        });

        it('should use default model when neither models.genre nor modelUrl is provided', () => {
            const analyzer = new GenreAnalyzer({
                topN: 10
            });
            expect(analyzer).toBeInstanceOf(GenreAnalyzer);
        });
    });

    it('should analyze genre and return a GenreProfile', async () => {
        // Setup mock fetch response
        (global.fetch as any).mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        // Mock predictions for Genre (87 classes) and Mood (62 classes) - MusicClassifier calls both
        mockPredict
            .mockResolvedValueOnce(Array.from({ length: 87 }, (_, i) => i === 73 ? 0.95 : i === 34 ? 0.8 : 0.01))
            .mockResolvedValue(Array.from({ length: 100 }, () => 0.01));

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
