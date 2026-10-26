// @vitest-environment happy-dom
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// Nobody here belongs to a pool.
vi.mock('./usePoolMemberships', () => ({ usePoolMemberships: () => ({ poolIds: [] }) }))

const { default: UserMenu } = await import('./UserMenu.jsx')

const USER = { id: 'u-1', email: 'a@b.c', user_metadata: {} }
let host, root, signOut

const renderAs = (user) => act(async () => {
  root.render(<AuthContext.Provider value={{ user, signOut }}><UserMenu /></AuthContext.Provider>)
})

beforeEach(async () => {
  signOut = vi.fn()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await renderAs(USER)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const avatar = () => host.querySelector('button[aria-label="Account menu"]')
const signOutButton = () => [...host.querySelectorAll('button')].find(b => /^Sign(ing)? out/.test(b.textContent.trim()))
const alertText = () => host.querySelector('[role="alert"]')?.textContent
const click = (el) => act(async () => { el.click() })

it('says so, and stays open, when signing out fails', async () => {
  signOut.mockResolvedValue(false)
  await click(avatar())
  signOutButton().focus()
  await click(signOutButton())
  expect(alertText()).toBe("Couldn't sign out. Check your connection and try again.")
  expect(avatar().getAttribute('aria-expanded')).toBe('true')
  expect(document.activeElement).toBe(signOutButton())

  // A retry that works closes the menu.
  signOut.mockResolvedValue(true)
  await click(signOutButton())
  expect(signOut).toHaveBeenCalledTimes(2)
  expect(avatar().getAttribute('aria-expanded')).toBe('false')
  expect(alertText()).toBeUndefined()
})

it('clears the message when the menu is opened again', async () => {
  signOut.mockResolvedValue(false)
  await click(avatar())
  await click(signOutButton())
  expect(alertText()).toBeDefined()
  await click(avatar()) // close
  await click(avatar()) // reopen
  expect(alertText()).toBeUndefined()
})

it('shows the request running, and sends one sign-out while it does', async () => {
  let finish
  signOut.mockReturnValue(new Promise(r => { finish = r }))
  await click(avatar())
  await click(signOutButton())
  expect(signOutButton().textContent).toBe('Signing out…')
  await click(signOutButton())
  expect(signOut).toHaveBeenCalledTimes(1)
  await act(async () => finish(true))
  expect(avatar().getAttribute('aria-expanded')).toBe('false')
})

it('reopens the menu to report a failure that comes back after it was closed', async () => {
  let finish
  signOut.mockReturnValue(new Promise(r => { finish = r }))
  await click(avatar())
  await click(signOutButton())
  await click(avatar()) // closed while the request runs
  expect(avatar().getAttribute('aria-expanded')).toBe('false')
  await act(async () => finish(false))
  expect(avatar().getAttribute('aria-expanded')).toBe('true')
  expect(alertText()).toBe("Couldn't sign out. Check your connection and try again.")
  expect(signOutButton().textContent).toBe('Sign out')
})

it('starts afresh once the player is signed out, whatever the request reported', async () => {
  // e.g. a revoked token: the session is gone (SIGNED_OUT) but signOut errors
  signOut.mockResolvedValue(false)
  await click(avatar())
  await click(signOutButton())
  expect(alertText()).toBeDefined()
  await renderAs(null)
  expect(host.innerHTML).toBe('')
  await renderAs(USER) // signed in again, no reload
  expect(avatar().getAttribute('aria-expanded')).toBe('false')
  expect(alertText()).toBeUndefined()
})
