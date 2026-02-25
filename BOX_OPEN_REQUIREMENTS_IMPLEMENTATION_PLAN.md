# Box Open Requirements Implementation Plan (Part 2)

## Overview

Add optional opening requirements to box-type equipment. Boxes can now require consuming items (like a key or gold coins) before they can be opened. This builds on the completed Box Item Type implementation (Part 1).

### Key Features
- **Optional Requirement**: Boxes can be opened freely OR require consumption of items
- **Item Consumption**: Require a specific item (e.g., "Iron Key") or quantity of items (e.g., 3 Lockpicks)
- **Gold as Item**: Gold is treated as an item ("Gold Coin") with quantity (e.g., require 50 Gold Coins)
- **Multiple Requirements**: Support for multiple item requirements on a single box (array of requirements)
- **Graceful Failure**: Clear error messages when requirements are not met
- **Inventory Integration**: Requirements are checked and consumed from character inventory

---

## Phase 1: Type Definitions
*Estimated complexity: Low*

- [x] **1.1 Define BoxOpenRequirement Interface**
  - [x] Open `src/core/types/Equipment.ts`
  - [x] Add new interface after `BoxOpenResult`:
  ```typescript
  /**
   * A single requirement that must be met to open a box
   *
   * Represents an item (and quantity) that must be consumed from inventory.
   * Gold requirements use a "Gold Coin" item with quantity.
   */
  export interface BoxOpenRequirement {
      /** Item name that must be consumed (must exist in character inventory) */
      itemName: string;
      /** Quantity of item required (default: 1) */
      quantity?: number;
  }
  ```

- [x] **1.2 Update BoxContents Interface**
  - [x] Add `openRequirements` property to `BoxContents`:
  ```typescript
  export interface BoxContents {
      /** Number of drops to generate when box is opened */
      drops: BoxDrop[];
      /** Whether box is consumed on open (default: true) */
      consumeOnOpen?: boolean;
      /** Optional requirements to open this box (all must be satisfied) */
      openRequirements?: BoxOpenRequirement[];
  }
  ```

- [x] **1.3 Define BoxOpenError Type**
  - [x] Add error result type for failed open attempts:
  ```typescript
  /**
   * Error returned when box cannot be opened due to unmet requirements
   */
  export interface BoxOpenError {
      /** Error code for programmatic handling */
      code: 'MISSING_ITEM' | 'INSUFFICIENT_QUANTITY' | 'NO_BOX_CONTENTS';
      /** Human-readable error message */
      message: string;
      /** The requirement that was not met */
      requirement?: BoxOpenRequirement;
  }
  ```

- [x] **1.4 Update BoxOpenResult Interface**
  - [x] Extend to support error states:
  ```typescript
  export interface BoxOpenResult {
      /** Whether the box was successfully opened */
      success: boolean;
      /** Items generated from the box (empty if not opened) */
      items: BaseEquipment[];
      /** Gold generated from the box */
      gold: number;
      /** Whether the box should be consumed */
      consumeBox: boolean;
      /** Error if box could not be opened */
      error?: BoxOpenError;
      /** Items consumed to open the box */
      consumedItems?: { name: string; quantity: number }[];
  }
  ```

- [x] **1.5 Export New Types from Index**
  - [x] Update `src/index.ts` to export `BoxOpenRequirement` and `BoxOpenError`

---

## Phase 2: BoxOpener Updates
*Estimated complexity: Medium*

- [x] **2.1 Add Requirement Validation Method**
  - [x] File: `src/core/equipment/BoxOpener.ts`
  - [x] Add static method to check requirements:
  ```typescript
  /**
   * Check if box requirements are met
   * @param box - The box to check
   * @param inventory - Character's items inventory
   * @returns null if requirements met, BoxOpenError if not
   */
  static checkRequirements(
      box: Equipment,
      inventory: EnhancedInventoryItem[]
  ): BoxOpenError | null
  ```

- [x] **2.2 Add canOpen Method**
  - [x] Simple boolean check for UI use:
  ```typescript
  /**
   * Check if a box can be opened with given inventory
   * @returns true if box can be opened, false otherwise
   */
  static canOpen(
      box: Equipment,
      inventory: EnhancedInventoryItem[]
  ): boolean
  ```

- [x] **2.3 Update openBox Method Signature**
  - [x] Modify `openBox()` to accept inventory:
  ```typescript
  static openBox(
      box: Equipment,
      rng: SeededRNG,
      inventory?: EnhancedInventoryItem[]
  ): BoxOpenResult
  ```
  - [x] When inventory not provided, skip requirement checks (backward compatible)
  - [x] When requirements not met, return result with `success: false` and error

- [x] **2.4 Update previewContents Method**
  - [x] Add requirements info to preview:
  ```typescript
  static previewContents(box: Equipment): {
      possibleItems: string[];
      possibleGold: { min: number; max: number };
      totalDrops: number;
      openRequirements?: BoxOpenRequirement[];  // NEW
  }
  ```

- [x] **2.5 Add getRequirementsDescription Helper**
  - [x] Human-readable description of requirements:
  ```typescript
  /**
   * Get human-readable description of box requirements
   * @returns Description like "Requires: Iron Key" or "Requires: 3 Lockpicks"
   */
  static getRequirementsDescription(box: Equipment): string | null
  ```

---

## Phase 3: EquipmentSpawnHelper Updates
*Estimated complexity: Medium*

- [ ] **3.1 Update openBoxForCharacter Method**
  - [ ] File: `src/core/equipment/EquipmentSpawnHelper.ts`
  - [ ] Modify to check requirements before opening:
  ```typescript
  static openBoxForCharacter(
      character: CharacterSheet,
      boxName: string,
      rng: SeededRNG
  ): { character: CharacterSheet; result: BoxOpenResult } | null
  ```
  - [ ] Check requirements using `BoxOpener.checkRequirements()`
  - [ ] If requirements not met, return result with error (don't modify character)
  - [ ] If requirements met, consume required items from character inventory
  - [ ] Then proceed with opening box as before

- [ ] **3.2 Add consumeItemFromCharacter Helper**
  - [ ] Private method to consume items from inventory:
  ```typescript
  private static consumeItemFromCharacter(
      character: CharacterSheet,
      itemName: string,
      quantity: number
  ): { success: boolean; character: CharacterSheet }
  ```
  - [ ] Finds item in character's `equipment.items[]`
  - [ ] Reduces quantity or removes item if quantity reaches 0
  - [ ] Updates `totalWeight` accordingly

---

## Phase 4: Validator Updates
*Estimated complexity: Low*

- [ ] **4.1 Add validateBoxOpenRequirement Method**
  - [ ] File: `src/core/equipment/EquipmentValidator.ts`
  - [ ] New validation method:
  ```typescript
  static validateBoxOpenRequirement(
      requirement: BoxOpenRequirement
  ): EquipmentValidationResult
  ```
  - [ ] Validate:
    - `itemName` must be a non-empty string (required)
    - `itemName` must exist in equipment registry
    - `quantity` must be a positive integer if present (default: 1)

- [ ] **4.2 Update validateBoxContents Method**
  - [ ] Add validation for `openRequirements` field:
  ```typescript
  // In validateBoxContents()
  if (boxContents.openRequirements !== undefined) {
      if (!Array.isArray(boxContents.openRequirements)) {
          errors.push('boxContents.openRequirements must be an array');
      } else {
          for (let i = 0; i < boxContents.openRequirements.length; i++) {
              const reqValidation = this.validateBoxOpenRequirement(boxContents.openRequirements[i]);
              if (!reqValidation.valid) {
                  errors.push(...(reqValidation.errors || []).map(e => `openRequirements[${i}]: ${e}`));
              }
          }
      }
  }
  ```

---

## Phase 5: Example Boxes
*Estimated complexity: Low*

- [ ] **5.1 Add Key Item**
  - [ ] File: `src/constants/DefaultEquipment.ts`
  - [ ] Add key items for locked boxes:
  ```typescript
  'Iron Key': {
      name: 'Iron Key',
      type: 'item',
      rarity: 'common',
      weight: 0,
      spawnWeight: 0.5,
      tags: ['key', 'utility', 'consumable'],
      description: 'A simple iron key that can unlock certain containers.'
  },
  'Golden Key': {
      name: 'Golden Key',
      type: 'item',
      rarity: 'uncommon',
      weight: 0,
      spawnWeight: 0.2,
      tags: ['key', 'utility', 'consumable', 'valuable'],
      description: 'An ornate golden key for unlocking valuable chests.'
  },
  'Skeleton Key': {
      name: 'Skeleton Key',
      type: 'item',
      rarity: 'rare',
      weight: 0,
      spawnWeight: 0.1,
      tags: ['key', 'utility', 'consumable', 'universal'],
      description: 'A master key that can open many different locks.'
  }
  ```

- [ ] **5.2 Add Locked Chest Box**
  - [ ] Box requiring Iron Key to open:
  ```typescript
  'Locked Chest': {
      name: 'Locked Chest',
      type: 'box',
      rarity: 'uncommon',
      weight: 10,
      spawnWeight: 0.5,
      tags: ['loot', 'treasure', 'locked'],
      boxContents: {
          openRequirements: [
              { itemName: 'Iron Key' }
          ],
          drops: [
              { pool: [{ weight: 100, gold: 50 }] },
              { pool: [
                  { weight: 50, itemName: 'Shortsword' },
                  { weight: 30, itemName: 'Leather Armor' },
                  { weight: 20, itemName: 'Potion of Healing' }
              ]}
          ]
      },
      description: 'A sturdy locked chest. Requires an Iron Key to open.'
  }
  ```

- [ ] **5.3 Add Gilded Box (Gold Coin Requirement)**
  - [ ] Box requiring Gold Coins to open (gold as item):
  ```typescript
  'Gilded Strongbox': {
      name: 'Gilded Strongbox',
      type: 'box',
      rarity: 'rare',
      weight: 15,
      spawnWeight: 0.3,
      tags: ['loot', 'treasure', 'gold-locked'],
      boxContents: {
          openRequirements: [
              { itemName: 'Gold Coin', quantity: 100 }
          ],
          drops: [
              { pool: [{ weight: 100, gold: 250 }] },
              { pool: [
                  { weight: 40, itemName: 'Longsword' },
                  { weight: 30, itemName: 'Chain Mail' },
                  { weight: 20, itemName: 'Ring of Protection' },
                  { weight: 10, itemName: 'Potion of Greater Healing' }
              ]}
          ]
      },
      description: 'A gilded strongbox with a magical lock. Consumes 100 Gold Coins to unlock.'
  }
  ```

- [ ] **5.4 Add Multi-Requirement Box**
  - [ ] Box requiring multiple different items:
  ```typescript
  'Royal Treasury Box': {
      name: 'Royal Treasury Box',
      type: 'box',
      rarity: 'very_rare',
      weight: 20,
      spawnWeight: 0.1,
      tags: ['loot', 'treasure', 'royal', 'locked'],
      boxContents: {
          openRequirements: [
              { itemName: 'Golden Key' },
              { itemName: 'Gold Coin', quantity: 200 }
          ],
          drops: [
              { pool: [{ weight: 100, gold: 1000 }] },
              { pool: [
                  { weight: 35, itemName: 'Longsword +1' },
                  { weight: 35, itemName: 'Chain Mail +1' },
                  { weight: 20, itemName: 'Ring of Protection' },
                  { weight: 10, itemName: 'Cloak of Elvenkind' }
              ]},
              { pool: [
                  { weight: 60, itemName: 'Potion of Greater Healing' },
                  { weight: 40, itemName: 'Potion of Heroism' }
              ]}
          ]
      },
      description: 'A royal treasury box sealed with magic. Requires a Golden Key and 200 Gold Coins to open.'
  }
  ```

- [ ] **5.5 Add Quantity-Based Requirement Box**
  - [ ] Box requiring multiple of the same item:
  ```typescript
  'Thieves\' Cache': {
      name: 'Thieves\' Cache',
      type: 'box',
      rarity: 'uncommon',
      weight: 5,
      spawnWeight: 0.4,
      tags: ['loot', 'treasure', 'rogue', 'locked'],
      boxContents: {
          openRequirements: [
              { itemName: 'Lockpick', quantity: 3 }
          ],
          drops: [
              { pool: [{ weight: 100, gold: 75 }] },
              { pool: [
                  { weight: 50, itemName: 'Thieves\' Tools' },
                  { weight: 30, itemName: 'Dagger' },
                  { weight: 20, itemName: 'Cloak of Elvenkind' }
              ]}
          ]
      },
      description: 'A hidden cache with a complex lock. Requires 3 lockpicks to crack (consumed in the process).'
  }
  ```

- [ ] **5.6 Add Lockpick Item**
  - [ ] Consumable item for thieves' cache:
  ```typescript
  'Lockpick': {
      name: 'Lockpick',
      type: 'item',
      rarity: 'common',
      weight: 0,
      spawnWeight: 0.8,
      tags: ['gear', 'rogue', 'consumable', 'tool'],
      description: 'A simple lockpick. Multiple may be needed for complex locks.'
  }
  ```

- [ ] **5.7 Add Gold Coin Item (if not exists)**
  - [ ] Currency item for gold-based requirements:
  ```typescript
  'Gold Coin': {
      name: 'Gold Coin',
      type: 'item',
      rarity: 'common',
      weight: 0,
      spawnWeight: 0,  // Not randomly spawned
      tags: ['currency', 'gold', 'money'],
      description: 'A standard gold coin used as currency throughout the realm.'
  }
  ```

---

## Phase 6: Testing
*Estimated complexity: Medium*

- [ ] **6.1 Unit Tests for Requirement Validation**
  - [ ] Test `BoxOpener.checkRequirements()`:
    - Returns null when no requirements
    - Returns error for missing item
    - Returns error for insufficient item quantity
    - Returns null when all requirements met
    - Returns null when multiple requirements all met
    - Returns error when one of multiple requirements not met

- [ ] **6.2 Unit Tests for canOpen**
  - [ ] Test `BoxOpener.canOpen()`:
    - Returns true for boxes without requirements
    - Returns true when requirements are met
    - Returns false when requirements are not met

- [ ] **6.3 Unit Tests for openBox with Requirements**
  - [ ] Test `BoxOpener.openBox()` with requirements:
    - Opens normally when no requirements
    - Opens when requirements are met (inventory provided)
    - Returns error when requirements not met
    - Backward compatible (works without inventory param)

- [ ] **6.4 Integration Tests for openBoxForCharacter**
  - [ ] Test `EquipmentSpawnHelper.openBoxForCharacter()`:
    - Opens box without requirements normally
    - Consumes required item from inventory
    - Consumes multiple items when quantity > 1
    - Fails gracefully when item not in inventory
    - Fails gracefully when insufficient quantity
    - Returns proper error messages
    - Character inventory is updated correctly after consumption

- [ ] **6.5 Validator Tests**
  - [ ] Test `EquipmentValidator.validateBoxOpenRequirement()`:
    - Valid with itemName and default quantity
    - Valid with itemName and explicit quantity
    - Invalid with empty itemName
    - Invalid with non-existent itemName
    - Invalid with non-integer quantity
    - Invalid with quantity < 1

- [ ] **6.6 Manual Verification Script**
  ```typescript
  import { BoxOpener, ExtensionManager, SeededRNG } from 'playlist-data-engine';

  const rng = new SeededRNG('test-requirements');
  const manager = ExtensionManager.getInstance();

  // Test locked chest
  const lockedChest = manager.get('equipment').find(e => e.name === 'Locked Chest');

  // Should fail without key
  const result1 = BoxOpener.openBox(lockedChest, rng, []);
  console.log('Without key:', result1.success); // false
  console.log('Error:', result1.error?.message); // "Missing required item: Iron Key"

  // Should succeed with key
  const inventory = [{ name: 'Iron Key', quantity: 1, equipped: false }];
  const result2 = BoxOpener.openBox(lockedChest, rng, inventory);
  console.log('With key:', result2.success); // true
  console.log('Items received:', result2.items.length);
  console.log('Consumed:', result2.consumedItems); // [{ name: 'Iron Key', quantity: 1 }]
  ```

---

## Phase 7: Documentation Updates
*Estimated complexity: Medium*

- [ ] **7.1 Update EQUIPMENT_SYSTEM.md**
  - [ ] File: `docs/EQUIPMENT_SYSTEM.md`
  - [ ] Add "Opening Requirements" subsection under "Box Equipment Type"
  - [ ] Document `BoxOpenRequirement` interface
  - [ ] Add examples for each requirement type:
    - Item requirement
    - Gold requirement
    - Quantity requirement
    - Combined requirements
  - [ ] Document error handling

- [ ] **7.2 Update COMBAT_SYSTEM.md**
  - [ ] File: `docs/COMBAT_SYSTEM.md`
  - [ ] Note that combat reward boxes may have opening requirements
  - [ ] Example of awarding locked boxes as loot

- [ ] **7.3 Update DATA_ENGINE_REFERENCE.md**
  - [ ] File: `docs/DATA_ENGINE_REFERENCE.md`
  - [ ] Add `BoxOpenRequirement` to type exports
  - [ ] Add `BoxOpenError` to type exports
  - [ ] Update `BoxOpener` method table:
    - Add `checkRequirements()` method
    - Add `canOpen()` method
    - Add `getRequirementsDescription()` method
    - Update `openBox()` signature with new param
  - [ ] Update `previewContents()` return type documentation

- [ ] **7.4 Update USAGE_IN_OTHER_PROJECTS.md**
  - [ ] File: `docs/USAGE_IN_OTHER_PROJECTS.md`
  - [ ] Add "Locked Boxes" subsection under "Box Items"
  - [ ] Working code example for checking requirements
  - [ ] Working code example for opening locked box
  - [ ] Working code example for handling errors

---

## Phase 8: Build & Verify
*Estimated complexity: Low*

- [ ] **8.1 TypeScript Build**
  - [ ] Run `npm run build`
  - [ ] Verify no TypeScript errors
  - [ ] Verify all exports are correct

- [ ] **8.2 Run Test Suite**
  - [ ] Run `npm test`
  - [ ] All existing tests pass
  - [ ] All new tests pass

- [ ] **8.3 Verify Examples**
  - [ ] Run manual verification script
  - [ ] Test all example boxes work correctly

---

## Dependencies

- Phase 1 (Type Definitions) must complete before all other phases
- Phase 2 (BoxOpener) depends on Phase 1
- Phase 3 (EquipmentSpawnHelper) depends on Phase 2
- Phase 4 (Validator) depends on Phase 1
- Phase 5 (Example Boxes) depends on Phase 1
- Phase 6 (Testing) depends on Phases 2, 3, 4, 5
- Phase 7 (Documentation) can start after Phase 2, complete after Phase 6
- Phase 8 (Build & Verify) depends on all previous phases

---

## Questions/Decisions

- [x] **Gold as item**: How is gold handled?
  - **Decision**: Gold is an item like any other ("Gold Coin") with quantity. No special gold property on CharacterSheet.
- [x] **Partial consumption**: If one requirement fails, are others consumed?
  - **Decision**: Check ALL requirements before consuming ANY (atomic operation)
- [x] **Multiple boxes with same key**: Can one key open multiple boxes?
  - **Decision**: No, key is consumed on use. Each box needs its own key.
- [x] **Preview locked contents**: Should previewContents show what's inside locked boxes?
  - **Decision**: Yes, preview shows contents regardless of lock status (player can see potential loot)
- [x] **Multiple requirements**: How are multiple requirements handled?
  - **Decision**: Array of requirements, ALL must be satisfied to open the box

---

## Example Box Definitions

### Single Item Requirement (Key)
```typescript
{
    name: "Locked Chest",
    type: 'box',
    rarity: 'uncommon',
    weight: 10,
    boxContents: {
        openRequirements: [
            { itemName: 'Iron Key' }
        ],
        drops: [
            { pool: [{ weight: 100, gold: 50 }] },
            { pool: [{ weight: 50, itemName: 'Shortsword' }, { weight: 50, itemName: 'Potion of Healing' }]}
        ]
    },
    description: 'A locked chest. Requires an Iron Key to open.'
}
```

### Gold Coin Requirement
```typescript
{
    name: "Gilded Strongbox",
    type: 'box',
    rarity: 'rare',
    weight: 15,
    boxContents: {
        openRequirements: [
            { itemName: 'Gold Coin', quantity: 100 }
        ],
        drops: [
            { pool: [{ weight: 100, gold: 250 }] }
        ]
    },
    description: 'Consumes 100 Gold Coins to unlock this magical strongbox.'
}
```

### Quantity Requirement (Multiple of Same Item)
```typescript
{
    name: "Thieves' Cache",
    type: 'box',
    rarity: 'uncommon',
    weight: 5,
    boxContents: {
        openRequirements: [
            { itemName: 'Lockpick', quantity: 3 }
        ],
        drops: [
            { pool: [{ weight: 100, gold: 75 }] }
        ]
    },
    description: 'Requires 3 lockpicks to crack this complex lock.'
}
```

### Multiple Requirements (Different Items)
```typescript
{
    name: "Royal Treasury Box",
    type: 'box',
    rarity: 'very_rare',
    weight: 20,
    boxContents: {
        openRequirements: [
            { itemName: 'Golden Key' },
            { itemName: 'Gold Coin', quantity: 200 }
        ],
        drops: [
            { pool: [{ weight: 100, gold: 1000 }] }
        ]
    },
    description: 'Requires a Golden Key and 200 Gold Coins to open.'
}
```

### No Requirements (Standard Box)
```typescript
{
    name: "Explorer's Pack",
    type: 'box',
    rarity: 'common',
    weight: 59,
    boxContents: {
        // No openRequirements = can be opened freely
        drops: [
            { pool: [{ weight: 100, itemName: 'Backpack' }] },
            { pool: [{ weight: 100, itemName: 'Torch', quantity: 10 }] }
        ]
    },
    description: 'A standard pack with no lock.'
}
```

---

## Files Summary

### Modified Files
| File | Changes |
|------|---------|
| `src/core/types/Equipment.ts` | Add `BoxOpenRequirement`, `BoxOpenError`, update `BoxContents`, `BoxOpenResult` |
| `src/core/equipment/BoxOpener.ts` | Add `checkRequirements()`, `canOpen()`, `getRequirementsDescription()`, update `openBox()`, `previewContents()` |
| `src/core/equipment/EquipmentSpawnHelper.ts` | Update `openBoxForCharacter()` to check/consume requirements, add `consumeItemFromCharacter()` |
| `src/core/equipment/EquipmentValidator.ts` | Add `validateBoxOpenRequirement()`, update `validateBoxContents()` |
| `src/constants/DefaultEquipment.ts` | Add key items (Iron Key, Golden Key, Skeleton Key, Lockpick, Gold Coin) and locked box examples |
| `src/index.ts` | Export `BoxOpenRequirement` and `BoxOpenError` types |

### Documentation Files
| File | Changes |
|------|---------|
| `docs/EQUIPMENT_SYSTEM.md` | Add "Opening Requirements" subsection with examples |
| `docs/COMBAT_SYSTEM.md` | Note locked boxes can be awarded as combat loot |
| `docs/DATA_ENGINE_REFERENCE.md` | Add `BoxOpenRequirement`, `BoxOpenError` types; update `BoxOpener` methods |
| `docs/USAGE_IN_OTHER_PROJECTS.md` | Add "Locked Boxes" subsection with working code examples |

---

## Progress Tracking
- Phase 1: ✅ Complete
- Phase 2: ✅ Complete
- Phase 3: ⬜ Not Started
- Phase 4: ⬜ Not Started
- Phase 5: ⬜ Not Started
- Phase 6: ⬜ Not Started
- Phase 7: ⬜ Not Started
- Phase 8: ⬜ Not Started

*Last updated: 2026-02-25*
