'use client';

import { useEffect, useRef } from 'react'
import { useOthers } from '@liveblocks/react'

export default function PresenceToasts() {
  const others = useOthers();
  const prevMapRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    // Build current map of connectionId -> displayName
    const current = new Map<number, string>();
    for (const other of others) {
      const connId = (other as any).connectionId as number | undefined;
      if (typeof connId === 'number') {
        const name = ((other as any).info as any)?.name || 'Someone';
        current.set(connId, name);
      }
    }

    // Detect disconnects: ids in prev but not in current
    for (const [connId, name] of prevMapRef.current.entries()) {
      if (!current.has(connId)) {
        const msg = `${name} left the document`;
        try { (window as any).toast?.(msg) || console.log(msg); } catch {}
      }
    }

    prevMapRef.current = current;
  }, [others]);

  return null;
}


