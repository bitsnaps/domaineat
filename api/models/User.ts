import { Model, DataTypes, Sequelize } from 'sequelize'

export class User extends Model {
  declare id: number
  declare email: string
  declare password_hash: string
  declare tier: 'free' | 'premium' | 'enterprise'
  declare llm_provider: string | null
  declare llm_model: string | null
  declare llm_api_key_encrypted: string | null
 declare daily_ai_calls: number
 declare created_at: Date
 declare updated_at: Date
}

export function initUser(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      tier: {
        type: DataTypes.STRING(50),
        defaultValue: 'free',
        validate: {
          isIn: [['free', 'premium', 'enterprise']],
        },
      },
      llm_provider: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      llm_model: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      llm_api_key_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
 daily_ai_calls: {
 type: DataTypes.INTEGER,
 defaultValue: 0,
 },
 },
 {
 sequelize,
 tableName: 'users',
 timestamps: true,
 createdAt: 'created_at',
 updatedAt: 'updated_at',
 underscored: true,
 }
  )
  return User
}
