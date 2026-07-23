window.Controls = function Controls(props){
  const Checkbox = window.Checkbox;
  const Slider = window.Slider;
  const SelectList = window.SelectList;

  const { on_data_loaded } = props;

  const [inc_method, set_inc_method] = useState("mean")
  const [signal, set_signal] = useState("dit")

  const { params } = props;

  const style = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    borderRadius: '8px',
    fontFamily: 'sans-serif',
    padding: '10px 15px',
    background: 'white',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    zIndex: 1000,
    width: '400px'
  };

  const read_file = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(event) {
      const data = new Uint8Array(event.target.result);
      
      const workbook = XLSX.read(data, { type: 'array' });
      
      const get_json = sheet_name => XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name]);
      on_data_loaded(
        get_json("POI"),
        get_json("INF"),
        get_json("BG")
      );
    };

    reader.readAsArrayBuffer(file)
  }

  const { 
    on_free_pois_change, 
    on_free_infs_change,
    on_free_bgs_change,
    on_opacity_slider_change,
    on_alpha_1_slider_change,
    on_alpha_2_slider_change,
    on_s_slider_change,
    on_inc_method_change,
    on_signal_method_change,
    on_use_log_compression_change
  } = props;

  const h_style = {
    margin: 0,
    marginTop: '5px',
    marginBottom: '5px'
  }

  return (
    <div style={style}>
      <div>
        <h3 style={h_style}>Wybierz plik z danymi</h3>
        <input onChange={read_file} type="file" id="excel-file" accept=".xlsx, .xls" />

        <hr/>

        <h4 style={h_style}>
          Dokładne położenie obiektów:
        </h4>

        <Checkbox name="POI" on_change={ on_free_pois_change }/>
        <Checkbox name="INF" on_change={ on_free_infs_change }/>
        <Checkbox name="BG" on_change={ on_free_bgs_change }/>

        <hr/>

        <h4 style={h_style}>
          Sygnał:
        </h4>

        <SelectList
          options={ [ 
            {
              name: "DIT",
              key: "dit"
            },
            {
              name: "INC",
              key: "inc"
            },
            { 
              name: "Obiekty turystyczne POI (T)", 
              key: "pois"
            },
            {
              name: "Infrastruktura INF (I)",
              key: "infs"
            },
            {
              name: "Obiekty tła BG (B)",
              key: "bgs"
            }
          ] }

          on_change = { e => {
            set_signal(e);
            on_signal_method_change(e);
          } }
        />

        {
          signal == "dit" ? <div>
            <Slider 
              name="β"
              value={ params.beta }
              on_change={ props.on_beta_slider_change }
            />

            <Slider 
              name="ρ"
              value={ params.rho }
              on_change={ props.on_rho_slider_change }
            />

            <Slider 
              name="K"
              value={ params.K }
              on_change={ props.on_K_slider_change }
            />
          </div> : ""
        }


        <Checkbox
          name="Użyj kompresji logarytmicznej"
          on_change={ on_use_log_compression_change }
          checked
        />

        <hr/>

        {
          signal == "dit" || signal == "inc" ? <div>
            <h4 style={h_style}>
              Metoda składania sygnałów inkrementujących (INC):
            </h4>

            <SelectList
              options={ [ 
                { 
                  name: "Średnia ważona", 
                  key: "mean"
                },
                {
                  name: "Suma probabilistyczna",
                  key: "sum"
                }
              ] }

              on_change = { e => {
                set_inc_method(e);
                on_inc_method_change(e);
              } }
            />

            {
              inc_method == "mean" ? (
                <div>
                  <Slider 
                    name={ <span>α<sub>1</sub></span> }
                    value={ 0.5 }
                    on_change={ on_alpha_1_slider_change }
                  />

                  <Slider 
                    name={ <span>α<sub>2</sub></span> }
                    value={ 0.5 }
                    on_change={ on_alpha_2_slider_change }
                  />
                </div>
              ) : ""
            }
            <hr/>


          </div> : ""
        }
        <h4 style={h_style}>
          Funkcja zasięgu:
        </h4>

        <SelectList
          options={[
            {
              name: "Gauss",
              key: "gauss"
            },
            {
              name: "Butterworth",
              key: "butterworth"
            },
          ]}
          on_change = { props.on_range_function_change }
        />

        <Slider 
          name="s"
          value={ params.s }
          min={ 0 }
          max={ CELL_SIZE_IN_METERS }
          step={ 1 }
          on_change={ on_s_slider_change }
        />

        <Checkbox
          name="Pomnóż s przez (1 + W^2)"
          on_change={ props.on_s_multiply_change }
        />

        <hr/>



        <span style={ { fontWeight: 700 } }>
          <Slider 
            name="Opacity siatki"
            value={ 0.4 }
            on_change={ on_opacity_slider_change }
          />
        </span>
      </div>
    </div>
  )
}
