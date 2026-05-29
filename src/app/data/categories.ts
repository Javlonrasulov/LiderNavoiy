export interface Product {
  id: number;
  code: string;
  name: string;
  price: number;
  balance: number;
  sold: number;
  returned: number;
  unit: string;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  products: Product[];
}

export const mainCategories: Category[] = [
  {
    id: 'sherin',
    name: 'SHERIN',
    products: [
      { id: 1,  code: 'ШРДЛ0477', name: 'Делекатес Говяжий в сетка в/у 1,3',       price: 139000, balance: 37.690, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 2,  code: 'ШРДЛ0458', name: 'Рулет Из Языка с копчением 0,9',           price: 189900, balance: 26.390, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 3,  code: 'ШРПК0443', name: 'п/к Салями сетка Шерин 1,4',              price: 97400,  balance: 45.160, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 4,  code: 'ШРВК0474', name: 'Докторская Наклейка Шерин 1,0',           price: 88400,  balance: 13.170, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 5,  code: 'ШРПК0421', name: 'п/к Аркон в/у (0,5)',                     price: 112000, balance: 8.450,  sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 6,  code: 'ШРСС0312', name: 'Сосиска Молочная Шерин 0,5',              price: 54200,  balance: 92.000, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 7,  code: 'ШРВК0388', name: 'Варёная Колбаса Докторская 1,0',          price: 76500,  balance: 31.200, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 8,  code: 'ШРКП0502', name: 'Карбонад Шерин п/к в/у 0,8',             price: 145000, balance: 19.750, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'tim',
    name: 'TIM',
    products: [
      { id: 9,  code: 'ТИМСС0201', name: 'Сосиска Молочная ТИМ 0,5',              price: 48600,  balance: 74.500, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 10, code: 'ТИМВК0145', name: 'Варёная Колбаса ТИМ Любительская 1,0',  price: 69800,  balance: 55.300, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 11, code: 'ТИМКП0388', name: 'Колбаса п/к ТИМ Краковская 0,9',        price: 118500, balance: 22.100, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 12, code: 'ТИМДЛ0421', name: 'Делекатес ТИМ Говяжий в/у 1,2',         price: 152000, balance: 14.680, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'sir',
    name: 'SIR',
    products: [
      { id: 13, code: 'СИРТ0088', name: 'Сыр Твёрдый Российский 1 кг',            price: 95000,  balance: 48.200, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 14, code: 'СИРМ0102', name: 'Сыр Мягкий Адыгейский 0,5 кг',           price: 72000,  balance: 33.600, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 15, code: 'СИРТ0134', name: 'Сыр Голландский п/к 0,8 кг',             price: 108500, balance: 17.400, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  }
];

export const additionalCategories: Category[] = [
  {
    id: 'sir-sklad',
    name: 'Сыр (Sklad)',
    products: [
      { id: 16, code: 'СИРС0044', name: 'Сыр Твёрдый Склад Российский',           price: 88000,  balance: 12.500, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'cheese-house',
    name: 'Cheese house',
    products: [
      { id: 17, code: 'ЧХПР0011', name: 'Cheese House Premium Mix 1,0',            price: 120000, balance: 6.300,  sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'tanlangan',
    name: 'Tanlangan',
    products: [
      { id: 18, code: 'ТАНМ0055', name: 'Tanlangan Mix набор 0,5',                 price: 55000,  balance: 9.800,  sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'xayrli-tong',
    name: 'Xayrli tong',
    products: [
      { id: 19, code: 'ХТСС0077', name: 'Xayrli Tong Sosiski Молочная 0,5',       price: 42000,  balance: 64.000, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'tim-sklad',
    name: 'ТИМ (Sklad)',
    products: [
      { id: 20, code: 'ТИМС0033', name: 'ТИМ Sklad Mix Ассорти 0,8',              price: 46000,  balance: 28.700, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'tim-kopchenye',
    name: 'TIM - Kopchenye',
    products: [
      { id: 21, code: 'ТИМКП0099', name: 'ТИМ Копчёная Колбаса Охотничья 0,5',   price: 68000,  balance: 11.200, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'sherin-sklad',
    name: 'Шерин (Sklad)',
    products: [
      { id: 22, code: 'ШРСК0066', name: 'Шерин Sklad Mix Ассорти 1,0',            price: 51000,  balance: 35.400, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'alo-tam',
    name: "A'LO TA'M",
    products: [
      { id: 23, code: 'АТВК0188', name: "А'ЛО ТА'М Варёная Колбаса в/у 1,0",     price: 49000,  balance: 18.600, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'andalus-sosiki',
    name: 'ANDALUS - Sosiski',
    products: [
      { id: 24, code: 'АНДЛ0092', name: 'Рулет Из Языка Андалус 0,9',             price: 144900, balance: 41.120, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 25, code: 'АНПК0104', name: 'п/к Покон Андалус Янги в/у 1,0',         price: 85500,  balance: 107.880,sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
      { id: 26, code: 'АНДСС0311', name: 'Сосиска Classic Андалус 0,5',           price: 36000,  balance: 83.500, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'andalus-kopchenye',
    name: 'ANDALUS - Kopchenye',
    products: [
      { id: 27, code: 'АНДКП0199', name: 'Андалус Копчёная Mix Ассорти 0,7',      price: 62000,  balance: 24.300, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  },
  {
    id: 'andalus-varenye',
    name: 'ANDALUS - Varenye',
    products: [
      { id: 28, code: 'АНДВК0244', name: 'Андалус Варёная Колбаса Premium 1,0',   price: 58000,  balance: 16.780, sold: 0.000, returned: 0.000, unit: 'Тарози', quantity: 0 },
    ]
  }
];

export const allCategories: Category[] = [...mainCategories, ...additionalCategories];

export function getCategoryById(id: string): Category | undefined {
  return allCategories.find(c => c.id === id);
}

export function getProductById(id: number): { product: Product; category: Category } | undefined {
  for (const cat of allCategories) {
    const product = cat.products.find(p => p.id === id);
    if (product) return { product, category: cat };
  }
  return undefined;
}