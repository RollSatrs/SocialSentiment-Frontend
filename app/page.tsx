"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Tone = "negative" | "neutral" | "positive";
type Comment = { text: string; sentiment: Tone };
type Analysis = { id: string; status: string; url: string; source: string; message: string; total: number; negative: number; neutral: number; positive: number; createdAt: string; comments: Comment[] };
type Filter = Tone | "all";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
const tones: { key: Tone; label: string; color: string; text: string }[] = [
  { key: "negative", label: "Негативные", color: "#fb7185", text: "text-rose-300" },
  { key: "neutral", label: "Нейтральные", color: "#94a3b8", text: "text-slate-300" },
  { key: "positive", label: "Позитивные", color: "#34d399", text: "text-emerald-300" },
];
const sourceName = (source: string) => ({ scrapfly: "Instagram · Scrapfly", instagram_api: "Instagram API", user_supplied: "Ручной ввод", reanalyzed_ai: "Повторный анализ" }[source] ?? source);
const loadingMessages = {
  scrapfly: ["Проверяем публикацию...", "Получаем комментарии...", "Обрабатываем данные...", "Анализируем реакции...", "Подготавливаем отчёт..."],
  manual: ["Проверяем комментарии...", "Обрабатываем данные...", "Анализируем реакции...", "Подготавливаем отчёт..."],
  repeat: ["Подготавливаем комментарии...", "Анализируем реакции...", "Сохраняем результаты..."],
} as const;

function LoadingMessage({ messages }: { messages: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let current = 0;
    let transitionTimer: number | undefined;
    const interval = window.setInterval(() => {
      if (current >= messages.length - 1) {
        window.clearInterval(interval);
        return;
      }
      setVisible(false);
      transitionTimer = window.setTimeout(() => {
        current += 1;
        setIndex(current);
        setVisible(true);
        if (current >= messages.length - 1) window.clearInterval(interval);
      }, 850);
    }, 3500);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(transitionTimer);
    };
  }, [messages]);
  return (
    <span className="relative block h-5 overflow-hidden text-center" role="status" aria-live="off">
      <span className={`block transition-all duration-[850ms] ease-in-out motion-reduce:transition-none ${visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`}>
        {messages[index]}
      </span>
    </span>
  );
}

const pct = (n: number, total: number) => total ? Math.round(n / total * 1000) / 10 : 0;
function validHistory(data: unknown): Analysis[] {
  if (!Array.isArray(data)) return [];
  return data.filter((x): x is Analysis => x && typeof x.id === "string" && Array.isArray(x.comments)).filter((x, i, arr) => arr.findIndex(y => y.id === x.id) === i);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<"scrapfly" | "manual">("scrapfly");
  const [result, setResult] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const refresh = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API}/api/v1/analyses`, { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить историю");
      setHistory(validHistory(await response.json()));
      setHistoryError("");
    } catch {
      setHistoryError("История недоступна. Проверьте подключение к backend.");
    } finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  function addResult(data: Analysis) {
    setResult(data); setFilter("all"); setQuery(""); setError("");
    setHistory(previous => [data, ...previous.filter(item => item.id !== data.id)].slice(0, 20));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const comments = raw.split("\n").map(x => x.trim()).filter(Boolean);
      if (mode === "manual" && !comments.length) throw new Error("Добавьте хотя бы один комментарий.");
      if (comments.length > 500) throw new Error("Можно отправить не более 500 комментариев.");
      const response = await fetch(`${API}/api/v1/analyses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "manual" ? { url, comments } : { url, source: "scrapfly" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Не удалось выполнить анализ.");
      addResult(data as Analysis);
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка подключения."); }
    finally { setLoading(false); }
  }

  async function reanalyze() {
    if (!result || reanalyzing) return;
    setReanalyzing(true); setError("");
    try {
      const response = await fetch(`${API}/api/v1/analyses/${encodeURIComponent(result.id)}/reanalyze`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Повторный анализ не удался.");
      addResult(data as Analysis);
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка повторного анализа."); }
    finally { setReanalyzing(false); }
  }

  const filtered = useMemo(() => (result?.comments ?? []).filter(x =>
    (filter === "all" || x.sentiment === filter) && x.text.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  ), [result, filter, query]);
  const negativeShare = result ? pct(result.negative, result.total) : 0;
  const neutralShare = result ? pct(result.neutral, result.total) : 0;
  const ring = result?.total ? `conic-gradient(#fb7185 0% ${negativeShare}%, #94a3b8 ${negativeShare}% ${negativeShare + neutralShare}%, #34d399 ${negativeShare + neutralShare}% 100%)` : "#25283a";

  return (
    <div className="min-h-screen bg-[#090b13] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -top-56 left-1/4 h-[550px] w-[550px] rounded-full bg-violet-600/10 blur-[110px]" /><div className="absolute right-0 top-[550px] h-96 w-96 rounded-full bg-fuchsia-600/5 blur-[100px]" /></div>
      <div className="relative">
        <header className="border-b border-white/[.07] bg-[#0e101a]/80">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl font-black shadow-lg shadow-violet-500/20">S</div><div><div className="font-semibold tracking-tight">SocialSentiment<span className="text-violet-400">.</span></div><div className="text-xs text-slate-500">Аналитика реакции аудитории</div></div></div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[.06] px-3 py-2 text-xs text-emerald-300"><span className="size-2 rounded-full bg-emerald-400" /> Аналитика комментариев</div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8">
          <div className="mb-9"><p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-violet-400">АНАЛИТИКА АУДИТОРИИ</p><h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Понимайте, что думает <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">ваша аудитория.</span></h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">Исследуйте реакцию аудитории на публикации Instagram. Находите реакцию аудитории и изучайте каждый комментарий.</p></div>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
            <form onSubmit={submit} className="panel p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Новый анализ</h2><p className="mt-1 text-sm text-slate-500">Ссылка на публикацию Instagram</p></div><span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs text-violet-300">Анализ тональности</span></div>
              <label htmlFor="post-url" className="mt-7 block text-xs font-medium text-slate-300">Ссылка на публикацию</label>
              <input id="post-url" required type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." className="field mt-2" />
              <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-[#0a0d17] p-1">
                <button type="button" onClick={() => setMode("scrapfly")} className={`rounded-lg px-3 py-3 text-sm transition ${mode === "scrapfly" ? "bg-[#29233f] text-violet-200 shadow-sm" : "text-slate-500 hover:text-white"}`}>Автоматический сбор</button>
                <button type="button" onClick={() => setMode("manual")} className={`rounded-lg px-3 py-3 text-sm transition ${mode === "manual" ? "bg-[#29233f] text-violet-200 shadow-sm" : "text-slate-500 hover:text-white"}`}>Вставить комментарии</button>
              </div>
              {mode === "manual" ? <><label htmlFor="manual-comments" className="mt-5 block text-xs font-medium text-slate-300">Комментарии · по одному на строку</label><textarea id="manual-comments" rows={5} value={raw} onChange={e => setRaw(e.target.value)} placeholder={"Отличный пост!\nМне совсем не понравилось\nКогда будет продолжение?"} className="field mt-2 resize-y leading-7" /><p className="mt-2 text-xs text-slate-500">До 500 комментариев за один анализ.</p></> : <div className="mt-5 rounded-xl border border-violet-400/10 bg-violet-400/[.04] p-4 text-xs leading-6 text-slate-400">Сбор публичных комментариев через Scrapfly. Для работы требуется запущенный Python parser и настроенный ключ Scrapfly. Запрос может расходовать кредиты.</div>}
              <button disabled={loading} type="submit" className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{loading ? <LoadingMessage messages={loadingMessages[mode]} /> : "Анализировать комментарии →"}</button>
              {loading && <p className="mt-3 text-center text-xs text-slate-500">Пожалуйста, подождите. Этапы отображаются ориентировочно.</p>}
              {error && <div role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}
            </form>
            <aside className="panel p-6 sm:p-7"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">История анализов</h2><p className="mt-1 text-xs text-slate-500">Последние сохранённые результаты</p></div><button type="button" onClick={() => void refresh()} aria-label="Обновить историю" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">↻</button></div>
              <div className="mt-5 max-h-[420px] space-y-2 overflow-y-auto pr-1">{historyLoading && <p className="py-5 text-sm text-slate-500">Загружаем историю…</p>}{historyError && <p role="alert" className="py-3 text-sm text-rose-300">{historyError}</p>}{!historyLoading && !historyError && history.length === 0 && <p className="py-5 text-sm text-slate-500">Пока нет анализов.</p>}
                {history.map(item => <button type="button" key={item.id} onClick={() => { addResult(item); setError(""); }} className={`w-full rounded-xl border p-4 text-left transition hover:border-violet-400/40 ${result?.id === item.id ? "border-violet-500/50 bg-violet-500/10" : "border-white/[.06] bg-[#0c0f19]"}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{(() => { try { return new URL(item.url).pathname; } catch { return item.url; } })()}</span><span className="shrink-0 text-[11px] text-slate-500">{item.total} шт.</span></div><p className="mt-2 truncate text-xs text-slate-500">{sourceName(item.source)} · {new Date(item.createdAt).toLocaleDateString("ru-RU")}</p><div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/5">{tones.map(t => <div key={t.key} style={{ width: `${pct(item[t.key], item.total)}%`, backgroundColor: t.color }} />)}</div></button>)}
              </div>
            </aside>
          </div>
          {result ? <section className="mt-7 space-y-5" aria-label="Результаты анализа">
            <div className="panel p-6 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Отчёт по публикации</p><h2 className="mt-2 text-2xl font-semibold">Результаты анализа</h2><p className="mt-2 max-w-xl break-all text-xs text-slate-500">{result.url}</p><p className="mt-2 text-xs text-slate-400">{sourceName(result.source)} · {new Date(result.createdAt).toLocaleString("ru-RU")}</p></div><button type="button" onClick={() => void reanalyze()} disabled={reanalyzing || !result.total} className="rounded-xl border border-violet-400/25 bg-violet-400/10 px-4 py-2.5 text-xs font-medium text-violet-200 hover:bg-violet-400/20 disabled:opacity-50">{reanalyzing ? <LoadingMessage messages={loadingMessages.repeat} /> : "↻ Повторить анализ"}</button></div>
              <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">{[{ label: "Всего комментариев", value: result.total, cls: "text-white" }, { label: "Негативные", value: result.negative, cls: "text-rose-300" }, { label: "Нейтральные", value: result.neutral, cls: "text-slate-300" }, { label: "Позитивные", value: result.positive, cls: "text-emerald-300" }].map(x => <div key={x.label} className="rounded-2xl border border-white/[.07] bg-[#0d101b] p-4 sm:p-5"><p className="text-xs text-slate-500">{x.label}</p><p className={`mt-3 text-3xl font-semibold tabular-nums ${x.cls}`}>{x.value}</p></div>)}</div>
              <div className="mt-6 grid items-center gap-8 rounded-2xl border border-white/[.06] bg-[#0d101b] p-5 md:grid-cols-[230px_1fr] md:p-7"><div className="mx-auto grid size-48 place-items-center rounded-full" style={{ background: ring }}><div className="grid size-[145px] place-items-center rounded-full bg-[#0d101b] text-center"><div><p className="text-3xl font-semibold">{result.total}</p><p className="mt-1 text-xs text-slate-500">комментариев</p></div></div></div><div><h3 className="text-base font-semibold">Распределение тональности</h3><p className="mt-1 text-xs text-slate-500">Распределение комментариев по тональности</p><div className="mt-6 space-y-5">{tones.map(t => <div key={t.key}><div className="mb-2 flex justify-between text-sm"><span className="flex items-center gap-2 text-slate-300"><span className="size-2.5 rounded-full" style={{ background: t.color }} />{t.label}</span><span className="font-medium tabular-nums">{pct(result[t.key], result.total)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full" style={{ width: `${pct(result[t.key], result.total)}%`, background: t.color }} /></div></div>)}</div></div></div>
              <p className="mt-4 text-xs leading-6 text-slate-500">Автоматическая оценка тональности может ошибаться, особенно при сарказме и неоднозначном контексте.</p>
            </div>
            <div className="panel p-6 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Комментарии</h2><p className="mt-1 text-xs text-slate-500">Фильтруйте реакции и находите нужные сообщения</p></div><span className="text-xs text-slate-500">{filtered.length} из {result.total}</span></div>
              <div className="mt-6 flex flex-wrap gap-2">{([{ key: "all", label: "Все", count: result.total }, ...tones.map(t => ({ key: t.key, label: t.label, count: result[t.key] }))] as { key: Filter; label: string; count: number }[]).map(t => <button type="button" key={t.key} onClick={() => setFilter(t.key)} className={`rounded-xl px-3.5 py-2 text-xs font-medium transition ${filter === t.key ? "bg-violet-500 text-white" : "border border-white/10 bg-white/[.03] text-slate-400 hover:text-white"}`}>{t.label} <span className="ml-1 opacity-70">{t.count}</span></button>)}</div>
              <input aria-label="Поиск по комментариям" value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по тексту комментариев…" className="field mt-4" />
              <div className="mt-4 max-h-[650px] space-y-2 overflow-y-auto pr-1">{filtered.length === 0 ? <p className="rounded-xl border border-white/[.07] p-6 text-sm text-slate-500">Комментарии не найдены.</p> : filtered.map((comment, index) => { const tone = tones.find(t => t.key === comment.sentiment); return <div key={index} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/[.06] bg-[#0c0f19] p-4"><p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{comment.text}</p><span className={`shrink-0 rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs ${tone?.text ?? "text-slate-300"}`}>{tone?.label ?? comment.sentiment}</span></div>; })}</div>
            </div>
          </section> : <div className="mt-7 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center"><p className="text-base font-medium text-slate-300">Ваш отчёт появится здесь</p><p className="mt-2 text-sm text-slate-500">Запустите анализ или выберите сохранённый результат из истории.</p></div>}
          <footer className="mt-12 text-center text-xs text-slate-600">SocialSentiment · Аналитика комментариев</footer>
        </main>
      </div>
    </div>
  );
}
