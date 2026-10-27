export interface TodoItem {
  id: string;
  seedLabel: string;
  title: string;
  detail?: string;
  urgent?: boolean;
}

export interface SeedLike {
  _id: string;
  name: string;
  variety: string;
  datePlanted: string;
  farmName: string;
  soilType: string;
  location?: string;
}

export interface PlanLike {
  runoffWarning: string;
  fertilizerAdvice: string;
}

export const PLAN_DONE_STORAGE_KEY = "agriflow:plan-todos";

export function loadPlanDone(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PLAN_DONE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function savePlanDone(done: Record<string, boolean>): void {
  try {
    localStorage.setItem(PLAN_DONE_STORAGE_KEY, JSON.stringify(done));
  } catch {
    // ignore quota / private mode
  }
}

function daysSince(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export function seedTodos(seed: SeedLike): TodoItem[] {
  const age = daysSince(seed.datePlanted);
  const label = `${seed.name} · ${seed.variety}`;
  const todos: TodoItem[] = [];

  if (age !== null && age < 7) {
    todos.push({
      id: `${seed._id}-germ`,
      seedLabel: label,
      title: "Check germination & soil moisture",
      detail: `Day ${age} · ${seed.farmName}`,
    });
  } else if (age !== null && age < 21) {
    todos.push({
      id: `${seed._id}-feed`,
      seedLabel: label,
      title: "Side-dress / check nutrient needs",
      detail: `Day ${age} · ${seed.farmName} · ${seed.soilType}`,
      urgent: age < 14,
    });
  } else if (age !== null) {
    todos.push({
      id: `${seed._id}-inspect`,
      seedLabel: label,
      title: "Scout for pests & irrigation balance",
      detail: `Day ${age} · ${seed.farmName}`,
    });
  }

  if (!seed.location) {
    todos.push({
      id: `${seed._id}-gps`,
      seedLabel: label,
      title: "Add GPS location for this seed",
      detail: "Needed for precise runoff context",
    });
  }

  return todos;
}

export function planTodos(plan: PlanLike | null | undefined): TodoItem[] {
  if (!plan) return [];

  const todos: TodoItem[] = [];
  const warning = plan.runoffWarning.trim();
  const elevated = warning.length > 0 && warning.toLowerCase() !== "none";

  if (elevated) {
    todos.push({
      id: "runoff-hold",
      seedLabel: "All fields",
      title: "Hold fertilizer before rain",
      detail: warning,
      urgent: true,
    });
    todos.push({
      id: "runoff-irr",
      seedLabel: "All fields",
      title: "Delay irrigation 48h if rain is likely",
      detail: "Runoff risk elevated from latest plan",
      urgent: true,
    });
  }

  const firstAdvice = plan.fertilizerAdvice
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)[0];
  if (firstAdvice) {
    todos.push({
      id: "plan-advice",
      seedLabel: "All fields",
      title: firstAdvice,
      detail: "From latest AI plan",
    });
  }

  return todos;
}

export function buildTodos(
  seeds: SeedLike[],
  plan: PlanLike | null | undefined
): TodoItem[] {
  return [...planTodos(plan), ...seeds.flatMap(seedTodos)];
}

export function countOpenTodos(
  todos: TodoItem[],
  done: Record<string, boolean>
): number {
  return todos.filter((t) => !done[t.id]).length;
}
