import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronDown,
  Copy, Download, Eye, FileText, Grid2X2, LayoutTemplate, Plus,
  Redo2, RotateCw, Save, Trash2, Undo2, Warehouse, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import type {
  Layout, WarehouseObject, WarehouseObjectCategory, WarehousePlan,
  WarehouseProperty,
} from '../types';

interface Props {
  onProceed: (layout: Layout, metadata: {
    warehouseLayoutId: string;
    warehouseName: string;
    layoutName: string;
    plan: WarehousePlan;
  }) => void;
}

interface CatalogItem {
  type: string;
  label: string;
  category: WarehouseObjectCategory;
  group: string;
  length: number;
  width: number;
  properties?: Record<string, WarehouseProperty>;
}

interface SavedPlan {
  id: string;
  name: string;
  data: WarehousePlan;
  is_draft: boolean;
}

const steps = [
  { title: 'Dimensions', caption: 'Start with your floor' },
  { title: 'Structure', caption: 'Doors, walls & flow' },
  { title: 'Storage', caption: 'Racks, bins & stock' },
  { title: 'Work areas', caption: 'People & stations' },
  { title: 'Paths & more', caption: 'Movement & facilities' },
  { title: 'Review', caption: 'Check & save' },
];

const catalog: CatalogItem[] = [
  { type: 'internal-wall', label: 'Internal wall', category: 'structure', group: 'Walls & boundaries', length: 20, width: 1 },
  { type: 'partition', label: 'Partition', category: 'structure', group: 'Walls & boundaries', length: 12, width: 1 },
  { type: 'receiving-entrance', label: 'Receiving entrance', category: 'structure', group: 'Entrances & docks', length: 10, width: 5 },
  { type: 'shipping-exit', label: 'Shipping exit', category: 'structure', group: 'Entrances & docks', length: 10, width: 5 },
  { type: 'personnel-entrance', label: 'Personnel entrance', category: 'structure', group: 'Entrances & docks', length: 5, width: 4 },
  { type: 'emergency-exit', label: 'Emergency exit', category: 'structure', group: 'Entrances & docks', length: 5, width: 4 },
  { type: 'loading-dock', label: 'Loading dock', category: 'structure', group: 'Entrances & docks', length: 12, width: 8 },
  { type: 'truck-dock', label: 'Truck docking position', category: 'structure', group: 'Entrances & docks', length: 16, width: 10 },
  { type: 'receiving-area', label: 'Receiving area', category: 'structure', group: 'Goods handling', length: 24, width: 18 },
  { type: 'inbound-staging', label: 'Inbound staging', category: 'structure', group: 'Goods handling', length: 24, width: 16 },
  { type: 'outbound-staging', label: 'Outbound staging', category: 'structure', group: 'Goods handling', length: 24, width: 16 },
  { type: 'shipping-area', label: 'Shipping / dispatch', category: 'structure', group: 'Goods handling', length: 24, width: 18 },

  { type: 'selective-rack', label: 'Selective pallet rack', category: 'storage', group: 'Pallet & bulk storage', length: 24, width: 4, properties: { levels: 4, capacity: 96, productCategory: 'General', sku: '', quantity: 0, movement: 'A' } },
  { type: 'drive-in-rack', label: 'Drive-in rack', category: 'storage', group: 'Pallet & bulk storage', length: 20, width: 10, properties: { levels: 4, capacity: 120, productCategory: 'General', sku: '', quantity: 0, movement: 'B' } },
  { type: 'bulk-storage', label: 'Bulk / floor stacking', category: 'storage', group: 'Pallet & bulk storage', length: 18, width: 14, properties: { levels: 1, capacity: 50, productCategory: 'General', sku: '', quantity: 0, movement: 'C' } },
  { type: 'shelving', label: 'Shelving unit', category: 'storage', group: 'Small parts & specialist', length: 12, width: 3, properties: { levels: 5, capacity: 240, productCategory: 'Small parts', sku: '', quantity: 0, movement: 'A' } },
  { type: 'bin-storage', label: 'Bin / small-parts storage', category: 'storage', group: 'Small parts & specialist', length: 10, width: 8, properties: { levels: 5, capacity: 500, productCategory: 'Small parts', sku: '', quantity: 0, movement: 'A' } },
  { type: 'mezzanine', label: 'Mezzanine', category: 'storage', group: 'Small parts & specialist', length: 30, width: 20, properties: { levels: 2, capacity: 300, productCategory: 'General', sku: '', quantity: 0, movement: 'B' } },
  { type: 'cold-storage', label: 'Cold storage', category: 'storage', group: 'Controlled & secure', length: 20, width: 16, properties: { levels: 4, capacity: 80, productCategory: 'Temperature controlled', sku: '', quantity: 0, movement: 'B' } },
  { type: 'hazmat-storage', label: 'Hazardous materials', category: 'storage', group: 'Controlled & secure', length: 14, width: 12, properties: { levels: 2, capacity: 40, productCategory: 'Hazardous', sku: '', quantity: 0, movement: 'C' } },
  { type: 'secure-cage', label: 'High-value secure cage', category: 'storage', group: 'Controlled & secure', length: 12, width: 10, properties: { levels: 3, capacity: 60, productCategory: 'High-value', sku: '', quantity: 0, movement: 'B' } },
  { type: 'returns-storage', label: 'Returns storage', category: 'storage', group: 'Returns & quarantine', length: 14, width: 10, properties: { levels: 3, capacity: 60, productCategory: 'Returns', sku: '', quantity: 0, movement: 'C' } },
  { type: 'quarantine-storage', label: 'Quarantine storage', category: 'storage', group: 'Returns & quarantine', length: 12, width: 10, properties: { levels: 2, capacity: 40, productCategory: 'Quarantine', sku: '', quantity: 0, movement: 'C' } },

  { type: 'picking-station', label: 'Picking station', category: 'workstation', group: 'Picking & dispatch', length: 10, width: 8, properties: { workers: 2, averageTaskSeconds: 30, capacity: 100 } },
  { type: 'packing-station', label: 'Packing station', category: 'workstation', group: 'Picking & dispatch', length: 12, width: 8, properties: { workers: 2, averageTaskSeconds: 90, capacity: 40 } },
  { type: 'sorting-station', label: 'Sorting / consolidation', category: 'workstation', group: 'Picking & dispatch', length: 14, width: 10, properties: { workers: 3, averageTaskSeconds: 60, capacity: 60 } },
  { type: 'quality-inspection', label: 'Quality inspection', category: 'workstation', group: 'Processing', length: 10, width: 8, properties: { workers: 2, averageTaskSeconds: 120, capacity: 30 } },
  { type: 'labelling-station', label: 'Labelling station', category: 'workstation', group: 'Processing', length: 8, width: 6, properties: { workers: 1, averageTaskSeconds: 45, capacity: 60 } },
  { type: 'returns-processing', label: 'Returns processing', category: 'workstation', group: 'Processing', length: 14, width: 10, properties: { workers: 2, averageTaskSeconds: 180, capacity: 30 } },
  { type: 'cross-docking', label: 'Cross-docking area', category: 'workstation', group: 'Processing', length: 24, width: 16, properties: { workers: 4, averageTaskSeconds: 45, capacity: 100 } },
  { type: 'value-added', label: 'Kitting / assembly', category: 'workstation', group: 'Processing', length: 18, width: 12, properties: { workers: 3, averageTaskSeconds: 120, capacity: 40 } },
  { type: 'loading-station', label: 'Loading station', category: 'workstation', group: 'Dock operations', length: 14, width: 10, properties: { workers: 3, averageTaskSeconds: 90, capacity: 40 } },
  { type: 'unloading-station', label: 'Unloading station', category: 'workstation', group: 'Dock operations', length: 14, width: 10, properties: { workers: 3, averageTaskSeconds: 90, capacity: 40 } },
  { type: 'equipment-charging', label: 'Equipment charging', category: 'workstation', group: 'Dock operations', length: 12, width: 8, properties: { workers: 1, averageTaskSeconds: 0, capacity: 8 } },

  { type: 'main-aisle', label: 'Main aisle', category: 'path', group: 'Aisles & routes', length: 36, width: 6, properties: { pathWidth: 6, direction: 'two-way', movementType: 'pedestrian' } },
  { type: 'cross-aisle', label: 'Cross aisle', category: 'path', group: 'Aisles & routes', length: 24, width: 5, properties: { pathWidth: 5, direction: 'two-way', movementType: 'pedestrian' } },
  { type: 'narrow-aisle', label: 'Narrow aisle', category: 'path', group: 'Aisles & routes', length: 24, width: 3, properties: { pathWidth: 3, direction: 'two-way', movementType: 'pedestrian' } },
  { type: 'forklift-lane', label: 'Forklift lane', category: 'path', group: 'Aisles & routes', length: 30, width: 4, properties: { pathWidth: 4, direction: 'two-way', movementType: 'forklift' } },
  { type: 'pedestrian-path', label: 'Pedestrian path', category: 'path', group: 'Aisles & routes', length: 24, width: 2, properties: { pathWidth: 2, direction: 'two-way', movementType: 'pedestrian' } },
  { type: 'one-way-path', label: 'One-way route', category: 'path', group: 'Aisles & routes', length: 24, width: 3, properties: { pathWidth: 3, direction: 'one-way', movementType: 'pedestrian' } },
  { type: 'crossing-point', label: 'Designated crossing', category: 'path', group: 'Aisles & routes', length: 6, width: 6, properties: { pathWidth: 6, direction: 'two-way', movementType: 'pedestrian' } },
  { type: 'custom-path', label: 'Custom path', category: 'path', group: 'Draw a route', length: 20, width: 2, properties: { pathWidth: 2, direction: 'two-way', movementType: 'pedestrian', shape: 'custom path' } },
  { type: 'forklift', label: 'Forklift', category: 'equipment', group: 'Vehicles & equipment', length: 5, width: 3, properties: { speed: 2, carryingCapacity: 2000 } },
  { type: 'pallet-jack', label: 'Pallet jack', category: 'equipment', group: 'Vehicles & equipment', length: 4, width: 2, properties: { speed: 1.2, carryingCapacity: 1000 } },
  { type: 'conveyor', label: 'Conveyor', category: 'equipment', group: 'Vehicles & equipment', length: 20, width: 3, properties: { speed: 0.8, carryingCapacity: 500 } },
  { type: 'agv', label: 'AGV', category: 'equipment', group: 'Vehicles & equipment', length: 5, width: 3, properties: { speed: 1.5, carryingCapacity: 800 } },
  { type: 'robot', label: 'Robot', category: 'equipment', group: 'Vehicles & equipment', length: 4, width: 4, properties: { speed: 1, carryingCapacity: 100 } },
  { type: 'material-cart', label: 'Material-handling cart', category: 'equipment', group: 'Vehicles & equipment', length: 4, width: 2, properties: { speed: 1, carryingCapacity: 250 } },
  { type: 'office', label: 'Office', category: 'facility', group: 'People & support', length: 16, width: 12 },
  { type: 'restroom', label: 'Restroom', category: 'facility', group: 'People & support', length: 8, width: 6 },
  { type: 'break-room', label: 'Break room', category: 'facility', group: 'People & support', length: 14, width: 10 },
  { type: 'first-aid', label: 'First-aid station', category: 'facility', group: 'Safety & utilities', length: 6, width: 6 },
  { type: 'fire-extinguisher', label: 'Fire extinguisher point', category: 'facility', group: 'Safety & utilities', length: 2, width: 2 },
  { type: 'safety-zone', label: 'Safety zone', category: 'facility', group: 'Safety & utilities', length: 10, width: 8 },
  { type: 'parking-yard', label: 'Parking / yard', category: 'facility', group: 'Safety & utilities', length: 24, width: 16 },
  { type: 'waste-recycling', label: 'Waste & recycling', category: 'facility', group: 'Safety & utilities', length: 8, width: 6 },
  { type: 'utility-room', label: 'Utility room', category: 'facility', group: 'Safety & utilities', length: 8, width: 8 },
  { type: 'rect-zone', label: 'Rectangular zone', category: 'facility', group: 'Draw a zone', length: 16, width: 12, properties: { shape: 'rectangle' } },
  { type: 'polygon-zone', label: 'Polygon zone', category: 'facility', group: 'Draw a zone', length: 16, width: 12, properties: { shape: 'polygon' } },
  { type: 'l-shaped-zone', label: 'L-shaped zone', category: 'facility', group: 'Draw a zone', length: 16, width: 12, properties: { shape: 'L-shape' } },
];

const makePlan = (): WarehousePlan => ({
  warehouseName: 'My warehouse',
  name: 'Main floor',
  length: 500,
  width: 500,
  objects: [],
  snapToGrid: true,
});

const id = () => `obj-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const labelFor = (type: string) => catalog.find(item => item.type === type)?.label ?? type;
const categoryColor: Record<WarehouseObjectCategory, string> = {
  structure: '#557766',
  storage: '#6f83a8',
  workstation: '#c88c53',
  path: '#a7b98b',
  equipment: '#9176a6',
  facility: '#7f9994',
};
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function isWarehousePlan(data: unknown): data is WarehousePlan {
  if (!data || typeof data !== 'object') return false;
  const plan = data as Partial<WarehousePlan>;
  return typeof plan.name === 'string'
    && typeof plan.length === 'number'
    && typeof plan.width === 'number'
    && Array.isArray(plan.objects);
}

function makeTemplate(template: string, dimensions: Pick<WarehousePlan, 'length' | 'width'>): WarehouseObject[] {
  const mx = dimensions.length;
  const my = dimensions.width;
  const make = (type: string, name: string, x: number, y: number, length: number, width: number): WarehouseObject => {
    const item = catalog.find(entry => entry.type === type)!;
    const objectLength = clamp(length, 1, mx);
    const objectWidth = clamp(width, 1, my);
    return {
      id: id(),
      type,
      category: item.category,
      name,
      x: clamp(x, 0, mx - objectLength),
      y: clamp(y, 0, my - objectWidth),
      length: objectLength,
      width: objectWidth,
      rotation: 0,
      properties: { ...item.properties },
    };
  };
  const padX = Math.max(4, Math.round(mx * 0.04));
  const padY = Math.max(4, Math.round(my * 0.04));
  const zoneL = Math.max(12, Math.round(mx * 0.1));
  const zoneW = Math.max(10, Math.round(my * 0.09));
  const result = [
    make('receiving-area', 'Receiving', padX, padY, zoneL, zoneW),
    make('shipping-area', 'Shipping', mx - padX - zoneL, my - padY - zoneW, zoneL, zoneW),
    make('picking-station', 'Picking station', mx / 2 - 5, my - padY - 12, 10, 8),
    make('receiving-entrance', 'Receiving entrance', padX, 0, zoneL, 5),
    make('shipping-exit', 'Shipping exit', mx - padX - zoneL, my - 5, zoneL, 5),
    make('main-aisle', 'Main aisle', padX + zoneL + 4, my / 2 - 3, mx - 2 * (padX + zoneL + 4), 6),
    make('emergency-exit', 'Emergency exit', mx - 8, my * 0.45, 5, 4),
  ];
  const racks = template === 'u-flow' ? 4 : template === 'l-flow' ? 3 : 5;
  for (let i = 0; i < racks; i++) {
    const x = padX + zoneL + 10 + i * Math.max(14, Math.floor((mx * 0.55) / racks));
    if (x + 24 < mx - padX - zoneL) {
      result.push(make('selective-rack', `Rack ${i + 1}`, x, padY + zoneW + 16, 24, 4));
      result.push(make('selective-rack', `Rack ${i + 1}B`, x, padY + zoneW + 26, 24, 4));
    }
  }
  const aisleX = padX + zoneL + 4;
  const aisleLength = mx - 2 * aisleX;
  result.push(
    make('cross-aisle', 'Storage aisle A', aisleX, padY + zoneW + 7, aisleLength, 5),
    make('cross-aisle', 'Storage aisle B', aisleX, padY + zoneW + 31, aisleLength, 5),
    make('cross-aisle', 'Work area aisle', aisleX, my - padY - 17, aisleLength, 5),
  );
  return result;
}

function inspectPlan(plan: WarehousePlan) {
  const errors: { message: string; objectId?: string }[] = [];
  const warnings: { message: string; objectId?: string }[] = [];
  const hasType = (...types: string[]) => plan.objects.some(object => types.includes(object.type));
  if (!hasType('receiving-area', 'inbound-staging', 'receiving-entrance')) {
    errors.push({ message: 'Add a receiving area or inbound staging area.' });
  }
  if (!hasType('shipping-area', 'outbound-staging', 'shipping-exit')) {
    errors.push({ message: 'Add a shipping, dispatch, or outbound staging area.' });
  }
  if (!plan.objects.some(object => object.category === 'storage')) {
    errors.push({ message: 'Add at least one storage location.' });
  }
  if (!plan.objects.some(object => object.category === 'workstation')) {
    errors.push({ message: 'Add at least one workstation.' });
  }

  const solidObjects = plan.objects.filter(object =>
    object.category !== 'path'
    && object.type !== 'internal-wall'
    && object.type !== 'partition'
    && object.type !== 'fire-extinguisher',
  );
  for (const object of plan.objects) {
    const radians = object.rotation * Math.PI / 180;
    const boundsLength = Math.abs(object.length * Math.cos(radians)) + Math.abs(object.width * Math.sin(radians));
    const boundsWidth = Math.abs(object.width * Math.cos(radians)) + Math.abs(object.length * Math.sin(radians));
    if (object.x < 0 || object.y < 0 || object.x + boundsLength > plan.length || object.y + boundsWidth > plan.width) {
      errors.push({ message: `${object.name} extends beyond the warehouse boundary.`, objectId: object.id });
    }
    for (const path of plan.objects.filter(object => object.category === 'path')) {
      for (const barrier of plan.objects.filter(object => object.type === 'internal-wall' || object.type === 'partition')) {
        const pathRotation = path.rotation * Math.PI / 180;
        const barrierRotation = barrier.rotation * Math.PI / 180;
        const pathLength = Math.abs(path.length * Math.cos(pathRotation)) + Math.abs(path.width * Math.sin(pathRotation));
        const pathWidth = Math.abs(path.width * Math.cos(pathRotation)) + Math.abs(path.length * Math.sin(pathRotation));
        const barrierLength = Math.abs(barrier.length * Math.cos(barrierRotation)) + Math.abs(barrier.width * Math.sin(barrierRotation));
        const barrierWidth = Math.abs(barrier.width * Math.cos(barrierRotation)) + Math.abs(barrier.length * Math.sin(barrierRotation));
        const pathX = path.x + (path.length - pathLength) / 2;
        const pathY = path.y + (path.width - pathWidth) / 2;
        const barrierX = barrier.x + (barrier.length - barrierLength) / 2;
        const barrierY = barrier.y + (barrier.width - barrierWidth) / 2;
        const overlaps = pathX < barrierX + barrierLength
          && pathX + pathLength > barrierX
          && pathY < barrierY + barrierWidth
          && pathY + pathWidth > barrierY;
        if (overlaps) {
          errors.push({ message: `${path.name} is blocked by ${barrier.name}.`, objectId: path.id });
        }
      }
    }
    if (object.category === 'path' && Number(object.properties.pathWidth ?? object.width) < 3) {
      warnings.push({ message: `${object.name} is narrower than 3 m; check clearance for equipment.`, objectId: object.id });
    }
  }
  for (let i = 0; i < solidObjects.length; i++) {
    const first = solidObjects[i];
    for (let j = i + 1; j < solidObjects.length; j++) {
      const second = solidObjects[j];
      const firstRotation = first.rotation * Math.PI / 180;
      const secondRotation = second.rotation * Math.PI / 180;
      const firstLength = Math.abs(first.length * Math.cos(firstRotation)) + Math.abs(first.width * Math.sin(firstRotation));
      const firstWidth = Math.abs(first.width * Math.cos(firstRotation)) + Math.abs(first.length * Math.sin(firstRotation));
      const secondLength = Math.abs(second.length * Math.cos(secondRotation)) + Math.abs(second.width * Math.sin(secondRotation));
      const secondWidth = Math.abs(second.width * Math.cos(secondRotation)) + Math.abs(second.length * Math.sin(secondRotation));
      const firstX = first.x + (first.length - firstLength) / 2;
      const firstY = first.y + (first.width - firstWidth) / 2;
      const secondX = second.x + (second.length - secondLength) / 2;
      const secondY = second.y + (second.width - secondWidth) / 2;
      const overlaps = firstX < secondX + secondLength
        && firstX + firstLength > secondX
        && firstY < secondY + secondWidth
        && firstY + firstWidth > secondY;
      if (overlaps) {
        errors.push({ message: `${first.name} overlaps ${second.name}.`, objectId: second.id });
      }
    }
  }
  if (!hasType('emergency-exit')) warnings.push({ message: 'Add an emergency exit for safer operations.' });
  if (!plan.objects.some(object => object.category === 'path' && object.type.includes('aisle'))) {
    warnings.push({ message: 'Add at least one aisle to connect storage and work areas.' });
  }
  const paths = plan.objects.filter(object => object.category === 'path');
  for (const object of plan.objects.filter(item => item.category === 'storage' || item.category === 'workstation')) {
    const distance = paths.length ? Math.min(...paths.map(path => {
      const dx = Math.max(path.x - (object.x + object.length), object.x - (path.x + path.length), 0);
      const dy = Math.max(path.y - (object.y + object.width), object.y - (path.y + path.width), 0);
      return Math.hypot(dx, dy);
    })) : Infinity;
    if (distance > 25) {
      warnings.push({ message: `${object.name} is far from a defined aisle or path.`, objectId: object.id });
    }
  }
  if (!hasType('receiving-entrance')) warnings.push({ message: 'Mark a receiving entrance for inbound goods.' });
  if (!hasType('shipping-exit')) warnings.push({ message: 'Mark a shipping exit for outbound orders.' });
  return { errors, warnings };
}

function toSimulationLayout(plan: WarehousePlan): Layout {
  const width = 24;
  const height = 18;
  const cells: Layout['cells'] = Array(width * height).fill('empty');
  const place = (object: WarehouseObject, kind: Layout['cells'][number]) => {
    const centerX = object.x + object.length / 2;
    const centerY = object.y + object.width / 2;
    const radians = object.rotation * Math.PI / 180;
    const boundsLength = Math.abs(object.length * Math.cos(radians)) + Math.abs(object.width * Math.sin(radians));
    const boundsWidth = Math.abs(object.width * Math.cos(radians)) + Math.abs(object.length * Math.sin(radians));
    const minX = clamp(Math.floor((centerX - boundsLength / 2) / plan.length * width), 0, width - 1);
    const maxX = clamp(Math.ceil((centerX + boundsLength / 2) / plan.length * width) - 1, minX, width - 1);
    const minY = clamp(Math.floor((centerY - boundsWidth / 2) / plan.width * height), 0, height - 1);
    const maxY = clamp(Math.ceil((centerY + boundsWidth / 2) / plan.width * height) - 1, minY, height - 1);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) cells[y * width + x] = kind;
    }
  };
  for (const object of plan.objects) if (object.category === 'storage') place(object, 'shelf');
  for (const object of plan.objects) {
    if (object.category === 'workstation' || object.type === 'receiving-area' || object.type === 'shipping-area') {
      place(object, 'station');
    }
  }
  for (const object of plan.objects) {
    if (object.type === 'internal-wall' || object.type === 'partition') place(object, 'obstacle');
  }
  const storageArea = plan.objects
    .filter(object => object.category === 'storage')
    .reduce((sum, object) => sum + object.length * object.width, 0);
  return {
    width,
    height,
    cells,
    metersPerCell: (plan.length / width + plan.width / height) / 2,
    footprintPercent: storageArea / (plan.length * plan.width) * 100,
  };
}

export const LayoutWizard: React.FC<Props> = ({ onProceed }) => {
  const [plan, setPlan] = useState<WarehousePlan>(makePlan);
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [currentSavedId, setCurrentSavedId] = useState('');
  const [draftId, setDraftId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('Loading your layouts…');
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const [activeGroup, setActiveGroup] = useState('');
  const [showIssues, setShowIssues] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const readyRef = useRef(false);
  const suppressDraftRef = useRef(false);
  const pastRef = useRef<WarehousePlan[]>([]);
  const futureRef = useRef<WarehousePlan[]>([]);
  const clipboardRef = useRef<WarehouseObject[]>([]);
  const gestureRef = useRef<{
    mode: 'move' | 'resize' | 'pan';
    startX: number;
    startY: number;
    initialObjects: WarehouseObject[];
    id?: string;
  } | null>(null);
  const { errors, warnings } = useMemo(() => inspectPlan(plan), [plan]);
  const selected = plan.objects.filter(object => selectedIds.includes(object.id));
  const selectedObject = selected[0];
  const alignmentGuides = useMemo(() => {
    if (!selectedObject) return { x: [] as number[], y: [] as number[] };
    const anchorsX = [selectedObject.x, selectedObject.x + selectedObject.length, selectedObject.x + selectedObject.length / 2];
    const anchorsY = [selectedObject.y, selectedObject.y + selectedObject.width, selectedObject.y + selectedObject.width / 2];
    const x = new Set<number>();
    const y = new Set<number>();
    for (const other of plan.objects) {
      if (selectedIds.includes(other.id)) continue;
      const otherX = [other.x, other.x + other.length, other.x + other.length / 2];
      const otherY = [other.y, other.y + other.width, other.y + other.width / 2];
      for (const anchor of anchorsX) for (const edge of otherX) if (Math.abs(anchor - edge) <= 1) x.add(edge);
      for (const anchor of anchorsY) for (const edge of otherY) if (Math.abs(anchor - edge) <= 1) y.add(edge);
    }
    return { x: [...x], y: [...y] };
  }, [plan.objects, selectedIds, selectedObject]);
  const objectCounts = useMemo(() => ({
    storage: plan.objects.filter(object => object.category === 'storage').length,
    workstations: plan.objects.filter(object => object.category === 'workstation').length,
    entrances: plan.objects.filter(object => object.type.includes('entrance') || object.type.includes('exit') || object.type.includes('dock')).length,
    equipment: plan.objects.filter(object => object.category === 'equipment').length,
    storageArea: plan.objects.filter(object => object.category === 'storage').reduce((sum, object) => sum + object.length * object.width, 0),
    pathArea: plan.objects.filter(object => object.category === 'path').reduce((sum, object) => sum + object.length * object.width, 0),
  }), [plan.objects]);
  const utilization = Math.min(100, (plan.objects.reduce((sum, object) => sum + object.length * object.width, 0) / (plan.length * plan.width)) * 100);
  const groups = useMemo(() => Array.from(new Set(catalog
    .filter(item => step === 1
      ? item.category === 'structure'
      : step === 2
        ? item.category === 'storage'
        : step === 3
          ? item.category === 'workstation'
          : step === 4 && ['path', 'equipment', 'facility'].includes(item.category))
    .map(item => item.group))), [step]);
  const visibleCatalog = catalog.filter(item => {
    if (step === 1) return item.category === 'structure';
    if (step === 2) return item.category === 'storage';
    if (step === 3) return item.category === 'workstation';
    if (step === 4) return ['path', 'equipment', 'facility'].includes(item.category);
    return false;
  });
  const shownGroups = activeGroup ? groups.filter(group => group === activeGroup) : groups;

  const updatePlan = (next: WarehousePlan, keepHistory = true) => {
    suppressDraftRef.current = false;
    if (keepHistory) {
      pastRef.current.push(plan);
      if (pastRef.current.length > 60) pastRef.current.shift();
      futureRef.current = [];
    }
    setPlan(next);
  };

  const undo = () => {
    const previous = pastRef.current.pop();
    if (previous) {
      futureRef.current.push(plan);
      setPlan(previous);
    }
  };
  const redo = () => {
    const next = futureRef.current.pop();
    if (next) {
      pastRef.current.push(plan);
      setPlan(next);
    }
  };

  const refreshSaved = async () => {
    const response = await fetch('/api/layouts', { credentials: 'include' });
    if (!response.ok) throw new Error('Could not load saved layouts.');
    const data = await response.json() as SavedPlan[];
    setSavedPlans(data);
    return data;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const layouts = await refreshSaved();
        if (!active) return;
        const draft = layouts.find(item => item.is_draft);
        if (draft && isWarehousePlan(draft.data)) {
          setPlan({ ...draft.data, warehouseName: draft.data.warehouseName || draft.data.name });
          setDraftId(draft.id);
          setSnap(draft.data.snapToGrid);
          setSaveState('Draft restored');
        } else {
          setSaveState('Ready to design');
        }
      } catch (error) {
        if (active) setSaveState(error instanceof Error ? error.message : 'Could not load layouts.');
      } finally {
        if (active) {
          readyRef.current = true;
          setLoading(false);
        }
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!readyRef.current || suppressDraftRef.current) return;
    setSaveState('Saving draft…');
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/layouts/draft', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draftId || undefined, name: plan.name, data: plan }),
        });
        if (!response.ok) throw new Error('Draft could not be saved.');
        const saved = await response.json() as { id: string };
        setDraftId(saved.id);
        setSaveState('Draft saved');
      } catch (error) {
        setSaveState(error instanceof Error ? error.message : 'Draft could not be saved.');
      }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [plan, draftId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && selected.length) {
        event.preventDefault();
        clipboardRef.current = selected.map(object => ({ ...object }));
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && clipboardRef.current.length) {
        event.preventDefault();
        const copies = clipboardRef.current.map(object => ({
          ...object,
          id: id(),
          x: Math.min(plan.length - object.length, object.x + 2),
          y: Math.min(plan.width - object.width, object.y + 2),
        }));
        updatePlan({ ...plan, objects: [...plan.objects, ...copies] });
        setSelectedIds(copies.map(object => object.id));
      }
      if (event.key === 'Delete' || event.key === 'Backspace') removeSelected();
      if (event.key === 'Escape') setSelectedIds([]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const addObject = (item: CatalogItem, position?: { x: number; y: number }) => {
    const grid = snap ? 1 : 0.5;
    const x = position?.x ?? plan.length / 2 - item.length / 2;
    const y = position?.y ?? plan.width / 2 - item.width / 2;
    const object: WarehouseObject = {
      id: id(),
      type: item.type,
      category: item.category,
      name: item.label,
      x: clamp(Math.round(x / grid) * grid, 0, plan.length - item.length),
      y: clamp(Math.round(y / grid) * grid, 0, plan.width - item.width),
      length: Math.min(item.length, plan.length),
      width: Math.min(item.width, plan.width),
      rotation: 0,
      properties: { ...item.properties },
    };
    updatePlan({ ...plan, objects: [...plan.objects, object] });
    setSelectedIds([object.id]);
  };

  const removeSelected = () => {
    if (!selectedIds.length) return;
    updatePlan({ ...plan, objects: plan.objects.filter(object => !selectedIds.includes(object.id)) });
    setSelectedIds([]);
  };

  const updateSelected = (changes: Partial<WarehouseObject>, propertyChanges?: Record<string, WarehouseProperty>) => {
    if (!selectedObject) return;
    const next = plan.objects.map(object => {
      if (!selectedIds.includes(object.id)) return object;
      const updated = { ...object, ...changes };
      if (propertyChanges) updated.properties = { ...object.properties, ...propertyChanges };
      updated.x = clamp(updated.x, 0, plan.length - Math.min(updated.length, plan.length));
      updated.y = clamp(updated.y, 0, plan.width - Math.min(updated.width, plan.width));
      updated.length = clamp(updated.length, 1, plan.length);
      updated.width = clamp(updated.width, 1, plan.width);
      return updated;
    });
    updatePlan({ ...plan, objects: next });
  };

  const saveFinal = async (proceed: boolean) => {
    if (errors.length) {
      setShowIssues(true);
      return;
    }
    setSaveState('Saving layout…');
    try {
      const response = await fetch('/api/layouts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentSavedId || draftId || undefined,
          name: plan.name,
          data: plan,
        }),
      });
      if (!response.ok) throw new Error('Layout could not be saved.');
      const saved = await response.json() as { id: string };
      suppressDraftRef.current = true;
      setCurrentSavedId(saved.id);
      setDraftId('');
      await refreshSaved();
      setSaveState('Layout saved');
      if (proceed) onProceed(toSimulationLayout(plan), {
        warehouseLayoutId: saved.id,
        warehouseName: plan.warehouseName?.trim() || 'My warehouse',
        layoutName: plan.name,
        plan,
      });
    } catch (error) {
      setSaveState(error instanceof Error ? error.message : 'Layout could not be saved.');
    }
  };

  const loadSaved = (layoutId: string) => {
    const item = savedPlans.find(saved => saved.id === layoutId);
    if (!item || !isWarehousePlan(item.data)) return;
    setPlan({ ...item.data, warehouseName: item.data.warehouseName || item.data.name });
    suppressDraftRef.current = false;
    setCurrentSavedId(item.id);
    setDraftId(item.is_draft ? item.id : '');
    setSnap(item.data.snapToGrid);
    setSelectedIds([]);
    setStep(0);
    setSaveState(item.is_draft ? 'Draft restored' : 'Saved layout loaded');
  };

  const deleteSaved = async (layoutId: string) => {
    const response = await fetch(`/api/layouts/${encodeURIComponent(layoutId)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      setSaveState('Layout could not be deleted.');
      return;
    }
    if (currentSavedId === layoutId) setCurrentSavedId('');
    await refreshSaved();
    setSaveState('Layout deleted');
  };

  const startNew = () => {
    const next = makePlan();
    suppressDraftRef.current = false;
    pastRef.current = [];
    futureRef.current = [];
    updatePlan(next);
    setCurrentSavedId('');
    setDraftId('');
    setSelectedIds([]);
    setStep(0);
    setShowIssues(false);
  };

  const applyTemplate = (name: string) => {
    const next = { ...plan, objects: makeTemplate(name, plan) };
    updatePlan(next);
    setSelectedIds([]);
  };

  const addPaletteItem = (type: string, point?: { x: number; y: number }) => {
    const item = catalog.find(entry => entry.type === type);
    if (item) addObject(item, point);
  };

  const pointInSvg = (event: React.PointerEvent | React.DragEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const world = point.matrixTransform(matrix.inverse());
    const grid = snap ? 1 : 0.5;
    return {
      x: clamp(Math.round(world.x / grid) * grid, 0, plan.length),
      y: clamp(Math.round(world.y / grid) * grid, 0, plan.width),
    };
  };

  const pointerStart = (event: React.PointerEvent<SVGElement>, object: WarehouseObject, mode: 'move' | 'resize') => {
    event.stopPropagation();
    const toggles = event.shiftKey || event.ctrlKey || event.metaKey;
    const selection = toggles
      ? selectedIds.includes(object.id) ? selectedIds.filter(value => value !== object.id) : [...selectedIds, object.id]
      : selectedIds.includes(object.id) ? selectedIds : [object.id];
    setSelectedIds(selection);
    pastRef.current.push(plan);
    if (pastRef.current.length > 60) pastRef.current.shift();
    futureRef.current = [];
    const point = pointInSvg(event);
    gestureRef.current = {
      mode,
      id: object.id,
      startX: point.x,
      startY: point.y,
      initialObjects: plan.objects.filter(item => selection.includes(item.id)),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const point = pointInSvg(event);
    const dx = point.x - gesture.startX;
    const dy = point.y - gesture.startY;
    if (gesture.mode === 'pan') {
      setPan(current => ({ x: current.x - dx, y: current.y - dy }));
      gesture.startX = point.x;
      gesture.startY = point.y;
      return;
    }
    const initial = gesture.initialObjects.find(object => object.id === gesture.id);
    if (!initial) return;
    if (gesture.mode === 'resize') {
      updatePlan({
        ...plan,
        objects: plan.objects.map(object => object.id === initial.id
          ? {
            ...object,
            length: clamp(initial.length + dx, 1, plan.length - initial.x),
            width: clamp(initial.width + dy, 1, plan.width - initial.y),
          }
          : object),
      }, false);
      return;
    }
    const grid = snap ? 1 : 0.5;
    updatePlan({
      ...plan,
      objects: plan.objects.map(object => {
        const origin = gesture.initialObjects.find(initialObject => initialObject.id === object.id);
        if (!origin) return object;
        return {
          ...object,
          x: clamp(Math.round((origin.x + dx) / grid) * grid, 0, plan.length - object.length),
          y: clamp(Math.round((origin.y + dy) / grid) * grid, 0, plan.width - object.width),
        };
      }),
    }, false);
  };

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewWidth = plan.length / zoom;
  const viewHeight = plan.width / zoom;
  const viewBox = `${clamp(pan.x, 0, Math.max(0, plan.length - viewWidth))} ${clamp(pan.y, 0, Math.max(0, plan.width - viewHeight))} ${viewWidth} ${viewHeight}`;
  const gridStep = plan.length > 240 || plan.width > 240 ? 20 : plan.length > 100 || plan.width > 100 ? 10 : 5;
  const gridLines = (limit: number) => Array.from({ length: Math.floor(limit / gridStep) + 1 }, (_, index) => index * gridStep);

  const exportImage = () => {
    if (!svgRef.current) return;
    const svgCopy = svgRef.current.cloneNode(true) as SVGSVGElement;
    const exportHeight = Math.round(1800 * plan.width / plan.length);
    svgCopy.setAttribute('width', '1800');
    svgCopy.setAttribute('height', String(exportHeight));
    svgCopy.setAttribute('viewBox', `0 0 ${plan.length} ${plan.width}`);
    const source = new XMLSerializer().serializeToString(svgCopy);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1800;
      canvas.height = exportHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        setSaveState('Image export is not supported in this browser.');
        return;
      }
      context.fillStyle = '#f1f3ef';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `${plan.name.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'warehouse'}-layout.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setSaveState('PNG exported');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setSaveState('Image export failed.');
    };
    image.src = url;
  };

  const groupedProperties = selectedObject ? [
    ...(selectedObject.category === 'storage' ? [
      ['levels', 'Storage levels', 'number'],
      ['capacity', 'Capacity (slots)', 'number'],
      ['productCategory', 'Product category', 'text'],
      ['sku', 'SKU', 'text'],
      ['quantity', 'Quantity', 'number'],
      ['movement', 'Movement class (A/B/C)', 'text'],
    ] : []),
    ...(selectedObject.category === 'workstation' ? [
      ['workers', 'Workers', 'number'],
      ['averageTaskSeconds', 'Avg. task time (s)', 'number'],
      ['capacity', 'Capacity', 'number'],
    ] : []),
    ...(selectedObject.category === 'path' ? [
      ['pathWidth', 'Path width (m)', 'number'],
      ['direction', 'Direction', 'text'],
      ['movementType', 'Movement type', 'text'],
    ] : []),
    ...(selectedObject.category === 'equipment' ? [
      ['speed', 'Movement speed (m/s)', 'number'],
      ['carryingCapacity', 'Load capacity (kg)', 'number'],
    ] : []),
    ...(['polygon-zone', 'l-shaped-zone'].includes(selectedObject.type) ? [['shape', 'Shape', 'text']] : []),
  ] as [string, string, string][] : [];

  if (loading) {
    return <div className="layout-loading"><span className="loading loading-spinner loading-md" /> Loading your warehouse layouts…</div>;
  }

  return (
    <div className="layout-wizard">
      <header className="layout-topbar">
        <div className="layout-topbar-title"><span className="layout-brand-mark"><Warehouse size={19} /></span><div><strong>Warehouse setup</strong><small>LAYOUT PLANNER</small></div></div>
        <div className="layout-topbar-actions">
          <label className="layout-saved-select"><span>Saved layouts</span><select value={currentSavedId} onChange={event => loadSaved(event.target.value)}><option value="">Current layout</option>{savedPlans.filter(item => !item.is_draft).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14} /></label>
          <button type="button" className="layout-button layout-button-light" onClick={startNew}><Plus size={15} /> New layout</button>
          <span className="layout-save-status"><i className={saveState.toLowerCase().includes('saved') ? 'is-saved' : ''} />{saveState}</span>
        </div>
      </header>

      <nav className="layout-steps" aria-label="Layout setup steps">
        {steps.map((item, index) => (
          <button type="button" key={item.title} className={`layout-step ${index === step ? 'is-current' : ''} ${index < step ? 'is-complete' : ''}`} onClick={() => setStep(index)}>
            <span className="layout-step-number">{index < step ? <Check size={14} /> : `0${index + 1}`}</span>
            <span><b>{item.title}</b><small>{item.caption}</small></span>
          </button>
        ))}
      </nav>

      <div className="layout-heading">
        <div>
          <span className="layout-kicker">STEP {String(step + 1).padStart(2, '0')} / 06</span>
          <h1>{steps[step].title === 'Dimensions' ? 'Define your warehouse' : steps[step].title === 'Review' ? 'Review your floor plan' : `Set up ${steps[step].title.toLowerCase()}`}</h1>
          <p>{step === 0 ? 'Choose the floor size and a starting point.' : step === 5 ? 'Check your layout, resolve any issues, then save or continue to simulation.' : 'Drag an item onto the floor, or select it to add. Arrange the space to match your operation.'}</p>
        </div>
        {step > 0 && step < 5 && <div className="layout-live-stats"><span><b>{plan.objects.length}</b> objects</span><span><b>{utilization.toFixed(1)}%</b> floor area used</span></div>}
      </div>

      {step === 0 && (
        <section className="layout-start-grid">
          <div className="layout-card layout-dimensions-card">
            <div className="layout-card-eyebrow"><Grid2X2 size={16} /> WAREHOUSE DETAILS</div>
            <label className="layout-form-field"><span>Warehouse / site name</span><input value={plan.warehouseName || ''} maxLength={100} onChange={event => updatePlan({ ...plan, warehouseName: event.target.value })} placeholder="e.g. North distribution centre" /></label>
            <label className="layout-form-field layout-name-field"><span>Layout name</span><input value={plan.name} maxLength={100} onChange={event => updatePlan({ ...plan, name: event.target.value })} placeholder="e.g. Main floor" /></label>
            <div className="layout-measure-grid">
              <label className="layout-form-field"><span>Warehouse length <small>metres</small></span><input type="number" min="20" max="1000" value={plan.length} onChange={event => updatePlan({ ...plan, length: clamp(Number(event.target.value) || 20, 20, 1000) })} /></label>
              <label className="layout-form-field"><span>Warehouse width <small>metres</small></span><input type="number" min="20" max="1000" value={plan.width} onChange={event => updatePlan({ ...plan, width: clamp(Number(event.target.value) || 20, 20, 1000) })} /></label>
            </div>
            <div className="layout-area-summary"><span>AVAILABLE FLOOR AREA</span><b>{(plan.length * plan.width).toLocaleString()} <small>m²</small></b></div>
            <div className="layout-template-heading"><span><LayoutTemplate size={16} /> START WITH A TEMPLATE</span><small>Optional · fully editable</small></div>
            <div className="layout-template-grid">
              {[['basic', 'Basic', 'A practical starting layout'], ['u-flow', 'U-flow', 'Receiving & dispatch nearby'], ['i-flow', 'I-flow', 'Goods move straight through'], ['l-flow', 'L-flow', 'A compact corner-to-corner flow']].map(([value, name, description]) => (
                <button type="button" key={value} className="layout-template" onClick={() => applyTemplate(value)}>
                  <span className={`layout-template-preview preview-${value}`}><i /><i /><i /></span><b>{name}</b><small>{description}</small>
                </button>
              ))}
            </div>
            <button type="button" className="layout-text-button" onClick={() => { updatePlan({ ...plan, objects: [] }); setSelectedIds([]); }}>Start from scratch <ArrowRight size={14} /></button>
          </div>
          <div className="layout-card layout-preview-card">
            <div className="layout-preview-heading"><div><div className="layout-card-eyebrow"><Eye size={16} /> LIVE FLOOR PREVIEW</div><h2>{plan.warehouseName || 'Your warehouse'}</h2><p>{plan.name} · {plan.length} m × {plan.width} m · {(plan.length * plan.width).toLocaleString()} m²</p></div><span className="layout-metric-chip"><i /> 1 m GRID</span></div>
            <svg className="layout-preview-svg" viewBox={`0 0 ${plan.length} ${plan.width}`} role="img" aria-label="Warehouse floor preview">
              <defs><pattern id="layout-grid-preview" width={Math.max(4, Math.ceil(Math.max(plan.length, plan.width) / 40))} height={Math.max(4, Math.ceil(Math.max(plan.length, plan.width) / 40))} patternUnits="userSpaceOnUse"><path d={`M ${Math.max(4, Math.ceil(Math.max(plan.length, plan.width) / 40))} 0 L 0 0 0 ${Math.max(4, Math.ceil(Math.max(plan.length, plan.width) / 40))}`} fill="none" stroke="#d7ded6" strokeWidth="0.5" /></pattern></defs>
              <rect width={plan.length} height={plan.width} fill="url(#layout-grid-preview)" stroke="#819588" strokeWidth="1.5" />
              {plan.objects.map(object => <rect key={object.id} x={object.x} y={object.y} width={object.length} height={object.width} fill={categoryColor[object.category]} opacity=".8" transform={`rotate(${object.rotation} ${object.x + object.length / 2} ${object.y + object.width / 2})`} />)}
            </svg>
            <div className="layout-preview-foot"><span>Dimensions can be adjusted as you design.</span><span><i /> {plan.objects.length} objects placed</span></div>
          </div>
        </section>
      )}

      {step >= 1 && step <= 4 && (
        <section className="layout-editor-shell">
          <aside className="layout-palette">
            <div className="layout-panel-title"><div><span>THE TOOLKIT</span><b>{step === 1 ? 'Structure & flow' : step === 2 ? 'Storage systems' : step === 3 ? 'Workstations' : 'Paths & facilities'}</b></div><span className="layout-item-count">{visibleCatalog.length}</span></div>
            <div className="layout-palette-hint">Drag an item onto the floor, or click to place it.</div>
            <div className="layout-group-list">
              {shownGroups.map(group => (
                <div className="layout-palette-group" key={group}>
                  <button type="button" className="layout-group-heading" onClick={() => setActiveGroup(activeGroup === group ? '' : group)}><span>{group}</span><ChevronDown size={14} className={activeGroup === group ? 'is-open' : ''} /></button>
                  {(activeGroup === group || !activeGroup) && visibleCatalog.filter(item => item.group === group).map(item => (
                    <button type="button" draggable key={item.type} className="layout-palette-item" onClick={() => addPaletteItem(item.type)} onDragStart={event => { event.dataTransfer.setData('application/warehouse-object', item.type); event.dataTransfer.effectAllowed = 'copy'; }}>
                      <i style={{ backgroundColor: categoryColor[item.category] }} /><span>{item.label}</span><Plus size={13} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="layout-palette-foot"><span><i /> {plan.objects.length} objects on floor</span><span>{visibleCatalog.length} items</span></div>
          </aside>

          <section className="layout-canvas-panel">
            <div className="layout-canvas-toolbar">
              <div className="layout-canvas-heading"><b>{plan.name || 'Untitled warehouse'}</b><span>{plan.length} m × {plan.width} m</span></div>
              <div className="layout-tool-actions">
                <button type="button" title="Undo (Ctrl+Z)" onClick={undo}><Undo2 size={15} /></button>
                <button type="button" title="Redo (Ctrl+Y)" onClick={redo}><Redo2 size={15} /></button>
                <span />
                <button type="button" title="Zoom out" onClick={() => setZoom(value => clamp(value / 1.25, 1, 6))}><ZoomOut size={15} /></button>
                <small>{Math.round(zoom * 100)}%</small>
                <button type="button" title="Zoom in" onClick={() => setZoom(value => clamp(value * 1.25, 1, 6))}><ZoomIn size={15} /></button>
                <span />
                <button type="button" className={snap ? 'is-active' : ''} title="Toggle snap to grid" onClick={() => { setSnap(value => !value); updatePlan({ ...plan, snapToGrid: !snap }); }}><Grid2X2 size={15} /><small>Snap</small></button>
                <button type="button" title="Export floor plan as PNG" onClick={exportImage}><Download size={15} /></button>
              </div>
            </div>
            <div className="layout-canvas-stage" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }} onDrop={event => { event.preventDefault(); const type = event.dataTransfer.getData('application/warehouse-object'); const point = pointInSvg(event); const item = catalog.find(value => value.type === type); if (item) addObject(item, { x: point.x - item.length / 2, y: point.y - item.width / 2 }); }}>
              <svg
                ref={svgRef}
                className="layout-canvas-svg"
                viewBox={viewBox}
                preserveAspectRatio="xMidYMid meet"
                onPointerMove={pointerMove}
                onPointerUp={() => { gestureRef.current = null; }}
                onPointerCancel={() => { gestureRef.current = null; }}
                onPointerDown={event => {
                  if (event.target !== event.currentTarget) return;
                  const point = pointInSvg(event);
                  gestureRef.current = { mode: 'pan', startX: point.x, startY: point.y, initialObjects: [] };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              >
                <defs>
                  <pattern id="layout-small-grid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse"><path d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`} fill="none" stroke="#dce1dc" strokeWidth=".35" /></pattern>
                  <pattern id="layout-major-grid" width={gridStep * 5} height={gridStep * 5} patternUnits="userSpaceOnUse"><path d={`M ${gridStep * 5} 0 L 0 0 0 ${gridStep * 5}`} fill="none" stroke="#c4cec5" strokeWidth=".7" /></pattern>
                </defs>
                <rect x="0" y="0" width={plan.length} height={plan.width} fill="#f3f5f0" onPointerDown={event => {
                  if (event.target !== event.currentTarget) return;
                  const point = pointInSvg(event);
                  gestureRef.current = { mode: 'pan', startX: point.x, startY: point.y, initialObjects: [] };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }} />
                <rect x="0" y="0" width={plan.length} height={plan.width} fill="url(#layout-small-grid)" pointerEvents="none" />
                <rect x="0" y="0" width={plan.length} height={plan.width} fill="url(#layout-major-grid)" pointerEvents="none" />
                {alignmentGuides.x.map(x => <line key={`guide-x${x}`} x1={x} y1="0" x2={x} y2={plan.width} stroke="#d07a52" strokeWidth={Math.max(.7, plan.length / 650)} strokeDasharray={`${plan.length / 100} ${plan.length / 160}`} pointerEvents="none" />)}
                {alignmentGuides.y.map(y => <line key={`guide-y${y}`} x1="0" y1={y} x2={plan.length} y2={y} stroke="#d07a52" strokeWidth={Math.max(.7, plan.length / 650)} strokeDasharray={`${plan.length / 100} ${plan.length / 160}`} pointerEvents="none" />)}
                <rect x="0" y="0" width={plan.length} height={plan.width} fill="none" stroke="#4f6759" strokeWidth={Math.max(0.5, plan.length / 700)} pointerEvents="none" />
                {gridLines(plan.length).map(x => <text key={`x${x}`} x={x + 1} y={Math.max(3, plan.width / 250)} fill="#87938a" fontSize={Math.max(1.7, plan.length / 300)} pointerEvents="none">{x}</text>)}
                {gridLines(plan.width).map(y => <text key={`y${y}`} x={Math.max(1, plan.length / 500)} y={y + 3} fill="#87938a" fontSize={Math.max(1.7, plan.length / 300)} pointerEvents="none">{y}</text>)}
                {plan.objects.map(object => {
                  const isSelected = selectedIds.includes(object.id);
                  const color = categoryColor[object.category];
                  const centerX = object.length / 2;
                  const centerY = object.width / 2;
                  const shape = object.properties.shape;
                  return (
                    <g key={object.id} transform={`translate(${object.x} ${object.y}) rotate(${object.rotation} ${centerX} ${centerY})`} onPointerDown={event => pointerStart(event, object, 'move')} onClick={event => {
                      if (event.shiftKey || event.ctrlKey || event.metaKey) return;
                      setSelectedIds(current => current.includes(object.id) ? current : [object.id]);
                    }}>
                      {object.type === 'l-shaped-zone'
                        ? <path d={`M 0 0 H ${object.length} V ${object.width * .38} H ${object.length * .4} V ${object.width} H 0 Z`} fill={color} fillOpacity=".28" stroke={color} strokeWidth={Math.max(.5, plan.length / 800)} />
                        : object.type === 'polygon-zone'
                          ? <polygon points={`${object.length * .18},0 ${object.length},${object.width * .12} ${object.length * .78},${object.width} 0,${object.width * .7}`} fill={color} fillOpacity=".28" stroke={color} strokeWidth={Math.max(.5, plan.length / 800)} />
                          : <rect width={object.length} height={object.width} rx={object.category === 'path' ? object.width * .16 : 0} fill={color} fillOpacity={object.category === 'path' ? '.38' : '.22'} stroke={color} strokeWidth={Math.max(.5, plan.length / 800)} strokeDasharray={object.category === 'path' ? `${plan.length / 90} ${plan.length / 140}` : undefined} />}
                      {object.category === 'storage' && object.length > 10 && object.width > 2 && <path d={`M ${object.length * .2} 0 V ${object.width} M ${object.length * .4} 0 V ${object.width} M ${object.length * .6} 0 V ${object.width} M ${object.length * .8} 0 V ${object.width}`} stroke={color} strokeOpacity=".38" strokeWidth={Math.max(.5, plan.length / 1000)} pointerEvents="none" />}
                      {object.length > 5 && object.width > 3 && <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" fill="#24332b" fontSize={Math.max(1.6, plan.length / 360)} fontWeight="600" pointerEvents="none">{object.name.length > 18 ? `${object.name.slice(0, 16)}…` : object.name}</text>}
                      {isSelected && <><rect x="0" y="0" width={object.length} height={object.width} fill="none" stroke="#244d3b" strokeWidth={Math.max(1, plan.length / 300)} strokeDasharray={`${plan.length / 120} ${plan.length / 170}`} pointerEvents="none" /><rect x={object.length - Math.max(2, plan.length / 130)} y={object.width - Math.max(2, plan.length / 130)} width={Math.max(2, plan.length / 65)} height={Math.max(2, plan.length / 65)} fill="#fff" stroke="#244d3b" strokeWidth={Math.max(.6, plan.length / 700)} onPointerDown={event => pointerStart(event, object, 'resize')} /></>}
                    </g>
                  );
                })}
              </svg>
              <div className="layout-canvas-hint"><span>Drag to pan</span><i /> <span>Drag objects to move · Shift-click to multi-select</span><i /> <span>Units: metres</span></div>
            </div>
            <div className="layout-canvas-footer">
              <div className="layout-legend">{Object.entries(categoryColor).map(([category, color]) => <span key={category}><i style={{ background: color }} />{category === 'workstation' ? 'Work areas' : category[0].toUpperCase() + category.slice(1)}</span>)}</div>
              <div className="layout-canvas-count">{plan.objects.length} objects <span>·</span> {utilization.toFixed(1)}% used</div>
            </div>
          </section>

          <aside className="layout-properties">
            <div className="layout-panel-title"><div><span>OBJECT DETAILS</span><b>{selectedObject ? 'Properties' : 'Nothing selected'}</b></div>{selectedIds.length > 1 && <span className="layout-item-count">{selectedIds.length}</span>}</div>
            {!selectedObject ? (
              <div className="layout-empty-properties"><span className="layout-empty-icon"><Grid2X2 size={20} /></span><b>Select an object</b><p>Choose an item on the floor to edit its position, size, rotation and properties.</p><div><span>X</span> Horizontal distance from the left wall</div><div><span>Y</span> Vertical distance from the top wall</div></div>
            ) : <>
              <div className="layout-selected-type"><i style={{ background: categoryColor[selectedObject.category] }} /><div><b>{labelFor(selectedObject.type)}</b><small>{selectedObject.category.toUpperCase()}</small></div></div>
              <label className="layout-property-field"><span>Object name</span><input value={selectedObject.name} onChange={event => updateSelected({ name: event.target.value })} /></label>
              <div className="layout-property-grid">
                <label className="layout-property-field"><span>X position (m)</span><input type="number" min="0" max={plan.length} value={selectedObject.x} onChange={event => updateSelected({ x: Number(event.target.value) })} /></label>
                <label className="layout-property-field"><span>Y position (m)</span><input type="number" min="0" max={plan.width} value={selectedObject.y} onChange={event => updateSelected({ y: Number(event.target.value) })} /></label>
                <label className="layout-property-field"><span>Length (m)</span><input type="number" min="1" value={selectedObject.length} onChange={event => updateSelected({ length: Number(event.target.value) })} /></label>
                <label className="layout-property-field"><span>Width (m)</span><input type="number" min="1" value={selectedObject.width} onChange={event => updateSelected({ width: Number(event.target.value) })} /></label>
              </div>
              <label className="layout-property-field"><span>Orientation</span><div className="layout-rotation-control"><span>{selectedObject.rotation}°</span><button type="button" onClick={() => updateSelected({ rotation: (selectedObject.rotation + 90) % 360 })}><RotateCw size={14} /> Rotate 90°</button></div></label>
              {groupedProperties.map(([key, title, type]) => (
                <label className="layout-property-field" key={key}><span>{title}</span><input type={type} value={selectedObject.properties[key] ?? ''} onChange={event => updateSelected({}, { [key]: type === 'number' ? Number(event.target.value) : event.target.value })} /></label>
              ))}
              <div className="layout-object-actions"><button type="button" onClick={() => { const copies = selected.map(object => ({ ...object, id: id(), x: Math.min(plan.length - object.length, object.x + 3), y: Math.min(plan.width - object.width, object.y + 3) })); updatePlan({ ...plan, objects: [...plan.objects, ...copies] }); setSelectedIds(copies.map(object => object.id)); }}><Copy size={14} /> Duplicate</button><button type="button" className="is-danger" onClick={removeSelected}><Trash2 size={14} /> Delete</button></div>
              <div className="layout-object-coordinate"><MapCoordinate x={selectedObject.x} y={selectedObject.y} /></div>
            </>}
          </aside>
        </section>
      )}

      {step === 5 && (
        <section className="layout-review">
          <div className="layout-review-main">
            <div className="layout-card layout-review-plan">
              <div className="layout-preview-heading"><div><div className="layout-card-eyebrow"><Eye size={16} /> FLOOR PLAN PREVIEW</div><h2>{plan.warehouseName || plan.name} · {plan.name}</h2><p>{plan.length} m × {plan.width} m · {(plan.length * plan.width).toLocaleString()} m² total</p></div><button type="button" className="layout-button layout-button-light" onClick={() => window.print()}><FileText size={15} /> Export / print</button></div>
              <svg ref={svgRef} className="layout-review-svg" viewBox={`0 0 ${plan.length} ${plan.width}`} role="img" aria-label="Full warehouse layout preview"><rect width={plan.length} height={plan.width} fill="#f3f5f0" stroke="#536a5c" strokeWidth="1.5" />{plan.objects.map(object => <g key={object.id} transform={`rotate(${object.rotation} ${object.x + object.length / 2} ${object.y + object.width / 2})`}><rect x={object.x} y={object.y} width={object.length} height={object.width} fill={categoryColor[object.category]} fillOpacity=".38" stroke={categoryColor[object.category]} strokeWidth=".65" /><text x={object.x + object.length / 2} y={object.y + object.width / 2} textAnchor="middle" dominantBaseline="middle" fill="#24332b" fontSize={Math.max(1.8, plan.length / 350)}>{object.name}</text></g>)}</svg>
              <div className="layout-review-legend">{Object.entries(categoryColor).map(([category, color]) => <span key={category}><i style={{ background: color }} />{category}</span>)}</div>
            </div>
            <div className="layout-card layout-validation-card">
              <div className="layout-validation-heading"><div><span className="layout-card-eyebrow"><Check size={15} /> AUTOMATIC CHECKS</span><h2>Layout validation</h2></div><span className={`layout-validation-badge ${errors.length ? 'has-errors' : 'is-valid'}`}>{errors.length ? `${errors.length} to fix` : 'Ready to save'}</span></div>
              {errors.length === 0 && <div className="layout-validation-good"><Check size={15} /> No blocking issues found. Your layout can be saved and sent to simulation.</div>}
              {errors.length > 0 && <div className="layout-issue-list">{errors.map((issue, index) => <div className="layout-issue is-error" key={`${issue.message}${index}`}><AlertTriangle size={15} /><span>{issue.message}</span>{issue.objectId && <button type="button" onClick={() => { setStep(4); setSelectedIds([issue.objectId!]); }}>Locate</button>}</div>)}</div>}
              {warnings.length > 0 && <div className="layout-issue-list">{warnings.map((issue, index) => <div className="layout-issue is-warning" key={`${issue.message}${index}`}><AlertTriangle size={15} /><span>{issue.message}</span>{issue.objectId && <button type="button" onClick={() => { setStep(4); setSelectedIds([issue.objectId!]); }}>Locate</button>}</div>)}</div>}
            </div>
          </div>
          <aside className="layout-review-aside">
            <div className="layout-card layout-summary-card"><div className="layout-card-eyebrow"><Warehouse size={16} /> LAYOUT SUMMARY</div><div className="layout-summary-total"><b>{(plan.length * plan.width).toLocaleString()}</b><span>square metres</span></div><div className="layout-summary-bar"><i style={{ width: `${utilization}%` }} /></div><div className="layout-summary-pair"><span>Estimated space used</span><b>{utilization.toFixed(1)}%</b></div><div className="layout-summary-divider" /><div className="layout-summary-line"><span>Storage area</span><b>{objectCounts.storageArea.toLocaleString()} m² <small>· {objectCounts.storage} objects</small></b></div><div className="layout-summary-line"><span>Paths & aisles</span><b>{objectCounts.pathArea.toLocaleString()} m² <small>· {plan.objects.filter(object => object.category === 'path').length} objects</small></b></div><div className="layout-summary-line"><span>Workstations</span><b>{objectCounts.workstations}</b></div><div className="layout-summary-line"><span>Entrances & docks</span><b>{objectCounts.entrances}</b></div><div className="layout-summary-line"><span>Equipment</span><b>{objectCounts.equipment}</b></div><div className="layout-summary-line"><span>All objects</span><b>{plan.objects.length}</b></div></div>
            <div className="layout-card layout-save-card"><label className="layout-form-field"><span>Layout name</span><input value={plan.name} maxLength={100} onChange={event => updatePlan({ ...plan, name: event.target.value })} /></label><button type="button" className="layout-button layout-button-primary" onClick={() => void saveFinal(false)} disabled={errors.length > 0}><Save size={16} /> Save layout</button><button type="button" className="layout-button layout-button-outline" onClick={() => { exportImage(); }}><ArrowDownToLine size={16} /> Export as image</button>{currentSavedId && !savedPlans.find(item => item.id === currentSavedId)?.is_draft && <button type="button" className="layout-button layout-button-danger" onClick={() => void deleteSaved(currentSavedId)}><Trash2 size={15} /> Delete saved layout</button>}</div>
          </aside>
        </section>
      )}

      <footer className="layout-footer">
        <button type="button" className="layout-button layout-button-light" onClick={() => step === 0 ? undefined : setStep(step - 1)} disabled={step === 0}><ArrowLeft size={15} /> Back</button>
        <div className="layout-footer-note"><span className={saveState.toLowerCase().includes('saved') ? 'is-saved' : ''} />{saveState}</div>
        {step < 5
          ? <button type="button" className="layout-button layout-button-primary" onClick={() => setStep(step + 1)}>Continue <ArrowRight size={15} /></button>
          : <button type="button" className="layout-button layout-button-primary" onClick={() => void saveFinal(true)} disabled={errors.length > 0}><span>Proceed to simulation</span><ArrowRight size={15} /></button>}
      </footer>

      {step === 5 && showIssues && errors.length > 0 && <div className="layout-toast" role="alert">Fix the blocking issues before saving or running the simulation.</div>}
      {step === 5 && errors.length > 0 && <button type="button" className="layout-fix-issues" onClick={() => { setShowIssues(true); setStep(errors[0].objectId ? 4 : 1); if (errors[0].objectId) setSelectedIds([errors[0].objectId]); }}><AlertTriangle size={15} /> Fix required items</button>}
      {step === 4 && <div className="layout-minimap"><span>MINI MAP · CLICK TO NAVIGATE</span><svg viewBox={`0 0 ${plan.length} ${plan.width}`} onPointerDown={event => { const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width * plan.length; const y = (event.clientY - rect.top) / rect.height * plan.width; setPan({ x: clamp(x - viewWidth / 2, 0, Math.max(0, plan.length - viewWidth)), y: clamp(y - viewHeight / 2, 0, Math.max(0, plan.width - viewHeight)) }); }}><rect width={plan.length} height={plan.width} fill="#e9eee8" stroke="#87968a" strokeWidth="2" />{plan.objects.map(object => <rect key={object.id} x={object.x} y={object.y} width={object.length} height={object.width} fill={categoryColor[object.category]} />)}<rect x={clamp(pan.x, 0, Math.max(0, plan.length - viewWidth))} y={clamp(pan.y, 0, Math.max(0, plan.width - viewHeight))} width={viewWidth} height={viewHeight} fill="#416f4b" fillOpacity=".08" stroke="#416f4b" strokeWidth={Math.max(1, plan.length / 200)} pointerEvents="none" /></svg><button type="button" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}>Reset view</button></div>}
      {step === 5 && <button type="button" className="layout-fix-issues layout-review-back" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back to edit</button>}
    </div>
  );
};

const MapCoordinate: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <span>POSITION <b>X {x} m</b><b>Y {y} m</b></span>
);
