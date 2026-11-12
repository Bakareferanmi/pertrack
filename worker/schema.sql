-- One row per phone/browser that turned on closed-app reminders. No names, no accounts.
CREATE TABLE IF NOT EXISTS subs (
  id TEXT PRIMARY KEY,          -- sha-256 of the push endpoint
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  updated INTEGER NOT NULL      -- unix seconds; stale rows are purged after 120 days
);
-- One row per reminder. slot = UTC minute of the week (0..10079), so the cron lookup is a single index hit.
CREATE TABLE IF NOT EXISTS reminders (
  sub_id TEXT NOT NULL,
  slot INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reminders_slot ON reminders(slot);
CREATE INDEX IF NOT EXISTS reminders_sub ON reminders(sub_id);
