import api from "./client";
import type { AdminDashboard, User, Server, Plan, AuditLog, UpiPayment, VpsPlan, PaginatedResponse } from "@/types";
import type { CreatePlanDto, UpdatePlanDto, SetRoleDto, UpdateVpsPlanDto, DeleteAltsDto } from "@/types/dto";

export const adminApi = {
  getDashboard: () => api.get<AdminDashboard>("/admin/dashboard"),

  // Users
  getUsers: (page = 1) => api.get<PaginatedResponse<User>>("/admin/users", { params: { page } }),
  getUser: (id: string) => api.get<User>(`/admin/users/${id}`),
  setRole: (id: string, data: SetRoleDto) => api.patch(`/admin/users/${id}/role`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  // Servers
  getServers: (page = 1) => api.get<PaginatedResponse<Server>>("/admin/servers", { params: { page } }),
  suspendServer: (id: string) => api.post(`/admin/servers/${id}/suspend`),
  unsuspendServer: (id: string) => api.post(`/admin/servers/${id}/unsuspend`),
  deleteServer: (id: string) => api.delete(`/admin/servers/${id}`),

  // Plans
  createPlan: (data: CreatePlanDto) => api.post<Plan>("/admin/plans", data),
  updatePlan: (id: string, data: UpdatePlanDto) => api.patch<Plan>(`/admin/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/admin/plans/${id}`),

  // UPI
  getPendingUpi: () => api.get<UpiPayment[]>("/admin/upi/pending"),
  approveUpi: (id: string) => api.post(`/admin/upi/${id}/approve`),
  rejectUpi: (id: string) => api.post(`/admin/upi/${id}/reject`),

  // Settings
  getSettings: () => api.get<Record<string, string>>("/admin/settings"),
  updateSettings: (data: Record<string, string>) => api.patch("/admin/settings", data),

  // Audit
  getAuditLogs: (page = 1) => api.get<PaginatedResponse<AuditLog>>("/admin/audit", { params: { page } }),

  // Nodes & Eggs
  getNodes: () => api.get("/admin/nodes"),
  getEggs: () => api.get("/admin/eggs"),

  // Alt detection
  getAlts: (page = 1) => api.get("/admin/alts", { params: { page } }),
  getUserAlts: (id: string) => api.get(`/admin/users/${id}/alts`),
  getUserLinkedAccounts: (id: string) => api.get(`/admin/users/${id}/linked-accounts`),
  deleteAlts: (data: DeleteAltsDto) => api.post("/admin/alts/delete", data),

  // VPS Plans
  getVpsPlans: () => api.get<VpsPlan[]>("/admin/vps/plans"),
  syncVpsPlans: () => api.post("/admin/vps/plans/sync"),
  updateVpsPlan: (id: string, data: UpdateVpsPlanDto) => api.patch(`/admin/vps/plans/${id}`, data),
  deleteVpsPlan: (id: string) => api.delete(`/admin/vps/plans/${id}`),
  getVpsStats: () => api.get("/admin/vps/stats"),
};
