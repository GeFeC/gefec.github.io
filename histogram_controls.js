function useBind(initialValue) {
  const [value, setValue] = useState(initialValue);
  return {
    value,
    onChange: (e) => setValue(e.target.value)
  };
}

window.HistogramControls = function HistogramControls(props){
  const windowRef = useRef(null);

  const bars = useBind(10);
  const min = useBind(0);
  const max = useBind(1);
  const opacity = useBind(1);

  const style = {
    position: 'absolute',
    boxSizing: 'border-box',
    margin: '10px',
    top: '0px',
    left: '0px',
    borderRadius: '8px',
    fontFamily: 'sans-serif',
    padding: '10px 10px',
    background: 'white',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    zIndex: 1000,
    width: '400px',
    height: '300px',
    display: 'flex',
    flexDirection: 'column'
  };

  useEffect(() => {
    interact(windowRef.current)
      .draggable({
        allowFrom: '.window-header-h', 
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
      }).resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: {
          move(event) {
            let { x, y } = event.target.dataset;
            x = (parseFloat(x) || 0) + event.deltaRect.left;
            y = (parseFloat(y) || 0) + event.deltaRect.top;

            Object.assign(event.target.style, {
              width: `${event.rect.width}px`,
              height: `${event.rect.height}px`,
              transform: `translate(${x}px, ${y}px)`
            });

            Object.assign(event.target.dataset, { x, y });
          }
        }
      });

    return () => interactable.unset();
  }, [])

  useEffect(() => {

  }, [props.data])

  const input_style = {
    width: '50px',
    marginRight: '10px'
  }

  return (
    <div style={{...style, opacity: opacity.value }} ref={windowRef}>
      <div style={{ fontSize: '24px', fontWeight: '700' }} className="window-header-h">
        { props.signal_function }
      <hr/>
      </div>

      <div style={{ marginBottom: '5px' }}>
        Słupki: <input style={input_style} type="number" {...bars}/>
        Min: <input min={0} step={ 0.05 } style={input_style} type="number" {...min}/>
        Max: <input max={1} step={ 0.05 } style={input_style} type="number" {...max}/>
      </div>

      <div style={{ flex: '1' }}>
        <Histogram
          data={ props.data }
          bars={ parseInt(bars.value) }
          interval={ { min: min.value, max: max.value } }
        />

      </div>
        <div style={{ maxWidth: '300px' }}>
          <Slider
            name="Opacity"
            value={ opacity.value }
            min={0.1}
            on_change={ (e) => { 
              opacity.onChange({ target: { value: e } }) 
            } }
          />
        </div>
    </div>
  )
}
