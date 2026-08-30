export type MetalType = 'GOLD' | 'SILVER' | 'PLATINUM' | 'OTHER';

export type MakingChargeType = 'PERCENTAGE' | 'PER_GRAM' | 'FIXED';

export type WastageType = 'PERCENTAGE' | 'WEIGHT' | 'GRAMS' | 'FIXED' | 'NONE';

export type StoneChargeType = 'FIXED' | 'PER_CARAT' | 'PER_PIECE';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

// Centralized GST configuration
export const GST_CONFIG = {
  TOTAL_GST_RATE: 3.0, // 3% total jewelry GST
  CGST_RATE: 1.5,      // 1.5% Central GST
  SGST_RATE: 1.5,      // 1.5% State GST
  IGST_RATE: 3.0,      // 3% Integrated GST
};

export interface ItemCalculationInput {
  metal: MetalType;
  purity: string;
  grossWeight: number;      // in grams
  stoneWeight?: number;     // in grams
  otherWeight?: number;     // in grams
  metalRate: number;        // rate per gram
  
  makingChargeType: MakingChargeType;
  makingChargeRate: number; // percentage (e.g., 12 for 12%), rate per gram, or fixed amount
  
  wastageType: WastageType;
  wastageRate: number;      // percentage, grams of weight, or fixed amount
  
  stoneChargeType?: StoneChargeType;
  stoneRate?: number;       // rate per piece / per carat / fixed amount
  stonePieces?: number;
  stoneWeightCarats?: number; // stone weight in carats
  
  otherCharge?: number;     // other charges (fixed amount)
  
  discountType?: DiscountType;
  discountRate?: number;    // percentage or fixed amount
}

export interface ItemCalculationOutput {
  netWeight: number;
  metalValue: number;
  makingChargeAmount: number;
  wastageAmount: number;
  stoneCharge: number;
  otherCharge: number;
  subtotalBeforeDiscount: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  finalAmount: number;
}

export interface InvoiceCalculationInput {
  items: ItemCalculationInput[];
  isInterState?: boolean;
}

export interface InvoiceCalculationOutput {
  subtotal: number;
  makingChargesTotal: number;
  wastageChargesTotal: number;
  stoneChargesTotal: number;
  otherChargesTotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxAmount: number;
  finalAmount: number;
}

// ----------------------------------------------------
// ROUNDING STRATEGY
// ----------------------------------------------------

/**
 * Rounds weights to 3 decimal places (e.g., 10.123 grams)
 */
export function roundWeight(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/**
 * Rounds money and currency calculations to 2 decimal places
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ----------------------------------------------------
// CORE ENGINE FUNCTIONS
// ----------------------------------------------------

/**
 * Performs complete, safe jewelry item billing calculations.
 * Independent of React and DB libraries.
 */
export function calculateInvoiceItem(
  input: ItemCalculationInput,
  isInterState: boolean = false,
  customTaxes?: { cgst?: number; sgst?: number; igst?: number }
): ItemCalculationOutput {
  // 1. Net Weight = Gross - Stone - Other
  const gross = input.grossWeight || 0;
  const stoneW = input.stoneWeight || 0;
  const otherW = input.otherWeight || 0;
  const netWeight = roundWeight(Math.max(0, gross - stoneW - otherW));

  // 2. Metal Value = Net Weight * Metal Rate
  const metalRate = input.metalRate || 0;
  const metalValue = roundMoney(netWeight * metalRate);

  // 3. Making Charges
  let makingChargeAmount = 0;
  const mcRate = input.makingChargeRate || 0;
  if (input.makingChargeType === 'PERCENTAGE') {
    makingChargeAmount = metalValue * (mcRate / 100);
  } else if (input.makingChargeType === 'PER_GRAM') {
    makingChargeAmount = netWeight * mcRate;
  } else if (input.makingChargeType === 'FIXED') {
    makingChargeAmount = mcRate;
  }
  makingChargeAmount = roundMoney(Math.max(0, makingChargeAmount));

  // 4. Wastage Charges
  let wastageAmount = 0;
  const wasteRate = input.wastageRate || 0;
  if (input.wastageType === 'PERCENTAGE') {
    const wastageWeight = roundWeight(netWeight * (wasteRate / 100));
    wastageAmount = wastageWeight * metalRate;
  } else if (input.wastageType === 'WEIGHT' || input.wastageType === 'GRAMS') {
    const wastageWeight = roundWeight(wasteRate);
    wastageAmount = wastageWeight * metalRate;
  } else if (input.wastageType === 'FIXED') {
    wastageAmount = wasteRate;
  }
  wastageAmount = roundMoney(Math.max(0, wastageAmount));

  // 5. Stone Charges
  let stoneCharge = 0;
  const stRate = input.stoneRate || 0;
  if (input.stoneChargeType === 'FIXED') {
    stoneCharge = stRate;
  } else if (input.stoneChargeType === 'PER_CARAT') {
    const carats = input.stoneWeightCarats || 0;
    stoneCharge = carats * stRate;
  } else if (input.stoneChargeType === 'PER_PIECE') {
    const pieces = input.stonePieces || 0;
    stoneCharge = pieces * stRate;
  }
  stoneCharge = roundMoney(Math.max(0, stoneCharge));

  // 6. Other Charges
  const otherCharge = roundMoney(Math.max(0, input.otherCharge || 0));

  // 7. Subtotal Before Discount
  const subtotalBeforeDiscount = roundMoney(
    metalValue + makingChargeAmount + wastageAmount + stoneCharge + otherCharge
  );

  // 8. Discount
  let discountAmount = 0;
  const discRate = input.discountRate || 0;
  if (input.discountType === 'PERCENTAGE') {
    discountAmount = subtotalBeforeDiscount * (discRate / 100);
  } else if (input.discountType === 'FIXED') {
    discountAmount = discRate;
  }
  discountAmount = roundMoney(Math.max(0, discountAmount));
  if (discountAmount > subtotalBeforeDiscount) {
    discountAmount = subtotalBeforeDiscount; // Clamp discount to prevent negative subtotal
  }

  // 9. Taxable Amount
  const taxableAmount = roundMoney(Math.max(0, subtotalBeforeDiscount - discountAmount));

  // 10. Taxes (CGST, SGST, IGST)
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  const cgstRate = customTaxes?.cgst !== undefined ? customTaxes.cgst : GST_CONFIG.CGST_RATE;
  const sgstRate = customTaxes?.sgst !== undefined ? customTaxes.sgst : GST_CONFIG.SGST_RATE;
  const igstRate = customTaxes?.igst !== undefined ? customTaxes.igst : GST_CONFIG.IGST_RATE;

  if (isInterState) {
    igstAmount = roundMoney(taxableAmount * (igstRate / 100));
  } else {
    cgstAmount = roundMoney(taxableAmount * (cgstRate / 100));
    sgstAmount = roundMoney(taxableAmount * (sgstRate / 100));
  }
  const taxAmount = roundMoney(cgstAmount + sgstAmount + igstAmount);

  // 11. Final Amount
  const finalAmount = roundMoney(taxableAmount + taxAmount);

  return {
    netWeight,
    metalValue,
    makingChargeAmount,
    wastageAmount,
    stoneCharge,
    otherCharge,
    subtotalBeforeDiscount,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxAmount,
    finalAmount,
  };
}

/**
 * Aggregates a list of calculated jewelry items into an invoice summary.
 */
export function calculateInvoiceSummary(
  input: InvoiceCalculationInput,
  customTaxes?: { cgst?: number; sgst?: number; igst?: number }
): InvoiceCalculationOutput {
  const items = input.items || [];
  const isInterState = !!input.isInterState;

  let subtotal = 0;
  let makingChargesTotal = 0;
  let wastageChargesTotal = 0;
  let stoneChargesTotal = 0;
  let otherChargesTotal = 0;
  let discountAmount = 0;
  let taxableAmount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let taxAmount = 0;
  let finalAmount = 0;

  items.forEach((itemInput) => {
    const result = calculateInvoiceItem(itemInput, isInterState, customTaxes);
    subtotal += result.metalValue;
    makingChargesTotal += result.makingChargeAmount;
    wastageChargesTotal += result.wastageAmount;
    stoneChargesTotal += result.stoneCharge;
    otherChargesTotal += result.otherCharge;
    discountAmount += result.discountAmount;
    taxableAmount += result.taxableAmount;
    cgstTotal += result.cgstAmount;
    sgstTotal += result.sgstAmount;
    igstTotal += result.igstAmount;
    taxAmount += result.taxAmount;
    finalAmount += result.finalAmount;
  });

  return {
    subtotal: roundMoney(subtotal),
    makingChargesTotal: roundMoney(makingChargesTotal),
    wastageChargesTotal: roundMoney(wastageChargesTotal),
    stoneChargesTotal: roundMoney(stoneChargesTotal),
    otherChargesTotal: roundMoney(otherChargesTotal),
    discountAmount: roundMoney(discountAmount),
    taxableAmount: roundMoney(taxableAmount),
    cgstTotal: roundMoney(cgstTotal),
    sgstTotal: roundMoney(sgstTotal),
    igstTotal: roundMoney(igstTotal),
    taxAmount: roundMoney(taxAmount),
    finalAmount: roundMoney(finalAmount),
  };
}
