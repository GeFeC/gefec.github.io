const get_square_bounds_around = (center_lat, center_lng, meters) => {
  const half_size = meters / 2;
  const lat_delta = half_size / ONE_GEO_DEGREE_TO_METERS;
  const lng_delta = half_size / (ONE_GEO_DEGREE_TO_METERS * Math.cos(radians(center_lat)))

  return [
    [center_lat - lat_delta, center_lng - lng_delta],
    [center_lat + lat_delta, center_lng + lng_delta],
  ]
}

const get_weight = (location, params) => {
  const weight = choose_not_null([location.Weight, location.WAGA]);

  if (params.weight_scale_method == "schlick"){
    const schlick_x = params.weight_schlick;
    return schlick(weight, 1 - schlick_x, schlick_x);
  }
  else return Math.min(1, weight * params.weight_linear);
}

const get_influence_series = (locations, cell_center_pos, params) => {
  const t = [];

  locations.forEach((p) => {
    const d_vec = get_move_vector(cell_center_pos, [p.lat, p.lon]);
    const d = Math.sqrt(d_vec[X] * d_vec[X] + d_vec[Y] * d_vec[Y]);

    if (d >= 2 * params.s) return;

    t.push(influence(d, get_weight(p, params), params));

  })

  return t
}
