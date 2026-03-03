import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            include: { balance: true, credits: true, pterodactylAccount: true },
        });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async updateProfile(id: string, data: { name?: string; avatar?: string }) {
        return this.prisma.user.update({ where: { id }, data });
    }

    async getAllUsers(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take: limit,
                include: { balance: true, credits: true, _count: { select: { servers: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count(),
        ]);
        return { users, total, page, totalPages: Math.ceil(total / limit) };
    }

    async setRole(userId: string, role: 'USER' | 'ADMIN') {
        return this.prisma.user.update({ where: { id: userId }, data: { role } });
    }

    async deleteUser(userId: string) {
        return this.prisma.user.delete({ where: { id: userId } });
    }

    async changePassword(userId: string, newPassword: string, currentPassword?: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');

        // If user has an existing password (EMAIL provider), verify current password
        if (user.password && currentPassword) {
            const valid = await bcrypt.compare(currentPassword, user.password);
            if (!valid) throw new BadRequestException('Current password is incorrect');
        }

        if (newPassword.length < 8) throw new BadRequestException('Password must be at least 8 characters');

        const hashed = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashed },
        });

        return { message: 'Password updated successfully' };
    }
}
