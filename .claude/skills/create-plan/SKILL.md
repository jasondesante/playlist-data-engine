---
name: create-plan
description: Generate comprehensive implementation plans with phases, tasks, and progress tracking. Use when the user wants to plan a feature, break down work into phases, create a roadmap, or organize implementation steps. Triggers on requests like "create a plan", "plan this feature", "break this down into tasks", "make an implementation plan", or "what are the steps to build this".
---

# Create Plan

Generate a comprehensive implementation plan saved to a markdown file in the project folder.

## Workflow

1. **Gather context** - Analyze current discussion, requirements, and codebase
2. **Research** - Explore the codebase to understand existing patterns and architecture
3. **Interview** - Use AskUserQuestion to clarify scope, priorities, and constraints
4. **Draft plan** - Structure into phases with tasks and checkboxes
5. **Save** - Write to project folder as markdown

## Plan Structure

```markdown
# [Feature/Task Name] Implementation Plan

## Overview
Brief description of what's being built and why.

## Phase 1: [Phase Name]
- [ ] Task 1
  - [ ] Subtask 1.1
  - [ ] Subtask 1.2
- [ ] Task 2
  - [ ] Subtask 2.1

## Phase 2: [Phase Name]
- [ ] Task 1
  - [ ] Subtask 1.1

## Dependencies
- List any blockers or prerequisites

## Questions/Unknowns
- Items needing clarification
```

## Guidelines

- Each task should be completable in a single focused session
- Use subtasks to break down complex tasks into checkpoint-sized pieces
- Include checkboxes `[ ]` for progress tracking
- Note dependencies between phases/tasks
- Flag unknowns that need user input
