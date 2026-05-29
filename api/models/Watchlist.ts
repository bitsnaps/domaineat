import { Model, DataTypes, Sequelize } from 'sequelize'

export class Watchlist extends Model {
	declare id: number
	declare user_id: number
	declare domain_name: string
	declare tld: string
	declare available: boolean | null
	declare appraisal_grade: string | null
	declare notes: string | null
	declare notify_on: string
	declare last_checked_at: Date | null
}

export function initWatchlist(sequelize: Sequelize): typeof Watchlist {
	Watchlist.init(
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
			available: {
				type: DataTypes.BOOLEAN,
				allowNull: true,
			},
			appraisal_grade: {
				type: DataTypes.STRING(5),
				allowNull: true,
			},
			notes: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			notify_on: {
				type: DataTypes.STRING(50),
				defaultValue: 'status_change',
			},
			last_checked_at: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			sequelize,
			tableName: 'watchlist',
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
	return Watchlist
}
