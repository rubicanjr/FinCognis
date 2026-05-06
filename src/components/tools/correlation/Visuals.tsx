import { clamp } from "@/components/tools/correlation/math";
import { ASSET_UNIVERSE } from "@/components/tools/correlation/universe";
import type { ContagionMapResult, HeatmapCell } from "@/components/tools/correlation/types";

function correlationBg(value: number): string {
  if (value >= 0.75) return "bg-error-container";
  if (value >= 0.5) return "bg-warning-container";
  if (value >= 0.2) return "bg-info-container";
  if (value > -0.2) return "bg-success-container";
  if (value > -0.5) return "bg-info-container";
  return "bg-surface-container-high";
}

function impactColor(value: number): string {
  return value < 0 ? "rgb(var(--error))" : "rgb(var(--success))";
}

function nodeFillColor(isSource: boolean, value: number): string {
  if (isSource) return "rgb(var(--warning))";
  return value < 0 ? "rgb(var(--error))" : "rgb(var(--success))";
}

interface HeatmapProps {
  assetIds: string[];
  heatmap: HeatmapCell[];
}

export function PortfolioHeatmap({ assetIds, heatmap }: HeatmapProps) {
  const read = (rowId: string, colId: string) => {
    return heatmap.find((cell) => cell.rowId === rowId && cell.colId === colId)?.value ?? 0;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3">
      <table className="min-w-[640px] w-full text-xs">
        <thead>
          <tr>
            <th className="px-2 py-2 text-left text-on-surface-variant">Varlık</th>
            {assetIds.map((assetId) => (
              <th key={assetId} className="px-2 py-2 text-center text-on-surface-variant">
                {ASSET_UNIVERSE.find((asset) => asset.id === assetId)?.ticker ?? assetId}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assetIds.map((rowId) => (
            <tr key={rowId}>
              <td className="px-2 py-2 font-semibold text-on-surface">
                {ASSET_UNIVERSE.find((asset) => asset.id === rowId)?.ticker ?? rowId}
              </td>
              {assetIds.map((colId) => {
                const value = read(rowId, colId);
                return (
                  <td key={colId} className="px-1 py-1">
                    <div className={`rounded-md px-2 py-1 text-center font-semibold text-on-surface ${correlationBg(value)}`}>
                      {value.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ContagionMapProps {
  contagion: ContagionMapResult;
}

export function ContagionMap({ contagion }: ContagionMapProps) {
  const nodes = contagion.nodeImpacts.slice(0, 8);
  const centerX = 170;
  const centerY = 170;
  const radius = 120;
  const layout = nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const source = layout.find((node) => node.assetId === contagion.sourceAssetId) ?? layout[0];

  return (
    <div className="grid gap-3 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3">
        <svg width="340" height="340" viewBox="0 0 340 340" className="mx-auto">
          {layout.map((node) => {
            if (!source || node.assetId === source.assetId) return null;
            const strength = clamp(Math.abs(node.totalImpact) * 4, 0.5, 3);
            return (
              <line
                key={`${source.assetId}-${node.assetId}`}
                x1={source.x}
                y1={source.y}
                x2={node.x}
                y2={node.y}
                stroke={impactColor(node.totalImpact)}
                strokeWidth={strength}
                opacity="0.68"
              />
            );
          })}
          {layout.map((node) => {
            const ticker = ASSET_UNIVERSE.find((asset) => asset.id === node.assetId)?.ticker ?? node.assetId;
            const isSource = node.assetId === contagion.sourceAssetId;
            return (
              <g key={node.assetId}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSource ? 24 : 18}
                  fill={nodeFillColor(isSource, node.totalImpact)}
                  fillOpacity={isSource ? 0.92 : 0.76}
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgb(var(--surface-container-lowest))"
                  fontWeight="700"
                >
                  {ticker}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-secondary">Bulaşıcılık Etki Listesi</p>
        <div className="space-y-2">
          {nodes.map((node) => {
            const asset = ASSET_UNIVERSE.find((item) => item.id === node.assetId);
            return (
              <div key={node.assetId} className="rounded-lg border border-outline-variant/25 bg-surface px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-on-surface">{asset?.ticker ?? node.assetId}</p>
                  <p className={`text-sm font-bold ${node.totalImpact < 0 ? "text-error" : "text-success"}`}>
                    {(node.totalImpact * 100).toFixed(2)}%
                  </p>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Direkt: {(node.directImpact * 100).toFixed(2)}% | Yansıma: {(node.propagatedImpact * 100).toFixed(2)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
