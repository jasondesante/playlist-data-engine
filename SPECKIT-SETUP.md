# Spec-Kit Setup Guide for Fretboard Visualizer

## What is Spec-Kit?

Spec-Kit is GitHub's spec-driven development toolkit that helps you plan, design, and implement features systematically. It's integrated into Claude Code and provides slash commands for structured development.

# Basic project initialization
specify init my-project

# Initialize with specific AI assistant
specify init my-project --ai claude

# Initialize with Cursor support
specify init my-project --ai cursor-agent

# Initialize with Windsurf support
specify init my-project --ai windsurf

# Skip git initialization
specify init my-project --ai gemini --no-git

## Your Setup

✅ **Installed**: `specify-cli` (v0.0.22)
✅ **Initialized**: Project ready with Claude Code integration
✅ **Git Repository**: Initialized (`.git/` directory created)
✅ **Spec Directory**: `.specify/` contains templates and memory
✅ **Claude Commands**: `.claude/commands/` contains slash command implementations

## Available Slash Commands

### Core Workflow (In Order)

1. **`/speckit.constitution`**
   - Define governing principles, development guidelines, and project values
   - Run this **first** to establish project standards
   - Sets the tone for all other specs

2. **`/speckit.specify`**
   - Create baseline specification of features and requirements
   - Describe what the app does and should do
   - Document all current and desired functionality

3. **`/speckit.plan`** (Optional but recommended)
   - Create technical implementation strategy
   - Break down architecture and design decisions
   - Plan how to build each feature

4. **`/speckit.tasks`**
   - Generate actionable task breakdown from specification
   - Creates concrete, implementable steps
   - Assigns effort levels and dependencies

5. **`/speckit.implement`**
   - Execute implementation tasks systematically
   - Follow generated tasks to build features
   - Track progress and completion

### Optional Enhancement Commands

- **`/speckit.clarify`** - Ask structured questions about ambiguous areas (run before `/speckit.plan`)
- **`/speckit.analyze`** - Cross-artifact consistency report (run after `/speckit.tasks`)
- **`/speckit.checklist`** - Generate quality validation checklists (run after `/speckit.plan`)

## Recommended Workflow for This Project

1. List all features you want to add to the Fretboard Visualizer
2. Run `/speckit.specify` to formalize the feature list
3. Run `/speckit.plan` to design how to build them
4. Run `/speckit.tasks` to break down into specific tasks
5. Use `/speckit.implement` to build features systematically

## Key Points

- **All commands are interactive** - They ask questions and build artifacts based on your input
- **Artifacts are stored** in `.specify/templates/` and `.specify/memory/` for reference
- **Structured output** - Each command produces clear, actionable documentation
- **One workflow at a time** - Complete earlier steps before moving to later ones
- **No conflicts** - You can re-run commands to update specifications

## Getting Started

When you're ready to list and plan your features:

```
Tell Claude Code: "I want to start planning features for the Fretboard Visualizer.
Let me first run /speckit.specify to list all the features I want to add."
```

Then provide your feature list, and Spec-Kit will help structure it into a comprehensive plan!

## File Organization

```
.specify/
├── memory/          # Spec-Kit's working memory and state
├── scripts/         # Helper scripts
└── templates/       # Output templates for specs

.claude/
└── commands/        # Slash command implementations
    ├── speckit.constitution.md
    ├── speckit.specify.md
    ├── speckit.plan.md
    ├── speckit.tasks.md
    ├── speckit.implement.md
    ├── speckit.clarify.md
    ├── speckit.analyze.md
    ├── speckit.checklist.md
    └── speckit.taskstoissues.md
```

## Next Steps

1. **Prepare your feature list** - Think about everything you want to add/improve
2. **Run the spec workflow** - Use the commands in order above
3. **Review generated plans** - Artifacts will guide development
4. **Start building** - Use `/speckit.implement` to execute tasks systematically

Happy planning! 🎸
