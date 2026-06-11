-- bookings exists since migration 001 (date/time columns); rename to the
-- clearer names the new API uses. D1's SQLite supports RENAME COLUMN.
ALTER TABLE bookings RENAME COLUMN date TO preferred_date;
ALTER TABLE bookings RENAME COLUMN time TO preferred_time;
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(preferred_date);

-- Single-use invite tokens for the testimonial collection flow
CREATE TABLE IF NOT EXISTS testimonial_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  email TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
