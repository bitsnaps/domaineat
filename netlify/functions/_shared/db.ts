/**
 * db.ts — Shared database connection for Netlify functions
 * 
 * Uses a singleton Sequelize instance to avoid creating multiple
 * connections per function invocation.
 * 
 * Usage in functions:
 *   import { sequelize, User, Domain, Ledger, Prospect } from '../_shared/db.js'
 */
import 'dotenv/config'
import { sequelize, User, Domain, Ledger, Prospect } from '../../../api/models/index.js'

export { sequelize, User, Domain, Ledger, Prospect }
