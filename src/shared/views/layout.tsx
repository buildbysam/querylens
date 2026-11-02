import { memo, type PropsWithChildren } from "hono/jsx";

export interface BaseLayoutProps {
  title?: string;
}

const Header = memo(() => {
  return <header>header here</header>;
});

const Footer = memo(() => {
  return <footer>footer here</footer>;
});

export const BaseLayout = (props: PropsWithChildren<BaseLayoutProps>) => {
  return (
    <>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" href="/css/styles.css" />
          <title>{props.title ? `${props.title} | QueryLens` : "QueryLens: PostgreSQL Observability Platform"}</title>
        </head>
        <body>
          <Header />
          <main>{props.children}</main>
          <Footer />
        </body>
      </html>
    </>
  );
};
