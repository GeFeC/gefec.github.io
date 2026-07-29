window.Slider = function Slider(props){
  const { name, value } = props;

  const [val, set_val] = useState(value)

  const { on_change } = props;

  const handle_on_change = e => {
    set_val(e.target.value);
    on_change(parseFloat(e.target.value));
  }

  const min = props.min || 0;
  const max = props.max || 1;
  const step = props.step || 0.05;

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

  return (
    <div style={props.style || style}>
      <span>{name} : {val}</span>

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
