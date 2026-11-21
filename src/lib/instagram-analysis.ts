export type AnalysisResponse = {
  id: string;
  status: string;
  url: string;
  source: string;
  message: string;
  total: number;
  negative: number;
  neutral: number;
  positive: number;
  createdAt: string;
  comments: { text: string; sentiment: "negative" | "neutral" | "positive" }[];
};

export async function requestInstagramAnalysis(url: string): Promise<AnalysisResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
  const response = await fetch(`${baseUrl}/api/v1/analyses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, source: "scrapfly" }),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string" ? payload.message : "Не удалось выполнить анализ.";
    throw new Error(message);
  }
  return payload as AnalysisResponse;
}
