import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";

import type { Opportunity } from "@/data/opportunities";
import {
  DEFAULT_OPPORTUNITIES,
  migrateOpportunityRow,
  persistOpportunities,
  loadPersistedOpportunities,
} from "@/data/opportunities";
import { describeSupabaseError, getSupabase } from "@/lib/supabaseClient";

const WORKBOOK_ID = "dxe-main";
const SAVE_DEBOUNCE_MS = 500;

type WorkbookRow = {
  id: string;
  payload: unknown;
  updated_at: string;
};

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

function sameInstant(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return Number.isFinite(ta) && ta === tb;
}

export type SaveUiState = "idle" | "saving" | "saved" | "error";
export type RealtimeUiState = "off" | "connecting" | "live" | "error";

/**
 * Loads the shared workbook from Supabase (falling back to this browser's
 * localStorage copy), debounces saves, and subscribes to realtime updates so
 * a teammate's edits show up here instead of being overwritten by the next
 * save from this tab.
 *
 * Safety rules:
 *  - After hydrating from the cloud (or adopting a realtime update) we do NOT
 *    immediately write the same rows back.
 *  - While the cloud is unreachable ("local fallback") we never write, so a
 *    stale local copy can't clobber the team's data when the connection
 *    returns. Retry re-loads from the cloud instead.
 */
export function useOpportunitiesSync() {
  const supabase = useMemo(() => getSupabase(), []);
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready">("loading");
  const [saveState, setSaveState] = useState<SaveUiState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);
  const [realtimeState, setRealtimeState] = useState<RealtimeUiState>(
    supabase ? "connecting" : "off",
  );
  // (stays "connecting" until the first successful load subscribes)
  const [lastRemoteUpdateAt, setLastRemoteUpdateAt] = useState<Date | null>(
    null,
  );
  const [reloadNonce, setReloadNonce] = useState(0);

  const hydratedRef = useRef(false);
  /** Set when `rows` was just replaced by cloud data — skip the echo save. */
  const skipNextSaveRef = useRef(false);
  /** `updated_at` we sent with our latest write, to ignore our own realtime echo. */
  const lastWriteStampRef = useRef<string | null>(null);
  /** True while a debounced save is pending or in flight. */
  const savePendingRef = useRef(false);
  const fallbackRef = useRef(false);

  const adoptCloudRows = useCallback((payload: unknown, updatedAt: string) => {
    if (!isOpportunityArray(payload)) return false;
    const migrated = payload.map(migrateOpportunityRow);
    skipNextSaveRef.current = true;
    setRows(migrated);
    persistOpportunities(migrated);
    const when = new Date(updatedAt);
    setLastSavedAt(Number.isNaN(when.getTime()) ? new Date() : when);
    return true;
  }, []);

  // ── Initial load (and reload on Retry while in fallback) ────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!supabase) {
        const local = loadPersistedOpportunities();
        if (!cancelled) {
          skipNextSaveRef.current = true;
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
        .select("payload, updated_at")
        .eq("id", WORKBOOK_ID)
        .maybeSingle<WorkbookRow>();

      if (cancelled) return;

      if (error) {
        // Show this device's copy, but surface the real reason and block
        // writes until a reload succeeds.
        fallbackRef.current = true;
        skipNextSaveRef.current = true;
        setRows(loadPersistedOpportunities());
        setUsingLocalFallback(true);
        setLoadState("ready");
        hydratedRef.current = true;
        setSaveState("error");
        setSaveError(describeSupabaseError(error.message));
        setLastSavedAt(null);
        return;
      }

      fallbackRef.current = false;
      setUsingLocalFallback(false);
      setSaveError(null);

      const adopted =
        data && Array.isArray(data.payload) && data.payload.length > 0
          ? adoptCloudRows(data.payload, data.updated_at)
          : false;

      if (!adopted) {
        // First run on an empty workbook: seed the cloud from local/defaults.
        const initial = loadPersistedOpportunities();
        skipNextSaveRef.current = true;
        setRows(initial);
        const stamp = new Date().toISOString();
        lastWriteStampRef.current = stamp;
        const { error: seedErr } = await supabase.from("workbook").upsert(
          { id: WORKBOOK_ID, payload: initial, updated_at: stamp },
          { onConflict: "id" },
        );
        if (cancelled) return;
        persistOpportunities(initial);
        if (seedErr) {
          fallbackRef.current = true;
          setUsingLocalFallback(true);
          setSaveState("error");
          setSaveError(describeSupabaseError(seedErr.message));
        } else {
          setLastSavedAt(new Date(stamp));
        }
      }

      hydratedRef.current = true;
      setLoadState("ready");
      if (!fallbackRef.current) setSaveState("saved");
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase, adoptCloudRows, reloadNonce]);

  // ── Debounced save on every edit ────────────────────────────────────────
  useEffect(() => {
    if (!hydratedRef.current) return;

    if (skipNextSaveRef.current) {
      // Rows were just set from the cloud (load / realtime) — nothing to push.
      skipNextSaveRef.current = false;
      return;
    }

    if (!supabase) {
      persistOpportunities(rows);
      queueMicrotask(() => {
        setSaveState("saved");
        setSaveError(null);
        setLastSavedAt(new Date());
      });
      return;
    }

    if (fallbackRef.current) {
      // Cloud unreachable: keep the edit on this device only. Leave the
      // error banner up so nobody thinks it synced.
      persistOpportunities(rows);
      return;
    }

    savePendingRef.current = true;
    queueMicrotask(() => {
      setSaveState("saving");
      setSaveError(null);
    });
    const timer = window.setTimeout(async () => {
      const stamp = new Date().toISOString();
      lastWriteStampRef.current = stamp;
      const { error } = await supabase.from("workbook").upsert(
        { id: WORKBOOK_ID, payload: rows, updated_at: stamp },
        { onConflict: "id" },
      );
      savePendingRef.current = false;
      persistOpportunities(rows);
      if (error) {
        setSaveState("error");
        setSaveError(describeSupabaseError(error.message));
      } else {
        setSaveState("saved");
        setSaveError(null);
        setLastSavedAt(new Date(stamp));
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      // If the effect re-runs before the timer fired, the new run sets
      // savePendingRef again; if it unmounts, clear it.
      savePendingRef.current = false;
    };
  }, [rows, supabase]);

  // ── Realtime: adopt teammates' edits ────────────────────────────────────
  // Only after a successful cloud load: with a bad key or no network the
  // socket would just retry in a loop. Reconnect → reload → subscribe.
  useEffect(() => {
    if (!supabase || loadState !== "ready" || usingLocalFallback) return;

    const channel: RealtimeChannel = supabase
      .channel(`workbook:${WORKBOOK_ID}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workbook",
          filter: `id=eq.${WORKBOOK_ID}`,
        },
        async (payload: RealtimePostgresUpdatePayload<WorkbookRow>) => {
          const next = payload.new;
          if (!next || next.id !== WORKBOOK_ID) return;
          // Our own write echoing back.
          if (sameInstant(next.updated_at, lastWriteStampRef.current)) return;
          // This tab has an unsaved edit that will land in <500ms and would
          // overwrite the remote change anyway; don't yank rows mid-typing.
          if (savePendingRef.current) return;

          // Treat the event as a signal and re-read the row. Postgres leaves
          // large unchanged (TOASTed) columns out of the WAL on UPDATE, so
          // `payload.new.payload` can be missing; a fresh SELECT never is.
          const { data, error } = await supabase
            .from("workbook")
            .select("payload, updated_at")
            .eq("id", WORKBOOK_ID)
            .maybeSingle<WorkbookRow>();
          if (error || !data) return;
          // A save from this tab may have started while we were fetching.
          if (savePendingRef.current) return;
          if (sameInstant(data.updated_at, lastWriteStampRef.current)) return;

          if (fallbackRef.current) {
            // Cloud is reachable again — leave fallback mode.
            fallbackRef.current = false;
            setUsingLocalFallback(false);
            setSaveError(null);
          }
          if (adoptCloudRows(data.payload, data.updated_at)) {
            setLastRemoteUpdateAt(new Date());
            setSaveState("saved");
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeState("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setRealtimeState("error");
        else if (status === "CLOSED") setRealtimeState("connecting");
      });

    return () => {
      void supabase.removeChannel(channel);
      setRealtimeState((s) => (s === "live" ? "connecting" : s));
    };
  }, [supabase, adoptCloudRows, loadState, usingLocalFallback]);

  const retrySave = useCallback(async () => {
    if (!supabase) {
      persistOpportunities(rows);
      setSaveState("saved");
      setSaveError(null);
      setLastSavedAt(new Date());
      return;
    }
    if (fallbackRef.current) {
      // Reconnect: reload from the cloud rather than pushing a possibly
      // stale local copy over the team's data.
      setSaveState("saving");
      setSaveError(null);
      setReloadNonce((n) => n + 1);
      return;
    }
    setSaveState("saving");
    setSaveError(null);
    const stamp = new Date().toISOString();
    lastWriteStampRef.current = stamp;
    const { error } = await supabase.from("workbook").upsert(
      { id: WORKBOOK_ID, payload: rows, updated_at: stamp },
      { onConflict: "id" },
    );
    persistOpportunities(rows);
    if (error) {
      setSaveState("error");
      setSaveError(describeSupabaseError(error.message));
    } else {
      setSaveState("saved");
      setSaveError(null);
      setLastSavedAt(new Date(stamp));
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
    lastRemoteUpdateAt,
    cloudEnabled: !!supabase,
    usingLocalFallback,
    realtimeState,
    retrySave,
    resetToBundledDefaults,
  };
}
