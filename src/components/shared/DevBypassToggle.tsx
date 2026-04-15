'use client'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { FlaskConical, X } from 'lucide-react'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

export default function DevBypassToggle() {
  const [active, setActive] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setActive(getCookie('dev_bypass') === '1')
  }, [])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null

  if (!visible) return (
    <button
      onClick={() => setVisible(true)}
      className="fixed bottom-4 right-4 z-50 h-8 w-8 rounded-full bg-gray-800/80 flex items-center justify-center text-gray-400 hover:bg-gray-700 transition-colors shadow-lg"
      title="Dev tools"
    >
      <FlaskConical className="h-4 w-4" />
    </button>
  )

  function enableBypass() {
    // Set cookie — middleware reads this on the NEXT request
    const expires = new Date(Date.now() + 86400000).toUTCString()
    document.cookie = `dev_bypass=1; expires=${expires}; path=/; SameSite=Lax`
    // Hard-navigate so the browser sends a fresh request WITH the new cookie
    window.location.href = '/admin'
  }

  function disableBypass() {
    document.cookie = 'dev_bypass=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax'
    window.location.href = '/login'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 shadow-xl">
      <FlaskConical className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <span className="text-xs text-gray-300 font-medium">Dev</span>
      <Badge
        variant="outline"
        className={`text-xs cursor-pointer select-none transition-all ${
          active
            ? 'bg-green-900/60 text-green-300 border-green-700 hover:bg-red-900/60 hover:text-red-300 hover:border-red-700'
            : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-green-900/60 hover:text-green-300 hover:border-green-700'
        }`}
        onClick={active ? disableBypass : enableBypass}
        title={active ? 'Bypass ON — click to disable' : 'Bypass OFF — click to skip login'}
      >
        {active ? 'bypass ON' : 'bypass OFF'}
      </Badge>
      <button
        onClick={() => setVisible(false)}
        className="text-gray-600 hover:text-gray-300 ml-0.5 transition-colors"
        title="Hide"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
