window.Checkbox = function Checkbox({ name, on_change, checked }){
  const handle_on_change = e => {
    on_change(e.target.checked)
  }

  checked = checked || false;

  return (
    <div>
      <label>
        <input defaultChecked = { checked } type="checkbox" onChange={ handle_on_change }/>
        <span>{ name }</span>
      </label>
    </div>
  )
}
