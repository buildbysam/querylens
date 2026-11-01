import type { PropsWithChildren } from "hono/jsx";

export interface BaseLayoutProps {
  title?: string;
}

export const BaseLayout = (props: PropsWithChildren<BaseLayoutProps>) => {
  return (
    <>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" href="/css/styles.css" />
          <title>{props.title}</title>
        </head>
        <body>{props.children}</body>
      </html>
    </>
  );
};
