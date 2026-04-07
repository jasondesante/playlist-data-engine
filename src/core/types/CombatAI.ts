/**
 * Combat AI Type Definitions
 *
 * Defines types and interfaces for the combat AI system that controls
 * both player characters and enemies during simulated combat.
 */

/**
 * AIPlayStyle - How an AI-controlled combatant approaches combat
 *
 * Two fundamental strategies drive all AI decisions:
 * - **Normal**: Measures baseline difficulty. Balanced resource use.
 * - **Aggressive**: Measures difficulty ceiling. No resource conservation.
 *
 * Comparing Normal vs Aggressive results reveals the true difficulty
 * range of an encounter.
 */
export type AIPlayStyle = 'normal' | 'aggressive';

/**
 * AIConfig - Configuration for AI-controlled combat
 *
 * Controls how both sides fight during simulation. Each side can have
 * a different play style, and individual combatants can be overridden.
 */
export interface AIConfig {
    /** How player characters play */
    playerStyle: AIPlayStyle;

    /** How enemies play */
    enemyStyle: AIPlayStyle;

    /** Optional per-combatant style overrides (combatant ID → style) */
    overrides?: Map<string, AIPlayStyle>;

    /**
     * Enable class-specific features for player AI
     * Default: false (basic attacks + spells + items only)
     * When true: AI attempts to use class features like Sneak Attack, Divine Smite, Action Surge
     */
    enableClassFeatures?: boolean;
}

/**
 * AIDecision - The output of the AI's decision for a single turn
 *
 * Returned by CombatAI.decide() and executed by AICombatRunner.
 * Contains all information needed to execute one combatant's turn.
 */
export interface AIDecision {
    /** The type of action to take */
    action: 'attack' | 'castSpell' | 'dodge' | 'dash' | 'disengage' | 'flee' | 'useItem' | 'legendaryAction' | 'skip';

    /** Target combatant ID (for single-target actions) */
    target?: string;

    /** Target combatant IDs (for multi-target spells) */
    targetIds?: string[];

    /** Which weapon to attack with */
    weaponName?: string;

    /** Which spell to cast */
    spellName?: string;

    /** Which consumable item to use */
    itemName?: string;

    /** Which legendary action to execute */
    legendaryActionId?: string;

    /** Human-readable explanation of why the AI chose this action */
    reasoning?: string;
}

/**
 * AIThreatAssessment - How the AI evaluates the current battlefield state
 *
 * Computed each turn to inform decision-making. Provides a snapshot
 * of tactical conditions that drive style-dependent behavior.
 */
export interface AIThreatAssessment {
    /** Current HP as a fraction of max HP (0.0 - 1.0) */
    myHPPercent: number;

    /** Current armor class */
    myAC: number;

    /** Lowest ally HP as a fraction of max HP (1.0 if no allies) */
    lowestAllyHPPercent: number;

    /** Absolute HP of the weakest living enemy (Infinity if no enemies) */
    lowestEnemyHP: number;

    /** Estimated DPR of the scariest enemy */
    highestEnemyDamage: number;

    /** Number of living allies (including self) */
    partySize: number;

    /** Number of living enemies */
    enemyCount: number;

    /** Current round number */
    roundNumber: number;

    /** Below 25% HP */
    isLowHP: boolean;

    /** Below 10% HP */
    isCriticalHP: boolean;

    /** Has healing items in inventory */
    hasHealingItems: boolean;

    /** Has remaining spell slots for leveled spells */
    hasSpellSlots: boolean;

    /** Has remaining limited-use abilities (not yet expended) */
    hasRemainingLimitedAbilities: boolean;
}

/**
 * CombatantMetrics - Per-combatant aggregate statistics from a single combat
 *
 * Computed from combat history by CombatMetricsTracker. Used by the
 * Monte Carlo simulator to aggregate per-combatant performance across
 * many simulation runs (DPR, survival rate, etc.).
 */
export interface CombatantMetrics {
    /** Combatant ID */
    combatantId: string;
    /** Combatant display name */
    name: string;
    /** Which side this combatant was on */
    side: 'player' | 'enemy';
    /** Total damage dealt to enemies (via attacks, spells, legendary actions) */
    totalDamageDealt: number;
    /** Total damage taken from all sources */
    totalDamageTaken: number;
    /** Total HP restored via healing spells and items */
    totalHealingDone: number;
    /** Number of spells cast (successful and failed) */
    spellsCast: number;
    /** Number of consumable items used */
    itemsUsed: number;
    /** Number of critical hits scored */
    criticalHits: number;
    /** Number of rounds the combatant survived (0 if defeated in round 1) */
    roundsSurvived: number;
    /** Whether the combatant was still alive at combat end */
    survived: boolean;
    /** Breakdown of actions by type */
    actionsByType: Record<string, number>;
    /** Damage dealt per round (index = round number, value = damage that round) */
    damagePerRound: number[];
}

/**
 * Type guard to check if a value is a valid AIPlayStyle
 */
export function isValidAIPlayStyle(value: unknown): value is AIPlayStyle {
    const validStyles: AIPlayStyle[] = ['normal', 'aggressive'];
    return typeof value === 'string' && validStyles.includes(value as AIPlayStyle);
}
