# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Batch Image Duplicate Entries Bug**: Fixed `batchUpdateImages()` and `batchByCategory()` creating duplicate entries instead of patching existing items
  - Root cause: Methods stored complete item copies in `extensions` Map with `mode: 'replace'`, causing duplicates when combined with defaults
  - Solution: New patch-based `imageOverrides` system stores only icon/image changes keyed by item identifier
  - Added `imageOverrides` private Map to store patches separately from item data
  - `get()` now applies image patches on retrieval, avoiding duplicates

### Added

- **Image Override API**: New methods for managing image patches
  - `getImageOverrides()`: Get all image overrides for all categories
  - `getImageOverridesForCategory(category)`: Get overrides for a specific category
  - `restoreImageOverrides(category, overrides)`: Restore saved overrides (for persistence)
  - `clearImageOverrides(category)`: Clear all overrides for a category
  - `clearAllImageOverrides()`: Clear all overrides for all categories
- **ImageOverride Type**: New exported type for image patches with `identifier`, `icon`, `image`, `appliedAt` fields

## [1.1.0] - 2025-02-27

### Added

- **Sensitivity Parameter**: New `sensitivity` parameter (0.1-10.0, default: 1.0) in `BeatMapGeneratorOptions` for pre-processing control over beat detection aggressiveness
  - Values < 1.0: Less sensitive, stricter tempo adherence (fewer beats detected)
  - Values = 1.0: Default algorithm behavior
  - Values > 1.0: More sensitive, more flexible (more beats detected)
  - Implemented in `BeatTracker.ts` via `effectiveDpAlpha = dpAlpha / sensitivity`

- **Grid-Alignment Filter**: New `filter` parameter (0.0-1.0, default: 0.0) in `BeatMapGeneratorOptions` for post-processing beat filtering
  - Value 0.0: No filtering (default, all beats kept)
  - Value 0.5: Remove beats significantly off the 1/4 note grid
  - Value 1.0: Keep only beats exactly on the 1/4 note grid

### Changed

- **Breaking Change (Internal)**: Renamed `intensityThreshold` to `sensitivity` in `BeatMapGeneratorOptions`
  - Note: The old `intensityThreshold` was never functional in the released version, so this is not a breaking API change for consumers

### Tests

- Added comprehensive unit tests for sensitivity parameter (6 tests)
- Added comprehensive unit tests for filter parameter (6 tests)
- Added integration tests for sensitivity/filter combinations (4 tests)

### Documentation

- Updated `docs/AUDIO_ANALYSIS.md` with sensitivity and filter parameter documentation
- Updated `DATA_ENGINE_REFERENCE.md` with new parameter references
