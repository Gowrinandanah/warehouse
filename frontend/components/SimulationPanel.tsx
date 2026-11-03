import React from 'react';
import { AlertTriangle, CheckCircle2, Gauge, Play, Route, Warehouse } from 'lucide-react';
import type { Layout, SimulationResult, SimulationSettings } from '../types';

interface Props {
  layout: Layout;
  warehouseName: string;
  layoutName: string;
  settings: SimulationSettings;
  onSettings: (settings: SimulationSettings) => void;
  result: SimulationResult | null;
  isRunning: boolean;
  runStatus: string;
  runError: string;
  onRun: () => void;
}

const Metric: React.FC<{ label: string; value: string; note: string }> = ({ label, value, note }) => (
  <div className="simulation-metric">
    <span>{label}</span>
    <b>{value}</b>
    <small>{note}</small>
  </div>
);

export const SimulationPanel: React.FC<Props> = ({
  layout,
  warehouseName,
  layoutName,
  settings,
  onSettings,
  result,
  isRunning,
  runStatus,
  runError,
  onRun,
}) => {
  const maxVisit = Math.max(1, ...(result?.visits ?? [0]));

  return (
    <div className="simulation-page">
      <header className="simulation-heading">
        <div>
          <span className="simulation-eyebrow"><Warehouse size={14} /> WAREHOUSE DIGITAL TWIN / SIMULATION</span>
          <h1>Run your warehouse scenario</h1>
          <p>Estimate pick-route distance, workload and throughput from the saved floor layout.</p>
        </div>
        <div className="simulation-layout-chip"><span>{warehouseName}</span><b>{layoutName}</b></div>
      </header>

      <section className="simulation-controls">
        <div className="simulation-controls-title"><span>SCENARIO INPUTS</span><small>Adjust assumptions, then run again</small></div>
        <div className="simulation-controls-row">
          <label><span>Orders to simulate</span><input type="number" min="1" max="5000" value={settings.orders} onChange={event => onSettings({ ...settings, orders: Math.max(1, Math.min(5000, Number(event.target.value) || 1)) })} /></label>
          <label><span>Walking speed</span><div className="simulation-input-suffix"><input type="number" min="0.1" max="3" step="0.1" value={settings.walkingSpeed} onChange={event => onSettings({ ...settings, walkingSpeed: Math.max(0.1, Math.min(3, Number(event.target.value) || 0.1)) })} /><small>m/s</small></div></label>
          <label><span>Pick time per order</span><div className="simulation-input-suffix"><input type="number" min="1" max="300" value={settings.pickSeconds} onChange={event => onSettings({ ...settings, pickSeconds: Math.max(1, Math.min(300, Number(event.target.value) || 1)) })} /><small>sec</small></div></label>
          <button type="button" className="simulation-run-button" onClick={onRun} disabled={isRunning}>
            {isRunning ? <span className="loading loading-spinner loading-xs" /> : <Play size={16} />}
            {isRunning ? 'Running…' : result ? 'Run again' : 'Run simulation'}
          </button>
        </div>
        <p className="simulation-model-note">Route distances are estimates from a simplified grid representation. Each run is saved to your comparison history.</p>
      </section>

      {runError && <div className="simulation-error" role="alert"><AlertTriangle size={16} />{runError}</div>}
      {runStatus && !runError && <div className="simulation-run-status"><CheckCircle2 size={15} />{runStatus}</div>}

      {!result ? (
        <section className="simulation-empty">
          <span><Gauge size={25} /></span>
          <h2>Ready to test this layout</h2>
          <p>Your saved warehouse floor is ready. Set your assumptions and run a simulation to see estimated performance.</p>
        </section>
      ) : (
        <>
          {result.metrics.unreachableShelves > 0 && (
            <div className="simulation-warning"><AlertTriangle size={16} /><span>{result.metrics.unreachableShelves} storage cell(s) could not be reached. Check the aisle layout and obstacles.</span></div>
          )}
          {result.completedOrders === 0 && !result.metrics.unreachableShelves && (
            <div className="simulation-warning"><AlertTriangle size={16} /><span>Add storage and a reachable workstation to the layout before expecting completed orders.</span></div>
          )}
          <section className="simulation-results-heading">
            <div><span className="simulation-eyebrow"><Route size={14} /> SIMULATION RESULTS</span><h2>Estimated operation performance</h2></div>
            <span className="simulation-completed">{result.completedOrders.toLocaleString()} orders completed</span>
          </section>
          <div className="simulation-metrics">
            <Metric label="Total travel" value={`${result.metrics.totalDistance.toFixed(0)} m`} note="Round-trip route distance" />
            <Metric label="Average per order" value={`${result.metrics.averageDistance.toFixed(1)} m`} note="Estimated travel per order" />
            <Metric label="Completion time" value={`${result.metrics.completionMinutes.toFixed(1)} min`} note={`${settings.orders.toLocaleString()} orders`}/>
            <Metric label="Throughput" value={`${result.metrics.throughput.toFixed(1)}/h`} note="Estimated orders per hour" />
            <Metric label="Storage footprint" value={`${result.metrics.spaceUtilization.toFixed(1)}%`} note="Warehouse floor utilization" />
          </div>

          <section className="simulation-heatmap-card">
            <div className="simulation-heatmap-heading"><div><span className="simulation-eyebrow">ROUTE ACTIVITY</span><h2>Warehouse movement heatmap</h2><p>Cells with more route visits are shown with a stronger highlight.</p></div><div className="simulation-heat-legend"><span><i className="heat-low" />LOW</span><span><i className="heat-high" />HIGH</span></div></div>
            <div className="simulation-map-scroll">
              <div className="simulation-map" role="img" aria-label="Warehouse simulation route activity heatmap" style={{ gridTemplateColumns: `repeat(${layout.width}, minmax(14px, 1fr))`, minWidth: `${layout.width * 17}px` }}>
                {layout.cells.map((cell, index) => {
                  const heat = result.visits[index] / maxVisit;
                  const fill = cell === 'shelf'
                    ? '#7688a8'
                    : cell === 'station'
                      ? '#d2a15c'
                      : cell === 'obstacle'
                        ? '#48574e'
                        : heat > 0 ? `rgba(217, 115, 64, ${0.12 + heat * 0.78})` : '#f1f3ef';
                  return <i key={index} className={`simulation-cell cell-${cell}`} style={{ backgroundColor: fill }} title={`${cell}${result.visits[index] ? ` · ${result.visits[index]} route visits` : ''}`} />;
                })}
              </div>
            </div>
            <div className="simulation-map-legend"><span><i className="legend-shelf" />Storage</span><span><i className="legend-station" />Work area</span><span><i className="legend-obstacle" />Blocked</span><span><i className="legend-route" />Pick route</span></div>
          </section>
        </>
      )}
    </div>
  );
};
