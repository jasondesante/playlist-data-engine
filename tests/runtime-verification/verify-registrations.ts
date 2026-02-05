#!/usr/bin/env tsx
/**
 * Runtime Verification Test Script
 *
 * This script verifies that registration via ExtensionManager works correctly
 * with automatic cache invalidation.
 *
 * Usage:
 *   npx tsx tests/runtime-verification/verify-registrations.ts
 *
 * This script will:
 * 1. Register a spell via ExtensionManager (auto-invalidates SpellRegistry cache)
 * 2. Register a skill via ExtensionManager (auto-invalidates SkillRegistry cache)
 * 3. Register a class feature via ExtensionManager (auto-invalidates FeatureRegistry cache)
 * 4. Register a racial trait via ExtensionManager (auto-invalidates FeatureRegistry cache)
 * 5. Verify query methods work after registration
 * 6. Verify automatic cache invalidation works
 * 7. Verify getRegistryStats() counts correctly
 */

import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { SpellRegistry } from '../../src/core/spells/SpellRegistry.js';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry.js';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry.js';

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function logSuccess(message: string): void {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message: string): void {
    console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logInfo(message: string): void {
    console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logSection(message: string): void {
    console.log(`\n${colors.cyan}${'='.repeat(60)}`);
    console.log(`${message}`);
    console.log(`${'='.repeat(60)}${colors.reset}\n`);
}

// Test data
const testSpell = {
    id: 'test_frostbolt',
    name: 'Frostbolt',
    level: 1,
    school: 'Evocation' as const,
    casting_time: '1 action',
    range: '60 feet',
    components: ['V', 'S'] as const,
    duration: 'Instantaneous',
    description: 'A frigid beam of blue-white light streaks toward a creature.',
    source: 'custom' as const
};

const testSkill = {
    id: 'test_arcana_theory',
    name: 'Arcana Theory',
    ability: 'INT' as const,
    description: 'Knowledge of magical theory and arcane principles.',
    categories: ['arcane', 'knowledge'],
    source: 'custom' as const
};

const testClassFeature = {
    id: 'test_wild_surge',
    name: 'Wild Surge',
    class: 'Sorcerer' as const,
    level: 1,
    type: 'passive' as const,
    description: 'Your magic can surge unpredictably.',
    source: 'custom' as const
};

const testRacialTrait = {
    id: 'test_dragon_fury',
    name: 'Dragon Fury',
    race: 'Dragonborn' as const,
    description: 'When enraged, you deal extra damage.',
    source: 'custom' as const
};

async function main(): Promise<void> {
    logSection('Runtime Verification Test');
    logInfo('Verifying registration via ExtensionManager after method removal...\n');

    const manager = ExtensionManager.getInstance();
    const spellRegistry = SpellRegistry.getInstance();
    const skillRegistry = SkillRegistry.getInstance();
    const featureRegistry = FeatureRegistry.getInstance();

    let testsPassed = 0;
    let testsFailed = 0;

    // ========================================
    // Test 1: Spell Registration
    // ========================================
    logSection('Test 1: Spell Registration via ExtensionManager');

    try {
        // Get initial count
        const initialSpellCount = spellRegistry.getSpellCount();
        logInfo(`Initial spell count: ${initialSpellCount}`);

        // Register via ExtensionManager (cache invalidation is automatic)
        manager.register('spells', [testSpell]);
        logInfo('Registered test spell via ExtensionManager');

        // Verify spell is accessible (cache automatically invalidated)
        const retrievedSpell = spellRegistry.getSpell('test_frostbolt');
        if (retrievedSpell && retrievedSpell.name === 'Frostbolt') {
            logSuccess('Spell registration successful');
            testsPassed++;
        } else {
            logError('Failed to retrieve registered spell');
            testsFailed++;
        }

        // Verify count increased
        const newSpellCount = spellRegistry.getSpellCount();
        if (newSpellCount === initialSpellCount + 1) {
            logSuccess(`Spell count correctly increased: ${initialSpellCount} → ${newSpellCount}`);
            testsPassed++;
        } else {
            logError(`Spell count incorrect: expected ${initialSpellCount + 1}, got ${newSpellCount}`);
            testsFailed++;
        }

        // Verify stats
        const spellStats = spellRegistry.getRegistryStats();
        if (spellStats.customSpells >= 1) {
            logSuccess(`getRegistryStats() reports ${spellStats.customSpells} custom spell(s)`);
            testsPassed++;
        } else {
            logError('getRegistryStats() does not report custom spell');
            testsFailed++;
        }

        // Verify query by level
        const level1Spells = spellRegistry.getSpellsByLevel(1);
        const hasTestSpell = level1Spells.some(s => s.id === 'test_frostbolt');
        if (hasTestSpell) {
            logSuccess('getSpellsByLevel(1) includes test spell');
            testsPassed++;
        } else {
            logError('getSpellsByLevel(1) does not include test spell');
            testsFailed++;
        }

    } catch (error) {
        logError(`Spell registration test failed: ${error}`);
        testsFailed++;
    }

    // ========================================
    // Test 2: Skill Registration
    // ========================================
    logSection('Test 2: Skill Registration via ExtensionManager');

    try {
        // Get initial count
        const initialSkillCount = skillRegistry.getSkillCount();
        logInfo(`Initial skill count: ${initialSkillCount}`);

        // Register via ExtensionManager (cache invalidation is automatic)
        manager.register('skills', [testSkill]);
        logInfo('Registered test skill via ExtensionManager');

        // Verify skill is accessible (cache automatically invalidated)
        const retrievedSkill = skillRegistry.getSkill('test_arcana_theory');
        if (retrievedSkill && retrievedSkill.name === 'Arcana Theory') {
            logSuccess('Skill registration successful');
            testsPassed++;
        } else {
            logError('Failed to retrieve registered skill');
            testsFailed++;
        }

        // Verify count increased
        const newSkillCount = skillRegistry.getSkillCount();
        if (newSkillCount === initialSkillCount + 1) {
            logSuccess(`Skill count correctly increased: ${initialSkillCount} → ${newSkillCount}`);
            testsPassed++;
        } else {
            logError(`Skill count incorrect: expected ${initialSkillCount + 1}, got ${newSkillCount}`);
            testsFailed++;
        }

        // Verify stats
        const skillStats = skillRegistry.getRegistryStats();
        if (skillStats.customSkills >= 1) {
            logSuccess(`getRegistryStats() reports ${skillStats.customSkills} custom skill(s)`);
            testsPassed++;
        } else {
            logError('getRegistryStats() does not report custom skill');
            testsFailed++;
        }

        // Verify query by ability
        const intSkills = skillRegistry.getSkillsByAbility('INT');
        const hasTestSkill = intSkills.some(s => s.id === 'test_arcana_theory');
        if (hasTestSkill) {
            logSuccess('getSkillsByAbility(INT) includes test skill');
            testsPassed++;
        } else {
            logError('getSkillsByAbility(INT) does not include test skill');
            testsFailed++;
        }

    } catch (error) {
        logError(`Skill registration test failed: ${error}`);
        testsFailed++;
    }

    // ========================================
    // Test 3: Class Feature Registration
    // ========================================
    logSection('Test 3: Class Feature Registration via ExtensionManager');

    try {
        // Get initial stats
        const initialFeatureStats = featureRegistry.getRegistryStats();
        logInfo(`Initial class feature count: ${initialFeatureStats.totalClassFeatures}`);

        // Register via ExtensionManager (cache invalidation is automatic)
        manager.register('classFeatures', [testClassFeature]);
        logInfo('Registered test class feature via ExtensionManager');

        // Verify feature is accessible (cache automatically invalidated)
        const retrievedFeature = featureRegistry.getClassFeatureById('test_wild_surge');
        if (retrievedFeature && retrievedFeature.name === 'Wild Surge') {
            logSuccess('Class feature registration successful');
            testsPassed++;
        } else {
            logError('Failed to retrieve registered class feature');
            testsFailed++;
        }

        // Verify count increased
        const newFeatureStats = featureRegistry.getRegistryStats();
        if (newFeatureStats.totalClassFeatures === initialFeatureStats.totalClassFeatures + 1) {
            logSuccess(`Feature count correctly increased: ${initialFeatureStats.totalClassFeatures} → ${newFeatureStats.totalClassFeatures}`);
            testsPassed++;
        } else {
            logError(`Feature count incorrect: expected ${initialFeatureStats.totalClassFeatures + 1}, got ${newFeatureStats.totalClassFeatures}`);
            testsFailed++;
        }

        // Verify query by class and level
        const sorcererLevel1Features = featureRegistry.getClassFeatures('Sorcerer', 1);
        const hasTestFeature = sorcererLevel1Features.some(f => f.id === 'test_wild_surge');
        if (hasTestFeature) {
            logSuccess('getClassFeatures(Sorcerer, 1) includes test feature');
            testsPassed++;
        } else {
            logError('getClassFeatures(Sorcerer, 1) does not include test feature');
            testsFailed++;
        }

    } catch (error) {
        logError(`Class feature registration test failed: ${error}`);
        testsFailed++;
    }

    // ========================================
    // Test 4: Racial Trait Registration
    // ========================================
    logSection('Test 4: Racial Trait Registration via ExtensionManager');

    try {
        // Get initial stats
        const initialTraitStats = featureRegistry.getRegistryStats();
        logInfo(`Initial racial trait count: ${initialTraitStats.totalRacialTraits}`);

        // Register via ExtensionManager (cache invalidation is automatic)
        manager.register('racialTraits', [testRacialTrait]);
        logInfo('Registered test racial trait via ExtensionManager');

        // Verify trait is accessible (cache automatically invalidated)
        const retrievedTrait = featureRegistry.getRacialTraitById('test_dragon_fury');
        if (retrievedTrait && retrievedTrait.name === 'Dragon Fury') {
            logSuccess('Racial trait registration successful');
            testsPassed++;
        } else {
            logError('Failed to retrieve registered racial trait');
            testsFailed++;
        }

        // Verify count increased
        const newTraitStats = featureRegistry.getRegistryStats();
        if (newTraitStats.totalRacialTraits === initialTraitStats.totalRacialTraits + 1) {
            logSuccess(`Trait count correctly increased: ${initialTraitStats.totalRacialTraits} → ${newTraitStats.totalRacialTraits}`);
            testsPassed++;
        } else {
            logError(`Trait count incorrect: expected ${initialTraitStats.totalRacialTraits + 1}, got ${newTraitStats.totalRacialTraits}`);
            testsFailed++;
        }

        // Verify query by race
        const dragonbornTraits = featureRegistry.getRacialTraits('Dragonborn');
        const hasTestTrait = dragonbornTraits.some(t => t.id === 'test_dragon_fury');
        if (hasTestTrait) {
            logSuccess('getRacialTraits(Dragonborn) includes test trait');
            testsPassed++;
        } else {
            logError('getRacialTraits(Dragonborn) does not include test trait');
            testsFailed++;
        }

    } catch (error) {
        logError(`Racial trait registration test failed: ${error}`);
        testsFailed++;
    }

    // ========================================
    // Test 5: Automatic Cache Invalidation Verification
    // ========================================
    logSection('Test 5: Automatic Cache Invalidation Behavior');

    try {
        // Verify that the first skill is already in cache (from Test 2)
        const beforeRegistration = skillRegistry.getAllSkills();
        const hasFirstSkill = beforeRegistration.some(s => s.id === 'test_arcana_theory');

        if (hasFirstSkill) {
            logSuccess('Cache contains custom skill from Test 2 (auto-invalidated during registration)');
            testsPassed++;
        } else {
            logError('Cache should contain custom skill from Test 2');
            testsFailed++;
        }

        // Register another skill - cache invalidation is automatic
        const testSkill2 = {
            id: 'test_nature_lore',
            name: 'Nature Lore',
            ability: 'WIS' as const,
            description: 'Knowledge of plants, animals, and natural phenomena.',
            categories: ['nature', 'knowledge'],
            source: 'custom' as const
        };

        manager.register('skills', [testSkill2]);
        logInfo('Registered second skill via ExtensionManager');

        // Check if cache is automatically refreshed (should contain new skill immediately)
        const afterRegistration = skillRegistry.getAllSkills();
        const hasNewSkillAfterRegistration = afterRegistration.some(s => s.id === 'test_nature_lore');

        if (hasNewSkillAfterRegistration) {
            logSuccess('Cache is automatically refreshed after register() (automatic invalidation works)');
            testsPassed++;
        } else {
            logError('Cache should be automatically refreshed after register()');
            testsFailed++;
        }

        // Verify both skills are present
        const hasBothSkills = afterRegistration.some(s => s.id === 'test_arcana_theory') &&
                              afterRegistration.some(s => s.id === 'test_nature_lore');

        if (hasBothSkills) {
            logSuccess('Both custom skills are accessible via getAllSkills()');
            testsPassed++;
        } else {
            logError('Both custom skills should be accessible');
            testsFailed++;
        }

        // Verify manual invalidateCache() is still safe (idempotent)
        skillRegistry.invalidateCache();
        logInfo('Called manual invalidateCache() to verify idempotent behavior');

        const afterManualInvalidation = skillRegistry.getAllSkills();
        const stillHasBothSkills = afterManualInvalidation.some(s => s.id === 'test_arcana_theory') &&
                                   afterManualInvalidation.some(s => s.id === 'test_nature_lore');

        if (stillHasBothSkills) {
            logSuccess('Manual invalidateCache() is safe and idempotent');
            testsPassed++;
        } else {
            logError('Manual invalidateCache() should be safe (idempotent)');
            testsFailed++;
        }

    } catch (error) {
        logError(`Automatic cache invalidation test failed: ${error}`);
        testsFailed++;
    }

    // ========================================
    // Test 6: Verify Validation Works
    // ========================================
    logSection('Test 6: Validation Behavior');

    try {
        // Try to register invalid spell (missing required fields)
        const invalidSpell = {
            id: 'invalid_spell',
            name: 'Invalid Spell'
            // Missing required fields: level, school, casting_time, etc.
        };

        let validationError = false;
        try {
            manager.register('spells', [invalidSpell]);
        } catch (error) {
            validationError = true;
            logInfo(`Validation correctly rejected invalid spell: ${(error as Error).message.substring(0, 50)}...`);
        }

        if (validationError) {
            logSuccess('Validation correctly rejects invalid spell data');
            testsPassed++;
        } else {
            logError('Validation should have rejected invalid spell data');
            testsFailed++;
        }

        // Try to register invalid skill (missing required fields)
        const invalidSkill = {
            name: 'Invalid Skill'
            // Missing required fields: id, ability
        };

        validationError = false;
        try {
            manager.register('skills', [invalidSkill]);
        } catch (error) {
            validationError = true;
            logInfo(`Validation correctly rejected invalid skill: ${(error as Error).message.substring(0, 50)}...`);
        }

        if (validationError) {
            logSuccess('Validation correctly rejects invalid skill data');
            testsPassed++;
        } else {
            logError('Validation should have rejected invalid skill data');
            testsFailed++;
        }

    } catch (error) {
        logError(`Validation test failed: ${error}`);
        testsFailed++;
    }

    // ========================================
    // Summary
    // ========================================
    logSection('Test Summary');
    const totalTests = testsPassed + testsFailed;
    const passRate = ((testsPassed / totalTests) * 100).toFixed(1);

    console.log(`Total Tests: ${totalTests}`);
    console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
    console.log(`Pass Rate: ${passRate}%`);

    if (testsFailed === 0) {
        console.log(`\n${colors.green}${'='.repeat(60)}`);
        console.log('ALL TESTS PASSED!');
        console.log(`${'='.repeat(60)}${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`\n${colors.red}${'='.repeat(60)}`);
        console.log('SOME TESTS FAILED');
        console.log(`${'='.repeat(60)}${colors.reset}\n`);
        process.exit(1);
    }
}

main().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
});
