/**
 * Test audio URLs and fixtures for AudioAnalyzer testing
 */

export const TEST_AUDIO_URLS = {
    // Arweave-hosted test track
    arweaveTrack: 'https://arweave.net/G9lus_CuOViy1M-sLbQXGXnV2wYGPodYAcGP5akM8EU',
};

/**
 * Sample playlist track with test audio URL for integration testing
 */
export const SAMPLE_TEST_TRACK = {
    id: 'arweave-test-track-1',
    uuid: 'test-track-uuid-001',
    playlist_index: 0,
    chain_name: 'arweave',
    token_address: 'test-addr',
    token_id: '1',
    platform: 'arweave',
    title: 'Test Audio Track',
    artist: 'Test Artist',
    image_url: 'https://arweave.net/Zc09ELTlfM3KA4sdwS9enG6kZJXx3dQFsaYNCrJLSIk',
    audio_url: TEST_AUDIO_URLS.arweaveTrack,
    duration: 180, // Estimated duration in seconds
    genre: 'Electronic',
    tags: ['test', 'audio-analysis'],
};

/**
 * Expected characteristics for the test audio (for validation)
 * These should be roughly validated by the audio analyzer
 */
export const TEST_AUDIO_CHARACTERISTICS = {
    // Approximate ranges expected from the test track
    minDuration: 120, // At least 2 minutes
    maxDuration: 600, // At most 10 minutes
    minAvgAmplitude: 0.1,
    maxAvgAmplitude: 0.95,
};
