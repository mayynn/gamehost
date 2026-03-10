import api from "./client";
import type { Payment, BalanceTransaction, GatewaysConfig } from "@/types";
import type { CreatePaymentDto, SubmitUpiDto, VerifyRazorpayDto, VerifyCashfreeDto } from "@/types/dto";

export const billingApi = {
  getGateways: () => api.get<GatewaysConfig>("/billing/gateways"),
  getBalance: () => api.get<{ amount: number }>("/billing/balance"),
  getPayments: () => api.get<Payment[]>("/billing/payments"),
  getTransactions: () => api.get<BalanceTransaction[]>("/billing/balance/transactions"),

  // Razorpay
  createRazorpayOrder: (data: CreatePaymentDto) => api.post("/billing/razorpay/create", data),
  verifyRazorpay: (data: VerifyRazorpayDto) => api.post("/billing/razorpay/verify", data),

  // Cashfree
  createCashfreeOrder: (data: CreatePaymentDto) => api.post("/billing/cashfree/create", data),
  verifyCashfree: (data: VerifyCashfreeDto) => api.post("/billing/cashfree/verify", data),

  // UPI
  submitUpi: (data: SubmitUpiDto) => api.post("/billing/upi/submit", data),

  // Balance payment
  payWithBalance: (data: CreatePaymentDto) => api.post("/billing/balance/pay", data),
};
