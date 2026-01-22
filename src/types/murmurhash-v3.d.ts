/**
 * Type declarations for murmurhash-v3
 *
 * This package provides no built-in TypeScript definitions.
 * These declarations are based on the package's actual API.
 *
 * @see https://www.npmjs.com/package/murmurhash-v3
 */
declare module 'murmurhash-v3' {
    /**
     * MurmurHash V3 hash function
     *
     * @param key - The string to hash
     * @param seed - The seed value (unsigned integer, default: 0)
     * @returns A 32-bit unsigned integer hash value
     */
    function MurmurHashV3(key: string, seed?: number): number;

    export = MurmurHashV3;
}
