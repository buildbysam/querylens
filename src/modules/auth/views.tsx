import type { FC } from "hono/jsx";

export const LoginPage: FC = () => {
  return (
    <form action="/auth/login" method="post">
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
};

export const RegisterPage: FC = () => {
  return (
    <form action="/auth/register" method="post">
      <input type="text" name="name" placeholder="Name" required />
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Register</button>
    </form>
  );
};
