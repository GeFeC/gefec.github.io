window.App = function App(){
  const MapComponent = window.MapComponent;
  const Controls = window.Controls;

  const [grid_data, set_grid_data] = useState(null);
  const [free_pois_checked, set_free_pois_checked] = useState(false);
  const [free_infs_checked, set_free_infs_checked] = useState(false);
  const [free_bgs_checked, set_free_bgs_checked] = useState(false);

  const [grid_opacity, set_grid_opacity] = useState(0.4);

  const [params, set_params] = useState({
    s: CELL_SIZE_IN_METERS / 2,
    alpha: [0.5, 0.5],
    beta: 0.5,
    rho: 0.05,
    K: 0.5,
    use_log_compression: true,
    weight_schlick: 0.5,
    weight_linear: 1,
    weight_scale_method: "linear"
  })

  const on_data_loaded = (poi, inf, bg) => {
    set_grid_data({
      poi: poi,
      inf: inf,
      bg: bg
    })
  }
  
  const on_free_pois_change = (checked) => {
    set_free_pois_checked(checked);
  }

  const on_free_infs_change = (checked) => {
    set_free_infs_checked(checked);
  }

  const on_free_bgs_change = (checked) => {
    set_free_bgs_checked(checked);
  }

  const on_opacity_slider_change = (value) => {
    set_grid_opacity(value);
  }

  const on_alpha_1_slider_change = (value) => {
    const new_params = structuredClone(params);
    new_params.alpha[0] = value;
    set_params(new_params);
  }

  const on_alpha_2_slider_change = (value) => {
    const new_params = structuredClone(params);
    new_params.alpha[1] = value;
    set_params(new_params);
  }

  const on_beta_slider_change = (value) => {
    const new_params = structuredClone(params);
    new_params.beta = value;
    set_params(new_params);
  }

  const on_rho_slider_change = (value) => {
    const new_params = structuredClone(params);
    new_params.rho = value;
    set_params(new_params);
  }

  const on_K_slider_change = (value) => {
    const new_params = structuredClone(params);
    new_params.K = value;
    set_params(new_params);
  }

  const on_s_slider_change = (value) => {
    const new_params = structuredClone(params);
    new_params.s = value;
    set_params(new_params);
  }

  const on_inc_method_change = (value) => {
    const method_is_inc = get_signal == INC;

    if (value == "sum"){
      INC = INC_prob_sum;
    }
    else if (value == "mean"){
      INC = INC_weight_mean;
    }

    if (method_is_inc){
      get_signal = INC;
    }

    const new_params = structuredClone(params);
    set_params(new_params);
  }

  const on_signal_method_change = (value) => {
    if (value == "dit"){
      get_signal = DIT;
    }
    else if (value == "inc"){
      get_signal = INC;
    }
    else if (value == "pois"){
      get_signal = (cell, params) => cell.T;
    }
    else if (value == "infs"){
      get_signal = (cell, params) => cell.I;
    }
    else if (value == "bgs"){
      get_signal = (cell, params) => cell.B;
    }

    const new_params = structuredClone(params);
    set_params(new_params);
  }

  const on_use_log_compression_change = value => {
    const new_params = structuredClone(params);
    new_params.use_log_compression = value;
    set_params(new_params);
  }

  const on_range_function_change = value => {
    if (value == "gauss"){
      influence = gaussian_influence;
    }
    if (value == "butterworth"){
      influence = butterworth_influence;
    }

    const new_params = structuredClone(params);
    set_params(new_params);
  }

  const on_s_multiply_change = checked => {
    if (checked){
      influence_s = influence_s_weight;
    }
    else{
      influence_s = influence_s_const;
    }

    const new_params = structuredClone(params);
    set_params(new_params);
  }

  const on_weight_linear_change = value => {
    const new_params = structuredClone(params);
    new_params.weight_linear = value;
    set_params(new_params);
  }

  const on_weight_schlick_change = value => {
    const new_params = structuredClone(params);
    new_params.weight_schlick = value;
    set_params(new_params);
  }

  const on_weight_scale_method_change = value => {
    const new_params = structuredClone(params);
    new_params.weight_scale_method = value;
    set_params(new_params);
  }

  return (
    <div>
      <MapComponent 
        grid_data = { grid_data }
        grid_opacity = { grid_opacity }
        free_pois_checked = { free_pois_checked }
        free_infs_checked = { free_infs_checked }
        free_bgs_checked = { free_bgs_checked }
        params = { params }
      />

      <Controls 
        params = { params }
        on_data_loaded = { on_data_loaded }
        on_free_pois_change = { on_free_pois_change }
        on_free_infs_change = { on_free_infs_change }
        on_free_bgs_change = { on_free_bgs_change }
        on_opacity_slider_change = { on_opacity_slider_change }
        on_alpha_1_slider_change = { on_alpha_1_slider_change }
        on_alpha_2_slider_change = { on_alpha_2_slider_change }
        on_s_slider_change = { on_s_slider_change }
        on_inc_method_change = { on_inc_method_change }
        on_signal_method_change = { on_signal_method_change }
        on_use_log_compression_change = { on_use_log_compression_change }
        on_beta_slider_change = { on_beta_slider_change }
        on_rho_slider_change = { on_rho_slider_change }
        on_K_slider_change = { on_K_slider_change }

        on_range_function_change = { on_range_function_change }
        on_s_multiply_change = { on_s_multiply_change }
        on_weight_schlick_change = { on_weight_schlick_change }
        on_weight_linear_change = { on_weight_linear_change }
        on_weight_scale_method_change = { on_weight_scale_method_change }
      />
    </div>
  );
}
