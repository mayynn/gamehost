import { Role } from '@prisma/client';

// ─── Authenticated User ──────────────────────────────────
// Represents the user object attached to request by JwtAuthGuard.

export interface AuthenticatedUser {
    id: string;
    email: string;
    name: string;
    role: Role;
    avatar?: string | null;
    provider: string;
    emailVerified: boolean;
    pterodactylId?: number | null;
    lastLoginAt?: Date | null;
    lastLoginIp?: string | null;
    createdAt: Date;
    updatedAt: Date;
    balance?: { amount: number } | null;
    credits?: { amount: number } | null;
    linkedAccounts?: Array<{ provider: string; providerId: string; email: string }>;
}

// ─── JWT Payload ─────────────────────────────────────────

export interface JwtPayload {
    sub: string;
    email: string;
    role: Role;
    iat?: number;
    exp?: number;
}

// ─── Paginated Response ──────────────────────────────────

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    totalPages: number;
}

// ─── Server Price Calculation ────────────────────────────

export interface ServerPriceInput {
    ram: number;
    cpu: number;
    disk: number;
    pricePerGb: number;
}

// ─── Renewal Info ────────────────────────────────────────

export interface RenewalInfo {
    price: number;
    renewalDays: number;
    expiresAt: Date | null;
    serverName: string;
    isFreeServer: boolean;
}
