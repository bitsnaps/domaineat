import { Model, DataTypes, Sequelize } from 'sequelize'

export class User extends Model {
  declare id: number
  declare email: string
  declare password_hash: string
  declare tier: 'free' | 'premium' | 'enterprise'
  declare created_at: Date
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
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'users',
      timestamps: false,
      underscored: true,
    }
  )
  return User
}
