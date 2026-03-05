import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Paymenter API Service
 * Integrates with the Paymenter billing panel for product/order management.
 * Docs: https://paymenter.org/docs
 */
@Injectable()
export class PaymenterService {
    private readonly logger = new Logger(PaymenterService.name);
    private api: AxiosInstance;
    private enabled: boolean;

    constructor(private config: ConfigService) {
        this.enabled = config.get('PAYMENTER_ENABLED') === 'true';
        const baseURL = config.get('PAYMENTER_URL', 'http://localhost');
        const apiKey = config.get('PAYMENTER_API_KEY', '');

        this.api = axios.create({
            baseURL: `${baseURL}/api/v1`,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
    }

    // ========== PRODUCTS ==========

    async getProducts(): Promise<any[]> {
        if (!this.enabled) return [];
        try {
            const { data } = await this.api.get('/products');
            return data.data || [];
        } catch (e) {
            this.logger.error(`Failed to get products: ${e.message}`);
            return [];
        }
    }

    async getProduct(id: number): Promise<any> {
        if (!this.enabled) return null;
        try {
            const { data } = await this.api.get(`/products/${id}`);
            return data.data;
        } catch (e) {
            this.logger.error(`Failed to get product ${id}: ${e.message}`);
            return null;
        }
    }

    // ========== ORDERS ==========

    async getOrders(userId?: string): Promise<any[]> {
        if (!this.enabled) return [];
        try {
            const url = userId ? `/orders?user_id=${userId}` : '/orders';
            const { data } = await this.api.get(url);
            return data.data || [];
        } catch (e) {
            this.logger.error(`Failed to get orders: ${e.message}`);
            return [];
        }
    }

    async createOrder(order: {
        user_id: string;
        product_id: number;
        quantity: number;
        payment_method?: string;
    }): Promise<any> {
        if (!this.enabled) return null;
        try {
            const { data } = await this.api.post('/orders', order);
            this.logger.log(`Created Paymenter order for user ${order.user_id}`);
            return data.data;
        } catch (e) {
            this.logger.error(`Failed to create order: ${e.message}`);
            return null;
        }
    }

    async getOrder(id: number): Promise<any> {
        if (!this.enabled) return null;
        try {
            const { data } = await this.api.get(`/orders/${id}`);
            return data.data;
        } catch (e) {
            this.logger.error(`Failed to get order ${id}: ${e.message}`);
            return null;
        }
    }

    async cancelOrder(id: number): Promise<boolean> {
        if (!this.enabled) return false;
        try {
            await this.api.post(`/orders/${id}/cancel`);
            return true;
        } catch (e) {
            this.logger.error(`Failed to cancel order ${id}: ${e.message}`);
            return false;
        }
    }

    // ========== CLIENTS ==========

    async getClients(): Promise<any[]> {
        if (!this.enabled) return [];
        try {
            const { data } = await this.api.get('/clients');
            return data.data || [];
        } catch (e) {
            this.logger.error(`Failed to get clients: ${e.message}`);
            return [];
        }
    }

    async createClient(client: {
        name: string;
        email: string;
        password?: string;
    }): Promise<any> {
        if (!this.enabled) return null;
        try {
            const { data } = await this.api.post('/clients', client);
            return data.data;
        } catch (e) {
            this.logger.error(`Failed to create client: ${e.message}`);
            return null;
        }
    }

    // ========== INVOICES ==========

    async getInvoices(userId?: string): Promise<any[]> {
        if (!this.enabled) return [];
        try {
            const url = userId ? `/invoices?user_id=${userId}` : '/invoices';
            const { data } = await this.api.get(url);
            return data.data || [];
        } catch (e) {
            this.logger.error(`Failed to get invoices: ${e.message}`);
            return [];
        }
    }

    async payInvoice(id: number, paymentMethod: string): Promise<any> {
        if (!this.enabled) return null;
        try {
            const { data } = await this.api.post(`/invoices/${id}/pay`, { payment_method: paymentMethod });
            return data.data;
        } catch (e) {
            this.logger.error(`Failed to pay invoice ${id}: ${e.message}`);
            return null;
        }
    }

    // ========== COUPONS ==========

    async validateCoupon(code: string): Promise<any> {
        if (!this.enabled) return null;
        try {
            const { data } = await this.api.post('/coupons/validate', { code });
            return data.data;
        } catch (e) {
            this.logger.error(`Coupon validation failed: ${e.message}`);
            return null;
        }
    }

    // ========== WEBHOOK HANDLER ==========

    async handleWebhook(event: string, payload: any): Promise<void> {
        if (!this.enabled) return;
        this.logger.log(`Paymenter webhook: ${event}`);
        switch (event) {
            case 'order.created':
                this.logger.log(`New order: ${payload.id}`);
                break;
            case 'order.paid':
                this.logger.log(`Order paid: ${payload.id}`);
                break;
            case 'order.cancelled':
                this.logger.log(`Order cancelled: ${payload.id}`);
                break;
            case 'invoice.paid':
                this.logger.log(`Invoice paid: ${payload.id}`);
                break;
            default:
                this.logger.warn(`Unknown Paymenter event: ${event}`);
        }
    }
}
