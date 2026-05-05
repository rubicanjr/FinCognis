"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EconomicMirrorResponseSchema,
  type EconomicEvent,
  type EconomicMirrorStatus,
  type EconomicRange,
  type EconomicTab,
} from "@/lib/economic-calendar/schema";

interface UseEconomicCalendarState {
  status: EconomicMirrorStatus;
  events: EconomicEvent[];
  isLoading: boolean;
  error: string | null;
  updatedAt: string | null;
  toast: string | null;
}

const SOURCE_UNAVAILABLE_MESSAGE = "Veri sunucusu senkronizasyonunda geçici bir gecikme yaşanıyor.";

export function useEconomicCalendar(tab: EconomicTab, range: EconomicRange) {
  const [state, setState] = useState<UseEconomicCalendarState>({
    status: "LOADING",
    events: [],
    isLoading: true,
    error: null,
    updatedAt: null,
    toast: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState((prev) => ({
      ...prev,
      status: "LOADING",
      isLoading: true,
      error: null,
      toast: null,
    }));

    const load = async () => {
      try {
        const response = await fetch(`/api/mirror/calendar?tab=${tab}&range=${range}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        const payloadUnknown: unknown = await response.json();
        const payload = EconomicMirrorResponseSchema.parse(payloadUnknown);
        if (!active) return;

        const isUnavailable = payload.status === "SOURCE_UNAVAILABLE";
        setState({
          status: payload.status,
          events: payload.events,
          isLoading: false,
          error: isUnavailable ? payload.message ?? SOURCE_UNAVAILABLE_MESSAGE : null,
          updatedAt: payload.updatedAt,
          toast: isUnavailable ? payload.message ?? SOURCE_UNAVAILABLE_MESSAGE : null,
        });
      } catch (error: unknown) {
        if (!active || controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : SOURCE_UNAVAILABLE_MESSAGE;
        setState({
          status: "SOURCE_UNAVAILABLE",
          events: [],
          isLoading: false,
          error: message,
          updatedAt: null,
          toast: SOURCE_UNAVAILABLE_MESSAGE,
        });
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [tab, range]);

  const emptyStateMessage = useMemo(() => {
    if (state.isLoading) return null;
    if (state.status === "SOURCE_UNAVAILABLE") return SOURCE_UNAVAILABLE_MESSAGE;
    if (state.events.length === 0) return "Bu sekme için şu anda listelenecek veri bulunamadı.";
    return null;
  }, [state.events.length, state.isLoading, state.status]);

  return {
    ...state,
    emptyStateMessage,
  };
}
