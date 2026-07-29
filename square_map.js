const get_drawing_starting_point = () => {
  return get_square_bounds_around(
    KIELCE_POSITION[0], 
    KIELCE_POSITION[1], 
    MAP_CELLS * CELL_SIZE_IN_METERS - CELL_SIZE_IN_METERS / 2
  )[0];
} 

const geo_move = (geo, vector) => {
  const LAT = 0;
  const LON = 1;

  const lat_delta = vector[Y] / ONE_GEO_DEGREE_TO_METERS;
  const lon_delta = vector[X] / (ONE_GEO_DEGREE_TO_METERS * Math.cos(radians(geo[LAT])))

  return [geo[LAT] + lat_delta, geo[LON] + lon_delta];
}

let too_small_grid_alert_shown = false;
const get_locations_and_corresponding_indices = (starting_point, locations) => {
  const result = []

  locations.forEach(p => {
    const { lat, lon } = p

    const [x, y] = get_move_vector(starting_point, [lat, lon]);

    const x_idx = parseInt(Math.round(x / CELL_SIZE_IN_METERS));
    const y_idx = -parseInt(Math.round(y / CELL_SIZE_IN_METERS));

if (x_idx < 0 || x_idx >= MAP_CELLS || y_idx < 0 || y_idx >= MAP_CELLS){
      if (!too_small_grid_alert_shown){
        alert("Ostrzezenie! Przynajmniej jeden obiekt nie miesci sie w siatce! Nalezy powiekszyc siatke!");
        too_small_grid_alert_shown = true;
      }

      return;
    }

    result.push([x_idx, y_idx, p])
  })

  return result
}

const square_map = {
  update_grid: (sq_data, params) => {
    const starting_point = get_drawing_starting_point();

    for (let y = 0; y < MAP_CELLS; ++y){
      for (let x = 0; x < MAP_CELLS; ++x){
        const cell = sq_data[x][y];
        cell.t = [];
        cell.i = [];
        cell.b = [];
      }
    }

    for (let y = 0; y < MAP_CELLS; ++y){
      for (let x = 0; x < MAP_CELLS; ++x){
        const center_pos = geo_move(starting_point, [x * CELL_SIZE_IN_METERS, y * CELL_SIZE_IN_METERS]);

        const surrounding_cells = (() => {
          const result = []

          for (let i = -1; i <= 1; ++i){
            for (let j = -1; j <= 1; ++j){
              if (x + i < 0 || x + i >= MAP_CELLS) continue;
              if (y + j < 0 || y + j >= MAP_CELLS) continue;

              result.push(sq_data[x + i][y + j]);
            }
          }

          return result;
        })()

        surrounding_cells.forEach(cell => {
          cell.t = [...cell.t, ...get_influence_series(cell.pois, center_pos, params)];
          cell.i = [...cell.i, ...get_influence_series(cell.infs, center_pos, params)];
          cell.b = [...cell.b, ...get_influence_series(cell.bgs, center_pos, params)];
        })
      }
    }

    const signals = []
    for (let y = 0; y < MAP_CELLS; ++y){
      for (let x = 0; x < MAP_CELLS; ++x){
        const cell = sq_data[x][y];

        cell.T = get_accumulated_influence(cell.t);
        cell.I = get_accumulated_influence(cell.i);
        cell.B = get_accumulated_influence(cell.b);

        signals.push(get_signal(cell, params));
      }
    }

    const max_signal = Math.max(...signals)

    for (let y = 0; y < MAP_CELLS; ++y){
      for (let x = 0; x < MAP_CELLS; ++x){
        let signal = signals[y * MAP_CELLS + x];

        if (params.use_log_compression){
          signal = log_compression(signal, max_signal);
        }

        sq_data[x][y].drawable.setStyle({
          fillColor: map_to_color(signal)
        }).bindPopup(`Sygnał: ${signal}`);
      }
    }
  },
  is_empty: (sq_data) => {
    return sq_data[0] == undefined || sq_data[0] == null;
  },
  init: (grid_group, static_canvas) => {
    const data = matrix(MAP_CELLS, MAP_CELLS, {});
    for (let y = 0; y < MAP_CELLS; ++y){
      for (let x = 0; x < MAP_CELLS; ++x){
        const starting_point = get_drawing_starting_point();
        const center_pos = geo_move(starting_point, [x * CELL_SIZE_IN_METERS, y * CELL_SIZE_IN_METERS]);

        const bounds = get_square_bounds_around(center_pos[X], center_pos[Y], CELL_SIZE_IN_METERS);
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
  },
  load: (sq_data, poi, inf, bg) => {
    const starting_point = get_drawing_starting_point();

    get_locations_and_corresponding_indices(starting_point, poi).forEach(([x_idx, y_idx, poi]) => {
      sq_data[x_idx][y_idx].pois.push(poi);
    })

    get_locations_and_corresponding_indices(starting_point, inf).forEach(([x_idx, y_idx, inf]) => {
      sq_data[x_idx][y_idx].infs.push(inf);
    })

    get_locations_and_corresponding_indices(starting_point, bg).forEach(([x_idx, y_idx, bg]) => {
      sq_data[x_idx][y_idx].bgs.push(bg);
    })
  },
  on_zoomend: (sq_data, grid_group) => {
    for (let y = 0; y < MAP_CELLS; ++y){
      for (let x = 0; x < MAP_CELLS; ++x){
        sq_data[x][y].drawable.addTo(grid_group);
      }
    }
  }
}
