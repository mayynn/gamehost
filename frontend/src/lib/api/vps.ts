import api from "./client";
import type { Vps, VpsPlan } from "@/types";
import type { ProvisionVpsDto, VpsActionDto, ReinstallVpsDto } from "@/types/dto";

export const vpsApi = {
  getPlans: () => api.get<VpsPlan[]>("/vps/plans"),
  getPlanOs: (planId: string) => api.get<string[]>(`/vps/plans/${planId}/os`),
  list: () => api.get<Vps[]>("/vps"),
  get: (id: string) => api.get<Vps>(`/vps/${id}`),
  provision: (data: ProvisionVpsDto) => api.post<Vps>("/vps", data),
  control: (id: string, data: VpsActionDto) => api.post(`/vps/${id}/control`, data),
  reinstall: (id: string, data: ReinstallVpsDto) => api.post(`/vps/${id}/reinstall`, data),
  renew: (id: string) => api.post(`/vps/${id}/renew`),
  delete: (id: string) => api.delete(`/vps/${id}`),
};
