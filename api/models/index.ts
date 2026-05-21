import { Sequelize } from 'sequelize'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig()

import { initUser, User } from './User.js'
import { initDomain, Domain } from './Domain.js'
import { initLedger, Ledger } from './Ledger.js'
import { initProspect, Prospect } from './Prospect.js'

const env = process.env.NODE_ENV || 'development'

// Create Sequelize instance from DATABASE_URL env var (NeonDB / any Postgres)
const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: env === 'development' ? console.log : false,
})

// Initialize models
initUser(sequelize)
initDomain(sequelize)
initLedger(sequelize)
initProspect(sequelize)

// Define associations (PRD foreign keys)
Domain.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasMany(Domain, { foreignKey: 'user_id', as: 'domains' })

Ledger.belongsTo(Domain, { foreignKey: 'domain_id', as: 'domain' })
Domain.hasMany(Ledger, { foreignKey: 'domain_id', as: 'ledgerEntries' })

Prospect.belongsTo(Domain, { foreignKey: 'domain_id', as: 'domain' })
Domain.hasMany(Prospect, { foreignKey: 'domain_id', as: 'prospects' })

export { sequelize, User, Domain, Ledger, Prospect }
export default { sequelize, User, Domain, Ledger, Prospect }
