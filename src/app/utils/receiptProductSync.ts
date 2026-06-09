import { api } from '../api/client';

export interface ReceiptLineItem {
  id: number;
  productId?: string;
  tovar: string;
  artikul: string;
  kolFakt: number;
  kolBrak: number;
  upakovka: string;
  tsenaPost: number;
  skid: number;
  tsenaPriv: number;
}

type BackendProduct = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  brand: string | null;
  price: number | string;
  unit: string;
  stockBalance: number | string;
};

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v) || 0;
}

function unitFromPack(upakovka: string): string {
  const u = upakovka.trim().toLowerCase();
  return u.includes('кг') || u === 'kg' ? 'kg' : 'dona';
}

const SUPPLIER_PRICE_KEY = 'lider_supplier_prices';

function hasApiToken(): boolean {
  return typeof localStorage !== 'undefined' && !!localStorage.getItem('api_access_token');
}

export function readSupplierPriceCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SUPPLIER_PRICE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeSupplierPriceCache(productId: string, price: number) {
  const cache = readSupplierPriceCache();
  cache[productId] = price;
  localStorage.setItem(SUPPLIER_PRICE_KEY, JSON.stringify(cache));
}

/** Saqlangan yetkazib berish narxini qaytaradi (kesh + katalog) */
export function resolveSupplierPrice(productId: string, catalogPrice: number): number {
  const cached = readSupplierPriceCache()[productId];
  if (cached != null && cached > 0) return cached;
  return catalogPrice > 0 ? catalogPrice : 0;
}

/** Yetkazib berish narxini mahsulot katalogiga yozadi */
export async function persistSupplierPrice(productId: string, price: number): Promise<void> {
  if (!productId || price <= 0) return;
  writeSupplierPriceCache(productId, price);
  if (!hasApiToken()) return;
  await api.updateProduct(productId, { price });
  window.dispatchEvent(new CustomEvent('admin-products-changed'));
}

function uniqueCode(base: string, used: Set<string>): string {
  const clean = base.trim() || `RC${Date.now().slice(-6)}`;
  if (!used.has(clean.toLowerCase())) {
    used.add(clean.toLowerCase());
    return clean;
  }
  let i = 1;
  while (used.has(`${clean}-${i}`.toLowerCase())) i += 1;
  const code = `${clean}-${i}`;
  used.add(code.toLowerCase());
  return code;
}

/** Ta'minotchidan kirim qatorlarini mahsulotlar katalogiga yozadi */
export async function syncReceiptItemsToCatalog(
  items: ReceiptLineItem[],
  context: { direction?: string; supplier?: string },
): Promise<void> {
  const existing = await api.getProducts();
  const byId = new Map<string, BackendProduct>(existing.map(p => [p.id, p]));
  const byCode = new Map<string, BackendProduct>();
  const byName = new Map<string, BackendProduct>();
  for (const p of existing) {
    byCode.set(p.code.trim().toLowerCase(), p);
    byName.set(p.name.trim().toLowerCase(), p);
  }
  const usedCodes = new Set(existing.map(p => p.code.trim().toLowerCase()));

  for (const item of items) {
    const qty = item.kolFakt - (item.kolBrak || 0);
    if (qty <= 0 || !item.tovar.trim()) continue;

    const unit = unitFromPack(item.upakovka);
    const price = item.tsenaPost > 0 ? item.tsenaPost : item.tsenaPriv;
    const brand = context.direction?.trim() || undefined;

    const applyStock = async (product: BackendProduct) => {
      const nextStock = toNum(product.stockBalance) + qty;
      const updated = await api.updateProduct(product.id, {
        stockBalance: nextStock,
        ...(price > 0 ? { price } : {}),
      });
      byId.set(product.id, updated);
      byCode.set(updated.code.trim().toLowerCase(), updated);
      byName.set(updated.name.trim().toLowerCase(), updated);
    };

    if (item.productId && byId.has(item.productId)) {
      await applyStock(byId.get(item.productId)!);
      continue;
    }

    const codeKey = item.artikul.trim().toLowerCase();
    const nameKey = item.tovar.trim().toLowerCase();
    const matched = (codeKey && byCode.get(codeKey))
      ?? (nameKey && byName.get(nameKey));

    if (matched) {
      await applyStock(matched);
      continue;
    }

    const code = uniqueCode(item.artikul.trim() || `RC${item.id}`, usedCodes);
    try {
      const created = await api.createProduct({
        code,
        name: item.tovar.trim(),
        category: brand,
        brand,
        price: price || 0,
        unit,
        stockBalance: qty,
      });
      byId.set(created.id, created);
      byCode.set(created.code.trim().toLowerCase(), created);
      byName.set(created.name.trim().toLowerCase(), created);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes('name already exists')) {
        const byNameHit = byName.get(nameKey);
        if (byNameHit) {
          await applyStock(byNameHit);
          continue;
        }
      }
      if (msg.toLowerCase().includes('code already exists')) {
        const byCodeHit = byCode.get(code.toLowerCase());
        if (byCodeHit) {
          await applyStock(byCodeHit);
          continue;
        }
      }
      throw error;
    }
  }

  window.dispatchEvent(new CustomEvent('admin-products-changed'));
}
