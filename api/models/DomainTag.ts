import { Model, DataTypes, Sequelize } from 'sequelize'

export class DomainTag extends Model {
	declare id: number
	declare user_id: number
	declare domain_id: number
	declare tag: string
	declare created_at: Date
}

export function initDomainTag(sequelize: Sequelize): typeof DomainTag {
	DomainTag.init(
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
				allowNull: false,
			},
			tag: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
		},
		{
			sequelize,
			tableName: 'domain_tags',
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: false,
			underscored: true,
			indexes: [
				{
					unique: true,
					fields: ['domain_id', 'tag'],
					name: 'domain_tags_domain_id_tag_unique',
				},
			],
		}
	)
	return DomainTag
}
