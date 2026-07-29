const hexagon_map = {
  get_data_as_1d_array: (data) => {
    return [...Object.values(data)]
  },
  update_grid: (hex_data, params) => {
    for (let hex_idx in hex_data){
      const hex = hex_data[hex_idx];
      hex.t = [];
      hex.i = [];
      hex.b = [];

      const hex_neighbours = h3.gridDisk(hex_idx, hex.center_position, 1);
      hex_neighbours.forEach(hex_idx => {
        const hex = hex_data[hex_idx];

        if (hex == null) return;

        hex.t = [...hex.t, ...get_influence_series(hex.pois, hex.center_position, params)];
        hex.i = [...hex.i, ...get_influence_series(hex.infs, hex.center_position, params)];
        hex.b = [...hex.b, ...get_influence_series(hex.bgs, hex.center_position, params)];
      })
    }

    const signals = {};

    for (let hex_idx in hex_data){
      const hex = hex_data[hex_idx];

      hex.T = get_accumulated_influence(hex.t);
      hex.I = get_accumulated_influence(hex.i);
      hex.B = get_accumulated_influence(hex.b);

      signals[hex_idx] = get_signal(hex, params);
    }

    const max_signal = Math.max(...Object.values(signals))

    for (let hex_idx in hex_data){
      const hex = hex_data[hex_idx];

      if (params.use_log_compression){
        signals[hex_idx] = log_compression(signals[hex_idx], max_signal);
      }

      const signal = signals[hex_idx];
      hex.drawable.setStyle({
        fillColor: map_to_color(signal)
      }).bindPopup(`Sygnał: ${signal}`);
      hex.signal = signal;
    }
  },
  load: (hex_data, poi, inf, bg) => {
    poi.forEach(p => {
      const hex_index = h3.latLngToCell(p.lat, p.lon, H3_RESOLUTION);
      const cell = hex_data[hex_index];
      if (cell == null) return;
      cell.pois.push(p);
    })

    inf.forEach(p => {
      const hex_index = h3.latLngToCell(p.lat, p.lon, H3_RESOLUTION);
      const cell = hex_data[hex_index];
      if (cell == null) return;
      cell.infs.push(p);
    })

    bg.forEach(p => {
      const hex_index = h3.latLngToCell(p.lat, p.lon, H3_RESOLUTION);
      const cell = hex_data[hex_index];
      if (cell == null) return;
      cell.bgs.push(p);
    })
  },
  on_zoomend: (hex_data, grid_group) => {
    for (let hex_idx in hex_data){
      const hex = hex_data[hex_idx];

      hex.drawable.addTo(grid_group); 
    }
  },
  is_empty: (hex_data) => {
    return [...Object.values(hex_data)].length == 0;
  },
  init: (grid_group, static_canvas) => {
    const h3_center = h3.latLngToCell(
      KIELCE_POSITION[X],
      KIELCE_POSITION[Y],
      H3_RESOLUTION
    );

    const h3_indices = h3.gridDisk(h3_center, H3_RADIUS);

    const hex_data = {};
    h3_indices.forEach(hex => {
      const boundary = h3.cellToBoundary(hex);
      const polygon = L.polygon(boundary, {
        renderer: static_canvas,
        interactive: true,
        color: '#3b82f6',
        fillColor: '#93c5fd',
        fillOpacity: 0.4,
        weight: 1
      });

      hex_data[hex] = {
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

    Object.entries(hex_data).map(([hexId, data]) => {
      data.drawable.addTo(grid_group);
    })

    return hex_data;
  }
}
