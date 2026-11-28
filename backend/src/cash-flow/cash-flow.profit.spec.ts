/**
 * Nazorat: 10 dona × 12 000 sotuv, 8 000 tannarx → sof 120k, cogs 80k, foyda 40k.
 * Guruh yig‘indisi ichki bandlardan, ikki marta hisoblanmasin.
 */

describe('Kirim-chiqim sales profit math', () => {
  it('computes net sales, cogs and gross profit for sample sale', () => {
    const qty = 10;
    const price = 12_000;
    const unitCost = 8_000;
    const netSales = qty * price;
    const cogs = qty * unitCost;
    const grossProfit = netSales - cogs;
    const margin = (grossProfit / netSales) * 100;

    expect(netSales).toBe(120_000);
    expect(cogs).toBe(80_000);
    expect(grossProfit).toBe(40_000);
    expect(margin).toBeCloseTo(33.333, 2);
  });

  it('cash income only counts paid amount, not full sale on credit', () => {
    const saleTotal = 120_000;
    const paidNow = 70_000;
    const cashIncome = paidNow; // deferred remainder excluded until collected
    expect(cashIncome).toBe(70_000);
    expect(cashIncome).toBeLessThan(saleTotal);
  });

  it('group total equals sum of leaf operations without double counting parents', () => {
    const leaves = [
      57_900_000, 22_480_000, 163_000, 13_274_000, 1_495_000, 35_000,
      5_210_000, 500_000, 18_547_000, 1_320_000, 625_000, 150_000,
    ];
    const ofisga = leaves.reduce((s, n) => s + n, 0);
    expect(ofisga).toBe(121_699_000);

    // Parent groups store only leaf sums once in tree aggregation
    const tree = {
      name: 'Ofis (Zarafshon)',
      amount: 160_095_000,
      children: [
        { name: 'Tok puli', amount: 6_758_000, children: [] },
        { name: 'Produkta', amount: 31_638_000, children: [] },
        { name: 'Ofisga', amount: ofisga, children: leaves.map((a) => ({ amount: a })) },
      ],
    };
    const childSum = tree.children.reduce((s, c) => s + c.amount, 0);
    expect(childSum).toBe(tree.amount);

    // Reporting total of four top groups from customer report (reference only)
    const top = [89_134_000, 55_430_000, 16_265_000, 160_095_000];
    expect(top.reduce((s, n) => s + n, 0)).toBe(320_924_000);
  });

  it('margin is dash when net sales is zero', () => {
    const netSales = 0;
    const grossProfit = 0;
    const marginPct = netSales > 0 ? (grossProfit / netSales) * 100 : null;
    expect(marginPct).toBeNull();
  });

  it('does not inflate profit when unit cost is missing', () => {
    const netSales = 120_000;
    const unitCost: number | null = null;
    const cogs = unitCost != null ? 10 * unitCost : null;
    const grossProfit = cogs != null ? netSales - cogs : null;
    expect(cogs).toBeNull();
    expect(grossProfit).toBeNull();
  });
});
