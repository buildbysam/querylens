import { collectionIntervalSeconds } from "@/modules/collector/scheduler.js";
import { VIEW_NAMES } from "@/modules/collector/views.js";
import { listDatabases } from "@/modules/databases/service.js";
import { DatabasesPage } from "@/modules/pages/DatabasesPage.js";
import { SnapshotsPage } from "@/modules/pages/SnapshotsPage.js";
import { shellProps } from "@/modules/pages/shell.js";
import { latestSnapshots, listViews } from "@/modules/snapshots/service.js";
import type { AppEnv } from "@/types.js";
import { Hono } from "hono";

/** Server-rendered /app/* pages. Mounted after authMiddleware. */
export const pages = new Hono<AppEnv>();

pages.get("/app", (c) => c.redirect("/app/databases"));

pages.get("/app/databases", async (c) => {
  const [databases, shell] = await Promise.all([listDatabases(), shellProps(c)]);
  return c.render(
    <DatabasesPage {...shell} databases={databases} now={new Date()} openRegister={c.req.query("register") === "1"} />
  );
});

pages.get("/app/snapshots", async (c) => {
  const [databases, shell] = await Promise.all([listDatabases(), shellProps(c)]);
  const selected = databases.find((d) => d.id === c.req.query("database")) ?? databases[0];

  if (!selected) {
    return c.render(
      <SnapshotsPage
        {...shell}
        databases={[]}
        views={[]}
        activeView=""
        snapshot={null}
        hasAnySnapshots={false}
        intervalSeconds={collectionIntervalSeconds}
      />
    );
  }

  const views = await listViews(selected.id);
  const requested = c.req.query("view");
  const activeView =
    requested && VIEW_NAMES.includes(requested) ? requested : (views.find((v) => v.available)?.name ?? VIEW_NAMES[0]!);
  const [snapshot] = await latestSnapshots(selected.id, activeView);

  return c.render(
    <SnapshotsPage
      {...shell}
      databases={databases}
      selected={selected}
      views={views}
      activeView={activeView}
      snapshot={snapshot ?? null}
      hasAnySnapshots={views.some((v) => v.available)}
      intervalSeconds={collectionIntervalSeconds}
    />
  );
});
