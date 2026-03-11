import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MusicClassifier } from './MusicClassifier.js';

// Mock fetch
global.fetch = vi.fn();

// Mock AudioContext
class MockAudioContext {
    decodeAudioData = vi.fn().mockResolvedValue({
        getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
        duration: 300
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

describe('MusicClassifier', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPredict.mockReset();
    });

    it('should analyze genre, mood, and danceability', async () => {
        // Setup mock fetch response
        (global.fetch as any).mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        // Mock predictions for 3 models calls
        mockPredict
            // Genre (87 classes)
            .mockResolvedValueOnce(Array.from({ length: 87 }, (_, i) => i === 73 ? 0.9 : 0.01))
            // Mood (62 classes)
            .mockResolvedValueOnce(Array.from({ length: 62 }, (_, i) => i === 26 ? 0.85 : 0.01)) // 26 = happy
            // Danceability [danceable, non-danceable]
            .mockResolvedValueOnce([0.7, 0.3]);

        const classifier = new MusicClassifier({ topN: 3, threshold: 0.1 });
        const profile = await classifier.analyze('https://example.com/test-audio.mp3');

        expect(profile).toBeDefined();
        expect(profile.primary_genre).toBe('rock');
        expect(profile.mood_tags).toContain('happy');
        expect(profile.vibe_metrics?.danceability).toBe(0.7);
        expect(profile.vibe_metrics?.valence).toBe(0.85); // Derived from 'happy'

        expect(profile.analysis_metadata.models_used.length).toBe(3);
        expect(profile.analysis_metadata.duration_analyzed).toBe(300);
    });

    it('should handle missing models gracefully', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

        // Only genre
        mockPredict.mockResolvedValueOnce(Array.from({ length: 87 }, (_, i) => i === 0 ? 0.9 : 0.01));

        const classifier = new MusicClassifier({
            models: {
                genre: 'mock-url',
                mood: undefined,
                danceability: undefined
            }
        });

        const profile = await classifier.analyze('https://example.com/test-audio.mp3');

        expect(profile.genres.length).toBe(1);
        expect(profile.moods.length).toBe(0);
        expect(profile.vibe_metrics?.danceability).toBeUndefined();
    });
});
