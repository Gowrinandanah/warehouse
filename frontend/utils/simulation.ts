import type { Layout, Point, SimulationResult, SimulationSettings } from '../types';

const indexOf = (p: Point, w: number) => p.y * w + p.x;
const pointOf = (i: number, w: number): Point => ({ x: i % w, y: Math.floor(i / w) });

function shortestPath(layout: Layout, start: Point, target: Point): number[] | null {
  const { width, height, cells } = layout;
  const startI = indexOf(start, width), targetI = indexOf(target, width);
  const queue = [startI], previous = new Array(cells.length).fill(-1);
  previous[startI] = startI;
  for (let q = 0; q < queue.length; q++) {
    const current = queue[q];
    if (current === targetI) break;
    const p = pointOf(current, width);
    const neighbors = [
      { x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 },
    ];
    for (const n of neighbors) {
      if (n.x < 0 || n.y < 0 || n.x >= width || n.y >= height) continue;
      const ni = indexOf(n, width);
      const isTarget = ni === targetI;
      if (previous[ni] !== -1 || (!isTarget && (cells[ni] === 'shelf' || cells[ni] === 'obstacle'))) continue;
      previous[ni] = current;
      queue.push(ni);
    }
  }
  if (previous[targetI] === -1) return null;
  const path: number[] = [];
  for (let at = targetI; ; at = previous[at]) {
    path.push(at);
    if (at === startI) break;
  }
  return path.reverse();
}

export function runSimulation(layout: Layout, settings: SimulationSettings): SimulationResult {
  const stations = layout.cells.flatMap((c, i) => c === 'station' ? [pointOf(i, layout.width)] : []);
  const shelves = layout.cells.flatMap((c, i) => c === 'shelf' ? [pointOf(i, layout.width)] : []);
  const visits = new Array(layout.cells.length).fill(0);
  const spaceUtilization = layout.footprintPercent ?? shelves.length / layout.cells.length * 100;
  if (!stations.length || !shelves.length) {
    return { completedOrders: 0, visits, metrics: { totalDistance: 0, averageDistance: 0, completionMinutes: 0, throughput: 0, spaceUtilization, unreachableShelves: shelves.length } };
  }

  const shelfRoutes = shelves.map(shelf => {
    let best: number[] | null = null;
    for (const station of stations) {
      const path = shortestPath(layout, station, shelf);
      if (path && (!best || path.length < best.length)) best = path;
    }
    return best;
  });
  const reachable = shelfRoutes.filter((r): r is number[] => Boolean(r));
  if (!reachable.length) {
    return { completedOrders: 0, visits, metrics: { totalDistance: 0, averageDistance: 0, completionMinutes: 0, throughput: 0, spaceUtilization, unreachableShelves: shelves.length } };
  }

  let totalDistance = 0;
  for (let order = 0; order < settings.orders; order++) {
    const route = reachable[order % reachable.length];
    const distance = Math.max(0, (route.length - 1) * 2 * (layout.metersPerCell ?? 1));
    totalDistance += distance;
    route.forEach(i => visits[i]++);
    [...route].reverse().forEach(i => visits[i]++);
  }
  const walkingSeconds = totalDistance / Math.max(0.1, settings.walkingSpeed);
  const totalSeconds = walkingSeconds + settings.orders * settings.pickSeconds;
  return {
    completedOrders: settings.orders,
    visits,
    metrics: {
      totalDistance,
      averageDistance: totalDistance / settings.orders,
      completionMinutes: totalSeconds / 60,
      throughput: totalSeconds ? settings.orders / (totalSeconds / 3600) : 0,
      spaceUtilization,
      unreachableShelves: shelves.length - reachable.length,
    },
  };
}
