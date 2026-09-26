import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'main' },
    business: {
      name: { type: String, default: 'CopperMart Trading' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      gstin: { type: String, default: '' },
      city: { type: String, default: '' },
    },
    invoice: {
      prefix: { type: String, default: 'INV' },
      footerNote: { type: String, default: 'Thank you for your business!' },
      showLogo: { type: Boolean, default: true },
      terms: { type: String, default: '' },
    },
    units: [{ name: String }],
    categories: [{ name: String }],
    cashInHand: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);

export async function getSettings() {
  let doc = await mongoose.model('Settings').findOne({ key: 'main' });
  if (!doc) {
    doc = await mongoose.model('Settings').create({
      key: 'main',
      units: [{ name: 'Kg' }, { name: 'Box' }, { name: 'Pieces' }, { name: 'Ton' }],
      categories: [{ name: 'Copper' }, { name: 'Scrap' }, { name: 'Brass' }, { name: 'General' }],
      cashInHand: 50000,
    });
  }
  return doc;
}
