import type { SessionUser } from "@/shared/lib/session.js";

export type AppEnv = {
  Variables: {
    userId: string;
    user: SessionUser;
    requestId: string;
  };
};
