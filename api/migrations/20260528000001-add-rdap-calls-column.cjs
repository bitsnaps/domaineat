'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'daily_rdap_calls', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    })

    // Also add daily_ai_calls if it doesn't exist yet (model has it but migration may be missing)
    const tableDesc = await queryInterface.describeTable('users')
    if (!tableDesc.daily_ai_calls) {
      await queryInterface.addColumn('users', 'daily_ai_calls', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      })
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'daily_rdap_calls')
    // Only remove daily_ai_calls if we added it
    const tableDesc = await queryInterface.describeTable('users')
    if (tableDesc.daily_ai_calls) {
      await queryInterface.removeColumn('users', 'daily_ai_calls')
    }
  },
}
