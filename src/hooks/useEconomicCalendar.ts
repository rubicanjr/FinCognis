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

export function useEconomicCalendar(tab: EconomicTab, range: EconomicRange) {
  const [state, setState] = useState<UseEconomicCalendarState>({
    events: [],
    isLoading: true,
    error: null,
    updatedAt: null,
    toast: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      toast: null,
    }));

    fetch(`/api/mirror/calendar?tab=${tab}&range=${range}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payloadUnknown: unknown = await response.json().catch(() => null);
          const message =
            typeof payloadUnknown === "object" && payloadUnknown !== null && "error" in payloadUnknown && typeof payloadUnknown.error === "string"
              ? payloadUnknown.error
              : "Takvim verisi alınamadı.";
          throw new Error(message);
        }
        const payloadUnknown: unknown = await response.json();
        return EconomicMirrorResponseSchema.parse(payloadUnknown);
      })
      .then((payload) => {
        setState({
          events: payload.events,
          isLoading: false,
          error: null,
          updatedAt: payload.updatedAt,
          toast: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Takvim verisi alınamadı.";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          toast: "Takvim servisi geçici olarak yanıt vermiyor. Son başarılı veri gösteriliyor.",
        }));
      });

    return () => {
      controller.abort();
    };
  }, [tab, range]);

  const emptyStateMessage = useMemo(() => {
    if (state.isLoading || state.error) return null;
    if (state.events.length > 0) return null;
    return "Günün geri kalanı için veri bulunmamaktadır";
  }, [state.error, state.events.length, state.isLoading]);

  return {
    ...state,
    emptyStateMessage,
  };
}
