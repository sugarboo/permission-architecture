import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { seedDatabase } from '../server/database/seed'

const configuredPath = process.env.DATABASE_PATH || '.data/permission-center.db'
const databasePath = resolve(process.cwd(), configuredPath)
const reset = process.argv.includes('--reset')

mkdirSync(dirname(databasePath), { recursive: true })

if (reset && existsSync(databasePath)) {
  rmSync(databasePath)
}

const sqlite = new Database(databasePath)
sqlite.pragma('foreign_keys = ON')
sqlite.pragma('journal_mode = WAL')

const db = drizzle(sqlite)
migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
seedDatabase(db, sqlite)
sqlite.close()

console.log(`Database ready: ${databasePath}`)
