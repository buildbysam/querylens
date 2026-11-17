// in-memory log of QueryLens's own events
// internal only: never target-database statistics. bounded; lost on restart

export type InternalService = "metadata" | "collector" | "scheduler";
export type InternalSeverity = "info" | "warning" | "critical";

export interface InternalEvent {
  at: Date;
  service: InternalService;
  event: string;
  severity: InternalSeverity;
  /** Short, credential-free detail. */
  detail?: string;
}

const MAX_EVENTS = 200;
const events: InternalEvent[] = [];

export function recordEvent(event: Omit<InternalEvent, "at">) {
  events.push({ ...event, at: new Date() });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

/** Newest first, limited to a time window. */
export function recentEvents(windowMs: number, now = Date.now()): InternalEvent[] {
  return events.filter((e) => now - e.at.getTime() <= windowMs).reverse();
}
