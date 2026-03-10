import api from "./client";
import type { Server, FileItem, PteroBackup, PteroDatabase, NetworkAllocation, StartupVariable, PteroSchedule } from "@/types";
import type {
  CreateServerDto,
  PowerActionDto,
  SendCommandDto,
  WriteFileDto,
  DeleteFilesDto,
  RenameFileDto,
  CreateDirectoryDto,
  CompressFilesDto,
  DecompressFileDto,
  CopyFileDto,
  PullFileDto,
  ChmodFilesDto,
  RestoreBackupDto,
  CreateDatabaseDto,
  UpdateStartupDto,
  RenameServerDto,
  ChangeDockerImageDto,
  CreateScheduleDto,
  CreateScheduleTaskDto,
} from "@/types/dto";

export const serversApi = {
  // Server Management
  list: () => api.get<Server[]>("/servers"),
  get: (id: string) => api.get<Server>(`/servers/${id}`),
  create: (data: CreateServerDto) => api.post<Server>("/servers", data),
  delete: (id: string) => api.delete(`/servers/${id}`),

  // Power Control
  power: (id: string, data: PowerActionDto) => api.post(`/servers/${id}/power`, data),
  reinstall: (id: string) => api.post(`/servers/${id}/reinstall`),

  // Console
  getConsole: (id: string) => api.get<{ url: string; token: string }>(`/servers/${id}/console`),
  sendCommand: (id: string, data: SendCommandDto) => api.post(`/servers/${id}/command`, data),

  // Files
  listFiles: (id: string, dir = "/") => api.get<FileItem[]>(`/servers/${id}/files`, { params: { dir } }),
  getFileContents: (id: string, file: string) => api.get<string>(`/servers/${id}/files/contents`, { params: { file } }),
  writeFile: (id: string, data: WriteFileDto) => api.post(`/servers/${id}/files/write`, data),
  deleteFiles: (id: string, data: DeleteFilesDto) => api.post(`/servers/${id}/files/delete`, data),
  renameFile: (id: string, data: RenameFileDto) => api.put(`/servers/${id}/files/rename`, data),
  createDirectory: (id: string, data: CreateDirectoryDto) => api.post(`/servers/${id}/files/folder`, data),
  compressFiles: (id: string, data: CompressFilesDto) => api.post(`/servers/${id}/files/compress`, data),
  decompressFile: (id: string, data: DecompressFileDto) => api.post(`/servers/${id}/files/decompress`, data),
  copyFile: (id: string, data: CopyFileDto) => api.post(`/servers/${id}/files/copy`, data),
  chmodFiles: (id: string, data: ChmodFilesDto) => api.post(`/servers/${id}/files/chmod`, data),
  pullFile: (id: string, data: PullFileDto) => api.post(`/servers/${id}/files/pull`, data),
  getUploadUrl: (id: string) => api.get<{ upload_url: string }>(`/servers/${id}/files/upload`),
  getDownloadUrl: (id: string, file: string) => api.get<{ download_url: string }>(`/servers/${id}/files/download`, { params: { file } }),

  // Backups
  listBackups: (id: string) => api.get<PteroBackup[]>(`/servers/${id}/backups`),
  createBackup: (id: string) => api.post(`/servers/${id}/backups`),
  deleteBackup: (id: string, backupId: string) => api.delete(`/servers/${id}/backups/${backupId}`),
  downloadBackup: (id: string, backupId: string) => api.get<{ download_url: string }>(`/servers/${id}/backups/${backupId}/download`),
  restoreBackup: (id: string, backupId: string, data?: RestoreBackupDto) => api.post(`/servers/${id}/backups/${backupId}/restore`, data),
  lockBackup: (id: string, backupId: string) => api.post(`/servers/${id}/backups/${backupId}/lock`),

  // Databases
  listDatabases: (id: string) => api.get<PteroDatabase[]>(`/servers/${id}/databases`),
  createDatabase: (id: string, data: CreateDatabaseDto) => api.post(`/servers/${id}/databases`, data),
  deleteDatabase: (id: string, dbId: string) => api.delete(`/servers/${id}/databases/${dbId}`),
  rotateDatabasePassword: (id: string, dbId: string) => api.post(`/servers/${id}/databases/${dbId}/rotate-password`),

  // Network & Startup
  getNetwork: (id: string) => api.get<NetworkAllocation[]>(`/servers/${id}/network`),
  getStartup: (id: string) => api.get<{ startup_command: string; docker_image: string; docker_images: Record<string, string>; variables: StartupVariable[] }>(`/servers/${id}/startup`),
  updateStartup: (id: string, data: UpdateStartupDto) => api.post(`/servers/${id}/startup`, data),

  // Schedules
  listSchedules: (id: string) => api.get<PteroSchedule[]>(`/servers/${id}/schedules`),
  getSchedule: (id: string, scheduleId: number) => api.get<PteroSchedule>(`/servers/${id}/schedules/${scheduleId}`),
  createSchedule: (id: string, data: CreateScheduleDto) => api.post(`/servers/${id}/schedules`, data),
  updateSchedule: (id: string, scheduleId: number, data: CreateScheduleDto) => api.post(`/servers/${id}/schedules/${scheduleId}`, data),
  deleteSchedule: (id: string, scheduleId: number) => api.delete(`/servers/${id}/schedules/${scheduleId}`),
  executeSchedule: (id: string, scheduleId: number) => api.post(`/servers/${id}/schedules/${scheduleId}/execute`),
  createScheduleTask: (id: string, scheduleId: number, data: CreateScheduleTaskDto) => api.post(`/servers/${id}/schedules/${scheduleId}/tasks`, data),
  updateScheduleTask: (id: string, scheduleId: number, taskId: number, data: CreateScheduleTaskDto) => api.post(`/servers/${id}/schedules/${scheduleId}/tasks/${taskId}`, data),
  deleteScheduleTask: (id: string, scheduleId: number, taskId: number) => api.delete(`/servers/${id}/schedules/${scheduleId}/tasks/${taskId}`),

  // Settings & Renewal
  rename: (id: string, data: RenameServerDto) => api.post(`/servers/${id}/settings/rename`, data),
  changeDockerImage: (id: string, data: ChangeDockerImageDto) => api.put(`/servers/${id}/settings/docker-image`, data),
  getRenewalCost: (id: string) => api.get<{ price: number; renewalDays: number }>(`/servers/${id}/renewal-cost`),
  renew: (id: string) => api.post(`/servers/${id}/renew`),
  getActivity: (id: string) => api.get(`/servers/${id}/activity`),
};
