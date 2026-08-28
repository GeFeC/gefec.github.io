const get_drawing_starting_point = (sq_params) => {
  const { center_pos } = sq_params;
  const { square_size } = sq_params;
  const { map_size } = sq_params;

  const bounds = get_square_bounds_around(
    center_pos.lat, 
    center_pos.lon, 
    map_size * square_size
  );

  return bounds[0];
} 

const geo_move = (geo, vector) => {
  const LAT = 0;
  const LON = 1;

  const lat_delta = vector[Y] / ONE_GEO_DEGREE_TO_METERS;
  const lon_delta = vector[X] / (ONE_GEO_DEGREE_TO_METERS * Math.cos(radians(geo[LAT])))

  return [geo[LAT] + lat_delta, geo[LON] + lon_delta];
}


class SquareMap{
  sq_params = {};

  get_data_as_1d_array(data){
    return [].concat.apply([], data);
  };

  get_locations_and_corresponding_indices(starting_point, locations){
    const result = []

    const { square_size } = this.sq_params;

    locations.forEach(p => {
      const { lat, lon } = p

      const [x, y] = get_move_vector(starting_point, [lat, lon]);

      const x_idx = parseInt(Math.round(x / square_size));
      const y_idx = -parseInt(Math.round(y / square_size));

      result.push([x_idx, y_idx, p])
    })

    return result
  };

  update_grid(sq_data, params){
    const starting_point = get_drawing_starting_point(this.sq_params);

    const { map_size } = this.sq_params;
    const { square_size } = this.sq_params;

    for (let y = 0; y < map_size; ++y){
      for (let x = 0; x < map_size; ++x){
        const cell = sq_data[x][y];
        cell.t = [];
        cell.i = [];
        cell.b = [];
      }
    }

    for (let y = 0; y < map_size; ++y){
      for (let x = 0; x < map_size; ++x){
        const center_pos = geo_move(starting_point, [x * square_size, y * square_size]);
        const cell = sq_data[x][y];

        const surrounding_cells = (() => {
          const result = []

          const neighbours_radius = Math.max(
            0,
            Math.round(params.s / this.sq_params.square_size / Math.sqrt(2))
          );

          for (let i = -neighbours_radius; i <= neighbours_radius; ++i){
            for (let j = -neighbours_radius; j <= neighbours_radius; ++j){
              if (x + i < 0 || x + i >= map_size) continue;
              if (y + j < 0 || y + j >= map_size) continue;

              result.push(sq_data[x + i][y + j]);
            }
          }

          return result;
        })()

        params.W_scale = 500 / this.sq_params.square_size;
        surrounding_cells.forEach(neighbour => {
          neighbour.t = [...neighbour.t, ...get_influence_series(cell.pois, center_pos, params)];
          neighbour.i = [...neighbour.i, ...get_influence_series(cell.infs, center_pos, params)];
          neighbour.b = [...neighbour.b, ...get_influence_series(cell.bgs, center_pos, params)];
        })
      }
    }

    const signals = []
    for (let y = 0; y < map_size; ++y){
      for (let x = 0; x < map_size; ++x){
        const cell = sq_data[x][y];

        cell.T = get_accumulated_influence(cell.t);
        cell.I = get_accumulated_influence(cell.i);
        cell.B = get_accumulated_influence(cell.b);

        signals.push(get_signal(cell, params));
      }
    }

    const max_signal = Math.max(...signals)

    for (let y = 0; y < map_size; ++y){
      for (let x = 0; x < map_size; ++x){
        let signal = signals[y * map_size + x];

        if (params.use_log_compression){
          signal = log_compression(signal, max_signal);
        }

        sq_data[x][y].drawable.setStyle({
          fillColor: map_to_color(signal)
        }).bindPopup(`Sygnał: ${signal}`);

        sq_data[x][y].signal = signal;
      }
    }
  };
  is_empty(sq_data){
    return sq_data[0] == undefined || sq_data[0] == null;
  };
  init(grid_group, static_canvas, sq_params){
    this.sq_params = sq_params;
    const { map_size, square_size } = this.sq_params;

    const data = matrix(map_size, map_size, {});
    for (let y = 0; y < map_size; ++y){
      for (let x = 0; x < map_size; ++x){
        const starting_point = get_drawing_starting_point(this.sq_params);
        const center_pos = geo_move(starting_point, [x * square_size, y * square_size]);

        const bounds = get_square_bounds_around(center_pos[X], center_pos[Y], square_size);
        const polygon = L.rectangle(bounds, {
          renderer: static_canvas,
          weight: 2,
          fillColor: "rgb(0,0,255)",
          fillOpacity: 0.4,
          opacity: 0
        }).addTo(grid_group);

        data[x][y] = {
          drawable: polygon,
          T: 0,
          I: 0,
          B: 0,
          t: [],
          i: [],
          b: [],
          pois: [],
          infs: [],
          bgs: [],
          weight: 0,
        }
      }
    }

    return data;
  };
  load(sq_data, poi, inf, bg){
    const starting_point = get_drawing_starting_point(this.sq_params);

    this.get_locations_and_corresponding_indices(starting_point, poi).forEach(([x_idx, y_idx, poi]) => {
      sq_data[x_idx][y_idx].pois.push(poi);
    })

    this.get_locations_and_corresponding_indices(starting_point, inf).forEach(([x_idx, y_idx, inf]) => {
      sq_data[x_idx][y_idx].infs.push(inf);
    })

    this.get_locations_and_corresponding_indices(starting_point, bg).forEach(([x_idx, y_idx, bg]) => {
      sq_data[x_idx][y_idx].bgs.push(bg);
    })
  };
  on_zoomend(sq_data, grid_group){
    const { map_size } = this.sq_params;

    for (let y = 0; y < map_size; ++y){
      for (let x = 0; x < map_size; ++x){
        sq_data[x][y].drawable.addTo(grid_group);
      }
    }
  }
}

const square_map = new SquareMap();
