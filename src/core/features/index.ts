/**
 * Features module - Class features and racial traits system
 *
 * Provides extensible feature and trait management with validation.
 */

// Type definitions
export type {
    FeatureEffectType,
    FeatureEffect,
    FeaturePrerequisite,
    FeatureType,
    FeatureSource,
    ClassFeature,
    RacialTrait,
    CharacterFeature,
    CharacterTrait,
    ValidationResult
} from './FeatureTypes.js';

// FeatureQuery - Main query interface for features and traits
export { FeatureQuery, getFeatureQuery } from './FeatureQuery.js';

// Default features and traits
export { DEFAULT_CLASS_FEATURES, DEFAULT_RACIAL_TRAITS } from '../../constants/DefaultFeatures.js';

// FeatureEffectApplier - Applies feature effects to characters
export { FeatureEffectApplier } from './FeatureEffectApplier.js';

// Re-export EffectApplicationResult from Equipment types for API consistency
export type { EffectApplicationResult } from '../types/Equipment.js';

// FeatureValidator - Validates features and traits
export {
    FeatureValidator,
    validateClassFeature,
    validateRacialTrait,
    validateClassFeatures,
    validateRacialTraits,
    type ValidationResult as FeatureValidationResult
} from './FeatureValidator.js';
