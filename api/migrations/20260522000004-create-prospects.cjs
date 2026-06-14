'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('prospects', {
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
      prospect_domain: {
        type: Sequelize.STRING(253),
        allowNull: false,
      },
      company_name: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      contact_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      outreach_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'uncontacted',
        validate: { isIn: [['uncontacted', 'contacted', 'responded', 'negotiating', 'closed']] },
      },
      last_contact_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
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

    await queryInterface.addIndex('prospects', ['domain_id'], { name: 'prospects_domain_id_idx' })
    await queryInterface.addIndex('prospects', ['outreach_status'], { name: 'prospects_outreach_status_idx' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('prospects')
  },
}
