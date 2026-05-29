'use strict'

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.createTable('watchlist', {
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
			available: {
				type: Sequelize.BOOLEAN,
				allowNull: true,
			},
			appraisal_grade: {
				type: Sequelize.STRING(5),
				allowNull: true,
			},
			notes: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			notify_on: {
				type: Sequelize.STRING(50),
				allowNull: false,
				defaultValue: 'status_change',
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
		await queryInterface.addIndex('watchlist', ['user_id', 'domain_name'], {
			unique: true,
			name: 'watchlist_user_domain_unique',
		})

		// Index for fast lookups by user
		await queryInterface.addIndex('watchlist', ['user_id'])
	},

	down: async (queryInterface) => {
		await queryInterface.dropTable('watchlist')
	},
}
