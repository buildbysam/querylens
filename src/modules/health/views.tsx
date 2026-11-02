import type { HealthCheckResult } from "@/modules/health/service.js";
import type { FC } from "hono/jsx";

export const HealthPage: FC<HealthCheckResult> = (props) => {
  return (
    <>
      <h1>Health Page</h1>
      <p>Database: {props.database}</p>
    </>
  );
};
