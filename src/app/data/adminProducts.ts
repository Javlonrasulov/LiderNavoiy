// ─── Admin Products — extended product catalog ────────────────────────────────

import { demo } from './demoLimit';

export type TipTo = 'Штучн.' | 'Тарози' | 'Весов.';

export interface AdminProduct {
  id: string;
  kod: string;           // Код
  org: string;           // Организация (boran | zarafshon | mipter | navruz | sarbon | atlas)
  ismi: string;          // Наименование
  p1: number;            // П1 (type code number)
  tipTo: TipTo;          // Тип Товара
  artikul: string;       // Артикул
  brend: string;         // Бренд
  gruppa: string;        // Группа
  srok: number;          // Срок (months)
  postavshik: string;    // Поставщик
  shtUpakovka: number;   // шт.упак
  netto: number;         // Нетто
  brutto: number;        // Брутто
  exId: number;          // ExID
  rtl: number;           // RTL (retail price)
  shtrixKod: string;     // Штрих код
  ikpu: string;          // ИКПУ
  balance: number;       // Qoldiq
  imageUrl?: string | null;
}

export const ADMIN_ORGS = demo([
  { id: 'boran',     label: 'Boran' },
  { id: 'zarafshon', label: 'Zarafshon' },
  { id: 'mipter',   label: 'Mipter' },
  { id: 'navruz',   label: 'Navruz' },
  { id: 'sarbon',   label: 'Sarbon' },
  { id: 'atlas',    label: 'Atlas' },
]);

const ADMIN_PRODUCTS_RAW = demo([
  // ── SOF IN / PILLER ── (Boran)
  { id:1,   kod:'10645', org:'boran',     ismi:'Масло Сливочное "PILLER" 82.5% 500 гр',         p1:9,  tipTo:'Штучн.', artikul:'PL-001', brend:'PILLER',   gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:10, netto:1.000, brutto:1.050, exId:645, rtl:28500, shtrixKod:'4600100064501', ikpu:'10200645', balance:45 },
  { id:2,   kod:'10646', org:'boran',     ismi:'Масло Сливочное растительное "PILLER" 82.5%',   p1:9,  tipTo:'Штучн.', artikul:'PL-002', brend:'PILLER',   gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:10, netto:1.000, brutto:1.050, exId:646, rtl:26900, shtrixKod:'4600100064601', ikpu:'10200646', balance:32 },
  { id:3,   kod:'10647', org:'boran',     ismi:'Масло Сливочное растительное "PILLER" 82% 300', p1:36, tipTo:'Штучн.', artikul:'PL-003', brend:'PILLER',   gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:10, netto:1.000, brutto:1.050, exId:647, rtl:19900, shtrixKod:'4600100064701', ikpu:'10200647', balance:60 },
  { id:4,   kod:'10648', org:'boran',     ismi:'Масло Сливочное "PILLER" 82.5% 200 гр',         p1:35, tipTo:'Штучн.', artikul:'PL-004', brend:'PILLER',   gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:15, netto:1.000, brutto:1.050, exId:648, rtl:14500, shtrixKod:'4600100064801', ikpu:'10200648', balance:80 },
  { id:5,   kod:'10649', org:'boran',     ismi:'Масло Сливочное растительное "PILLER" 82%',     p1:38, tipTo:'Штучн.', artikul:'PL-005', brend:'PILLER',   gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:15, netto:1.000, brutto:1.050, exId:649, rtl:11200, shtrixKod:'4600100064901', ikpu:'10200649', balance:25 },
  { id:6,   kod:'10650', org:'boran',     ismi:'Масло Сливочное "PILLER" 82.5% 15 гр',          p1:41, tipTo:'Штучн.', artikul:'PL-006', brend:'PILLER',   gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:1,  netto:1.000, brutto:1.010, exId:650, rtl:3800,  shtrixKod:'4600100065001', ikpu:'10200650', balance:120 },

  // ── SHERIN (Boran)
  { id:7,   kod:'10651', org:'boran',     ismi:'Докторская Андалус мини (0.5)',                  p1:12, tipTo:'Тарози', artikul:'АНВКО', brend:'ANDALUS',  gruppa:'Шерин (Склад)',  srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:1.000, brutto:1.020, exId:651, rtl:42000, shtrixKod:'4650200065101', ikpu:'10200651', balance:41 },
  { id:8,   kod:'10652', org:'boran',     ismi:'Шербет Олпос 0.9',                              p1:12, tipTo:'Тарози', artikul:'ТMBКО', brend:'TIM',      gruppa:'ТИМ (Склад)',    srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:0.900, brutto:0.920, exId:652, rtl:38500, shtrixKod:'4650200065201', ikpu:'10200652', balance:28 },
  { id:9,   kod:'10653', org:'boran',     ismi:'Для Завтрака Нур мини (0.5)',                   p1:12, tipTo:'Весов.', artikul:'ШР-053', brend:'SHERIN',  gruppa:'Шерин (Склад)',  srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:0.500, brutto:0.510, exId:653, rtl:35000, shtrixKod:'4650200065301', ikpu:'10200653', balance:15 },
  { id:10,  kod:'10654', org:'boran',     ismi:'Деликатес Думалок',                             p1:12, tipTo:'Весов.', artikul:'ШР-054', brend:'SHERIN',  gruppa:'Шерин (Склад)',  srok:12, postavshik:'ЧП "MILKY" MCH...',    shtUpakovka:1,  netto:0.500, brutto:0.510, exId:654, rtl:29500, shtrixKod:'4650200065401', ikpu:'10200654', balance:9 },
  { id:11,  kod:'10655', org:'boran',     ismi:'AT Cалями Балиций (1.2)',                       p1:12, tipTo:'Тарози', artikul:'АТ-055', brend:"A'LO TA'M",gruppa:"A'lo ta'm",     srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:1.200, brutto:1.220, exId:655, rtl:49000, shtrixKod:'4650200065501', ikpu:'10200655', balance:22 },
  { id:12,  kod:'10656', org:'boran',     ismi:'Рулет Из Языка с копчением 0.9',                p1:12, tipTo:'Тарози', artikul:'ШР-056', brend:'SHERIN',  gruppa:'Шерин (Склад)',  srok:15, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:0.900, brutto:0.920, exId:656, rtl:58000, shtrixKod:'4650200065601', ikpu:'10200656', balance:31 },

  // ── Zarafshon
  { id:13,  kod:'10701', org:'zarafshon', ismi:'п/к Салями сетка Заравшон 1.4',                 p1:12, tipTo:'Тарози', artikul:'ЗАР-01', brend:'SHERIN',  gruppa:'Шерин (Склад)',  srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:1.400, brutto:1.430, exId:701, rtl:97400, shtrixKod:'4650300070101', ikpu:'10200701', balance:45 },
  { id:14,  kod:'10702', org:'zarafshon', ismi:'Сосиска Молочная Заравшон 0.5',                 p1:12, tipTo:'Тарози', artikul:'ЗАР-02', brend:'SHERIN',  gruppa:'Шерин (Склад)',  srok:10, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:0.500, brutto:0.510, exId:702, rtl:54200, shtrixKod:'4650300070201', ikpu:'10200702', balance:92 },
  { id:15,  kod:'10703', org:'zarafshon', ismi:'Масло "PILLER" 500 гр Заравшон',                p1:9,  tipTo:'Штучн.', artikul:'ЗАР-03', brend:'PILLER',  gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:10, netto:1.000, brutto:1.050, exId:703, rtl:28500, shtrixKod:'4650300070301', ikpu:'10200703', balance:18 },
  { id:16,  kod:'10704', org:'zarafshon', ismi:'Карбонад Заравшон п/к в/у 0.8',                 p1:12, tipTo:'Тарози', artikul:'ЗАР-04', brend:'TIM',     gruppa:'ТИМ (Склад)',    srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:0.800, brutto:0.820, exId:704, rtl:68000, shtrixKod:'4650300070401', ikpu:'10200704', balance:14 },
  { id:17,  kod:'10705', org:'zarafshon', ismi:'Сыр Твёрдый Российский Заравшон 1 кг',          p1:8,  tipTo:'Тарози', artikul:'ЗАР-05', brend:'SIR',     gruppa:'Сыр (Склад)',    srok:60, postavshik:'Беларус Сыр Г...',      shtUpakovka:1,  netto:1.000, brutto:1.020, exId:705, rtl:95000, shtrixKod:'4650300070501', ikpu:'10200705', balance:48 },
  { id:18,  kod:'10706', org:'zarafshon', ismi:'Варёная Колбаса ТИМ Любительская 1.0',          p1:12, tipTo:'Тарози', artikul:'ЗАР-06', brend:'TIM',     gruppa:'ТИМ (Склад)',    srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:1.000, brutto:1.020, exId:706, rtl:69800, shtrixKod:'4650300070601', ikpu:'10200706', balance:55 },

  // ── Mipter
  { id:19,  kod:'10801', org:'mipter',   ismi:'Докторская Наклейка Мипter 1.0',                 p1:12, tipTo:'Тарози', artikul:'МИП-01', brend:'SHERIN',  gruppa:'Шерин (Склад)',  srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:1.000, brutto:1.020, exId:801, rtl:88400, shtrixKod:'4650400080101', ikpu:'10200801', balance:13 },
  { id:20,  kod:'10802', org:'mipter',   ismi:'п/к Аркон в/у Mipter (0.5)',                    p1:12, tipTo:'Тарози', artikul:'МИП-02', brend:'SHERIN',  gruppa:'Шерин (Склад)',  srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:0.500, brutto:0.510, exId:802, rtl:112000,shtrixKod:'4650400080201', ikpu:'10200802', balance:8 },
  { id:21,  kod:'10803', org:'mipter',   ismi:'Масло Сливочное "PILLER" 200 гр Mipter',         p1:35, tipTo:'Штучн.', artikul:'МИП-03', brend:'PILLER',  gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:15, netto:1.000, brutto:1.050, exId:803, rtl:14500, shtrixKod:'4650400080301', ikpu:'10200803', balance:40 },
  { id:22,  kod:'10804', org:'mipter',   ismi:'Сосиска Classic Андалус Mipter 0.5',             p1:12, tipTo:'Тарози', artikul:'МИП-04', brend:'ANDALUS', gruppa:'Шерин (Склад)',  srok:10, postavshik:'AHBK0...ANDALUS',      shtUpakovka:1,  netto:0.500, brutto:0.510, exId:804, rtl:36000, shtrixKod:'4650400080401', ikpu:'10200804', balance:83 },

  // ── Navruz
  { id:23,  kod:'10901', org:'navruz',   ismi:'Колбаса п/к ТИМ Краковская 0.9',                p1:12, tipTo:'Тарози', artikul:'НАВ-01', brend:'TIM',     gruppa:'ТИМ (Склад)',    srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:0.900, brutto:0.920, exId:901, rtl:118500,shtrixKod:'4650500090101', ikpu:'10200901', balance:22 },
  { id:24,  kod:'10902', org:'navruz',   ismi:'Деликатес ТИМ Говяжий в/у 1.2',                 p1:12, tipTo:'Тарози', artikul:'НАВ-02', brend:'TIM',     gruppa:'ТИМ (Склад)',    srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:1.200, brutto:1.220, exId:902, rtl:152000,shtrixKod:'4650500090201', ikpu:'10200902', balance:14 },
  { id:25,  kod:'10903', org:'navruz',   ismi:'Масло Сливочное "PILLER" 82.5% 15 гр Navruz',   p1:41, tipTo:'Штучн.', artikul:'НАВ-03', brend:'PILLER',  gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:1,  netto:1.000, brutto:1.010, exId:903, rtl:3800,  shtrixKod:'4650500090301', ikpu:'10200903', balance:200 },
  { id:26,  kod:'10904', org:'navruz',   ismi:'Сыр Мягкий Адыгейский Navruz 0.5 кг',           p1:8,  tipTo:'Тарози', artikul:'НАВ-04', brend:'SIR',     gruppa:'Сыр (Склад)',    srok:30, postavshik:'Беларус Сыр Г...',      shtUpakovka:1,  netto:0.500, brutto:0.510, exId:904, rtl:72000, shtrixKod:'4650500090401', ikpu:'10200904', balance:33 },
  { id:27,  kod:'10905', org:'navruz',   ismi:'Андалус Копчёная Mix Ассорти 0.7 Navruz',        p1:12, tipTo:'Тарози', artikul:'НАВ-05', brend:'ANDALUS', gruppa:'Шерин (Склад)',  srok:12, postavshik:'AHBK0...ANDALUS',      shtUpakovka:1,  netto:0.700, brutto:0.720, exId:905, rtl:62000, shtrixKod:'4650500090501', ikpu:'10200905', balance:24 },

  // ── Sarbon
  { id:28,  kod:'11001', org:'sarbon',   ismi:'Рулет Из Языка Андалус Sarbon 0.9',              p1:12, tipTo:'Тарози', artikul:'САР-01', brend:'ANDALUS', gruppa:'Шерин (Склад)',  srok:12, postavshik:'AHBK0...ANDALUS',      shtUpakovka:1,  netto:0.900, brutto:0.920, exId:1001,rtl:144900,shtrixKod:'4650600100101', ikpu:'10201001', balance:41 },
  { id:29,  kod:'11002', org:'sarbon',   ismi:'п/к Покон Андалус Янги Sarbon 1.0',              p1:12, tipTo:'Тарози', artikul:'САР-02', brend:'ANDALUS', gruppa:'Шерин (Склад)',  srok:12, postavshik:'AHBK0...ANDALUS',      shtUpakovka:1,  netto:1.000, brutto:1.020, exId:1002,rtl:85500, shtrixKod:'4650600100201', ikpu:'10201002', balance:107 },
  { id:30,  kod:'11003', org:'sarbon',   ismi:'Масло "PILLER" 82.5% 500 гр Sarbon',             p1:9,  tipTo:'Штучн.', artikul:'САР-03', brend:'PILLER',  gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:10, netto:1.000, brutto:1.050, exId:1003,rtl:28500, shtrixKod:'4650600100301', ikpu:'10201003', balance:35 },
  { id:31,  kod:'11004', org:'sarbon',   ismi:'Сосиска Молочная Шерин Sarbon 0.5',              p1:12, tipTo:'Тарози', artikul:'САР-04', brend:'SHERIN',  gruppa:'Шерин (Склад)',  srok:10, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:0.500, brutto:0.510, exId:1004,rtl:54200, shtrixKod:'4650600100401', ikpu:'10201004', balance:64 },
  { id:32,  kod:'11005', org:'sarbon',   ismi:'Варёная Колбаса Докторская Sarbon 1.0',          p1:12, tipTo:'Тарози', artikul:'САР-05', brend:'SHERIN',  gruppa:'Шерин (Склад)',  srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:1.000, brutto:1.020, exId:1005,rtl:76500, shtrixKod:'4650600100501', ikpu:'10201005', balance:31 },

  // ── Atlas
  { id:33,  kod:'11101', org:'atlas',    ismi:'Карбонад Шерин п/к Atlas 0.8',                   p1:12, tipTo:'Тарози', artikul:'АТЛ-01', brend:'SHERIN',  gruppa:'Шерин (Склад)',  srok:12, postavshik:'ЧП "SALAR ME..."',      shtUpakovka:1,  netto:0.800, brutto:0.820, exId:1101,rtl:145000,shtrixKod:'4650700110101', ikpu:'10201101', balance:19 },
  { id:34,  kod:'11102', org:'atlas',    ismi:'Сыр Голландский п/к Atlas 0.8 кг',               p1:8,  tipTo:'Тарози', artikul:'АТЛ-02', brend:'SIR',     gruppa:'Сыр (Склад)',    srok:60, postavshik:'Беларус Сыр Г...',      shtUpakovka:1,  netto:0.800, brutto:0.820, exId:1102,rtl:108500,shtrixKod:'4650700110201', ikpu:'10201102', balance:17 },
  { id:35,  kod:'11103', org:'atlas',    ismi:'Масло "PILLER" 82.5% 200 гр Atlas',              p1:35, tipTo:'Штучн.', artikul:'АТЛ-03', brend:'PILLER',  gruppa:'PILLER',         srok:12, postavshik:'SOLPRO ALLEA...',       shtUpakovka:15, netto:1.000, brutto:1.050, exId:1103,rtl:14500, shtrixKod:'4650700110301', ikpu:'10201103', balance:55 },
  { id:36,  kod:'11104', org:'atlas',    ismi:'Xayrli Tong Sosiski Молочная Atlas 0.5',          p1:12, tipTo:'Тарози', artikul:'АТЛ-04', brend:'XAYRLI',  gruppa:'Xayrli tong',    srok:10, postavshik:'ЧП "MILKY" MCH...',    shtUpakovka:1,  netto:0.500, brutto:0.510, exId:1104,rtl:42000, shtrixKod:'4650700110401', ikpu:'10201104', balance:64 },
  { id:37,  kod:'11105', org:'atlas',    ismi:'А\'ЛО ТА\'М Варёная Колбаса в/у Atlas 1.0',      p1:12, tipTo:'Тарози', artikul:'АТЛ-05', brend:"A'LO TA'M",gruppa:"A'lo ta'm",    srok:12, postavshik:"A'lo ta'm",            shtUpakovka:1,  netto:1.000, brutto:1.020, exId:1105,rtl:49000, shtrixKod:'4650700110501', ikpu:'10201105', balance:18 },
]);

export const ADMIN_PRODUCTS: AdminProduct[] = ADMIN_PRODUCTS_RAW.map((p) => ({
  ...p,
  id: String(p.id),
}));
