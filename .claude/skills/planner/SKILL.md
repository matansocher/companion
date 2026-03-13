---
name: planner
description: Plan new Companion features by exploring the codebase and producing a structured implementation plan that follows project conventions
---

# /planner

Plan a new feature or enhancement by exploring the codebase and producing an actionable implementation plan that follows Companion project conventions.

## Instructions

### Phase 1 — Understand the Request

1. Read the user's description of what they want to build.
2. Classify the work into one or more categories:
   - **New UI component** — new component under `projects/apps/companion/src/components/`
   - **New UI page/view** — new top-level view in the Chrome extension
   - **New API route** — new route under `projects/apps/companion-api/src/routes/`
   - **New API service** — new service under `projects/apps/companion-api/src/services/`
   - **New shared type** — additions to `projects/libs/shared/src/lib/types.ts`
   - **Enhancement** — changes to existing components, routes, or services
   - **New library** — new shared library under `projects/libs/`
3. Identify which app(s) are affected: companion (UI), companion-api (API), shared (types lib), or all.

### Phase 2 — Explore the Codebase

Use the Agent tool with Explore subagents or direct file reads. Read actual files — do not guess.

1. **Similar components/features**: Find the most similar existing code and read it.
   - UI: Check `projects/apps/companion/src/components/` for similar React components.
   - API: Check `projects/apps/companion-api/src/routes/` and `services/` for similar patterns.
2. **Shared types**: Read `projects/libs/shared/src/lib/types.ts` to understand existing type definitions and whether new types belong there.
3. **API integration**: Read `projects/apps/companion/src/lib/api.ts` to understand how the UI communicates with the API.
4. **Chrome extension APIs**: Read `projects/apps/companion/src/lib/chrome.ts` if the feature involves browser/extension functionality.
5. **Styling**: Read `projects/apps/companion/src/index.css` for theme variables and Tailwind setup.
6. **App entry points**: Read `projects/apps/companion/src/App.tsx` and `projects/apps/companion-api/src/main.ts` to understand how features are wired in.
7. **Nx configuration**: Check `nx.json` and relevant `project.json` files if the feature requires build/config changes.

### Phase 3 — Identify Components

Build a table of every component the feature needs:

| Component | Status | Path |
|-----------|--------|------|
| Shared types | new/modify | `projects/libs/shared/src/lib/types.ts` |
| Shared barrel export | modify | `projects/libs/shared/src/index.ts` |
| UI component | new/modify | `projects/apps/companion/src/components/{Name}.tsx` |
| UI shadcn component | new | `projects/apps/companion/src/components/ui/{name}.tsx` |
| UI utility | new/modify | `projects/apps/companion/src/lib/{name}.ts` |
| UI entry (App.tsx) | modify | `projects/apps/companion/src/App.tsx` |
| UI styles | modify | `projects/apps/companion/src/index.css` |
| API route | new/modify | `projects/apps/companion-api/src/routes/{name}.routes.ts` |
| API service | new/modify | `projects/apps/companion-api/src/services/{name}.service.ts` |
| API entry (main.ts) | modify | `projects/apps/companion-api/src/main.ts` |

Remove rows that don't apply.

### Phase 4 — Ask Verification Questions

Ask the user **one round** of concise, numbered questions to confirm:

- Scope assumptions (e.g., "This affects both the UI and API — correct?")
- Data model decisions (e.g., "Should this be persisted or kept in-memory like chat history?")
- UI decisions (e.g., "Should this be a new panel or integrated into the existing chat view?")
- Integration choices (e.g., "Should this use the existing OpenAI service or a different provider?")
- Whether new environment variables or API keys are required
- Whether new npm packages or shadcn components are needed

Wait for answers before proceeding to Phase 5.

### Phase 5 — Produce the Implementation Plan

Output a structured plan with these sections:

**5.1 Overview** — One paragraph: what will be built and which apps/layers are involved.

**5.2 Files to Create** — For each new file:
- Path (full from project root)
- Purpose (one line)
- Key contents (types, components, functions, routes to implement)
- Reference file to follow (a real existing file with similar pattern)

**5.3 Files to Modify** — For each existing file:
- Path
- What to change (specific additions/modifications)

**5.4 Type Definitions** — The main types to create in the shared library. Show actual type signatures.

**5.5 Data Flow** — Numbered sequence: user action → UI component → API call → service → response → UI update.

**5.6 Dependencies** — New npm packages, shadcn components, environment variables, external APIs (if any).

**5.7 Implementation Order** — Dependency-aware numbered steps:
1. Shared types (no dependencies)
2. API service (data/integration layer)
3. API route (depends on service)
4. API entry point registration (wire route in main.ts)
5. UI utility/API client updates
6. UI component (depends on API + types)
7. UI entry point integration (wire into App.tsx)
8. Styling updates (if needed)

**5.8 Testing** — Which components need test files and what to test.

## Rules

- Reference a real existing file as the pattern to follow for each new file — never describe patterns abstractly.
- Use React hooks and functional components for UI code.
- Use Tailwind CSS for styling, respecting the existing theme variable system.
- Use the `@companion/shared` path alias for shared type imports.
- Follow Express patterns from existing routes for API code.
- Use shadcn CLI (`npx shadcn add {component}`) for new UI primitives.
- Do NOT produce implementation code — only the plan.