import api from "./client";
import type { User } from "@/types";
import type { UpdateProfileDto, ChangePasswordDto } from "@/types/dto";

export const usersApi = {
  getProfile: () => api.get<User>("/users/profile"),
  updateProfile: (data: UpdateProfileDto) => api.patch<User>("/users/profile", data),
  changePassword: (data: ChangePasswordDto) => api.post<{ message: string }>("/users/change-password", data),
};
