import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// Auth
export const authApi = {
    getMe: () => api.get('/auth/me'),
    logout: () => api.get('/auth/logout'),
    googleUrl: `${API_URL}/api/auth/google`,
    discordUrl: `${API_URL}/api/auth/discord`,
};

// Servers
export const serversApi = {
    list: () => api.get('/servers'),
    get: (id: string) => api.get(`/servers/${id}`),
    create: (data: any) => api.post('/servers', data),
    power: (id: string, signal: string) => api.post(`/servers/${id}/power`, { signal }),
    console: (id: string) => api.get(`/servers/${id}/console`),
    command: (id: string, cmd: string) => api.post(`/servers/${id}/command`, { command: cmd }),
    listFiles: (id: string, dir = '/') => api.get(`/servers/${id}/files?dir=${encodeURIComponent(dir)}`),
    readFile: (id: string, file: string) => api.get(`/servers/${id}/files/contents?file=${encodeURIComponent(file)}`),
    writeFile: (id: string, file: string, content: string) => api.post(`/servers/${id}/files/write`, { file, content }),
    deleteFiles: (id: string, root: string, files: string[]) => api.post(`/servers/${id}/files/delete`, { root, files }),
    backups: (id: string) => api.get(`/servers/${id}/backups`),
    createBackup: (id: string) => api.post(`/servers/${id}/backups`),
    databases: (id: string) => api.get(`/servers/${id}/databases`),
    createDb: (id: string, name: string) => api.post(`/servers/${id}/databases`, { name }),
    network: (id: string) => api.get(`/servers/${id}/network`),
    startup: (id: string) => api.get(`/servers/${id}/startup`),
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
    remove: (uuid: string, file: string) => api.delete(`/plugins/${uuid}/remove/${file}`),
    modrinthSearch: (q: string) => api.get(`/plugins/modrinth/search?query=${encodeURIComponent(q)}`),
    modrinthProject: (id: string) => api.get(`/plugins/modrinth/project/${id}`),
    modrinthVersions: (id: string) => api.get(`/plugins/modrinth/project/${id}/versions`),
    modrinthInstall: (uuid: string, projectId: string, versionId: string) =>
        api.post(`/plugins/${uuid}/modrinth/install`, { projectId, versionId }),
    spigetSearch: (q: string) => api.get(`/plugins/spiget/search?query=${encodeURIComponent(q)}`),
    spigetInstall: (uuid: string, resourceId: number) =>
        api.post(`/plugins/${uuid}/spiget/install`, { resourceId }),
};

// Players
export const playersApi = {
    detect: (uuid: string) => api.get(`/players/${uuid}/detect`),
    whitelist: (uuid: string) => api.get(`/players/${uuid}/whitelist`),
    addWhitelist: (uuid: string, player: string) => api.post(`/players/${uuid}/whitelist`, { player }),
    removeWhitelist: (uuid: string, player: string) => api.delete(`/players/${uuid}/whitelist/${player}`),
    banned: (uuid: string) => api.get(`/players/${uuid}/banned`),
    ban: (uuid: string, player: string, reason?: string) => api.post(`/players/${uuid}/ban`, { player, reason }),
    unban: (uuid: string, player: string) => api.post(`/players/${uuid}/unban`, { player }),
    ops: (uuid: string) => api.get(`/players/${uuid}/ops`),
    op: (uuid: string, player: string) => api.post(`/players/${uuid}/op`, { player }),
    deop: (uuid: string, player: string) => api.post(`/players/${uuid}/deop`, { player }),
    kick: (uuid: string, player: string) => api.post(`/players/${uuid}/kick`, { player }),
};

// VPS
export const vpsApi = {
    plans: () => api.get('/vps/plans'),
    list: () => api.get('/vps'),
    provision: (data: any) => api.post('/vps', data),
    create: (data: any) => api.post('/vps', data),
    get: (id: string) => api.get(`/vps/${id}`),
    control: (id: string, action: string) => api.post(`/vps/${id}/control`, { action }),
    power: (id: string, action: string) => api.post(`/vps/${id}/control`, { action }),
    terminate: (id: string) => api.delete(`/vps/${id}`),
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
};
