// Makes a clickable <div> behave like a real button for keyboard users.
// Spread onto the element: <div {...clickableProps(handler, disabled)} />
// When disabled, returns no props so the element is neither focusable nor clickable.
export function clickableProps(onClick, disabled = false) {
  if (disabled) return {}
  return {
    role: 'button',
    tabIndex: 0,
    onClick,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick(e)
      }
    },
  }
}
