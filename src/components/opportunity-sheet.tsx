import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

import type { Opportunity, PipelineStage } from "@/data/opportunities";
import {
  DEFAULT_OPPORTUNITIES,
  loadPersistedOpportunities,
  persistOpportunities,
  STAGE_LABEL,
} from "@/data/opportunities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { OpportunityOverviewCharts } from "@/components/opportunity-overview-charts";

const ALL = "__all__";

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("lost")) {
    return "border-dxe-coral/45 bg-dxe-coral/10 text-dxe-coral";
  }
  if (s.includes("won")) {
    return "border-dxe-teal/50 bg-dxe-teal-lt text-dxe-teal";
  }
  if (s.includes("hold")) {
    return "border-dxe-ink-soft/35 bg-dxe-cream-2/90 text-dxe-ink-soft";
  }
  if (
    s.includes("progress") ||
    s === "ongoing" ||
    s.includes("starting")
  ) {
    return "border-dxe-gold/50 bg-dxe-gold-bg text-dxe-gold";
  }
  if (s.includes("prospect")) {
    return "border-dxe-gold-lt/45 bg-dxe-gold-bg/80 text-dxe-ink-mid";
  }
  if (s.includes("sow") || s.includes("sent email")) {
    return "border-dxe-teal/35 bg-dxe-teal-lt/70 text-dxe-teal";
  }
  return "border-dxe-rule bg-dxe-cream-2/60 text-dxe-ink-soft";
}

const emptyAddForm = {
  account: "",
  person: "",
  stage: "pipeline" as PipelineStage,
  status: "—",
  notes: "",
};

export function OpportunitySheet() {
  const [rows, setRows] = useState<Opportunity[]>(loadPersistedOpportunities);
  const [filterAccount, setFilterAccount] = useState(ALL);
  const [filterPerson, setFilterPerson] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);

  useEffect(() => {
    persistOpportunities(rows);
  }, [rows]);

  const accounts = useMemo(
    () =>
      [...new Set(rows.map((r) => r.account))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const people = useMemo(
    () =>
      [...new Set(rows.map((r) => r.person))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const statuses = useMemo(
    () =>
      [...new Set(rows.map((r) => r.status))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const stages = Object.entries(STAGE_LABEL) as [PipelineStage, string][];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterAccount !== ALL && r.account !== filterAccount) return false;
      if (filterPerson !== ALL && r.person !== filterPerson) return false;
      if (filterStatus !== ALL && r.status !== filterStatus) return false;
      return true;
    });
  }, [rows, filterAccount, filterPerson, filterStatus]);

  function reconcileFilters(rowsSnapshot: Opportunity[]) {
    queueMicrotask(() => {
      setFilterAccount((fa) =>
        fa !== ALL && !rowsSnapshot.some((r) => r.account === fa) ? ALL : fa,
      );
      setFilterPerson((fp) =>
        fp !== ALL && !rowsSnapshot.some((r) => r.person === fp) ? ALL : fp,
      );
      setFilterStatus((fs) =>
        fs !== ALL && !rowsSnapshot.some((r) => r.status === fs) ? ALL : fs,
      );
    });
  }

  function updateRow(id: string, patch: Partial<Opportunity>) {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      reconcileFilters(next);
      return next;
    });
  }

  function resetFilters() {
    setFilterAccount(ALL);
    setFilterPerson(ALL);
    setFilterStatus(ALL);
  }

  function resetToDefaults() {
    const next = [...DEFAULT_OPPORTUNITIES];
    setRows(next);
    reconcileFilters(next);
    persistOpportunities(next);
  }

  function commitAddRow() {
    const account = addForm.account.trim();
    if (!account) return;
    const row: Opportunity = {
      id: crypto.randomUUID(),
      account,
      person: addForm.person.trim() || "—",
      stage: addForm.stage,
      status: addForm.status.trim() || "—",
      notes: addForm.notes.trim(),
    };
    setRows((prev) => {
      const next = [...prev, row];
      reconcileFilters(next);
      return next;
    });
    setAddForm({ ...emptyAddForm });
    setAddOpen(false);
  }

  function openAddDialog(stage: PipelineStage = "pipeline") {
    setAddForm({ ...emptyAddForm, stage });
    setAddOpen(true);
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      reconcileFilters(next);
      return next;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 pb-16 sm:px-6">
      <header className="grid gap-6 border-b-2 border-dxe-ink pb-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-dxe-gold">
            XCentium · DXE practice
          </p>
          <h1 className="font-heading text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[0.95] tracking-[-0.02em] text-dxe-ink">
            Opportunities{" "}
            <em className="font-light not-italic text-dxe-ink-mid">sheet</em>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-dxe-ink-mid">
            All project types on one page. Add or delete rows per section, filter, rename,
            and move types. Everything autosaves in this browser.
          </p>
        </div>
        <div className="text-[11px] leading-loose text-dxe-ink-soft sm:text-left md:text-right">
          <strong className="mb-0.5 block font-semibold text-dxe-ink">
            Local workspace
          </strong>
          Edits stay on this device
        </div>
      </header>

      <Card className="border border-dxe-rule border-l-4 border-l-dxe-gold bg-dxe-paper shadow-none">
        <CardHeader className="gap-2">
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-[13px] font-light italic text-dxe-gold">
              01
            </span>
            <CardTitle className="font-heading text-xl font-bold tracking-tight text-dxe-ink">
              Filters
            </CardTitle>
          </div>
          <CardDescription className="text-dxe-ink-mid">
            Showing {filtered.length} of {rows.length} rows after filters. Every project
            type is in the pipeline below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="filter-account">Account</Label>
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger id="filter-account" className="w-full">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-person">Person</Label>
              <Select value={filterPerson} onValueChange={setFilterPerson}>
                <SelectTrigger id="filter-person" className="w-full">
                  <SelectValue placeholder="All people" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All people</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filter-status" className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator className="bg-dxe-rule" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-dxe-ink-soft hover:text-dxe-ink"
              onClick={resetToDefaults}
            >
              <RotateCcw className="mr-1 size-4" aria-hidden />
              Reset data to PDF defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <OpportunityOverviewCharts filtered={filtered} />

      <Card className="border border-dxe-rule border-l-4 border-l-dxe-teal bg-dxe-paper shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-[13px] font-light italic text-dxe-gold">
                03
              </span>
              <CardTitle className="font-heading text-xl font-bold tracking-tight text-dxe-ink">
                Pipeline
              </CardTitle>
            </div>
            <CardDescription className="text-dxe-ink-mid">
              Each section is a project type. Use Add per section (or the header button).
              Delete removes a row for good. Use Type to move between sections.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 gap-1"
            onClick={() => openAddDialog("pipeline")}
          >
            <Plus className="size-4" aria-hidden />
            Add opportunity
          </Button>
        </CardHeader>

        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) setAddForm({ ...emptyAddForm });
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add opportunity</DialogTitle>
              <DialogDescription>
                Required: account name. Person and status default to — if left empty.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-account">Account</Label>
                <Input
                  id="add-account"
                  value={addForm.account}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, account: e.target.value }))
                  }
                  placeholder="Company or initiative"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-person">Person</Label>
                <Input
                  id="add-person"
                  value={addForm.person}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, person: e.target.value }))
                  }
                  placeholder="Owner / lead"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-stage">Project type</Label>
                <Select
                  value={addForm.stage}
                  onValueChange={(v) =>
                    setAddForm((f) => ({ ...f, stage: v as PipelineStage }))
                  }
                >
                  <SelectTrigger id="add-stage" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-status">Status</Label>
                <Input
                  id="add-status"
                  value={addForm.status}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, status: e.target.value }))
                  }
                  placeholder="e.g. In progress"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-notes">Notes</Label>
                <Textarea
                  id="add-notes"
                  value={addForm.notes}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="min-h-[88px] resize-y text-sm"
                  placeholder="Next steps…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={commitAddRow}
                disabled={!addForm.account.trim()}
              >
                Add row
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <CardContent className="space-y-10">
          <nav
            aria-label="Project types"
            className="flex flex-wrap gap-x-3 gap-y-2 border-b border-dxe-rule pb-4 text-xs sm:text-sm"
          >
            {stages.map(([id, label]) => {
              const n = filtered.filter((r) => r.stage === id).length;
              return (
                <a
                  key={id}
                  href={`#stage-${id}`}
                  className="text-dxe-teal decoration-dxe-gold/60 font-medium underline-offset-4 hover:underline"
                >
                  {label}
                  <span className="text-dxe-ink-soft ml-1 font-normal tabular-nums">
                    ({n})
                  </span>
                </a>
              );
            })}
          </nav>

          {stages.map(([stageId, label]) => {
            const sectionRows = filtered.filter((r) => r.stage === stageId);
            return (
              <section
                key={stageId}
                id={`stage-${stageId}`}
                className="scroll-mt-6 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dxe-ink/80 pb-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-heading text-lg font-bold tracking-tight text-dxe-ink md:text-xl">
                      {label}
                    </h3>
                    <span className="text-dxe-ink-soft text-sm tabular-nums">
                      {sectionRows.length}{" "}
                      {sectionRows.length === 1 ? "row" : "rows"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => openAddDialog(stageId)}
                  >
                    <Plus className="size-4" aria-hidden />
                    Add to {label}
                  </Button>
                </div>
                {sectionRows.length === 0 ? (
                  <p className="text-dxe-ink-soft py-3 text-sm">
                    No rows here match your filters—or this section is empty. Use{" "}
                    <strong className="font-medium text-dxe-ink-mid">Add to {label}</strong>{" "}
                    above.
                  </p>
                ) : (
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-dxe-rule hover:bg-transparent">
                          <TableHead className="min-w-[140px] bg-dxe-teal-lt font-semibold text-dxe-teal">
                            Account
                          </TableHead>
                          <TableHead className="min-w-[100px] bg-dxe-teal-lt font-semibold text-dxe-teal">
                            Person
                          </TableHead>
                          <TableHead className="min-w-[120px] bg-dxe-teal-lt font-semibold text-dxe-teal">
                            Type
                          </TableHead>
                          <TableHead className="min-w-[100px] bg-dxe-teal-lt font-semibold text-dxe-teal">
                            Status
                          </TableHead>
                          <TableHead className="min-w-[280px] bg-dxe-teal-lt font-semibold text-dxe-teal">
                            Notes
                          </TableHead>
                          <TableHead className="bg-dxe-teal-lt w-12 min-w-12 text-center font-semibold text-dxe-teal">
                            <span className="sr-only">Delete</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sectionRows.map((row) => (
                          <TableRow
                            key={row.id}
                            className="border-dxe-rule transition-colors hover:bg-dxe-gold-bg/45"
                          >
                            <TableCell className="align-top">
                              <Input
                                value={row.account}
                                onChange={(e) =>
                                  updateRow(row.id, {
                                    account: e.target.value,
                                  })
                                }
                                className="h-8 min-w-[10rem] font-medium"
                                aria-label={`Account for row ${row.id}`}
                              />
                            </TableCell>
                            <TableCell className="align-top">
                              <Select
                                value={row.person}
                                onValueChange={(v) =>
                                  updateRow(row.id, { person: v })
                                }
                              >
                                <SelectTrigger
                                  className="h-8 w-[min(100%,11rem)]"
                                  aria-label={`Owner for ${row.account}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {people.map((p) => (
                                    <SelectItem key={p} value={p}>
                                      {p}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="align-top">
                              <Select
                                value={row.stage}
                                onValueChange={(v) =>
                                  updateRow(row.id, {
                                    stage: v as PipelineStage,
                                  })
                                }
                              >
                                <SelectTrigger
                                  className="text-muted-foreground h-8 w-[min(100%,12rem)] text-sm"
                                  aria-label={`Project type for ${row.account}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {stages.map(([value, lbl]) => (
                                    <SelectItem key={value} value={value}>
                                      {lbl}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="align-top">
                              <Select
                                value={row.status}
                                onValueChange={(v) =>
                                  updateRow(row.id, { status: v })
                                }
                              >
                                <SelectTrigger
                                  className="h-8 w-[min(100%,10rem)]"
                                  aria-label={`Status for ${row.account}`}
                                >
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {statuses.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      <span className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={`pointer-events-none ${statusBadgeClass(s)}`}
                                        >
                                          {s}
                                        </Badge>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="align-top">
                              <Textarea
                                value={row.notes}
                                onChange={(e) =>
                                  updateRow(row.id, { notes: e.target.value })
                                }
                                className="min-h-[72px] resize-y text-sm"
                                aria-label={`Notes for ${row.account}`}
                              />
                            </TableCell>
                            <TableCell className="align-top">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-dxe-coral hover:bg-dxe-coral/10 hover:text-dxe-coral"
                                aria-label={`Delete ${row.account}`}
                                onClick={() => removeRow(row.id)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </section>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
