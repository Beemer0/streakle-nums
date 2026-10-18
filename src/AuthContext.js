import { createContext, useContext } from 'react'

// The provider lives in AuthProvider.jsx so that file only exports a component
// (keeps React Fast Refresh working); consumers import useAuth from here.
export const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)
