import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { SettingsContext, loadSettings, saveSettings, applySettings, type Settings } from '../settings'

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => { applySettings(settings) }, [settings])

  // Follow the system's reduced-motion switch while "System" is chosen.
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => applySettings(settings)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [settings])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(s => { const next = { ...s, ...patch }; saveSettings(next); return next })
  }, [])

  const value = useMemo(() => ({ settings, update }), [settings, update])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
