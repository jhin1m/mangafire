import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

// Placeholder table to verify Drizzle setup works
export const healthChecks = pgTable('health_checks', {
  id: serial('id').primaryKey(),
  status: text('status').notNull().default('ok'),
  checkedAt: timestamp('checked_at').defaultNow(),
})
