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

  const hex_data_ref = useRef({});

  const pois_ref = useRef(null);
  const infs_ref = useRef(null);
  const bgs_ref = useRef(null);

  const free_locations_ref = useRef([]);

  const map_style = {
    width: '100vw',
    height: '100vh',
    borderRadius: '8px'
  };

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

  const draw_free_location_rect = (group, opacity, name, bounds, color) => {
    const rect = L.rectangle(bounds, {
      renderer: static_canvas_ref.current,
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: opacity,
      opacity: 0
    }).addTo(group).bindPopup(name);

    return rect;
  }

  const update_grid = () => {
    for (let hex_idx in hex_data_ref.current){
      const hex = hex_data_ref.current[hex_idx];
      hex.t = [];
      hex.i = [];
      hex.b = [];

      const hex_neighbours = h3.gridDisk(hex_idx, hex.center_position, 1);
      hex_neighbours.forEach(hex_idx => {
        const hex = hex_data_ref.current[hex_idx];

        if (hex == null) return;

        hex.t = [...hex.t, ...get_influence_series(hex.pois, hex.center_position, params)];
        hex.i = [...hex.i, ...get_influence_series(hex.infs, hex.center_position, params)];
        hex.b = [...hex.b, ...get_influence_series(hex.bgs, hex.center_position, params)];
      })
    }

    const signals = {};

    for (let hex_idx in hex_data_ref.current){
      const hex = hex_data_ref.current[hex_idx];

      hex.T = get_accumulated_influence(hex.t);
      hex.I = get_accumulated_influence(hex.i);
      hex.B = get_accumulated_influence(hex.b);

      signals[hex_idx] = get_signal(hex, params);
    }

    const max_signal = Math.max(...Object.values(signals))

    for (let hex_idx in hex_data_ref.current){
      const hex = hex_data_ref.current[hex_idx];

      if (params.use_log_compression){
        signals[hex_idx] = log_compression(signals[hex_idx], max_signal);
      }

      const signal = signals[hex_idx];
      hex.drawable.setStyle({
        fillColor: map_to_color(signal)
      }).bindPopup(`Sygnał: ${signal}`);
    }
  }

  useEffect(() => {
    if ([...Object.values(hex_data_ref.current)].length == 0) return;

    update_grid();
  }, [params])

  //INIT
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

    const h3_center = h3.latLngToCell(
      KIELCE_POSITION[X],
      KIELCE_POSITION[Y],
      H3_RESOLUTION
    );

    const h3_indices = h3.gridDisk(h3_center, H3_RADIUS);

    h3_indices.map(hex => {
      const boundary = h3.cellToBoundary(hex);
      const polygon = L.polygon(boundary, {
        renderer: static_canvas,
        interactive: true,
        color: '#3b82f6',
        fillColor: '#93c5fd',
        fillOpacity: 0.4,
        weight: 1
      });

      hex_data_ref.current[hex] = {
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
        center_position: h3.cellToLatLng(hex)
      };
    });

    grid_group_ref.current = L.featureGroup().addTo(map);

    Object.entries(hex_data_ref.current).map(([hexId, data]) => {
      data.drawable.addTo(grid_group_ref.current);
    })

    map_ref.current.on("zoomend", function() {
      if (bgs_ref.current == null) return;


      grid_group_ref.current.clearLayers();

      for (let hex_idx in hex_data_ref.current){
        const hex = hex_data_ref.current[hex_idx];

        hex.drawable.addTo(grid_group_ref.current); 
      }

      const zoom = map_ref.current.getZoom();

      free_locations_ref.current = [];
      pois_group_ref.current.clearLayers();
      infs_group_ref.current.clearLayers();
      bgs_group_ref.current.clearLayers();
      const new_size = DEFAULT_LOCATIONS_SIZE / Math.pow(2, zoom - DEFAULT_ZOOM);

      current_zoom.current = new_size;
      draw_all_free_locations(new_size);
    })
  }, [])

  const { free_pois_checked, free_infs_checked, free_bgs_checked } = props;

  const get_weight = location => {
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

      t.push(influence(d, get_weight(p), params));

    })

    return t
  }

  const current_zoom = useRef(DEFAULT_ZOOM);

  const draw_all_free_locations = (size) => {
    const draw_locations = (group, color, opacity) => {
      return (p) => {
        const { lat, lon } = p;
        const weight = get_weight(p);

        const drawable = draw_free_location_rect(
          group.current, 
          opacity, 
          `Waga: ${weight}`, 
          get_square_bounds_around(lat, lon, size), 
          color
        );

        free_locations_ref.current.push({
          drawable: drawable,
          data: p
        });
      }
    }

    const { poi, inf, bg } = free_locations_opacity_ref.current;
    bgs_ref.current.forEach(draw_locations(bgs_group_ref, "#ff00ff", bg ? 1 : 0))
    infs_ref.current.forEach(draw_locations(infs_group_ref, "#ffffff", inf ? 1 : 0));
    pois_ref.current.forEach(draw_locations(pois_group_ref, "#000000", poi ? 1 : 0));
  }

  useEffect(() => {
    free_locations_ref.current.forEach(({ drawable, data }) => {
      drawable.bindPopup(`Waga: ${get_weight(data)}`)
    })  
    console.log("UPDATE")
  }, [params.weight_schlick, params.weight_linear, params.weight_scale_method])

  useEffect(() => {
    if (!grid_data) return;

    const { poi, inf, bg } = grid_data;

    if (!poi) alert("Nie udalo sie wczytac POIów :((");
    if (!inf) alert("Nie udalo sie wczytac INFów :((");
    if (!bg) alert("Nie udalo sie wczytac BGów :((");

    pois_ref.current = poi;
    infs_ref.current = inf;
    bgs_ref.current = bg;

    poi.forEach(p => {
      const hex_index = h3.latLngToCell(p.lat, p.lon, H3_RESOLUTION);
      const cell = hex_data_ref.current[hex_index];
      if (cell == null) return;
      cell.pois.push(p);
    })

    inf.forEach(p => {
      const hex_index = h3.latLngToCell(p.lat, p.lon, H3_RESOLUTION);
      const cell = hex_data_ref.current[hex_index];
      if (cell == null) return;
      cell.infs.push(p);
    })

    bg.forEach(p => {
      const hex_index = h3.latLngToCell(p.lat, p.lon, H3_RESOLUTION);
      const cell = hex_data_ref.current[hex_index];
      if (cell == null) return;
      cell.bgs.push(p);
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
