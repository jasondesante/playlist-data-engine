/**
 * Quick test script to verify race data initialization works
 */

import { ExtensionManager, initializeRaceDataDefaults, areRaceDataDefaultsInitialized, getRaceData } from './dist/playlist-data-engine.mjs';

console.log('Testing race data initialization...\n');

// Step 1: Check if race data is initialized
console.log('1. Checking if race data defaults are initialized...');
console.log('   areRaceDataDefaultsInitialized():', areRaceDataDefaultsInitialized());

// Step 2: Initialize race data defaults
console.log('\n2. Initializing race data defaults...');
initializeRaceDataDefaults();
console.log('   Done!');

// Step 3: Check again
console.log('\n3. Checking if race data defaults are now initialized...');
console.log('   areRaceDataDefaultsInitialized():', areRaceDataDefaultsInitialized());

// Step 4: Test getting default race data
console.log('\n4. Testing getRaceData() for default races...');

const elfData = getRaceData('Elf');
console.log('\n   Elf data:', JSON.stringify(elfData, null, 2));

const dwarfData = getRaceData('Dwarf');
console.log('\n   Dwarf data:', JSON.stringify(dwarfData, null, 2));

// Step 5: Verify subraces are loaded
console.log('\n5. Verifying subraces are loaded...');
console.log('   Elf subraces:', elfData?.subraces);
console.log('   Dwarf subraces:', dwarfData?.subraces);

// Step 6: Test custom race registration
console.log('\n6. Testing custom race registration...');
const manager = ExtensionManager.getInstance();
manager.register('races.data', [
    {
        race: 'Dragonkin',
        ability_bonuses: { STR: 2, CHA: 1 },
        speed: 30,
        traits: ['Dragon Breath', 'Elemental Resistance'],
        subraces: ['Fire Drake', 'Ice Drake', 'Storm Drake']
    }
]);

const dragonkinData = getRaceData('Dragonkin');
console.log('\n   Dragonkin data:', JSON.stringify(dragonkinData, null, 2));

// Step 7: Test modifying default race data
console.log('\n7. Testing modification of default race data...');
console.log('   Original Elf speed:', elfData?.speed);

// Register modified Elf data (this should merge/override)
manager.register('races.data', [
    {
        race: 'Elf',
        ability_bonuses: { DEX: 3 }, // Changed from 2 to 3
        speed: 35, // Changed from 30 to 35
        traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance', 'Fleet of Foot'], // Added new trait
        subraces: ['High Elf', 'Wood Elf', 'Dark Elf (Drow)', 'Sea Elf'], // Added new subrace
    }
]);

const modifiedElfData = getRaceData('Elf');
console.log('   Modified Elf data:', JSON.stringify(modifiedElfData, null, 2));

console.log('\n✅ All tests completed!');
