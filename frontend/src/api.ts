const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const api = {
  // funds
  searchFunds: (q: string) => request<{ results: { schemeCode: number; schemeName: string }[] }>(`/funds/search?q=${encodeURIComponent(q)}`),
  fundDetail: (code: string) => request<{ summary: any; history: { date: string; nav: string }[] }>(`/funds/${code}`),
  // dashboard
  nifty: () => request<{ summary: any; history: { date: string; nav: string }[] }>(`/dashboard/nifty`),
  bestBuys: () => request<{ items: any[] }>(`/dashboard/best-buys`),
  // watchlist
  watchlist: () => request<{ items: any[] }>(`/watchlist`),
  addWatchlist: (body: { scheme_code: string; scheme_name: string; target_buy_price?: number | null }) =>
    request<any>(`/watchlist`, { method: "POST", body: JSON.stringify(body) }),
  updateWatchlist: (id: string, body: { target_buy_price?: number | null }) =>
    request<any>(`/watchlist/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteWatchlist: (id: string) => request<any>(`/watchlist/${id}`, { method: "DELETE" }),
  // portfolio
  portfolio: () => request<{ items: any[]; summary: any }>(`/portfolio`),
  addPortfolio: (body: { scheme_code: string; scheme_name: string; units: number; avg_buy_price: number; purchase_date?: string | null; notes?: string | null }) =>
    request<any>(`/portfolio`, { method: "POST", body: JSON.stringify(body) }),
  updatePortfolio: (id: string, body: { units?: number; avg_buy_price?: number; purchase_date?: string | null; notes?: string | null }) =>
    request<any>(`/portfolio/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  buyMore: (id: string, body: { units: number; price: number }) =>
    request<{ units: number; avg_buy_price: number }>(`/portfolio/${id}/buy-more`, { method: "POST", body: JSON.stringify(body) }),
  deletePortfolio: (id: string) => request<any>(`/portfolio/${id}`, { method: "DELETE" }),
  // alerts
  alerts: () => request<{ items: any[]; unread_count: number }>(`/alerts`),
  runCheck: () => request<{ created: number }>(`/alerts/check`, { method: "POST" }),
  markAlertRead: (id: string) => request<any>(`/alerts/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request<any>(`/alerts/mark-all-read`, { method: "POST" }),
  deleteAlert: (id: string) => request<any>(`/alerts/${id}`, { method: "DELETE" }),
  // settings
  settings: () => request<{ drop_threshold_pct: number }>(`/settings`),
  updateSettings: (body: { drop_threshold_pct: number }) =>
    request<any>(`/settings`, { method: "PATCH", body: JSON.stringify(body) }),
  // calc
  calcSip: (body: { monthly_amount: number; years: number; expected_return_pct: number }) =>
    request<{ invested: number; future_value: number; gain: number }>(`/calc/sip`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  calcLumpsum: (body: { amount: number; years: number; expected_return_pct: number }) =>
    request<{ invested: number; future_value: number; gain: number }>(`/calc/lumpsum`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const formatINR = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return "—";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
};

export const formatPct = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
};
