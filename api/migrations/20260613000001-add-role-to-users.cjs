'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'user',
    })

    await queryInterface.addIndex('users', ['role'], { name: 'users_role_idx' })

    // Set first user as admin
    await queryInterface.sequelize.query(
      "UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)"
    )
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'users_role_idx')
    await queryInterface.removeColumn('users', 'role')
  },
}
