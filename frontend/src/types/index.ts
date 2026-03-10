// ============================================================
// Backend API Types - Auto-mapped from backend DTOs & Prisma
// ============================================================

// Enums
export type Role = "USER" | "ADMIN";
export type AuthProvider = "GOOGLE" | "DISCORD" | "EMAIL";
export type ServerStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED" | "DELETED" | "INSTALLING";
export type PlanType = "FREE" | "PREMIUM" | "CUSTOM";
export type NodeAssignMode = "ADMIN_LOCKED" | "USER_SELECTABLE" | "DYNAMIC";
export type PaymentGateway = "RAZORPAY" | "CASHFREE" | "UPI" | "BALANCE";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type UpiStatus = "PENDING" | "APPROVED" | "REJECTED";
export type VpsStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED" | "PROVISIONING";
export type PowerSignal = "start" | "stop" | "restart" | "kill";
export type VpsAction = "start" | "stop" | "restart" | "shutdown";
export type ScheduleAction = "command" | "power" | "backup";

// User
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: AuthProvider;
  role: Role;
  emailVerified: boolean;
  pterodactylId?: number;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
  balance?: { amount: number };
  credits?: { amount: number };
  linkedAccounts?: LinkedAccount[];
}

export interface LinkedAccount {
  provider: AuthProvider;
  providerId: string;
  email?: string;
}

// Server
export interface Server {
  id: string;
  userId: string;
  planId?: string;
  name: string;
  pteroServerId?: number;
  pteroUuid?: string;
  pteroIdentifier?: string;
  status: ServerStatus;
  expiresAt?: string;
  isFreeServer: boolean;
  ram: number;
  cpu: number;
  disk: number;
  backups: number;
  ports: number;
  databases: number;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
  resources?: ServerResources;
}

export interface ServerResources {
  current_state: string;
  is_suspended: boolean;
  resources: {
    memory_bytes: number;
    cpu_absolute: number;
    disk_bytes: number;
    network_rx_bytes: number;
    network_tx_bytes: number;
    uptime: number;
  };
}

// Plan
export interface Plan {
  id: string;
  name: string;
  description?: string;
  type: PlanType;
  ram: number;
  cpu: number;
  disk: number;
  backups: number;
  ports: number;
  databases: number;
  pricePerMonth: number;
  pricePerGb: number;
  nodeId?: number;
  eggId?: number;
  nodeAssignMode: NodeAssignMode;
  isActive: boolean;
  sortOrder: number;
  minRam?: number;
  maxRam?: number;
  minCpu?: number;
  maxCpu?: number;
  minDisk?: number;
  maxDisk?: number;
  maxBackups?: number;
  maxPorts?: number;
  renewalPeriodDays: number;
  renewalCost: number;
  createdAt: string;
  updatedAt: string;
}

// Payment
export interface Payment {
  id: string;
  userId: string;
  serverId?: string;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description?: string;
  relatedId?: string;
  createdAt: string;
}

// VPS
export interface VpsPlan {
  id: string;
  datalixPlanName: string;
  displayName: string;
  description?: string;
  ram: number;
  cpu: number;
  disk: number;
  bandwidth: number;
  costPrice: number;
  sellPrice: number;
  isActive: boolean;
  sortOrder: number;
}

export interface Vps {
  id: string;
  userId: string;
  vpsPlanId?: string;
  datalixId?: string;
  planName?: string;
  status: VpsStatus;
  ip?: string;
  hostname?: string;
  os?: string;
  ram?: number;
  cpu?: number;
  disk?: number;
  bandwidth?: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  vpsPlan?: VpsPlan;
}

// Credits
export interface CreditConfig {
  enabled: boolean;
  amountPerEarn: number;
  cooldownMinutes: number;
  maxDailyEarns: number;
}

// UPI Payment
export interface UpiPayment {
  id: string;
  userId: string;
  utr: string;
  amount: number;
  status: UpiStatus;
  approvedBy?: string;
  serverId?: string;
  planId?: string;
  createdAt: string;
  updatedAt: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  user?: { name: string; email: string };
}

// File Manager
export interface FileItem {
  name: string;
  mode: string;
  mode_bits: string;
  size: number;
  is_file: boolean;
  is_symlink: boolean;
  mimetype: string;
  created_at: string;
  modified_at: string;
}

// Pterodactyl-specific types
export interface PteroEgg {
  id: number;
  name: string;
  description?: string;
  nest_id: number;
  docker_images: Record<string, string>;
  startup: string;
}

export interface PteroNode {
  id: number;
  name: string;
  location_id: number;
  memory: number;
  memory_overallocate: number;
  disk: number;
  disk_overallocate: number;
  allocated_resources?: {
    memory: number;
    disk: number;
  };
}

export interface PteroDatabase {
  id: string;
  name: string;
  host: { address: string; port: number };
  username: string;
  connections_from: string;
  max_connections: number;
  password?: string;
}

export interface PteroBackup {
  uuid: string;
  name: string;
  ignored_files: string[];
  sha256_hash?: string;
  bytes: number;
  is_successful: boolean;
  is_locked: boolean;
  created_at: string;
  completed_at?: string;
}

export interface PteroSchedule {
  id: number;
  name: string;
  is_active: boolean;
  is_processing: boolean;
  cron: {
    minute: string;
    hour: string;
    day_of_week: string;
    day_of_month: string;
    month: string;
  };
  last_run_at?: string;
  next_run_at: string;
  tasks: PteroScheduleTask[];
  created_at: string;
  updated_at: string;
}

export interface PteroScheduleTask {
  id: number;
  sequence_id: number;
  action: ScheduleAction;
  payload: string;
  time_offset: number;
  is_queued: boolean;
  continue_on_failure: boolean;
  created_at: string;
  updated_at: string;
}

export interface NetworkAllocation {
  id: number;
  ip: string;
  ip_alias?: string;
  port: number;
  notes?: string;
  is_default: boolean;
}

export interface StartupVariable {
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  server_value: string;
  is_editable: boolean;
  rules: string;
}

// Plugin types
export interface InstalledPlugin {
  name: string;
  fileName: string;
  version?: string;
  source?: string;
  sourceId?: string;
  updateAvailable?: boolean;
}

// Stats
export interface PublicStats {
  activeServers: number;
  totalUsers: number;
  totalServers: number;
  uptime: string;
}

// Admin Dashboard
export interface AdminDashboard {
  totalUsers: number;
  totalServers: number;
  activeServers: number;
  suspendedServers: number;
  totalRevenue: number;
  revenueToday: number;
  newUsersToday: number;
  recentPayments: Payment[];
  recentUsers: User[];
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Gateways config
export interface GatewaysConfig {
  razorpay: boolean;
  cashfree: boolean;
  upi: boolean;
  balance: boolean;
  upiId?: string;
}

// Price calculation
export interface PriceCalculation {
  price: number;
  totalPrice: number;
  pricePerMonth: number;
  ram: number;
  cpu: number;
  disk: number;
}
