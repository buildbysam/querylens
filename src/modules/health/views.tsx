import type { FC } from "hono/jsx";

interface HealthPageProps {
  message: string;
}

export const HealthPage: FC<HealthPageProps> = (props: HealthPageProps) => {
  return (
    <>
      <h1>Health Page</h1>
      <p>{props.message}</p>
    </>
  );
};
