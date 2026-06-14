'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('plans', {
      tier: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      price_monthly: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      price_yearly: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      domains: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      rdap_daily: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      ai_daily: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      watchlist: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      wishlist: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      features: {
        type: Sequelize.TEXT,
        defaultValue: '[]',
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // Seed default plans
    await queryInterface.bulkInsert('plans', [
      {
        tier: 'free', name: 'Free', price_monthly: 0, price_yearly: 0,
        domains: 10, rdap_daily: 10, ai_daily: 5, watchlist: 10, wishlist: 5,
        features: '[]', active: true,
        created_at: new Date(), updated_at: new Date(),
      },
      {
        tier: 'premium', name: 'Premium', price_monthly: 29.99, price_yearly: 299.99,
        domains: 1000, rdap_daily: 100, ai_daily: 100, watchlist: 100, wishlist: 50,
        features: '[]', active: true,
        created_at: new Date(), updated_at: new Date(),
      },
      {
        tier: 'enterprise', name: 'Enterprise', price_monthly: 99.99, price_yearly: 999.99,
        domains: -1, rdap_daily: -1, ai_daily: -1, watchlist: -1, wishlist: -1,
        features: '[]', active: true,
        created_at: new Date(), updated_at: new Date(),
      },
    ])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('plans')
  },
}
