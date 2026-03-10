import api from "./client";
import type { PublicStats } from "@/types";

export const statsApi = {
  getPublic: () => api.get<PublicStats>("/stats"),
  getHealth: () => api.get("/health"),
};
