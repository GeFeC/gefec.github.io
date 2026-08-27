function HexagonIcon(){
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-hexagon" viewBox="0 0 16 16">
  <path d="M14 4.577v6.846L8 15l-6-3.577V4.577L8 1zM8.5.134a1 1 0 0 0-1 0l-6 3.577a1 1 0 0 0-.5.866v6.846a1 1 0 0 0 .5.866l6 3.577a1 1 0 0 0 1 0l6-3.577a1 1 0 0 0 .5-.866V4.577a1 1 0 0 0-.5-.866z"/>
</svg>
  )
}

function SquareIcon(){
  return (
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-square" viewBox="0 0 16 16">
  <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
</svg>
  )
}

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
    top: '0px',
    right: '0px',
    margin: '10px',
    borderRadius: '8px',
    fontFamily: 'sans-serif',
    padding: '10px 15px',
    background: 'white',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    zIndex: 1000,
    width: 'min(calc(100vw - 20px), 450px)',
    maxHeight: 'calc(80vh - 20px)',
    overflowX: 'scroll',
    boxSizing: 'border-box'
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

  const checkbox_wrapper_style = {
    display: 'flex',
    justifyContent: 'space-between',
    width: '200px'
  }

  const button_style = {
    width: '50px',
    height: '50px',
    fontSize: '24px',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '5px'
  }

  const windowRef = useRef(null);

  useEffect(() => {
    if (!windowRef.current) return;

    const restrictionModifier = interact.modifiers.restrictRect({
      restriction: 'window', 
      endOnly: false
    });

    interact(windowRef.current)
      .draggable({
        allowFrom: '.window-header', 
        modifiers: [restrictionModifier],
        listeners: {
          move(event) {
            const target = event.target;
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
          }
        }
      })

    return () => interactable.unset();
  }, []);

  return (
    <div style={style} ref={windowRef}>
      <div>
        <div className="window-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3 style={h_style}>Wybierz plik z danymi</h3>
            <input onChange={read_file} type="file" id="excel-file" accept=".xlsx, .xls" />
          </div>

          <button onClick={ props.on_map_change } style={button_style}>
            { props.current_map == HEX_MAP ? (<HexagonIcon/>) : (<SquareIcon/>) }
          </button>

        </div>

        <hr/>

          {
            props.current_map == HEX_MAP ? (
              <Slider
                name="Rozdzielczość" 
                value={ 9 }
                step={ 1 }
                key="res-hex" 
                on_change={ props.on_hex_res_change }
                min={ 6 }
                max={ 10 }
              />
            ) : (
              <Slider
                name="Rozdzielczość" 
                value={ DEFAULT_CELL_SIZE_IN_METERS }
                step={ 5 }
                key="res-sq" 
                on_change={ props.on_sq_res_change }
                min={ 100 }
                max={ 2000 }
              />
            )
          }

          {
            props.current_map == HEX_MAP ? (
              <div>
                <Checkbox name="Wygładzanie" on_change={ props.on_gl_change }/>
              </div>
            ) : ""
          }

        <hr/>

        <h4 style={h_style}>
          Dokładne położenie obiektów:
        </h4>

        <div style={checkbox_wrapper_style}>
          <Checkbox name="POI" on_change={ on_free_pois_change }/>
          <Checkbox name="INF" on_change={ on_free_infs_change }/>
          <Checkbox name="BG" on_change={ on_free_bgs_change }/>
        </div>

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
              max={ 10 }
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
              min={ 0 }
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
                    key="alpha_1"
                    name={ <span>α<sub>1</sub></span> }
                    value={ 0.5 }
                    on_change={ on_alpha_1_slider_change }
                  />

                  <Slider 
                    key="alpha_2"
                    name={ <span>α<sub>2</sub></span> }
                    value={ 0.5 }
                    on_change={ on_alpha_2_slider_change }
                  />
                </div>
              ) : (
                <Slider 
                  key="alpha"
                  name={ <span>α</span> }
                  value={ params.alpha0 }
                  on_change={ props.on_alpha_slider_change }
                />
              )
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
          max={ 1000 }
          step={ 1 }
          on_change={ on_s_slider_change }
        />

        <Checkbox
          name="Pomnóż s przez (1 + W)^2"
          on_change={ props.on_s_multiply_change }
        />

        <hr/>

        <h4 style={h_style}>
          Skaluj wagi:
        </h4>

        <SelectList
          options={[
            {
              name: "Skalowanie liniowe",
              key: "linear"
            },
            {
              name: "Funkcja Schlicka",
              key: "schlick"
            },
          ]}
          on_change = { props.on_weight_scale_method_change }
        />

        {
          params.weight_scale_method == "schlick" ?
            (<div>
              <Slider 
                key="option-a"
                name="Punkt (x,1-x) "
                value={ params.weight_schlick }
                step={0.01}
                on_change={ props.on_weight_schlick_change }
              />
            </div>) :
            (<div>
              <Slider 
                key="option-b"
                name="Mnożnik"
                min={ 0 }
                max={ 10 }
                value={ params.weight_linear }
                on_change={ props.on_weight_linear_change }
              />
            </div>)
        }

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
