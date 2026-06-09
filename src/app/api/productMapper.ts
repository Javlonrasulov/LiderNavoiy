import type { AdminProduct, TipTo } from '../data/adminProducts';

export interface BackendProduct {
  id: string;
  code: string;
  name: string;
  category: string | null;
  brand: string | null;
  price: number | string;
  unit: string;
  stockBalance: number | string;
  imageUrl?: string | null;
  isActive?: boolean;
}

export function unitToTipTo(unit: string): TipTo {
  const normalized = unit.trim().toLowerCase();
  if (normalized === 'kg' || normalized === 'кг' || normalized === 'g' || normalized === 'gr') {
    return 'Тарози';
  }
  return 'Штучн.';
}

export function tipToToUnit(tipTo: TipTo): string {
  if (tipTo === 'Тарози' || tipTo === 'Весов.') return 'kg';
  return 'dona';
}

function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value) || 0;
}

export function backendToAdminProduct(
  product: BackendProduct,
  org = 'boran',
): AdminProduct {
  const tipTo = unitToTipTo(product.unit);
  const price = toNumber(product.price);
  const stock = toNumber(product.stockBalance);
  const brand = product.brand ?? '';
  const category = product.category ?? brand;

  return {
    id: product.id,
    kod: product.code,
    org,
    ismi: product.name,
    p1: 9,
    tipTo,
    artikul: product.code,
    brend: brand,
    gruppa: category,
    srok: 12,
    postavshik: '',
    shtUpakovka: 1,
    netto: tipTo === 'Штучн.' ? 1 : 1,
    brutto: tipTo === 'Штучн.' ? 1.05 : 1.02,
    exId: Number(product.code.replace(/\D/g, '').slice(-3)) || 0,
    rtl: price,
    shtrixKod: '',
    ikpu: '',
    balance: stock,
    imageUrl: product.imageUrl ?? null,
  };
}

export function adminToCreatePayload(product: AdminProduct) {
  return {
    code: product.kod,
    name: product.ismi,
    category: product.gruppa || product.brend || undefined,
    brand: product.brend || undefined,
    price: product.rtl,
    unit: tipToToUnit(product.tipTo),
    stockBalance: product.balance,
    imageUrl: product.imageUrl ?? undefined,
  };
}

export function adminToUpdatePayload(product: AdminProduct) {
  return {
    ...adminToCreatePayload(product),
    imageUrl: product.imageUrl ?? null,
  };
}
