'use strict'

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.createTable('wishlist', {
			id: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			user_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: { model: 'users', key: 'id' },
				onDelete: 'CASCADE',
			},
			domain_name: {
				type: Sequelize.STRING(255),
				allowNull: false,
			},
			tld: {
				type: Sequelize.STRING(50),
				allowNull: false,
			},
			max_budget: {
				type: Sequelize.DECIMAL(10, 2),
				allowNull: true,
			},
			available: {
				type: Sequelize.BOOLEAN,
				allowNull: true,
			},
			appraisal_grade: {
				type: Sequelize.STRING(5),
				allowNull: true,
			},
			auto_prospect: {
				type: Sequelize.BOOLEAN,
				defaultValue: false,
			},
			ai_agent: {
				type: Sequelize.BOOLEAN,
				defaultValue: false,
			},
			priority: {
				type: Sequelize.STRING(10),
				defaultValue: 'medium',
			},
			notes: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			last_checked_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			created_at: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
			updated_at: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
		})

		// Unique constraint on (user_id, domain_name)
		await queryInterface.addIndex('wishlist', ['user_id', 'domain_name'], {
			unique: true,
			name: 'wishlist_user_domain_unique',
		})

		// Index for fast lookups by user
		await queryInterface.addIndex('wishlist', ['user_id'])
	},

	down: async (queryInterface) => {
		await queryInterface.dropTable('wishlist')
	},
}
