"use client";

import { useEffect, useMemo, useState } from "react";
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
}

const SYNC_DELAY_MESSAGE = "Veri sunucusu senkronizasyonunda geçici bir gecikme yaşanıyor.";

export function useEconomicCalendar(tab: EconomicTab, range: EconomicRange) {
  const [state, setState] = useState<UseEconomicCalendarState>({
    events: [],
    isLoading: true,
    error: null,
    updatedAt: null,
    toast: null,
  });

  useEffect(() => {
    let disposed = false;

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

        if (!response.ok) {
          const payloadUnknown: unknown = await response.json().catch(() => null);
          const message =
            typeof payloadUnknown === "object" && payloadUnknown !== null && "error" in payloadUnknown && typeof payloadUnknown.error === "string"
              ? payloadUnknown.error
              : SYNC_DELAY_MESSAGE;
          throw new Error(message);
        }

        const payloadUnknown: unknown = await response.json();
        const payload = EconomicMirrorResponseSchema.parse(payloadUnknown);

        if (disposed) return;

        setState({
          events: payload.events,
          isLoading: false,
          error: null,
          updatedAt: payload.updatedAt,
          toast: null,
        });
      } catch (error: unknown) {
        if (disposed || controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : SYNC_DELAY_MESSAGE;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          toast: SYNC_DELAY_MESSAGE,
        }));
      }
    };

    void load(false);
    const interval = window.setInterval(() => {
      void load(true);
    }, 60_000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [tab, range]);

  const emptyStateMessage = useMemo(() => {
    if (state.isLoading) return null;
    if (state.error) return SYNC_DELAY_MESSAGE;
    if (state.events.length > 0) return null;
    return SYNC_DELAY_MESSAGE;
  }, [state.error, state.events.length, state.isLoading]);

  return {
    ...state,
    emptyStateMessage,
  };
}
