/**
 * Image URL Validator Utility
 *
 * Validates icon and image URL fields for all entity types.
 * Used by validators across the engine to ensure consistent URL validation.
 *
 * Valid URL formats:
 * - Absolute URLs: http://... or https://...
 * - Relative URLs: /... (starting with slash)
 * - Asset paths: assets/... (for bundled assets)
 */

/**
 * Valid URL prefixes for image/icon fields
 */
const VALID_IMAGE_PREFIXES: ReadonlyArray<string> = [
    'http://',
    'https://',
    '/',
    'assets/'
] as const;

/**
 * Validation result for individual image field validation
 */
export interface ImageValidationResult {
    /** Whether the URL is valid */
    valid: boolean;
    /** Array of error messages (empty if valid) */
    errors: string[];
}

/**
 * Check if a URL string is a valid image URL format
 *
 * Valid formats:
 * - http://example.com/image.png
 * - https://example.com/image.png
 * - /assets/images/icon.png
 * - assets/images/icon.png (no leading slash)
 *
 * @param url - The URL string to validate
 * @returns True if the URL has a valid format
 */
export function isValidImageUrl(url: string): boolean {
    if (typeof url !== 'string') {
        return false;
    }

    // Empty strings are not valid
    if (url.trim() === '') {
        return false;
    }

    // Check if URL starts with any valid prefix
    return VALID_IMAGE_PREFIXES.some(prefix => url.startsWith(prefix));
}

/**
 * Validate an image URL field value
 *
 * Validates that the value is either undefined (optional field)
 * or a valid URL string with an allowed prefix.
 *
 * @param value - The value to validate (should be string or undefined)
 * @param fieldName - The name of the field being validated (e.g., 'icon', 'image')
 * @returns Validation result with errors if any
 */
export function validateImageUrl(value: unknown, fieldName: string): ImageValidationResult {
    // Undefined is valid (optional field)
    if (value === undefined) {
        return { valid: true, errors: [] };
    }

    // Must be a string
    if (typeof value !== 'string') {
        return {
            valid: false,
            errors: [`${fieldName} must be a string`]
        };
    }

    // Empty string is invalid
    if (value.trim() === '') {
        return {
            valid: false,
            errors: [`${fieldName} cannot be an empty string`]
        };
    }

    // Check for valid prefix
    if (!isValidImageUrl(value)) {
        return {
            valid: false,
            errors: [
                `${fieldName} must start with one of: ${VALID_IMAGE_PREFIXES.join(', ')} (got: "${value}")`
            ]
        };
    }

    return { valid: true, errors: [] };
}

/**
 * Validate both icon and image fields on an object
 *
 * Convenience function for validating both image fields at once.
 * Returns an array of error messages for invalid fields.
 *
 * @param obj - Object with optional icon and image fields
 * @returns Array of error messages (empty if all valid)
 */
export function validateImageFields(obj: { icon?: unknown; image?: unknown }): string[] {
    const errors: string[] = [];

    const iconResult = validateImageUrl(obj.icon, 'icon');
    if (!iconResult.valid) {
        errors.push(...iconResult.errors);
    }

    const imageResult = validateImageUrl(obj.image, 'image');
    if (!imageResult.valid) {
        errors.push(...imageResult.errors);
    }

    return errors;
}

/**
 * Get list of valid image URL prefixes
 *
 * Useful for documentation or error messages.
 *
 * @returns Array of valid prefix strings
 */
export function getValidImagePrefixes(): ReadonlyArray<string> {
    return VALID_IMAGE_PREFIXES;
}
