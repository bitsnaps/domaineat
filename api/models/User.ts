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
	declare daily_rdap_calls: number
	declare preferred_registrar: string | null
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
			daily_rdap_calls: {
				type: DataTypes.INTEGER,
				defaultValue: 0,
			},
			preferred_registrar: {
				type: DataTypes.STRING(255),
				allowNull: true,
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
