export type PipelineStage =
  | "pipeline"
  | "client_growth"
  | "prospects"
  | "projects";

export type Opportunity = {
  id: string;
  account: string;
  person: string;
  stage: PipelineStage;
  status: string;
  notes: string;
};

export const STAGE_LABEL: Record<PipelineStage, string> = {
  pipeline: "Pipeline",
  client_growth: "Client growth",
  prospects: "Prospects",
  projects: "Projects",
};

/** Normalize legacy rows when "lost" was a stage (now use status "Lost" / etc.). */
export function migrateOpportunityRow(row: Opportunity): Opportunity {
  let { status, stage } = row;
  const stageStr = stage as string;

  if (stageStr === "lost") {
    stage = "prospects";
    status =
      status === "—" || status.trim() === "" ? "Lost" : status;
  }

  if (status === "Ongoing") {
    status = "In progress";
  }
  if (status === "Starts Monday" || status === "Starts on Monday") {
    status = "Starting";
  }
  if (status === "Sent") {
    status = "Sent email";
  }

  if (stageStr === "lost" || status !== row.status || stage !== row.stage) {
    return { ...row, stage, status };
  }
  return row;
}

/** Initial rows transcribed from DXE Opportunities sheet (Feb 2026). */
export const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  {
    id: "hallmark",
    account: "Hallmark Pitch",
    person: "Brett",
    stage: "pipeline",
    status: "In progress",
    notes:
      "Talking to tech team; Amrit will ping in 1–2 weeks.",
  },
  {
    id: "ai-audits",
    account: "AI Audits",
    person: "Daulton",
    stage: "pipeline",
    status: "In progress",
    notes:
      "Talk with Thomas learn reporting. Will do one for DentalPlans.com (OPP).",
  },
  {
    id: "glory-global",
    account: "Glory Global",
    person: "Gina",
    stage: "pipeline",
    status: "In progress",
    notes:
      "Pinged Michael. Nothing new right now. Will follow up in a month.",
  },
  {
    id: "spirax",
    account: "Spirax",
    person: "Gina",
    stage: "pipeline",
    status: "—",
    notes: "Pinged Michael. No news.",
  },
  {
    id: "goodrx",
    account: "GoodRx",
    person: "Amrit",
    stage: "pipeline",
    status: "—",
    notes:
      "Help optimize UX pricing page. They already have in-house team (we'd be consulting with them). Not heard back; will ping.",
  },
  {
    id: "memic",
    account: "Memic",
    person: "Gina",
    stage: "pipeline",
    status: "SOW Under Review",
    notes: "Consulting work, plug-and-play; working on SOW, price TBD.",
  },
  {
    id: "vca-canada",
    account: "VCA Canada",
    person: "Gina",
    stage: "client_growth",
    status: "—",
    notes: "Ask Emily.",
  },
  {
    id: "tcw-seo",
    account: "TCW SEO Audit",
    person: "Daulton",
    stage: "client_growth",
    status: "On hold",
    notes: "Talk with GC to start up.",
  },
  {
    id: "card-kingdom-aeo",
    account: "Card Kingdom AEO Approach",
    person: "Daulton",
    stage: "client_growth",
    status: "In progress",
    notes:
      "Sent to Eugene; waiting to hear from client; will follow up with Eugene.",
  },
  {
    id: "mth-reporting",
    account: "MTH Reporting",
    person: "Daulton",
    stage: "client_growth",
    status: "In progress",
    notes:
      "Work with Nilesh, separate SOW (Christine and Cortney). Will reach out and make a proposal when Nilesh back from PTO.",
  },
  {
    id: "imh-checkin",
    account: "IMH Check-in",
    person: "Amrit",
    stage: "client_growth",
    status: "—",
    notes:
      "SOW for Ed is only through end of June; ping for anything new in conjunction.",
  },
  {
    id: "ima-checkin",
    account: "IMA Check-in",
    person: "Livvie",
    stage: "client_growth",
    status: "—",
    notes:
      "Will reach out this week. Bring in someone TBD (XC) to the convo. Haven't heard back. Will ping again.",
  },
  {
    id: "mgic-readynest",
    account: "MGIC / ReadyNest",
    person: "Daulton",
    stage: "client_growth",
    status: "On hold",
    notes: "Currently unbillable. 20-hour audit.",
  },
  {
    id: "verathon",
    account: "Verathon",
    person: "Gina",
    stage: "client_growth",
    status: "SOW Sent",
    notes:
      "SOW sent; due at end of month; no response from Brian.",
  },
  {
    id: "spaulding-ridge",
    account: "Spaulding Ridge",
    person: "Amrit",
    stage: "prospects",
    status: "—",
    notes: "Pinged; no reply.",
  },
  {
    id: "arc3",
    account: "Arc3 Gases Analytics",
    person: "Daulton",
    stage: "prospects",
    status: "In progress",
    notes: "Sue is going to reach out.",
  },
  {
    id: "dental-plans",
    account: "Dental Plans",
    person: "Daulton",
    stage: "prospects",
    status: "—",
    notes: "Daulton going to ping his contact.",
  },
  {
    id: "seattle-symphony",
    account: "Seattle Symphony Phil",
    person: "—",
    stage: "prospects",
    status: "Lost",
    notes: "—",
  },
  {
    id: "eea-pitch",
    account: "EAA Pitch",
    person: "Brett",
    stage: "client_growth",
    status: "Sent email",
    notes: "Ping to see why not down-selected.",
  },
  {
    id: "card-kingdom-proj",
    account: "Card Kingdom",
    person: "Kevin",
    stage: "projects",
    status: "Starting",
    notes:
      "MOVE TO PROJECT. Design system built. Will be done with header and footer. Moving into checkout next week.",
  },
  {
    id: "bunge-seo",
    account: "Bunge SEO Audit",
    person: "Daulton",
    stage: "projects",
    status: "In progress",
    notes:
      "MOVE TO PROJECT. Audit is almost done. GC trying to get time to get in front of Steve.",
  },
  {
    id: "henry-ford",
    account: "Henry Ford Health / Pharmacy Advantage",
    person: "Amrit",
    stage: "projects",
    status: "Won",
    notes: "WON!!",
  },
  {
    id: "qorvo",
    account: "Qorvo",
    person: "Livvie",
    stage: "projects",
    status: "In progress",
    notes:
      "MOVE TO PROJECT. Want to front-load Ed's hours or change request; may need to reduce Ed's hours. Livvie started on Qorvo. Livvie will think about who to bring back. Will ping Amrit with plan.",
  },
];

const defaultOpportunityById = new Map(
  DEFAULT_OPPORTUNITIES.map((r) => [r.id, r] as const),
);

/**
 * For rows that match bundled seed ids, set `status` to the current default.
 * Used when `APP_DATA_REVISION` increases so product updates reach saved workbooks.
 */
export function applySeedDefaultStatus(row: Opportunity): Opportunity {
  const def = defaultOpportunityById.get(row.id);
  if (!def) return row;
  return { ...row, status: def.status };
}

/** Increment when bundled seed data meaningfully changes (triggers merge on next load). */
export const APP_DATA_REVISION = 2;

/** Current localStorage key (stores `{ rev, rows }`). */
export const STORAGE_KEY = "dxe-opportunities-v2";

const STORAGE_KEY_LEGACY = "dxe-opportunities-v1";

type StoredPayload = { rev: number; rows: Opportunity[] };

export function loadPersistedOpportunities(): Opportunity[] {
  if (typeof localStorage === "undefined") {
    return DEFAULT_OPPORTUNITIES;
  }
  try {
    const fromCurrent = localStorage.getItem(STORAGE_KEY);
    let rows: Opportunity[] | null = null;
    let rev = APP_DATA_REVISION;

    if (fromCurrent) {
      const parsed = JSON.parse(fromCurrent) as unknown;
      if (Array.isArray(parsed)) {
        rows = parsed as Opportunity[];
        rev = 0;
      } else if (
        parsed &&
        typeof parsed === "object" &&
        "rows" in (parsed as object) &&
        Array.isArray((parsed as StoredPayload).rows)
      ) {
        const p = parsed as StoredPayload;
        rows = p.rows;
        rev = typeof p.rev === "number" ? p.rev : 0;
      }
    }

    if (!rows?.length) {
      const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
      if (legacy) {
        const old = JSON.parse(legacy) as unknown;
        if (Array.isArray(old) && old.length > 0) {
          rows = old as Opportunity[];
          rev = 0;
          localStorage.removeItem(STORAGE_KEY_LEGACY);
        }
      }
    }

    if (!rows?.length) {
      return DEFAULT_OPPORTUNITIES;
    }

    if (rev < APP_DATA_REVISION) {
      return rows
        .map(applySeedDefaultStatus)
        .map(migrateOpportunityRow);
    }
    return rows.map(migrateOpportunityRow);
  } catch {
    return DEFAULT_OPPORTUNITIES;
  }
}

export function persistOpportunities(rows: Opportunity[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    const payload: StoredPayload = { rev: APP_DATA_REVISION, rows };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}
