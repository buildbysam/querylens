import { getPlatformStatus } from "@/modules/health/sampler.js";
import type { AppEnv } from "@/types.js";
import type { Context } from "hono";

// data every AppLayout page needs: the signed-in user and the sidebar system status. */
export async function shellProps(c: Context<AppEnv>) {
  const user = c.get("user");
  return {
    user: { name: user.name, email: user.email },
    systemStatus: await getPlatformStatus(),
  };
}
