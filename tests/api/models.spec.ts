import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Sequelize } from 'sequelize'

// TDD: Test the Sequelize database connection and model loading
// These tests will FAIL until we implement:
// 1. api/config/database.ts — connection config from env vars
// 2. api/models/index.ts — Sequelize instance + model registration
// 3. api/models/User.ts, Domain.ts, Ledger.ts, Prospect.ts

describe('Sequelize Database Connection', () => {
  it('creates a Sequelize instance with NeonDB URL from env', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { sequelize } = await import('../../api/models/index.js')
    expect(sequelize).toBeDefined()
    expect(sequelize).toBeInstanceOf(Sequelize)
  })

  it('configures SSL for NeonDB connection', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { sequelize } = await import('../../api/models/index.js')
    const config = sequelize.config
    // NeonDB requires SSL — dialectOptions should have rejectUnauthorized: false
    expect(config.dialectOptions?.ssl).toBeDefined()
  })

  it('exposes all 4 models: User, Domain, Ledger, Prospect', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { User, Domain, Ledger, Prospect } = await import('../../api/models/index.js')
    expect(User).toBeDefined()
    expect(Domain).toBeDefined()
    expect(Ledger).toBeDefined()
    expect(Prospect).toBeDefined()
    expect(User.tableName).toBe('users')
    expect(Domain.tableName).toBe('domains')
    expect(Ledger.tableName).toBe('ledger')
    expect(Prospect.tableName).toBe('prospects')
  })
})

describe('User Model', () => {
  it('has required fields: email (unique), password_hash, tier, created_at', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { User } = await import('../../api/models/index.js')
    const attrs = User.rawAttributes
    expect(attrs.email).toBeDefined()
    expect(attrs.email.unique).toBe(true)
    expect(attrs.email.allowNull).toBe(false)
    expect(attrs.password_hash).toBeDefined()
    expect(attrs.password_hash.allowNull).toBe(false)
    expect(attrs.tier).toBeDefined()
    expect(attrs.tier.defaultValue).toBe('free')
    expect(attrs.created_at).toBeDefined()
  })

  it('tier only accepts free, premium, enterprise', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { User } = await import('../../api/models/index.js')
    const attrs = User.rawAttributes
    // Sequelize stores IN values in the validate or via isIn
    expect(attrs.tier.validate?.isIn).toBeDefined()
  })
})

describe('Domain Model', () => {
  it('has required fields matching PRD schema', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { Domain } = await import('../../api/models/index.js')
    const attrs = Domain.rawAttributes
    expect(attrs.domain_name).toBeDefined()
    expect(attrs.registrar).toBeDefined()
    expect(attrs.acquisition_date).toBeDefined()
    expect(attrs.expiry_date).toBeDefined()
    expect(attrs.acquisition_cost).toBeDefined()
    expect(attrs.renewal_cost).toBeDefined()
    expect(attrs.nameservers).toBeDefined()
    expect(attrs.status).toBeDefined()
    expect(attrs.status.defaultValue).toBe('active')
  })

  it('belongs to User (userId foreign key)', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { Domain } = await import('../../api/models/index.js')
    expect(Domain.rawAttributes.user_id).toBeDefined()
    expect(Domain.rawAttributes.user_id.allowNull).toBe(false)
  })
})

describe('Ledger Model', () => {
  it('has required fields matching PRD schema', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { Ledger } = await import('../../api/models/index.js')
    const attrs = Ledger.rawAttributes
    expect(attrs.transaction_type).toBeDefined()
    expect(attrs.amount).toBeDefined()
    expect(attrs.transaction_date).toBeDefined()
    expect(attrs.notes).toBeDefined()
  })

  it('belongs to Domain (domainId foreign key)', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { Ledger } = await import('../../api/models/index.js')
    expect(Ledger.rawAttributes.domain_id).toBeDefined()
  })
})

describe('Prospect Model', () => {
  it('has required fields matching PRD schema', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { Prospect } = await import('../../api/models/index.js')
    const attrs = Prospect.rawAttributes
    expect(attrs.prospect_domain).toBeDefined()
    expect(attrs.company_name).toBeDefined()
    expect(attrs.contact_email).toBeDefined()
    expect(attrs.outreach_status).toBeDefined()
    expect(attrs.outreach_status.defaultValue).toBe('uncontacted')
    expect(attrs.last_contact_date).toBeDefined()
  })

  it('belongs to Domain (domainId foreign key)', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb?sslmode=require'
    const { Prospect } = await import('../../api/models/index.js')
    expect(Prospect.rawAttributes.domain_id).toBeDefined()
  })
})
