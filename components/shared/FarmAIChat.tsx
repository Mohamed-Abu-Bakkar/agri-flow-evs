"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { askFarmAI, type FarmChatTurn } from "@/lib/groq";
import { useHaptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";

const GREETING: FarmChatTurn = {
  role: "assistant",
  content:
    "Hi, I’m Farm AI 🌱 Ask me about fertilizer timing, irrigation, soil, or runoff.",
};

export function FarmAIChat() {
  const { impact } = useHaptic();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<FarmChatTurn[]>([GREETING]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ensureUser = useMutation(api.users.ensure);
  const seeds = useQuery(api.seeds.listByUser, userId ? { userId } : "skip");

  useEffect(() => {
    let cancelled = false;
    void ensureUser()
      .then((id) => {
        if (!cancelled) setUserId(id);
      })
      .catch(() => {
        // chat still works without backend context
      });
    return () => {
      cancelled = true;
    };
  }, [ensureUser]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, sending, open]);

  const farmContext =
    seeds && seeds.length > 0
      ? seeds
          .slice(0, 6)
          .map(
            (s) =>
              `${s.name} (${s.variety}) planted ${s.datePlanted} at ${s.farmName}, soil ${s.soilType}`
          )
          .join("; ")
      : undefined;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    setSending(true);
    impact("light");

    const history: FarmChatTurn[] = [...turns, { role: "user", content: text }];
    setTurns(history);

    try {
      const reply = await askFarmAI(
        history.filter((t) => t !== GREETING),
        farmContext
      );
      setTurns([...history, { role: "assistant", content: reply }]);
      impact("medium");
    } catch {
      setError("Farm AI is unavailable right now. Check GROQ_API_KEY.");
      setTurns(history);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-4 z-50 flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition active:scale-95"
          aria-label="Open Farm AI chat"
        >
          <img src="/logo.png" alt="AgriFlow" className="h-5 w-5" aria-hidden />
          Farm AI
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Farm AI chat"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[min(72vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 bg-gradient-to-b from-emerald-700 to-emerald-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 border border-white/25">
                  <img src="/logo.png" alt="AgriFlow" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold leading-tight">Farm AI</p>
                  <p className="text-[11px] text-emerald-100/90">
                    Fertilizer · irrigation · runoff
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/15 border border-white/25 active:scale-95"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-stone-50 px-4 py-4"
            >
              {turns.map((turn, i) => (
                <div
                  key={`turn-${i}`}
                  className={cn(
                    "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    turn.role === "user"
                      ? "ml-auto bg-emerald-700 text-white"
                      : "border border-zinc-200 bg-white text-zinc-800"
                  )}
                >
                  {turn.content}
                </div>
              ))}
              {sending && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-700" aria-hidden />
                  Farm AI is thinking…
                </div>
              )}
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>

            <form
              className="flex items-center gap-2 border-t border-zinc-200 bg-white px-3 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Farm AI…"
                className="h-11 flex-1 rounded-xl border border-zinc-200 bg-stone-50 px-3 text-sm outline-none ring-emerald-600 focus:ring-2"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white transition active:scale-95 disabled:opacity-40"
              >
                <Send className="h-5 w-5" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
