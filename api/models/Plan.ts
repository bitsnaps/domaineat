import { Model, DataTypes, Sequelize } from 'sequelize'

export interface PlanLimits {
	domains: number
	rdapDaily: number
	aiDaily: number
	watchlist: number
	wishlist: number
}

export class Plan extends Model {
	declare tier: string
	declare name: string
	declare price_monthly: number
	declare price_yearly: number
	declare domains: number
	declare rdap_daily: number
	declare ai_daily: number
	declare watchlist: number
	declare wishlist: number
	declare features: string
	declare active: boolean
	declare created_at: Date
	declare updated_at: Date

	/** Convert DB row to tier limits (matches TIER_LIMITS shape) */
	toLimits(): PlanLimits {
		const unlimited = (v: number) => v < 0 ? Infinity : v
		return {
			domains: unlimited(this.domains),
			rdapDaily: unlimited(this.rdap_daily),
			aiDaily: unlimited(this.ai_daily),
			watchlist: unlimited(this.watchlist),
			wishlist: unlimited(this.wishlist),
		}
	}
}

export function initPlan(sequelize: Sequelize): typeof Plan {
	Plan.init(
		{
			tier: {
				type: DataTypes.STRING(50),
				primaryKey: true,
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			price_monthly: {
				type: DataTypes.FLOAT,
				defaultValue: 0,
			},
			price_yearly: {
				type: DataTypes.FLOAT,
				defaultValue: 0,
			},
			domains: {
				type: DataTypes.INTEGER,
				defaultValue: 10,
			},
			rdap_daily: {
				type: DataTypes.INTEGER,
				defaultValue: 10,
			},
			ai_daily: {
				type: DataTypes.INTEGER,
				defaultValue: 5,
			},
			watchlist: {
				type: DataTypes.INTEGER,
				defaultValue: 10,
			},
			wishlist: {
				type: DataTypes.INTEGER,
				defaultValue: 5,
			},
			features: {
				type: DataTypes.TEXT,
				defaultValue: '[]',
			},
			active: {
				type: DataTypes.BOOLEAN,
				defaultValue: true,
			},
			created_at: {
				type: DataTypes.DATE,
				defaultValue: DataTypes.NOW,
			},
			updated_at: {
				type: DataTypes.DATE,
				defaultValue: DataTypes.NOW,
			},
		},
		{
			sequelize,
			tableName: 'plans',
			timestamps: false,
			underscored: true,
		}
	)
	return Plan
}
