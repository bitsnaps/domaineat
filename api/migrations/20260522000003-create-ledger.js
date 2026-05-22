'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ledger', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      domain_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'domains', key: 'id' },
        onDelete: 'CASCADE',
      },
      transaction_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      transaction_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
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

    await queryInterface.addIndex('ledger', ['domain_id'], { name: 'ledger_domain_id_idx' })
    await queryInterface.addIndex('ledger', ['transaction_type'], { name: 'ledger_transaction_type_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ledger')
  },
}
