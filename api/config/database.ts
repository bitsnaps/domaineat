import { config as dotenvConfig } from 'dotenv'
dotenvConfig()

export default {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres' as const,
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres' as const,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres' as const,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  },
}
