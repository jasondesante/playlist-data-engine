# Image Support Implementation Plan

## Overview
Add optional `icon` and `image` URL fields to all entity types managed by ExtensionManager, following the same pattern used for `description` fields. Include batch methods for mass editing capabilities.

### Design Decisions
- **Storage**: URL strings only (e.g., `https://...`, `/assets/...`)
- **Fields**: Two per entity - `icon` (small UI) and `image` (larger display)
- **Validation**: URL format (must start with `http`, `https`, `/`, or `assets/`)
- **Mass Editing**: Methods added directly to ExtensionManager

### Entity Types Getting Image Support
- Spells (60+ with class-specific lists)
- Skills (18 skills)
- Races (9 races with subraces)
- Classes (12 classes)
- Class Features (per-class features)
- Racial Traits (per-race traits)
- Equipment (80+ items)
- Enemy Templates (categories and archetypes)
- Status Effects (combat conditions)

---

## Phase 1: Type Definitions

- [x] **Task 1.1: Add image fields to Spell interface**
  - [x] Edit `src/core/spells/SpellTypes.ts`
  - [x] Add `icon?: string` and `image?: string` after `description` field (~L77)

- [ ] **Task 1.2: Add image fields to CustomSkill interface**
  - [ ] Edit `src/core/skills/SkillTypes.ts`
  - [ ] Add `icon?: string` and `image?: string` after `lore` field (~L116)

- [ ] **Task 1.3: Add image fields to ClassFeature interface**
  - [ ] Edit `src/core/features/FeatureTypes.ts`
  - [ ] Add `icon?: string` and `image?: string` after `lore` field (~L152)

- [ ] **Task 1.4: Add image fields to RacialTrait interface**
  - [ ] Edit `src/core/features/FeatureTypes.ts`
  - [ ] Add `icon?: string` and `image?: string` after `lore` field (~L190)

- [ ] **Task 1.5: Add image fields to Equipment interface**
  - [ ] Edit `src/utils/constants.ts`
  - [ ] Add `icon?: string` and `image?: string` after `description` field (~L626)

- [ ] **Task 1.6: Add image fields to ClassDataEntry interface**
  - [ ] Edit `src/utils/constants.ts`
  - [ ] Add `icon?: string` and `image?: string` after `description` field (~L176)

- [ ] **Task 1.7: Add image fields to EnemyTemplate interface**
  - [ ] Edit `src/core/types/Enemy.ts`
  - [ ] Add `icon?: string` and `image?: string` after `resistances` field (~L143)

- [ ] **Task 1.8: Add image fields to StatusEffect interface**
  - [ ] Edit `src/core/types/Combat.ts`
  - [ ] Add `icon?: string` and `image?: string` after `hasConcentration` field (~L19)

- [ ] **Task 1.9: Add image fields to RaceDataEntry interface**
  - [ ] Edit `src/constants/DefaultRaces.ts`
  - [ ] Add `icon?: string` and `image?: string` after `description` field (~L37)

**Field pattern to add:**
```typescript
/** Optional icon URL for small UI display */
icon?: string;

/** Optional image URL for larger display */
image?: string;
```

---

## Phase 2: URL Validation Utility

- [ ] **Task 2.1: Create ImageValidator utility**
  - [ ] Create new file `src/core/utils/ImageValidator.ts`
  - [ ] Implement `isValidImageUrl(url: string): boolean`
  - [ ] Implement `validateImageUrl(value: unknown, fieldName: string): { valid: boolean; errors: string[] }`
  - [ ] Implement `validateImageFields(obj: { icon?: unknown; image?: unknown }): string[]`

**Validation logic:**
- Valid prefixes: `http://`, `https://`, `/`, `assets/`
- Return `{ valid: true }` for undefined (optional field)
- Return error for non-strings or invalid prefixes

---

## Phase 3: Update Existing Validators

- [ ] **Task 3.1: Update SpellValidator**
  - [ ] Add import for `validateImageFields`
  - [ ] Add image validation in `validateSpell` method (~L129)

- [ ] **Task 3.2: Update SkillValidator**
  - [ ] Add import for `validateImageFields`
  - [ ] Add image validation in `validateSkill` method (~L146)

- [ ] **Task 3.3: Update FeatureValidator**
  - [ ] Add import for `validateImageFields`
  - [ ] Add image validation in `validateClassFeature` method (~L199)
  - [ ] Add image validation in `validateRacialTrait` method (~L306)

- [ ] **Task 3.4: Update EquipmentValidator**
  - [ ] Add import for `validateImageFields`
  - [ ] Add image validation in `validateEquipment` method (~L264)

- [ ] **Task 3.5: Update ExtensionManager validation**
  - [ ] Add import for `validateImageFields`
  - [ ] Add image validation for `races.data` category in `validateItem` (~L624)
  - [ ] Add image validation for `classes.data` category in `validateItem` (~L703)

**Validation pattern:**
```typescript
const imageErrors = validateImageFields({ icon: item.icon, image: item.image });
errors.push(...imageErrors.map(e => `${EntityType} ${e}`));
```

---

## Phase 4: Batch Methods in ExtensionManager

- [ ] **Task 4.1: Add ImageSupportedCategory type**
  - [ ] Edit `src/core/extensions/ExtensionManager.ts`
  - [ ] Add type definition for categories that support images

```typescript
export type ImageSupportedCategory =
    | 'spells'
    | 'skills'
    | 'classFeatures'
    | 'racialTraits'
    | 'equipment'
    | 'races.data'
    | 'classes.data';
```

- [ ] **Task 4.2: Implement batchAddIcons method**
  - [ ] Add method after `getAllFromPrefix` (~L928)
  - [ ] Accept category, iconMap (name/id -> URL), and optional identifierKey
  - [ ] Validate each URL before applying
  - [ ] Invalidate registry cache after updates
  - [ ] Return count of items updated

- [ ] **Task 4.3: Implement batchAddImages method**
  - [ ] Add method after `batchAddIcons`
  - [ ] Same pattern as `batchAddIcons` but for `image` field

- [ ] **Task 4.4: Implement batchUpdateImages method**
  - [ ] Add method after `batchAddImages`
  - [ ] Accept category, predicate function, and updates object
  - [ ] Validate URLs before applying
  - [ ] Apply to all items matching predicate
  - [ ] Return count of items updated

- [ ] **Task 4.5: Implement batchByCategory method**
  - [ ] Add method for bulk images by category/property
  - [ ] Accept category, property name (e.g., 'school', 'rarity'), value-to-image map
  - [ ] Example: All evocation spells get fire icon, all rare equipment gets blue border icon
  - [ ] Validate URLs before applying
  - [ ] Return count of items updated

- [ ] **Task 4.6: Add private validateImageField helper**
  - [ ] Add private method for URL validation used by batch methods

**Usage examples:**
```typescript
// Add icons to specific spells
manager.batchAddIcons('spells', {
    'Fireball': '/assets/spells/fireball.png',
    'Magic Missile': '/assets/spells/magic-missile.png'
});

// Add same icon to all cantrips
manager.batchUpdateImages('spells',
    spell => spell.level === 0,
    { icon: '/assets/spells/cantrip-icon.png' }
);

// Add images to equipment
manager.batchAddImages('equipment', {
    'Longsword': '/assets/equipment/longsword.png'
});

// Add icons by spell school (category helper)
manager.batchByCategory('spells', 'school', {
    'Evocation': '/assets/icons/fire.png',
    'Necromancy': '/assets/icons/skull.png',
    'Abjuration': '/assets/icons/shield.png',
    // etc.
});

// Add icons by equipment rarity
manager.batchByCategory('equipment', 'rarity', {
    'legendary': '/assets/icons/star-gold.png',
    'very_rare': '/assets/icons/star-purple.png',
    'rare': '/assets/icons/star-blue.png',
});
```

---

## Phase 5: Unit Tests

- [ ] **Task 5.1: Create ImageValidator tests**
  - [ ] Create `tests/unit/imageValidator.test.ts`
  - [ ] Test `isValidImageUrl` with valid URLs (http, https, /, assets/)
  - [ ] Test `isValidImageUrl` with invalid URLs (ftp, empty, relative)
  - [ ] Test `validateImageUrl` with undefined values
  - [ ] Test `validateImageUrl` with non-string values
  - [ ] Test `validateImageFields` with both icon and image

- [ ] **Task 5.2: Create ExtensionManager image method tests**
  - [ ] Create `tests/unit/extensionManager.images.test.ts`
  - [ ] Test `batchAddIcons` with valid URLs
  - [ ] Test `batchAddIcons` throws on invalid URLs
  - [ ] Test `batchAddImages` with valid URLs
  - [ ] Test `batchUpdateImages` with predicate matching items
  - [ ] Test `batchUpdateImages` returns 0 for no matches
  - [ ] Test cache invalidation after batch updates

---

## Phase 6: Documentation Updates

- [ ] **Task 6.1: Update DATA_ENGINE_REFERENCE.md**
  - [ ] Add `icon?` and `image?` to type definition tables (Equipment, Spell, ClassFeature, CustomSkill, RaceDataEntry, ClassDataEntry)
  - [ ] Add ImageValidator to exported utilities section
  - [ ] Add batch image methods to ExtensionManager API section
  - [ ] Update example snippets to include icon/image fields

- [ ] **Task 6.2: Update USAGE_IN_OTHER_PROJECTS.md**
  - [ ] Add icon/image fields to equipment examples
  - [ ] Add example of using batch image methods
  - [ ] Update box items examples with icons

- [ ] **Task 6.3: Update docs/EQUIPMENT_SYSTEM.md**
  - [ ] Add `icon?` and `image?` rows to EnhancedEquipment interface table
  - [ ] Update Quick Start example with icon field
  - [ ] Update custom equipment examples with icons
  - [ ] Add box icon examples

- [ ] **Task 6.4: Update docs/EXTENSIBILITY_GUIDE.md**
  - [ ] Add icon/image fields to equipment registration examples
  - [ ] Add icon/image fields to spell registration examples
  - [ ] Add icon/image fields to class feature examples
  - [ ] Add icon/image fields to racial trait examples
  - [ ] Add icon/image fields to skill examples
  - [ ] Add batch image method usage examples

- [ ] **Task 6.5: Update docs/CUSTOM_CONTENT.md**
  - [ ] Add `icon?` row to RaceDataEntry property table
  - [ ] Add `icon?` row to ClassDataEntry property table
  - [ ] Update race registration examples with icons
  - [ ] Update class registration examples with icons

- [ ] **Task 6.6: Update docs/CONTENT_PACKS.md**
  - [ ] Add icon fields to Basic Content Pack example
  - [ ] Add icon fields to Themed Content Pack example
  - [ ] Add icon fields to Dragon-Themed Content example
  - [ ] Add batch image method example for content packs

**Documentation pattern to follow:**
```typescript
// Updated equipment example with icon
{
    name: 'Dragon Scale Armor',
    type: 'armor',
    rarity: 'very_rare',
    weight: 15,
    icon: '/icons/armor/dragon-scale.png',
    image: '/images/equipment/dragon-scale-armor.png'
}
```

---

## Phase 7: Verification

- [ ] **Task 7.1: Run test suite**
  ```bash
  npm test
  ```

- [ ] **Task 7.2: Type check**
  ```bash
  npm run typecheck
  ```

- [ ] **Task 7.3: Build verification**
  ```bash
  npm run build
  ```

---

## Dependencies
- None - this is a standalone feature addition

## Questions/Unknowns
- ~~Should appearance options (bodyTypes, skinTones, etc.) also get image support?~~ **Answered: No, skip appearance**
- ~~Should we add a helper method to bulk-add images by category?~~ **Answered: Yes, added batchByCategory method**

---

## Files Summary

### Source Files
| File | Action |
|------|--------|
| `src/core/spells/SpellTypes.ts` | Add icon/image fields |
| `src/core/skills/SkillTypes.ts` | Add icon/image fields |
| `src/core/features/FeatureTypes.ts` | Add icon/image fields (2 interfaces) |
| `src/utils/constants.ts` | Add icon/image fields (2 interfaces) |
| `src/core/types/Enemy.ts` | Add icon/image fields |
| `src/core/types/Combat.ts` | Add icon/image fields |
| `src/constants/DefaultRaces.ts` | Add icon/image fields |
| `src/core/utils/ImageValidator.ts` | **NEW** - URL validation utility |
| `src/core/spells/SpellValidator.ts` | Add image validation |
| `src/core/skills/SkillValidator.ts` | Add image validation |
| `src/core/features/FeatureValidator.ts` | Add image validation (2 methods) |
| `src/core/equipment/EquipmentValidator.ts` | Add image validation |
| `src/core/extensions/ExtensionManager.ts` | Add type + 3 batch methods + validation |

### Test Files
| File | Action |
|------|--------|
| `tests/unit/imageValidator.test.ts` | **NEW** - Validator tests |
| `tests/unit/extensionManager.images.test.ts` | **NEW** - Batch method tests |

### Documentation Files
| File | Action |
|------|--------|
| `DATA_ENGINE_REFERENCE.md` | Update type definitions, add batch methods |
| `USAGE_IN_OTHER_PROJECTS.md` | Update examples with icon fields |
| `docs/EQUIPMENT_SYSTEM.md` | Update interface table and examples |
| `docs/EXTENSIBILITY_GUIDE.md` | Update registration examples |
| `docs/CUSTOM_CONTENT.md` | Update race/class tables and examples |
| `docs/CONTENT_PACKS.md` | Update content pack examples |
