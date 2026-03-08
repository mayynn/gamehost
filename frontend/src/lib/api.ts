import axios from 'axios';

// Use empty string = relative URLs (go through Nginx on same origin)
// Override with NEXT_PUBLIC_API_URL only if you need a different backend host
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

// Global response interceptor — redirect to login on 401 (expired session)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response?.status === 401 &&
            typeof window !== 'undefined' &&
            !window.location.pathname.startsWith('/login') &&
            !window.location.pathname.startsWith('/signup') &&
            !window.location.pathname.startsWith('/forgot-password') &&
            !window.location.pathname.startsWith('/reset-password') &&
            !error.config?.url?.includes('/auth/me')
        ) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

// Auth
export const authApi = {
    getMe: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout'),
    googleUrl: `${API_URL}/api/auth/google`,
    discordUrl: `${API_URL}/api/auth/discord`,
    register: (data: { email: string; name: string; password: string }) => api.post('/auth/register', data),
    login: (data: { email: string; password: string }) => api.post('/auth/login', data),
    forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
    resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
    verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`),
};

// Servers
export const serversApi = {
    list: () => api.get('/servers'),
    get: (id: string) => api.get(`/servers/${id}`),
    create: (data: any) => api.post('/servers', data),
    delete: (id: string) => api.delete(`/servers/${id}`),
    power: (id: string, signal: string) => api.post(`/servers/${id}/power`, { signal }),
    console: (id: string) => api.get(`/servers/${id}/console`),
    command: (id: string, cmd: string) => api.post(`/servers/${id}/command`, { command: cmd }),
    listFiles: (id: string, dir = '/') => api.get(`/servers/${id}/files?dir=${encodeURIComponent(dir)}`),
    readFile: (id: string, file: string) => api.get(`/servers/${id}/files/contents?file=${encodeURIComponent(file)}`),
    writeFile: (id: string, file: string, content: string) => api.post(`/servers/${id}/files/write`, { file, content }),
    deleteFiles: (id: string, root: string, files: string[]) => api.post(`/servers/${id}/files/delete`, { root, files }),
    renameFile: (id: string, root: string, from: string, to: string) => api.put(`/servers/${id}/files/rename`, { root, from, to }),
    createFolder: (id: string, root: string, name: string) => api.post(`/servers/${id}/files/folder`, { root, name }),
    uploadUrl: (id: string) => api.get(`/servers/${id}/files/upload`),
    backups: (id: string) => api.get(`/servers/${id}/backups`),
    createBackup: (id: string) => api.post(`/servers/${id}/backups`),
    deleteBackup: (id: string, backupId: string) => api.delete(`/servers/${id}/backups/${backupId}`),
    downloadBackup: (id: string, backupId: string) => api.get(`/servers/${id}/backups/${backupId}/download`),
    databases: (id: string) => api.get(`/servers/${id}/databases`),
    createDb: (id: string, name: string) => api.post(`/servers/${id}/databases`, { name }),
    deleteDb: (id: string, dbId: string) => api.delete(`/servers/${id}/databases/${dbId}`),
    network: (id: string) => api.get(`/servers/${id}/network`),
    startup: (id: string) => api.get(`/servers/${id}/startup`),
    updateStartup: (id: string, key: string, value: string) => api.post(`/servers/${id}/startup`, { key, value }),
    reinstall: (id: string) => api.post(`/servers/${id}/reinstall`),
    renewalCost: (id: string) => api.get(`/servers/${id}/renewal-cost`),
    renew: (id: string) => api.post(`/servers/${id}/renew`),
    // File operations
    compressFiles: (id: string, root: string, files: string[]) => api.post(`/servers/${id}/files/compress`, { root, files }),
    decompressFile: (id: string, root: string, file: string) => api.post(`/servers/${id}/files/decompress`, { root, file }),
    downloadFile: (id: string, file: string) => api.get(`/servers/${id}/files/download?file=${encodeURIComponent(file)}`),
    copyFile: (id: string, location: string) => api.post(`/servers/${id}/files/copy`, { location }),
    chmodFiles: (id: string, root: string, files: { file: string; mode: string }[]) => api.post(`/servers/${id}/files/chmod`, { root, files }),
    pullFile: (id: string, url: string, directory: string, filename?: string) => api.post(`/servers/${id}/files/pull`, { url, directory, filename }),
    // Backup operations
    restoreBackup: (id: string, backupId: string, truncate = false) => api.post(`/servers/${id}/backups/${backupId}/restore`, { truncate }),
    toggleBackupLock: (id: string, backupId: string) => api.post(`/servers/${id}/backups/${backupId}/lock`),
    // Database operations
    rotateDatabasePassword: (id: string, dbId: string) => api.post(`/servers/${id}/databases/${dbId}/rotate-password`),
    // Server settings
    renameServer: (id: string, name: string) => api.post(`/servers/${id}/settings/rename`, { name }),
    changeDockerImage: (id: string, docker_image: string) => api.put(`/servers/${id}/settings/docker-image`, { docker_image }),
    // Schedules
    schedules: (id: string) => api.get(`/servers/${id}/schedules`),
    getSchedule: (id: string, scheduleId: number) => api.get(`/servers/${id}/schedules/${scheduleId}`),
    createSchedule: (id: string, data: any) => api.post(`/servers/${id}/schedules`, data),
    updateSchedule: (id: string, scheduleId: number, data: any) => api.post(`/servers/${id}/schedules/${scheduleId}`, data),
    deleteSchedule: (id: string, scheduleId: number) => api.delete(`/servers/${id}/schedules/${scheduleId}`),
    executeSchedule: (id: string, scheduleId: number) => api.post(`/servers/${id}/schedules/${scheduleId}/execute`),
    createTask: (id: string, scheduleId: number, data: any) => api.post(`/servers/${id}/schedules/${scheduleId}/tasks`, data),
    updateTask: (id: string, scheduleId: number, taskId: number, data: any) => api.post(`/servers/${id}/schedules/${scheduleId}/tasks/${taskId}`, data),
    deleteTask: (id: string, scheduleId: number, taskId: number) => api.delete(`/servers/${id}/schedules/${scheduleId}/tasks/${taskId}`),
    // Activity log
    activity: (id: string) => api.get(`/servers/${id}/activity`),
};

// Public stats (no auth)
export const statsApi = {
    public: () => api.get('/stats'),
};

// Plans
export const plansApi = {
    list: () => api.get('/plans'),
    get: (id: string) => api.get(`/plans/${id}`),
    eggs: () => api.get('/plans/eggs'),
    nodes: () => api.get('/plans/nodes'),
    calculate: (data: any) => api.post('/plans/calculate', data),
};

// Billing
export const billingApi = {
    gateways: () => api.get('/billing/gateways'),
    balance: () => api.get('/billing/balance'),
    addBalance: (amount: number) => api.post('/billing/balance/add', { amount }),
    payments: () => api.get('/billing/payments'),
    razorpayCreate: (amount: number, serverId?: string) => api.post('/billing/razorpay/create', { amount, serverId }),
    razorpayVerify: (data: any) => api.post('/billing/razorpay/verify', data),
    cashfreeCreate: (amount: number, serverId?: string) => api.post('/billing/cashfree/create', { amount, serverId }),
    cashfreeVerify: (orderId: string) => api.post('/billing/cashfree/verify', { orderId }),
    upiSubmit: (data: any) => api.post('/billing/upi/submit', data),
    balancePay: (amount: number, serverId?: string) => api.post('/billing/balance/pay', { amount, serverId }),
    transactions: (page = 1) => api.get(`/billing/balance/transactions?page=${page}`),
};

// Credits
export const creditsApi = {
    get: () => api.get('/credits'),
    config: () => api.get('/credits/config'),
    earn: () => api.post('/credits/earn'),
};

// Plugins
export const pluginsApi = {
    detect: (uuid: string) => api.get(`/plugins/${uuid}/detect`),
    installed: (uuid: string) => api.get(`/plugins/${uuid}/installed`),
    checkUpdates: (uuid: string) => api.get(`/plugins/${uuid}/check-updates`),
    updateOne: (uuid: string, fileName: string) => api.post(`/plugins/${uuid}/update-one`, { fileName }),
    updateAll: (uuid: string, source?: 'modrinth' | 'spiget') => api.post(`/plugins/${uuid}/update-all`, { source }),
    remove: (uuid: string, file: string) => api.delete(`/plugins/${uuid}/remove/${encodeURIComponent(file)}`),
    modrinthSearch: (
        q: string,
        opts?: {
            limit?: number;
            offset?: number;
            projectType?: string;
            loaders?: string[];
            categories?: string[];
            gameVersions?: string[];
            index?: string;
        },
    ) => {
        const limit = opts?.limit ?? 20;
        const offset = opts?.offset ?? 0;
        const projectType = opts?.projectType ?? 'plugin';
        let url = `/plugins/modrinth/search?query=${encodeURIComponent(q || '')}&limit=${limit}&offset=${offset}&project_type=${encodeURIComponent(projectType)}`;
        if (opts?.loaders && opts.loaders.length > 0) url += `&loaders=${encodeURIComponent(JSON.stringify(opts.loaders))}`;
        if (opts?.categories && opts.categories.length > 0) url += `&categories=${encodeURIComponent(JSON.stringify(opts.categories))}`;
        if (opts?.gameVersions && opts.gameVersions.length > 0) url += `&game_versions=${encodeURIComponent(JSON.stringify(opts.gameVersions))}`;
        if (opts?.index) url += `&index=${encodeURIComponent(opts.index)}`;
        return api.get(url);
    },
    modrinthTags: () => api.get('/plugins/modrinth/tags'),
    modrinthProject: (id: string) => api.get(`/plugins/modrinth/project/${id}`),
    modrinthVersions: (id: string, loaders?: string[], gameVersions?: string[]) => {
        const params = new URLSearchParams();
        if (loaders) params.set('loaders', JSON.stringify(loaders));
        if (gameVersions) params.set('game_versions', JSON.stringify(gameVersions));
        return api.get(`/plugins/modrinth/project/${id}/versions?${params}`);
    },
    modrinthInstall: (uuid: string, projectId: string, versionId: string) =>
        api.post(`/plugins/${uuid}/modrinth/install`, { projectId, versionId }),
    spigetSearch: (q: string, page = 1, categoryId?: number, size = 20, sort = '-downloads') =>
        api.get(`/plugins/spiget/search?query=${encodeURIComponent(q)}&page=${page}&size=${size}&sort=${encodeURIComponent(sort)}${categoryId ? `&categoryId=${categoryId}` : ''}`),
    spigetCategories: () => api.get('/plugins/spiget/categories'),
    spigetCategoryResources: (categoryId: number, page = 1, size = 20) =>
        api.get(`/plugins/spiget/categories/${categoryId}/resources?page=${page}&size=${size}`),
    spigetResource: (id: number) => api.get(`/plugins/spiget/resource/${id}`),
    spigetVersions: (id: number) => api.get(`/plugins/spiget/resource/${id}/versions`),
    spigetPopular: (page = 1, size = 20) => api.get(`/plugins/spiget/popular?page=${page}&size=${size}`),
    spigetNew: (page = 1, size = 20) => api.get(`/plugins/spiget/new?page=${page}&size=${size}`),
    spigetUpdated: (page = 1, size = 20) => api.get(`/plugins/spiget/updated?page=${page}&size=${size}`),
    spigetInstall: (uuid: string, resourceId: number) =>
        api.post(`/plugins/${uuid}/spiget/install`, { resourceId }),
    spigetInstallVersion: (uuid: string, resourceId: number, versionId: number) =>
        api.post(`/plugins/${uuid}/spiget/install-version`, { resourceId, versionId }),
};

// Players
export const playersApi = {
    detect: (uuid: string) => api.get(`/players/${uuid}/detect`),
    online: (uuid: string) => api.get(`/players/${uuid}/online`),
    whitelist: (uuid: string) => api.get(`/players/${uuid}/whitelist`),
    addWhitelist: (uuid: string, player: string) => api.post(`/players/${uuid}/whitelist`, { player }),
    removeWhitelist: (uuid: string, player: string) => api.delete(`/players/${uuid}/whitelist/${encodeURIComponent(player)}`),
    banned: (uuid: string) => api.get(`/players/${uuid}/banned`),
    ban: (uuid: string, player: string, reason?: string) => api.post(`/players/${uuid}/ban`, { player, reason }),
    unban: (uuid: string, player: string) => api.post(`/players/${uuid}/unban`, { player }),
    bannedIps: (uuid: string) => api.get(`/players/${uuid}/banned-ips`),
    banIp: (uuid: string, ip: string, reason?: string) => api.post(`/players/${uuid}/ban-ip`, { ip, reason }),
    unbanIp: (uuid: string, ip: string) => api.post(`/players/${uuid}/unban-ip`, { ip }),
    playerData: (uuid: string) => api.get(`/players/${uuid}/playerdata`),
    deletePlayerData: (uuid: string, identifier: string) => api.delete(`/players/${uuid}/playerdata/${encodeURIComponent(identifier)}`),
    ops: (uuid: string) => api.get(`/players/${uuid}/ops`),
    op: (uuid: string, player: string) => api.post(`/players/${uuid}/op`, { player }),
    deop: (uuid: string, player: string) => api.post(`/players/${uuid}/deop`, { player }),
    kick: (uuid: string, player: string, reason?: string) => api.post(`/players/${uuid}/kick`, { player, reason }),
};

// VPS
export const vpsApi = {
    plans: () => api.get('/vps/plans'),
    planOs: (planId: string) => api.get(`/vps/plans/${planId}/os`),
    list: () => api.get('/vps'),
    create: (data: any) => api.post('/vps', data),
    get: (id: string) => api.get(`/vps/${id}`),
    control: (id: string, action: string) => api.post(`/vps/${id}/control`, { action }),
    reinstall: (id: string, os: string) => api.post(`/vps/${id}/reinstall`, { os }),
    renew: (id: string) => api.post(`/vps/${id}/renew`),
    terminate: (id: string) => api.delete(`/vps/${id}`),
};

// Users
export const usersApi = {
    profile: () => api.get('/users/profile'),
    updateProfile: (data: { name?: string }) => api.patch('/users/profile', data),
    changePassword: (data: { currentPassword?: string; newPassword: string }) =>
        api.post('/users/change-password', data),
};

// Admin
export const adminApi = {
    dashboard: () => api.get('/admin/dashboard'),
    users: (page = 1) => api.get(`/admin/users?page=${page}`),
    userDetails: (id: string) => api.get(`/admin/users/${id}`),
    setRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
    deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
    servers: (page = 1) => api.get(`/admin/servers?page=${page}`),
    suspendServer: (id: string) => api.post(`/admin/servers/${id}/suspend`),
    unsuspendServer: (id: string) => api.post(`/admin/servers/${id}/unsuspend`),
    deleteServer: (id: string) => api.delete(`/admin/servers/${id}`),
    createPlan: (data: any) => api.post('/admin/plans', data),
    updatePlan: (id: string, data: any) => api.patch(`/admin/plans/${id}`, data),
    deletePlan: (id: string) => api.delete(`/admin/plans/${id}`),
    pendingUpi: () => api.get('/admin/upi/pending'),
    approveUpi: (id: string) => api.post(`/admin/upi/${id}/approve`),
    rejectUpi: (id: string) => api.post(`/admin/upi/${id}/reject`),
    settings: () => api.get('/admin/settings'),
    updateSettings: (data: any) => api.patch('/admin/settings', data),
    auditLogs: (page = 1) => api.get(`/admin/audit?page=${page}`),
    nodes: () => api.get('/admin/nodes'),
    eggs: () => api.get('/admin/eggs'),
    // Alt detection
    altAccounts: (page = 1) => api.get(`/admin/alts?page=${page}`),
    userAlts: (id: string) => api.get(`/admin/users/${id}/alts`),
    userLinkedAccounts: (id: string) => api.get(`/admin/users/${id}/linked-accounts`),
    deleteAlts: (userIds: string[]) => api.post('/admin/alts/delete', { userIds }),
    // VPS plan management
    vpsPlans: () => api.get('/admin/vps/plans'),
    syncVpsPlans: () => api.post('/admin/vps/plans/sync'),
    updateVpsPlan: (id: string, data: any) => api.patch(`/admin/vps/plans/${id}`, data),
    deleteVpsPlan: (id: string) => api.delete(`/admin/vps/plans/${id}`),
    vpsStats: () => api.get('/admin/vps/stats'),
};

// Public settings (no auth required)
export const settingsApi = {
    public: () => api.get('/settings/public'),
};
