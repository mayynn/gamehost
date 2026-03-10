// Auth DTOs
export interface RegisterDto {
  email: string;
  name: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ResendVerificationDto {
  email: string;
}

// User DTOs
export interface UpdateProfileDto {
  name?: string;
}

export interface ChangePasswordDto {
  currentPassword?: string;
  newPassword: string;
}

// Server DTOs
export interface CreateServerDto {
  name: string;
  planId: string;
  eggId: number;
  nestId: number;
  nodeId?: number;
  ram?: number;
  cpu?: number;
  disk?: number;
  environment?: Record<string, string>;
}

export interface PowerActionDto {
  signal: "start" | "stop" | "restart" | "kill";
}

export interface SendCommandDto {
  command: string;
}

export interface RenameServerDto {
  name: string;
}

export interface ChangeDockerImageDto {
  docker_image: string;
}

export interface UpdateStartupDto {
  key: string;
  value: string;
}

export interface CreateDatabaseDto {
  name: string;
}

export interface WriteFileDto {
  file: string;
  content: string;
}

export interface DeleteFilesDto {
  root: string;
  files: string[];
}

export interface RenameFileDto {
  root: string;
  from: string;
  to: string;
}

export interface CreateDirectoryDto {
  root: string;
  name: string;
}

export interface CompressFilesDto {
  root: string;
  files: string[];
}

export interface DecompressFileDto {
  root: string;
  file: string;
}

export interface CopyFileDto {
  location: string;
}

export interface PullFileDto {
  url: string;
  directory: string;
  filename?: string;
}

export interface ChmodFilesDto {
  root: string;
  files: { file: string; mode: string }[];
}

export interface RestoreBackupDto {
  truncate?: boolean;
}

export interface CreateScheduleDto {
  name: string;
  is_active: boolean;
  minute: string;
  hour: string;
  day_of_week: string;
  day_of_month: string;
  month: string;
}

export interface CreateScheduleTaskDto {
  action: "command" | "power" | "backup";
  payload: string;
  time_offset: number;
  continue_on_failure?: boolean;
}

// Billing DTOs
export interface CreatePaymentDto {
  amount: number;
  serverId?: string;
}

export interface SubmitUpiDto {
  utr: string;
  amount: number;
  serverId?: string;
  planId?: string;
}

export interface AddBalanceDto {
  amount: number;
  userId?: string;
}

export interface VerifyRazorpayDto {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyCashfreeDto {
  orderId: string;
}

// Plan DTOs
export interface CalculatePriceDto {
  planId: string;
  ram: number;
  cpu: number;
  disk: number;
}

export interface CreatePlanDto {
  name: string;
  description?: string;
  type: "FREE" | "PREMIUM" | "CUSTOM";
  ram: number;
  cpu: number;
  disk: number;
  backups?: number;
  ports?: number;
  databases?: number;
  pricePerMonth?: number;
  pricePerGb?: number;
  nodeId?: number;
  eggId?: number;
  nodeAssignMode?: "DYNAMIC" | "ADMIN_LOCKED" | "USER_SELECTABLE";
  isActive?: boolean;
  sortOrder?: number;
  minRam?: number;
  maxRam?: number;
  minCpu?: number;
  maxCpu?: number;
  minDisk?: number;
  maxDisk?: number;
  maxBackups?: number;
  maxPorts?: number;
  renewalPeriodDays?: number;
  renewalCost?: number;
}

export type UpdatePlanDto = Partial<CreatePlanDto>;

// Player DTOs
export interface PlayerNameDto {
  player: string;
}

export interface BanPlayerDto {
  player: string;
  reason?: string;
}

export interface KickPlayerDto {
  player: string;
  reason?: string;
}

export interface BanIpDto {
  ip: string;
  reason?: string;
}

// Plugin DTOs
export interface InstallModrinthDto {
  projectId: string;
  versionId: string;
}

export interface InstallSpigetDto {
  resourceId: number;
}

export interface UpdatePluginDto {
  fileName: string;
}

export interface UpdateAllPluginsDto {
  source?: "modrinth" | "spiget";
}

// VPS DTOs
export interface ProvisionVpsDto {
  planId: string;
  os: string;
  hostname: string;
}

export interface VpsActionDto {
  action: "start" | "stop" | "restart" | "shutdown";
}

export interface ReinstallVpsDto {
  os: string;
}

// Admin DTOs
export interface SetRoleDto {
  role: "USER" | "ADMIN";
}

export interface UpdateVpsPlanDto {
  displayName?: string;
  description?: string;
  sellPrice?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface DeleteAltsDto {
  userIds: string[];
}
