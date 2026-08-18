window.MapComponent = function MapComponent(props){
  const { grid_data } = props;
  const { params } = props;

  const map_ref = useRef(null);
  const grid_group_ref = useRef(null);
  const pois_group_ref = useRef(null);
  const infs_group_ref = useRef(null);
  const bgs_group_ref = useRef(null);
  const static_canvas_ref = useRef(null);
  const current_map_ref = useRef(hexagon_map);
  const gl_layer_visible_ref = useRef(false);

  const data_ref = useRef({});

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
    current_map_ref.current.update_grid(data_ref.current, params, map_ref.current, gl_layer_visible_ref.current);
    props.update_histogram(
      current_map_ref.current.get_data_as_1d_array(data_ref.current)
        .map(e => e.signal)
    );

    const overlay = document.getElementById("deckgl-overlay");
    if (overlay){
      overlay.style.opacity = grid_opacity
    }
  }

  useEffect(() => {
    if (current_map_ref.current.is_empty(data_ref.current)) return;

    update_grid();
  }, [params])

  //INIT
  useEffect(() => {
    const map = L.map('map', {
      preferCanvas: true
    }).setView([52.0, 19.3], 6)
        
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
  }, [])

  const redraw_everything = () => {
    grid_group_ref.current.clearLayers();

    if (gl_layer_visible_ref.current == false){
      current_map_ref.current.on_zoomend(data_ref.current, grid_group_ref.current);
    }

    const zoom = map_ref.current.getZoom();

    free_locations_ref.current = [];
    pois_group_ref.current.clearLayers();
    infs_group_ref.current.clearLayers();
    bgs_group_ref.current.clearLayers();
    const new_size = DEFAULT_LOCATIONS_SIZE / Math.pow(2, zoom - DEFAULT_ZOOM);

    current_zoom.current = new_size;
    draw_all_free_locations(new_size);
  }

  useEffect(() => {
    if (bgs_ref.current == null) return;
    grid_group_ref.current.clearLayers();
    if (props.current_map == SQUARE_MAP){
      current_map_ref.current = square_map;
    }
    else{
      current_map_ref.current = hexagon_map;
    }

    init_grid(props.hex_resolution, props.sq_resolution);
    update_grid();

    redraw_everything();
  }, [props.current_map, props.hex_resolution, props.sq_resolution])

  const { free_pois_checked, free_infs_checked, free_bgs_checked } = props;

  const current_zoom = useRef(DEFAULT_ZOOM);

  const draw_all_free_locations = (size) => {
    const draw_locations = (group, color, opacity) => {
      return (p) => {
        const { lat, lon } = p;
        const weight = get_weight(p, params);

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
      drawable.bindPopup(`Waga: ${get_weight(data, params)}`)
    })  
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


    map_ref.current.on("zoomend", function() {
      if (bgs_ref.current == null) return;
      redraw_everything();
    })

    const { center_pos } = init_grid(props.hex_resolution, props.sq_resolution);

    map_ref.current.setView(center_pos, DEFAULT_ZOOM);

    draw_all_free_locations(DEFAULT_LOCATIONS_SIZE);

    pois_group_ref.current.setStyle({ fillOpacity: 0 });
    infs_group_ref.current.setStyle({ fillOpacity: 0 });
    bgs_group_ref.current.setStyle({ fillOpacity: 0 });

    update_grid();
  }, [grid_data])

  const init_grid = (hex_resolution, sq_resolution) => {
    const bounding_circle = getFastBoundingGeoCircle([
      ...pois_ref.current,
      ...infs_ref.current,
      ...bgs_ref.current
    ])

    const params = {
      center_pos: bounding_circle.center
    };

    if (current_map_ref.current == hexagon_map){
      params.resolution = hex_resolution;
      params.radius = Math.ceil(bounding_circle.radiusMeters / h3.getHexagonEdgeLengthAvg(params.resolution, 'm') / Math.sqrt(3));
    }
    else{
      params.square_size = sq_resolution;
      params.map_size = Math.ceil(bounding_circle.radiusMeters * 2 / params.square_size);

    }

    data_ref.current = current_map_ref.current.init(grid_group_ref.current, static_canvas_ref.current, params);
    
    current_map_ref.current.load(
      data_ref.current, 
      pois_ref.current, 
      infs_ref.current, 
      bgs_ref.current,
      params
    );

    return { center_pos: params.center_pos }
  }

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

    const overlay = document.getElementById("deckgl-overlay");
    if (overlay){
      overlay.style.opacity = grid_opacity
    }
  }, [grid_opacity])

  useEffect(() => {
    if (bgs_ref.current == null) return;

    if (props.gl_layer_enabled){
      gl_layer_visible_ref.current = true;
    }
    else{
      gl_layer_visible_ref.current = false;
    }

    redraw_everything();
    update_grid();


  }, [props.gl_layer_enabled])

  return (
    <div id="map" style={map_style}>
    </div>
  )
}
