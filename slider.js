window.Slider = function Slider(props){
  const { name, value } = props;

  const [val, set_val] = useState(value)

  const { on_change } = props;

  const handle_on_change = e => {
    if (e.target.value == ""){
      return;
    }

    set_val(e.target.value);
    on_change(clamp(parseFloat(e.target.value), min, max));
  }

  const min = props.min || 0;
  const max = props.max || 1;
  const step = props.step || 0.05;

  const handle_on_number_change = e => {
    if (e.target.value == "") {
      set_val("");
    }

    const new_val = parseFloat(e.target.value);

    if (!isNaN(new_val)){
      const clamped_val = clamp(new_val, min, max);
      set_val(new_val);
      on_change(clamped_val);
    }
    else{
      set_val(e.target.value)
    }

  };

  const style = {
    minWidth: '350px',
    minHeight: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const slider_wrapper_style = {
    display: 'flex',
    alignItems: 'center'
  };

  const number_input_style = {
    width: '50px',
    border: 'none',
    outline: 'none'
  }

  return (
    <div style={props.style || style}>
      <span>
        {name} 
        : 
        <input 
          type="number" 
          value={val}
          style={number_input_style}
          onChange={ handle_on_number_change }
          step={ step }
        />
      </span>

      <div style={slider_wrapper_style}>
        { min }
        <input 
          onChange={ handle_on_change } 
          type="range" 
          id="slider" 
          min={ min } 
          max={ max }
          step={ step }
          value={ val }
        />
        { max }
      </div>
    </div> 
  );
}
