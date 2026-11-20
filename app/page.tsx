"use client";

import { useEffect, useState } from "react";

type Comment = { text: string; sentiment: "negative" | "neutral" | "positive" };
type Analysis = {
  id: string; status: string; url: string; source: string; message: string;
  total: number; negative: number; neutral: number; positive: number;
  createdAt: string; comments: Comment[];
};
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
const tabs = [
  { key: "all", title: "Все" },
  { key: "negative", title: "Негативные" },
  { key: "neutral", title: "Нейтральные" },
  { key: "positive", title: "Позитивные" },
] as const;
const colors: Record<string, string> = {
  negative: "text-rose-300 bg-rose-400/10 border-rose-400/20",
  neutral: "text-slate-300 bg-slate-400/10 border-slate-400/20",
  positive: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
};
const names: Record<string, string> = {
  negative: "Негативный", neutral: "Нейтральный", positive: "Позитивный",
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/v1/analyses`)
      .then((response) => response.ok ? response.json() : [])
      .then((data: Analysis[]) => setHistory(Array.isArray(data) ? data.filter((item) => item && typeof item.id === "string" && item.id.length > 0).filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index) : []))
      .catch(() => {});
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const comments = raw.split("\n").map((line) => line.trim()).filter(Boolean);
      const response = await fetch(`${API}/api/v1/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, comments }),
      });
      const data: Analysis & { message?: string } = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Ошибка обработки запроса");
      setResult(data); setFilter("all");
      setHistory((previous) => data.id ? [data, ...previous.filter((item) => item.id !== data.id)].slice(0, 20) : previous);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось подключиться к Java API на порту 4001.");
    } finally { setLoading(false); }
  }

  const shown = result?.comments.filter((comment) => filter === "all" || comment.sentiment === filter) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0c14] text-white">
      <header className="border-b border-white/10 bg-[#10131d]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-2xl font-black shadow-lg shadow-violet-900/30">S</div>
            <div><p className="font-bold tracking-tight">SocialSentiment</p><p className="text-xs text-zinc-500">Instagram Comment Analytics</p></div>
          </div>
          <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-200">Local MVP · Java 21</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-10 max-w-3xl">
          <p className="mb-4 text-sm font-medium text-violet-300">АНАЛИТИКА СОЦИАЛЬНЫХ СЕТЕЙ</p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Понимайте реакцию <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">аудитории.</span></h1>
          <p className="mt-5 text-base leading-7 text-zinc-400">Находите негативные комментарии и отслеживайте тональность обсуждений под Instagram-публикациями.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
          <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-[#151925] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Новый анализ</h2>
            <p className="mt-1 text-sm text-zinc-400">Укажите ссылку и, при наличии, текст реальных комментариев.</p>
            <label htmlFor="url" className="mt-7 mb-2 block text-sm font-medium">Instagram URL</label>
            <input id="url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." className="w-full rounded-xl border border-white/10 bg-[#0c0f18] px-4 py-3.5 text-sm outline-none focus:border-violet-400" />
            <div className="mt-6 flex items-center justify-between gap-3">
              <label htmlFor="comments" className="text-sm font-medium">Комментарии <span className="font-normal text-zinc-500">(необязательно)</span></label>
              <span className="text-xs text-zinc-500">1 комментарий = 1 строка</span>
            </div>
            <textarea id="comments" rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"Ужасное качество, очень плохо\nОтлично, спасибо!\nКогда будет новая публикация?"} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#0c0f18] px-4 py-3.5 text-sm leading-7 outline-none focus:border-violet-400" />
            <p className="mt-3 text-xs leading-5 text-amber-200/75">Автоматический сбор Instagram пока не подключён. Без вставленных комментариев система не будет выдумывать результаты. Классификация сейчас словарная, не AI.</p>
            <button disabled={loading} className="mt-6 w-full rounded-xl bg-violet-500 px-5 py-3.5 font-semibold transition hover:bg-violet-400 disabled:opacity-50">{loading ? "Анализируем..." : "Анализировать комментарии"}</button>
            {error && <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}
          </form>
          <aside className="rounded-3xl border border-white/10 bg-[#151925] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">История анализов</h2>
            <p className="mt-1 text-sm text-zinc-500">Последние 20 запусков из PostgreSQL</p>
            <div className="mt-6 space-y-3">
              {history.length === 0 && <p className="text-sm text-zinc-500">Пока нет сохранённых анализов.</p>}
              {history.map((item, index) => <button key={`${item.id}-${index}`} onClick={() => { setResult(item); setFilter("all"); }} className="w-full rounded-xl border border-white/10 bg-[#0d101a] p-4 text-left transition hover:border-violet-400/50">
                <p className="truncate text-sm font-medium">{item.url}</p>
                <p className="mt-2 text-xs text-zinc-500">{item.total} комментариев · {item.negative} негативных · {new Date(item.createdAt).toLocaleString("ru-RU")}</p>
              </button>)}
            </div>
          </aside>
        </div>
        {result && <section className="mt-8 rounded-3xl border border-white/10 bg-[#151925] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Результаты анализа</h2>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">Источник: {result.source === "user_supplied" ? "вставленные комментарии" : "нет данных"}</span>
          </div>
          <p className="mt-3 text-sm text-zinc-400">{result.message}</p>
          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[{ title: "Всего", value: result.total, tone: "text-white" }, { title: "Негатив", value: result.negative, tone: "text-rose-300" }, { title: "Нейтральные", value: result.neutral, tone: "text-zinc-300" }, { title: "Позитив", value: result.positive, tone: "text-emerald-300" }].map((stat) => <div key={stat.title} className="rounded-2xl border border-white/10 bg-[#0c0f18] p-5"><p className="text-xs text-zinc-500">{stat.title}</p><p className={`mt-2 text-3xl font-bold ${stat.tone}`}>{stat.value}</p></div>)}
          </div>
          {result.total > 0 && <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-zinc-800">
            <div style={{ width: `${result.negative / result.total * 100}%` }} className="bg-rose-400" />
            <div style={{ width: `${result.neutral / result.total * 100}%` }} className="bg-zinc-400" />
            <div style={{ width: `${result.positive / result.total * 100}%` }} className="bg-emerald-400" />
          </div>}
          <div className="mt-8 flex flex-wrap gap-2">{tabs.map((tab) => <button key={tab.key} onClick={() => setFilter(tab.key)} className={`rounded-lg px-4 py-2 text-sm transition ${filter === tab.key ? "bg-violet-500 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>{tab.title}</button>)}</div>
          <div className="mt-5 space-y-3">
            {shown.length === 0 && <p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-500">Комментариев в этой категории нет.</p>}
            {shown.map((comment, index) => <div key={index} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#0c0f18] p-4"><p className="min-w-0 flex-1 break-words text-sm leading-6">{comment.text}</p><span className={`rounded-full border px-3 py-1 text-xs ${colors[comment.sentiment]}`}>{names[comment.sentiment]}</span></div>)}
          </div>
        </section>}
        <footer className="mt-12 text-center text-xs text-zinc-600">SocialSentiment · Учебный проект · Next.js + Spring Boot + PostgreSQL</footer>
      </main>
    </div>
  );
}
