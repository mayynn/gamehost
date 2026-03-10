import api from "./client";
import type { InstalledPlugin } from "@/types";
import type { InstallModrinthDto, InstallSpigetDto, UpdatePluginDto, UpdateAllPluginsDto } from "@/types/dto";

export const playersApi = {
  detect: (uuid: string) => api.get(`/players/${uuid}/detect`),
  getOnline: (uuid: string) => api.get(`/players/${uuid}/online`),
  getWhitelist: (uuid: string) => api.get(`/players/${uuid}/whitelist`),
  addWhitelist: (uuid: string, data: { player: string }) => api.post(`/players/${uuid}/whitelist`, data),
  removeWhitelist: (uuid: string, player: string) => api.delete(`/players/${uuid}/whitelist/${player}`),
  getBanned: (uuid: string) => api.get(`/players/${uuid}/banned`),
  ban: (uuid: string, data: { player: string; reason?: string }) => api.post(`/players/${uuid}/ban`, data),
  unban: (uuid: string, data: { player: string }) => api.post(`/players/${uuid}/unban`, data),
  getBannedIps: (uuid: string) => api.get(`/players/${uuid}/banned-ips`),
  banIp: (uuid: string, data: { ip: string; reason?: string }) => api.post(`/players/${uuid}/ban-ip`, data),
  unbanIp: (uuid: string, data: { ip: string }) => api.post(`/players/${uuid}/unban-ip`, data),
  getOps: (uuid: string) => api.get(`/players/${uuid}/ops`),
  op: (uuid: string, data: { player: string }) => api.post(`/players/${uuid}/op`, data),
  deop: (uuid: string, data: { player: string }) => api.post(`/players/${uuid}/deop`, data),
  kick: (uuid: string, data: { player: string; reason?: string }) => api.post(`/players/${uuid}/kick`, data),
};

export const pluginsApi = {
  detect: (serverUuid: string) => api.get(`/plugins/${serverUuid}/detect`),
  getInstalled: (serverUuid: string) => api.get<InstalledPlugin[]>(`/plugins/${serverUuid}/installed`),
  checkUpdates: (serverUuid: string) => api.get(`/plugins/${serverUuid}/check-updates`),
  remove: (serverUuid: string, fileName: string) => api.delete(`/plugins/${serverUuid}/remove/${fileName}`),
  installModrinth: (serverUuid: string, data: InstallModrinthDto) => api.post(`/plugins/${serverUuid}/modrinth/install`, data),
  installSpiget: (serverUuid: string, data: InstallSpigetDto) => api.post(`/plugins/${serverUuid}/spiget/install`, data),
  updateOne: (serverUuid: string, data: UpdatePluginDto) => api.post(`/plugins/${serverUuid}/update-one`, data),
  updateAll: (serverUuid: string, data?: UpdateAllPluginsDto) => api.post(`/plugins/${serverUuid}/update-all`, data),

  // Public Modrinth APIs
  modrinthSearch: (query: string) => api.get(`/plugins/modrinth/search`, { params: { query } }),
  modrinthTags: () => api.get(`/plugins/modrinth/tags`),
  modrinthProject: (id: string) => api.get(`/plugins/modrinth/project/${id}`),
  modrinthVersions: (id: string) => api.get(`/plugins/modrinth/project/${id}/versions`),

  // Public Spiget APIs
  spigetSearch: (query: string) => api.get(`/plugins/spiget/search`, { params: { query } }),
  spigetPopular: () => api.get(`/plugins/spiget/popular`),
  spigetResource: (id: number) => api.get(`/plugins/spiget/resource/${id}`),
  spigetResourceVersions: (id: number) => api.get(`/plugins/spiget/resource/${id}/versions`),
};
