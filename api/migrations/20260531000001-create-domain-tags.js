'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('domain_tags', {
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
        allowNull: false,
        references: { model: 'domains', key: 'id' },
        onDelete: 'CASCADE',
      },
      tag: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    })

    // Unique constraint on (domain_id, tag)
    await queryInterface.addIndex('domain_tags', ['domain_id', 'tag'], {
      unique: true,
      name: 'domain_tags_domain_id_tag_unique',
    })

    // Index for fast lookups by user
    await queryInterface.addIndex('domain_tags', ['user_id'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('domain_tags')
  },
}
