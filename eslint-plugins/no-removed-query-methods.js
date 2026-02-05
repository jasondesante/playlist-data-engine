/**
 * Custom ESLint rule to prevent usage of removed registry registration methods.
 *
 * This rule detects and reports calls to the following removed methods:
 * - SpellRegistry: registerSpell(), registerSpells(), registerClassSpellList()
 * - SkillRegistry: registerSkill(), registerSkills()
 * - FeatureRegistry: registerClassFeature(), registerClassFeatures(), registerRacialTrait(), registerRacialTraits()
 *
 * @see docs/MIGRATION_GUIDE.md for migration instructions
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent usage of removed registry registration methods',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      useExtensionManager: 'Use ExtensionManager.register() instead. See docs/MIGRATION_GUIDE.md',
      methodRemoved: '"{{ methodName }}" has been removed. {{ suggestion }}',
    },
    schema: [], // no options
  },
  create: (context) => {
    // The removed methods and their alternatives
    const removedMethods = {
      // SpellRegistry methods
      registerSpell: {
        suggestion: "Use ExtensionManager.register('spells', spell) instead",
        registry: 'SpellRegistry',
      },
      registerSpells: {
        suggestion: "Use ExtensionManager.register('spells', spells) instead",
        registry: 'SpellRegistry',
      },
      registerClassSpellList: {
        suggestion: "Use ExtensionManager.register('spells.{ClassName}', spellIds) instead",
        registry: 'SpellRegistry',
      },
      // SkillRegistry methods
      registerSkill: {
        suggestion: "Use ExtensionManager.register('skills', skill) instead",
        registry: 'SkillRegistry',
      },
      registerSkills: {
        suggestion: "Use ExtensionManager.register('skills', skills) instead",
        registry: 'SkillRegistry',
      },
      // FeatureRegistry methods
      registerClassFeature: {
        suggestion: "Use ExtensionManager.register('classFeatures', feature) instead",
        registry: 'FeatureRegistry',
      },
      registerClassFeatures: {
        suggestion: "Use ExtensionManager.register('classFeatures', features) instead",
        registry: 'FeatureRegistry',
      },
      registerRacialTrait: {
        suggestion: "Use ExtensionManager.register('racialTraits', trait) instead",
        registry: 'FeatureRegistry',
      },
      registerRacialTraits: {
        suggestion: "Use ExtensionManager.register('racialTraits', traits) instead",
        registry: 'FeatureRegistry',
      },
    };

    // Registry instance names that might be used
    const registryNames = [
      'spellRegistry',
      'SpellRegistry',
      'skillRegistry',
      'SkillRegistry',
      'featureRegistry',
      'FeatureRegistry',
    ];

    return {
      // Detect calls like: spellRegistry.registerSpell(...)
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') {
          return;
        }

        const callee = node.callee;
        const property = callee.property;

        // Check if it's a computed member access (e.g., registry[method])
        if (callee.computed) {
          return; // Skip computed properties - we can't statically analyze them
        }

        // Get the object name (e.g., "spellRegistry" from "spellRegistry.registerSpell")
        let objectName = null;
        if (callee.object.type === 'Identifier') {
          objectName = callee.object.name;
        } else if (callee.object.type === 'MemberExpression') {
          // Handle cases like SpellRegistry.getInstance().registerSpell()
          const member = callee.object;
          if (member.property?.type === 'Identifier' && member.property.name === 'getInstance') {
            if (member.object?.type === 'Identifier') {
              objectName = member.object.name;
            }
          }
        }

        // Check if the callee is a known registry name
        const isRegistryCall = objectName && registryNames.includes(objectName);

        if (property.type === 'Identifier' && isRegistryCall) {
          const methodName = property.name;
          const methodInfo = removedMethods[methodName];

          if (methodInfo) {
            context.report({
              node: property,
              messageId: 'methodRemoved',
              data: {
                methodName: `${objectName}.${methodName}()`,
                suggestion: methodInfo.suggestion,
              },
            });
          }
        }
      },

      // Detect calls like: SpellRegistry.getInstance().registerSpell(...)
      // where we need to track getInstance() calls
      MemberExpression(node) {
        // Detect chaining like SpellRegistry.getInstance()
        if (
          node.property.type === 'Identifier' &&
          node.property.name === 'getInstance' &&
          node.object.type === 'Identifier'
        ) {
          const className = node.object.name;
          if (className === 'SpellRegistry' || className === 'SkillRegistry' || className === 'FeatureRegistry') {
            // Mark this as a registry instance for parent CallExpression to detect
            // We set a flag on the node for the parent to check
            node.isRegistryInstance = true;
          }
        }
      },
    };
  },
};
