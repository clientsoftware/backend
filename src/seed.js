import User from './models/User.js';
import Product from './models/Product.js';
import Customer from './models/Customer.js';
import Rate from './models/Rate.js';
import ReportGroup from './models/ReportGroup.js';
import LedgerEntry from './models/LedgerEntry.js';
import { getSettings } from './models/Settings.js';

export async function seedDatabase() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create({
      name: 'Admin',
      email: 'admin@coppermart.app',
      password: 'admin123',
      role: 'Admin',
    });
    console.log('Seeded admin user: admin@coppermart.app / admin123');
  }

  await getSettings();

  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany([
      {
        name: 'Copper Wire',
        category: 'Copper',
        primaryUnit: 'Kg',
        secondaryUnit: 'Pieces',
        conversionRate: 1,
        costPrice: 780,
        salePrice: 850,
        stockInSecondaryUnit: 250,
        isScrapItem: false,
        lowStockThreshold: 20,
      },
      {
        name: 'Copper Sheet',
        category: 'Copper',
        primaryUnit: 'Kg',
        secondaryUnit: 'Sheet',
        conversionRate: 5,
        costPrice: 800,
        salePrice: 880,
        stockInSecondaryUnit: 40,
        isScrapItem: false,
        lowStockThreshold: 10,
      },
      {
        name: 'Mixed Scrap',
        category: 'Scrap',
        primaryUnit: 'Kg',
        secondaryUnit: 'Pieces',
        conversionRate: 1,
        costPrice: 380,
        salePrice: 420,
        stockInSecondaryUnit: 500,
        isScrapItem: true,
        lowStockThreshold: 50,
      },
      {
        name: 'Brass Scrap',
        category: 'Scrap',
        primaryUnit: 'Kg',
        secondaryUnit: 'Pieces',
        conversionRate: 1,
        costPrice: 400,
        salePrice: 450,
        stockInSecondaryUnit: 120,
        isScrapItem: true,
        lowStockThreshold: 30,
      },
    ]);
    console.log('Seeded sample products');
  }

  if ((await Customer.countDocuments()) === 0) {
    const [c1, c2] = await Customer.insertMany([
      {
        name: 'Ramesh Traders',
        contact: '9876501234',
        phone: '9876501234',
        address: 'Market Road',
        creditLimit: 100000,
        currentDueBalance: 25000,
      },
      {
        name: 'City Metals',
        contact: '9123456780',
        phone: '9123456780',
        address: 'Industrial Area',
        creditLimit: 50000,
        currentDueBalance: 62000,
      },
      {
        name: 'Local Walk-in',
        contact: '9000011111',
        phone: '9000011111',
        creditLimit: 10000,
        currentDueBalance: 0,
      },
    ]);

    await LedgerEntry.insertMany([
      {
        customer: c1._id,
        description: 'Opening balance',
        debit: 25000,
        credit: 0,
        balance: 25000,
        refType: 'opening',
        date: new Date(Date.now() - 12 * 86400000),
      },
      {
        customer: c2._id,
        description: 'Opening balance',
        debit: 62000,
        credit: 0,
        balance: 62000,
        refType: 'opening',
        date: new Date(Date.now() - 20 * 86400000),
      },
    ]);
    console.log('Seeded sample customers');
  }

  if ((await Rate.countDocuments()) === 0) {
    await Rate.insertMany([
      { itemType: 'Copper', rate: 850, effectiveDate: new Date() },
      { itemType: 'Scrap', rate: 420, effectiveDate: new Date() },
    ]);
    console.log('Seeded rates');
  }

  if ((await ReportGroup.countDocuments()) === 0) {
    await ReportGroup.insertMany([
      { name: 'Scrap Sales', description: 'Scrap-only sales reports', categoryFilter: 'Scrap' },
      { name: 'Copper Sales', description: 'Copper sales reports', categoryFilter: 'Copper' },
      { name: 'Company Dispatch', description: 'Bulk dispatch P&L' },
    ]);
  }
}
