# Add `image_thumb_url` Field to Track Objects

## Overview

Add an optional `image_thumb_url` field to parsed track objects. This field maps to either `image_thumb` or `image_thumb_url` from the original metadata, providing a separate thumbnail URL alongside the existing `image_url` field.

**Key Difference from `image_url`:**
- `image_url` uses a priority queue (`image_small > image > image_large > image_thumb`)
- `image_thumb_url` directly extracts from `image_thumb` or `image_thumb_url` fields only

---

## Phase 1: Core Type & Extraction Changes

- [x] **1.1 Update PlaylistTrack Type**
  - [x] File: `src/core/types/Playlist.ts`
  - [x] Add `image_thumb_url?: string` to `PlaylistTrack` interface (after `image_url` field)
  - [x] Add JSDoc comment explaining the field

- [x] **1.2 Add Image Thumb Extractor**
  - [x] File: `src/core/parser/MetadataExtractor.ts`
  - [x] Add new static method `extractImageThumbUrl(data: Record<string, unknown>): string | null`
  - [x] Check for `image_thumb_url` first, then fall back to `image_thumb`
  - [x] Return null if neither exists

- [x] **1.3 Update PlaylistParser**
  - [x] File: `src/core/parser/PlaylistParser.ts`
  - [x] In `parseTrack()` method, add call to `MetadataExtractor.extractImageThumbUrl()`
  - [x] Add `image_thumb_url` to the track object being built (only if not null)

---

## Phase 2: Validation & Utilities

- [x] **2.1 Update Validation Schema**
  - [x] File: `src/utils/validators.ts`
  - [x] Add `image_thumb_url: z.string().url().optional()` to `PlaylistTrackSchema`

- [x] **2.2 Update Playlist Utilities**
  - [x] File: `src/utils/playlistUtils.ts`
  - [x] Add `image_thumb_url?: string` to `SimpleTrack` interface
  - [x] Add `image_thumb_url?: string` to `VRMTrack` interface
  - [x] Add `extractImageThumbUrlFromTrack()` helper function
  - [x] Update `getTracks()` to include `image_thumb_url`
  - [x] Update `getFullTracks()` to include `image_thumb_url`
  - [x] Update `getVRMTracks()` to include `image_thumb_url`

---

## Phase 3: Test Fixtures

- [ ] **3.1 Update Sample Test Data**
  - [ ] File: `tests/fixtures/sampleData.ts`
  - [ ] Add `image_thumb_url` to `sampleTrack` object

---

## Phase 4: Documentation Updates

- [ ] **4.1 Update DATA_ENGINE_REFERENCE.md**
  - [ ] Update `PlaylistTrack` type table - add `image_thumb_url` field
  - [ ] Update `MetadataExtractor` methods table - add `extractImageThumbUrl()` method
  - [ ] Update Playlist Utilities section - update `SimpleTrack` and `VRMTrack` descriptions
  - [ ] Update `PlaylistTrackSchema` description if needed

- [ ] **4.2 Update USAGE_IN_OTHER_PROJECTS.md**
  - [ ] Update `getTracks()` output example
  - [ ] Update `getFullTracks()` output example
  - [ ] Update `getVRMTracks()` output example

---

## Phase 5: Build & Verify

- [ ] **5.1 Build the project**
  ```bash
  npm run build
  ```

- [ ] **5.2 Run tests to verify no regressions**
  ```bash
  npm test
  ```

---

## Files to Modify

| File | Change Type |
|------|-------------|
| `src/core/types/Playlist.ts` | Type definition |
| `src/core/parser/MetadataExtractor.ts` | New method |
| `src/core/parser/PlaylistParser.ts` | Extraction logic |
| `src/utils/validators.ts` | Schema update |
| `src/utils/playlistUtils.ts` | Utility updates |
| `tests/fixtures/sampleData.ts` | Test data |
| `DATA_ENGINE_REFERENCE.md` | Documentation |
| `USAGE_IN_OTHER_PROJECTS.md` | Documentation |

---

## Dependencies

- None - this is an additive change that doesn't break existing functionality

---

## Design Decisions

1. **Field is optional** (`image_thumb_url?: string`) - Not all metadata has thumbnail fields
2. **Priority order**: `image_thumb_url` > `image_thumb` (check `image_thumb_url` first)
3. **Separate from `image_url`** - Kept as a distinct field to give consumers both options
4. **Only added if present** - Don't add empty string to track object if no thumb exists

---

## Questions/Unknowns

- None currently - requirements are clear
