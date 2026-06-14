'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('domains', {
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
        type: Sequelize.STRING(253),
        allowNull: false,
      },
      registrar: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      purchase_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      current_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      annual_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      nameserver_1: {
        type: Sequelize.STRING(253),
        allowNull: true,
      },
      nameserver_2: {
        type: Sequelize.STRING(253),
        allowNull: true,
      },
      acquisition_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      expiry_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        validate: { isIn: [['active', 'expired', 'sold', 'pending_transfer']] },
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    })

    await queryInterface.addIndex('domains', ['user_id'], { name: 'domains_user_id_idx' })
    await queryInterface.addIndex('domains', ['domain_name'], { name: 'domains_domain_name_idx' })
    await queryInterface.addIndex('domains', ['status'], { name: 'domains_status_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('domains')
  },
}
