import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Opportunity, PipelineStage } from "@/data/opportunities";
import { STAGE_LABEL } from "@/data/opportunities";

const STAGE_FILL: Record<PipelineStage, string> = {
  pipeline: "#379FB2",
  client_growth: "#1A6D7D",
  prospects: "#02140D",
  projects: "#6B7280",
};

const STAGES_ORDER: PipelineStage[] = [
  "pipeline",
  "client_growth",
  "prospects",
  "projects",
];

const STATUS_TOP_N = 10;

const AXIS_TICK = { fill: "#6B7280", fontSize: 11 };
const GRID_STROKE = "rgba(2, 20, 13, 0.08)";

const EASE_OUT_SOFT = [0.22, 1, 0.25, 1] as const;

type TooltipPayloadItem = {
  color?: string;
  name?: string;
  value?: number;
};

function OverviewTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-dxe-rule bg-dxe-paper px-3 py-2 text-xs shadow-sm">
      <p className="mb-1.5 font-medium text-dxe-ink">{label}</p>
      <ul className="space-y-0.5">
        {payload
          .filter((p) => (p.value ?? 0) > 0)
          .map((p) => (
            <li
              key={String(p.name)}
              className="flex items-center justify-between gap-4 text-dxe-ink-mid"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: p.color }}
                  aria-hidden
                />
                {p.name}
              </span>
              <span className="tabular-nums text-dxe-ink">{p.value}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

export function OpportunityOverviewCharts({
  filtered,
}: {
  filtered: Opportunity[];
}) {
  const reducedMotion = useReducedMotion();

  const staggerContainer = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reducedMotion ? 0 : 0.11,
          delayChildren: reducedMotion ? 0 : 0.06,
        },
      },
    }),
    [reducedMotion],
  );

  const chartBlock = useMemo(
    () => ({
      hidden: { opacity: 0, y: reducedMotion ? 0 : 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: reducedMotion
          ? { duration: 0 }
          : { duration: 0.48, ease: EASE_OUT_SOFT },
      },
    }),
    [reducedMotion],
  );

  const animKey = useMemo(
    () => filtered.map((r) => r.id).join("|"),
    [filtered],
  );

  const personWorkload = useMemo(() => {
    const byPerson = new Map<
      string,
      Record<PipelineStage, number> & { person: string }
    >();
    for (const row of filtered) {
      if (!byPerson.has(row.person)) {
        const base = {
          person: row.person,
          pipeline: 0,
          client_growth: 0,
          prospects: 0,
          projects: 0,
        } satisfies Record<PipelineStage, number> & { person: string };
        byPerson.set(row.person, { ...base });
      }
      const rec = byPerson.get(row.person)!;
      rec[row.stage] += 1;
    }
    return [...byPerson.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((person) => byPerson.get(person)!);
  }, [filtered]);

  const stageMix = useMemo(
    () =>
      STAGES_ORDER.map((stage) => ({
        stage,
        label: STAGE_LABEL[stage],
        count: filtered.filter((r) => r.stage === stage).length,
      })),
    [filtered],
  );

  const statusMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filtered) {
      counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    }
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (entries.length <= STATUS_TOP_N) {
      return entries.map(([status, count]) => ({ status, count }));
    }
    const top = entries
      .slice(0, STATUS_TOP_N)
      .map(([status, count]) => ({ status, count }));
    const otherSum = entries
      .slice(STATUS_TOP_N)
      .reduce((sum, [, c]) => sum + c, 0);
    return [...top, { status: "Other", count: otherSum }];
  }, [filtered]);

  const workloadChartHeight = useMemo(() => {
    const n = personWorkload.length;
    return Math.min(520, Math.max(200, 48 + n * 40));
  }, [personWorkload.length]);

  const empty = filtered.length === 0;

  return (
    <Card className="border border-dxe-rule border-l-4 border-l-primary bg-dxe-paper shadow-none">
      <CardHeader className="gap-2">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-[13px] font-light italic text-dxe-gold">
            02
          </span>
          <CardTitle className="font-heading text-xl font-bold tracking-tight text-dxe-ink">
            Overview
          </CardTitle>
        </div>
        <CardDescription className="text-dxe-ink-mid">
          Charts use the same filtered rows as the table below—people, project types
          (sections), and statuses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="rounded-md border border-dashed border-dxe-rule bg-dxe-cream/40 px-4 py-8 text-center text-sm text-dxe-ink-mid">
            No rows match the current filters. Clear filters to see the dashboard.
          </p>
        ) : (
          <motion.div
            key={animKey}
            className="grid gap-10 lg:gap-12"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.section
              aria-labelledby="overview-workload-heading"
              className="min-w-0"
              variants={chartBlock}
            >
              <h3
                id="overview-workload-heading"
                className="mb-3 font-heading text-sm font-semibold text-dxe-ink"
              >
                Workload by person
              </h3>
              <p className="mb-3 text-xs text-dxe-ink-mid">
                Horizontal bars stack counts by project type for each person.
              </p>
              <div
                className="min-h-[200px] w-full min-w-0"
                style={{ height: workloadChartHeight }}
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    layout="vertical"
                    data={personWorkload}
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={GRID_STROKE}
                      horizontal={false}
                    />
                    <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
                    <YAxis
                      type="category"
                      dataKey="person"
                      width={88}
                      tick={AXIS_TICK}
                      tickLine={false}
                    />
                    <Tooltip content={<OverviewTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(value) =>
                        STAGE_LABEL[value as PipelineStage] ?? value
                      }
                    />
                    {STAGES_ORDER.map((stage) => (
                      <Bar
                        key={stage}
                        dataKey={stage}
                        name={STAGE_LABEL[stage]}
                        stackId="workload"
                        fill={STAGE_FILL[stage]}
                        radius={[0, 2, 2, 0]}
                        isAnimationActive={!reducedMotion}
                        animationDuration={reducedMotion ? 0 : 520}
                        animationEasing="ease-out"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.section>

            <div className="grid min-w-0 gap-10 md:grid-cols-2 md:gap-8">
              <motion.section
                aria-labelledby="overview-stage-heading"
                className="min-w-0"
                variants={chartBlock}
              >
                <h3
                  id="overview-stage-heading"
                  className="mb-3 font-heading text-sm font-semibold text-dxe-ink"
                >
                  Pipeline mix
                </h3>
                <p className="mb-3 text-xs text-dxe-ink-mid">
                  Opportunities per project type (section).
                </p>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={stageMix}
                      margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID_STROKE}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={AXIS_TICK}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={48}
                      />
                      <YAxis allowDecimals={false} tick={AXIS_TICK} width={32} />
                      <Tooltip content={<OverviewTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Opportunities"
                        fill="#379FB2"
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={!reducedMotion}
                        animationDuration={reducedMotion ? 0 : 520}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.section>

              <motion.section
                aria-labelledby="overview-status-heading"
                className="min-w-0"
                variants={chartBlock}
              >
                <h3
                  id="overview-status-heading"
                  className="mb-3 font-heading text-sm font-semibold text-dxe-ink"
                >
                  Status mix
                </h3>
                <p className="mb-3 text-xs text-dxe-ink-mid">
                  Top {STATUS_TOP_N} statuses by count
                  {statusMix.some((s) => s.status === "Other")
                    ? ", plus Other"
                    : ""}
                  .
                </p>
                <div className="h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      layout="vertical"
                      data={statusMix}
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID_STROKE}
                        horizontal={false}
                      />
                      <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} />
                      <YAxis
                        type="category"
                        dataKey="status"
                        width={100}
                        tick={AXIS_TICK}
                        tickLine={false}
                        tickFormatter={(v) =>
                          v.length > 18 ? `${v.slice(0, 17)}…` : v
                        }
                      />
                      <Tooltip content={<OverviewTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Count"
                        fill="#1A6D7D"
                        radius={[0, 4, 4, 0]}
                        isAnimationActive={!reducedMotion}
                        animationDuration={reducedMotion ? 0 : 520}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
