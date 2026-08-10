import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../database/schema'

type Connection = {
  sqlite: Database.Database
  db: BetterSQLite3Database<typeof schema>
}

let connection: Connection | undefined

export function useDb(): Connection {
  if (connection) return connection

  const config = useRuntimeConfig()
  const databasePath = resolve(process.cwd(), config.databasePath)
  mkdirSync(dirname(databasePath), { recursive: true })

  const sqlite = new Database(databasePath)
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('journal_mode = WAL')

  connection = {
    sqlite,
    db: drizzle(sqlite, { schema })
  }

  return connection
}
