function earthMoversDistance(supply, demand, cost) {
  const n = supply.length;
  const m = demand.length;
 
  const totalSupply = supply.reduce((s, x) => s + x, 0);
  const totalDemand = demand.reduce((s, x) => s + x, 0);
  if (Math.abs(totalSupply - totalDemand) > 1e-6) {
    throw new Error(
      `Unbalanced problem: supply sums to ${totalSupply}, demand sums to ${totalDemand}. ` +
      `Normalize both distributions to the same total mass (e.g. both to 1) first.`
    );
  }
 
  // Node layout: 0 = SOURCE, 1..n = supply nodes, n+1..n+m = demand nodes, n+m+1 = SINK
  const S = 0;
  const T = n + m + 1;
  const V = n + m + 2;
  const supplyNode = (i) => 1 + i;
  const demandNode = (j) => 1 + n + j;
 
  // Dense residual capacity / cost matrices (fine since the cost matrix itself is dense)
  const cap = Array.from({ length: V }, () => new Float64Array(V));
  const costM = Array.from({ length: V }, () => new Float64Array(V));
 
  for (let i = 0; i < n; i++) {
    cap[S][supplyNode(i)] = supply[i];
  }
  for (let j = 0; j < m; j++) {
    cap[demandNode(j)][T] = demand[j];
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      cap[supplyNode(i)][demandNode(j)] = Infinity;
      costM[supplyNode(i)][demandNode(j)] = cost[i][j];
      costM[demandNode(j)][supplyNode(i)] = -cost[i][j]; // reverse (residual) edge
    }
  }
 
  const potential = new Float64Array(V); // Johnson's reweighting, keeps reduced costs >= 0
  let totalCost = 0;
  let remaining = totalSupply;
  const EPS = 1e-12;
 
  while (remaining > EPS) {
    // Dijkstra on reduced costs, O(V^2) — fine for dense graphs, no heap needed
    const dist = new Float64Array(V).fill(Infinity);
    const prev = new Int32Array(V).fill(-1);
    const visited = new Uint8Array(V);
    dist[S] = 0;
 
    for (let iter = 0; iter < V; iter++) {
      let u = -1;
      let best = Infinity;
      for (let v = 0; v < V; v++) {
        if (!visited[v] && dist[v] < best) {
          best = dist[v];
          u = v;
        }
      }
      if (u === -1 || u === T) break;
      visited[u] = 1;
 
      for (let v = 0; v < V; v++) {
        if (cap[u][v] > EPS) {
          const reduced = Math.max(costM[u][v] + potential[u] - potential[v], 0);
          const nd = dist[u] + reduced;
          if (nd < dist[v] - 1e-12) {
            dist[v] = nd;
            prev[v] = u;
          }
        }
      }
    }
 
    if (prev[T] === -1) break; // no augmenting path left (shouldn't happen if balanced)
 
    for (let v = 0; v < V; v++) {
      if (dist[v] < Infinity) potential[v] += dist[v];
    }
 
    let bottleneck = remaining;
    for (let v = T; v !== S; v = prev[v]) {
      bottleneck = Math.min(bottleneck, cap[prev[v]][v]);
    }
 
    for (let v = T; v !== S; v = prev[v]) {
      const u = prev[v];
      cap[u][v] -= bottleneck;
      cap[v][u] += bottleneck;
      totalCost += bottleneck * costM[u][v];
    }
 
    remaining -= bottleneck;
  }
 
  const flow = Array.from({ length: n }, () => new Float64Array(m));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      flow[i][j] = cap[demandNode(j)][supplyNode(i)]; // accumulated reverse-edge capacity
    }
  }
 
  return { distance: totalCost, flow };
}

function buildCostMatrix(hexesA, hexesB) {
  return hexesA.map((ha) => {
    return hexesB.map((hb) => {
      return h3.gridDistance(ha, hb)
    });
  });
}
 
function wassersteinBetweenDistributions(distA, distB) {
  const hexesA = [...distA.keys()]
  const hexesB = [...distB.keys()]
 
  const cost = buildCostMatrix(hexesA, hexesB);
  const supply = [...distA.values()]
  const demand = [...distB.values()]
  const { distance } = earthMoversDistance(supply, demand, cost);
  return distance;
}

