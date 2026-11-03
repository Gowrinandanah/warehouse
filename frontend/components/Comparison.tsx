import React, { useMemo, useState } from 'react';
import { AlertCircle, BarChart3, ChevronDown, Layers3, LoaderCircle, Trash2, Warehouse } from 'lucide-react';
import type { SimulationRunRecord } from '../types';
import './Comparison.css';

interface Props {
  runs: SimulationRunRecord[];
  loading: boolean;
  error: string;
  onLoad: (run: SimulationRunRecord) => void;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

interface LayoutHistory {
  id: string;
  name: string;
  runs: SimulationRunRecord[];
  score: number | null;
  rank: number | null;
}

interface ScenarioHistory {
  key: string;
  label: string;
  layouts: LayoutHistory[];
  latestRunAt: number;
}

interface WarehouseHistory {
  name: string;
  scenarios: ScenarioHistory[];
}

const scenarioKey = (run: SimulationRunRecord) =>
  JSON.stringify([run.settings.orders, run.settings.walkingSpeed, run.settings.pickSeconds]);

const scoreLayouts = (layouts: LayoutHistory[]) => {
  if (layouts.length < 2) {
    layouts.forEach(layout => {
      layout.score = null;
      layout.rank = null;
    });
    return;
  }

  const latestRuns = layouts.map(layout => layout.runs[0]);
  const metricValues = [
    latestRuns.map(run => run.result.metrics.averageDistance),
    latestRuns.map(run => run.result.metrics.completionMinutes),
    latestRuns.map(run => run.result.metrics.throughput),
  ];
  const normalized = metricValues.map((values, metricIndex) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return values.map(() => 100);
    return values.map(value => metricIndex < 2
      ? (max - value) / (max - min) * 100
      : (value - min) / (max - min) * 100);
  });

  layouts.forEach((layout, index) => {
    const latest = latestRuns[index];
    const shelfCount = latest.layout.cells.filter(cell => cell === 'shelf').length;
    const reachableShare = shelfCount === 0
      ? 0
      : Math.max(0, shelfCount - latest.result.metrics.unreachableShelves) / shelfCount * 100;
    layout.score = (
      normalized[0][index]
      + normalized[1][index]
      + normalized[2][index]
      + reachableShare
    ) / 4;
  });

  const ranked = [...layouts].sort((first, second) =>
    (second.score ?? 0) - (first.score ?? 0) || first.name.localeCompare(second.name),
  );
  let rank = 0;
  let previousScore: number | null = null;
  ranked.forEach((layout, index) => {
    if (layout.score !== previousScore) rank = index + 1;
    layout.rank = rank;
    previousScore = layout.score;
  });
};

export const Comparison: React.FC<Props> = ({ runs, loading, error, onLoad, onDelete, onRefresh }) => {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const groups = useMemo<WarehouseHistory[]>(() => {
    const warehouses = new Map<string, Map<string, LayoutHistory>>();
    for (const run of runs) {
      if (!warehouses.has(run.warehouse_name)) warehouses.set(run.warehouse_name, new Map());
      const layouts = warehouses.get(run.warehouse_name)!;
      if (!layouts.has(run.warehouse_layout_id)) {
        layouts.set(run.warehouse_layout_id, {
          id: run.warehouse_layout_id,
          name: run.layout_name,
          runs: [],
          score: null,
          rank: null,
        });
      }
      const layout = layouts.get(run.warehouse_layout_id)!;
      layout.runs.push(run);
      if (run.created_at > layout.runs[0].created_at) layout.name = run.layout_name;
    }
    return [...warehouses.entries()].map(([name, layoutsById]) => {
      const layouts = [...layoutsById.values()];
      layouts.forEach(layout => layout.runs.sort((first, second) => second.created_at - first.created_at));
      const scenariosByKey = new Map<string, ScenarioHistory>();
      for (const layout of layouts) {
        const latest = layout.runs[0];
        const key = scenarioKey(latest);
        if (!scenariosByKey.has(key)) {
          scenariosByKey.set(key, {
            key,
            label: `${latest.settings.orders.toLocaleString()} orders · ${latest.settings.walkingSpeed} m/s · ${latest.settings.pickSeconds}s pick time`,
            layouts: [],
            latestRunAt: latest.created_at,
          });
        }
        const scenario = scenariosByKey.get(key)!;
        scenario.layouts.push(layout);
        scenario.latestRunAt = Math.max(scenario.latestRunAt, latest.created_at);
      }
      const scenarios = [...scenariosByKey.values()];
      scenarios.forEach(scenario => {
        scoreLayouts(scenario.layouts);
        scenario.layouts.sort((first, second) =>
          (second.score ?? -1) - (first.score ?? -1) || first.name.localeCompare(second.name),
        );
      });
      scenarios.sort((first, second) => second.latestRunAt - first.latestRunAt);
      return { name, scenarios };
    });
  }, [runs]);

  const toggle = (id: string) => {
    setCollapsed(current => current.includes(id)
      ? current.filter(value => value !== id)
      : [...current, id]);
  };

  if (loading && runs.length === 0) {
    return <div className="comparison-state"><LoaderCircle className="comparison-spinner" size={24} /><b>Loading simulation history</b><span>Your saved warehouse runs will appear here.</span></div>;
  }
  if (error && runs.length === 0) {
    return <div className="comparison-state comparison-error"><AlertCircle size={24} /><b>Could not load comparison history</b><span>{error}</span><button type="button" className="btn btn-outline btn-sm" onClick={onRefresh}>Try again</button></div>;
  }
  if (!runs.length) {
    return <div className="comparison-state"><span className="comparison-empty-icon"><BarChart3 size={24} /></span><b>No simulation runs yet</b><span>Design and save a warehouse layout, then run a simulation. Each run will be stored here under its warehouse and layout.</span></div>;
  }

  return (
    <div className="comparison-page">
      <header className="comparison-heading">
        <div><span className="comparison-eyebrow"><BarChart3 size={14} /> PERFORMANCE HISTORY</span><h1>Compare warehouse layouts</h1><p>Every saved simulation run, grouped by warehouse and the layout it tested.</p><small className="comparison-score-explainer">Balanced score (0–100): 25% each for average travel, completion time, throughput, and reachable shelves. Scores compare latest runs with matching settings; lower travel and time score higher.</small></div>
        <div className="comparison-totals"><span><b>{groups.length}</b> warehouses</span><span><b>{runs.length}</b> simulation runs</span><button type="button" onClick={onRefresh} disabled={loading}><LoaderCircle size={14} className={loading ? 'comparison-spinner' : ''} /> Refresh</button></div>
      </header>
      {error && <div className="comparison-inline-error"><AlertCircle size={14} />Showing the last loaded history. {error}</div>}
      <div className="comparison-warehouse-list">
        {groups.map(group => {
          const groupLayouts = group.scenarios.flatMap(scenario => scenario.layouts);
          const groupRuns = groupLayouts.flatMap(layout => layout.runs);
          const groupId = `warehouse-${group.name}`;
          return (
            <section className="comparison-warehouse" key={group.name}>
              <button type="button" className="comparison-warehouse-heading" onClick={() => toggle(groupId)} aria-expanded={!collapsed.includes(groupId)}>
                <span className="comparison-warehouse-icon"><Warehouse size={18} /></span>
                <span className="comparison-warehouse-name"><b>{group.name}</b><small>{groupLayouts.length} {groupLayouts.length === 1 ? 'layout' : 'layouts'} · {groupRuns.length} {groupRuns.length === 1 ? 'run' : 'runs'}</small></span>
                <span className="comparison-warehouse-latest">Latest run · {new Date(groupRuns[0].created_at * 1000).toLocaleString()}</span>
                <ChevronDown size={17} className={collapsed.includes(groupId) ? '' : 'is-open'} />
              </button>
              {!collapsed.includes(groupId) && (
                <div className="comparison-layouts">
                  {group.scenarios.map(scenario => (
                    <section className="comparison-scenario" key={scenario.key}>
                      <div className="comparison-scenario-heading"><b>Ranked for matching settings</b><span>{scenario.label}</span></div>
                      {scenario.layouts.map(layout => {
                        const layoutGroupId = `${groupId}-${layout.id}`;
                        const latest = layout.runs[0];
                        return (
                          <article className="comparison-layout" key={layout.id}>
                            <button type="button" className="comparison-layout-heading" onClick={() => toggle(layoutGroupId)} aria-expanded={!collapsed.includes(layoutGroupId)}>
                              <span className="comparison-layout-mark"><Layers3 size={15} /></span>
                              <span><b>{layout.name}</b><small>{latest.layout.width} × {latest.layout.height} simulation grid · {layout.runs.length} {layout.runs.length === 1 ? 'run' : 'runs'}</small></span>
                              <span className="comparison-latest-metric"><small>AVG. TRAVEL</small><b>{latest.result.metrics.averageDistance.toFixed(1)} m</b></span>
                              <span className="comparison-latest-metric"><small>COMPLETION</small><b>{latest.result.metrics.completionMinutes.toFixed(1)} min</b></span>
                              <span className="comparison-latest-metric"><small>SPACE USED</small><b>{latest.result.metrics.spaceUtilization.toFixed(1)}%</b></span>
                              <span className="comparison-latest-metric"><small>THROUGHPUT</small><b>{latest.result.metrics.throughput.toFixed(1)}/h</b></span>
                              <span className="comparison-latest-metric comparison-score-metric"><small>BALANCED SCORE</small><b>{layout.score === null ? '—' : `${layout.score.toFixed(1)}/100`}</b><em>{layout.rank === null ? 'Need another matching layout' : `Rank #${layout.rank} of ${scenario.layouts.length}`}</em></span>
                              <ChevronDown size={15} className={collapsed.includes(layoutGroupId) ? '' : 'is-open'} />
                            </button>
                            {!collapsed.includes(layoutGroupId) && (
                              <div className="comparison-runs">
                                {layout.runs.map((run, index) => (
                                  <div className="comparison-run" key={run.id}>
                                    <div className="comparison-run-date"><span>{index === 0 && <i />}{new Date(run.created_at * 1000).toLocaleString()}</span></div>
                                    <div className="comparison-run-actions">
                                      <button type="button" onClick={() => onLoad(run)}>View results</button>
                                      <button type="button" className="is-delete" title="Delete this simulation run" aria-label={`Delete run from ${new Date(run.created_at * 1000).toLocaleString()}`} onClick={() => void onDelete(run.id)}><Trash2 size={14} /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </section>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
