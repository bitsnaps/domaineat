'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── users: add missing columns ──────────────────────────────────
    const usersTable = await queryInterface.describeTable('users')

    if (!usersTable.llm_provider) {
      await queryInterface.addColumn('users', 'llm_provider', {
        type: Sequelize.STRING(50),
        allowNull: true,
      })
    }
    if (!usersTable.llm_model) {
      await queryInterface.addColumn('users', 'llm_model', {
        type: Sequelize.STRING(100),
        allowNull: true,
      })
    }
    if (!usersTable.llm_api_key_encrypted) {
      await queryInterface.addColumn('users', 'llm_api_key_encrypted', {
        type: Sequelize.TEXT,
        allowNull: true,
      })
    }
    if (!usersTable.preferred_registrar) {
      await queryInterface.addColumn('users', 'preferred_registrar', {
        type: Sequelize.STRING(255),
        allowNull: true,
      })
    }

    // ── domains: add missing columns ────────────────────────────────
    const domainsTable = await queryInterface.describeTable('domains')

    if (!domainsTable.acquisition_cost) {
      await queryInterface.addColumn('domains', 'acquisition_cost', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      })
    }
    if (!domainsTable.renewal_cost) {
      await queryInterface.addColumn('domains', 'renewal_cost', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      })
    }
    if (!domainsTable.nameservers) {
      await queryInterface.addColumn('domains', 'nameservers', {
        type: Sequelize.TEXT,
        allowNull: true,
      })
    }
    if (!domainsTable.appraisal_grade) {
      await queryInterface.addColumn('domains', 'appraisal_grade', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null,
      })
    }

    // ── notifications: add missing updated_at ───────────────────────
    const notificationsTable = await queryInterface.describeTable('notifications')

    if (!notificationsTable.updated_at) {
      await queryInterface.addColumn('notifications', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('NOW()'),
      })
    }
  },

  async down(queryInterface) {
    const usersTable = await queryInterface.describeTable('users')
    if (usersTable.preferred_registrar) await queryInterface.removeColumn('users', 'preferred_registrar')
    if (usersTable.llm_api_key_encrypted) await queryInterface.removeColumn('users', 'llm_api_key_encrypted')
    if (usersTable.llm_model) await queryInterface.removeColumn('users', 'llm_model')
    if (usersTable.llm_provider) await queryInterface.removeColumn('users', 'llm_provider')

    const domainsTable = await queryInterface.describeTable('domains')
    if (domainsTable.appraisal_grade) await queryInterface.removeColumn('domains', 'appraisal_grade')
    if (domainsTable.nameservers) await queryInterface.removeColumn('domains', 'nameservers')
    if (domainsTable.renewal_cost) await queryInterface.removeColumn('domains', 'renewal_cost')
    if (domainsTable.acquisition_cost) await queryInterface.removeColumn('domains', 'acquisition_cost')

    const notificationsTable = await queryInterface.describeTable('notifications')
    if (notificationsTable.updated_at) await queryInterface.removeColumn('notifications', 'updated_at')
  },
}
