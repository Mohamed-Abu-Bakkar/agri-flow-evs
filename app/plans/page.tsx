"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListChecks, Sprout } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import {
  buildTodos,
  countOpenTodos,
  loadPlanDone,
  savePlanDone,
  type TodoItem,
} from "@/lib/todos";

export default function PlansPage() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>(loadPlanDone);

  const ensureUser = useMutation(api.users.ensure);
  const seeds = useQuery(api.seeds.listByUser, userId ? { userId } : "skip");
  const plans = useQuery(
    api.recommendations.listByUser,
    userId ? { userId } : "skip"
  );

  useEffect(() => {
    let cancelled = false;
    void ensureUser()
      .then((id) => {
        if (!cancelled) setUserId(id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ensureUser]);

  useEffect(() => {
    savePlanDone(done);
  }, [done]);

  const toggle = (id: string) => {
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const latestPlan = plans?.[0];
  const items = buildTodos(seeds ?? [], latestPlan);
  const openCount = countOpenTodos(items, done);

  const bySeed = new Map<string, TodoItem[]>();
  for (const item of items) {
    const list = bySeed.get(item.seedLabel) ?? [];
    list.push(item);
    bySeed.set(item.seedLabel, list);
  }

  return (
    <main className="flex min-h-screen flex-col bg-white pb-8">
      <PageHeader
        eyebrow="Today · field tasks"
        title="Today’s Plan"
        subtitle={
          items.length === 0
            ? "No tasks yet"
            : `${openCount} open · ${items.length - openCount} done`
        }
      />

      <div className="flex flex-col gap-5 px-5 pt-4">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center">
            <ListChecks className="mx-auto h-8 w-8 text-zinc-300" aria-hidden />
            <p className="mt-2 text-sm text-zinc-500">
              Log seeds or generate an AI plan to build today’s todos.
            </p>
            <Link
              href="/farm"
              className="mt-3 inline-block rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white active:scale-95 transition"
            >
              Log a seed
            </Link>
          </div>
        )}

        {[...bySeed.entries()].map(([group, todos]) => (
          <section key={group} className="space-y-2">
            <h2 className="flex items-center gap-1.5 px-0.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
              <Sprout className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              {group}
            </h2>
            <ul className="space-y-2">
              {todos.map((todo) => {
                const isDone = !!done[todo.id];
                return (
                  <li key={todo.id}>
                    <button
                      type="button"
                      onClick={() => toggle(todo.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.99]",
                        isDone
                          ? "border-zinc-100 bg-stone-50 opacity-60"
                          : todo.urgent
                            ? "border-amber-300 bg-amber-50"
                            : "border-zinc-200 bg-white"
                      )}
                      aria-pressed={isDone}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[11px] font-bold",
                          isDone
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-zinc-300 text-transparent"
                        )}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-sm font-semibold",
                            isDone ? "line-through text-zinc-400" : "text-zinc-900"
                          )}
                        >
                          {todo.title}
                        </span>
                        {todo.detail && (
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {todo.detail}
                          </span>
                        )}
                      </span>
                      {!isDone && todo.urgent && (
                        <span className="shrink-0 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                          NOW
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
