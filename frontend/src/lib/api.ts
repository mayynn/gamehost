import axios from 'axios';

// Use empty string = relative URLs (go through Nginx on same origin)
// Override with NEXT_PUBLIC_API_URL only if you need a different backend host
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

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
    remove: (uuid: string, file: string) => api.delete(`/plugins/${uuid}/remove/${encodeURIComponent(file)}`),
    modrinthSearch: (q: string, limit = 20, offset = 0, loaders?: string[]) => {
        let url = `/plugins/modrinth/search?query=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&project_type=mod`;
        if (loaders && loaders.length > 0) url += `&loaders=${encodeURIComponent(JSON.stringify(loaders))}`;
        return api.get(url);
    },
    modrinthProject: (id: string) => api.get(`/plugins/modrinth/project/${id}`),
    modrinthVersions: (id: string, loaders?: string[], gameVersions?: string[]) => {
        const params = new URLSearchParams();
        if (loaders) params.set('loaders', JSON.stringify(loaders));
        if (gameVersions) params.set('game_versions', JSON.stringify(gameVersions));
        return api.get(`/plugins/modrinth/project/${id}/versions?${params}`);
    },
    modrinthInstall: (uuid: string, projectId: string, versionId: string) =>
        api.post(`/plugins/${uuid}/modrinth/install`, { projectId, versionId }),
    spigetSearch: (q: string, page = 1) =>
        api.get(`/plugins/spiget/search?query=${encodeURIComponent(q)}&page=${page}`),
    spigetResource: (id: number) => api.get(`/plugins/spiget/resource/${id}`),
    spigetVersions: (id: number) => api.get(`/plugins/spiget/resource/${id}/versions`),
    spigetInstall: (uuid: string, resourceId: number) =>
        api.post(`/plugins/${uuid}/spiget/install`, { resourceId }),
};

// Players
export const playersApi = {
    detect: (uuid: string) => api.get(`/players/${uuid}/detect`),
    online: (uuid: string) => api.get(`/players/${uuid}/online`),
    whitelist: (uuid: string) => api.get(`/players/${uuid}/whitelist`),
    addWhitelist: (uuid: string, player: string) => api.post(`/players/${uuid}/whitelist`, { player }),
    removeWhitelist: (uuid: string, player: string) => api.delete(`/players/${uuid}/whitelist/${player}`),
    banned: (uuid: string) => api.get(`/players/${uuid}/banned`),
    ban: (uuid: string, player: string, reason?: string) => api.post(`/players/${uuid}/ban`, { player, reason }),
    unban: (uuid: string, player: string) => api.post(`/players/${uuid}/unban`, { player }),
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
