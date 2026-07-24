let too_small_grid_alert_shown = false;

window.MapComponent = function MapComponent(props){
  const { grid_data } = props;
  const { params } = props;

  const map_ref = useRef(null);
  const grid_group_ref = useRef(null);
  const pois_group_ref = useRef(null);
  const infs_group_ref = useRef(null);
  const bgs_group_ref = useRef(null);
  const static_canvas_ref = useRef(null);

  const pois_ref = useRef(null);
  const infs_ref = useRef(null);
  const bgs_ref = useRef(null);

  const map_style = {
    width: '100vw',
    height: '100vh',
    borderRadius: '8px'
  };

  const CellData = {
    weight: 0,
    pois: [],
    t: [],
    T: 0,
    infs: [],
    i: [],
    I: 0,
    bgs: [],
    b: [],
    B: 0 
  };

  const grid_ref = useRef(matrix(MAP_CELLS, MAP_CELLS, null));
  const cells_data_ref = useRef(matrix(MAP_CELLS, MAP_CELLS, CellData));

  const free_locations_opacity_ref = useRef({
    pois: null,
    infs: null,
    bgs: null
  });

  const get_square_bounds_around = (center_lat, center_lng, meters) => {
    const half_size = meters / 2;
    const lat_delta = half_size / ONE_GEO_DEGREE_TO_METERS;
    const lng_delta = half_size / (ONE_GEO_DEGREE_TO_METERS * Math.cos(radians(center_lat)))

    return [
      [center_lat - lat_delta, center_lng - lng_delta],
      [center_lat + lat_delta, center_lng + lng_delta],
    ]
  }

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

  const draw_rect = (group, bounds, color) => {
    return L.rectangle(bounds, {
      renderer: static_canvas_ref.current,
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.4,
      opacity: 0,
      interactive: true
    }).addTo(group);
  }

  const draw_free_location_rect = (group, opacity, name, bounds, color) => {
    const rect = L.rectangle(bounds, {
      renderer: static_canvas_ref.current,
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: opacity,
      opacity: 0
    }).addTo(group).bindPopup(name);
  }

  const draw_line = (p1, p2, color) => {
    L.polyline([p1, p2], {
      color: color,
      weight: 3,
      opacity: 1.0
    }).addTo(map_ref.current);
  }

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

  const update_grid = () => {
    const starting_point = get_drawing_starting_point();

    for (let y = 0; y < MAP_CELLS; ++y){
      for (let x = 0; x < MAP_CELLS; ++x){
        const cell = cells_data_ref.current[x][y];
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

              result.push(cells_data_ref.current[x + i][y + j]);
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
        const cell = cells_data_ref.current[x][y];

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

        grid_ref.current[x][y].setStyle({
          fillColor: map_to_color(signal)
        }).bindPopup(`Sygnał: ${signal}`);
      }
    }
  }

  useEffect(() => {
    if (!grid_ref.current[0][0]) return;

    update_grid();
  }, [params])

  useEffect(() => {
    const map = L.map('map', {
      preferCanvas: true
    }).setView(KIELCE_POSITION, DEFAULT_ZOOM);
        
    const grid_group = L.featureGroup().addTo(map);
    const pois_group = L.featureGroup().addTo(map);
    const infs_group = L.featureGroup().addTo(map);
    const bgs_group = L.featureGroup().addTo(map);
    const static_canvas = L.canvas({ pane: 'overlayPane' });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    map_ref.current = map;
    grid_group_ref.current = grid_group;
    pois_group_ref.current = pois_group;
    infs_group_ref.current = infs_group;
    bgs_group_ref.current = bgs_group;
    static_canvas_ref.current = static_canvas;
    
    free_locations_opacity_ref.current = {
      pois: free_pois_checked,
      infs: free_infs_checked,
      bgs: free_bgs_checked
    }

    for (let y = 0; y < MAP_CELLS; ++y){
      for (let x = 0; x < MAP_CELLS; ++x){
        const starting_point = get_drawing_starting_point();
        const center_pos = geo_move(starting_point, [x * CELL_SIZE_IN_METERS, y * CELL_SIZE_IN_METERS]);

        grid_ref.current[x][y] = draw_rect(grid_group, get_square_bounds_around(center_pos[X], center_pos[Y], CELL_SIZE_IN_METERS), "rgb(0,0,255)");
      }
    }

    map_ref.current.on("zoomend", function() {
      if (bgs_ref.current == null) return;

      pois_group_ref.current.clearLayers();
      infs_group_ref.current.clearLayers();
      bgs_group_ref.current.clearLayers();

      grid_group_ref.current.clearLayers();


      for (let y = 0; y < MAP_CELLS; ++y){
        for (let x = 0; x < MAP_CELLS; ++x){
          grid_ref.current[x][y].addTo(grid_group_ref.current);
        }
      }

      const zoom = map_ref.current.getZoom();

      const new_size = DEFAULT_LOCATIONS_SIZE / Math.pow(2, zoom - DEFAULT_ZOOM);
      draw_all_free_locations(new_size);
    })
  }, [])

  const { free_pois_checked, free_infs_checked, free_bgs_checked } = props;

  const draw_all_free_locations = (size) => {
    const draw_locations = (group, color, opacity) => {
      return (p) => {
        const { lat, lon } = p;
        const weight = choose_not_null([p.WAGA, p.Weight]);
        draw_free_location_rect(group.current, opacity, `Waga: ${weight}`, get_square_bounds_around(lat, lon, size), color);
      }
    }

    const { poi, inf, bg } = free_locations_opacity_ref.current;
    bgs_ref.current.forEach(draw_locations(bgs_group_ref, "#ff00ff", bg ? 1 : 0))
    infs_ref.current.forEach(draw_locations(infs_group_ref, "#ffffff", inf ? 1 : 0));
    pois_ref.current.forEach(draw_locations(pois_group_ref, "#000000", poi ? 1 : 0));
  }

  useEffect(() => {
    if (!grid_data) return;

    const { poi, inf, bg } = grid_data;

    if (!poi) alert("Nie udalo sie wczytac POIów :((");
    if (!inf) alert("Nie udalo sie wczytac INFów :((");
    if (!bg) alert("Nie udalo sie wczytac BGów :((");

    pois_ref.current = poi;
    infs_ref.current = inf;
    bgs_ref.current = bg;

    const starting_point = get_drawing_starting_point();

    get_locations_and_corresponding_indices(starting_point, poi).forEach(([x_idx, y_idx, poi]) => {
      cells_data_ref.current[x_idx][y_idx].pois.push(poi);
    })

    get_locations_and_corresponding_indices(starting_point, inf).forEach(([x_idx, y_idx, inf]) => {
      cells_data_ref.current[x_idx][y_idx].infs.push(inf);
    })

    get_locations_and_corresponding_indices(starting_point, bg).forEach(([x_idx, y_idx, bg]) => {
      cells_data_ref.current[x_idx][y_idx].bgs.push(bg);
    })

    draw_all_free_locations(DEFAULT_LOCATIONS_SIZE);

    pois_group_ref.current.setStyle({ fillOpacity: 0 });
    infs_group_ref.current.setStyle({ fillOpacity: 0 });
    bgs_group_ref.current.setStyle({ fillOpacity: 0 });

    update_grid();
  }, [grid_data])


  useEffect(() => {
    free_locations_opacity_ref.current.poi = free_pois_checked;
    pois_group_ref.current.setStyle({ 
      fillOpacity: free_pois_checked ? 1 : 0
    });
  }, [free_pois_checked])

  useEffect(() => {
    free_locations_opacity_ref.current.inf = free_infs_checked;
    infs_group_ref.current.setStyle({ 
      fillOpacity: free_infs_checked ? 1 : 0
    });
  }, [free_infs_checked])

  useEffect(() => {
    free_locations_opacity_ref.current.bg = free_bgs_checked;
    bgs_group_ref.current.setStyle({ 
      fillOpacity: free_bgs_checked ? 1 : 0
    });
  }, [free_bgs_checked])

  const { grid_opacity } = props;

  useEffect(() => {
    grid_group_ref.current.setStyle({
      fillOpacity: grid_opacity
    })
  }, [grid_opacity])

  return (
    <div id="map" style={map_style}>
    </div>
  )
}
