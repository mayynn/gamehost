import { ServerPriceInput } from '../interfaces';

/**
 * Calculates the monthly price for a custom server configuration.
 *
 * Formula:
 *   price = ceil(ramGb * pricePerGb + diskGb * pricePerGb * 0.1 + cpuFactor * pricePerGb * 0.5)
 *
 * This is the single source of truth for custom pricing used in:
 * - Server provisioning (servers.service.ts)
 * - Renewal cost calculation (servers.service.ts)
 * - Auto-renewal cron (billing.service.ts)
 * - Plan price preview (plans.service.ts)
 */
export function calculateCustomServerPrice(input: ServerPriceInput): number {
    const { ram, cpu, disk, pricePerGb } = input;
    const ramGb = ram / 1024;
    const cpuFactor = cpu / 100;
    const diskGb = disk / 1024;

    return Math.ceil(
        ramGb * pricePerGb +
        diskGb * (pricePerGb * 0.1) +
        cpuFactor * (pricePerGb * 0.5),
    );
}
