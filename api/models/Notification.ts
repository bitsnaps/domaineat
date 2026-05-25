import { Model, DataTypes, Sequelize } from 'sequelize'

export class Notification extends Model {
	declare id: number
	declare user_id: number
	declare domain_id: number | null
	declare type: string
	declare level: 'info' | 'warning' | 'urgent'
	declare message: string
	declare dismissed: boolean
}

export function initNotification(sequelize: Sequelize): typeof Notification {
	Notification.init(
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
			domain_id: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			type: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			level: {
				type: DataTypes.STRING(20),
				defaultValue: 'info',
				validate: {
					isIn: [['info', 'warning', 'urgent']],
				},
			},
			message: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			dismissed: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
		},
		{
			sequelize,
			tableName: 'notifications',
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			underscored: true,
		}
	)
	return Notification
}
