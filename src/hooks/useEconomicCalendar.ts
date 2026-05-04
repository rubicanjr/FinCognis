"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EconomicMirrorResponseSchema,
  type EconomicEvent,
  type EconomicRange,
  type EconomicTab,
} from "@/lib/economic-calendar/schema";

interface UseEconomicCalendarState {
  events: EconomicEvent[];
  isLoading: boolean;
  error: string | null;
  updatedAt: string | null;
  toast: string | null;
  isInitializing: boolean;
}

const SYNC_DELAY_MESSAGE = "Veri sunucusu senkronizasyonunda geçici bir gecikme yaşanıyor.";
const INITIALIZING_MESSAGE = "Veriler ilk kez hazırlanıyor, lütfen bekleyin...";
const BACKOFF_STEPS_MS = [1200, 2400, 4000, 7000, 12000] as const;

function backoffDelay(attempt: number): number {
  return BACKOFF_STEPS_MS[Math.min(attempt, BACKOFF_STEPS_MS.length - 1)];
}

function isInitializingPayload(payload: unknown): payload is { status: "INITIALIZING"; message?: string } {
  if (typeof payload !== "object" || payload === null) return false;
  const candidate = payload as Record<string, unknown>;
  return candidate.status === "INITIALIZING";
}

export function useEconomicCalendar(tab: EconomicTab, range: EconomicRange) {
  const [state, setState] = useState<UseEconomicCalendarState>({
    events: [],
    isLoading: true,
    error: null,
    updatedAt: null,
    toast: null,
    isInitializing: false,
  });

  const pollAttemptRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let pollTimer: number | null = null;

    const clearPoll = () => {
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    const schedulePoll = () => {
      const delay = backoffDelay(pollAttemptRef.current);
      pollAttemptRef.current += 1;
      clearPoll();
      pollTimer = window.setTimeout(() => {
        void load(true);
      }, delay);
    };

    const load = async (silent: boolean): Promise<void> => {
      const controller = new AbortController();

      if (!silent) {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
          toast: null,
        }));
      }

      try {
        const response = await fetch(`/api/mirror/calendar?tab=${tab}&range=${range}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        const payloadUnknown: unknown = await response.json().catch(() => null);

        if (response.status === 202 && isInitializingPayload(payloadUnknown)) {
          if (disposed) return;
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isInitializing: true,
            error: null,
            toast: payloadUnknown.message ?? INITIALIZING_MESSAGE,
          }));
          schedulePoll();
          return;
        }

        if (!response.ok) {
          const message =
            typeof payloadUnknown === "object" && payloadUnknown !== null && "error" in payloadUnknown && typeof payloadUnknown.error === "string"
              ? payloadUnknown.error
              : SYNC_DELAY_MESSAGE;
          throw new Error(message);
        }

        const payload = EconomicMirrorResponseSchema.parse(payloadUnknown);
        if (disposed) return;

        pollAttemptRef.current = 0;
        clearPoll();
        setState({
          events: payload.events,
          isLoading: false,
          error: null,
          updatedAt: payload.updatedAt,
          toast: null,
          isInitializing: false,
        });
      } catch (error: unknown) {
        if (disposed || controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : SYNC_DELAY_MESSAGE;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isInitializing: false,
          error: message,
          toast: SYNC_DELAY_MESSAGE,
        }));
      }
    };

    pollAttemptRef.current = 0;
    clearPoll();
    void load(false);

    const interval = window.setInterval(() => {
      void load(true);
    }, 60_000);

    return () => {
      disposed = true;
      clearPoll();
      window.clearInterval(interval);
    };
  }, [tab, range]);

  const emptyStateMessage = useMemo(() => {
    if (state.isLoading) return null;
    if (state.isInitializing) return INITIALIZING_MESSAGE;
    if (state.error) return SYNC_DELAY_MESSAGE;
    if (state.events.length > 0) return null;
    return SYNC_DELAY_MESSAGE;
  }, [state.error, state.events.length, state.isInitializing, state.isLoading]);

  return {
    ...state,
    emptyStateMessage,
  };
}
