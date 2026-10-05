window.Wasserstein = function Wasserstein({data}){
  const windowRef = useRef(null);

  const [from, set_from] = useState("poi");
  const [to, set_to] = useState("poi");

  const [result, set_result] = useState(0);
  const [duration, set_duration] = useState(0);

  const [allT, set_allT] = useState(0)
  const [allI, set_allI] = useState(0)
  const [allB, set_allB] = useState(0)

  const style = {
    position: 'absolute',
    boxSizing: 'border-box',
    margin: '10px',
    top: '320px',
    left: '0px',
    borderRadius: '8px',
    fontFamily: 'sans-serif',
    padding: '10px 10px',
    background: 'white',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    zIndex: 1000,
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  };

  useEffect(() => {
    if (!windowRef.current) return;

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
      });

    return () => interactable.unset();
  }, [])

  const h1_style = {
    textAlign: 'center',
    margin: "0"
  }

  const wrapper_style = {
    display: 'flex',
    justifyContent: 'space-between',
    width: "150px",
    marginBottom: '10px'
  }

  useEffect(() => {
    const vals = Object.values(data);

    if (vals.length == 0) return;

    set_allT(vals.filter(val => val.T > 0).map(val => val.T));
    set_allI(vals.filter(val => val.I > 0).map(val => val.I));
    set_allB(vals.filter(val => val.B > 0).map(val => val.B));

  }, [data])

  const getDist = (x) => {
    if (x == "poi") 
      return Object.entries(data).filter(([idx, val]) => val.T > 0).map(([idx, val]) => [
        idx,
        val.T / allT.reduce((a, b) => a + b)
      ]);

    if (x == "inf")
      return Object.entries(data).filter(([idx, val]) => val.I > 0).map(([idx, val]) => [
        idx,
        val.I / allI.reduce((a, b) => a + b)
      ]);

    if (x == "bg")
      return Object.entries(data).filter(([idx, val]) => val.B > 0).map(([idx, val]) => [
        idx,
        val.B / allB.reduce((a, b) => a + b)
      ]);

    alert(`getDist dostalo bledna wartosc ${x}`)
  }

  const computeDistance = () => {
    const from_dist = getDist(from);
    const to_dist = getDist(to);

    const start = performance.now();
    const result = wassersteinBetweenDistributions(
      new Map(from_dist),
      new Map(to_dist)
    );
    const stop = performance.now();

    set_result(result);
    set_duration((stop - start) / 1000);
  }



  return (
    <div style={{...style }} ref={windowRef}>
      <h2 className="window-header-h" style={ h1_style }>
        Wasserstein
      </h2>

      <hr style={{ width: "100%" }}/>

      <div>
        <span style={{ fontWeight: 700 }}>Komórki T != 0: </span> 
        { allT.length }
      </div>

      <div>
        <span style={{ fontWeight: 700 }}>Komórki I != 0: </span> 
        { allI.length }
      </div>

      <div>
        <span style={{ fontWeight: 700 }}>Komórki B != 0: </span> 
        { allB.length }
      </div>

      <hr style={{ width: "100%" }}/>

      <div style={wrapper_style}>
        <SelectList
          key="from"
          options={[
            {
              name: "POI",
              key: "poi"
            },
            {
              name: "INF",
              key: "inf"
            },
            {
              name: "BG",
              key: "bg"
            }
          ]}

          on_change={ e=> {
            set_from(e)
          } }
        />

        {"-->"}

        <SelectList
          key="to"
          options={[
            {
              name: "POI",
              key: "poi"
            },
            {
              name: "INF",
              key: "inf"
            },
            {
              name: "BG",
              key: "bg"
            }
          ]}

          on_change={ e=> {
            set_to(e)
          } }
        />

      </div>

      <button onClick={computeDistance}>
        Oblicz dystans
      </button>

      <hr style={{ width: "100%" }}/>

      <div>
        <span style={{ fontWeight: 700 }}>Wynik: </span> 
        { result }
      </div>

      <div>
        <span style={{ fontWeight: 700 }}>Czas obliczeń: </span> 
        { duration }s
      </div>
    </div>
  )
}
