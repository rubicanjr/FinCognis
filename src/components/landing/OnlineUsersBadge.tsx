"use client";

import { useEffect, useMemo, useState } from "react";

interface PresencePayload {
  activeUsers: number;
  displayUsers: number;
}

const STORAGE_KEY = "fincognis_presence_session";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const created = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(STORAGE_KEY, created);
  return created;
}

export default function OnlineUsersBadge() {
  const [displayUsers, setDisplayUsers] = useState(10);

  const tooltip = useMemo(() => `${displayUsers} kişi şuan sitede`, [displayUsers]);

  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    let mounted = true;

    const ping = async () => {
      try {
        const response = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
          cache: "no-store",
        });
        const payload = (await response.json()) as PresencePayload;
        if (!mounted) return;
        const safeValue = Math.max(10, Number(payload.displayUsers) || 10);
        setDisplayUsers(safeValue);
      } catch {
        if (mounted) setDisplayUsers((current) => Math.max(10, current));
      }
    };

    ping();
    const timer = window.setInterval(ping, 15000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="group relative ml-1 hidden items-center md:flex">
      <div className="presence-badge inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-400/12 px-2.5 py-1 text-xs font-semibold text-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,0.2)]" />
        {displayUsers}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-[130%] z-50 w-max -translate-x-1/2 rounded-lg border border-white/12 bg-slate-950/95 px-2.5 py-1.5 text-[11px] text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {tooltip}
      </div>
    </div>
  );
}
