/**
 * Deterministic seed generation using MurmurHash
 */

import MurmurHashV3 from 'murmurhash-v3';

/**
 * Generate a deterministic seed from blockchain data
 * @param chainName - Blockchain name (e.g., "ethereum", "polygon")
 * @param tokenAddress - Contract address
 * @param tokenId - Token ID
 * @returns Deterministic seed string
 */
export function generateSeed(
    chainName: string,
    tokenAddress: string,
    tokenId: string
): string {
    return `${chainName}-${tokenAddress}-${tokenId}`;
}

/**
 * Hash a seed string to a float between 0.0 and 1.0
 * @param seed - Seed string
 * @returns Float between 0.0 and 1.0
 */
export function hashSeedToFloat(seed: string): number {
    const hash = MurmurHashV3(seed, 0);
    // Convert to 0.0 - 1.0 range
    return hash / 0xffffffff;
}

/**
 * Hash a seed string to an integer within a range
 * @param seed - Seed string
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns Integer in range [min, max)
 */
export function hashSeedToInt(seed: string, min: number, max: number): number {
    const float = hashSeedToFloat(seed);
    return Math.floor(float * (max - min)) + min;
}

/**
 * Create a derived seed by appending a suffix
 * @param baseSeed - Base seed string
 * @param suffix - Suffix to append
 * @returns New seed string
 */
export function deriveSeed(baseSeed: string, suffix: string): string {
    return `${baseSeed}:${suffix}`;
}
