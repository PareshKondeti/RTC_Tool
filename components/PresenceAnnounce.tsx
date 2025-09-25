'use client';

import { useEffect, useRef } from 'react'
import { useBroadcastEvent, useEventListener, useSelf } from '@liveblocks/react'

export default function PresenceAnnounce() {
  const broadcast = useBroadcastEvent();
  const self = useSelf();

  const announcedRef = useRef(false);
  const lastJoinAtRef = useRef<number>(0);
  useEffect(() => {
    if (announcedRef.current) return;
    announcedRef.current = true;
    const displayName = self?.info?.name || 'Someone';
    broadcast({ type: 'join', name: displayName, userId: self?.id });
    lastJoinAtRef.current = Date.now();

    const onBeforeUnload = () => {
      // Only broadcast leave on real unload/pagehide, not on React unmounts
      try { broadcast({ type: 'leave', name: displayName, userId: self?.id }); } catch {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onBeforeUnload);
      // Do not broadcast leave on component unmount; avoids double leave on HMR/remount
    }
  }, [broadcast, self?.id])

  const dedupeRef = useRef<Record<string, number>>({});
  useEventListener(({ event, user }) => {
    if (!event || typeof event !== 'object') return;
    const e: any = event;
    // ignore our own events
    if (self?.id && e.userId === self.id) return;
    if (e.type !== 'join' && e.type !== 'leave') return;

    const key = `${e.type}:${e.userId || user?.id || 'unknown'}`;
    const now = Date.now();
    const last = dedupeRef.current[key] || 0;
    if (now - last < 5000) return; // widen dedupe window
    // Ignore leave events that occur immediately after our own join (StrictMode/HMR churn)
    if (e.type === 'leave' && now - lastJoinAtRef.current < 1000) return;
    dedupeRef.current[key] = now;

    const displayName = e.name || user?.info?.name || 'Someone';
    const msg = e.type === 'join'
      ? `${displayName} joined the document`
      : `${displayName} left the document`;
    try { (window as any).toast?.(msg) || console.log(msg); } catch {}
  })

  return null;
}


