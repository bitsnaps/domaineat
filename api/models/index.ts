import { Sequelize } from 'sequelize'

import { initUser, User } from './User.js'
import { initDomain, Domain } from './Domain.js'
import { initLedger, Ledger } from './Ledger.js'
import { initProspect, Prospect } from './Prospect.js'
import { initNotification, Notification } from './Notification.js'

const env = process.env.NODE_ENV || 'development'

// Create Sequelize instance from DATABASE_URL env var (NeonDB / any Postgres)
// NOTE: dotenv/config must be loaded by the entrypoint BEFORE this module is imported.
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
	throw new Error(
		'DATABASE_URL environment variable is not set. ' +
		'For Netlify: set it in Site settings → Environment variables. ' +
		'For local dev: add it to your .env file.'
	)
}

const sequelize = new Sequelize(databaseUrl, {
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
initNotification(sequelize)

// Define associations (PRD foreign keys)
Domain.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasMany(Domain, { foreignKey: 'user_id', as: 'domains' })

Ledger.belongsTo(Domain, { foreignKey: 'domain_id', as: 'domain' })
Domain.hasMany(Ledger, { foreignKey: 'domain_id', as: 'ledgerEntries' })

Prospect.belongsTo(Domain, { foreignKey: 'domain_id', as: 'domain' })
Domain.hasMany(Prospect, { foreignKey: 'domain_id', as: 'prospects' })

Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' })

Notification.belongsTo(Domain, { foreignKey: 'domain_id', as: 'domain' })
Domain.hasMany(Notification, { foreignKey: 'domain_id', as: 'notifications' })

export { sequelize, User, Domain, Ledger, Prospect, Notification }
export default { sequelize, User, Domain, Ledger, Prospect, Notification }
