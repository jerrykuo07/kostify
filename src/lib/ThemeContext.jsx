import { createContext, useContext, useState, useEffect } from 'react'

export const ThemeContext = createContext({ dark: false, toggle: () => {} })
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('kostify-theme') === 'dark' }
    catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem('kostify-theme', dark ? 'dark' : 'light') } catch {}
    if (dark) {
      document.documentElement.classList.add('dark')
      document.body.style.backgroundColor = '#0a0a0a'
      document.body.style.color = 'white'
    } else {
      document.documentElement.classList.remove('dark')
      document.body.style.backgroundColor = '#f9fafb'
      document.body.style.color = '#111827'
    }
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}