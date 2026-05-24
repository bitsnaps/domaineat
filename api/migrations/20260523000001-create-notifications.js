'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifications', {
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
      domain_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'domains', key: 'id' },
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      level: {
        type: Sequelize.STRING(20),
        defaultValue: 'info',
        validate: { isIn: [['info', 'warning', 'urgent']] },
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      dismissed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    })

    // Index for fast lookups by user
    await queryInterface.addIndex('notifications', ['user_id'])
    // Index for duplicate-check queries
    await queryInterface.addIndex('notifications', ['domain_id', 'type', 'dismissed'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('notifications')
  },
}
