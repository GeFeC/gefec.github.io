window.SelectList = function SelectList(props){
  const { options } = props;
  const { on_change } = props;

  const handle_on_change = e => {
    on_change(e.target.value);
  }

  return (
    <select onChange={ handle_on_change }>
      { options.map(({ name, key }) => { 
        return <option key={key} value={key}>{name}</option> 
      }) }
    </select>
  )
}
