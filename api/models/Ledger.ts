import { Model, DataTypes, Sequelize } from 'sequelize'

export class Ledger extends Model {
  declare id: number
  declare domain_id: number
  declare transaction_type: string
  declare amount: number
  declare transaction_date: Date
  declare notes: string | null
}

export function initLedger(sequelize: Sequelize): typeof Ledger {
  Ledger.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      domain_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      transaction_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      transaction_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'ledger',
      timestamps: false,
      underscored: true,
    }
  )
  return Ledger
}
