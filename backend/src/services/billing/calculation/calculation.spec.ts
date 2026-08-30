import {
  calculateInvoiceItem,
  calculateInvoiceSummary,
  roundWeight,
  roundMoney,
  ItemCalculationInput,
} from './calculation.engine';

describe('Billing Calculation Engine', () => {
  
  describe('Rounding Strategy', () => {
    it('should round weights to 3 decimal places', () => {
      expect(roundWeight(10.1234)).toBe(10.123);
      expect(roundWeight(10.1236)).toBe(10.124);
      expect(roundWeight(10.1235)).toBe(10.124); // normal round half up
      expect(roundWeight(0)).toBe(0);
    });

    it('should round money to 2 decimal places', () => {
      expect(roundMoney(123.456)).toBe(123.46);
      expect(roundMoney(123.454)).toBe(123.45);
      expect(roundMoney(0.005)).toBe(0.01);
      expect(roundMoney(0)).toBe(0);
    });

    it('should prevent floating point issues (e.g. 0.1 + 0.2)', () => {
      const sum = 0.1 + 0.2; // 0.30000000000000004
      expect(roundMoney(sum)).toBe(0.30);
    });
  });

  describe('Gold Calculation', () => {
    it('should calculate pure gold rate correctly (24K, 10g, no charges)', () => {
      const input: ItemCalculationInput = {
        metal: 'GOLD',
        purity: '24K',
        grossWeight: 10.0,
        metalRate: 7500, // 7500 Rs/g
        makingChargeType: 'FIXED',
        makingChargeRate: 0,
        wastageType: 'NONE',
        wastageRate: 0,
      };
      const res = calculateInvoiceItem(input, false);
      expect(res.netWeight).toBe(10.0);
      expect(res.metalValue).toBe(75000);
      expect(res.taxableAmount).toBe(75000);
      // GST: taxable * 3% = 2250, divided as 1125 CGST + 1125 SGST
      expect(res.cgstAmount).toBe(1125);
      expect(res.sgstAmount).toBe(1125);
      expect(res.igstAmount).toBe(0);
      expect(res.taxAmount).toBe(2250);
      expect(res.finalAmount).toBe(77250);
    });
  });

  describe('Silver Calculation', () => {
    it('should calculate silver with 2 decimal places rate correctly', () => {
      const input: ItemCalculationInput = {
        metal: 'SILVER',
        purity: '999',
        grossWeight: 100.5,
        metalRate: 92.55,
        makingChargeType: 'FIXED',
        makingChargeRate: 0,
        wastageType: 'NONE',
        wastageRate: 0,
      };
      const res = calculateInvoiceItem(input, false);
      expect(res.netWeight).toBe(100.5);
      expect(res.metalValue).toBe(9301.28); // 100.5 * 92.55 = 9301.275 -> 9301.28
      expect(res.taxableAmount).toBe(9301.28);
      // CGST: 9301.28 * 1.5% = 139.5192 -> 139.52
      expect(res.cgstAmount).toBe(139.52);
      expect(res.sgstAmount).toBe(139.52);
      expect(res.taxAmount).toBe(279.04);
      expect(res.finalAmount).toBe(9580.32);
    });
  });

  describe('Purity Configuration & Purity Variation', () => {
    it('should handle custom/configurable purity levels', () => {
      const input: ItemCalculationInput = {
        metal: 'GOLD',
        purity: '22K (916)',
        grossWeight: 10,
        metalRate: 6875,
        makingChargeType: 'FIXED',
        makingChargeRate: 0,
        wastageType: 'NONE',
        wastageRate: 0,
      };
      const res = calculateInvoiceItem(input, false);
      expect(res.metalValue).toBe(68750);
    });
  });

  describe('Making Charges', () => {
    const baseInput: ItemCalculationInput = {
      metal: 'GOLD',
      purity: '22K',
      grossWeight: 10,
      metalRate: 7000,
      makingChargeType: 'FIXED',
      makingChargeRate: 0,
      wastageType: 'NONE',
      wastageRate: 0,
    };

    it('should support PERCENTAGE making charge', () => {
      const input = { ...baseInput, makingChargeType: 'PERCENTAGE' as const, makingChargeRate: 10.5 };
      const res = calculateInvoiceItem(input, false);
      expect(res.metalValue).toBe(70000);
      expect(res.makingChargeAmount).toBe(7350); // 70000 * 10.5% = 7350
      expect(res.taxableAmount).toBe(77350);
    });

    it('should support PER_GRAM making charge', () => {
      const input = { ...baseInput, makingChargeType: 'PER_GRAM' as const, makingChargeRate: 450 };
      const res = calculateInvoiceItem(input, false);
      expect(res.netWeight).toBe(10);
      expect(res.makingChargeAmount).toBe(4500); // 10 * 450 = 4500
      expect(res.taxableAmount).toBe(74500);
    });

    it('should support FIXED making charge', () => {
      const input = { ...baseInput, makingChargeType: 'FIXED' as const, makingChargeRate: 2500 };
      const res = calculateInvoiceItem(input, false);
      expect(res.makingChargeAmount).toBe(2500);
      expect(res.taxableAmount).toBe(72500);
    });
  });

  describe('Wastage Calculations', () => {
    const baseInput: ItemCalculationInput = {
      metal: 'GOLD',
      purity: '24K',
      grossWeight: 15,
      metalRate: 7000,
      makingChargeType: 'FIXED',
      makingChargeRate: 0,
      wastageType: 'NONE',
      wastageRate: 0,
    };

    it('should support PERCENTAGE wastage', () => {
      // 5% wastage on 15g net weight = 0.75g wastage. Wastage value = 0.75 * 7000 = 5250
      const input = { ...baseInput, wastageType: 'PERCENTAGE' as const, wastageRate: 5 };
      const res = calculateInvoiceItem(input, false);
      expect(res.wastageAmount).toBe(5250);
      expect(res.taxableAmount).toBe(110250); // 105000 + 5250
    });

    it('should support WEIGHT / GRAMS wastage', () => {
      // 1.25g wastage * 7000 = 8750
      const input = { ...baseInput, wastageType: 'WEIGHT' as const, wastageRate: 1.25 };
      const res = calculateInvoiceItem(input, false);
      expect(res.wastageAmount).toBe(8750);
      expect(res.taxableAmount).toBe(113750);
    });

    it('should support FIXED wastage charge amount', () => {
      const input = { ...baseInput, wastageType: 'FIXED' as const, wastageRate: 3500 };
      const res = calculateInvoiceItem(input, false);
      expect(res.wastageAmount).toBe(3500);
      expect(res.taxableAmount).toBe(108500);
    });
  });

  describe('Stone Charges', () => {
    const baseInput: ItemCalculationInput = {
      metal: 'GOLD',
      purity: '24K',
      grossWeight: 10,
      metalRate: 7000,
      makingChargeType: 'FIXED',
      makingChargeRate: 0,
      wastageType: 'NONE',
      wastageRate: 0,
    };

    it('should support FIXED stone charge', () => {
      const input = { ...baseInput, stoneChargeType: 'FIXED' as const, stoneRate: 1500 };
      const res = calculateInvoiceItem(input, false);
      expect(res.stoneCharge).toBe(1500);
      expect(res.taxableAmount).toBe(71500);
    });

    it('should support PER_CARAT stone charge', () => {
      // 3.5 carats * 800 = 2800
      const input = {
        ...baseInput,
        stoneChargeType: 'PER_CARAT' as const,
        stoneRate: 800,
        stoneWeightCarats: 3.5,
      };
      const res = calculateInvoiceItem(input, false);
      expect(res.stoneCharge).toBe(2800);
      expect(res.taxableAmount).toBe(72800);
    });

    it('should support PER_PIECE stone charge', () => {
      // 12 stones * 150 = 1800
      const input = {
        ...baseInput,
        stoneChargeType: 'PER_PIECE' as const,
        stoneRate: 150,
        stonePieces: 12,
      };
      const res = calculateInvoiceItem(input, false);
      expect(res.stoneCharge).toBe(1800);
      expect(res.taxableAmount).toBe(71800);
    });
  });

  describe('Discounts', () => {
    const baseInput: ItemCalculationInput = {
      metal: 'GOLD',
      purity: '24K',
      grossWeight: 10,
      metalRate: 7000,
      makingChargeType: 'FIXED',
      makingChargeRate: 3000, // Subtotal before discount = 73000
      wastageType: 'NONE',
      wastageRate: 0,
    };

    it('should support PERCENTAGE discount', () => {
      const input = { ...baseInput, discountType: 'PERCENTAGE' as const, discountRate: 5 };
      const res = calculateInvoiceItem(input, false);
      expect(res.subtotalBeforeDiscount).toBe(73000);
      expect(res.discountAmount).toBe(3650); // 73000 * 5% = 3650
      expect(res.taxableAmount).toBe(69350);
    });

    it('should support FIXED discount', () => {
      const input = { ...baseInput, discountType: 'FIXED' as const, discountRate: 5000 };
      const res = calculateInvoiceItem(input, false);
      expect(res.discountAmount).toBe(5000);
      expect(res.taxableAmount).toBe(68000);
    });

    it('should clamp discount to maximum of subtotal', () => {
      const input = { ...baseInput, discountType: 'FIXED' as const, discountRate: 999999 };
      const res = calculateInvoiceItem(input, false);
      expect(res.discountAmount).toBe(73000);
      expect(res.taxableAmount).toBe(0);
    });
  });

  describe('GST Tax Jurisdiction', () => {
    const baseInput: ItemCalculationInput = {
      metal: 'GOLD',
      purity: '24K',
      grossWeight: 10,
      metalRate: 7000,
      makingChargeType: 'FIXED',
      makingChargeRate: 0,
      wastageType: 'NONE',
      wastageRate: 0,
    };

    it('should calculate CGST + SGST (1.5% each) for Intra-State', () => {
      const res = calculateInvoiceItem(baseInput, false); // isInterState = false
      expect(res.taxableAmount).toBe(70000);
      expect(res.cgstAmount).toBe(1050); // 70000 * 1.5%
      expect(res.sgstAmount).toBe(1050); // 70000 * 1.5%
      expect(res.igstAmount).toBe(0);
      expect(res.taxAmount).toBe(2100);
      expect(res.finalAmount).toBe(72100);
    });

    it('should calculate IGST (3%) for Inter-State', () => {
      const res = calculateInvoiceItem(baseInput, true); // isInterState = true
      expect(res.taxableAmount).toBe(70000);
      expect(res.cgstAmount).toBe(0);
      expect(res.sgstAmount).toBe(0);
      expect(res.igstAmount).toBe(2100); // 70000 * 3%
      expect(res.taxAmount).toBe(2100);
      expect(res.finalAmount).toBe(72100);
    });
  });

  describe('Multiple Items and Invoice Aggregation', () => {
    it('should correctly sum multiple items with individual parameters', () => {
      const items: ItemCalculationInput[] = [
        {
          metal: 'GOLD',
          purity: '22K',
          grossWeight: 10,
          metalRate: 6000,
          makingChargeType: 'PER_GRAM',
          makingChargeRate: 350, // 3500 MC. Subtotal = 63500
          wastageType: 'PERCENTAGE',
          wastageRate: 2, // 0.2g wastage * 6000 = 1200. Subtotal = 64700
          discountType: 'FIXED',
          discountRate: 700, // Taxable = 64000
        },
        {
          metal: 'SILVER',
          purity: 'Sterling',
          grossWeight: 100,
          stoneWeight: 10, // netWeight = 90
          metalRate: 90, // metalValue = 8100
          makingChargeType: 'FIXED',
          makingChargeRate: 1500, // Subtotal = 9600
          wastageType: 'NONE',
          wastageRate: 0,
        }
      ];

      const res = calculateInvoiceSummary({ items, isInterState: false });
      // Item 1: taxable = 64000, cgst = 960, sgst = 960, final = 65920
      // Item 2: taxable = 9600, cgst = 144, sgst = 144, final = 9888
      // Total subtotal (metal values only): 60000 + 8100 = 68100
      // Total making charges: 3500 + 1500 = 5000
      // Total wastage charges: 1200 + 0 = 1200
      // Total taxable amount: 64000 + 9600 = 73600
      // Total tax: 1920 + 288 = 2208
      // Total final amount: 65920 + 9888 = 75808
      
      expect(res.subtotal).toBe(68100);
      expect(res.makingChargesTotal).toBe(5000);
      expect(res.wastageChargesTotal).toBe(1200);
      expect(res.discountAmount).toBe(700);
      expect(res.taxableAmount).toBe(73600);
      expect(res.cgstTotal).toBe(1104); // 960 + 144
      expect(res.sgstTotal).toBe(1104); // 960 + 144
      expect(res.igstTotal).toBe(0);
      expect(res.taxAmount).toBe(2208);
      expect(res.finalAmount).toBe(75808);
    });
  });

  describe('Edge Cases & Safeguards', () => {
    it('should handle zero weight or zero rates gracefully without crashing', () => {
      const input: ItemCalculationInput = {
        metal: 'GOLD',
        purity: '24K',
        grossWeight: 0,
        metalRate: 0,
        makingChargeType: 'PERCENTAGE',
        makingChargeRate: 10,
        wastageType: 'PERCENTAGE',
        wastageRate: 5,
      };
      const res = calculateInvoiceItem(input, false);
      expect(res.netWeight).toBe(0);
      expect(res.metalValue).toBe(0);
      expect(res.makingChargeAmount).toBe(0);
      expect(res.wastageAmount).toBe(0);
      expect(res.taxableAmount).toBe(0);
      expect(res.finalAmount).toBe(0);
    });

    it('should clamp weights to 0 if stone/other weights exceed gross weight', () => {
      const input: ItemCalculationInput = {
        metal: 'GOLD',
        purity: '24K',
        grossWeight: 5,
        stoneWeight: 10, // exceeds gross weight
        metalRate: 7000,
        makingChargeType: 'FIXED',
        makingChargeRate: 0,
        wastageType: 'NONE',
        wastageRate: 0,
      };
      const res = calculateInvoiceItem(input, false);
      expect(res.netWeight).toBe(0);
      expect(res.metalValue).toBe(0);
    });

    it('should support extremely large values correctly without floating point overflow', () => {
      const input: ItemCalculationInput = {
        metal: 'GOLD',
        purity: '24K',
        grossWeight: 99999.999,
        metalRate: 999999,
        makingChargeType: 'FIXED',
        makingChargeRate: 9999999,
        wastageType: 'FIXED',
        wastageRate: 9999999,
      };
      const res = calculateInvoiceItem(input, false);
      expect(res.netWeight).toBe(99999.999);
      expect(res.metalValue).toBe(99999899000.00); // 99999.999 * 999999 = 99999899000.001 -> 99999899000.00
      expect(res.taxableAmount).toBe(100019898998.00);
      expect(res.finalAmount).toBe(103020495967.94);
    });
  });
});
