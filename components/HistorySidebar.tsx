// RTC Tool - Version History Sidebar
// Author: Paresh Kondeti
// Date: January 2025
// Provides UI for document version management and restoration

'use client';

import { useEffect, useMemo, useState } from 'react'

type VersionRow = {
  id: number
  version: number
  author_email: string
  created_at: string
}

export default function HistorySidebar({ roomId, onRestore, emailToName }: { roomId: string; onRestore: (content: any) => void; emailToName?: Record<string, string> }) {
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [changedMap, setChangedMap] = useState<Record<number, boolean>>({})

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/versions?roomId=${encodeURIComponent(roomId)}&t=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json()
      if (json?.ok) setVersions(json.versions)
    } finally {
      setLoading(false)
    }
  }

  const restore = async (id: number) => {
    const res = await fetch(`/api/versions?versionId=${id}&t=${Date.now()}`, { cache: 'no-store' })
    const json = await res.json()
    if (json?.ok) {
      onRestore(json.version.content_json)
    }
  }

  useEffect(() => {
    fetchVersions()
  }, [roomId])

  // Refresh list when a save completes elsewhere in the UI
  useEffect(() => {
    const handler = (e: any) => {
      if (!e?.detail?.roomId || e.detail.roomId !== roomId) return
      fetchVersions()
    }
    window.addEventListener('versions:updated', handler)
    return () => window.removeEventListener('versions:updated', handler)
  }, [roomId])

  // No event-driven refresh to avoid noise; manual refresh or initial load only

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        month: 'short',
        day: '2-digit',
      })
    } catch {
      return iso
    }
  }

  // Determine which versions actually changed content vs previous
  useEffect(() => {
    let cancelled = false
    async function computeChanges() {
      const map: Record<number, boolean> = {}
      for (let i = 0; i < versions.length; i++) {
        const current = versions[i]
        const prev = versions[i + 1]
        try {
          const curRes = await fetch(`/api/versions?versionId=${current.id}`)
          const curJson = await curRes.json()
          const curContent = curJson?.version?.content_json
          let prevContent: any = undefined
          if (prev) {
            const prevRes = await fetch(`/api/versions?versionId=${prev.id}`)
            const prevJson = await prevRes.json()
            prevContent = prevJson?.version?.content_json
          }
          const curText = extractPlainText(curContent)
          const prevText = extractPlainText(prevContent)
          map[current.id] = curText !== prevText
        } catch {
          map[current.id] = true
        }
        if (cancelled) return
      }
      if (!cancelled) setChangedMap(map)
    }
    if (versions.length > 0) computeChanges()
    return () => { cancelled = true }
  }, [versions])

  function extractPlainText(content: any): string {
    if (!content) return ''
    try {
      const json = typeof content === 'string' ? JSON.parse(content) : content
      const root = json?.root
      if (!root || !Array.isArray(root.children)) return ''
      let out = ''
      const walk = (node: any) => {
        if (!node) return
        if (node.type === 'text' && typeof node.text === 'string') {
          out += node.text
        }
        if (Array.isArray(node.children)) {
          for (const child of node.children) walk(child)
        }
      }
      for (const child of root.children) walk(child)
      return out
    } catch {
      return ''
    }
  }

  // Removed line-diff hints per request

  return (
    <aside className="w-full md:w-72 h-[calc(100vh-112px)] md:h-[calc(100vh-64px)] text-sm flex flex-col">
      <div className="sticky top-0 z-10 bg-dark-200/80 backdrop-blur supports-[backdrop-filter]:bg-dark-200/60 px-3 py-2 flex items-center justify-between">
        <h3 className="font-medium text-[12px] tracking-wide uppercase text-[#b4c6ee]">Version History</h3>
        <button className="text-blue-400 hover:text-blue-300 transition-colors text-[12px]" onClick={fetchVersions}>Refresh</button>
      </div>
      <div className="p-2 md:p-3 flex-1 min-h-0 overflow-y-auto history-scroll">
        {loading ? (
          <p className="text-dark-500">Loading...</p>
        ) : versions.length === 0 ? (
          <p className="text-dark-500">No versions yet.</p>
        ) : (
          <ul className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {versions.filter(v => changedMap[v.id] !== false).map(v => (
              <li key={v.id} className="rounded-md">
                <div className="flex items-start justify-between gap-2 p-2">
                  <div className="flex-1">
                    <div className="font-medium text-[12px] text-[#cfd8ff]">v{v.version}</div>
                    <div className="text-dark-500 mt-0.5 text-[11px]">
                      {(emailToName?.[v.author_email] || v.author_email || 'Someone')} edited the document at {formatTime(v.created_at)}
                    </div>
                  </div>
                  <button className="text-blue-400 hover:text-blue-300 whitespace-nowrap transition-colors text-[12px]" onClick={() => restore(v.id)}>Restore</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}


