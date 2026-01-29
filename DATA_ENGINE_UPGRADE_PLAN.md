# Playlist Data Engine Upgrade Plan: Extensibility, Balance & Ammunition Fix

## Overview

Upgrade the Playlist Data Engine to support:
1. **Ammunition Fix**: Change "Arrows (20)" to "Arrow" × 20 (individual items with quantity)
2. **Extensibility System**: Runtime customization of ALL procedural generation lists with spawn rate control
3. **Audio Analysis Fix**: Balance frequency bands to fix treble dominance and improve class variety
4. **Class Selection Rewrite**: Sigmoid curves, 4% baseline for all classes, smooth transitions
5. **Custom Class Features**: Extensible class feature and racial trait system with prerequisites & effects
6. **Custom Skills**: Extensible skill system with per-category spawn rates

**Design Principles:**
- **Hybrid spawn rates**: Support both relative weights (added to pool) and absolute weights (replace distribution)
- **Runtime only**: Custom data provided each session; characters save with custom items already included
- **Strict validation**: Reject invalid data with clear errors
- **Consistent API**: Same function pattern across all categories (spells, equipment, appearance, etc.)
- **Per-category spawn rates**: Each expansion pack includes its own spawn rate weights for its content

---

## Complete Extensibility Matrix

The upgrade provides extensibility for ALL procedural generation lists:

| Category | Phase | Extensibility Type | Spawn Rate Control |
|----------|-------|-------------------|-------------------|
| **Equipment** | 5.3 | Custom weapons, armor, items with weights | ✅ Per-item |
| **Ammunition** | 3 | Individual items with quantity | ✅ Per-item |
| **Appearance** | 5.1 | Body types, skin tones, hair, eyes, facial features | ✅ Per-option |
| **Spells** | 5.2 | Custom spells with full spell data | ✅ Per-spell |
| **Races** | 5.4 | Custom races with ability bonuses, speed, traits | ✅ Per-race |
| **Classes** | 5.5 | Custom classes for audio-to-class mapping | ✅ Per-class |
| **Class Features** | 11 | Custom features with prerequisites & effects | ✅ Per-feature |
| **Racial Traits** | 11 | Custom traits with effects & conditions | ✅ Per-trait |
| **Skills** | 12 | Custom skills with ability mapping | ✅ Per-skill |
| **Skill Lists** | 12 | Per-class custom skill lists | ✅ Per-skill |

### Phase Coverage

**Phases 1-10: Original Plan**
- Phase 1-2: Research & API Design
- Phase 3: Ammunition Fix (individual items with quantity)
- Phase 4: Core Extensibility System (ExtensionManager, ValidationManager, WeightedSelector)
- Phase 5: Category Implementation
  - 5.1: AppearanceGenerator (body types, skin tones, hair colors/styles, eye colors, facial features)
  - 5.2: SpellManager (custom spells, spell slots, cantrips)
  - 5.3: EquipmentGenerator (custom weapons, armor, items)
  - 5.4: RaceSelector (custom races with ability bonuses)
  - 5.5: ClassSuggester (custom classes for audio mapping)
- Phase 6: Testing (unit, integration, edge cases)
- Phase 7: Documentation (reference docs, migration guide, extensibility guide)
- Phase 8: Audio Analysis Fix (frequency bands, normalization, attenuation)
- Phase 9: ClassSuggester Rewrite (sigmoid curves, 4% baseline, affinity system)
- Phase 10: Full Integration Testing

**Phases 11-15: Extended Features** (NEW)
- Phase 11: Custom Class Features System
  - FeatureRegistry for managing custom features/traits
  - ClassFeature and RacialTrait interfaces with prerequisites & effects
  - Feature effects system (stat bonuses, skill proficiencies, ability unlocks)
  - Integration with CharacterGenerator and LevelUpProcessor
- Phase 12: Custom Skills System
  - SkillRegistry for managing custom skills
  - CustomSkill interface with metadata and categories
  - Per-class custom skill lists with spawn rates
  - Integration with SkillAssigner
- Phase 13: Integration with ExtensionManager
  - Unified spawn rate control across all categories
  - Per-category weight management
  - Validation integration
- Phase 14: Documentation & Examples
- Phase 15: Comprehensive Testing

### Breaking Changes Notice

**This upgrade includes BREAKING CHANGES:**
- Old saved characters will not be compatible
- Feature format changes: `['Barbarian Level 1']` → `['rage']` (feature IDs)
- Skill type changes: union type → `string` type
- **Solution**: Generate new characters after upgrade

---

## Phase 1: Research & Analysis

### 1.1 Analyze Full Equipment Signal Flow

**Research Tasks:**
- [ ] Map complete equipment generation flow:
  1. `CharacterGenerator.generate()` called
  2. `EquipmentGenerator.initializeEquipment()` called
  3. `CLASS_STARTING_EQUIPMENT` lookup
  4. `EQUIPMENT_DATABASE` lookup for weight
  5. Items created with `{ name, quantity, equipped }`
  6. `calculateTotalWeight()` sums all items × quantity
  7. `calculateEquippedWeight()` sums only equipped items

- [ ] Identify all code paths that read equipment:
  - Character display (CharacterGenTab)
  - Inventory UI
  - Weight calculation
  - Equip/unequip functions

- [ ] Identify potential breakage points:
  - What expects "Arrows (20)" as a string?
  - What breaks if we use quantity instead?
  - Are there any hardcoded item name checks?

**File to read:** `/Users/jasondesante/playlist-data-engine/src/core/generation/EquipmentGenerator.ts`

**Deliverable:** Document full signal flow with potential issues

---

### 1.2 Analyze Appearance Generation Flow

**Research Tasks:**
- [ ] Map appearance generation flow:
  1. `AppearanceGenerator.generate()` called
  2. Seeded RNG selects from hardcoded arrays
  3. 1-3 facial features selected via `rng.shuffle()` and `.slice()`
  4. Aura color for magical classes (important to implement!)

- [ ] Identify all arrays that need extensibility:
  - `BODY_TYPES` (4 items)
  - `SKIN_TONES` (6 items)
  - `HAIR_COLORS` (10 items)
  - `HAIR_STYLES` (10 items)
  - `EYE_COLORS` (6 items)
  - `FACIAL_FEATURES` (10 items)

- [ ] Determine spawn rate mechanism:
  - Currently: Equal probability (randomChoice)
  - Need: Weighted selection with custom weights

**File to read:** `/Users/jasondesante/playlist-data-engine/src/core/generation/AppearanceGenerator.ts`

**Deliverable:** Document appearance flow and required changes

---

### 1.3 Analyze Spell Assignment Flow

**Research Tasks:**
- [ ] Map spell system flow:
  1. `SpellManager.initializeSpells()` called
  2. `getSpellSlots()` returns slot counts
  3. `getCantrips()` returns all class cantrips
  4. `getKnownSpells()` returns all spells up to level
  5. All stored in `character.spells`

- [ ] Identify data structures:
  - `SPELL_DATABASE` (38 spells)
  - `CLASS_SPELL_LISTS` (spells per class per level)
  - `SPELL_SLOTS_BY_CLASS` (slot progression)

- [ ] Determine extensibility points:
  - Add custom spells to database
  - Add custom spells to class lists
  - Custom spell slot progressions?

**File to read:** `/Users/jasondesante/playlist-data-engine/src/core/generation/SpellManager.ts`

**Deliverable:** Document spell system flow and extension points

---

### 1.4 Analyze Class Selection Flow

**Research Tasks:**
- [ ] Map ClassSuggester flow:
  1. Audio profile analyzed (bass/treble/mid/amplitude)
  2. Thresholds checked (> 0.6 for most)
  3. Weights pushed to array
  4. Weighted random selection

- [ ] Document current weights:
  - Bass > 0.6: Barbarian(3), Fighter(2), Paladin(2)
  - Treble > 0.6: Rogue(3), Ranger(2), Monk(2)
  - Mid > 0.6: Wizard(2), Cleric(2), Druid(2)
  - Amplitude > 0.5: Bard(2), Sorcerer(2), Warlock(2)

- [ ] Design weight customization:
  - Custom classes?
  - Custom audio-to-class mappings?
  - Custom thresholds?

**File to read:** `/Users/jasondesante/playlist-data-engine/src/core/generation/ClassSuggester.ts`

**Deliverable:** Document class selection flow and customization design

---

### 1.5 Analyze Race Selection Flow

**Research Tasks:**
- [ ] Map RaceSelector flow:
  1. Seeded RNG created
  2. `rng.randomChoice(ALL_RACES)` selects one
  3. Equal probability (1/9 each)

- [ ] Design race customization:
  - Add custom races with ability bonuses
  - Custom spawn rates (not all equal)
  - Custom speeds, traits

**File to read:** `/Users/jasondesante/playlist-data-engine/src/core/generation/RaceSelector.ts`

**Deliverable:** Document race selection flow and extension design

---

### 1.6 Identify Shared Patterns

**Research Tasks:**
- [ ] Find common patterns across all systems:
  - All use arrays/objects for data storage
  - All use `SeededRNG` for selection
  - All need: add, remove, weight customization

- [ ] Design shared interface:
  ```typescript
  interface ExtensibleList<T> {
      add(items: T[], weight?: number | 'default'): void;
      remove(name: string): void;
      setWeight(name: string, weight: number): void;
      getWeights(): Record<string, number>;
      reset(): void;
  }
  ```

**Deliverable:** Shared interface design for all categories

---

### 1.7 Audio Analysis Research ⚠️ CRITICAL

**Problem Identified:** The audio analysis system has significant bias issues:

**Current Frequency Bands (SpectrumScanner.ts line 27-32):**
```typescript
if (frequency >= 20 && frequency < 250) {
    bass.push(amplitude);
} else if (frequency >= 250 && frequency < 4000) {
    mid.push(amplitude);
} else if (frequency >= 4000 && frequency <= 20000) {
    treble.push(amplitude);
}
```

**Band Widths:**
- Bass: 20Hz - 250Hz = **230 Hz range** (3% of spectrum)
- Mid: 250Hz - 4kHz = **3,750 Hz range** (47% of spectrum)
- Treble: 4kHz - 20kHz = **16,000 Hz range** (200% of spectrum!)

**The Problem:**
- Treble band is **70× wider** than bass band!
- Even if treble is "quiet", it has so many frequency bins that the average is still high
- Modern music production emphasizes high frequencies (bright cymbals, synths, etc.)
- Result: Almost every song triggers treble > 0.6

**Amplitude Threshold Issue:**
- Current threshold: `average_amplitude > 0.5`
- `calculateAverageAmplitude()` returns raw absolute sample values
- A value of 0.5 means "average absolute sample is 0.5"
- For digital audio (0.0 to 1.0 range), 0.5 is VERY loud (near clipping)
- Most music has average amplitude well below 0.5

---

#### Research Tasks

- [ ] **Analyze Real Audio Profiles:**
  - Generate 10-20 test characters from various genres
  - Document actual audio profiles: bass/mid/treble/amplitude values
  - Create spreadsheet showing distribution
  - Confirm treble dominance hypothesis

- [ ] **Research Frequency Band Options:**
  - **Option A: Narrow treble band** (4kHz - 12kHz instead of 4kHz - 20kHz)
  - **Option B: Widen bass/mid bands** (20Hz - 500Hz, 250Hz - 6kHz)
  - **Option C: Logarithmic bands** (octave-based: 20-40, 40-80, 80-160, etc.)
  - **Option D: Equal-width bands** (divide 20Hz-20kHz into 3 equal ranges)
  - Test each option with sample audio

- [ ] **Research Normalization Methods:**
  - **Current:** Simple average of amplitudes in band
  - **Problem:** Doesn't account for band width (treble has 70× more bins!)
  - **Solution:** Normalize by bandwidth: `(sum / band_width) / normalizing_factor`
  - Test: Weighted dominance calculation

- [ ] **Research Amplitude Threshold:**
  - Document actual amplitude values from sample audio
  - Find realistic threshold (maybe 0.1 or 0.05 instead of 0.5)
  - Consider using RMS (root mean square) instead of average absolute
  - Consider dB scale for more natural loudness perception

- [ ] **Research Attenuation Strategies:**
  - **Treble attenuation:** Multiply treble_dominance by 0.5-0.7
  - **Bass/mid boost:** Multiply by 1.2-1.5
  - **Dynamic normalization:** Ensure bass + mid + treble ≈ 1.0 (or some constant)
  - Test with sample audio

**File to read:** `/Users/jasondesante/playlist-data-engine/src/core/analysis/AudioAnalyzer.ts`

**File to read:** `/Users/jasondesante/playlist-data-engine/src/core/analysis/SpectrumScanner.ts`

**Deliverable:**
- Audio profile analysis document with test data
- Recommended frequency band changes
- Recommended normalization method
- Recommended amplitude threshold
- Recommended attenuation strategy

---

### 1.8 ClassSuggester Rewrite Design ⚠️ CRITICAL

**Current Problems:**
1. **Hard thresholds (0.6, 0.5)** create binary on/off
2. **Classes locked out** when thresholds not met
3. **Treble bias** makes Rogues overrepresented
4. **No baseline** - minimum probability is 0%

**Design Goals:**
1. **Sigmoid curves** for smooth transitions (no hard cutoffs)
2. **4% baseline** for all classes (configurable, but most won't change it)
3. **Any class possible at any time** (0% chance → never)
4. **Audio still influences** significantly (can push to 50%+)

---

#### Design Tasks

- [ ] **Design Sigmoid Function:**
  ```typescript
  // Sigmoid: smooth S-curve from 0 to 1
  // Input: audio value (0-1), steepness, center point
  function sigmoid(x: number, steepness: number = 6, center: number = 0.5): number {
      return 1 / (1 + Math.exp(-steepness * (x - center)));
  }

  // Usage for class selection:
  // Calculate class affinity based on audio profile
  function calculateClassAffinity(audio: AudioProfile, class: Class): number {
      // Each class has "preferred" audio traits
      // Rogue likes treble, Barbarian likes bass, etc.
      // Sigmoid gives smooth curve based on how close audio is to "ideal"
  }
  ```

- [ ] **Design Baseline System:**
  ```typescript
  const BASELINE_PROBABILITY = 0.04;  // 4% each class

  function calculateFinalProbabilities(affinities: Record<Class, number>): Record<Class, number> {
      const totalAffinity = Object.values(affinities).reduce((a, b) => a + b, 0);
      const numClasses = Object.keys(affinities).length;

      const probabilities: Record<Class, number> = {};

      for (const [cls, affinity] of Object.entries(affinities)) {
          // Normalize affinity to 0-1
          const normalizedAffinity = affinity / totalAffinity;

          // Combine baseline + affinity
          // Baseline ensures minimum 4%
          // Affinity can add up to 96% more
          probabilities[cls] = BASELINE_PROBABILITY + (normalizedAffinity * (1 - BASELINE_PROBABILITY * numClasses));
      }

      // Normalize to ensure sum = 1.0
      const total = Object.values(probabilities).reduce((a, b) => a + b, 0);
      for (const cls of Object.keys(probabilities)) {
          probabilities[cls] /= total;
      }

      return probabilities;
  }
  ```

- [ ] **Design Audio-to-Class Mapping:**
  - Each class has "preferred audio traits:
    ```typescript
    const CLASS_AUDIO_PREFERENCES: Record<Class, AudioPreference> = {
        Barbarian: { primary: 'bass', secondary: 'amplitude', bass: 1.0, amplitude: 0.7 },
        Fighter: { primary: 'bass', secondary: 'amplitude', bass: 0.9, amplitude: 0.8 },
        Paladin: { primary: 'bass', secondary: 'chaos', bass: 0.8, amplitude: 0.6, mid: 0.5 },
        Rogue: { primary: 'treble', treble: 1.0 },
        Ranger: { primary: 'treble', secondary: 'bass', treble: 0.8, bass: 0.5 },
        Monk: { primary: 'treble', secondary: 'mid', treble: 0.7, mid: 0.6 },
        Wizard: { primary: 'mid', mid: 1.0 },
        Cleric: { primary: 'mid', secondary: 'wisdom', mid: 0.8, wisdom: 0.7 },
        Druid: { primary: 'mid', secondary: 'bass', mid: 0.7, bass: 0.6 },
        Bard: { primary: 'amplitude', secondary: 'mid', amplitude: 0.8, mid: 0.6 },
        Sorcerer: { primary: 'amplitude', secondary: 'chaos', amplitude: 0.9 },
        Warlock: { primary: 'amplitude', secondary: 'treble', amplitude: 0.7, treble: 0.5 },
        // Note: "chaos" = high variation across all traits
    };
    ```

  - **Affinity calculation:**
    ```typescript
    function calculateClassAffinity(audio: AudioProfile, class: Class): number {
        const prefs = CLASS_AUDIO_PREFERENCES[class];
        let affinity = 0;

        // Add primary trait contribution
        if (prefs.primary === 'bass') affinity += audio.bass_dominance * prefs.bass;
        if (prefs.primary === 'treble') affinity += audio.treble_dominance * prefs.treble;
        if (prefs.primary === 'mid') affinity += audio.mid_dominance * prefs.mid;
        if (prefs.primary === 'amplitude') affinity += audio.average_amplitude * prefs.amplitude;

        // Add secondary trait contribution
        if (prefs.secondary === 'bass') affinity += audio.bass_dominance * prefs.bass * 0.5;
        if (prefs.secondary === 'treble') affinity += audio.treble_dominance * prefs.treble * 0.5;
        // ... etc

        // For "chaos" classes, reward variation
        if (prefs.primary === 'chaos') {
            const variance = Math.abs(audio.bass_dominance - audio.treble_dominance);
            affinity += variance * 0.5;
        }

        return affinity;
    }
    ```

- [ ] **Design Weighted Selection with Baseline:**
  ```typescript
  function selectClass(audio: AudioProfile, rng: SeededRNG): Class {
      // Calculate affinity for each class
      const affinities: Record<Class, number> = {};
      for (const cls of ALL_CLASSES) {
          affinities[cls] = calculateClassAffinity(audio, cls);
      }

      // Convert to probabilities with 4% baseline
      const probabilities = calculateFinalProbabilities(affinities);

      // Weighted random selection
      return rng.weightedChoice(
          Object.entries(probabilities).map(([cls, prob]) => [cls, prob])
      );
  }
  ```

**Deliverable:**
- Complete ClassSuggester rewrite design document
- Sigmoid function implementation
- Baseline probability system
- Audio-to-class preference mapping
- Example probability calculations

---

## Phase 2: Design Extensibility API

### 2.1 Design Core Extension System

**Tasks:**
- [ ] Design `ExtensionManager` class:
  ```typescript
  class ExtensionManager {
      // Register custom data for a category
      register(category: string, items: any[], options?: ExtensionOptions): void

      // Get merged data (defaults + custom)
      get(category: string): any[]

      // Set spawn weights
      setWeights(category: string, weights: Record<string, number>): void

      // Reset to defaults
      reset(category: string): void
  }
  ```

- [ ] Design extension options:
  ```typescript
  interface ExtensionOptions {
      mode?: 'append' | 'replace';  // Add to or replace defaults
      weights?: Record<string, number>;  // Custom spawn rates
      validate?: boolean;  // Enable strict validation (default: true)
  }
  ```

- [ ] Design category types:
  ```typescript
  type ExtensionCategory =
      | 'spells'
      | 'equipment'
      | 'races'
      | 'classes'
      | 'appearance.bodyTypes'
      | 'appearance.skinTones'
      | 'appearance.hairColors'
      | 'appearance.hairStyles'
      | 'appearance.eyeColors'
      | 'appearance.facialFeatures';
  ```

**Deliverable:** Complete API design document

---

### 2.2 Design Validation System

**Tasks:**
- [ ] Design validation schemas for each category:
  ```typescript
  interface SpellSchema {
      name: string;
      level: number;
      school: SpellSchool;
      casting_time: string;
      range: string;
      components: Component[];
      duration: string;
  }

  interface EquipmentSchema {
      name: string;
      type: 'weapon' | 'armor' | 'item';
      rarity: Rarity;
      weight: number;
  }

  // etc. for each category
  ```

- [ ] Design validator function:
  ```typescript
  function validateSpell(spell: any): ValidationResult {
      // Check required fields
      // Check field types
      // Check value ranges
      // Return errors or valid
  }
  ```

**Deliverable:** Validation schemas for all categories

---

### 2.3 Design Weighted Selection System

**Tasks:**
- [ ] Design weight manager:
  ```typescript
  class WeightedSelector<T> {
      // Select item based on weights
      select(items: T[], weights: Record<string, number>, rng: SeededRNG): T

      // Calculate probabilities
      getProbabilities(items: T[], weights: Record<string, number>): Record<string, number>
  }
  ```

- [ ] Design hybrid weight system:
  - **Relative mode**: Custom weights added to pool, normalized
  - **Absolute mode**: Custom weights replace distribution entirely

**Deliverable:** Weighted selection algorithm design

---

## Phase 3: Implement Ammunition Fix

### 3.1 Update Equipment Database

**Tasks:**
- [ ] Edit `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`:

  **Changes to EQUIPMENT_DATABASE:**
  ```typescript
  // REMOVE:
  'Arrows (20)': { name: 'Arrows (20)', type: 'item', rarity: 'common', weight: 1 }
  'Bolts (20)': { name: 'Bolts (20)', type: 'item', rarity: 'common', weight: 1.5 }

  // ADD:
  'Arrow': { name: 'Arrow', type: 'item', rarity: 'common', weight: 0.05 }
  'Bolt': { name: 'Bolt', type: 'item', rarity: 'common', weight: 0.075 }
  'Dart': { name: 'Dart', type: 'weapon', rarity: 'common', weight: 0.25 }  // Already exists, verify weight
  ```

  **Changes to CLASS_STARTING_EQUIPMENT:**
  ```typescript
  // Ranger:
  items: ['Explorer's Pack'],  // Remove 'Arrows (20)'
  // Then add 20 arrows programmatically (see 3.2)
  ```

**Deliverable:** Updated constants.ts with ammunition fix

---

### 3.2 Update EquipmentGenerator

**Tasks:**
- [ ] Edit `/Users/jasondesante/playlist-data-engine/src/core/generation/EquipmentGenerator.ts`:

  **Add ammunition handling:**
  ```typescript
  // In initializeEquipment(), after adding items:

  // Handle ammunition items
  const ammunitionMap: Record<string, number> = {
      'Ranger': 20,      // 20 arrows
      'Fighter': 20,     // If using bow/crossbow
      'Dungeon Delver': 20,
      // Add other classes as needed
  };

  const ammoType = this.getAmmunitionType(characterClass);
  if (ammoType && ammunitionMap[characterClass]) {
      this.addItem(updated, ammoType, ammunitionMap[characterClass]);
  }

  // New helper method:
  private getAmmunitionType(characterClass: Class): string | null {
      // Return 'Arrow', 'Bolt', etc. based on class starting weapons
      // Check if class has Longbow → Arrow
      // Check if class has Light Crossbow → Bolt
      // etc.
  }
  ```

**Deliverable:** Updated EquipmentGenerator with ammunition quantity support

---

### 3.3 Test Ammunition Fix

**Tasks:**
- [ ] Generate Ranger character - verify 20 Arrow items
- [ ] Check weight calculation (should be 1 lb total: 20 × 0.05)
- [ ] Verify equip/unequip still works
- [ ] Verify addItem/removeItem work with quantities
- [ ] Test edge cases:
  - Remove 1 arrow (should leave 19)
  - Remove all 20 arrows (should remove item entirely)
  - Add more arrows (should increase quantity)

**Deliverable:** Test results confirming fix works correctly

---

## Phase 4: Implement Extensibility System

### 4.1 Create ExtensionManager Class

**File:** `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts`

**Tasks:**
- [ ] Create `ExtensionManager` class:
  ```typescript
  export class ExtensionManager {
      private static instance: ExtensionManager;
      private extensions: Map<string, ExtensionData>;

      private constructor() {
          this.extensions = new Map();
      }

      static getInstance(): ExtensionManager {
          if (!this.instance) {
              this.instance = new ExtensionManager();
          }
          return this.instance;
      }

      // Register custom data
      register(
          category: string,
          items: any[],
          options?: ExtensionOptions
      ): void {
          // Validate items
          // Store with options
          // Update merged data
      }

      // Get merged data (defaults + custom)
      get(category: string): any[] {
          // Return defaults merged with custom
      }

      // Set spawn weights
      setWeights(category: string, weights: Record<string, number>): void {
          // Store weights for category
      }

      // Get current weights
      getWeights(category: string): Record<string, number> {
          // Return weights (defaults + custom)
      }

      // Reset category to defaults
      reset(category: string): void {
          // Clear custom data for category
      }

      // Reset all categories
      resetAll(): void {
          // Clear all custom data
      }
  }
  ```

**Deliverable:** ExtensionManager class with full API

---

### 4.2 Create Validation System

**File:** `/Users/jasondesante/playlist-data-engine/src/core/extensions/ValidationManager.ts`

**Tasks:**
- [ ] Create validation schemas:
  ```typescript
  export const VALIDATION_SCHEMAS = {
      spells: validateSpell,
      equipment: validateEquipment,
      races: validateRace,
      classes: validateClass,
      // etc.
  };

  function validateSpell(item: any): ValidationResult {
      const errors: string[] = [];

      // Check required fields
      if (!item.name || typeof item.name !== 'string') {
          errors.push('Spell must have a valid name');
      }
      if (typeof item.level !== 'number' || item.level < 0 || item.level > 9) {
          errors.push('Spell level must be 0-9');
      }
      if (!VALID_SCHOOLS.includes(item.school)) {
          errors.push(`Invalid school: ${item.school}`);
      }
      // ... more checks

      return errors.length > 0
          ? { valid: false, errors }
          : { valid: true };
  }
  ```

**Deliverable:** Complete validation system for all categories

---

### 4.3 Create WeightedSelector

**File:** `/Users/jasondesante/playlist-data-engine/src/core/extensions/WeightedSelector.ts`

**Tasks:**
- [ ] Create weighted selection utility:
  ```typescript
  export class WeightedSelector<T> {
      select(
          items: T[],
          weights: Record<string, number>,
          rng: SeededRNG,
          mode: 'relative' | 'absolute' = 'relative'
      ): T {
          if (mode === 'relative') {
              return this.selectRelative(items, weights, rng);
          } else {
              return this.selectAbsolute(items, weights, rng);
          }
      }

      private selectRelative(items: T[], weights: Record<string, number>, rng: SeededRNG): T {
          // Add custom weights to default weights
          // Normalize to probabilities
          // Weighted random selection
      }

      private selectAbsolute(items: T[], weights: Record<string, number>, rng: SeededRNG): T {
          // Use only custom weights
          // Normalize to probabilities
          // Weighted random selection
      }

      getProbabilities(items: T[], weights: Record<string, number>): Record<string, number> {
          // Return probability for each item
      }
  }
  ```

**Deliverable:** WeightedSelector with relative and absolute modes

---

### 4.4 Update CharacterGenerator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/CharacterGenerator.ts`

**Tasks:**
- [ ] Add extension options to `CharacterGeneratorOptions`:
  ```typescript
  interface CharacterGeneratorOptions {
      level?: number;
      forceClass?: Class;
      gameMode?: GameMode;

      // NEW: Extension options
      extensions?: {
          spells?: SpellExtension[];
          equipment?: EquipmentExtension[];
          races?: RaceExtension[];
          classes?: ClassExtension[];
          appearance?: AppearanceExtension;
      };
  }
  ```

- [ ] Update `generate()` method:
  ```typescript
  static generate(
      seed: string,
      audioProfile: AudioProfile,
      name: string,
      options?: CharacterGeneratorOptions
  ): CharacterSheet {
      // Register extensions if provided
      if (options?.extensions) {
          const manager = ExtensionManager.getInstance();
          if (options.extensions.spells) {
              manager.register('spells', options.extensions.spells);
          }
          // ... etc for each category
      }

      // Continue with normal generation
      // ...
  }
  ```

**Deliverable:** Updated CharacterGenerator with extension support

---

## Phase 5: Update Each Category

### 5.1 Update AppearanceGenerator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/AppearanceGenerator.ts`

**Tasks:**
- [ ] Replace hardcoded arrays with ExtensionManager:
  ```typescript
  static generate(seed: string, characterClass: Class, audioProfile: AudioProfile): CharacterAppearance {
      const rng = new SeededRNG(seed);
      const manager = ExtensionManager.getInstance();

      // Get extended body types (defaults + custom)
      const bodyTypes = manager.get('appearance.bodyTypes');
      const bodyWeights = manager.getWeights('appearance.bodyTypes');
      const body_type = WeightedSelector.select(bodyTypes, bodyWeights, rng);

      // Same for skin tones, hair colors, etc.

      // Facial features: select 1-3 from extended list
      const facialFeatures = manager.get('appearance.facialFeatures');
      const featureWeights = manager.getWeights('appearance.facialFeatures');
      const numFeatures = rng.randomInt(1, 4);
      const selectedFeatures = WeightedSelector.selectMultiple(
          facialFeatures,
          featureWeights,
          rng,
          numFeatures
      );

      // ... rest of generation
  }
  ```

- [ ] Add default appearance data to ExtensionManager on init

**Deliverable:** AppearanceGenerator using extensibility system

---

### 5.2 Update SpellManager

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/SpellManager.ts`

**Tasks:**
- [ ] Update `initializeSpells()` to use extended data:
  ```typescript
  static initializeSpells(characterClass: Class, characterLevel: number): SpellSlots {
      const manager = ExtensionManager.getInstance();
      const allSpells = manager.get('spells');
      const classSpellList = manager.get(`spells.${characterClass}`);

      // Merge default + custom spells for this class
      // ... existing logic
  }
  ```

**Deliverable:** SpellManager using extensibility system

---

### 5.3 Update EquipmentGenerator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/EquipmentGenerator.ts`

**Tasks:**
- [ ] Update equipment lookup to use extended database:
  ```typescript
  static addItem(equipment: CharacterEquipment, itemName: string, quantity: number = 1): CharacterEquipment {
      const manager = ExtensionManager.getInstance();
      const allEquipment = manager.get('equipment');
      const equipData = allEquipment[itemName];  // Check extended DB

      if (!equipData) {
          throw new Error(`Unknown equipment: ${itemName}`);
      }
      // ... rest of logic
  }
  ```

**Deliverable:** EquipmentGenerator using extensibility system

---

### 5.4 Update RaceSelector

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/RaceSelector.ts`

**Tasks:**
- [ ] Update to use extended race list:
  ```typescript
  static select(rng: SeededRNG): Race {
      const manager = ExtensionManager.getInstance();
      const allRaces = manager.get('races');
      const raceWeights = manager.getWeights('races');

      return WeightedSelector.select(allRaces, raceWeights, rng);
  }
  ```

**Deliverable:** RaceSelector using extensibility system

---

### 5.5 Update ClassSuggester

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/ClassSuggester.ts`

**Tasks:**
- [ ] Update to use extended class list:
  ```typescript
  static suggest(audioProfile: AudioProfile, rng: SeededRNG): Class {
      const manager = ExtensionManager.getInstance();
      const allClasses = manager.get('classes');
      const classWeights = manager.getWeights('classes');

      // Get audio-mapping weights
      const audioWeights = this.getAudioWeights(audioProfile, allClasses);

      // Combine with custom weights
      const combinedWeights = this.combineWeights(audioWeights, classWeights);

      return WeightedSelector.select(allClasses, combinedWeights, rng);
  }

  private combineWeights(
      audioWeights: Record<string, number>,
      customWeights: Record<string, number>
  ): Record<string, number> {
      // Merge weights intelligently
      // Custom weights take priority
      // Audio weights as fallback
  }
  ```

- [ ] Fix Rogue bias by equalizing default weights

**Deliverable:** ClassSuggester using extensibility system + bias fix

---

## Phase 6: Testing & Validation

### 6.1 Unit Tests

**Tasks:**
- [ ] Test ExtensionManager:
  - Register custom items
  - Get merged data
  - Reset to defaults
  - Weight management

- [ ] Test ValidationManager:
  - Valid data passes
  - Invalid data fails with clear errors
  - All categories validated

- [ ] Test WeightedSelector:
  - Relative mode: custom weights added to defaults
  - Absolute mode: custom weights replace defaults
  - Probability calculations correct

- [ ] Test each category with custom data:
  - Spells: custom spells appear in generation
  - Equipment: custom items spawn with correct weights
  - Appearance: custom options appear
  - Races: custom races spawn
  - Classes: custom classes spawn

**Deliverable:** Comprehensive test suite

---

### 6.2 Integration Tests

**Tasks:**
- [ ] Test full character generation with extensions:
  ```typescript
  const customSpells = [
      { name: 'Phoenix Fire', level: 5, school: 'Evocation', ... }
  ];

  const character = CharacterGenerator.generate(
      seed,
      audio,
      'Hero',
      { extensions: { spells: customSpells } }
  );

  // Verify custom spell available
  ```

- [ ] Test ammunition fix:
  - Ranger has 20 arrows
  - Weight correct
  - Can remove/add arrows

- [ ] Test weight system:
  - Custom items with high weight spawn often
  - Custom items with weight 0 never spawn
  - Relative vs absolute modes work correctly

**Deliverable:** Integration test results

---

### 6.3 Edge Case Testing

**Tasks:**
- [ ] Test with empty custom data (should use defaults)
- [ ] Test with replacing all defaults (mode: 'replace')
- [ ] Test with conflicting weights (resolve correctly)
- [ ] Test validation errors (clear, helpful messages)
- [ ] Test ammunition edge cases:
  - Remove last item (quantity goes to 0)
  - Add to non-existent item (error)
  - Equip item with quantity 0 (error)

**Deliverable:** Edge case handling verified

---

## Phase 7: Documentation

### 7.1 Update Engine Documentation

**Tasks:**
- [ ] Update DATA_ENGINE_REFERENCE.md:
  - Add ExtensionManager API reference
  - Add validation schemas
  - Add weight system docs
  - Update CharacterGenerator options

- [ ] Add extension examples:
  - How to add custom spells
  - How to add custom equipment
  - How to customize spawn rates
  - Complete working example

**Deliverable:** Updated documentation

---

### 7.2 Create Migration Guide

**File:** `/Users/jasondesante/playlist-data-engine/MIGRATION_GUIDE.md`

**Tasks:**
- [ ] Document breaking changes:
  - "Arrows (20)" → "Arrow" × 20
  - Equipment database structure changes

- [ ] Provide migration examples:
  - How to update existing code
  - Before/after comparisons

**Deliverable:** Migration guide for users

---

### 7.3 Create Extensibility Guide

**File:** `/Users/jasondesante/playlist-data-engine/EXTENSIBILITY_GUIDE.md`

**Tasks:**
- [ ] Document extensibility API:
  - How to register custom data
  - How to set spawn weights
  - How to use relative vs absolute modes

- [ ] Provide examples for each category:
  - Custom spells example
  - Custom equipment example
  - Custom races example
  - Custom appearance example

**Deliverable:** Complete extensibility guide


---

## Phase 8: Audio Analysis Fix ⚠️ CRITICAL FOR BALANCE

### 8.1 Implement Frequency Band Changes

**File:** `/Users/jasondesante/playlist-data-engine/src/core/analysis/SpectrumScanner.ts`

**Problem:** Current frequency bands are severely unbalanced:
- Bass: 20Hz - 250Hz = **230 Hz range** (only 3% of spectrum)
- Mid: 250Hz - 4kHz = **3,750 Hz range** (47% of spectrum)
- Treble: 4kHz - 20kHz = **16,000 Hz range** (200% of spectrum!)

This causes treble dominance in almost all modern music.

**Tasks:**
- [ ] Update frequency bands to be more balanced:
  ```typescript
  // NEW (narrower treble, wider bass/mid):
  if (frequency >= 20 && frequency < 400) {
      bass.push(amplitude);  // 20-400Hz (expanded from 20-250Hz)
  } else if (frequency >= 400 && frequency < 4000) {
      mid.push(amplitude);   // 400Hz-4kHz (expanded from 250-4kHz)
  } else if (frequency >= 4000 && frequency <= 14000) {
      treble.push(amplitude); // 4kHz-14kHz (narrowed from 4kHz-20kHz)
  }
  ```

- [ ] Update `separateFrequencyBands()` JSDoc to reflect new ranges
- [ ] Add version constant: `CURRENT_BAND_VERSION = 2`

**Deliverable:** Updated frequency bands with better balance

---

### 8.2 Implement Bandwidth Normalization

**Problem:** Wider bands have more frequency bins, so their averages are naturally higher even if music isn't louder in those ranges.

**Tasks:**
- [ ] Add bandwidth-aware dominance calculation:
  ```typescript
  static calculateDominance(band: number[], bandWidthHz: number): number {
      if (band.length === 0) return 0;
      const sum = band.reduce((a, b) => a + b, 0);
      const average = sum / band.length;

      // Normalize by bandwidth (per kHz) to prevent wider bands from dominating
      return average / (bandWidthHz / 1000);
  }
  ```

- [ ] Update AudioAnalyzer.ts to pass bandwidth to calculateDominance:
  ```typescript
  const bassDominance = SpectrumScanner.calculateDominance(averagedBands.bass, 380);    // 400-20 = 380
  const midDominance = SpectrumScanner.calculateDominance(averagedBands.mid, 3600);     // 4000-400 = 3600
  const trebleDominance = SpectrumScanner.calculateDominance(averagedBands.treble, 10000); // 14000-4000 = 10000
  ```

**Deliverable:** Bandwidth-normalized dominance calculation

---

### 8.3 Implement Treble Attenuation

**Problem:** Even with better bands, we may need to attenuate treble to achieve balance.

**Tasks:**
- [ ] Add attenuation configuration to AudioAnalyzer:
  ```typescript
  interface AudioAnalyzerOptions {
      includeAdvancedMetrics?: boolean;
      sampleRate?: number;
      fftSize?: number;

      // NEW: Frequency attenuation to balance treble dominance
      trebleAttenuation?: number;  // 0.0-1.0, default 0.6 (reduce treble by 40%)
      bassBoost?: number;          // 0.0-1.0, default 1.2 (increase bass by 20%)
      midBoost?: number;           // 0.0-1.0, default 1.1 (increase mid by 10%)
  }
  ```

- [ ] Apply attenuation to dominance values after calculation
- [ ] Normalize to 0-1 range if boosts push values over 1.0
- [ ] Make attenuation configurable (users can adjust if needed)

**Deliverable:** Configurable frequency attenuation system

---

### 8.4 Fix Amplitude Threshold

**Problem:** Current threshold of 0.5 is too high (only very loud, compressed music triggers charisma classes).

**Tasks:**
- [ ] Update ClassSuggester amplitude threshold from 0.5 to 0.15:
  ```typescript
  // More realistic - most music is 0.05-0.25
  if (average_amplitude > 0.15) {
      weights.push(['Bard', 2], ['Sorcerer', 2], ['Warlock', 2]);
  }
  ```

- [ ] Document rationale in code comments

**Deliverable:** Realistic amplitude threshold

---

### 8.5 Test Audio Analysis Fix

**Tasks:**
- [ ] Generate 20 characters from diverse genres
- [ ] Document audio profiles before/after fix
- [ ] Verify treble dominance reduced
- [ ] Verify bass and mid dominance increased
- [ ] Ensure all values remain in 0-1 range
- [ ] Check class distribution is more balanced

**Deliverable:** Audio analysis fix test results

---

## Phase 9: ClassSuggester Rewrite ⚠️ CRITICAL FOR VARIETY

### 9.1 Create New ClassSuggester with Baseline System

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/ClassSuggester.ts`

**Problems to Solve:**
1. Hard thresholds create binary on/off (classes locked out)
2. No baseline = 0% minimum probability
3. Treble bias makes Rogues overrepresented

**Solution:** Affinity-based system with 4% baseline

**Tasks:**
- [ ] Complete rewrite with new algorithm:
  ```typescript
  export class ClassSuggester {
      private static readonly BASELINE_PROBABILITY = 0.04;  // 4% minimum for all classes

      static suggest(audioProfile: AudioProfile, rng: SeededRNG): Class {
          // Step 1: Calculate affinity for each class based on audio
          const affinities = this.calculateAllAffinities(audioProfile);

          // Step 2: Convert to probabilities with 4% baseline
          const probabilities = this.calculateProbabilities(affinities);

          // Step 3: Weighted random selection
          const choices = Object.entries(probabilities).map(([cls, prob]) => [cls, prob]);
          return rng.weightedChoice(choices);
      }

      private static calculateClassAffinity(audio: AudioProfile, class: Class): number {
          // Each class has preferred audio traits
          // Add weighted contributions from primary/secondary/tertiary traits
          // Example: Rogue loves treble (1.0), likes bass less (0.5 if secondary)
          // Result: Smooth affinity score based on how close audio is to "ideal"
      }
  }
  ```

- [ ] Implement baseline probability system:
  ```typescript
  // Each class gets 4% minimum
  // Remaining (96% × number of classes) distributed by affinity
  // Result: No class ever drops below 4%, but audio can push to 50%+
  ```

**Deliverable:** New ClassSuggester with 4% baseline + affinity system

---

### 9.2 Create Audio Preference Database

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`

**Tasks:**
- [ ] Add `CLASS_AUDIO_PREFERENCES` constant:
  ```typescript
  export interface AudioPreference {
      primary: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
      secondary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
      tertiary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
      bass?: number;
      treble?: number;
      mid?: number;
      amplitude?: number;
  }

  export const CLASS_AUDIO_PREFERENCES: Record<Class, AudioPreference> = {
      Barbarian: { primary: 'bass', secondary: 'amplitude', bass: 1.0, amplitude: 0.7 },
      Fighter: { primary: 'bass', secondary: 'amplitude', bass: 0.9, amplitude: 0.8 },
      Paladin: { primary: 'bass', secondary: 'mid', bass: 0.8, mid: 0.5 },
      Rogue: { primary: 'treble', treble: 1.0 },
      Ranger: { primary: 'treble', secondary: 'bass', treble: 0.8, bass: 0.5 },
      Monk: { primary: 'treble', secondary: 'mid', treble: 0.7, mid: 0.6 },
      Wizard: { primary: 'mid', mid: 1.0 },
      Cleric: { primary: 'mid', secondary: 'amplitude', mid: 0.8, amplitude: 0.6 },
      Druid: { primary: 'mid', secondary: 'bass', mid: 0.7, bass: 0.6 },
      Bard: { primary: 'amplitude', secondary: 'mid', amplitude: 0.8, mid: 0.6, tertiary: 'treble' },
      Sorcerer: { primary: 'amplitude', secondary: 'chaos', amplitude: 0.9 },
      Warlock: { primary: 'amplitude', secondary: 'treble', amplitude: 0.7, treble: 0.5 },
  };
  ```

**Deliverable:** Complete audio preference database

---

### 9.3 Test ClassSuggester Rewrite

**Tasks:**
- [ ] Unit test: Verify 4% baseline for all classes (never drops below 4%)
- [ ] Unit test: Verify probabilities sum to 1.0
- [ ] Integration test: Generate 100 characters, document class distribution
- [ ] Edge case test: All-zero audio (equal distribution)
- [ ] Edge case test: Max values in all bands (favors some classes)
- [ ] Compare before/after: Show improvement in variety

**Deliverable:** Comprehensive test suite for ClassSuggester

---

## Phase 10: Full Integration Testing

### 10.1 End-to-End Testing

**Tasks:**
- [ ] Test complete pipeline: audio analysis → class selection → character generation
- [ ] Generate 100+ characters from diverse music genres
- [ ] Document class distribution (should be much more balanced)
- [ ] Verify no class has < 4% probability
- [ ] Verify ammunition fix (Rangers have 20 individual Arrow items)
- [ ] Verify custom content system works
- [ ] Test with extreme audio profiles (all bass, all treble, all mid)

**Deliverable:** End-to-end test results

---

### 10.2 Performance Testing

**Tasks:**
- [ ] Benchmark character generation time (before vs after)
- [ ] Benchmark audio analysis time (new bands + attenuation)
- [ ] Verify no significant performance degradation (<20% slower acceptable)
- [ ] Profile memory usage (custom data doesn't leak)

**Deliverable:** Performance benchmark results

---

### 10.3 Backward Compatibility

**Tasks:**
- [ ] Ensure existing code works without modifications
- [ ] Ensure old characters load correctly
- [ ] Document breaking changes in migration guide
- [ ] Provide migration path for existing users

**Deliverable:** Backward compatibility verification



---

## Phase 11: Custom Class Features System

### 11.1 Design Class Feature Architecture

**Tasks:**
- [ ] Design `ClassFeature` interface:
  ```typescript
  interface ClassFeature {
      id: string;
      name: string;
      description: string;
      type: 'passive' | 'active' | 'resource';
      level: number;
      class: Class;
      prerequisites?: {
          level?: number;
          features?: string[];  // Requires other features
          abilities?: Record<Ability, number>;
      };
      effects?: FeatureEffect[];
      source: 'default' | 'custom';
  }

  interface FeatureEffect {
      type: 'stat_bonus' | 'skill_proficiency' | 'ability_unlock' | 'passive_modifier';
      target: string;
      value: number | string | boolean;
      condition?: string;
  }
  ```

- [ ] Design `RacialTrait` interface:
  ```typescript
  interface RacialTrait {
      id: string;
      name: string;
      description: string;
      race: Race;
      prerequisites?: {
          subrace?: string;
      };
      effects?: FeatureEffect[];
      source: 'default' | 'custom';
  }
  ```

- [ ] Design feature progression system:
  - Features unlock at specific levels
  - Support for prerequisite chains
  - Conditional features (e.g., choose one of three)

**File to create:** `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureTypes.ts`

**Deliverable:** Complete feature type definitions

---

### 11.2 Create FeatureRegistry

**File:** `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureRegistry.ts`

**Tasks:**
- [ ] Create `FeatureRegistry` class:
  ```typescript
  export class FeatureRegistry {
      private static instance: FeatureRegistry;
      private classFeatures: Map<string, ClassFeature[]>;
      private racialTraits: Map<string, RacialTrait[]>;

      static getInstance(): FeatureRegistry

      // Register custom class features
      registerClassFeature(feature: ClassFeature): void
      registerClassFeatures(features: ClassFeature[]): void

      // Register custom racial traits
      registerRacialTrait(trait: RacialTrait): void
      registerRacialTraits(traits: RacialTrait[]): void

      // Get features for a class at a specific level
      getClassFeatures(className: Class, level: number): ClassFeature[]

      // Get traits for a race
      getRacialTraits(race: Race): RacialTrait[]

      // Validate feature prerequisites
      validatePrerequisites(
          feature: ClassFeature | RacialTrait,
          character: CharacterSheet
      ): ValidationResult

      // Reset to defaults
      reset(): void
  }
  ```

- [ ] Initialize with default features from constants.ts
- [ ] Implement prerequisite validation logic
- [ ] Support feature lookup by class/level

**Deliverable:** FeatureRegistry with full API

---

### 11.3 Migrate Existing Features

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`

**Tasks:**
- [ ] Convert existing CLASS_DATA to feature definitions:
  ```typescript
  export const DEFAULT_CLASS_FEATURES: ClassFeature[] = [
      {
          id: 'barbarian_rage',
          name: 'Rage',
          description: 'You can rage in combat...',
          type: 'active',
          level: 1,
          class: 'Barbarian',
          effects: [
              { type: 'stat_bonus', target: 'damage', value: 2 }
          ],
          source: 'default'
      },
      // ... all other class features
  ];
  ```

- [ ] Convert existing RACE_DATA traits to trait definitions:
  ```typescript
  export const DEFAULT_RACIAL_TRAITS: RacialTrait[] = [
      {
          id: 'darkvision',
          name: 'Darkvision',
          description: 'See in darkness up to 60 feet',
          race: 'Elf',
          source: 'default'
      },
      // ... all other racial traits
  ];
  ```

- [ ] Keep CLASS_DATA and RACE_DATA for backward compatibility
- [ ] Initialize FeatureRegistry with defaults

**Deliverable:** Migrated feature definitions

---

### 11.4 Update CharacterGenerator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/CharacterGenerator.ts`

**Tasks:**
- [ ] Update character generation to use FeatureRegistry:
  ```typescript
  const registry = FeatureRegistry.getInstance();
  const features = registry.getClassFeatures(characterClass, level);
  const traits = registry.getRacialTraits(race);
  ```

- [ ] Apply feature effects to character:
  - Stat bonuses
  - Skill proficiencies
  - Passive modifiers

- [ ] Store feature IDs instead of display strings:
  ```typescript
  // OLD format:
  // class_features: ['Barbarian Level 1', 'Barbarian Level 2']

  // NEW format:
  class_features: string[];  // Feature IDs: ['rage', 'danger_sense', 'reckless_attack']
  racial_traits: string[];   // Trait IDs: ['darkvision', 'keen_senses']
  ```

- [ ] Validate prerequisites during generation

**Deliverable:** Updated CharacterGenerator using FeatureRegistry

---

### 11.5 Update LevelUpProcessor

**File:** `/Users/jasondesante/playlist-data-engine/src/core/progression/LevelUpProcessor.ts`

**Tasks:**
- [ ] Replace `getClassFeaturesForLevel()` with FeatureRegistry lookup
- [ ] Validate prerequisite chains on level up
- [ ] Apply new feature effects when leveling up
- [ ] Handle conditional features (player choice)
- [ ] Update LevelUpBenefits to include feature gains

**Deliverable:** Updated LevelUpProcessor using FeatureRegistry

---

### 11.6 Update CharacterSheet Type

**File:** `/Users/jasondesante/playlist-data-engine/src/core/types/Character.ts`

**Tasks:**
- [ ] Update CharacterSheet interface:
  ```typescript
  export interface CharacterSheet {
      // ... existing fields

      // CHANGED: Now store feature IDs from registry instead of display strings
      class_features: string[];  // Feature IDs: ['rage', 'extra_attack', 'indomitable']
      racial_traits: string[];   // Trait IDs: ['darkvision', 'fey_ancestry']

      // NEW: Store feature effects for quick access (calculated from registry)
      feature_effects?: FeatureEffect[];  // All applied effects from features/traits
  }
  ```

- [ ] Add FeatureEffect type definition:
  ```typescript
  export interface FeatureEffect {
      type: 'stat_bonus' | 'skill_proficiency' | 'ability_unlock' | 'passive_modifier';
      target: string;  // e.g., 'STR', 'athletics', 'rage_damage'
      value: number | string | boolean;
      source: string;  // Feature or trait ID that granted this effect
  }
  ```

**Deliverable:** Updated CharacterSheet type with FeatureEffect system

---

### 11.7 Create FeatureValidator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureValidator.ts`

**Tasks:**
- [ ] Create validation schemas for features:
  ```typescript
  function validateClassFeature(feature: any): ValidationResult {
      const errors: string[] = [];

      if (!feature.id || typeof feature.id !== 'string') {
          errors.push('Feature must have a valid id');
      }
      if (!feature.name || typeof feature.name !== 'string') {
          errors.push('Feature must have a valid name');
      }
      if (!ALL_CLASSES.includes(feature.class)) {
          errors.push(`Invalid class: ${feature.class}`);
      }
      if (typeof feature.level !== 'number' || feature.level < 1 || feature.level > 20) {
          errors.push('Feature level must be 1-20');
      }
      // ... more validations

      return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }

  function validateRacialTrait(trait: any): ValidationResult {
      // Similar validation
  }
  ```

**Deliverable:** Complete validation system for features

---

## Phase 12: Custom Skills System

### 12.1 Design Skill Architecture

**Tasks:**
- [ ] Design `CustomSkill` interface:
  ```typescript
  interface CustomSkill {
      id: string;
      name: string;
      description?: string;
      ability: Ability;  // STR, DEX, CON, INT, WIS, CHA
      armorPenalty?: boolean;  // True for skills affected by armor
      customProperties?: Record<string, any>;
      categories?: string[];  // For grouping (e.g., 'exploration', 'social')
      source: 'default' | 'custom';
  }
  ```

- [ ] Design skill proficiency system:
  ```typescript
  interface SkillProficiency {
      skillId: string;
      level: 'none' | 'proficient' | 'expertise';
      source: string;  // 'class', 'background', 'feat', 'custom'
  }
  ```

**File to create:** `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillTypes.ts`

**Deliverable:** Complete skill type definitions

---

### 12.2 Create SkillRegistry

**File:** `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillRegistry.ts`

**Tasks:**
- [ ] Create `SkillRegistry` class:
  ```typescript
  export class SkillRegistry {
      private static instance: SkillRegistry;
      private skills: Map<string, CustomSkill>;

      static getInstance(): SkillRegistry

      // Register custom skills
      registerSkill(skill: CustomSkill): void
      registerSkills(skills: CustomSkill[]): void

      // Get skill by ID
      getSkill(id: string): CustomSkill | undefined

      // Get all skills
      getAllSkills(): CustomSkill[]

      // Get skills by ability
      getSkillsByAbility(ability: Ability): CustomSkill[]

      // Get skills by category
      getSkillsByCategory(category: string): CustomSkill[]

      // Validate skill exists
      isValidSkill(id: string): boolean

      // Reset to defaults
      reset(): void
  }
  ```

- [ ] Initialize with default 18 skills from constants.ts
- [ ] Implement skill lookup methods
- [ ] Support skill categorization

**Deliverable:** SkillRegistry with full API

---

### 12.3 Migrate Existing Skills

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`

**Tasks:**
- [ ] Convert existing skills to CustomSkill format:
  ```typescript
  export const DEFAULT_SKILLS: CustomSkill[] = [
      {
          id: 'athletics',
          name: 'Athletics',
          ability: 'STR',
          armorPenalty: true,
          source: 'default'
      },
      {
          id: 'acrobatics',
          name: 'Acrobatics',
          ability: 'DEX',
          armorPenalty: true,
          source: 'default'
      },
      // ... all 18 skills
  ];
  ```

- [ ] Update SKILL_ABILITY_MAP to use registry
- [ ] Keep Skill type for backward compatibility
- [ ] Initialize SkillRegistry with defaults

**Deliverable:** Migrated skill definitions

---

### 12.4 Update SkillAssigner

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/SkillAssigner.ts`

**Tasks:**
- [ ] Update to use SkillRegistry:
  ```typescript
  static assignSkills(
      characterClass: Class,
      rng: SeededRNG
  ): Record<string, ProficiencyLevel> {
      const registry = SkillRegistry.getInstance();
      const allSkills = registry.getAllSkills();
      // ... existing logic with registry
  }
  ```

- [ ] Support custom skill lists per class:
  ```typescript
  // In CLASS_DATA, add:
  interface ClassData {
      // ... existing
      customSkills?: string[];  // Additional skills beyond defaults
      skillSelectionWeights?: Record<string, number>;  // Per-skill spawn rates
  }
  ```

- [ ] Validate skills against registry
- [ ] Apply spawn rate weights per skill

**Deliverable:** Updated SkillAssigner using SkillRegistry

---

### 12.5 Update CharacterSheet Type

**File:** `/Users/jasondesante/playlist-data-engine/src/core/types/Character.ts`

**Tasks:**
- [ ] Update Skill type to support custom skills:
  ```typescript
  // OLD: Hardcoded union of 18 skills
  // export type Skill = 'athletics' | 'acrobatics' | ... | 'persuasion';

  // NEW: Any string, validated at runtime against SkillRegistry
  export type Skill = string;
  ```

- [ ] Update CharacterSheet skills to use skill IDs:
  ```typescript
  export interface CharacterSheet {
      // ... existing fields

      // CHANGED: Now supports any skill ID from SkillRegistry
      // Keys are skill IDs (can be custom skills), values are proficiency levels
      skills: Record<string, ProficiencyLevel>;  // { 'athletics': 'proficient', 'custom_skill': 'expertise' }
  }
  ```

**Deliverable:** Updated CharacterSheet type with extensible skills

---

### 12.6 Create SkillValidator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillValidator.ts`

**Tasks:**
- [ ] Create validation schemas for skills:
  ```typescript
  function validateSkill(skill: any): ValidationResult {
      const errors: string[] = [];

      if (!skill.id || typeof skill.id !== 'string') {
          errors.push('Skill must have a valid id');
      }
      if (!skill.name || typeof skill.name !== 'string') {
          errors.push('Skill must have a valid name');
      }
      if (!ALL_ABILITIES.includes(skill.ability)) {
          errors.push(`Invalid ability: ${skill.ability}`);
      }
      // ... more validations

      return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
  ```

**Deliverable:** Complete validation system for skills

---

## Phase 13: Integration with ExtensionManager

### 13.1 Update ExtensionManager Categories

**File:** `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts`

**Tasks:**
- [ ] Add new categories to ExtensionCategory type:
  ```typescript
  type ExtensionCategory =
      // ... existing categories
      | 'classFeatures'
      | 'classFeatures.Barbarian'
      | 'classFeatures.Fighter'
      // ... for each class
      | 'racialTraits'
      | 'racialTraits.Elf'
      | 'racialTraits.Dwarf'
      // ... for each race
      | 'skills'
      | 'skills.strength'
      | 'skills.dexterity'
      // ... for each ability
      | 'skillLists'
      | 'skillLists.Barbarian'
      | 'skillLists.Bard'
      // ... for each class
  ```

- [ ] Integrate FeatureRegistry with ExtensionManager
- [ ] Integrate SkillRegistry with ExtensionManager
- [ ] Support per-category spawn rates:
  ```typescript
  // Example: Set spawn rates for Barbarian features
  manager.setWeights('classFeatures.Barbarian', {
      'rage': 1.0,
      'unarmored_defense': 1.0,
      'reckless_attack': 0.5  // Half as likely in certain contexts
  });

  // Example: Set spawn rates for custom skills
  manager.setWeights('skills', {
      'athletics': 1.0,
      'custom_skill_1': 2.0,  // Twice as likely
      'custom_skill_2': 0.0   // Never spawn
  });
  ```

**Deliverable:** ExtensionManager with feature/skill categories

---

### 13.2 Update ValidationManager

**File:** `/Users/jasondesante/playlist-data-engine/src/core/extensions/ValidationManager.ts`

**Tasks:**
- [ ] Add feature validation schemas:
  ```typescript
  VALIDATION_SCHEMAS = {
      // ... existing
      classFeatures: validateClassFeature,
      racialTraits: validateRacialTrait,
      skills: validateSkill,
  };
  ```

- [ ] Integrate with FeatureValidator and SkillValidator

**Deliverable:** Complete validation for all categories

---

## Phase 14: Documentation & Examples

### 14.1 Update DATA_ENGINE_REFERENCE.md

**File:** `/Users/jasondesante/playlist-data-engine/docs/engine/DATA_ENGINE_REFERENCE.md`

**Tasks:**
- [ ] Add FeatureRegistry API reference
- [ ] Add SkillRegistry API reference
- [ ] Update CharacterSheet type documentation
- [ ] Add examples of custom features
- [ ] Add examples of custom skills
- [ ] Document spawn rate system for features/skills

**Deliverable:** Updated reference documentation

---

### 14.2 Update USAGE_IN_OTHER_PROJECTS.md

**File:** `/Users/jasondesante/playlist-data-engine/docs/engine/USAGE_IN_OTHER_PROJECTS.md`

**Tasks:**
- [ ] Add custom features example:
  ```typescript
  import { FeatureRegistry, ClassFeature } from 'playlist-data-engine';

  const registry = FeatureRegistry.getInstance();

  // Add custom class feature
  const customFeature: ClassFeature = {
      id: 'dragon_fury',
      name: 'Dragon Fury',
      description: 'Channel your draconic heritage...',
      type: 'active',
      level: 3,
      class: 'Barbarian',
      prerequisites: { level: 3 },
      effects: [
          { type: 'stat_bonus', target: 'damage', value: 3 }
      ],
      source: 'custom'
  };

  registry.registerClassFeature(customFeature);
  ```

- [ ] Add custom skills example:
  ```typescript
  import { SkillRegistry, CustomSkill } from 'playlist-data-engine';

  const skillRegistry = SkillRegistry.getInstance();

  // Add custom skill
  const customSkill: CustomSkill = {
      id: 'survival_cold',
      name: 'Survival (Cold Environments)',
      description: 'Expertise in cold weather survival',
      ability: 'WIS',
      categories: ['exploration', 'environmental'],
      source: 'custom'
  };

  skillRegistry.registerSkill(customSkill);
  ```

- [ ] Add spawn rate control examples

**Deliverable:** Complete usage examples

---

### 14.3 Create EXTENSIBILITY_GUIDE.md

**File:** `/Users/jasondesante/playlist-data-engine/docs/engine/EXTENSIBILITY_GUIDE.md`

**Tasks:**
- [ ] Document complete extensibility system
- [ ] Provide examples for all categories
- [ ] Explain spawn rate system
- [ ] Show how to create custom content packs
- [ ] Document validation schemas

**Deliverable:** Complete extensibility guide

---

## Phase 15: Testing

### 15.1 Unit Tests

**Tasks:**
- [ ] Test FeatureRegistry:
  - Register custom features
  - Get features by class/level
  - Validate prerequisites
  - Reset to defaults

- [ ] Test SkillRegistry:
  - Register custom skills
  - Get skills by ability/category
  - Validate skill IDs
  - Reset to defaults

- [ ] Test CharacterGenerator with custom features/skills
- [ ] Test LevelUpProcessor with custom features
- [ ] Test SkillAssigner with custom skills

**Deliverable:** Comprehensive test suite

---

### 15.2 Integration Tests

**Tasks:**
- [ ] Test full character generation with all custom content
- [ ] Test level-up progression with custom features
- [ ] Test skill assignment with custom skills
- [ ] Test spawn rate system across all categories
- [ ] Test validation rejects invalid data

**Deliverable:** Integration test results

---

## Implementation Order

### Critical Path (Sequential)
1. **Phase 1-2** - Research and API Design
2. **Phase 3** - Ammunition fix (isolated, low risk)
3. **Phase 4** - Core extensibility system (ExtensionManager, ValidationManager, WeightedSelector)
4. **Phase 5.1-5.5** - Category Implementation (Appearance, Spells, Equipment, Races, Classes)
5. **Phase 8-9** - Audio analysis and ClassSuggester fixes
6. **Phase 10** - Integration testing
7. **Phase 11** - Custom Class Features system
8. **Phase 12** - Custom Skills system
9. **Phase 13** - Integration with ExtensionManager (unified spawn rates)
10. **Phase 15** - Comprehensive testing
11. **Phase 14** - Final documentation

### Parallel Work Opportunities
- **Phase 5.1-5.5** can run in parallel (after Phase 4)
- **Phase 11.1-11.3** can run in parallel with **Phase 12.1-12.3** (after Phase 10)
- **Phase 14** (Documentation) can start once implementations are stable

---

## Success Criteria

**Original Plan (Phases 1-10):**
- [ ] Ammunition fix complete (20 individual arrows, not "Arrows (20)")
- [ ] ExtensionManager API functional for all categories
- [ ] Validation system rejects invalid data with clear errors
- [ ] Weight system supports relative and absolute modes
- [ ] Audio analysis balanced (treble no longer dominates)
- [ ] All classes always possible (minimum 4% baseline, never 0%)
- [ ] No hard thresholds (smooth sigmoid transitions)
- [ ] All tests pass (unit, integration, edge cases)

**Extended Features (Phases 11-13):**
- [ ] Custom class features system (FeatureRegistry, prerequisites, effects)
- [ ] Custom racial traits system (with effects and conditions)
- [ ] Custom skills system (SkillRegistry, custom skill support)
- [ ] Per-category spawn rates (each expansion pack controls its own rates)

**Documentation & Testing:**
- [ ] Documentation complete and clear
- [ ] Performance acceptable (<20% slower)

**Note:** This is a breaking change. Old saved characters will not be compatible. Generate new characters after upgrade.

---

## Notes

### Key Decisions Made

1. **Runtime only**: Custom data provided each session, not persisted
2. **Strict validation**: Reject invalid data with errors
3. **Hybrid weights**: Support both relative and absolute modes
4. **Consistent API**: Same pattern across all categories

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Breaking existing characters** | **Acceptable**: Users will generate new characters after upgrade |
| Performance impact | Registry lookup is O(1), minimal overhead |
| Validation too strict | Provide clear error messages, allow schema customization |
| Complex weight system | Provide examples, default to simple mode |
| Type system changes | Use `string` type for IDs, validate at runtime |

### Breaking Changes

**This upgrade includes BREAKING CHANGES:**

1. **Feature format changes:**
   - OLD: `['Barbarian Level 1', 'Barbarian Level 2']` (display strings)
   - NEW: `['rage', 'danger_sense']` (feature IDs)
   - Impact: Old characters will NOT load

2. **Skill type changes:**
   - OLD: Union type of 18 specific skills
   - NEW: `string` type (any skill ID from registry)
   - Impact: TypeScript changes, runtime validation required

3. **Solution:**
   - Generate new characters after upgrade
   - No migration script provided

### Open Questions - RESOLVED ✅

**All open questions have been resolved:**

1. **Should we support custom class features?**
   - **YES** → Implemented in **Phase 11**
   - Full FeatureRegistry system with prerequisites, effects, and progression
   - Supports custom class features AND racial traits
   - Validated against character state

2. **Should we support custom skill lists?**
   - **YES** → Implemented in **Phase 12**
   - Full SkillRegistry system with custom skill support
   - Per-class custom skill lists with spawn rates
   - Skill metadata and categorization

3. **Should spawn rates be per-category or global?**
   - **PER-CATEGORY** → Each expansion pack includes its own spawn rates
   - Integrated with ExtensionManager
   - Granular control: equipment, skills, features, appearance, etc. each have independent spawn rates
   - Example: `skills.custom_skill: 2.0` (twice as likely), `skills.athletics: 0.5` (half as likely)

### Additional Design Decisions

**Effects System - Automatic Application:**
- Feature effects **automatically modify** character stats when features are added
- No manual application required - full automation
- Example: Rage feature automatically adds +2 damage bonus to character
- Implementation: `applyEffects()` method in CharacterGenerator processes effects when features are granted

**Skill Categories - Light Mechanical Impact:**
- Categories affect gameplay, not just organizational tags
- Class backgrounds can favor certain skill categories
- Example implementations:
  - "Noble" background favors social skills (persuasion, deception, insight)
  - "Outlander" background favors exploration skills (survival, nature, athletics)
  - "Sage" background favors knowledge skills (arcana, history, religion)
- Implementation: Add `favoredCategories` to background data, weighted selection in SkillAssigner

**Spawn Rate Granularity - Hierarchical System:**
- Category defaults with individual item overrides
- Maximum flexibility with sensible defaults
- Implementation pattern:
  ```typescript
  // Category default: all skills = 1.0
  manager.setWeights('skills', { default: 1.0 });

  // Individual override: athletics = 2.0 (twice as likely)
  manager.setWeights('skills.athletics', { athletics: 2.0 });

  // Result: athletics = 2.0, all other skills = 1.0
  ```
- ExtensionManager checks individual override first, falls back to category default

**Prerequisite Complexity - Moderate:**
- Supports level requirements + AND/OR logic for feature chains
- Clear, readable validation with helpful error messages
- Implementation pattern:
  ```typescript
  interface Prerequisites {
      level?: number;
      anyOf?: string[];      // OR logic: requires any of these features
      allOf?: string[];      // AND logic: requires all of these features
      abilities?: Record<Ability, number>;  // Ability score requirements
  }

  // Example: Extra Attack requires level 5
  { level: 5 }

  // Example: Eldritch Knight requires (War Magic OR Arcane Charge)
  { anyOf: ['war_magic', 'arcane_charge'] }

  // Example: Advanced feature requires level 11 AND (featureX OR featureY)
  { level: 11, anyOf: ['featureX', 'featureY'] }
  ```
- Validation returns clear errors: "Missing prerequisite: Rage (barbarian_rage)"


---

## Updated Timeline Estimate

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 1: Research | 2-3 | Critical |
| Phase 8: Audio Fix | 4-6 | **Critical** |
| Phase 9: ClassSuggester | 6-8 | **Critical** |
| Phase 3: Ammunition | 1-2 | High |
| Phase 4: Core System | 4-6 | High |
| Phase 5: Categories | 6-8 | Medium |
| Phase 6: Testing | 6-8 | High |
| Phase 7: Documentation | 3-4 | Medium |
| Phase 10: Integration | 4-6 | High |
| **Phase 11: Custom Features** | 8-12 | **High** |
| **Phase 12: Custom Skills** | 6-8 | **High** |
| **Phase 13: Integration** | 4-6 | **High** |
| Phase 14: Documentation | 3-4 | Medium |
| Phase 15: Testing | 6-8 | High |

**Total: 64-91 hours** (includes original phases + new features)

**Breakdown:**
- Original plan (phases 1-10): 36-51 hours
- Features/skills (phases 11-13): 18-26 hours
- Documentation & testing: 10-14 hours

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 1: Research | 2-3 | Critical |
| Phase 8: Audio Fix | 4-6 | **Critical** |
| Phase 9: ClassSuggester | 6-8 | **Critical** |
| Phase 3: Ammunition | 1-2 | High |
| Phase 4: Core System | 4-6 | High |
| Phase 5: Categories | 6-8 | Medium |
| Phase 6: Testing | 6-8 | High |
| Phase 7: Documentation | 3-4 | Medium |
| Phase 10: Integration | 4-6 | High |

**Total: 36-49 hours** (was 21-31 hours before audio/class fixes)

---

## Updated Success Criteria

**Must Have:**
- [ ] Ammunition fix complete (20 individual arrows, not "Arrows (20)")
- [ ] ExtensionManager API functional for all categories
- [ ] Validation system rejects invalid data with clear errors
- [ ] Weight system supports relative and absolute modes
- [ ] **Audio analysis balanced** (treble no longer dominates)
- [ ] **All classes always possible** (minimum 4% baseline, never 0%)
- [ ] **No hard thresholds** (smooth sigmoid transitions)
- [ ] All tests pass (unit, integration, edge cases)

**Nice to Have:**
- [ ] Documentation complete
- [ ] Backward compatible
- [ ] Performance acceptable (<20% slower)