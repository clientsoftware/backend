import Rate from '../models/Rate.js';
import User from '../models/User.js';
import { ok, created } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

async function latestRate(itemType) {
  return Rate.findOne({ itemType: new RegExp(`^${itemType}$`, 'i') }).sort({ effectiveDate: -1 });
}

async function insertRate(itemType, rate, userId) {
  const prev = await latestRate(itemType);
  return Rate.create({
    itemType,
    rate: Number(rate),
    effectiveDate: new Date(),
    setBy: userId && userId !== 'demo' ? userId : undefined,
    previousRate: prev?.rate,
  });
}

/**
 * Set rates — ALWAYS inserts new history rows (never overwrite)
 * Body: { copper, scrap, others:[{itemType,rate}] } or { itemType, rate }
 */
export const setRates = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const userId = req.user?._id;
  const createdRates = [];

  if (body.itemType != null && body.rate != null) {
    createdRates.push(await insertRate(body.itemType, body.rate, userId));
  }

  if (body.copper != null) createdRates.push(await insertRate('Copper', body.copper, userId));
  if (body.scrap != null) createdRates.push(await insertRate('Scrap', body.scrap, userId));

  if (Array.isArray(body.others)) {
    for (const o of body.others) {
      if (o.itemType && o.rate != null) {
        createdRates.push(await insertRate(o.itemType, o.rate, userId));
      }
    }
  }

  const current = await getCurrentRatesData();
  return created(res, { inserted: createdRates, current }, 'Rates updated (history preserved)');
});

async function getCurrentRatesData() {
  const types = await Rate.distinct('itemType');
  const result = { copper: 0, scrap: 0, others: [] };
  for (const t of types) {
    const latest = await latestRate(t);
    if (!latest) continue;
    const key = t.toLowerCase();
    if (key === 'copper') result.copper = latest.rate;
    else if (key === 'scrap') result.scrap = latest.rate;
    else result.others.push({ itemType: t, rate: latest.rate, effectiveDate: latest.effectiveDate });
  }
  return result;
}

export const getCurrentRates = asyncHandler(async (_req, res) => {
  return ok(res, await getCurrentRatesData());
});

export const getRateHistory = asyncHandler(async (_req, res) => {
  const rows = await Rate.find().sort({ effectiveDate: -1 }).populate('setBy', 'name').limit(200);
  return ok(
    res,
    rows.map((r) => ({
      _id: r._id,
      date: r.effectiveDate,
      item: r.itemType,
      oldRate: r.previousRate,
      newRate: r.rate,
      updatedBy: r.setBy?.name || 'System',
    }))
  );
});
