import { Model, DataTypes, Sequelize } from 'sequelize'

export class Domain extends Model {
	declare id: number
	declare user_id: number
	declare domain_name: string
	declare registrar: string
	declare acquisition_date: Date
	declare expiry_date: Date
	declare acquisition_cost: number
	declare renewal_cost: number
	declare nameservers: string | null
	declare status: string
}

export function initDomain(sequelize: Sequelize): typeof Domain {
	Domain.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			user_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			domain_name: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			registrar: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			acquisition_date: {
				type: DataTypes.DATEONLY,
				allowNull: false,
			},
			expiry_date: {
				type: DataTypes.DATEONLY,
				allowNull: false,
			},
			acquisition_cost: {
				type: DataTypes.DECIMAL(10, 2),
				defaultValue: 0.0,
				allowNull: false,
			},
			renewal_cost: {
				type: DataTypes.DECIMAL(10, 2),
				defaultValue: 0.0,
				allowNull: false,
			},
			nameservers: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			status: {
				type: DataTypes.STRING(50),
				defaultValue: 'active',
			},
		},
		{
			sequelize,
			tableName: 'domains',
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			underscored: true,
		}
	)
	return Domain
}
