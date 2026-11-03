import React, { useState } from 'react';
import { Box, Eraser, Package, PanelTop, Redo2, Trash2 } from 'lucide-react';
import type { Layout, SimulationResult, ToolKind } from '../types';

interface Props { layout: Layout; onChange: (layout: Layout) => void; result: SimulationResult | null }
const tools: { id: ToolKind; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'shelf', label: 'Shelf', icon: <Package size={17}/>, hint: 'Storage rack' },
  { id: 'station', label: 'Station', icon: <PanelTop size={17}/>, hint: 'Pick/dispatch point' },
  { id: 'obstacle', label: 'Blocked', icon: <Box size={17}/>, hint: 'Wall or obstruction' },
  { id: 'eraser', label: 'Erase', icon: <Eraser size={17}/>, hint: 'Clear cells' },
];

export const LayoutDesigner: React.FC<Props> = ({ layout, onChange, result }) => {
  const [tool, setTool] = useState<ToolKind>('shelf');
  const [painting, setPainting] = useState(false);
  const paint = (i: number) => {
    const next = [...layout.cells];
    next[i] = tool === 'eraser' ? 'empty' : tool;
    onChange({ ...layout, cells: next });
  };
  const resize = (width: number, height: number) => {
    const cells = Array(width * height).fill('empty') as Layout['cells'];
    for (let y = 0; y < Math.min(height, layout.height); y++)
      for (let x = 0; x < Math.min(width, layout.width); x++) cells[y * width + x] = layout.cells[y * layout.width + x];
    onChange({ width, height, cells });
  };
  const maxVisit = Math.max(1, ...(result?.visits || [1]));
  return <div className="grid gap-4 xl:grid-cols-[210px_1fr]">
    <aside className="card bg-base-200"><div className="card-body p-4 gap-4">
      <div><div className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Place objects</div>
        <div className="grid grid-cols-2 gap-2 pt-2">{tools.map(t => <button key={t.id} title={t.hint} className={`btn btn-sm justify-start ${tool === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTool(t.id)}>{t.icon}{t.label}</button>)}</div>
      </div>
      <div className="divider my-0"/>
      <div><div className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Floor size</div>
        <div className="flex items-center gap-2 pt-2"><input aria-label="Width" className="input input-bordered input-sm w-16" type="number" min="6" max="24" value={layout.width} onChange={e => resize(Math.max(6, Math.min(24, Number(e.target.value))), layout.height)}/><span className="opacity-50">×</span><input aria-label="Height" className="input input-bordered input-sm w-16" type="number" min="6" max="18" value={layout.height} onChange={e => resize(layout.width, Math.max(6, Math.min(18, Number(e.target.value))))}/></div>
      </div>
      <button className="btn btn-outline btn-sm" onClick={() => onChange({ ...layout, cells: Array(layout.width * layout.height).fill('empty') })}><Trash2 size={16}/>Clear floor</button>
      <div className="rounded-box bg-base-300 p-3 text-xs text-base-content/60"><strong className="text-base-content">Tip:</strong> Drag across cells to draw quickly. Keep aisles between shelf rows.</div>
    </div></aside>
    <section className="card bg-base-200 min-w-0"><div className="card-body p-3 sm:p-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Warehouse floor</h2><p className="text-xs text-base-content/50">Each cell represents 1 m²</p></div>{result && <span className="badge badge-secondary gap-1"><Redo2 size={13}/> route heatmap</span>}</div>
      <div className="overflow-auto rounded-box bg-base-300 p-3 select-none" onMouseLeave={() => setPainting(false)} onMouseUp={() => setPainting(false)}>
        <div className="warehouse-grid" style={{ gridTemplateColumns: `repeat(${layout.width}, minmax(24px, 1fr))`, minWidth: layout.width * 28 }}>
          {layout.cells.map((cell, i) => {
            const heat = result ? result.visits[i] / maxVisit : 0;
            return <button key={i} aria-label={`${cell} cell`} className={`warehouse-cell cell-${cell}`} style={{ boxShadow: heat > 0 && cell === 'empty' ? `inset 0 0 0 999px color-mix(in srgb, currentColor ${Math.round(10 + heat * 35)}%, transparent)` : undefined }} onMouseDown={() => { setPainting(true); paint(i); }} onMouseEnter={() => painting && paint(i)}>{cell === 'shelf' ? '▥' : cell === 'station' ? 'S' : cell === 'obstacle' ? '×' : ''}</button>
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-base-content/60"><span><i className="legend bg-primary"/>Shelf</span><span><i className="legend bg-secondary"/>Station</span><span><i className="legend bg-neutral"/>Blocked</span><span><i className="legend bg-info/40"/>Traffic</span></div>
    </div></section>
  </div>;
};
