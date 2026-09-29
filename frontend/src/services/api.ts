import { WhatIfInput, WhatIfResult } from '../types';

export const API_BASE_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000");

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const getBackendHealth = () => apiRequest<{ status: string; models_loaded: boolean }>("/api/health");

export const triggerFault = (faultName: string) =>
  apiRequest<{ triggered: string }>(`/api/fault/${encodeURIComponent(faultName)}`, { method: "POST" });

export const clearFault = () =>
  apiRequest<{ cleared: boolean }>("/api/fault/clear", { method: "POST" });

export const runWhatIf = (payload: WhatIfInput) =>
  apiRequest<WhatIfResult>("/api/what-if", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const getReplay = (lastN = 60) => apiRequest<{ log: any[] }>(`/api/replay?last_n=${lastN}`);
export const getEvents = (lastN = 50) => apiRequest<{ events: any[] }>(`/api/events?last_n=${lastN}`);
export const getReliability = () => apiRequest<any>("/api/reliability");
export const getMissions = () => apiRequest<{ missions: string[]; faults: string[] }>("/api/missions");


