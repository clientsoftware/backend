/**
 * Unit conversion helpers
 * Stock is always stored in secondary (base) units.
 * conversionRate = how many secondary units equal 1 primary unit
 * e.g. 1 Box = 12 Pieces → conversionRate = 12
 */

export function toSecondary(qty, unitUsed, conversionRate) {
  const q = Number(qty) || 0;
  const rate = Number(conversionRate) || 1;
  if (unitUsed === 'primary') return q * rate;
  return q;
}

export function toPrimary(stockInSecondary, conversionRate) {
  const rate = Number(conversionRate) || 1;
  return rate === 0 ? 0 : (Number(stockInSecondary) || 0) / rate;
}

export function displayStock(product) {
  const secondary = Number(product.stockInSecondaryUnit) || 0;
  const rate = Number(product.conversionRate) || 1;
  return {
    secondary,
    primary: toPrimary(secondary, rate),
    primaryUnit: product.primaryUnit,
    secondaryUnit: product.secondaryUnit,
  };
}

/** Normalize product for frontend (adds currentStock alias in primary units) */
export function serializeProduct(product) {
  const obj = product.toObject ? product.toObject() : { ...product };
  const stock = displayStock(obj);
  return {
    ...obj,
    currentStock: stock.primary,
    stockPrimary: stock.primary,
    stockSecondary: stock.secondary,
  };
}
