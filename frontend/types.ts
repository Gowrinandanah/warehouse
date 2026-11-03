export type CellKind = 'empty' | 'shelf' | 'station' | 'obstacle';
export type ToolKind = Exclude<CellKind, 'empty'> | 'eraser';

export interface Point { x: number; y: number }
export interface Layout {
  width: number;
  height: number;
  cells: CellKind[];
  metersPerCell?: number;
  footprintPercent?: number;
}
export type WarehouseObjectCategory =
  | 'structure'
  | 'storage'
  | 'workstation'
  | 'path'
  | 'equipment'
  | 'facility';
export type WarehouseProperty = string | number;
export interface WarehouseObject {
  id: string;
  type: string;
  category: WarehouseObjectCategory;
  name: string;
  x: number;
  y: number;
  length: number;
  width: number;
  rotation: number;
  properties: Record<string, WarehouseProperty>;
}
export interface WarehousePlan {
  name: string;
  warehouseName?: string;
  length: number;
  width: number;
  objects: WarehouseObject[];
  snapToGrid: boolean;
}
export interface SimulationSettings { orders: number; walkingSpeed: number; pickSeconds: number }
export interface Metrics {
  totalDistance: number;
  averageDistance: number;
  completionMinutes: number;
  throughput: number;
  spaceUtilization: number;
  unreachableShelves: number;
}
export interface SimulationResult {
  metrics: Metrics;
  visits: number[];
  completedOrders: number;
}
export interface Scenario {
  id: string;
  name: string;
  layout: Layout;
  settings: SimulationSettings;
  result: SimulationResult;
  createdAt: string;
}
export interface SimulationRunRecord {
  id: string;
  warehouse_layout_id: string;
  warehouse_name: string;
  layout_name: string;
  layout: Layout;
  plan: WarehousePlan | null;
  settings: SimulationSettings;
  result: SimulationResult;
  created_at: number;
}
