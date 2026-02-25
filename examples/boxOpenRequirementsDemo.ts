/**
 * Box Open Requirements Verification Script
 *
 * This script demonstrates and verifies the box opening requirements feature.
 * It tests all the example locked boxes and verifies that:
 * - Boxes can't be opened without required items
 * - Boxes can be opened when requirements are met
 * - Required items are properly tracked as consumed
 * - Multiple requirements work correctly
 *
 * Run with: npx tsx examples/boxOpenRequirementsDemo.ts
 */

import { BoxOpener, ExtensionManager, SeededRNG } from '../src/index.js';
import { ensureEquipmentDefaultsInitialized } from '../src/core/extensions/index.js';
import type { EnhancedEquipment, EnhancedInventoryItem } from '../src/core/types/Equipment.js';

// Helper to create inventory items
function createInventory(items: Array<{ name: string; quantity: number }>): EnhancedInventoryItem[] {
    return items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        equipped: false
    }));
}

// Helper to get equipment by name
function getEquipment(name: string): EnhancedEquipment | undefined {
    const manager = ExtensionManager.getInstance();
    const allEquipment = manager.get('equipment') as EnhancedEquipment[];
    return allEquipment.find(eq => eq.name === name);
}

// Helper to log separator
function logSection(title: string): void {
    console.log('\n' + '='.repeat(60));
    console.log(title);
    console.log('='.repeat(60));
}

// Helper to assert and log
function assert(condition: boolean, passMsg: string, failMsg: string): boolean {
    if (condition) {
        console.log(`  ✓ PASS: ${passMsg}`);
        return true;
    } else {
        console.log(`  ✗ FAIL: ${failMsg}`);
        return false;
    }
}

async function runVerification(): Promise<void> {
    // Initialize equipment defaults
    ensureEquipmentDefaultsInitialized();

    const rng = new SeededRNG('test-requirements');

    let totalTests = 0;
    let passedTests = 0;

    console.log('Box Open Requirements - Manual Verification Script');
    console.log('==================================================');

    // ============================================================
    // Test 1: Locked Chest (Single Item Requirement)
    // ============================================================
    logSection('Test 1: Locked Chest (Single Item Requirement)');

    const lockedChest = getEquipment('Locked Chest');
    totalTests++;
    if (assert(!!lockedChest, 'Locked Chest exists in equipment registry', 'Locked Chest not found!')) {
        passedTests++;
    }

    if (lockedChest) {
        // Test: Can't open without key
        const emptyInventory = createInventory([]);
        const result1 = BoxOpener.openBox(lockedChest, rng, emptyInventory);
        totalTests++;
        if (assert(
            result1.success === false,
            'Box cannot be opened with empty inventory',
            'Box opened without required item!'
        )) {
            passedTests++;
        }

        totalTests++;
        if (assert(
            result1.error?.code === 'MISSING_ITEM',
            `Error code is MISSING_ITEM (got: ${result1.error?.code})`,
            'Wrong error code!'
        )) {
            passedTests++;
        }

        totalTests++;
        if (assert(
            result1.error?.message.includes('Iron Key'),
            `Error message mentions Iron Key: "${result1.error?.message}"`,
            'Error message does not mention Iron Key!'
        )) {
            passedTests++;
        }

        // Test: Can open with key
        const inventoryWithKey = createInventory([{ name: 'Iron Key', quantity: 1 }]);
        const result2 = BoxOpener.openBox(lockedChest, rng, inventoryWithKey);
        totalTests++;
        if (assert(
            result2.success === true,
            'Box opens with Iron Key',
            'Box failed to open with required item!'
        )) {
            passedTests++;
        }

        totalTests++;
        if (assert(
            result2.consumedItems?.length === 1,
            'Consumed items array has 1 entry',
            'Wrong number of consumed items!'
        )) {
            passedTests++;
        }

        totalTests++;
        if (assert(
            result2.consumedItems?.[0]?.name === 'Iron Key',
            'Consumed item is Iron Key',
            'Wrong consumed item!'
        )) {
            passedTests++;
        }

        // Test: Gold is generated
        totalTests++;
        if (assert(
            result2.gold > 0,
            `Box generated ${result2.gold} gold`,
            'Box did not generate gold!'
        )) {
            passedTests++;
        }

        // Test: canOpen method
        totalTests++;
        if (assert(
            BoxOpener.canOpen(lockedChest, emptyInventory) === false,
            'canOpen returns false for empty inventory',
            'canOpen returned true without key!'
        )) {
            passedTests++;
        }

        totalTests++;
        if (assert(
            BoxOpener.canOpen(lockedChest, inventoryWithKey) === true,
            'canOpen returns true with key',
            'canOpen returned false with key!'
        )) {
            passedTests++;
        }

        // Test: getRequirementsDescription
        const reqDesc = BoxOpener.getRequirementsDescription(lockedChest);
        totalTests++;
        if (assert(
            reqDesc === 'Requires: Iron Key',
            `Requirements description: "${reqDesc}"`,
            'Wrong requirements description!'
        )) {
            passedTests++;
        }
    }

    // ============================================================
    // Test 2: Gilded Strongbox (Gold Coin Requirement)
    // ============================================================
    logSection('Test 2: Gilded Strongbox (Gold Coin Requirement - 100)');

    const gildedStrongbox = getEquipment('Gilded Strongbox');
    totalTests++;
    if (assert(!!gildedStrongbox, 'Gilded Strongbox exists', 'Gilded Strongbox not found!')) {
        passedTests++;
    }

    if (gildedStrongbox) {
        // Test: Can't open without enough gold
        const insufficientGold = createInventory([{ name: 'Gold Coin', quantity: 50 }]);
        const result1 = BoxOpener.openBox(gildedStrongbox, rng, insufficientGold);
        totalTests++;
        if (assert(
            result1.success === false,
            'Box fails with insufficient gold',
            'Box opened with insufficient gold!'
        )) {
            passedTests++;
        }

        totalTests++;
        if (assert(
            result1.error?.code === 'INSUFFICIENT_QUANTITY',
            `Error code is INSUFFICIENT_QUANTITY (got: ${result1.error?.code})`,
            'Wrong error code!'
        )) {
            passedTests++;
        }

        // Test: Can open with enough gold
        const sufficientGold = createInventory([{ name: 'Gold Coin', quantity: 150 }]);
        const result2 = BoxOpener.openBox(gildedStrongbox, rng, sufficientGold);
        totalTests++;
        if (assert(
            result2.success === true,
            'Box opens with 150 gold coins',
            'Box failed to open with sufficient gold!'
        )) {
            passedTests++;
        }

        totalTests++;
        if (assert(
            result2.consumedItems?.[0]?.quantity === 100,
            `Consumed 100 gold coins (consumed: ${result2.consumedItems?.[0]?.quantity})`,
            'Wrong quantity consumed!'
        )) {
            passedTests++;
        }

        // Test: Preview shows requirements
        const preview = BoxOpener.previewContents(gildedStrongbox);
        totalTests++;
        if (assert(
            preview.openRequirements?.length === 1,
            'Preview shows 1 requirement',
            'Preview does not show requirements!'
        )) {
            passedTests++;
        }

        totalTests++;
        if (assert(
            preview.openRequirements?.[0]?.quantity === 100,
            `Preview shows quantity 100 (got: ${preview.openRequirements?.[0]?.quantity})`,
            'Preview shows wrong quantity!'
        )) {
            passedTests++;
        }
    }

    // ============================================================
    // Test 3: Royal Treasury Box (Multiple Requirements)
    // ============================================================
    logSection('Test 3: Royal Treasury Box (Multiple Requirements)');

    const royalTreasuryBox = getEquipment('Royal Treasury Box');
    totalTests++;
    if (assert(!!royalTreasuryBox, 'Royal Treasury Box exists', 'Royal Treasury Box not found!')) {
        passedTests++;
    }

    if (royalTreasuryBox) {
        // Test: Can't open with only one requirement
        const onlyKey = createInventory([
            { name: 'Golden Key', quantity: 1 }
        ]);
        const result1 = BoxOpener.openBox(royalTreasuryBox, rng, onlyKey);
        totalTests++;
        if (assert(
            result1.success === false,
            'Box fails with only Golden Key (missing gold)',
            'Box opened with missing requirement!'
        )) {
            passedTests++;
        }

        // Test: Can't open with only gold
        const onlyGold = createInventory([
            { name: 'Gold Coin', quantity: 300 }
        ]);
        const result2 = BoxOpener.openBox(royalTreasuryBox, rng, onlyGold);
        totalTests++;
        if (assert(
            result2.success === false,
            'Box fails with only gold (missing Golden Key)',
            'Box opened with missing requirement!'
        )) {
            passedTests++;
        }

        // Test: Can open with both requirements
        const allRequirements = createInventory([
            { name: 'Golden Key', quantity: 1 },
            { name: 'Gold Coin', quantity: 300 }
        ]);
        const result3 = BoxOpener.openBox(royalTreasuryBox, rng, allRequirements);
        totalTests++;
        if (assert(
            result3.success === true,
            'Box opens with both requirements met',
            'Box failed to open with all requirements!'
        )) {
            passedTests++;
        }

        totalTests++;
        if (assert(
            result3.consumedItems?.length === 2,
            'Two items consumed',
            'Wrong number of consumed items!'
        )) {
            passedTests++;
        }

        // Test: getRequirementsDescription with multiple items
        const reqDesc = BoxOpener.getRequirementsDescription(royalTreasuryBox);
        totalTests++;
        if (assert(
            reqDesc === 'Requires: Golden Key, 200 Gold Coin',
            `Requirements description: "${reqDesc}"`,
            'Wrong requirements description!'
        )) {
            passedTests++;
        }
    }

    // ============================================================
    // Test 4: Thieves' Cache (Quantity Requirement)
    // ============================================================
    logSection("Test 4: Thieves' Cache (Quantity Requirement - 3 Lockpicks)");

    const thievesCache = getEquipment("Thieves' Cache");
    totalTests++;
    if (assert(!!thievesCache, "Thieves' Cache exists", "Thieves' Cache not found!")) {
        passedTests++;
    }

    if (thievesCache) {
        // Test: Can't open with only 2 lockpicks
        const insufficientLockpicks = createInventory([
            { name: 'Lockpick', quantity: 2 }
        ]);
        const result1 = BoxOpener.openBox(thievesCache, rng, insufficientLockpicks);
        totalTests++;
        if (assert(
            result1.success === false,
            "Box fails with only 2 lockpicks (needs 3)",
            'Box opened with insufficient quantity!'
        )) {
            passedTests++;
        }

        // Test: Can open with 3 lockpicks
        const sufficientLockpicks = createInventory([
            { name: 'Lockpick', quantity: 3 }
        ]);
        const result2 = BoxOpener.openBox(thievesCache, rng, sufficientLockpicks);
        totalTests++;
        if (assert(
            result2.success === true,
            'Box opens with 3 lockpicks',
            'Box failed to open with sufficient lockpicks!'
        )) {
            passedTests++;
        }

        totalTests++;
        if (assert(
            result2.consumedItems?.[0]?.quantity === 3,
            'Consumed 3 lockpicks',
            'Wrong quantity consumed!'
        )) {
            passedTests++;
        }

        // Test: canOpen with more than needed
        const extraLockpicks = createInventory([
            { name: 'Lockpick', quantity: 10 }
        ]);
        totalTests++;
        if (assert(
            BoxOpener.canOpen(thievesCache, extraLockpicks),
            'canOpen returns true with 10 lockpicks (excess ok)',
            'canOpen failed with excess items!'
        )) {
            passedTests++;
        }
    }

    // ============================================================
    // Test 5: Standard Box (No Requirements)
    // ============================================================
    logSection('Test 5: Standard Box (No Requirements - Backward Compatible)');

    // Explorer's Pack has no requirements
    const explorersPack = getEquipment("Explorer's Pack");
    totalTests++;
    if (assert(!!explorersPack, "Explorer's Pack exists", "Explorer's Pack not found!")) {
        passedTests++;
    }

    if (explorersPack) {
        // Test: Can open without any inventory
        const emptyInventory = createInventory([]);
        const result1 = BoxOpener.openBox(explorersPack, rng, emptyInventory);
        totalTests++;
        if (assert(
            result1.success === true,
            'Box opens without any inventory (no requirements)',
            'Box failed to open without requirements!'
        )) {
            passedTests++;
        }

        // Test: No consumed items
        totalTests++;
        if (assert(
            result1.consumedItems === undefined,
            'No consumed items (as expected)',
            'Consumed items should be undefined!'
        )) {
            passedTests++;
        }

        // Test: canOpen is always true
        totalTests++;
        if (assert(
            BoxOpener.canOpen(explorersPack, emptyInventory) === true,
            'canOpen returns true for boxes without requirements',
            'canOpen failed for box without requirements!'
        )) {
            passedTests++;
        }

        // Test: getRequirementsDescription returns null
        const reqDesc = BoxOpener.getRequirementsDescription(explorersPack);
        totalTests++;
        if (assert(
            reqDesc === null,
            'getRequirementsDescription returns null (no requirements)',
            'Should return null for box without requirements!'
        )) {
            passedTests++;
        }
    }

    // ============================================================
    // Test 6: Key Items Exist
    // ============================================================
    logSection('Test 6: Key Items Exist in Equipment Registry');

    const keyItems = ['Iron Key', 'Golden Key', 'Skeleton Key', 'Lockpick', 'Gold Coin'];

    for (const keyItem of keyItems) {
        const item = getEquipment(keyItem);
        totalTests++;
        if (assert(
            !!item,
            `${keyItem} exists in registry`,
            `${keyItem} not found!`
        )) {
            passedTests++;
        }
    }

    // ============================================================
    // Summary
    // ============================================================
    logSection('Summary');

    console.log(`\nTotal Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);

    if (passedTests === totalTests) {
        console.log('\n*** ALL TESTS PASSED! ***');
    } else {
        console.log('\n*** SOME TESTS FAILED! ***');
        process.exit(1);
    }
}

// Run the verification
runVerification().catch(err => {
    console.error('Verification failed with error:', err);
    process.exit(1);
});
