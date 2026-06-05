import { Injectable, Logger } from '@nestjs/common';

export interface BankUsdRate {
  buy: number;
  sell: number;
}

export interface UsdExchangeRates {
  cbu: { rate: number; date: string };
  banks: {
    hamkorbank: BankUsdRate;
    ipoteka: BankUsdRate;
    agrobank: BankUsdRate;
  };
  updatedAt: string;
}

interface CbuRateRow {
  Ccy: string;
  Rate: string;
  Date: string;
}

const CACHE_TTL_MS = 15 * 60 * 1000;

const BANK_SLUGS = {
  hamkorbank: 'hamkorbank',
  ipoteka: 'ipoteka-bank',
  agrobank: 'agrobank',
} as const;

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private cache: UsdExchangeRates | null = null;
  private cacheExpiresAt = 0;

  async getUsdRates(): Promise<UsdExchangeRates> {
    const now = Date.now();
    if (this.cache && now < this.cacheExpiresAt) {
      return this.cache;
    }

    const [cbu, hamkorbank, ipoteka, agrobank] = await Promise.all([
      this.fetchCbuUsdRate(),
      this.fetchBankUsdRate(BANK_SLUGS.hamkorbank),
      this.fetchBankUsdRate(BANK_SLUGS.ipoteka),
      this.fetchBankUsdRate(BANK_SLUGS.agrobank),
    ]);

    const result: UsdExchangeRates = {
      cbu,
      banks: { hamkorbank, ipoteka, agrobank },
      updatedAt: new Date().toISOString(),
    };

    this.cache = result;
    this.cacheExpiresAt = now + CACHE_TTL_MS;
    return result;
  }

  private async fetchCbuUsdRate(): Promise<{ rate: number; date: string }> {
    try {
      const res = await fetch('https://cbu.uz/oz/arkhiv-kursov-valyut/json/USD/', {
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`CBU HTTP ${res.status}`);
      const rows = (await res.json()) as CbuRateRow[];
      const usd = rows.find(r => r.Ccy === 'USD') ?? rows[0];
      if (!usd?.Rate) throw new Error('CBU USD rate missing');
      return { rate: parseFloat(usd.Rate), date: usd.Date };
    } catch (err) {
      this.logger.warn(`CBU rate fetch failed: ${err}`);
      return { rate: 12_200, date: new Date().toLocaleDateString('ru-RU') };
    }
  }

  private async fetchBankUsdRate(slug: string): Promise<BankUsdRate> {
    try {
      const res = await fetch(`https://bank.uz/uz/currency/bank/${slug}`, {
        headers: { 'User-Agent': 'LiderCRM/1.0' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`bank.uz HTTP ${res.status}`);
      const html = await res.text();
      const match = html.match(/calc\.setCur\((\{[\s\S]*?\})\)/);
      if (!match?.[1]) throw new Error('calc.setCur not found');
      const parsed = JSON.parse(match[1]) as Record<string, { buy: string | number; sell: string | number }>;
      const usd = parsed.USD;
      if (!usd) throw new Error('USD rate missing');
      return {
        buy: Number(usd.buy) || 0,
        sell: Number(usd.sell) || 0,
      };
    } catch (err) {
      this.logger.warn(`Bank rate fetch failed (${slug}): ${err}`);
      return { buy: 0, sell: 0 };
    }
  }
}
