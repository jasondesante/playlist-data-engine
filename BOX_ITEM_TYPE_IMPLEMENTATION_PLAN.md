# Box Item Type Implementation Plan

## Overview
Add a new "box" equipment type that represents items containing other items. This supports both guaranteed containers (backpacks, adventure packs) and probability-based loot boxes.

### Key Features
- **Quantity Parameter**: `BoxDropPool.quantity` allows giving multiple items in one drop (e.g., 10 torches, 20 arrows)
- **Nested Boxes**: When a box opens and gives another box, that box is added unopened to inventory
- **Gold Drops**: Boxes can award gold directly alongside items
- **Weighted Random**: Probability-based selection from item pools

---

## Phase 1: Type Definitions
*Estimated complexity: Low*

- [x] **1.1 Add Box Type to EquipmentType Union**
  - [x] Open `src/core/types/Equipment.ts`
  - [x] Add `'box'` to `EquipmentType` union (line ~29-32)
  ```typescript
  export type EquipmentType =
      | 'weapon'
      | 'armor'
      | 'item'
      | 'box';  // NEW
  ```

- [x] **1.2 Define Box Content Interfaces**
  - [x] Add to `src/core/types/Equipment.ts` (before `EnhancedEquipment` type alias)
  ```typescript
  /** Pool entry for a single item that can drop from a box */
  export interface BoxDropPool {
      /** Probability weight (weights in pool should sum to 100) */
      weight: number;
      /** Item name to spawn (must exist in equipment registry) */
      itemName?: string;
      /** Quantity if selected (e.g., 10 torches, 20 arrows) */
      quantity?: number;
      /** Gold amount instead of item (mutually exclusive with itemName) */
      gold?: number;
  }

  /** A single "drop" - one item generated from a pool */
  export interface BoxDrop {
      /** Pool of possible items. Weights should sum to 100. */
      pool: BoxDropPool[];
  }

  /** Box contents configuration */
  export interface BoxContents {
      /** Number of drops to generate when box is opened */
      drops: BoxDrop[];
      /** Whether box is consumed on open (default: true) */
      consumeOnOpen?: boolean;
  }

  /** Result of opening a box */
  export interface BoxOpenResult {
      /** Items generated from the box */
      items: Equipment[];
      /** Gold generated from the box */
      gold: number;
      /** Whether the box should be consumed */
      consumeBox: boolean;
  }
  ```

- [x] **1.3 Update Equipment Interface**
  - [x] Open `src/utils/constants.ts`
  - [x] Import box types from `../core/types/Equipment.js`
  - [x] Add `boxContents?: BoxContents` to `Equipment` interface
  - [x] Update `SpawnRandomOptions.includeTypes` to include `'box'`

- [x] **1.4 Export Types from Index**
  - [x] Update `src/index.ts` to export new box types

---

## Phase 2: BoxOpener Utility
*Estimated complexity: Medium*

- [x] **2.1 Create BoxOpener Class**
  - [x] Create new file `src/core/equipment/BoxOpener.ts`
  ```typescript
  import type { Equipment, BoxContents, BoxDropPool, BoxOpenResult } from '../types/Equipment.js';
  import { SeededRNG } from '../../utils/random.js';
  import { EquipmentGenerator } from '../generation/EquipmentGenerator.js';

  export class BoxOpener {
      /**
       * Open a box and generate its contents
       * @param box - The box equipment to open
       * @param rng - Seeded RNG for deterministic results
       * @returns BoxOpenResult with items and gold
       */
      static openBox(box: Equipment, rng: SeededRNG): BoxOpenResult {
          // Implementation details...
      }

      /**
       * Select one item from a weighted pool
       */
      private static selectFromPool(pool: BoxDropPool[], rng: SeededRNG): BoxDropPool {
          // Use rng.weightedChoice()
      }
  }
  ```

- [x] **2.2 Implement openBox Logic**
  - [x] Validate box has `boxContents`
  - [x] For each drop, select one item from pool using weighted random
  - [x] Handle `quantity` for bulk items
  - [x] Handle `gold` drops
  - [x] Return `BoxOpenResult` with items array and gold total

- [x] **2.3 Handle Nested Boxes**
  - [x] When a drop result is another box type item, add it as-is (unopened)
  - [x] Don't recursively open nested boxes

---

## Phase 3: Add Missing Pack Items
*Estimated complexity: Medium (27 items)*

- [x] **3.1 Add Utility Items**
  - [x] Ball Bearings (bag of 1,000) - weight 2, tags: gear, utility, rogue
  - [x] String (10 feet) - weight 0, tags: gear, utility
  - [x] Bell - weight 0, tags: gear, utility, alarm
  - [x] Crowbar - weight 5, tags: gear, tool, utility
  - [x] Hammer - weight 3, tags: gear, tool, utility
  - [x] Piton - weight 0.25, tags: gear, climbing, utility
  - [x] Small Knife - weight 1, tags: gear, tool, utility

- [x] **3.2 Add Light Sources**
  - [x] Candle - weight 0, tags: gear, light, consumable
  - [x] Hooded Lantern - weight 2, tags: gear, light
  - [x] Oil Flask - weight 1, tags: gear, light, consumable

- [x] **3.3 Add Survival Items**
  - [x] Bedroll - weight 7, tags: gear, camp, comfort
  - [x] Rations (1 day) - weight 2, tags: gear, food, consumable
  - [x] Tinderbox - weight 1, tags: gear, fire, utility
  - [x] Mess Kit - weight 1, tags: gear, camp, dining
  - [x] Blanket - weight 3, tags: gear, camp, comfort

- [x] **3.4 Add Clothing Items**
  - [x] Costume - weight 4, tags: gear, clothing, performance
  - [x] Traveler's Clothes - weight 4, tags: gear, clothing
  - [x] Vestments - weight 2, tags: gear, clothing, religious

- [x] **3.5 Add Religious Items**
  - [x] Alms Box - weight 0, tags: gear, religious, container
  - [x] Incense (block) - weight 0, tags: gear, religious, consumable
  - [x] Censer - weight 2, tags: gear, religious

- [x] **3.6 Add Writing Items**
  - [x] Book of Lore - weight 5, tags: gear, book, knowledge
  - [x] Bottle of Ink - weight 0, tags: gear, writing, consumable
  - [x] Ink Pen - weight 0, tags: gear, writing
  - [x] Parchment (sheet) - weight 0, tags: gear, writing, consumable
  - [x] Bag of Sand - weight 0, tags: gear, writing, utility

- [x] **3.7 Add Tools**
  - [x] Disguise Kit - weight 3, tags: gear, deception, rogue

---

## Phase 4: Convert Packs to Boxes
*Estimated complexity: Medium (15 items)*

- [ ] **4.1 Convert Basic Packs**
  - [x] **Backpack** (lines 360-368) - empty container, `drops: []`
  - [x] **Burglar's Pack** (lines 402-410) - 14 drops (full D&D 5e contents)
    - Backpack, Ball Bearings x1000, String 10ft, Bell, Candle x5, Crowbar, Hammer, Piton x10, Hooded Lantern, Oil Flask x2, Rations x5, Tinderbox, Waterskin, Rope 50ft
  - [x] **Explorer's Pack** (lines 411-419) - 8 drops
    - Backpack, Bedroll, Mess Kit, Tinderbox, Waterskin, Rope 50ft, Torch x10, Rations x10

- [ ] **4.2 Convert Class-Specific Packs**
  - [ ] **Entertainer's Pack** (lines 420-428) - 8 drops
    - Backpack, Bedroll, Costume x2, Candle x5, Rations x5, Waterskin, Disguise Kit
  - [ ] **Priest's Pack** (lines 429-437) - 10 drops
    - Backpack, Blanket, Candle x10, Tinderbox, Alms Box, Incense x2, Censer, Vestments, Rations x2, Waterskin
  - [ ] **Scholar's Pack** (lines 456-464) - 6 drops
    - Backpack, Book of Lore, Bottle of Ink, Ink Pen, Parchment x10, Bag of Sand

- [ ] **4.3 Convert Dungeon Packs**
  - [ ] **Dungeon Delver's Pack** (lines 438-446) - 9 drops
    - Backpack, Crowbar, Hammer, Piton x10, Torch x10, Tinderbox, Rations x10, Waterskin, Rope 50ft
  - [ ] **Dungeoneer's Pack** (lines 447-455) - 9 drops (same as Delver's)

- [ ] **4.4 Convert General Packs**
  - [ ] **Traveler's Pack** (lines 465-473) - 7 drops
    - Backpack, Bedroll, Mess Kit, Rations x10, Waterskin, Traveler's Clothes, Rope 50ft

- [ ] **4.5 Convert Container Items**
  - [ ] **Waterskin** (lines 381-389) - empty container or contains water
    - Can be empty `drops: []` or contain water item
  - [ ] **Component Pouch** (lines 305-313) - empty or contains spell components
    - Optional: pre-filled with common components
  - [ ] **Healer's Kit** (lines 333-341) - contains bandages, salves
    - 10 charges of healing supplies

---

## Phase 5: Integration Updates
*Estimated complexity: Low-Medium*

- [ ] **5.1 Update EquipmentSpawnHelper**
  - [ ] File: `src/core/equipment/EquipmentSpawnHelper.ts`
  - [ ] Update `spawnRandom()` to support `includeTypes: ['box']`
  - [ ] Add `openBoxForCharacter(character, boxName, rng)` method
    - Opens box, removes from inventory, adds contents

- [ ] **5.2 Update EquipmentGenerator**
  - [ ] File: `src/core/generation/EquipmentGenerator.ts`
  - [ ] Handle boxes in `initializeEquipment()` - boxes go to `items[]` array
  - [ ] Keep packs as unopened boxes (don't auto-open starting equipment)

- [ ] **5.3 Update Combat Engine (Minimal)**
  - [ ] File: `src/core/combat/CombatEngine.ts`
  - [ ] Combat system already supports arbitrary items in rewards
  - [ ] Boxes can be specified in `treasure.items[]` array
  - [ ] No auto-opening - boxes awarded as unopened items

- [ ] **5.4 Update EquipmentValidator**
  - [ ] File: `src/core/equipment/EquipmentValidator.ts`
  - [ ] Add validation for `boxContents` property
  - [ ] Validate weight sums in pools
  - [ ] Validate itemName references exist in registry

---

## Phase 6: Testing & Verification
*Estimated complexity: Medium*

- [ ] **6.1 Unit Tests for BoxOpener**
  - [ ] Test guaranteed pack (Explorer's Pack always gives same items)
  - [ ] Test loot box with probability weights
  - [ ] Test mixed box (guaranteed + random drops)
  - [ ] Test quantity parameter (20 arrows)
  - [ ] Test nested boxes (Treasure Cache → Goblin Chest)
  - [ ] Test gold drops
  - [ ] Test seeded RNG produces same results

- [ ] **6.2 Integration Tests**
  - [ ] Add box to character inventory
  - [ ] Open box removes from inventory and adds contents
  - [ ] Starting equipment packs remain unopened
  - [ ] Combat rewards can include boxes

- [ ] **6.3 Manual Verification**
  ```typescript
  import { BoxOpener, SeededRNG } from 'playlist-data-engine';

  const rng = new SeededRNG('test-seed');
  const result = BoxOpener.openBox(explorersPack, rng);
  console.log(result.items); // Should always be same 8 items
  ```

---

## Phase 7: Documentation
*Estimated complexity: Low*

- [ ] **7.1 Update Equipment System Documentation**
  - [ ] File: `docs/EQUIPMENT_SYSTEM.md`
  - [ ] Document new `'box'` equipment type
  - [ ] Explain `BoxContents`, `BoxDrop`, `BoxDropPool` interfaces
  - [ ] Provide examples of guaranteed containers vs loot boxes
  - [ ] Document nested box behavior
  - [ ] Document quantity parameter usage

- [ ] **7.2 Update Combat System Documentation**
  - [ ] File: `docs/COMBAT_SYSTEM.md`
  - [ ] Document box rewards in treasure drops
  - [ ] Explain how boxes are awarded as unopened items
  - [ ] Provide example treasure configurations with boxes

- [ ] **7.3 Update API Documentation**
  - [ ] Document `BoxOpener` class and methods
  - [ ] Document new types in type reference
  - [ ] Add usage examples to README or examples folder

---

## Dependencies
- All phases depend on Phase 1 (Type Definitions)
- Phase 3 (Add Items) must complete before Phase 4 (Convert Packs)
- Phase 5 (Integration) depends on Phase 2 (BoxOpener)
- Phase 6 (Testing) depends on all previous phases
- Phase 7 (Documentation) can run in parallel with Phase 6 or after

---

## Questions/Unknowns
- [ ] Should boxes have a separate inventory category or stay in `items[]`?
  - **Decision**: Stay in `items[]` for simplicity
- [ ] Should opening a box require an action in combat?
  - **Out of scope** for this implementation
- [ ] Should nested boxes auto-open?
  - **Decision**: No, nested boxes are added unopened
- [ ] How to handle items that don't exist in registry?
  - **Decision**: Log warning, skip the drop (fail gracefully)

---

## Example Box Definitions

### Explorer's Pack (Guaranteed Container)
```typescript
{
    name: "Explorer's Pack",
    type: 'box',
    rarity: 'common',
    weight: 59,
    boxContents: {
        drops: [
            { pool: [{ weight: 100, itemName: 'Backpack' }] },
            { pool: [{ weight: 100, itemName: 'Bedroll' }] },
            { pool: [{ weight: 100, itemName: 'Mess Kit' }] },
            { pool: [{ weight: 100, itemName: 'Tinderbox' }] },
            { pool: [{ weight: 100, itemName: 'Waterskin' }] },
            { pool: [{ weight: 100, itemName: 'Rope' }] },
            { pool: [{ weight: 100, itemName: 'Torch', quantity: 10 }] },
            { pool: [{ weight: 100, itemName: 'Rations', quantity: 10 }] },
        ]
    },
    tags: ['gear', 'pack', 'general'],
    description: 'A backpack containing wilderness exploration gear.'
}
```

### Loot Box (Probability-Based)
```typescript
{
    name: "Goblin Treasure Chest",
    type: 'box',
    rarity: 'uncommon',
    weight: 5,
    boxContents: {
        drops: [{
            pool: [
                { weight: 40, itemName: 'Shortsword' },
                { weight: 30, itemName: 'Leather Armor' },
                { weight: 20, itemName: "Thieves' Tools" },
                { weight: 10, gold: 50 }
            ]
        }]
    },
    tags: ['loot', 'treasure', 'goblin'],
    spawnWeight: 0.3,
    description: "A small chest containing goblin treasure."
}
```

### Boss Loot Box (Mixed Guaranteed + Random)
```typescript
{
    name: "Dragon Hoard Chest",
    type: 'box',
    rarity: 'rare',
    weight: 10,
    boxContents: {
        drops: [
            { pool: [{ weight: 100, gold: 500 }] },
            { pool: [{ weight: 100, itemName: 'Potion of Healing' }] },
            {
                pool: [
                    { weight: 35, itemName: 'Longsword +1' },
                    { weight: 35, itemName: 'Chain Mail +1' },
                    { weight: 20, itemName: 'Ring of Protection' },
                    { weight: 10, itemName: 'Dragon Slayer Sword' }
                ]
            }
        ]
    },
    tags: ['loot', 'treasure', 'dragon', 'boss'],
    spawnWeight: 0.05,
    description: 'A chest from a dragon\'s hoard.'
}
```

### Nested Boxes (Box Containing Another Box)
```typescript
{
    name: "Treasure Cache",
    type: 'box',
    rarity: 'uncommon',
    weight: 8,
    boxContents: {
        drops: [
            { pool: [{ weight: 100, itemName: 'Goblin Treasure Chest' }] },  // Contains another box!
            { pool: [{ weight: 100, gold: 100 }] },
        ]
    },
    description: 'A hidden cache containing a treasure chest and gold.'
}
```

### Quantity Example (Bulk Items)
```typescript
{
    name: "Archer's Supply Box",
    type: 'box',
    rarity: 'common',
    weight: 2,
    boxContents: {
        drops: [
            { pool: [{ weight: 100, itemName: 'Arrow', quantity: 20 }] },    // 20 arrows
            { pool: [{ weight: 100, itemName: 'Bowstring', quantity: 3 }] }, // 3 bowstrings
        ]
    },
    description: 'A box of archery supplies.'
}
```

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/core/equipment/BoxOpener.ts` | Box opening logic with weighted random selection, nested box handling, gold drops |

### Modified Files
| File | Changes |
|------|---------|
| `src/core/types/Equipment.ts` | Add `'box'` type, `BoxDropPool`, `BoxDrop`, `BoxContents`, `BoxOpenResult` interfaces |
| `src/utils/constants.ts` | Add `boxContents` to Equipment interface |
| `src/core/equipment/EquipmentSpawnHelper.ts` | Handle boxes, add `openBoxForCharacter` |
| `src/core/equipment/EquipmentValidator.ts` | Validate box contents |
| `src/core/generation/EquipmentGenerator.ts` | Handle boxes in inventory generation |
| `src/constants/DefaultEquipment.ts` | Add 27 missing items, convert 15 items to boxes |
| `src/index.ts` | Export new types and BoxOpener |

### Documentation Files
| File | Changes |
|------|---------|
| `docs/EQUIPMENT_SYSTEM.md` | Document box type, interfaces, examples, and behavior |
| `docs/COMBAT_SYSTEM.md` | Document box rewards in treasure drops |

---

## Progress Tracking
- Phase 1: ✅ Complete
- Phase 2: ✅ Complete
- Phase 3: ✅ Complete
- Phase 4: ⬜ Not Started
- Phase 5: ⬜ Not Started
- Phase 6: ⬜ Not Started
- Phase 7: ⬜ Not Started

*Last updated: 2026-02-24*
