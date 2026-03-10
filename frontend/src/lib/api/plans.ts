import api from "./client";
import type { Plan, PteroEgg, PteroNode, PriceCalculation } from "@/types";
import type { CalculatePriceDto } from "@/types/dto";

export const plansApi = {
  list: () => api.get<Plan[]>("/plans"),
  get: (id: string) => api.get<Plan>(`/plans/${id}`),
  getEggs: () => api.get<PteroEgg[]>("/plans/eggs"),
  getNodes: () => api.get<PteroNode[]>("/plans/nodes"),
  calculatePrice: (data: CalculatePriceDto) => api.post<PriceCalculation>("/plans/calculate", data),
  getLimits: (id: string) => api.get(`/plans/${id}/limits`),
};
