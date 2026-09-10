import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Loader2,
  Monitor,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  RealtimeUiState,
  SaveUiState,
} from "@/hooks/useOpportunitiesSync";

/** "1:49 PM" for today, "Sep 3, 1:49 PM" for anything older. */
function formatSavedTime(d: Date, now: Date = new Date()) {
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  // Note: `timeStyle` cannot be mixed with `month`/`day`, so spell out the
  // time parts explicitly.
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    ...(sameDay ? {} : { month: "short", day: "numeric" }),
  }).format(d);
}

type Props = {
  saveState: SaveUiState;
  saveError: string | null;
  lastSavedAt: Date | null;
  lastRemoteUpdateAt?: Date | null;
  cloudEnabled: boolean;
  usingLocalFallback: boolean;
  realtimeState?: RealtimeUiState;
  onRetry: () => void;
};

export function SaveStatusBar({
  saveState,
  saveError,
  lastSavedAt,
  lastRemoteUpdateAt = null,
  cloudEnabled,
  usingLocalFallback,
  realtimeState = "off",
  onRetry,
}: Props) {
  const modeLabel = cloudEnabled ? "Team workbook (cloud)" : "This browser only";
  const ModeIcon = cloudEnabled ? Cloud : Monitor;
  const live = cloudEnabled && !usingLocalFallback && realtimeState === "live";
  const showTeammateUpdate = live && !!lastRemoteUpdateAt;

  const bar = (
    <motion.div
      layout
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[200] border-t-2 border-dxe-gold/25 bg-dxe-paper pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-12px_40px_rgba(5,5,4,0.12)] backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:max-w-[55%]">
          <ModeIcon
            className="size-4 shrink-0 text-dxe-gold"
            aria-hidden
          />
          <span className="truncate text-[11px] font-medium uppercase tracking-wide text-dxe-ink-soft">
            {modeLabel}
          </span>
          {live && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-dxe-teal/35 bg-dxe-teal-lt/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dxe-teal"
              title="Teammates' edits appear here automatically"
            >
              <span
                className="size-1.5 rounded-full bg-dxe-teal motion-safe:animate-pulse"
                aria-hidden
              />
              Live
            </span>
          )}
          {showTeammateUpdate && (
            <span className="hidden items-center gap-1 text-[11px] text-dxe-ink-mid sm:inline-flex">
              <Users className="size-3.5 text-dxe-ink-soft" aria-hidden />
              Updated by a teammate · {formatSavedTime(lastRemoteUpdateAt!)}
            </span>
          )}
        </div>

        <div className="flex min-h-[2.25rem] min-w-0 flex-1 items-center justify-end gap-2 sm:flex-initial sm:justify-end">
          {saveState === "saving" && (
            <motion.div
              key="saving"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-full border border-dxe-gold/40 bg-dxe-gold-bg px-3 py-1.5"
            >
              <Loader2
                className="size-4 shrink-0 animate-spin text-dxe-gold"
                aria-hidden
              />
              <span className="text-sm font-semibold text-dxe-ink">
                Saving changes…
              </span>
            </motion.div>
          )}

          {(saveState === "saved" ||
            (saveState === "idle" && lastSavedAt)) && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="flex items-center gap-2 rounded-full border border-dxe-teal/35 bg-dxe-teal-lt/80 px-3 py-1.5"
            >
              <CheckCircle2
                className="size-4 shrink-0 text-dxe-teal"
                aria-hidden
              />
              <span className="text-sm font-semibold text-dxe-teal">
                All changes saved
              </span>
              {lastSavedAt && (
                <span className="text-xs tabular-nums text-dxe-ink-mid">
                  · {formatSavedTime(lastSavedAt)}
                </span>
              )}
            </motion.div>
          )}

          {saveState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex max-w-full flex-wrap items-center gap-2 rounded-full border border-dxe-coral/40 bg-dxe-coral/10 px-3 py-1.5"
            >
              <AlertCircle
                className="size-4 shrink-0 text-dxe-coral"
                aria-hidden
              />
              <span className="max-w-[34rem] text-sm font-medium text-dxe-coral">
                {usingLocalFallback ? "Cloud unavailable" : "Couldn’t save"}
                {saveError ? ` — ${saveError}` : ""}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-dxe-coral/50 text-xs font-semibold text-dxe-coral hover:bg-dxe-coral/10"
                onClick={() => void onRetry()}
              >
                {usingLocalFallback ? "Reconnect" : "Retry"}
              </Button>
            </motion.div>
          )}

          {saveState === "idle" && !lastSavedAt && (
            <span className="text-xs text-dxe-ink-mid">Starting…</span>
          )}
        </div>
      </div>

      {usingLocalFallback && cloudEnabled && (
        <p className="mx-auto mt-1 max-w-6xl px-4 text-center text-[10px] text-dxe-coral">
          Showing this device’s copy. Edits stay on this device and are not shared until you reconnect.
        </p>
      )}
    </motion.div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(bar, document.body);
}
