# Migration Summary

## Pre-Migration
- source_files_scanned: 1235
- collisions: 9
- move_only: 1226
- identical_keep_target: 0
- pre_orphan_candidates_in_source_code: 290

## Collision Winners
- `.gitignore` -> winner: **target** (newer_modified_date)
- `CHANGELOG.md` -> winner: **target** (newer_modified_date)
- `LICENSE` -> winner: **target** (newer_modified_date)
- `package-lock.json` -> winner: **source** (newer_modified_date)
- `package.json` -> winner: **source** (newer_modified_date)
- `README.md` -> winner: **target** (newer_modified_date)
- `.serena/.gitignore` -> winner: **target** (newer_modified_date)
- `.serena/project.local.yml` -> winner: **target** (newer_modified_date)
- `.serena/project.yml` -> winner: **source** (newer_modified_date)

## Execution Summary
- moved_files: 1224
- overwritten_files: 3
- source_deleted_duplicates: 6
- skipped: 2
- errors: 0
- removed_empty_dirs: 495

### Overwritten Files
- `C:/Users/rubic/OneDrive/Masaüstü/FINANSKODU/Fincept/FinceptTerminal/package-lock.json` <- source winner (newer_modified_date)
- `C:/Users/rubic/OneDrive/Masaüstü/FINANSKODU/Fincept/FinceptTerminal/package.json` <- source winner (newer_modified_date)
- `C:/Users/rubic/OneDrive/Masaüstü/FINANSKODU/Fincept/FinceptTerminal/.serena/project.yml` <- source winner (newer_modified_date)

### Skipped (Protected by Rules)
- `C:/Users/rubic/OneDrive/Masaüstü/FINANSKODU/Fincept/FinceptTerminal/FinCognis/.env.local` (forbidden_path_rule)
- `C:/Users/rubic/OneDrive/Masaüstü/FINANSKODU/Fincept/FinceptTerminal/FinCognis/.env.local.txt` (forbidden_path_rule)

## Post-Migration Hygiene
- files_scanned: 329
- dependency_edges: 430
- orphaned_files: 141
- mislocated_entities: 3
- smelly_dependencies: 0
- violations_gt_450: 18
- redundant_barrels: 0

### Mislocated Entities (Suggestions)
- `src/components/theme/ThemeProvider.tsx` -> `src/hooks/theme/ThemeProvider.tsx` (Hook declaration inside components)
- `src/components/tools/commission/useCommissionCalculator.ts` -> `src/hooks/tools/commission/useCommissionCalculator.ts` (Hook-like filename in components)
- `src/components/tools/commission/useCommissionCalculator.ts` -> `src/hooks/tools/commission/useCommissionCalculator.ts` (Hook declaration inside components)

### Top Line-Count Violations
- `src/lib/services/universal-asset-analysis-service.ts`: 2450 lines
- `cli/main.py`: 1221 lines
- `src/components/tools/correlation/UniversalAssetComparisonPanel.tsx`: 1127 lines
- `hooks/src/daemon-client.ts`: 979 lines
- `src/components/tools/commission/useCommissionCalculator.ts`: 879 lines
- `hooks/src/shared/db-utils-pg.ts`: 785 lines
- `tests/test_memory_log.py`: 773 lines
- `hooks/src/smart-search-router.ts`: 628 lines
- `src/components/tools/stress/engine.ts`: 626 lines
- `hooks/src/session-start-continuity.ts`: 586 lines
- `src/lib/economic-calendar/mirror.ts`: 572 lines
- `hooks/src/skill-activation-prompt.ts`: 566 lines
- `src/lib/gateways/market-data-gateway.ts`: 517 lines
- `hooks/src/shared/erotetic-questions.ts`: 509 lines
- `hooks/src/tldr-context-inject.ts`: 507 lines
- `hooks/src/tldr-read-enforcer.ts`: 504 lines
- `src/components/tools/commissionHelpers.ts`: 469 lines
- `hooks/src/shared/memory-client.ts`: 455 lines

### Orphan Candidates (First 50)
- `CommissionCalculator.tsx`
- `bin/cli.mjs`
- `calculateCommission.js`
- `cli/__init__.py`
- `hooks/src/__tests__/frontmatter.test.ts`
- `hooks/src/__tests__/plugin-check.test.ts`
- `hooks/src/__tests__/project-identity.test.ts`
- `hooks/src/__tests__/session-id.test.ts`
- `hooks/src/achievement-tracker.ts`
- `hooks/src/agent-memory-loader.ts`
- `hooks/src/agent-memory-saver.ts`
- `hooks/src/agent-observer.ts`
- `hooks/src/agent-tuner.ts`
- `hooks/src/anti-rationalization.ts`
- `hooks/src/arch-context-inject.ts`
- `hooks/src/bash-audit-log.ts`
- `hooks/src/canavar-cli.ts`
- `hooks/src/canavar-cross-review.ts`
- `hooks/src/canavar-error-broadcast.ts`
- `hooks/src/canavar-skill-tracker.ts`
- `hooks/src/canavar-subagent-tracker.ts`
- `hooks/src/changelog-on-release.ts`
- `hooks/src/compiler-in-the-loop-stop.ts`
- `hooks/src/compiler-in-the-loop.ts`
- `hooks/src/credential-deny.ts`
- `hooks/src/dashboard-ws-emitter.ts`
- `hooks/src/dream-consolidator.ts`
- `hooks/src/edit-context-inject.ts`
- `hooks/src/epistemic-reminder.ts`
- `hooks/src/file-claims.ts`
- `hooks/src/graph-indexer.ts`
- `hooks/src/handoff-index.ts`
- `hooks/src/impact-refactor.ts`
- `hooks/src/import-error-detector.ts`
- `hooks/src/import-validator.ts`
- `hooks/src/instinct-cli.ts`
- `hooks/src/instinct-consolidator.ts`
- `hooks/src/instinct-loader.ts`
- `hooks/src/intent-classifier.ts`
- `hooks/src/magic-doc-tracker.ts`
- `hooks/src/magic-doc-updater.ts`
- `hooks/src/mcp-discovery.ts`
- `hooks/src/memory-awareness.ts`
- `hooks/src/memory-graph.ts`
- `hooks/src/model-router.ts`
- `hooks/src/palace-auto-save.ts`
- `hooks/src/palace-recall.ts`
- `hooks/src/passive-learner.ts`
- `hooks/src/path-rules.ts`
- `hooks/src/plan-tracker.ts`
- ... and 91 more