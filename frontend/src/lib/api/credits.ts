import api from "./client";
import type { CreditConfig } from "@/types";

export const creditsApi = {
  get: () => api.get<{ amount: number }>("/credits"),
  getConfig: () => api.get<CreditConfig>("/credits/config"),
  earn: () => api.post<{ amount: number; message: string }>("/credits/earn"),
};
