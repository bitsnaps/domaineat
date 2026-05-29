import { Model, DataTypes, Sequelize } from 'sequelize'

export class Wishlist extends Model {
	declare id: number
	declare user_id: number
	declare domain_name: string
	declare tld: string
	declare max_budget: number | null
	declare available: boolean | null
	declare appraisal_grade: string | null
	declare auto_prospect: boolean
	declare ai_agent: boolean
	declare priority: string
	declare notes: string | null
	declare last_checked_at: Date | null
}

export function initWishlist(sequelize: Sequelize): typeof Wishlist {
	Wishlist.init(
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
			tld: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			max_budget: {
				type: DataTypes.DECIMAL(10, 2),
				allowNull: true,
			},
			available: {
				type: DataTypes.BOOLEAN,
				allowNull: true,
			},
			appraisal_grade: {
				type: DataTypes.STRING(5),
				allowNull: true,
			},
			auto_prospect: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
			ai_agent: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
			priority: {
				type: DataTypes.STRING(10),
				defaultValue: 'medium',
				validate: {
					isIn: [['low', 'medium', 'high', 'critical']],
				},
			},
			notes: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			last_checked_at: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			sequelize,
			tableName: 'wishlist',
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			underscored: true,
			indexes: [
				{
					unique: true,
					fields: ['user_id', 'domain_name'],
				},
			],
		},
	)
	return Wishlist
}
