// RTC Tool - Version History Sidebar
// Author: Paresh Kondeti
// Date: January 2025
// Provides UI for document version management and restoration

'use client';

import { useEffect, useState } from 'react'

type VersionRow = {
  id: number
  version: number
  author_email: string
  created_at: string
}

export default function HistorySidebar({ roomId, onRestore }: { roomId: string; onRestore: (content: any) => void }) {
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/versions?roomId=${encodeURIComponent(roomId)}`)
      const json = await res.json()
      if (json?.ok) setVersions(json.versions)
    } finally {
      setLoading(false)
    }
  }

  const restore = async (id: number) => {
    const res = await fetch(`/api/versions?versionId=${id}`)
    const json = await res.json()
    if (json?.ok) {
      onRestore(json.version.content_json)
    }
  }

  useEffect(() => {
    fetchVersions()
  }, [roomId])

  return (
    <aside className="w-72 border-l border-dark-400 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">Version History</h3>
        <button className="text-blue-400" onClick={fetchVersions}>Refresh</button>
      </div>
      {loading ? (
        <p className="text-dark-500">Loading...</p>
      ) : versions.length === 0 ? (
        <p className="text-dark-500">No versions yet.</p>
      ) : (
        <ul className="space-y-2">
          {versions.map(v => (
            <li key={v.id} className="flex items-center justify-between rounded-md bg-dark-300 p-2">
              <div>
                <div className="font-medium">v{v.version}</div>
                <div className="text-dark-500">{new Date(v.created_at).toLocaleString()}</div>
                <div className="text-dark-500 truncate">{v.author_email}</div>
              </div>
              <button className="text-blue-400" onClick={() => restore(v.id)}>Restore</button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}


