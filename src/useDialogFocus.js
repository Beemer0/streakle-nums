import { useEffect } from 'react'

// Modal focus handling for a dialog panel (pass its ref): on open, focus moves
// to the panel's first button; Tab and Shift+Tab stay inside it; on close,
// focus returns to whatever had it before. Escape is the dialog's own job.
export function useDialogFocus(panelRef) {
  useEffect(() => {
    const prevFocus = document.activeElement
    const panel = panelRef.current
    panel?.querySelector('button')?.focus()
    const onKeyDown = (e) => {
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    panel?.addEventListener('keydown', onKeyDown)
    return () => {
      panel?.removeEventListener('keydown', onKeyDown)
      if (prevFocus instanceof HTMLElement && prevFocus.isConnected) prevFocus.focus()
    }
  }, [panelRef])
}
