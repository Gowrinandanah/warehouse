import React, { useMemo, useState } from 'react';
import { AlertCircle, BarChart3, ChevronDown, Clock3, Layers3, LoaderCircle, Trash2, Warehouse } from 'lucide-react';
import type { SimulationRunRecord } from '../types';

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
}

interface WarehouseHistory {
  name: string;
  layouts: LayoutHistory[];
}

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
        });
      }
      const layout = layouts.get(run.warehouse_layout_id)!;
      layout.runs.push(run);
      if (run.created_at > layout.runs[0].created_at) layout.name = run.layout_name;
    }
    return [...warehouses.entries()].map(([name, layouts]) => ({
      name,
      layouts: [...layouts.values()].sort((first, second) =>
        second.runs[0].created_at - first.runs[0].created_at,
      ),
    }));
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
        <div><span className="comparison-eyebrow"><BarChart3 size={14} /> PERFORMANCE HISTORY</span><h1>Compare warehouse layouts</h1><p>Every saved simulation run, grouped by warehouse and the layout it tested.</p></div>
        <div className="comparison-totals"><span><b>{groups.length}</b> warehouses</span><span><b>{runs.length}</b> simulation runs</span><button type="button" onClick={onRefresh} disabled={loading}><LoaderCircle size={14} className={loading ? 'comparison-spinner' : ''} /> Refresh</button></div>
      </header>
      {error && <div className="comparison-inline-error"><AlertCircle size={14} />Showing the last loaded history. {error}</div>}
      <div className="comparison-warehouse-list">
        {groups.map(group => {
          const groupRuns = group.layouts.flatMap(layout => layout.runs);
          const groupId = `warehouse-${group.name}`;
          return (
            <section className="comparison-warehouse" key={group.name}>
              <button type="button" className="comparison-warehouse-heading" onClick={() => toggle(groupId)} aria-expanded={!collapsed.includes(groupId)}>
                <span className="comparison-warehouse-icon"><Warehouse size={18} /></span>
                <span className="comparison-warehouse-name"><b>{group.name}</b><small>{group.layouts.length} {group.layouts.length === 1 ? 'layout' : 'layouts'} · {groupRuns.length} {groupRuns.length === 1 ? 'run' : 'runs'}</small></span>
                <span className="comparison-warehouse-latest">Latest run · {new Date(groupRuns[0].created_at * 1000).toLocaleString()}</span>
                <ChevronDown size={17} className={collapsed.includes(groupId) ? '' : 'is-open'} />
              </button>
              {!collapsed.includes(groupId) && (
                <div className="comparison-layouts">
                  {group.layouts.map(layout => {
                    const layoutGroupId = `${groupId}-${layout.id}`;
                    const latest = layout.runs[0];
                    return (
                      <article className="comparison-layout" key={layout.id}>
                        <button type="button" className="comparison-layout-heading" onClick={() => toggle(layoutGroupId)} aria-expanded={!collapsed.includes(layoutGroupId)}>
                          <span className="comparison-layout-mark"><Layers3 size={15} /></span>
                          <span><b>{layout.name}</b><small>{latest.layout.width} × {latest.layout.height} simulation grid · {layout.runs.length} {layout.runs.length === 1 ? 'run' : 'runs'}</small></span>
                          <span className="comparison-latest-metric"><small>LATEST AVG. TRAVEL</small><b>{latest.result.metrics.averageDistance.toFixed(1)} m</b></span>
                          <ChevronDown size={15} className={collapsed.includes(layoutGroupId) ? '' : 'is-open'} />
                        </button>
                        {!collapsed.includes(layoutGroupId) && (
                          <div className="comparison-runs">
                            {layout.runs.map((run, index) => (
                              <div className="comparison-run" key={run.id}>
                                <div className="comparison-run-date"><span>{index === 0 && <i />}{new Date(run.created_at * 1000).toLocaleString()}</span><small>{run.settings.orders.toLocaleString()} orders · {run.settings.walkingSpeed} m/s · {run.settings.pickSeconds}s pick</small></div>
                                <div className="comparison-run-metric"><small>TRAVEL</small><b>{run.result.metrics.totalDistance.toFixed(0)} m</b><span>{run.result.metrics.averageDistance.toFixed(1)} m avg</span></div>
                                <div className="comparison-run-metric"><small>COMPLETION</small><b>{run.result.metrics.completionMinutes.toFixed(1)} min</b><span>{run.result.completedOrders.toLocaleString()} completed</span></div>
                                <div className="comparison-run-metric"><small>THROUGHPUT</small><b>{run.result.metrics.throughput.toFixed(1)}/h</b><span>{run.result.metrics.spaceUtilization.toFixed(1)}% floor used</span></div>
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
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
