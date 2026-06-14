/**
 * migrate.ts — ESM-compatible database migration runner
 * 
 * Usage: node api/migrate.ts
 * 
 * This replaces sequelize-cli which doesn't support ESM projects.
 * Reads migrations from api/migrations/ and runs them via Sequelize.
 */
import 'dotenv/config'
import { Sequelize } from 'sequelize'
import { readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, 'migrations')

async function getSequelize(): Promise<Sequelize> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set in environment')

  const env = process.env.NODE_ENV || 'development'

  return new Sequelize(url, {
    dialect: 'postgres',
    dialectOptions: env !== 'development' ? {
      ssl: { require: true, rejectUnauthorized: false },
    } : {},
    logging: false,
  })
}

async function ensureMetaTable(sequelize: Sequelize): Promise<void> {
  await sequelize.getQueryInterface().createTable('SequelizeMeta', {
    name: {
      type: (sequelize as any).constructor.STRING,
      allowNull: false,
      primaryKey: true,
    },
  }).catch(() => { /* already exists */ })
}

async function getRan(sequelize: Sequelize): Promise<string[]> {
  const [results] = await sequelize.query(
    "SELECT name FROM \"SequelizeMeta\" ORDER BY name"
  )
  return (results as { name: string }[]).map((r) => r.name)
}

async function runMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
  const sequelize = await getSequelize()
  
  try {
    await ensureMetaTable(sequelize)
    const ran = await getRan(sequelize)

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.cjs'))
      .sort()

    if (direction === 'up') {
      for (const file of files) {
        if (ran.includes(file)) {
          console.log(`  SKIP: ${file}`)
          continue
        }
        console.log(`  RUN:  ${file}`)
        const mod = await import(join(MIGRATIONS_DIR, file))
        const migration = mod.default || mod
        await migration.up(sequelize.getQueryInterface(), Sequelize)
        await sequelize.query(
          `INSERT INTO "SequelizeMeta" (name) VALUES (?)`,
          { replacements: [file] }
        )
        console.log(`  OK:   ${file}`)
      }
    } else {
      for (const file of [...files].reverse()) {
        if (!ran.includes(file)) continue
        console.log(`  DOWN: ${file}`)
        const mod = await import(join(MIGRATIONS_DIR, file))
        const migration = mod.default || mod
        await migration.down(sequelize.getQueryInterface(), Sequelize)
        await sequelize.query(
          `DELETE FROM "SequelizeMeta" WHERE name = ?`,
          { replacements: [file] }
        )
        console.log(`  OK:   ${file}`)
      }
    }

    console.log('\n✅ Migrations complete')
  } finally {
    await sequelize.close()
  }
}

runMigrations(process.argv[2] as 'up' | 'down' || 'up').catch((err) => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})

