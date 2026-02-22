import { neon } from "@neondatabase/serverless";

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql;
}

export async function initializeDatabase() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      vehicle_info TEXT,
      service_description TEXT,
      transcript JSONB DEFAULT '[]'::jsonb,
      status TEXT DEFAULT 'active',
      email_sent BOOLEAN DEFAULT false,
      last_activity_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_conversations_session_id
    ON conversations (session_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_conversations_status
    ON conversations (status)
  `;

  return true;
}
