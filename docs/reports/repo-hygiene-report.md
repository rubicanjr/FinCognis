# Repository Hygiene Report

Generated: 2026-05-05T18:23:53.424Z
Scanned source files: 103

## [ORPHANED_FILES]
- src/app/robots.ts (incoming refs: 0)
- src/app/sitemap.ts (incoming refs: 0)
- src/components/landing/EconomicCalendarPanel.tsx (incoming refs: 0)
- src/components/landing/EconomicCalendarWidget.tsx (incoming refs: 0)
- src/components/landing/LandingUpdatesSection.tsx (incoming refs: 0)
- src/components/tools/CommissionCalculator.tsx (incoming refs: 0)
- src/components/tools/correlation/Visuals.tsx (incoming refs: 0)
- src/components/tools/StressTest.tsx (incoming refs: 0)
- src/lib/auth/tools-gateway.ts (incoming refs: 0)
- src/lib/economic-calendar/cache-port.ts (incoming refs: 0)
- src/lib/repo-hygiene/rules.ts (incoming refs: 0)
- src/test/setup.ts (incoming refs: 0)

## [MISLOCATED_ENTITIES]
- src/components/tools/commission/useCommissionCalculator.ts -> Hook export 'useCommissionCalculator' is under components. Recommendation: git mv src/components/tools/commission/useCommissionCalculator.ts src/hooks/useCommissionCalculator.ts. Importers to adjust: src/components/tools/CommissionCalculator.tsx, src/components/tools/commission/AnalyticsPanel.tsx, src/components/tools/commission/ComparisonPanel.tsx, src/components/tools/commission/InsightsPanel.tsx, src/components/tools/commission/SelectionPanel.tsx, src/components/tools/commission/SupportPanel.tsx, src/components/tools/commission/TopPanel.tsx

## [SMELLY_DEPENDENCIES]
- None

## [VIOLATIONS]
- src/lib/services/universal-asset-analysis-service.ts (2451 lines, limit 450)
- src/components/tools/correlation/UniversalAssetComparisonPanel.tsx (1128 lines, limit 450)
- src/components/tools/commission/useCommissionCalculator.ts (880 lines, limit 450)
- src/components/tools/stress/engine.ts (627 lines, limit 450)
- src/lib/economic-calendar/mirror.ts (573 lines, limit 450)
- src/lib/gateways/market-data-gateway.ts (518 lines, limit 450)
- src/components/tools/commissionHelpers.ts (470 lines, limit 450)

## [NAMING]
- [src/components/tools/commission/useCommissionCalculator.ts] File should be kebab-case
- [src/components/tools/commissionHelpers.ts] File should be kebab-case
- [src/hooks/useAssetSearch.ts] File should be kebab-case
- [src/hooks/useEconomicCalendar.ts] File should be kebab-case

## [REDUNDANT_BARRELS]
- None

