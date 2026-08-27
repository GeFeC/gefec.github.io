const radians = degrees => degrees * Math.PI / 180;

const matrix = (width, height, initial) => {
  let result = new Array(width);

  for (let i = 0; i < width; ++i){
    result[i] = new Array(height);
    for (let j = 0; j < height; ++j){
      result[i][j] = structuredClone(initial)
    }
  }

  return result
}

const influence_s_const = (W, s) => {
  return s;
}

const influence_s_weight = (W, s) => {
  return s * Math.pow(2, 1 + W);
}

let influence_s = influence_s_const;

const gaussian_influence = (d, W, params) => {
  const s = influence_s(W, params.s);
  return W * Math.pow(2, -d * d / (s * s)) * (d < 2 * s ? 1 : 0);
}

const BUTTERWORTH_N = Math.log2(9);

const butterworth_influence = (d, W, params) => {
  const s = influence_s(W, params.s);
  return W / (1 + Math.pow(d / s, BUTTERWORTH_N)) * (d < 2 * s ? 1 : 0);
}

const INC_weight_mean = (cell, params) => {
  const { T, I } = cell;
  const F = 0;
  const [a1, a2] = params.alpha;

  return Math.sqrt(
    (T * T + a1 * I * I + a2 * F * F) 
    / 
    (1 + a1 + a2)
  )
}

const INC_prob_sum = (cell, params) => {
  const { T, I } = cell;
  const F = 0;
  return 1 - (1 - T) * (1 - Math.pow(T, params.alpha0) * I) * (1 - F);
}

const get_move_vector = (starting_point, target) => {
  const [ref_lat, ref_lon] = starting_point; 
  const [target_lat, target_lon] = target;

  const yMeters = (ref_lat - target_lat) * ONE_GEO_DEGREE_TO_METERS;
  const xMeters = (target_lon - ref_lon) * (ONE_GEO_DEGREE_TO_METERS * Math.cos(radians(ref_lat)));

  return [Math.round(xMeters), Math.round(yMeters)];
}

const choose_not_null = (candidates) => {
  const is_null = e => e == undefined || e == null

  if (candidates.every(is_null)){
    alert("BLAD! Funkcja choose_not_null dostala tablice samych nulli");
    return;
  }

  return candidates.find(e => !is_null(e))
}

const get_accumulated_influence = (series) => {
  let product = 1;

  series.forEach(t => {
    product *= (1 - t);
  })

  return 1 - product;
}


const clamp = (value, min, max) => {
  return Math.min(max, Math.max(min, value));
}

const map_to_color = value => {
  const [r, g, b] = map_to_color_array(value);

  return `rgb(${r}, ${g}, ${b})`;
}

const map_to_color_array = value => {
  if (value < 0 || value > 1){
    alert("Ostrzezenie! Argument funkcji map_to_color nie powinien byc spoza przedzialu 0..1")
  }

  const p1 = clamp(value, 0, 0.25); value -= 0.25;
  const p2 = clamp(value, 0, 0.25); value -= 0.25;
  const p3 = clamp(value, 0, 0.25); value -= 0.25;
  const p4 = clamp(value, 0, 0.25); value -= 0.25;

  const [r, g, b] = [
    p3,
    p1 - p4,
    0.25 - p2
  ];

  return [
    r * 4 * 255,
    g * 4 * 255,
    b * 4 * 255
  ];
}

const log_compression = (x, max_x) => {
  return Math.log(1 + x) / Math.log(1 + max_x);
}

const DIT = (cell, params) => {
  const inc = INC(cell, params);
  const { beta, rho, K } = params;
  const { B } = cell;

  const K_ = Math.max(K, 1 / 1000);
  return (inc + rho * K) / (inc + beta * B + K_ - beta * B * K_)
}

const schlick = (value, x, y) => {
  const k = (x * (1 - y)) / (y * (1 - x));

  return value / (k + (1 - k) * value);
}

let INC = INC_weight_mean;
let influence = gaussian_influence;

let get_signal = DIT;

const EARTH_RADIUS_M = 6371000;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dlon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function getBoundingCorners(points){
  if (!points || points.length === 0) return null;
  if (points.length === 1) return { center: points[0], radiusMeters: 0 };

  let minLat = Infinity, maxLat = -Infinity;
  let minlon = Infinity, maxlon = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minlon) minlon = p.lon;
    if (p.lon > maxlon) maxlon = p.lon;
  }


  return [
    [minLat, minlon],
    [minLat, maxlon],
    [maxLat, minlon],
    [maxLat, maxlon]
  ];
}

function getFastBoundingGeoCircle(points) {
  const corners = getBoundingCorners(points);

  const centerLat = (corners[0][0] + corners[2][0]) / 2;
  const centerlon = (corners[0][1] + corners[3][1]) / 2;

  let maxRadius = 0;
  for (const [cLat, clon] of corners) {
    const d = haversineDistance(centerLat, centerlon, cLat, clon);
    if (d > maxRadius) maxRadius = d;
  }

  return {
    center: { lat: centerLat, lon: centerlon },
    radiusMeters: maxRadius
  };
}
