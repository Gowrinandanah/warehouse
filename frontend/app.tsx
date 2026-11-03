import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Boxes, FlaskConical, RotateCcw } from 'lucide-react';
import { LayoutWizard } from './components/LayoutWizard';
import { SimulationPanel } from './components/SimulationPanel';
import { Comparison } from './components/Comparison';
import { AuthScreen } from './components/AuthScreen';
import type { AuthUser } from './components/AuthScreen';
import { runSimulation } from './utils/simulation';
import type { Layout, SimulationResult, SimulationRunRecord, SimulationSettings, WarehousePlan } from './types';

const demoLayout = (): Layout => {
  const width = 16, height = 10, cells: Layout['cells'] = Array(width * height).fill('empty');
  for (const x of [3,4,7,8,11,12]) for (let y = 2; y <= 7; y++) cells[y * width + x] = 'shelf';
  cells[8 * width + 1] = 'station'; cells[8 * width + 14] = 'station';
  for (let x = 0; x < width; x++) cells[x] = 'obstacle';
  cells[width - 1] = 'empty';
  return { width, height, cells };
};
const WarehouseApp: React.FC<{ user: AuthUser; onSignOut: () => Promise<void> }> = ({ user, onSignOut }) => {
  const [tab, setTab] = useState<'design'|'simulate'|'compare'>('design');
  const [layout, setLayout] = useState<Layout>(demoLayout);
  const [settings, setSettings] = useState<SimulationSettings>({ orders: 120, walkingSpeed: 1.2, pickSeconds: 12 });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [layoutContext, setLayoutContext] = useState<{
    warehouseLayoutId: string | null;
    warehouseName: string;
    layoutName: string;
    plan: WarehousePlan | null;
  }>({ warehouseLayoutId: null, warehouseName: 'Demo warehouse', layoutName: 'Demo floor', plan: null });
  const [runs, setRuns] = useState<SimulationRunRecord[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [runStatus, setRunStatus] = useState('');
  const [status, setStatus] = useState('');

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    setRunsError('');
    try {
      const response = await fetch('/api/simulation-runs', { credentials: 'include' });
      if (!response.ok) throw new Error(`Could not load simulation history (${response.status}).`);
      setRuns(await response.json() as SimulationRunRecord[]);
    } catch (error) {
      setRunsError(error instanceof Error ? error.message : 'Could not load simulation history.');
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => { void loadRuns(); }, [loadRuns]);

  const ensureSavedLayout = async () => {
    if (layoutContext.warehouseLayoutId) return layoutContext.warehouseLayoutId;
    const plan = layoutContext.plan ?? {
      name: layoutContext.layoutName,
      warehouseName: layoutContext.warehouseName,
      length: layout.width * (layout.metersPerCell ?? 1),
      width: layout.height * (layout.metersPerCell ?? 1),
      objects: [],
      snapToGrid: true,
    };
    const response = await fetch('/api/layouts', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: layoutContext.layoutName, data: plan }),
    });
    if (!response.ok) throw new Error(`Could not save this layout (${response.status}).`);
    const saved = await response.json() as { id: string };
    setLayoutContext(current => ({ ...current, warehouseLayoutId: saved.id }));
    return saved.id;
  };

  const run = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setRunError('');
    setRunStatus('');
    const nextResult = runSimulation(layout, settings);
    setResult(nextResult);
    try {
      const warehouseLayoutId = await ensureSavedLayout();
      const response = await fetch('/api/simulation-runs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_layout_id: warehouseLayoutId,
          warehouse_name: layoutContext.warehouseName,
          layout_name: layoutContext.layoutName,
          layout,
          plan: layoutContext.plan,
          settings,
          result: nextResult,
        }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail ?? `Could not save simulation result (${response.status}).`);
      }
      setRunStatus('Simulation complete and saved to comparison history.');
      await loadRuns();
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Simulation ran, but its result could not be saved.');
    } finally {
      setIsRunning(false);
    }
  };

  const removeRun = async (id: string) => {
    setRunsError('');
    try {
      const response = await fetch(`/api/simulation-runs/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Could not delete simulation run (${response.status}).`);
      setRuns(current => current.filter(run => run.id !== id));
    } catch (error) {
      setRunsError(error instanceof Error ? error.message : 'Could not delete simulation run.');
    }
  };

  const loadRun = (run: SimulationRunRecord) => {
    setLayout(run.layout);
    setSettings(run.settings);
    setResult(run.result);
    setLayoutContext({
      warehouseLayoutId: run.warehouse_layout_id,
      warehouseName: run.warehouse_name,
      layoutName: run.layout_name,
      plan: run.plan,
    });
    setRunStatus(`Showing saved results from ${new Date(run.created_at * 1000).toLocaleString()}.`);
    setRunError('');
    setTab('simulate');
  };

  const resetDemo = () => {
    setLayout(demoLayout());
    setLayoutContext({ warehouseLayoutId: null, warehouseName: 'Demo warehouse', layoutName: 'Demo floor', plan: null });
    setResult(null);
    setRunStatus('');
    setRunError('');
  };

  return <main className="min-h-screen bg-base-100 text-base-content p-3 sm:p-5">
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="tabs tabs-boxed bg-base-200">
          <button className={`tab gap-2 ${tab === 'design' ? 'tab-active' : ''}`} onClick={() => setTab('design')}><Boxes size={16}/>Design</button>
          <button className={`tab gap-2 ${tab === 'simulate' ? 'tab-active' : ''}`} onClick={() => setTab('simulate')}><FlaskConical size={16}/>Simulate</button>
          <button className={`tab gap-2 ${tab === 'compare' ? 'tab-active' : ''}`} onClick={() => { setTab('compare'); void loadRuns(); }}><BarChart3 size={16}/>Compare <span className="badge badge-sm">{runs.length}</span></button>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-base-content/60 sm:inline">{user.full_name}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { void onSignOut(); }}>Sign out</button>
          {tab === 'simulate' && <button className="btn btn-ghost btn-sm" onClick={resetDemo}><RotateCcw size={16}/>Reset simulation demo</button>}
        </div>
      </div>
      {status && <div className="alert py-2 text-sm"><span>{status}</span><button className="btn btn-ghost btn-xs" onClick={() => setStatus('')}>Dismiss</button></div>}
      {tab === 'design' && <LayoutWizard onProceed={(nextLayout, metadata) => { setLayout(nextLayout); setLayoutContext(metadata); setResult(null); setRunError(''); setRunStatus('Layout saved. Set your assumptions and run a simulation.'); setTab('simulate'); }}/>}
      {tab === 'simulate' && <SimulationPanel layout={layout} warehouseName={layoutContext.warehouseName} layoutName={layoutContext.layoutName} settings={settings} onSettings={setSettings} result={result} isRunning={isRunning} runStatus={runStatus} runError={runError} onRun={() => { void run(); }}/>} 
      {tab === 'compare' && <Comparison runs={runs} loading={runsLoading} error={runsError} onLoad={loadRun} onDelete={removeRun} onRefresh={() => { void loadRuns(); }}/>} 
    </div>
  </main>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const checkSession = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.status === 401) {
        setUser(null);
      } else if (!response.ok) {
        throw new Error(`The sign-in service returned an error (${response.status}).`);
      } else {
        setUser(await response.json() as AuthUser);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not reach the sign-in service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void checkSession(); }, []);

  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error(`Sign out failed (${response.status}).`);
      setUser(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not sign out.');
    }
  };

  if (loading) {
    return <main className="auth-loading"><span className="loading loading-spinner loading-md" aria-label="Checking your session" /></main>;
  }
  if (error) {
    return <main className="auth-loading"><div className="auth-service-error" role="alert"><h1>Sign-in service unavailable</h1><p>{error}</p><button className="auth-submit" onClick={() => void checkSession()}>Try again</button></div></main>;
  }
  if (!user) return <AuthScreen onAuthenticated={setUser} />;
  return <WarehouseApp user={user} onSignOut={signOut} />;
};

createRoot(document.getElementById('root')!).render(<App/>);
