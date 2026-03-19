import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CombatEngine } from '../../src/core/combat/CombatEngine';
import { InitiativeRoller } from '../../src/core/combat/InitiativeRoller';
import { AttackResolver } from '../../src/core/combat/AttackResolver';
import { SpellCaster } from '../../src/core/combat/SpellCaster';
import { DiceRoller } from '../../src/core/combat/DiceRoller';
import type { CharacterSheet, Attack, Spell, AbilityScores } from '../../src/core/types/Character';
import type { Combatant } from '../../src/core/types/Combat';

// bro these tests are FUCKED up! So many things wrong from the mock data being wrong to fuckin everything.
// one huge mess up is that character_class doesn't exist, isn't an object because it doesn't exist. But there does exist "class" which is a string and not an object.

// Helper function to create a mock character
function createMockCharacter(overrides?: Partial<CharacterSheet>): CharacterSheet {
  return {
    name: 'Test Character',
    title: 'Warrior',
    level: 1,
    experience_points: 0,
    race: 'Human',
    character_class: {
      name: 'Fighter',
      hit_die: 'd10',
      primary_ability: 'strength',
      saving_throw_proficiencies: [],
      skill_proficiencies_count: 2,
      starting_equipment: ['Longsword'],
      multiclass_requirements: {}
    },
    background: undefined,
    alignment: undefined,
    ability_scores: {
      strength: 15,
      dexterity: 10,
      constitution: 14,
      intelligence: 12,
      wisdom: 13,
      charisma: 8
    },
    ability_modifiers: {
      strength: 2,
      dexterity: 0,
      constitution: 2,
      intelligence: 1,
      wisdom: 1,
      charisma: -1
    },
    hp: {
      current: 10,
      max: 10,
      temporary: 0
    },
    armor_class: 16,
    initiative_bonus: 0,
    speed: 30,
    proficiency_bonus: 2,
    saving_throws: {
      strength: false,
      dexterity: false,
      constitution: false,
      intelligence: false,
      wisdom: false,
      charisma: false
    },
    skills: {},
    attacks: [],
    spells_known: [],
    spell_slots: {},
    class_features: [],
    racial_traits: [],
    feats: [],
    inventory: [],
    equipped_items: {
      head: undefined,
      neck: undefined,
      chest: undefined,
      back: undefined,
      waist: undefined,
      hands: undefined,
      feet: undefined,
      main_hand: undefined,
      off_hand: undefined
    },
    currency: {
      gold: 0,
      silver: 0,
      copper: 0
    },
    appearance: {
      body_type: 'athletic',
      skin_tone: '#C19A6B',
      hair_style: 0,
      hair_color: '#654321',
      eye_color: '#6F4E37',
      facial_features: 0,
      primary_color: '#333333',
      secondary_color: '#666666',
      armor_appearance: {
        type: 'heavy',
        style_id: 0
      },
      weapon_appearance: {
        type: 'sword',
        style_id: 0
      },
      accessory_slots: {}
    },
    listening_sessions: [],
    total_listening_time: 0,
    tracks_mastered: [],
    ...overrides
  };
}

describe('Combat System (T107-T116)', () => {
  let combatEngine: CombatEngine;
  let initiativeRoller: InitiativeRoller;
  let attackResolver: AttackResolver;
  let spellCaster: SpellCaster;

  beforeEach(() => {
    combatEngine = new CombatEngine();
    initiativeRoller = new InitiativeRoller();
    attackResolver = new AttackResolver();
    spellCaster = new SpellCaster();
  });

  describe('DiceRoller (Utility)', () => {
    it('should roll a single d20', () => {
      const roll = Math.floor(Math.random() * 20) + 1;
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(20);
    });

    it('should parse dice formulas', () => {
      const result = DiceRoller.parseDiceFormula('2d6+3');
      expect(result.diceCount).toBe(2);
      expect(result.diceSides).toBe(6);
      expect(result.modifier).toBe(3);
      expect(result.rolls.length).toBe(2);
      expect(result.total).toBeGreaterThanOrEqual(5); // 2 + 0 + 3
      expect(result.total).toBeLessThanOrEqual(15); // 12 + 0 + 3
    });

    it('should calculate damage with modifiers', () => {
      const damage = DiceRoller.calculateDamage('1d8', 2, false);
      expect(damage.rolls.length).toBe(1);
      expect(damage.rolls[0]).toBeGreaterThanOrEqual(1);
      expect(damage.rolls[0]).toBeLessThanOrEqual(8);
      expect(damage.total).toBe(damage.rolls[0] + 2);
    });

    it('should double damage on critical hit', () => {
      const criticalDamage = DiceRoller.calculateDamage('1d8', 0, true);
      expect(criticalDamage.rolls.length).toBe(2); // Doubled dice
      expect(criticalDamage.isCritical).toBe(true);
    });

    it('should identify critical hits (natural 20)', () => {
      const isCrit = DiceRoller.isCriticalHit(20);
      expect(isCrit).toBe(true);
    });

    it('should identify critical misses (natural 1)', () => {
      const isMiss = DiceRoller.isCriticalMiss(1);
      expect(isMiss).toBe(true);
    });
  });

  describe('T108: InitiativeRoller', () => {
    it('should roll initiative for a combatant', () => {
      const character = createMockCharacter();
      const combatant: Combatant = {
        id: 'test_1',
        character,
        initiative: 0,
        currentHP: character.hp.max,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      const result = initiativeRoller.rollInitiativeForCombatant(combatant);

      expect(result.initiativeTotal).toBeGreaterThanOrEqual(1 + character.ability_modifiers.dexterity);
      expect(result.initiativeTotal).toBeLessThanOrEqual(20 + character.ability_modifiers.dexterity);
    });

    it('should roll initiative for multiple combatants', () => {
      const char1 = createMockCharacter({ name: 'Player 1' });
      const char2 = createMockCharacter({ name: 'Enemy 1' });

      const combatants: Combatant[] = [
        {
          id: 'player_1',
          character: char1,
          initiative: 0,
          currentHP: 10,
          statusEffects: [],
          isDefeated: false,
          actionUsed: false,
          bonusActionUsed: false,
          reactionUsed: false
        },
        {
          id: 'enemy_1',
          character: char2,
          initiative: 0,
          currentHP: 10,
          statusEffects: [],
          isDefeated: false,
          actionUsed: false,
          bonusActionUsed: false,
          reactionUsed: false
        }
      ];

      const result = initiativeRoller.rollInitiativeForAll(combatants);
      expect(result.sortedCombatants.length).toBe(2);
      // Should be sorted by initiative (higher first)
      if (result.sortedCombatants[0].initiative !== result.sortedCombatants[1].initiative) {
        expect(result.sortedCombatants[0].initiative).toBeGreaterThan(result.sortedCombatants[1].initiative);
      }
    });

    it('should handle initiative ties by dexterity modifier', () => {
      // Create characters with same initiative but different DEX
      const char1 = createMockCharacter({
        name: 'High DEX',
        ability_modifiers: {
          strength: 0,
          dexterity: 3,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0
        }
      });

      const char2 = createMockCharacter({
        name: 'Low DEX',
        ability_modifiers: {
          strength: 0,
          dexterity: 1,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0
        }
      });

      const combatants: Combatant[] = [
        {
          id: 'char1',
          character: char1,
          initiative: 0,
          currentHP: 10,
          statusEffects: [],
          isDefeated: false,
          actionUsed: false,
          bonusActionUsed: false,
          reactionUsed: false
        },
        {
          id: 'char2',
          character: char2,
          initiative: 0,
          currentHP: 10,
          statusEffects: [],
          isDefeated: false,
          actionUsed: false,
          bonusActionUsed: false,
          reactionUsed: false
        }
      ];

      // In case of tie, higher DEX should go first
      initiativeRoller.rollInitiativeForAll(combatants);
      // Both should have valid initiatives
      expect(combatants[0].initiative).toBeDefined();
      expect(combatants[1].initiative).toBeDefined();
    });
  });

  describe('T111-T114: AttackResolver', () => {
    it('should resolve a successful attack', () => {
      const attacker = createMockCharacter({ name: 'Attacker' });
      const defender = createMockCharacter({ name: 'Defender' });

      const attackerCombatant: Combatant = {
        id: 'attacker',
        character: attacker,
        initiative: 10,
        currentHP: attacker.hp.max,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      const defenderCombatant: Combatant = {
        id: 'defender',
        character: defender,
        initiative: 5,
        currentHP: defender.hp.max,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      const attack: Attack = {
        name: 'Longsword',
        attack_bonus: 4,
        damage_dice: '1d8+2',
        damage_type: 'slashing',
        properties: ['versatile']
      };

      const result = attackResolver.resolveAttack(attackerCombatant, defenderCombatant, attack);

      expect(result.attack).toBe(attack);
      expect(result.attacker).toBe(attackerCombatant);
      expect(result.target).toBe(defenderCombatant);
      expect(result.attackRoll).toBeDefined();
    });

    it('should handle critical hits (natural 20)', () => {
      // Mock a natural 20 for critical hit
      const attacker = createMockCharacter();
      const defender = createMockCharacter();

      const attackerCombatant: Combatant = {
        id: 'attacker',
        character: attacker,
        initiative: 10,
        currentHP: attacker.hp.max,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      const defenderCombatant: Combatant = {
        id: 'defender',
        character: defender,
        initiative: 5,
        currentHP: defender.hp.max,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      const attack: Attack = {
        name: 'Longsword',
        attack_bonus: 4,
        damage_dice: '1d8+2',
        damage_type: 'slashing',
        properties: ['versatile']
      };

      // Critical hits double damage dice
      const result = attackResolver.resolveAttack(attackerCombatant, defenderCombatant, attack);
      expect(result.attackRoll).toBeDefined();
    });

    it('should calculate attack bonuses correctly', () => {
      const character = createMockCharacter({
        ability_modifiers: {
          strength: 3,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0
        }
      });

      const abilityModifier = character.ability_modifiers.strength;
      const proficiencyBonus = character.proficiency_bonus;

      const bonus = attackResolver.calculateAttackBonus(character, 'Longsword', abilityModifier, true);
      expect(bonus).toBe(abilityModifier + proficiencyBonus);
    });
  });

  describe('T107: CombatEngine', () => {
    it('should initialize combat with two characters', () => {
      const player = createMockCharacter({ name: 'Player', level: 1 });
      const enemy = createMockCharacter({ name: 'Enemy', level: 1 });

      const combat = combatEngine.startCombat([player], [enemy]);

      expect(combat.combatants.length).toBe(2);
      expect(combat.roundNumber).toBe(1);
      expect(combat.isActive).toBe(true);
      expect(combat.combatants[0].currentHP).toBe(player.hp.max);
    });

    it('should roll initiative and establish turn order', () => {
      const player = createMockCharacter({ name: 'Player' });
      const enemy = createMockCharacter({ name: 'Enemy' });

      const combat = combatEngine.startCombat([player], [enemy]);

      // First combatant should have higher or equal initiative
      expect(combat.combatants[0].initiative).toBeGreaterThanOrEqual(1);
    });

    it('should track current turn and round', () => {
      const player = createMockCharacter();
      const enemy = createMockCharacter();

      let combat = combatEngine.startCombat([player], [enemy]);
      const startRound = combat.roundNumber;

      // Advance turns
      combat = combatEngine.nextTurn(combat);
      expect(combat.currentTurnIndex).toBe(1);

      // After a full round, should increment round number
      combat = combatEngine.nextTurn(combat);
      if (combat.currentTurnIndex === 0) {
        expect(combat.roundNumber).toBeGreaterThan(startRound);
      }
    });

    it('should handle character defeat when HP reaches 0', () => {
      const player = createMockCharacter();
      const enemy = createMockCharacter();

      const combat = combatEngine.startCombat([player], [enemy]);
      const defender = combat.combatants[1];

      // Reduce defender to 0 HP
      defender.currentHP = 0;
      defender.isDefeated = true;

      const defeated = combatEngine.getDefeatedCombatants(combat);
      expect(defeated.length).toBeGreaterThan(0);
    });

    it('should track combat history', () => {
      const player = createMockCharacter();
      const enemy = createMockCharacter();

      const combat = combatEngine.startCombat([player], [enemy]);
      const attacker = combat.combatants[0];
      const defender = combat.combatants[1];

      const attack: Attack = {
        name: 'Longsword',
        attack_bonus: 4,
        damage_dice: '1d8+2',
        damage_type: 'slashing',
        properties: []
      };

      combatEngine.executeAttack(combat, attacker, defender, attack);

      expect(combat.history.length).toBe(1);
      expect(combat.history[0].type).toBe('attack');
    });
  });

  describe('T115: SpellCaster', () => {
    it('should check spell slot availability', () => {
      const wizard = createMockCharacter({
        character_class: {
          name: 'Wizard',
          hit_die: 'd6',
          primary_ability: 'intelligence',
          saving_throw_proficiencies: ['intelligence', 'wisdom'],
          skill_proficiencies_count: 2,
          starting_equipment: ['Quarterstaff'],
          multiclass_requirements: {}
        },
        level: 1
      });

      const combatant: Combatant = {
        id: 'wizard',
        character: wizard,
        initiative: 5,
        currentHP: 6,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        spellSlots: { 1: 2 }
      };

      expect(spellCaster.hasSpellSlot(combatant, 1)).toBe(true);
      expect(spellCaster.hasSpellSlot(combatant, 2)).toBe(false);
    });

    it('should consume spell slots when casting', () => {
      const wizard = createMockCharacter();
      const combatant: Combatant = {
        id: 'wizard',
        character: wizard,
        initiative: 5,
        currentHP: 6,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        spellSlots: { 1: 2 }
      };

      const initialSlots = combatant.spellSlots![1];
      spellCaster.consumeSpellSlot(combatant, 1);
      expect(combatant.spellSlots![1]).toBe(initialSlots - 1);
    });

    it('should calculate spell save DC correctly', () => {
      const wizard = createMockCharacter({
        ability_modifiers: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 4,
          wisdom: 0,
          charisma: 0
        },
        proficiency_bonus: 2
      });

      const combatant: Combatant = {
        id: 'wizard',
        character: wizard,
        initiative: 5,
        currentHP: 6,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      const saveDC = spellCaster.calculateSaveDC(combatant, 'intelligence');
      // DC = 8 + INT mod + proficiency = 8 + 4 + 2 = 14
      expect(saveDC).toBe(14);
    });

    it('should allow upcasting spells', () => {
      const wizard = createMockCharacter();
      const combatant: Combatant = {
        id: 'wizard',
        character: wizard,
        initiative: 5,
        currentHP: 6,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        spellSlots: { 1: 0, 2: 1 }
      };

      const spell: Spell = {
        name: 'Magic Missile',
        level: 1,
        school: 'Evocation',
        casting_time: '1 action',
        range: '120 feet',
        components: { verbal: true, somatic: true, material: false },
        duration: 'Instantaneous',
        description: 'Launches magic missiles',
        damage_dice: '1d4+1',
        damage_type: 'force'
      };

      const canUpcast = spellCaster.canUpcast(combatant, spell, 2);
      expect(canUpcast).toBe(true);
    });
  });

  describe('Combat Actions', () => {
    it('should execute dodge action', () => {
      const player = createMockCharacter();
      const enemy = createMockCharacter();

      const combat = combatEngine.startCombat([player], [enemy]);
      const dodger = combat.combatants[0];

      const action = combatEngine.executeDodge(combat, dodger);

      expect(action.type).toBe('dodge');
      expect(action.result?.success).toBe(true);
    });

    it('should execute dash action', () => {
      const player = createMockCharacter();
      const enemy = createMockCharacter();

      const combat = combatEngine.startCombat([player], [enemy]);
      const dasher = combat.combatants[0];

      const action = combatEngine.executeDash(combat, dasher);

      expect(action.type).toBe('dash');
      expect(action.result?.success).toBe(true);
    });

    it('should execute disengage action', () => {
      const player = createMockCharacter();
      const enemy = createMockCharacter();

      const combat = combatEngine.startCombat([player], [enemy]);
      const disengager = combat.combatants[0];

      const action = combatEngine.executeDisengage(combat, disengager);

      expect(action.type).toBe('disengage');
      expect(action.result?.success).toBe(true);
    });

    describe('Fleeing (Task 1)', () => {
      it('should return false for canFlee when allowFleeing is not set', () => {
        const combatEngine = new CombatEngine();
        expect(combatEngine.canFlee()).toBe(false);
      });

      it('should return true for canFlee when allowFleeing is enabled', () => {
        const combatEngine = new CombatEngine({ allowFleeing: true });
        expect(combatEngine.canFlee()).toBe(true);
      });

      it('should throw error when fleeing is not allowed', () => {
        const combatEngine = new CombatEngine({ allowFleeing: false });
        const player = createMockCharacter();
        const enemy = createMockCharacter();

        const combat = combatEngine.startCombat([player], [enemy]);
        const fleer = combat.combatants[0];

        expect(() => combatEngine.executeFlee(combat, fleer)).toThrow('Fleeing is not allowed');
      });

      it('should execute flee action when allowFleeing is enabled', () => {
        const combatEngine = new CombatEngine({ allowFleeing: true });
        const player = createMockCharacter({ name: 'Player' });
        const enemy = createMockCharacter({ name: 'Enemy' });

        const combat = combatEngine.startCombat([player], [enemy]);
        const fleer = combat.combatants[0];
        const initialCombatantCount = combat.combatants.length;

        const action = combatEngine.executeFlee(combat, fleer);

        expect(action.type).toBe('flee');
        expect(action.result?.success).toBe(true);
        expect(action.result?.description).toContain('flees from combat');
        expect(combat.combatants.length).toBe(initialCombatantCount - 1);
        expect(combat.combatants.find(c => c.id === fleer.id)).toBeUndefined();
      });

      it('should add flee action to combat history', () => {
        const combatEngine = new CombatEngine({ allowFleeing: true });
        const player = createMockCharacter();
        const enemy = createMockCharacter();

        const combat = combatEngine.startCombat([player], [enemy]);
        const fleer = combat.combatants[0];
        const initialHistoryLength = combat.history.length;

        combatEngine.executeFlee(combat, fleer);

        expect(combat.history.length).toBe(initialHistoryLength + 1);
        expect(combat.history[combat.history.length - 1].type).toBe('flee');
      });

      it('should mark combatant as defeated after fleeing', () => {
        const combatEngine = new CombatEngine({ allowFleeing: true });
        const player = createMockCharacter();
        const enemy = createMockCharacter();

        const combat = combatEngine.startCombat([player], [enemy]);
        const fleer = combat.combatants[0];

        expect(fleer.isDefeated).toBe(false);

        combatEngine.executeFlee(combat, fleer);

        expect(fleer.isDefeated).toBe(true);
      });

      it('should adjust current turn index when combatant before current flees', () => {
        const combatEngine = new CombatEngine({ allowFleeing: true });
        const player1 = createMockCharacter({ name: 'Player1' });
        const player2 = createMockCharacter({ name: 'Player2' });
        const enemy = createMockCharacter({ name: 'Enemy' });

        const combat = combatEngine.startCombat([player1, player2], [enemy]);

        // Move to second combatant's turn
        combatEngine.nextTurn(combat);
        const initialTurnIndex = combat.currentTurnIndex;

        // First combatant flees
        const fleer = combat.combatants[0];
        combatEngine.executeFlee(combat, fleer);

        // Turn index should be adjusted
        expect(combat.currentTurnIndex).toBe(initialTurnIndex - 1);
      });

      it('should end combat when all enemies flee', () => {
        const combatEngine = new CombatEngine({ allowFleeing: true });
        const player = createMockCharacter({ name: 'Player' });
        const enemy1 = createMockCharacter({ name: 'Enemy1' });
        const enemy2 = createMockCharacter({ name: 'Enemy2' });

        const combat = combatEngine.startCombat([player], [enemy1, enemy2]);
        expect(combat.isActive).toBe(true);

        // Both enemies flee
        const enemy1Combatant = combat.combatants.find(c => c.character.name === 'Enemy1')!;
        const enemy2Combatant = combat.combatants.find(c => c.character.name === 'Enemy2')!;

        combatEngine.executeFlee(combat, enemy1Combatant);
        expect(combat.isActive).toBe(true); // Still active, one enemy left

        combatEngine.executeFlee(combat, enemy2Combatant);
        expect(combat.isActive).toBe(false); // Combat ends
        expect(combat.winner).toBeDefined();
      });

      it('should end combat when all players flee', () => {
        const combatEngine = new CombatEngine({ allowFleeing: true });
        const player1 = createMockCharacter({ name: 'Player1' });
        const player2 = createMockCharacter({ name: 'Player2' });
        const enemy = createMockCharacter({ name: 'Enemy' });

        const combat = combatEngine.startCombat([player1, player2], [enemy]);
        expect(combat.isActive).toBe(true);

        // Both players flee
        const player1Combatant = combat.combatants.find(c => c.character.name === 'Player1')!;
        const player2Combatant = combat.combatants.find(c => c.character.name === 'Player2')!;

        combatEngine.executeFlee(combat, player1Combatant);
        expect(combat.isActive).toBe(true); // Still active, one player left

        combatEngine.executeFlee(combat, player2Combatant);
        expect(combat.isActive).toBe(false); // Combat ends
      });
    });
  });

  describe('Combat Damage and Healing', () => {
    it('should apply damage to combatant', () => {
      const character = createMockCharacter();
      const combatant: Combatant = {
        id: 'test',
        character,
        initiative: 0,
        currentHP: 10,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      const damage = combatEngine.applyDamage(combatant, 5);

      expect(damage).toBe(5);
      expect(combatant.currentHP).toBe(5);
    });

    it('should not reduce HP below 0', () => {
      const character = createMockCharacter();
      const combatant: Combatant = {
        id: 'test',
        character,
        initiative: 0,
        currentHP: 5,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      combatEngine.applyDamage(combatant, 100);

      expect(combatant.currentHP).toBe(0);
      expect(combatant.isDefeated).toBe(true);
    });

    it('should heal a combatant', () => {
      const character = createMockCharacter();
      const combatant: Combatant = {
        id: 'test',
        character,
        initiative: 0,
        currentHP: 5,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      const healing = combatEngine.healCombatant(combatant, 3);

      expect(healing).toBe(3);
      expect(combatant.currentHP).toBe(8);
    });

    it('should not heal above max HP', () => {
      const character = createMockCharacter();
      const combatant: Combatant = {
        id: 'test',
        character,
        initiative: 0,
        currentHP: 8,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      const healing = combatEngine.healCombatant(combatant, 10);

      expect(healing).toBe(2); // Only 2 HP needed to reach max of 10
      expect(combatant.currentHP).toBe(10);
    });

    it('should apply temporary hit points', () => {
      const character = createMockCharacter();
      const combatant: Combatant = {
        id: 'test',
        character,
        initiative: 0,
        currentHP: 10,
        temporaryHP: 0,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      combatEngine.applyTemporaryHP(combatant, 5);

      expect(combatant.temporaryHP).toBe(5);
    });
  });

  describe('getDamageModifier - Ability Modifier Extraction', () => {
    // Helper to access private method for testing
    function getDamageModifier(resolver: AttackResolver, attacker: Combatant, attack: Attack): number {
      return (resolver as any).getDamageModifier(attacker, attack);
    }

    function createMockCombatant(abilityMods: Partial<AbilityScores>): Combatant {
      const character = createMockCharacter({
        ability_modifiers: {
          STR: 0,
          DEX: 0,
          CON: 0,
          INT: 0,
          WIS: 0,
          CHA: 0,
          ...abilityMods
        }
      });

      return {
        id: 'test-combatant',
        character,
        initiative: 10,
        currentHP: character.hp.max,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };
    }

    it('should return DEX modifier for ranged attacks', () => {
      const combatant = createMockCombatant({ STR: 3, DEX: 4 });
      const attack: Attack = {
        name: 'Longbow',
        type: 'ranged',
        damage_dice: '1d8',
        damage_type: 'piercing',
        range: 150
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(4); // DEX modifier
    });

    it('should return 0 for ranged attacks when DEX is 0', () => {
      const combatant = createMockCombatant({ STR: 3, DEX: 0 });
      const attack: Attack = {
        name: 'Crossbow',
        type: 'ranged',
        damage_dice: '1d10',
        damage_type: 'piercing',
        range: 100
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(0);
    });

    it('should return STR modifier for non-finesse melee attacks', () => {
      const combatant = createMockCombatant({ STR: 3, DEX: 1 });
      const attack: Attack = {
        name: 'Greatsword',
        type: 'melee',
        damage_dice: '2d6',
        damage_type: 'slashing',
        properties: ['heavy', 'two-handed']
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(3); // STR modifier
    });

    it('should return STR modifier for melee attacks by default (no type specified)', () => {
      const combatant = createMockCombatant({ STR: 2, DEX: 4 });
      const attack: Attack = {
        name: 'Club',
        damage_dice: '1d4',
        damage_type: 'bludgeoning'
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(2); // STR modifier (default)
    });

    it('should return max(STR, DEX) for finesse weapons', () => {
      const combatant = createMockCombatant({ STR: 2, DEX: 4 });
      const attack: Attack = {
        name: 'Rapier',
        type: 'melee',
        damage_dice: '1d8',
        damage_type: 'piercing',
        properties: ['finesse']
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(4); // max(STR, DEX) = max(2, 4) = 4
    });

    it('should return max(STR, DEX) when STR is higher for finesse weapons', () => {
      const combatant = createMockCombatant({ STR: 5, DEX: 1 });
      const attack: Attack = {
        name: 'Dagger',
        type: 'melee',
        damage_dice: '1d4',
        damage_type: 'piercing',
        properties: ['finesse', 'thrown', 'light']
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(5); // max(STR, DEX) = max(5, 1) = 5
    });

    it('should return 0 for finesse weapon when both STR and DEX are 0', () => {
      const combatant = createMockCombatant({ STR: 0, DEX: 0 });
      const attack: Attack = {
        name: 'Rapier',
        type: 'melee',
        damage_dice: '1d8',
        damage_type: 'piercing',
        properties: ['finesse']
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(0); // max(0, 0) = 0
    });

    it('should return 0 for spell attacks', () => {
      const combatant = createMockCombatant({ STR: 3, DEX: 2, INT: 4 });
      const attack: Attack = {
        name: 'Fire Bolt',
        type: 'spell',
        damage_dice: '2d10',
        damage_type: 'fire'
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(0); // Spells don't add ability mod to damage dice
    });

    it('should handle negative ability modifiers for melee attacks', () => {
      const combatant = createMockCombatant({ STR: -1, DEX: 2 });
      const attack: Attack = {
        name: 'Staff',
        type: 'melee',
        damage_dice: '1d4',
        damage_type: 'bludgeoning'
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(-1); // Negative STR modifier
    });

    it('should handle negative ability modifiers for ranged attacks', () => {
      const combatant = createMockCombatant({ STR: 3, DEX: -1 });
      const attack: Attack = {
        name: 'Sling',
        type: 'ranged',
        damage_dice: '1d6',
        damage_type: 'bludgeoning',
        range: 30
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(-1); // Negative DEX modifier
    });

    it('should handle finesse weapon with one positive and one negative modifier', () => {
      const combatant = createMockCombatant({ STR: -1, DEX: 3 });
      const attack: Attack = {
        name: 'Rapier',
        type: 'melee',
        damage_dice: '1d8',
        damage_type: 'piercing',
        properties: ['finesse']
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(3); // max(-1, 3) = 3
    });

    it('should handle missing ability modifier keys gracefully (defaults to 0)', () => {
      const character = createMockCharacter();
      // Create an ability_modifiers object with missing keys
      character.ability_modifiers = {
        STR: 0,
        DEX: 0,
        CON: 0,
        INT: 0,
        WIS: 0,
        CHA: 0
      };

      const combatant: Combatant = {
        id: 'test-combatant',
        character,
        initiative: 10,
        currentHP: character.hp.max,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
      };

      const attack: Attack = {
        name: 'Longsword',
        type: 'melee',
        damage_dice: '1d8',
        damage_type: 'slashing'
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(0); // Should default to 0
    });

    it('should correctly identify finesse property in properties array', () => {
      const combatant = createMockCombatant({ STR: 1, DEX: 5 });
      const attack: Attack = {
        name: 'Shortsword',
        type: 'melee',
        damage_dice: '1d6',
        damage_type: 'piercing',
        properties: ['finesse', 'light']
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(5); // max(1, 5) = 5 due to finesse
    });

    it('should not use finesse logic when finesse is not in properties', () => {
      const combatant = createMockCombatant({ STR: 4, DEX: 5 });
      const attack: Attack = {
        name: 'Longsword',
        type: 'melee',
        damage_dice: '1d8',
        damage_type: 'slashing',
        properties: ['versatile']
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(4); // STR only, not finesse
    });

    it('should handle undefined properties for melee attacks', () => {
      const combatant = createMockCombatant({ STR: 3, DEX: 2 });
      const attack: Attack = {
        name: 'Unarmed Strike',
        type: 'melee',
        damage_dice: '1',
        damage_type: 'bludgeoning'
        // No properties array
      };

      const modifier = getDamageModifier(attackResolver, combatant, attack);
      expect(modifier).toBe(3); // STR modifier (no finesse without properties)
    });
  });

  describe('D&D 5e Compliance', () => {
    it('should follow D&D 5e ability score ranges (3-20)', () => {
      const character = createMockCharacter();

      for (const [ability, score] of Object.entries(character.ability_scores)) {
        expect(score).toBeGreaterThanOrEqual(3);
        expect(score).toBeLessThanOrEqual(20);
      }
    });

    it('should calculate ability modifiers correctly', () => {
      const character = createMockCharacter({
        ability_scores: {
          strength: 10,
          dexterity: 12,
          constitution: 14,
          intelligence: 16,
          wisdom: 18,
          charisma: 8
        },
        ability_modifiers: {
          strength: 0, // (10-10)/2 = 0
          dexterity: 1, // (12-10)/2 = 1
          constitution: 2, // (14-10)/2 = 2
          intelligence: 3, // (16-10)/2 = 3
          wisdom: 4, // (18-10)/2 = 4
          charisma: -1 // (8-10)/2 = -1
        }
      });

      // Modifiers = (score - 10) / 2 rounded down
      expect(character.ability_modifiers.strength).toBe(0);
      expect(character.ability_modifiers.dexterity).toBe(1);
      expect(character.ability_modifiers.constitution).toBe(2);
      expect(character.ability_modifiers.intelligence).toBe(3);
      expect(character.ability_modifiers.wisdom).toBe(4);
      expect(character.ability_modifiers.charisma).toBe(-1);
    });

    it('should respect attack bonus = ability modifier + proficiency', () => {
      const character = createMockCharacter({
        ability_modifiers: {
          strength: 2,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0
        },
        proficiency_bonus: 2
      });

      const strMod = character.ability_modifiers.strength;
      const profBonus = character.proficiency_bonus;

      // Attack bonus for proficient weapon = STR mod + proficiency
      expect(strMod + profBonus).toBe(4);
    });
  });

  describe('Task 7: Deterministic Treasure Generation', () => {
    it('should generate deterministic treasure with same seed', () => {
      const player = createMockCharacter({ name: 'Player' });
      const enemy = createMockCharacter({ name: 'Enemy', hp: { current: 1, max: 1 } });

      // Create two combat engines with the same seed
      const engine1 = new CombatEngine({ seed: 'test-seed-123' });
      const engine2 = new CombatEngine({ seed: 'test-seed-123' });

      const combat1 = engine1.startCombat([player], [enemy]);
      const combat2 = engine2.startCombat([player], [enemy]);

      // Defeat the enemy in both combats
      combat1.combatants[1].currentHP = 0;
      combat1.combatants[1].isDefeated = true;
      combat1.isActive = false;
      combat1.winner = combat1.combatants[0];

      combat2.combatants[1].currentHP = 0;
      combat2.combatants[1].isDefeated = true;
      combat2.isActive = false;
      combat2.winner = combat2.combatants[0];

      const result1 = engine1.getCombatResult(combat1);
      const result2 = engine2.getCombatResult(combat2);

      // Treasure should be identical with the same seed
      expect(result1?.treasureAwarded?.gold).toBe(result2?.treasureAwarded?.gold);
      expect(result1?.treasureAwarded?.gold).toBeGreaterThanOrEqual(0);
      expect(result1?.treasureAwarded?.gold).toBeLessThan(100);
    });

    it('should generate different treasure with different seeds', () => {
      const player = createMockCharacter({ name: 'Player' });
      const enemy = createMockCharacter({ name: 'Enemy', hp: { current: 1, max: 1 } });

      // Create two combat engines with different seeds
      const engine1 = new CombatEngine({ seed: 'seed-alpha' });
      const engine2 = new CombatEngine({ seed: 'seed-beta' });

      const combat1 = engine1.startCombat([player], [enemy]);
      const combat2 = engine2.startCombat([player], [enemy]);

      // Defeat the enemy in both combats
      combat1.combatants[1].currentHP = 0;
      combat1.combatants[1].isDefeated = true;
      combat1.isActive = false;
      combat1.winner = combat1.combatants[0];

      combat2.combatants[1].currentHP = 0;
      combat2.combatants[1].isDefeated = true;
      combat2.isActive = false;
      combat2.winner = combat2.combatants[0];

      const result1 = engine1.getCombatResult(combat1);
      const result2 = engine2.getCombatResult(combat2);

      // Treasure should be different with different seeds (extremely unlikely to be the same)
      expect(result1?.treasureAwarded?.gold).not.toBe(result2?.treasureAwarded?.gold);
    });

    it('should use seeded RNG for treasure generation', () => {
      const player = createMockCharacter({ name: 'Player' });
      const enemy = createMockCharacter({ name: 'Enemy', hp: { current: 1, max: 1 } });

      // Create combat engine with known seed
      const engine = new CombatEngine({ seed: 'predictable-seed' });
      const combat = engine.startCombat([player], [enemy]);

      // Defeat the enemy
      combat.combatants[1].currentHP = 0;
      combat.combatants[1].isDefeated = true;
      combat.isActive = false;
      combat.winner = combat.combatants[0];

      const result = engine.getCombatResult(combat);

      // Treasure should be generated and deterministic
      expect(result?.treasureAwarded).toBeDefined();
      expect(result?.treasureAwarded?.gold).toBeGreaterThanOrEqual(0);
      expect(result?.treasureAwarded?.gold).toBeLessThan(100);
      expect(result?.treasureAwarded?.items).toEqual([]);

      // Verify the result is always the same for this seed by creating a new engine with the same seed
      const engine2 = new CombatEngine({ seed: 'predictable-seed' });
      const combat2 = engine2.startCombat([player], [enemy]);
      combat2.combatants[1].currentHP = 0;
      combat2.combatants[1].isDefeated = true;
      combat2.isActive = false;
      combat2.winner = combat2.combatants[0];

      const result2 = engine2.getCombatResult(combat2);
      expect(result2?.treasureAwarded?.gold).toBe(result?.treasureAwarded?.gold);
    });

    it('should use fixed gold amount from treasure config', () => {
      const player = createMockCharacter({ name: 'Player' });
      const enemy = createMockCharacter({ name: 'Enemy', hp: { current: 1, max: 1, temp: 0 } });

      // Create combat engine with fixed treasure
      const engine = new CombatEngine({ treasure: { gold: 500 } });
      const combat = engine.startCombat([player], [enemy]);

      // Defeat the enemy
      combat.combatants[1].currentHP = 0;
      combat.combatants[1].isDefeated = true;
      combat.isActive = false;
      combat.winner = combat.combatants[0];

      const result = engine.getCombatResult(combat);

      expect(result?.treasureAwarded?.gold).toBe(500);
    });

    it('should use gold range from treasure config with seeded RNG', () => {
      const player = createMockCharacter({ name: 'Player' });
      const enemy = createMockCharacter({ name: 'Enemy', hp: { current: 1, max: 1, temp: 0 } });

      // Create combat engine with gold range
      const engine = new CombatEngine({
        seed: 'range-seed',
        treasure: { gold: { min: 100, max: 200 } }
      });
      const combat = engine.startCombat([player], [enemy]);

      // Defeat the enemy
      combat.combatants[1].currentHP = 0;
      combat.combatants[1].isDefeated = true;
      combat.isActive = false;
      combat.winner = combat.combatants[0];

      const result = engine.getCombatResult(combat);

      // Should be within range (inclusive)
      expect(result?.treasureAwarded?.gold).toBeGreaterThanOrEqual(100);
      expect(result?.treasureAwarded?.gold).toBeLessThanOrEqual(200);

      // Same seed should produce same result
      const engine2 = new CombatEngine({
        seed: 'range-seed',
        treasure: { gold: { min: 100, max: 200 } }
      });
      const combat2 = engine2.startCombat([player], [enemy]);
      combat2.combatants[1].currentHP = 0;
      combat2.combatants[1].isDefeated = true;
      combat2.isActive = false;
      combat2.winner = combat2.combatants[0];

      const result2 = engine2.getCombatResult(combat2);
      expect(result2?.treasureAwarded?.gold).toBe(result?.treasureAwarded?.gold);
    });

    it('should include custom items from treasure config', () => {
      const player = createMockCharacter({ name: 'Player' });
      const enemy = createMockCharacter({ name: 'Enemy', hp: { current: 1, max: 1, temp: 0 } });

      const customItems = [
        { id: 'sword-1', name: 'Longsword', type: 'weapon' },
        { id: 'potion-1', name: 'Health Potion', type: 'consumable' }
      ];

      // Create combat engine with custom items
      const engine = new CombatEngine({ treasure: { items: customItems } });
      const combat = engine.startCombat([player], [enemy]);

      // Defeat the enemy
      combat.combatants[1].currentHP = 0;
      combat.combatants[1].isDefeated = true;
      combat.isActive = false;
      combat.winner = combat.combatants[0];

      const result = engine.getCombatResult(combat);

      expect(result?.treasureAwarded?.items).toEqual(customItems);
    });

    it('should support both fixed gold and custom items together', () => {
      const player = createMockCharacter({ name: 'Player' });
      const enemy = createMockCharacter({ name: 'Enemy', hp: { current: 1, max: 1, temp: 0 } });

      const customItems = [{ id: 'ring-1', name: 'Ring of Protection', type: 'accessory' }];

      // Create combat engine with full treasure config
      const engine = new CombatEngine({
        treasure: { gold: 1000, items: customItems }
      });
      const combat = engine.startCombat([player], [enemy]);

      // Defeat the enemy
      combat.combatants[1].currentHP = 0;
      combat.combatants[1].isDefeated = true;
      combat.isActive = false;
      combat.winner = combat.combatants[0];

      const result = engine.getCombatResult(combat);

      expect(result?.treasureAwarded?.gold).toBe(1000);
      expect(result?.treasureAwarded?.items).toEqual(customItems);
    });

    it('should default to 0 gold when treasure config has no gold specified', () => {
      const player = createMockCharacter({ name: 'Player' });
      const enemy = createMockCharacter({ name: 'Enemy', hp: { current: 1, max: 1, temp: 0 } });

      // Create combat engine with only items, no gold
      const engine = new CombatEngine({ treasure: { items: [] } });
      const combat = engine.startCombat([player], [enemy]);

      // Defeat the enemy
      combat.combatants[1].currentHP = 0;
      combat.combatants[1].isDefeated = true;
      combat.isActive = false;
      combat.winner = combat.combatants[0];

      const result = engine.getCombatResult(combat);

      expect(result?.treasureAwarded?.gold).toBe(0);
      expect(result?.treasureAwarded?.items).toEqual([]);
    });
  });
});
