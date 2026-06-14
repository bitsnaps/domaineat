'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      tier: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'free',
        validate: { isIn: [['free', 'premium', 'enterprise']] },
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

    await queryInterface.addIndex('users', ['email'], {
      name: 'users_email_unique',
      unique: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users')
  },
}
