import api from "./client";
import type { User } from "@/types";
import type {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendVerificationDto,
} from "@/types/dto";

export const authApi = {
  register: (data: RegisterDto) =>
    api.post<{ message: string }>("/auth/register", data),

  login: (data: LoginDto) =>
    api.post<{ token: string; user: User }>("/auth/login", data),

  logout: () =>
    api.post<{ message: string }>("/auth/logout"),

  me: () =>
    api.get<{ user: User }>("/auth/me"),

  forgotPassword: (data: ForgotPasswordDto) =>
    api.post<{ message: string }>("/auth/forgot-password", data),

  resetPassword: (data: ResetPasswordDto) =>
    api.post<{ message: string }>("/auth/reset-password", data),

  resendVerification: (data: ResendVerificationDto) =>
    api.post<{ message: string }>("/auth/resend-verification", data),

  getGoogleAuthUrl: () => `${api.defaults.baseURL}/auth/google`,
  getDiscordAuthUrl: () => `${api.defaults.baseURL}/auth/discord`,
};
