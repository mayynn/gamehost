import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
    constructor(private adminService: AdminService) { }

    @Get('dashboard')
    getDashboard() { return this.adminService.getDashboardStats(); }

    // --- Users ---
    @Get('users')
    getUsers(@Query('page') page?: string) {
        return this.adminService.getUsers(parseInt(page || '1'));
    }

    @Get('users/:id')
    getUserDetails(@Param('id') id: string) { return this.adminService.getUserDetails(id); }

    @Patch('users/:id/role')
    setRole(@Param('id') id: string, @Body('role') role: 'USER' | 'ADMIN') {
        return this.adminService.setUserRole(id, role);
    }

    @Delete('users/:id')
    deleteUser(@Param('id') id: string) { return this.adminService.deleteUser(id); }

    // --- Servers ---
    @Get('servers')
    getServers(@Query('page') page?: string) {
        return this.adminService.getAllServers(parseInt(page || '1'));
    }

    @Post('servers/:id/suspend')
    suspend(@Param('id') id: string) { return this.adminService.suspendServer(id); }

    @Post('servers/:id/unsuspend')
    unsuspend(@Param('id') id: string) { return this.adminService.unsuspendServer(id); }

    // --- Plans ---
    @Post('plans')
    createPlan(@Body() body: any) { return this.adminService.createPlan(body); }

    @Patch('plans/:id')
    updatePlan(@Param('id') id: string, @Body() body: any) { return this.adminService.updatePlan(id, body); }

    @Delete('plans/:id')
    deletePlan(@Param('id') id: string) { return this.adminService.deletePlan(id); }

    // --- UPI ---
    @Get('upi/pending')
    getPendingUpi() { return this.adminService.getPendingUpi(); }

    @Post('upi/:id/approve')
    approveUpi(@Param('id') id: string, @CurrentUser() user: any) {
        return this.adminService.approveUpi(id, user.id);
    }

    @Post('upi/:id/reject')
    rejectUpi(@Param('id') id: string) { return this.adminService.rejectUpi(id); }

    // --- Settings ---
    @Get('settings')
    getSettings() { return this.adminService.getSettings(); }

    @Patch('settings')
    updateSettings(@Body() body: Record<string, string>) {
        return this.adminService.bulkUpdateSettings(body);
    }

    // --- Audit ---
    @Get('audit')
    getAuditLogs(@Query('page') page?: string) {
        return this.adminService.getAuditLogs(parseInt(page || '1'));
    }

    // --- Pterodactyl ---
    @Get('nodes')
    getNodes() { return this.adminService.getNodes(); }

    @Get('eggs')
    getEggs() { return this.adminService.getEggs(); }

    // --- Alt Detection ---
    @Get('alts')
    getAltAccounts(@Query('page') page?: string) {
        return this.adminService.getAltAccounts(parseInt(page || '1'));
    }

    @Get('users/:id/alts')
    getUserAlts(@Param('id') id: string) {
        return this.adminService.getUserAlts(id);
    }

    @Get('users/:id/linked-accounts')
    getLinkedAccounts(@Param('id') id: string) {
        return this.adminService.getLinkedAccounts(id);
    }

    @Post('alts/delete')
    deleteAlts(@Body('userIds') userIds: string[], @CurrentUser() user: any) {
        return this.adminService.deleteAltAccounts(userIds, user.id);
    }

    // --- VPS Plans ---
    @Get('vps/plans')
    getVpsPlans() { return this.adminService.getVpsPlans(); }

    @Post('vps/plans/sync')
    syncVpsPlans() { return this.adminService.syncVpsPlansFromDatalix(); }

    @Patch('vps/plans/:id')
    updateVpsPlan(@Param('id') id: string, @Body() body: any) {
        return this.adminService.updateVpsPlan(id, body);
    }

    @Delete('vps/plans/:id')
    deleteVpsPlan(@Param('id') id: string) { return this.adminService.deleteVpsPlan(id); }

    @Get('vps/stats')
    getVpsStats() { return this.adminService.getVpsStats(); }
}
