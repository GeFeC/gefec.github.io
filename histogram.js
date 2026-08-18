window.Histogram = function Histogram(props){
  const [buckets, set_buckets] = useState([]);
  const {min, max} = props.interval;

  useEffect(() => {
    const { bars } = props;

    const intervals = [];

    for (let i = 0; i < bars; ++i){
      intervals.push({
        min: i / bars,
        max: (i + 1) / bars
      })
    }

    const buckets = intervals.map(_ => [])

    props.data.forEach(value => {
      if (value < min || value > max) return;

      const idx = Math.min(bars - 1, Math.trunc((value - min) / (max - min) * bars));
      if (idx < 0 || idx >= buckets.length){
        alert(`buckets[idx] index out of range. idx: ${idx}, value: ${value}`);
      }
      else if (buckets[idx] == undefined){
        alert(`buckets[idx] undefined. idx: ${idx}, value: ${value}`);
      }
      else buckets[idx].push(value);
    })

    const max_bucket = Math.max(...buckets.map(e => e.length))

    set_buckets(buckets.map(e => ({
      data: e,
      height: e.length / max_bucket
    })));
  }, [props])

  const style = {
    width: '100%',
    height: 'calc(100% - 30px)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    border: '1px solid black'
  }

  const get_bar_width = () => {
    return `calc(${ 100 / props.bars }% - 10px)`;
  }

  return (
    <div style={{ height: '100%' }}>
      <div style={style}>
        {
          buckets.map((e, index) => {

            const bar_width = get_bar_width();
            const bar_height = `${ e.height }`;

            const style = {
              width: bar_width, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              textAlign: 'center'
            }

            return (
              <div style={ style } key={index}>
                <div style={{ height: '16px' }}>
                  { e.data.length }
                </div>
                <div style={{ height: `calc(calc(100% - 16px) * ${e.height})`, background: 'black' }}>

                </div>
              </div>
            )
          })
        }
      </div>

      <div style={{ 
        height: '30px', 
        width: '100%',
        position: 'relative'
      }}>
        {
          [...Array(props.bars + 1).keys()].map(i => {
            return (
              <span key={i} style={{ 
                textAlign: 'center',
                position: 'absolute',
                transform: 'translateX(-50%)',
                left: `${i / props.bars * 100}%`
              }}>
                { Math.round(min * 100 + (max - min) * 100 * i / (props.bars)) / 100 }
              </span>
            )
          })
        }
      </div>
    </div>
  )
};
