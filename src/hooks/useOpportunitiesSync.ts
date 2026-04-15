import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Opportunity } from "@/data/opportunities";
import {
  DEFAULT_OPPORTUNITIES,
  migrateOpportunityRow,
  persistOpportunities,
  loadPersistedOpportunities,
} from "@/data/opportunities";
import { getSupabase } from "@/lib/supabaseClient";

const WORKBOOK_ID = "dxe-main";
const SAVE_DEBOUNCE_MS = 500;

function isOpportunityArray(x: unknown): x is Opportunity[] {
  if (!Array.isArray(x)) return false;
  return x.every((r) => {
    if (!r || typeof r !== "object") return false;
    const o = r as Record<string, unknown>;
    return (
      typeof o.id === "string" &&
      typeof o.account === "string" &&
      typeof o.person === "string" &&
      typeof o.stage === "string" &&
      typeof o.status === "string" &&
      typeof o.notes === "string"
    );
  });
}

export type SaveUiState = "idle" | "saving" | "saved" | "error";

export function useOpportunitiesSync() {
  const supabase = useMemo(() => getSupabase(), []);
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready">("loading");
  const [saveState, setSaveState] = useState<SaveUiState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!supabase) {
        const local = loadPersistedOpportunities();
        if (!cancelled) {
          setRows(local);
          hydratedRef.current = true;
          setLoadState("ready");
          setSaveState("saved");
          setLastSavedAt(new Date());
        }
        return;
      }

      setLoadState("loading");
      const { data, error } = await supabase
        .from("workbook")
        .select("payload")
        .eq("id", WORKBOOK_ID)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setRows(loadPersistedOpportunities());
        setUsingLocalFallback(true);
        setLoadState("ready");
        hydratedRef.current = true;
        setSaveState("saved");
        setLastSavedAt(new Date());
        return;
      }

      if (
        data?.payload &&
        isOpportunityArray(data.payload) &&
        data.payload.length > 0
      ) {
        const migrated = data.payload.map(migrateOpportunityRow);
        setRows(migrated);
        persistOpportunities(migrated);
      } else {
        const initial = loadPersistedOpportunities();
        setRows(initial);
        const { error: seedErr } = await supabase.from("workbook").upsert(
          {
            id: WORKBOOK_ID,
            payload: initial,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        if (seedErr) {
          setUsingLocalFallback(true);
        }
        persistOpportunities(initial);
      }

      hydratedRef.current = true;
      setLoadState("ready");
      setLastSavedAt(new Date());
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (!supabase) {
      persistOpportunities(rows);
      queueMicrotask(() => {
        setSaveState("saved");
        setSaveError(null);
        setLastSavedAt(new Date());
      });
      return;
    }

    queueMicrotask(() => {
      setSaveState("saving");
      setSaveError(null);
    });
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from("workbook").upsert(
        {
          id: WORKBOOK_ID,
          payload: rows,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      persistOpportunities(rows);
      if (error) {
        setSaveState("error");
        setSaveError(error.message);
      } else {
        setSaveState("saved");
        setSaveError(null);
        setLastSavedAt(new Date());
      }
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [rows, supabase]);

  const retrySave = useCallback(async () => {
    if (!supabase) {
      persistOpportunities(rows);
      setSaveState("saved");
      setSaveError(null);
      setLastSavedAt(new Date());
      return;
    }
    setSaveState("saving");
    setSaveError(null);
    const { error } = await supabase.from("workbook").upsert(
      {
        id: WORKBOOK_ID,
        payload: rows,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    persistOpportunities(rows);
    if (error) {
      setSaveState("error");
      setSaveError(error.message);
    } else {
      setSaveState("saved");
      setSaveError(null);
      setLastSavedAt(new Date());
    }
  }, [rows, supabase]);

  const resetToBundledDefaults = useCallback(() => {
    const next = [...DEFAULT_OPPORTUNITIES];
    setRows(next);
    persistOpportunities(next);
  }, []);

  return {
    rows,
    setRows,
    loadState,
    saveState,
    saveError,
    lastSavedAt,
    cloudEnabled: !!supabase,
    usingLocalFallback,
    retrySave,
    resetToBundledDefaults,
  };
}
