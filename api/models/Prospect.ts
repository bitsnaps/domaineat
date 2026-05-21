import { Model, DataTypes, Sequelize } from 'sequelize'

export class Prospect extends Model {
  declare id: number
  declare domain_id: number
  declare prospect_domain: string
  declare company_name: string | null
  declare contact_email: string | null
  declare outreach_status: string
  declare last_contact_date: Date | null
}

export function initProspect(sequelize: Sequelize): typeof Prospect {
  Prospect.init(
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
      prospect_domain: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      company_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      contact_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      outreach_status: {
        type: DataTypes.STRING(50),
        defaultValue: 'uncontacted',
      },
      last_contact_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'prospects',
      timestamps: false,
      underscored: true,
    }
  )
  return Prospect
}
