/**
 * ImageValidator Unit Tests
 *
 * Tests for image URL validation functionality.
 * Part of Phase 5.1: Unit Tests for ImageValidator.
 */

import { describe, it, expect } from 'vitest';
import {
    isValidImageUrl,
    validateImageUrl,
    validateImageFields,
    getValidImagePrefixes
} from '../../src/core/utils/ImageValidator.js';

describe('ImageValidator', () => {
    describe('isValidImageUrl', () => {
        describe('valid URLs', () => {
            it('should return true for http:// URLs', () => {
                expect(isValidImageUrl('http://example.com/image.png')).toBe(true);
                expect(isValidImageUrl('http://localhost:3000/icons/fire.png')).toBe(true);
                expect(isValidImageUrl('http://cdn.example.com/assets/icon.svg')).toBe(true);
            });

            it('should return true for https:// URLs', () => {
                expect(isValidImageUrl('https://example.com/image.png')).toBe(true);
                expect(isValidImageUrl('https://cdn.example.com/icons/fire.png')).toBe(true);
                expect(isValidImageUrl('https://raw.githubusercontent.com/user/repo/main/icon.png')).toBe(true);
            });

            it('should return true for URLs starting with /', () => {
                expect(isValidImageUrl('/assets/images/icon.png')).toBe(true);
                expect(isValidImageUrl('/icons/fire.png')).toBe(true);
                expect(isValidImageUrl('/images/equipment/longsword.png')).toBe(true);
            });

            it('should return true for URLs starting with assets/', () => {
                expect(isValidImageUrl('assets/images/icon.png')).toBe(true);
                expect(isValidImageUrl('assets/icons/fire.png')).toBe(true);
                expect(isValidImageUrl('assets/equipment/longsword.png')).toBe(true);
            });
        });

        describe('invalid URLs', () => {
            it('should return false for ftp:// URLs', () => {
                expect(isValidImageUrl('ftp://example.com/image.png')).toBe(false);
            });

            it('should return false for empty strings', () => {
                expect(isValidImageUrl('')).toBe(false);
                expect(isValidImageUrl('   ')).toBe(false);
            });

            it('should return false for relative paths without valid prefix', () => {
                expect(isValidImageUrl('images/icon.png')).toBe(false);
                expect(isValidImageUrl('./assets/icon.png')).toBe(false);
                expect(isValidImageUrl('../icons/fire.png')).toBe(false);
            });

            it('should return false for data URLs', () => {
                expect(isValidImageUrl('data:image/png;base64,abc123')).toBe(false);
            });

            it('should return false for file:// URLs', () => {
                expect(isValidImageUrl('file:///path/to/image.png')).toBe(false);
            });

            it('should return false for non-string values', () => {
                expect(isValidImageUrl(123 as unknown as string)).toBe(false);
                expect(isValidImageUrl(null as unknown as string)).toBe(false);
                expect(isValidImageUrl(undefined as unknown as string)).toBe(false);
                expect(isValidImageUrl({} as unknown as string)).toBe(false);
                expect(isValidImageUrl([] as unknown as string)).toBe(false);
            });
        });
    });

    describe('validateImageUrl', () => {
        describe('with undefined values', () => {
            it('should return valid for undefined (optional field)', () => {
                const result = validateImageUrl(undefined, 'icon');
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should return valid for undefined image field', () => {
                const result = validateImageUrl(undefined, 'image');
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });

        describe('with non-string values', () => {
            it('should return invalid for numbers', () => {
                const result = validateImageUrl(123, 'icon');
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('icon must be a string');
            });

            it('should return invalid for null', () => {
                const result = validateImageUrl(null, 'image');
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('image must be a string');
            });

            it('should return invalid for objects', () => {
                const result = validateImageUrl({ url: 'test' }, 'icon');
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('icon must be a string');
            });

            it('should return invalid for arrays', () => {
                const result = validateImageUrl(['/path/to/icon.png'], 'image');
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('image must be a string');
            });

            it('should return invalid for booleans', () => {
                const result = validateImageUrl(true, 'icon');
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('icon must be a string');
            });
        });

        describe('with empty strings', () => {
            it('should return invalid for empty string', () => {
                const result = validateImageUrl('', 'icon');
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('icon cannot be an empty string');
            });

            it('should return invalid for whitespace-only string', () => {
                const result = validateImageUrl('   ', 'image');
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('image cannot be an empty string');
            });
        });

        describe('with invalid prefixes', () => {
            it('should return invalid for invalid prefix and include the URL in error', () => {
                const result = validateImageUrl('ftp://example.com/icon.png', 'icon');
                expect(result.valid).toBe(false);
                expect(result.errors[0]).toContain('icon must start with one of:');
                expect(result.errors[0]).toContain('ftp://example.com/icon.png');
            });

            it('should return invalid for relative path without valid prefix', () => {
                const result = validateImageUrl('images/icon.png', 'image');
                expect(result.valid).toBe(false);
                expect(result.errors[0]).toContain('image must start with one of:');
            });
        });

        describe('with valid URLs', () => {
            it('should return valid for http:// URLs', () => {
                const result = validateImageUrl('http://example.com/icon.png', 'icon');
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should return valid for https:// URLs', () => {
                const result = validateImageUrl('https://example.com/image.png', 'image');
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should return valid for /-prefixed URLs', () => {
                const result = validateImageUrl('/assets/icons/fire.png', 'icon');
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should return valid for assets/-prefixed URLs', () => {
                const result = validateImageUrl('assets/icons/fire.png', 'image');
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });
    });

    describe('validateImageFields', () => {
        describe('with both fields valid', () => {
            it('should return empty errors for valid icon and image', () => {
                const errors = validateImageFields({
                    icon: '/assets/icons/fire.png',
                    image: '/assets/images/fireball.png'
                });
                expect(errors).toEqual([]);
            });

            it('should return empty errors for undefined icon and image', () => {
                const errors = validateImageFields({
                    icon: undefined,
                    image: undefined
                });
                expect(errors).toEqual([]);
            });

            it('should return empty errors for valid icon only', () => {
                const errors = validateImageFields({
                    icon: 'https://example.com/icon.png',
                    image: undefined
                });
                expect(errors).toEqual([]);
            });

            it('should return empty errors for valid image only', () => {
                const errors = validateImageFields({
                    icon: undefined,
                    image: 'https://example.com/image.png'
                });
                expect(errors).toEqual([]);
            });
        });

        describe('with invalid fields', () => {
            it('should return errors for invalid icon', () => {
                const errors = validateImageFields({
                    icon: 'invalid-url',
                    image: undefined
                });
                expect(errors.length).toBe(1);
                expect(errors[0]).toContain('icon must start with one of:');
            });

            it('should return errors for invalid image', () => {
                const errors = validateImageFields({
                    icon: undefined,
                    image: 'ftp://example.com/image.png'
                });
                expect(errors.length).toBe(1);
                expect(errors[0]).toContain('image must start with one of:');
            });

            it('should return errors for both invalid fields', () => {
                const errors = validateImageFields({
                    icon: '',
                    image: 123
                });
                expect(errors.length).toBe(2);
                expect(errors.some(e => e.includes('icon cannot be an empty string'))).toBe(true);
                expect(errors.some(e => e.includes('image must be a string'))).toBe(true);
            });

            it('should return errors for non-string icon and image', () => {
                const errors = validateImageFields({
                    icon: null,
                    image: {}
                });
                expect(errors.length).toBe(2);
            });
        });

        describe('with mixed valid/invalid fields', () => {
            it('should return error only for invalid field when one is valid', () => {
                const errors = validateImageFields({
                    icon: '/assets/valid.png',
                    image: 'invalid-url'
                });
                expect(errors.length).toBe(1);
                expect(errors[0]).toContain('image must start with one of:');
            });
        });
    });

    describe('getValidImagePrefixes', () => {
        it('should return all valid prefixes', () => {
            const prefixes = getValidImagePrefixes();
            expect(prefixes).toContain('http://');
            expect(prefixes).toContain('https://');
            expect(prefixes).toContain('/');
            expect(prefixes).toContain('assets/');
        });

        it('should return exactly 4 prefixes', () => {
            const prefixes = getValidImagePrefixes();
            expect(prefixes.length).toBe(4);
        });

        it('should return a readonly array', () => {
            const prefixes = getValidImagePrefixes();
            // Verify it's an array with the expected values
            expect(Array.isArray(prefixes)).toBe(true);
            expect(prefixes).toEqual(['http://', 'https://', '/', 'assets/']);
        });
    });
});
