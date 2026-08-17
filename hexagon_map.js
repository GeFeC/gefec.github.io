let triangles = {};
let gl_layer = null;

function toMercator(lat, lng) {
  const x = (lng + 180) / 360;
  const rad = lat * Math.PI / 180;
  const y = 0.5 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / (2 * Math.PI);
  return [x, y];
}

class GouraudMeshLayer extends deck.Layer {
  map = null;

  getShaders() {
    return {
      vs: `
        attribute vec3 positions; 
        attribute vec4 colors;

        uniform vec2 uNW; // Mercator bounds (NW)
        uniform vec2 uSE; // Mercator bounds (SE)

        varying vec4 vColor;


        vec2 latLngToMercator(vec2 lngLat) {
          float lng = lngLat.x;
          float lat = lngLat.y;

          float x = (lng + 180.0) / 360.0;
          float radLat = lat * PI / 180.0;
          float y = 0.5 - log(tan(PI * 0.25 + radLat * 0.5)) / (2.0 * PI);

          return vec2(x, y);
        }

        vec3 srgbToLinear(vec3 color) {
          return pow(color, vec3(3.0));
        }

        void main() {
          vColor = vec4(srgbToLinear(colors.rgb), colors.a);

          vec2 mercator = latLngToMercator(positions.xy);

          vec2 norm = (mercator - uNW) / (uSE - uNW);

          vec2 clipSpace = norm * 2.0 - 1.0;
          clipSpace.y = -clipSpace.y; 

          gl_Position = vec4(clipSpace, 0.0, 1.0);
        }
      `,
      fs: `
        precision mediump float;
        varying vec4 vColor;

        vec3 linearToSrgb(vec3 color) {
          return pow(color, vec3(1.0 / 3.0));
        }

        void main() {
          gl_FragColor = vec4(linearToSrgb(vColor.rgb), vColor.a);
        }
      `,
      modules: [deck.project]
    };
  }

  initializeState() {
    const model = this._getModel(this.context.gl);
    if (model) {
      this.setState({
        model,
        models: [model]
      });
    }
  }

  _getModel(gl) {
    const { mesh } = this.props;
    if (!mesh || !mesh.positions || mesh.positions.length === 0) return null;

    return new luma.Model(gl, {
      ...this.getShaders(),
      id: `${this.props.id}-model`,
      geometry: new luma.Geometry({
        id: `${this.props.id}-geom`,
        drawMode: gl.TRIANGLES,
        attributes: {
          positions: { value: mesh.positions, size: 3 },
          colors: { value: mesh.colors, size: 4 },
          indices: { value: mesh.indices, size: 1 }
        },
      })
    });
  }

  updateState({ props, oldProps, changeFlags }) {
    if (changeFlags.dataChanged || props.mesh !== oldProps.mesh) {
      if (this.state.model) {
        this.state.model.delete();
      }
      const model = this._getModel(this.context.gl);
      if (model) {
        this.setState({
          model,
          models: [model]
        });
      }
    }
  }

  draw(){
    const { model } = this.state;
    if (!model) return;

    const bounds = this.map.getBounds();
    const nw = toMercator(bounds.getNorth(), bounds.getWest());
    const se = toMercator(bounds.getSouth(), bounds.getEast());

    model.setUniforms({
      uNW: nw,
      uSE: se
    });
    model.draw();
  }
}

function lngLatToMeters(lat, lng, anchorLat, anchorLng) {
  const METERS_PER_DEGREE_LAT = ONE_GEO_DEGREE_TO_METERS;
  const radLat = (anchorLat * Math.PI) / 180;
  const METERS_PER_DEGREE_LNG = ONE_GEO_DEGREE_TO_METERS * Math.cos(radLat);

  const dx = (lng - anchorLng) * METERS_PER_DEGREE_LNG; 
  const dy = (lat - anchorLat) * METERS_PER_DEGREE_LAT;
  return [dx, dy];
}

const draw_line = (group, p1, p2, color) => {
  L.polyline([p1, p2], {
    color: color,
    weight: 3,
    opacity: 1.0
  }).addTo(group);
}

const hexagon_map = {
  get_data_as_1d_array: (data) => {
    return [...Object.values(data)]
  },
  update_grid: (hex_data, params, map, visible) => {
    for (let hex_idx in hex_data){
      const hex = hex_data[hex_idx];
      hex.t = [];
      hex.i = [];
      hex.b = [];

      const hex_neighbours = h3.gridDisk(hex_idx, 1);
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

    const h3Entries = Object.entries(hex_data);
    const numPoints = h3Entries.length;

    const positions = new Float32Array(numPoints * 3);
    const colors = new Float32Array(numPoints * 4);
    const coords2D = new Float64Array(numPoints * 2);

    h3Entries.forEach(([h3Index, data], i) => {
      const [lat, lng] = h3.cellToLatLng(h3Index);

      positions[i * 3 + 0] = lng;
      positions[i * 3 + 1] = lat;
      positions[i * 3 + 2] = 0;

      const [r, g, b] = map_to_color_array(data.signal);
      colors[i * 4 + 0] = r / 255;
      colors[i * 4 + 1] = g / 255;
      colors[i * 4 + 2] = b / 255;
      colors[i * 4 + 3] = 255;

      coords2D[i * 2 + 0] = lng;
      coords2D[i * 2 + 1] = lat;
    });

    const delaunay = new d3.Delaunay(coords2D);

    const mesh = {
      colors: colors,
      positions: positions,
      indices: new Uint32Array(delaunay.triangles)
    };

    if (gl_layer != null && gl_layer != undefined){
      map.removeLayer(gl_layer);
    }

    const gouraudLayer = new GouraudMeshLayer({
      id: 'h3-gouraud-layer',
      mesh: mesh,
      visible: visible || false 
    });

    gouraudLayer.map = map;

    gl_layer = new DeckGlLeaflet.LeafletLayer({
      layers: [
        gouraudLayer
      ]
    });

    map.addLayer(gl_layer);

    return gouraudLayer;
  },
  load: (hex_data, poi, inf, bg, h3_params) => {
    const { resolution } = h3_params;

    poi.forEach(p => {
      const hex_index = h3.latLngToCell(p.lat, p.lon, resolution);
      const cell = hex_data[hex_index];
      if (cell == null) return;
      cell.pois.push(p);
    })

    inf.forEach(p => {
      const hex_index = h3.latLngToCell(p.lat, p.lon, resolution);
      const cell = hex_data[hex_index];
      if (cell == null) return;
      cell.infs.push(p);
    })

    bg.forEach(p => {
      const hex_index = h3.latLngToCell(p.lat, p.lon, resolution);
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
  init: (grid_group, static_canvas, h3_params) => {
    const { center_pos } = h3_params;
    const { resolution } = h3_params;
    const { radius } = h3_params;

    const h3_center = h3.latLngToCell(
      center_pos.lat,
      center_pos.lon,
      resolution
    );

    const h3_indices = h3.gridDisk(h3_center, radius);

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
