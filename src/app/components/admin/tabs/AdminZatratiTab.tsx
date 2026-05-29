import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar, Download, Plus, ChevronLeft, ChevronRight,
  Building2, Truck, Package, HardHat,
  ArrowUpRight, ArrowDownRight, TrendingDown, ChevronDown, ChevronUp,
  FileText, X, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown,
  BarChart2, BarChart3, TrendingUp,
} from 'lucide-react';
import { MiniBarChart, MiniDonutChart, MiniLineChart } from '../../MiniCharts';
import { fmt } from '../../../data/adminData';
import * as XLSX from 'xlsx';
import { AddExpenseModal } from './AddExpenseModal';

interface Props {
  D: boolean; card: string; divider: string; sub: string;
  t: Record<string, string>;
  showBalances: boolean;
  selectedCompanyIds?: Set<string>;
  viewOrg?: string;
}

// ─── Company-specific cost scale factors (per category) ──────────────────────
const COMPANY_COST_SCALE: Record<string, Record<string, number>> = {
  boran:     { ofis: 1.00, dostavka: 1.00, transport: 1.00, ombor: 1.00, qurilish: 1.00 },
  zarafshon: { ofis: 0.72, dostavka: 1.38, transport: 0.85, ombor: 1.20, qurilish: 0.45 },
  mipter:    { ofis: 0.55, dostavka: 0.90, transport: 1.15, ombor: 0.70, qurilish: 1.80 },
  navruz:    { ofis: 1.25, dostavka: 1.62, transport: 1.30, ombor: 1.50, qurilish: 0.60 },
  sarbon:    { ofis: 0.90, dostavka: 1.10, transport: 0.75, ombor: 0.85, qurilish: 2.10 },
  atlas:     { ofis: 0.65, dostavka: 0.80, transport: 0.60, ombor: 0.55, qurilish: 0.35 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtMoney = (v: number) =>
  v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const isBetween = (d: Date, a: Date, b: Date) => {
  const t=d.getTime(); return t>Math.min(a.getTime(),b.getTime()) && t<Math.max(a.getTime(),b.getTime());
};

// ─── Static category config ───────────────────────────────────────────────────
const CAT_STATIC = [
  { id:'ofis', tKey:'zatCatOfis', color:'#6366f1', icon:Building2, amount:23_630_847.61,
    subs:[
      { name:'Ijara (ofis)',           amount:11_000_000    },
      { name:'Kommunal xizmatlar',     amount: 1_650_000    },
      { name:'Internet + IP-telefon',  amount:   850_000    },
      { name:'Xodimlar ish haqi',      amount: 8_550_847.61 },
      { name:'Yozuv-chizuv jihozlar',  amount:   380_000    },
      { name:'Mehmon / uchrashuv',     amount: 1_200_000    },
    ],
  },
  { id:'dostavka', tKey:'zatCatDostavka', color:'#3b82f6', icon:Truck, amount:39_797_000,
    subs:[
      { name:'ЧП "SALAR MEAT PRODUCT" (Sherin)', amount:35_597_000 },
      { name:'Region Foods — Xorazm',             amount: 3_150_000 },
      { name:'Jahongir Zubayda — Xorazm',         amount:   800_000 },
      { name:'Rumiya Cheese',                     amount:   250_000 },
    ],
  },
  { id:'transport', tKey:'zatCatTransport', color:'#f59e0b', icon:Truck, amount:17_101_000,
    subs:[
      { name:"Yoqilg'i xarajatlari",  amount:13_801_000 },
      { name:"Avtomobil ta'mirlash",   amount: 3_300_000 },
    ],
  },
  { id:'ombor', tKey:'zatCatOmbor', color:'#10b981', icon:Package, amount:27_922_000,
    subs:[
      { name:'Ombor ijarasi',          amount: 9_000_000 },
      { name:'Ombor xodimlari maoshi', amount: 8_200_000 },
      { name:'Saqlash uskunalari',     amount: 2_800_000 },
      { name:'Kommunal (elektr, suv)', amount:   850_000 },
      { name:"Jihozlar ta'mirlash",    amount: 3_772_000 },
      { name:'Xavfsizlik xizmati',     amount: 3_300_000 },
    ],
  },
  { id:'qurilish', tKey:'zatCatQurilish', color:'#ec4899', icon:HardHat, amount:6_262_000,
    subs:[
      { name:'Qurilish ishlari',       amount: 5_100_000 },
      { name:"Ta'mirlash ishlari",     amount: 1_162_000 },
    ],
  },
];
const TOTAL = CAT_STATIC.reduce((s,c)=>s+c.amount,0);

// ─── Monthly trend ────────────────────────────────────────────────────────────
const MONTHLY_TREND = [
  { month:'Okt', total:88_500_000,  ofis:20_100_000, dostavka:31_200_000, transport:14_200_000, ombor:17_400_000, qurilish:5_600_000 },
  { month:'Nov', total:95_200_000,  ofis:21_500_000, dostavka:33_800_000, transport:15_100_000, ombor:19_200_000, qurilish:5_600_000 },
  { month:'Dek', total:108_900_000, ofis:24_000_000, dostavka:38_500_000, transport:17_600_000, ombor:22_700_000, qurilish:6_100_000 },
  { month:'Yan', total:96_300_000,  ofis:22_100_000, dostavka:34_000_000, transport:15_500_000, ombor:19_100_000, qurilish:5_600_000 },
  { month:'Fev', total:114_712_848, ofis:23_630_848, dostavka:39_797_000, transport:17_101_000, ombor:27_922_000, qurilish:6_262_000 },
  { month:'Mar', total:42_100_000,  ofis: 9_200_000, dostavka:14_800_000, transport: 6_400_000, ombor: 9_100_000, qurilish:2_600_000 },
];
// (pct change is now computed dynamically inside the component)

// ─── Detail transaction data ──────────────────────────────────────────────────
interface TxRow {
  id:number; date:string; group:string; item:string;
  desc:string; amount:number; note:string; reg:string;
}
const SALAR: TxRow[] = [
  { id: 1, date:'02.02.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:4_100_000, note:'',             reg:'Kassa chiqim ord.' },
  { id: 2, date:'09.02.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:6_600_000, note:'',             reg:'Kassa chiqim ord.' },
  { id: 3, date:'14.02.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:2_500_000, note:'',             reg:'Kassa chiqim ord.' },
  { id: 4, date:'15.02.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:2_500_000, note:'',             reg:'Kassa chiqim ord.' },
  { id: 5, date:'18.02.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:1_890_000, note:'boshqa',       reg:'Kassa chiqim ord.' },
  { id: 6, date:'20.02.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:2_700_000, note:'909',          reg:'Kassa chiqim ord.' },
  { id: 7, date:'23.02.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:2_500_000, note:'909',          reg:'Kassa chiqim ord.' },
  { id: 8, date:'24.02.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:2_600_000, note:'971',          reg:'Kassa chiqim ord.' },
  { id: 9, date:'28.02.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:2_300_000, note:'boshqa shofyor',reg:'Kassa chiqim ord.' },
  { id:10, date:'02.03.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:2_707_000, note:'boshqa',       reg:'Kassa chiqim ord.' },
  { id:11, date:'05.03.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:2_700_000, note:'971',          reg:'Kassa chiqim ord.' },
  { id:12, date:'05.03.2026', group:"DOSTAVKA (TA'MINOTCHI)", item:'ЧП "SALAR MEAT PRODUCT" (Sherin)', desc:"yo'l kira", amount:2_500_000, note:'909',          reg:'Kassa chiqim ord.' },
];
const REGION: TxRow[] = [
  { id:1, date:'05.02.2026', group:"DOSTAVKA", item:'Region Foods — Xorazm', desc:'mahsulot yetkazish', amount:1_050_000, note:'',      reg:'Kassa chiqim ord.' },
  { id:2, date:'12.02.2026', group:"DOSTAVKA", item:'Region Foods — Xorazm', desc:'mahsulot yetkazish', amount:1_100_000, note:'',      reg:'Kassa chiqim ord.' },
  { id:3, date:'25.02.2026', group:"DOSTAVKA", item:'Region Foods — Xorazm', desc:'mahsulot yetkazish', amount:  750_000, note:'',      reg:'Kassa chiqim ord.' },
  { id:4, date:'01.03.2026', group:"DOSTAVKA", item:'Region Foods — Xorazm', desc:'mahsulot yetkazish', amount:  250_000, note:'',      reg:'Kassa chiqim ord.' },
];
const JAHONGIR: TxRow[] = [
  { id:1, date:'10.02.2026', group:"DOSTAVKA", item:'Jahongir Zubayda — Xorazm', desc:"yetkazish xizmati", amount:400_000, note:'', reg:'Kassa chiqim ord.' },
  { id:2, date:'20.02.2026', group:"DOSTAVKA", item:'Jahongir Zubayda — Xorazm', desc:"yetkazish xizmati", amount:400_000, note:'', reg:'Kassa chiqim ord.' },
];
const RUMIYA: TxRow[] = [
  { id:1, date:'15.02.2026', group:"DOSTAVKA", item:'Rumiya Cheese', desc:"pishloq yetkazish", amount:250_000, note:'', reg:'Kassa chiqim ord.' },
];
const DETAIL_MAP: Record<string,TxRow[]> = {
  'ofis': [
    { id:1, date:'01.02.2026', group:'OFIS', item:'Ijara',    desc:'Ofis ijarasi',         amount: 5_500_000,  note:'',       reg:'Hisob-faktura'      },
    { id:2, date:'03.02.2026', group:'OFIS', item:'Kommunal', desc:'Elektr energiya',       amount: 1_230_000,  note:'',       reg:"To'lov topshirig'i" },
    { id:3, date:'05.02.2026', group:'OFIS', item:'Internet', desc:'Internet + IP-telefon', amount:   850_000,  note:'',       reg:"To'lov topshirig'i" },
    { id:4, date:'10.02.2026', group:'OFIS', item:'Maosh',    desc:'Ofis xodimlari maoshi', amount: 8_500_000,  note:'fevral', reg:'Kassa chiqim ord.'  },
    { id:5, date:'12.02.2026', group:'OFIS', item:'Jihozlar', desc:"Qog'oz, qalam, papka",  amount:   380_000,  note:'',       reg:'Kassa chiqim ord.'  },
    { id:6, date:'15.02.2026', group:'OFIS', item:'Kommunal', desc:'Gaz',                   amount:   420_000,  note:'',       reg:"To'lov topshirig'i" },
    { id:7, date:'20.02.2026', group:'OFIS', item:'Mehmon',   desc:'Ishbilarmon uchrashuv', amount: 1_200_000,  note:'',       reg:'Kassa chiqim ord.'  },
    { id:8, date:'25.02.2026', group:'OFIS', item:'Ijara',    desc:'Ofis ijarasi (mart)',   amount: 5_500_000,  note:'',       reg:'Hisob-faktura'      },
    { id:9, date:'01.03.2026', group:'OFIS', item:'Maosh',    desc:'Mart oy maoshi (qism)', amount:50_847.61,   note:'',       reg:'Kassa chiqim ord.'  },
  ],
  // OFIS subkategoriyalari
  'ofis:0': [
    { id:1, date:'01.02.2026', group:'OFIS', item:'Ijara', desc:'Ofis ijarasi (fevral)',  amount:5_500_000, note:'',   reg:'Hisob-faktura' },
    { id:2, date:'25.02.2026', group:'OFIS', item:'Ijara', desc:'Ofis ijarasi (mart)',    amount:5_500_000, note:'',   reg:'Hisob-faktura' },
  ],
  'ofis:1': [
    { id:1, date:'03.02.2026', group:'OFIS', item:'Kommunal', desc:'Elektr energiya',     amount:1_230_000, note:'',   reg:"To'lov topshirig'i" },
    { id:2, date:'15.02.2026', group:'OFIS', item:'Kommunal', desc:'Gaz',                 amount:  420_000, note:'',   reg:"To'lov topshirig'i" },
  ],
  'ofis:2': [
    { id:1, date:'05.02.2026', group:'OFIS', item:'Internet', desc:'Internet + IP-telefon', amount:850_000, note:'',   reg:"To'lov topshirig'i" },
  ],
  'ofis:3': [
    { id:1, date:'10.02.2026', group:'OFIS', item:'Maosh', desc:'Ofis xodimlari (fevral)', amount:8_500_000, note:'fevral', reg:'Kassa chiqim ord.' },
    { id:2, date:'01.03.2026', group:'OFIS', item:'Maosh', desc:'Mart oy maoshi (qism)',   amount:50_847.61, note:'',       reg:'Kassa chiqim ord.' },
  ],
  'ofis:4': [
    { id:1, date:'12.02.2026', group:'OFIS', item:'Jihozlar', desc:"Qog'oz, qalam, papka", amount:380_000, note:'', reg:'Kassa chiqim ord.' },
  ],
  'ofis:5': [
    { id:1, date:'20.02.2026', group:'OFIS', item:'Mehmon', desc:'Ishbilarmon uchrashuv', amount:1_200_000, note:'', reg:'Kassa chiqim ord.' },
  ],
  'dostavka:0': SALAR,
  'dostavka:1': REGION,
  'dostavka:2': JAHONGIR,
  'dostavka:3': RUMIYA,
  'dostavka': [...SALAR,...REGION,...JAHONGIR,...RUMIYA].map((r,i)=>({...r,id:i+1})),
  'transport': [
    { id:1, date:'01.02.2026', group:'TRANSPORT', item:"Yoqilg'i",   desc:'20 ta avtomobil',      amount:3_200_000, note:'',      reg:'Kassa chiqim ord.' },
    { id:2, date:'05.02.2026', group:'TRANSPORT', item:"Yoqilg'i",   desc:"Qo'shimcha to'lov",    amount:1_800_000, note:'',      reg:'Kassa chiqim ord.' },
    { id:3, date:'10.02.2026', group:'TRANSPORT', item:"Ta'mirlash", desc:'Avtomobil #3',          amount:1_500_000, note:'motor', reg:'Kassa chiqim ord.' },
    { id:4, date:'15.02.2026', group:'TRANSPORT', item:"Yoqilg'i",   desc:'20 ta avtomobil',      amount:3_200_000, note:'',      reg:'Kassa chiqim ord.' },
    { id:5, date:'18.02.2026', group:'TRANSPORT', item:"Ta'mirlash", desc:'Avtomobil #7',          amount:  800_000, note:'shina', reg:'Kassa chiqim ord.' },
    { id:6, date:'22.02.2026', group:'TRANSPORT', item:"Yoqilg'i",   desc:'20 ta avtomobil',      amount:3_101_000, note:'',      reg:'Kassa chiqim ord.' },
    { id:7, date:'01.03.2026', group:'TRANSPORT', item:"Yoqilg'i",   desc:'Mart oyi',             amount:2_500_000, note:'',      reg:'Kassa chiqim ord.' },
    { id:8, date:'05.03.2026', group:'TRANSPORT', item:"Ta'mirlash", desc:'Ombor mashina',         amount:1_001_000, note:'',      reg:'Kassa chiqim ord.' },
  ],
  // TRANSPORT subkategoriyalari
  'transport:0': [
    { id:1, date:'01.02.2026', group:'TRANSPORT', item:"Yoqilg'i", desc:'20 ta avtomobil',     amount:3_200_000, note:'',  reg:'Kassa chiqim ord.' },
    { id:2, date:'05.02.2026', group:'TRANSPORT', item:"Yoqilg'i", desc:"Qo'shimcha to'lov",   amount:1_800_000, note:'',  reg:'Kassa chiqim ord.' },
    { id:3, date:'15.02.2026', group:'TRANSPORT', item:"Yoqilg'i", desc:'20 ta avtomobil',     amount:3_200_000, note:'',  reg:'Kassa chiqim ord.' },
    { id:4, date:'22.02.2026', group:'TRANSPORT', item:"Yoqilg'i", desc:'20 ta avtomobil',     amount:3_101_000, note:'',  reg:'Kassa chiqim ord.' },
    { id:5, date:'01.03.2026', group:'TRANSPORT', item:"Yoqilg'i", desc:'Mart oyi',            amount:2_500_000, note:'',  reg:'Kassa chiqim ord.' },
  ],
  'transport:1': [
    { id:1, date:'10.02.2026', group:'TRANSPORT', item:"Ta'mirlash", desc:'Avtomobil #3',       amount:1_500_000, note:'motor', reg:'Kassa chiqim ord.' },
    { id:2, date:'18.02.2026', group:'TRANSPORT', item:"Ta'mirlash", desc:'Avtomobil #7',       amount:  800_000, note:'shina', reg:'Kassa chiqim ord.' },
    { id:3, date:'05.03.2026', group:'TRANSPORT', item:"Ta'mirlash", desc:'Ombor mashina',      amount:1_001_000, note:'',      reg:'Kassa chiqim ord.' },
  ],
  'ombor': [
    { id:1, date:'01.02.2026', group:'OMBOR', item:'Ijara',      desc:'Ombor ijarasi',          amount:4_500_000, note:'',       reg:'Hisob-faktura'      },
    { id:2, date:'05.02.2026', group:'OMBOR', item:'Maosh',      desc:'Ombor xodimlari',        amount:8_200_000, note:'fevral', reg:'Kassa chiqim ord.'  },
    { id:3, date:'10.02.2026', group:'OMBOR', item:'Jihozlar',   desc:'Saqlash uskunalari',     amount:2_800_000, note:'',       reg:'Kassa chiqim ord.'  },
    { id:4, date:'15.02.2026', group:'OMBOR', item:'Kommunal',   desc:'Elektr va suv',          amount:  850_000, note:'',       reg:"To'lov topshirig'i" },
    { id:5, date:'01.03.2026', group:'OMBOR', item:'Ijara',      desc:'Ombor ijarasi (mart)',   amount:4_500_000, note:'',       reg:'Hisob-faktura'      },
    { id:6, date:'03.03.2026', group:'OMBOR', item:"Ta'mirlash", desc:"Shelf o'rnatish",        amount:3_772_000, note:'',       reg:'Kassa chiqim ord.'  },
    { id:7, date:'05.03.2026', group:'OMBOR', item:'Boshqa',     desc:'Xavfsizlik xizmati',     amount:3_300_000, note:'mart',   reg:'Kassa chiqim ord.'  },
  ],
  // OMBOR subkategoriyalari
  'ombor:0': [
    { id:1, date:'01.02.2026', group:'OMBOR', item:'Ijara', desc:'Ombor ijarasi (fevral)', amount:4_500_000, note:'', reg:'Hisob-faktura' },
    { id:2, date:'01.03.2026', group:'OMBOR', item:'Ijara', desc:'Ombor ijarasi (mart)',   amount:4_500_000, note:'', reg:'Hisob-faktura' },
  ],
  'ombor:1': [
    { id:1, date:'05.02.2026', group:'OMBOR', item:'Maosh', desc:'Ombor xodimlari maoshi', amount:8_200_000, note:'fevral', reg:'Kassa chiqim ord.' },
  ],
  'ombor:2': [
    { id:1, date:'10.02.2026', group:'OMBOR', item:'Jihozlar', desc:'Saqlash uskunalari', amount:2_800_000, note:'', reg:'Kassa chiqim ord.' },
  ],
  'ombor:3': [
    { id:1, date:'15.02.2026', group:'OMBOR', item:'Kommunal', desc:'Elektr va suv', amount:850_000, note:'', reg:"To'lov topshirig'i" },
  ],
  'ombor:4': [
    { id:1, date:'03.03.2026', group:'OMBOR', item:"Ta'mirlash", desc:"Shelf o'rnatish", amount:3_772_000, note:'', reg:'Kassa chiqim ord.' },
  ],
  'ombor:5': [
    { id:1, date:'05.03.2026', group:'OMBOR', item:'Xavfsizlik', desc:'Xavfsizlik xizmati', amount:3_300_000, note:'mart', reg:'Kassa chiqim ord.' },
  ],
  'qurilish': [
    { id:1, date:'03.02.2026', group:"QURILISH/TA'MIRLASH", item:'Qurilish',   desc:'Devor ishlari',         amount:1_500_000, note:'',              reg:'Kassa chiqim ord.' },
    { id:2, date:'10.02.2026', group:"QURILISH/TA'MIRLASH", item:'Qurilish',   desc:'Qurilish materiallari', amount:2_100_000, note:"tsement,g'isht", reg:'Kassa chiqim ord.' },
    { id:3, date:'20.02.2026', group:"QURILISH/TA'MIRLASH", item:"Ta'mirlash", desc:'Suv quvuri',            amount:  862_000, note:'',              reg:'Kassa chiqim ord.' },
    { id:4, date:'01.03.2026', group:"QURILISH/TA'MIRLASH", item:'Qurilish',   desc:'Ishchi maoshi',         amount:1_500_000, note:'',              reg:'Kassa chiqim ord.' },
    { id:5, date:'05.03.2026', group:"QURILISH/TA'MIRLASH", item:"Ta'mirlash", desc:"Bo'yoq ishlari",        amount:  300_000, note:'',              reg:'Kassa chiqim ord.' },
  ],
  // QURILISH subkategoriyalari
  'qurilish:0': [
    { id:1, date:'03.02.2026', group:"QURILISH/TA'MIRLASH", item:'Qurilish', desc:'Devor ishlari',         amount:1_500_000, note:'',              reg:'Kassa chiqim ord.' },
    { id:2, date:'10.02.2026', group:"QURILISH/TA'MIRLASH", item:'Qurilish', desc:'Qurilish materiallari', amount:2_100_000, note:"tsement,g'isht", reg:'Kassa chiqim ord.' },
    { id:3, date:'01.03.2026', group:"QURILISH/TA'MIRLASH", item:'Qurilish', desc:'Ishchi maoshi',         amount:1_500_000, note:'',              reg:'Kassa chiqim ord.' },
  ],
  'qurilish:1': [
    { id:1, date:'20.02.2026', group:"QURILISH/TA'MIRLASH", item:"Ta'mirlash", desc:'Suv quvuri',     amount:862_000, note:'', reg:'Kassa chiqim ord.' },
    { id:2, date:'05.03.2026', group:"QURILISH/TA'MIRLASH", item:"Ta'mirlash", desc:"Bo'yoq ishlari", amount:300_000, note:'', reg:'Kassa chiqim ord.' },
  ],
};

// ─── Calendar helpers ─────────────────────────────────────────────────────────
function getDaysInMonth(y:number,m:number){return new Date(y,m+1,0).getDate();}
function getFirstDow(y:number,m:number){const d=new Date(y,m,1).getDay();return d===0?6:d-1;}

interface CalMonthProps {
  year:number; month:number;
  start:Date|null; end:Date|null; hover:Date|null;
  onDayClick:(d:Date)=>void; onDayHover:(d:Date|null)=>void;
  D:boolean; monthNames:string[]; dayNames:string[];
}
function CalMonth({year,month,start,end,hover,onDayClick,onDayHover,D,monthNames,dayNames}:CalMonthProps){
  const days=getDaysInMonth(year,month); const firstDow=getFirstDow(year,month);
  const txt=D?'#f9fafb':'#111827'; const muted=D?'#6b7280':'#9ca3af'; const border=D?'#2a2a2a':'#e5e7eb';
  const cells:(Date|null)[]=[];
  for(let i=0;i<firstDow;i++)cells.push(null);
  for(let d=1;d<=days;d++)cells.push(new Date(year,month,d));
  const effectiveEnd=end??hover;
  return(
    <div style={{minWidth:240}}>
      <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:txt,marginBottom:10}}>{monthNames[month]} {year}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:6}}>
        {dayNames.map((d,i)=><div key={i} style={{textAlign:'center',fontSize:10,color:muted,fontWeight:600,padding:'2px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {cells.map((date,i)=>{
          if(!date)return<div key={`e${i}`}/>;
          const isStart=!!start&&sameDay(date,start);
          const isEnd=!!effectiveEnd&&sameDay(date,effectiveEnd);
          const inRange=!!start&&!!effectiveEnd&&isBetween(date,start,effectiveEnd);
          const isToday=sameDay(date,new Date());
          const active=isStart||isEnd;
          return(
            <div key={date.toISOString()} onMouseEnter={()=>onDayHover(date)} onMouseLeave={()=>onDayHover(null)} onClick={()=>onDayClick(date)}
              style={{textAlign:'center',fontSize:11,fontWeight:active?700:400,padding:'5px 2px',
                borderRadius:active?8:inRange?0:6,cursor:'pointer',
                background:active?'#6366f1':inRange?(D?'rgba(99,102,241,0.18)':'rgba(99,102,241,0.1)'):'transparent',
                color:active?'#fff':isToday?'#6366f1':txt,
                border:isToday&&!active?`1px solid ${border}`:'1px solid transparent',transition:'all 0.1s'}}>
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stacked bar chart ────────────────────────────────────────────────────────
interface SBCat{id:string;color:string;name:string;}
function StackedBarChart({data,cats,D,txt,muted}:{data:typeof MONTHLY_TREND;cats:SBCat[];D:boolean;txt:string;muted:string;}){
  const[hov,setHov]=useState<{mi:number;ci:number}|null>(null);
  const W=900, H=320, PT=16, PB=36, PL=88, PR=16;
  const chartW=W-PL-PR; const chartH=H-PT-PB;
  const maxVal=Math.max(...data.map(m=>m.total));
  const yMax=Math.ceil(maxVal/10_000_000)*10_000_000||10_000_000;
  const yTicks=[0,0.25,0.5,0.75,1].map(f=>Math.round(yMax*f));
  const gap=chartW/data.length; const barW=Math.floor(gap*0.52);
  const toY=(v:number)=>PT+chartH-(v/yMax)*chartH;
  const fmtM=(v:number)=>v>=1_000_000?`${(v/1_000_000).toFixed(0)}M so'm`:`${(v/1_000).toFixed(0)}K so'm`;
  return(
    <div style={{width:'100%'}}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
        style={{width:'100%',height:'auto',minHeight:260,display:'block'}}>
        {yTicks.map(v=>{
          const y=toY(v);
          return(
            <g key={v}>
              <line x1={PL} x2={W-PR} y1={y} y2={y}
                stroke={D?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'} strokeWidth={1}/>
              <text x={PL-8} y={y+4} textAnchor="end" fontSize="11" fill={muted}>{fmtM(v)}</text>
            </g>
          );
        })}
        {data.map((month,mi)=>{
          const cx=PL+gap*mi+gap/2; let yOff=PT+chartH;
          return(
            <g key={month.month}>
              {cats.map((cat,ci)=>{
                const val=(month[cat.id as keyof typeof month] as number)||0;
                const bh=Math.max((val/yMax)*chartH,0); yOff-=bh;
                const isTop=ci===cats.length-1;
                return(
                  <rect key={cat.id} x={cx-barW/2} y={yOff} width={barW} height={bh} fill={cat.color}
                    opacity={hov&&!(hov.mi===mi&&hov.ci===ci)?0.35:1}
                    rx={isTop?5:0}
                    style={{cursor:'pointer',transition:'opacity 0.15s'}}
                    onMouseEnter={()=>setHov({mi,ci})} onMouseLeave={()=>setHov(null)}>
                    <title>{cat.name}: {fmt(val)}</title>
                  </rect>
                );
              })}
              {hov?.mi===mi&&(
                <text x={cx} y={toY(month.total)-6} textAnchor="middle" fontSize="10" fontWeight="700" fill={txt}>
                  {fmtM(month.total)}
                </text>
              )}
              <text x={cx} y={PT+chartH+22} textAnchor="middle" fontSize="12" fontWeight="600" fill={muted}>{month.month}</text>
            </g>
          );
        })}
        <line x1={PL} x2={PL} y1={PT} y2={PT+chartH} stroke={D?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'} strokeWidth={1}/>
      </svg>
    </div>
  );
}

// ─── Grouped Bar Chart ────────────────────────────────────────────────────────
function GroupedBarChart({data,cats,D,txt,muted}:{data:typeof MONTHLY_TREND;cats:SBCat[];D:boolean;txt:string;muted:string;}){
  const[hov,setHov]=useState<{mi:number;ci:number}|null>(null);
  const W=900,H=320,PT=16,PB=36,PL=88,PR=16;
  const chartW=W-PL-PR; const chartH=H-PT-PB;
  const catKeys=cats.map(c=>c.id);
  const maxVal=Math.max(...data.map(m=>Math.max(...catKeys.map(k=>(m[k as keyof typeof m] as number)||0))));
  const yMax=Math.ceil(maxVal/5_000_000)*5_000_000||5_000_000;
  const yTicks=[0,0.25,0.5,0.75,1].map(f=>Math.round(yMax*f));
  const gap=chartW/data.length;
  const grpW=gap*0.8; const barW=grpW/cats.length;
  const toY=(v:number)=>PT+chartH-(v/yMax)*chartH;
  const fmtM=(v:number)=>v>=1_000_000?`${(v/1_000_000).toFixed(0)}M so'm`:`${(v/1_000).toFixed(0)}K so'm`;
  return(
    <div style={{width:'100%'}}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{width:'100%',height:'auto',minHeight:260,display:'block'}}>
        {yTicks.map(v=>{const y=toY(v);return(
          <g key={v}>
            <line x1={PL} x2={W-PR} y1={y} y2={y} stroke={D?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'} strokeWidth={1}/>
            <text x={PL-8} y={y+4} textAnchor="end" fontSize="11" fill={muted}>{fmtM(v)}</text>
          </g>
        );})}
        {data.map((month,mi)=>{
          const grpX=PL+gap*mi+gap/2-grpW/2;
          return(
            <g key={month.month}>
              {cats.map((cat,ci)=>{
                const val=(month[cat.id as keyof typeof month] as number)||0;
                const bh=Math.max((val/yMax)*chartH,0);
                const x=grpX+ci*barW; const y=toY(val);
                const isHov=hov?.mi===mi&&hov?.ci===ci;
                return(
                  <g key={cat.id}>
                    <rect x={x+1} y={y} width={barW-2} height={bh} fill={cat.color}
                      opacity={hov&&!isHov?0.35:1} rx={3}
                      style={{cursor:'pointer',transition:'opacity 0.15s'}}
                      onMouseEnter={()=>setHov({mi,ci})} onMouseLeave={()=>setHov(null)}>
                      <title>{cat.name}: {fmt(val)}</title>
                    </rect>
                    {isHov&&bh>16&&(
                      <text x={x+barW/2} y={y-5} textAnchor="middle" fontSize="9" fontWeight="700" fill={txt}>{fmtM(val)}</text>
                    )}
                  </g>
                );
              })}
              <text x={PL+gap*mi+gap/2} y={PT+chartH+22} textAnchor="middle" fontSize="12" fontWeight="600" fill={muted}>{month.month}</text>
            </g>
          );
        })}
        <line x1={PL} x2={PL} y1={PT} y2={PT+chartH} stroke={D?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'} strokeWidth={1}/>
      </svg>
    </div>
  );
}

// ─── Smooth cubic bezier path helper (Catmull-Rom → Bezier) ──────────────────
function smoothBezier(pts:[number,number][]):string{
  if(pts.length<2) return '';
  const t=0.35;
  let d=`M ${pts[0][0]} ${pts[0][1]}`;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[Math.max(i-1,0)];
    const p1=pts[i];
    const p2=pts[i+1];
    const p3=pts[Math.min(i+2,pts.length-1)];
    const cp1x=+(p1[0]+(p2[0]-p0[0])*t).toFixed(2);
    const cp1y=+(p1[1]+(p2[1]-p0[1])*t).toFixed(2);
    const cp2x=+(p2[0]-(p3[0]-p1[0])*t).toFixed(2);
    const cp2y=+(p2[1]-(p3[1]-p1[1])*t).toFixed(2);
    d+=` C ${cp1x} ${cp1y},${cp2x} ${cp2y},${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

// ─── Line Chart ───────────────────────────────────────────────────────────────
function LineChartSVG({data,cats,D,txt,muted}:{data:typeof MONTHLY_TREND;cats:SBCat[];D:boolean;txt:string;muted:string;}){
  const[hov,setHov]=useState<{mi:number;ci:number}|null>(null);
  const[hovX,setHovX]=useState<number|null>(null);
  const W=900,H=320,PT=24,PB=36,PL=88,PR=24;
  const chartW=W-PL-PR; const chartH=H-PT-PB;
  const catKeys=cats.map(c=>c.id);
  const maxVal=Math.max(...data.map(m=>Math.max(...catKeys.map(k=>(m[k as keyof typeof m] as number)||0))));
  const yMax=Math.ceil(maxVal/5_000_000)*5_000_000||5_000_000;
  const yTicks=[0,0.25,0.5,0.75,1].map(f=>Math.round(yMax*f));
  const gap=chartW/(data.length-1);
  const cx=(mi:number)=>PL+mi*gap;
  const toY=(v:number)=>PT+chartH-(v/yMax)*chartH;
  const fmtM=(v:number)=>v>=1_000_000?`${(v/1_000_000).toFixed(1)}M so'm`:`${(v/1_000).toFixed(0)}K so'm`;
  return(
    <div style={{width:'100%'}}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
        style={{width:'100%',height:'auto',minHeight:260,display:'block'}}>

        {/* Grid lines */}
        {yTicks.map(v=>{const y=toY(v);return(
          <g key={v}>
            <line x1={PL} x2={W-PR} y1={y} y2={y}
              stroke={D?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)'} strokeWidth={1}
              strokeDasharray={v===0?undefined:'5 4'}/>
            <text x={PL-8} y={y+4} textAnchor="end" fontSize="11" fill={muted}>{fmtM(v)}</text>
          </g>
        );})}

        {/* Hover crosshair */}
        {hovX!==null&&(
          <line x1={hovX} x2={hovX} y1={PT} y2={PT+chartH}
            stroke={D?'rgba(255,255,255,0.13)':'rgba(0,0,0,0.09)'}
            strokeWidth={1} strokeDasharray="5 4"/>
        )}

        {/* Smooth curved lines */}
        {cats.map((cat,ci)=>{
          const points:[number,number][]=data.map((_,mi)=>[
            cx(mi), toY((data[mi][cat.id as keyof typeof data[0]] as number)||0)
          ]);
          const d=smoothBezier(points);
          const active=hov===null||hov.ci===ci;
          return(
            <g key={cat.id}>
              {/* Soft glow behind line */}
              <path d={d} fill="none" stroke={cat.color} strokeWidth={10}
                strokeLinecap="round"
                opacity={active?0.07:0}
                style={{transition:'opacity 0.25s',filter:'blur(4px)'}}/>
              {/* Main smooth line */}
              <path d={d} fill="none" stroke={cat.color}
                strokeWidth={active?2.6:1.4}
                strokeLinecap="round" strokeLinejoin="round"
                opacity={active?1:0.18}
                style={{transition:'all 0.22s'}}/>
            </g>
          );
        })}

        {/* X-axis month labels */}
        {data.map((_,mi)=>(
          <text key={mi} x={cx(mi)} y={PT+chartH+22}
            textAnchor="middle" fontSize="12" fontWeight="600" fill={muted}>
            {data[mi].month}
          </text>
        ))}

        {/* Dots + tooltip */}
        {cats.map((cat,ci)=>
          data.map((m,mi)=>{
            const val=(m[cat.id as keyof typeof m] as number)||0;
            const isHov=hov?.mi===mi&&hov?.ci===ci;
            const catActive=hov===null||hov.ci===ci;
            const px=cx(mi); const py=toY(val);
            const tipW=86;
            const tipX=px+tipW/2>W-PR ? px-tipW-4 : px-tipW/2;
            return(
              <g key={`${ci}-${mi}`} style={{cursor:'pointer'}}
                onMouseEnter={()=>{setHov({mi,ci});setHovX(cx(mi));}}
                onMouseLeave={()=>{setHov(null);setHovX(null);}}>
                {/* Invisible large hit area */}
                <circle cx={px} cy={py} r={16} fill="transparent"/>
                {/* Pulse ring on hover */}
                {isHov&&(
                  <circle cx={px} cy={py} r={11} fill="none"
                    stroke={cat.color} strokeWidth={1.5} opacity={0.3}/>
                )}
                {/* Dot */}
                <circle cx={px} cy={py}
                  r={isHov?5.5:3.5}
                  fill={isHov?cat.color:'#fff'}
                  stroke={cat.color}
                  strokeWidth={isHov?0:2}
                  opacity={catActive?1:0.18}
                  style={{transition:'all 0.15s'}}/>
                {/* Tooltip card */}
                {isHov&&(
                  <g>
                    <rect x={tipX} y={py-44} width={tipW} height={30} rx={8}
                      fill={D?'#1c1c1c':'#ffffff'}
                      stroke={cat.color} strokeWidth={1.2}
                      style={{filter:'drop-shadow(0 3px 10px rgba(0,0,0,0.2))'}}/>
                    <text x={tipX+tipW/2} y={py-33} textAnchor="middle" fontSize="9" fill={muted}>{cat.name}</text>
                    <text x={tipX+tipW/2} y={py-21} textAnchor="middle" fontSize="12" fontWeight="800" fill={txt}>{fmtM(val)}</text>
                  </g>
                )}
              </g>
            );
          })
        )}

        {/* Y-axis line */}
        <line x1={PL} x2={PL} y1={PT} y2={PT+chartH}
          stroke={D?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'} strokeWidth={1}/>
      </svg>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
interface DetailModalProps {
  rows: TxRow[]; title: string; period: string;
  D: boolean; t: Record<string,string>;
  onClose: () => void;
}
function DetailModal({ rows, title, period, D, t, onClose }: DetailModalProps) {
  const total = rows.reduce((s,r)=>s+r.amount, 0);
  const txt   = D ? '#f9fafb' : '#111827';
  const muted = D ? '#6b7280' : '#9ca3af';
  const bg    = D ? '#161616' : '#fff';
  const border= D ? '#2a2a2a' : '#e5e7eb';
  const thBg  = D ? '#111' : '#f3f4f6';
  const w = typeof window !== 'undefined' ? window.innerWidth : 768;
  const isMobile = w < 640;

  // Close on Escape
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[onClose]);

  return(
    <div style={{
      position:'fixed',inset:0,zIndex:1000,
      display:'flex',alignItems:isMobile?'flex-end':'center',
      justifyContent:'center',
      background:'rgba(0,0,0,0.55)',
      backdropFilter:'blur(4px)',
      padding:isMobile?0:'16px',
    }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{
        background:bg, borderRadius:isMobile?'20px 20px 0 0':18,
        width:'100%', maxWidth:900,
        maxHeight:isMobile?'92vh':'88vh',
        display:'flex', flexDirection:'column',
        boxShadow: D?'0 32px 80px rgba(0,0,0,0.8)':'0 32px 80px rgba(0,0,0,0.2)',
        border:`1px solid ${border}`,
        overflow:'hidden',
      }}>
        {/* ── Modal header ── */}
        <div style={{
          background: D?'#111':'#f8f8f8',
          borderBottom:`1px solid ${border}`,
          padding:'16px 20px',
          flexShrink:0,
        }}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
            <div>
              <div style={{fontSize:11,color:muted,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:4}}>
                {t.zatDetCompany || 'MChJ "BORAN LEADERS"'}
              </div>
              <div style={{fontSize:15,fontWeight:800,color:txt,letterSpacing:'-0.2px'}}>
                {t.zatDetTitle || 'Xarajatlar tafsiloti'}
              </div>
              <div style={{fontSize:12,color:'#6366f1',fontWeight:600,marginTop:3}}>
                {t.zatDetPeriod || 'davr uchun'} {period}
              </div>
              {title && (
                <div style={{
                  marginTop:8, display:'inline-flex', alignItems:'center', gap:6,
                  padding:'4px 12px', borderRadius:8,
                  background:D?'rgba(99,102,241,0.12)':'rgba(99,102,241,0.07)',
                  border:`1px solid ${D?'rgba(99,102,241,0.25)':'rgba(99,102,241,0.15)'}`,
                }}>
                  <span style={{width:8,height:8,borderRadius:2,background:'#6366f1',display:'inline-block',flexShrink:0}}/>
                  <span style={{fontSize:12,fontWeight:700,color:'#6366f1'}}>{title}</span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{
              width:34,height:34,borderRadius:10,flexShrink:0,
              background:D?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.06)',
              border:'none',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              color:muted, transition:'all 0.15s',
            }}>
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{flex:1,overflow:'auto'}}>
          {/* Column headers */}
          <div style={{
            display:'grid',
            gridTemplateColumns: isMobile
              ? '32px 80px 1fr auto'
              : '40px 90px 1fr 1fr 1fr auto 1fr 100px',
            padding:'8px 16px',
            background:thBg,
            position:'sticky',top:0,zIndex:10,
            borderBottom:`1px solid ${border}`,
            gap:8,
          }}>
            {[
              t.zatDetNo||'№',
              t.zatDetDate||'Sana',
              t.zatDetGroup||'Xarajat guruhi',
              ...( isMobile ? [] : [t.zatDetItem||'Xarajat moddasi', t.zatDetDesc||'Izoh']),
              t.zatDetAmount||'Summa',
              ...( isMobile ? [] : [t.zatDetNote||'Eslatma', t.zatDetReg||'Hujjat turi']),
            ].map((h,i)=>(
              <div key={i} style={{
                fontSize:9,fontWeight:800,color:muted,
                textTransform:'uppercase',letterSpacing:'0.05em',
                textAlign: (isMobile&&i===3)||(!isMobile&&i===5) ? 'right' : 'left',
              }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row,ri)=>{
            const isEven = ri%2===0;
            return(
              <div key={row.id} style={{
                display:'grid',
                gridTemplateColumns: isMobile
                  ? '32px 80px 1fr auto'
                  : '40px 90px 1fr 1fr 1fr auto 1fr 100px',
                padding:'9px 16px',
                borderBottom:`1px solid ${D?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'}`,
                background: isEven
                  ? (D?'rgba(255,255,255,0.015)':'rgba(0,0,0,0.01)')
                  : 'transparent',
                gap:8, alignItems:'center',
                transition:'background 0.1s',
              }}>
                <span style={{fontSize:11,color:muted,fontWeight:600}}>{row.id}</span>
                <span style={{fontSize:11,color:muted,whiteSpace:'nowrap'}}>{row.date}</span>
                <span style={{fontSize:11,color:txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.group}</span>
                {!isMobile && <span style={{fontSize:11,color:txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.item}</span>}
                {!isMobile && <span style={{fontSize:11,color:muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.desc}</span>}
                <span style={{fontSize:12,fontWeight:700,color:txt,textAlign:'right',whiteSpace:'nowrap'}}>
                  {fmtMoney(row.amount)}
                </span>
                {!isMobile && <span style={{fontSize:10,color:muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.note}</span>}
                {!isMobile && (
                  <span style={{
                    fontSize:9,color:'#6366f1',fontWeight:600,
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                  }}>{row.reg}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer: TOTAL ── */}
        <div style={{
          display:'grid',
          gridTemplateColumns: isMobile ? '32px 80px 1fr auto' : '40px 90px 1fr 1fr 1fr auto 1fr 100px',
          padding:'12px 16px',
          borderTop:`2px solid ${border}`,
          background:D?'#111':'#f0f0f5',
          flexShrink:0,
          gap:8, alignItems:'center',
        }}>
          <span/>
          <span/>
          <span style={{
            fontSize:13,fontWeight:900,color:txt,
            textTransform:'uppercase',letterSpacing:'0.04em',
            gridColumn: isMobile ? '2/4' : '2/6',
          }}>
            {t.zatDetTotal||'JAMI:'}
          </span>
          {isMobile && <span/>}
          <span style={{fontSize:15,fontWeight:900,color:'#6366f1',textAlign:'right',whiteSpace:'nowrap'}}>
            {fmtMoney(total)}
          </span>
          {!isMobile && <span/>}
          {!isMobile && <span/>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AdminZatratiTab({ D, card, divider, sub, t, showBalances, selectedCompanyIds, viewOrg = 'boran' }: Props) {
  // Date range
  const [rangeStart, setRangeStart] = useState<Date>(new Date(2026,2,1));   // Mar 1
  const [rangeEnd,   setRangeEnd]   = useState<Date>(new Date(2026,2,10));  // Mar 10 (today)
  const [calOpen,    setCalOpen]    = useState(false);
  const [pickPhase,  setPickPhase]  = useState<'start'|'end'>('start');
  const [tempStart,  setTempStart]  = useState<Date|null>(null);
  const [hoverDate,  setHoverDate]  = useState<Date|null>(null);
  const [calMonth,   setCalMonth]   = useState(new Date(2026,2,1));
  const calRef = useRef<HTMLDivElement>(null);

  // UI state
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [showTrend, setShowTrend] = useState<'bar'|'line'>('line');
  const [sortOrder, setSortOrder] = useState<'default'|'desc'|'asc'>('desc');
  const [chartType, setChartType] = useState<'stacked'|'grouped'|'line'>('stacked');
  const [chartOpen, setChartOpen] = useState(false);
  const [w, setW] = useState(typeof window!=='undefined'?window.innerWidth:768);

  // Detail modal state
  const [detailKey,  setDetailKey]  = useState<string|null>(null);
  const [detailTitle,setDetailTitle]= useState('');

  // Add expense modal
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

  useEffect(()=>{
    const fn=()=>setW(window.innerWidth);
    window.addEventListener('resize',fn);
    return ()=>window.removeEventListener('resize',fn);
  },[]);

  useEffect(()=>{
    const handler=(e:MouseEvent)=>{
      if(calRef.current&&!calRef.current.contains(e.target as Node))setCalOpen(false);
    };
    document.addEventListener('mousedown',handler);
    return()=>document.removeEventListener('mousedown',handler);
  },[]);

  const isMobile = w < 640;

  // Translation-aware constants
  const MONTH_NAMES = useMemo(()=>
    (t.zatCalMonths||'Yanvar,Fevral,Mart,Aprel,May,Iyun,Iyul,Avgust,Sentabr,Oktabr,Noyabr,Dekabr').split(','),
    [t.zatCalMonths]
  );
  const DAY_NAMES = useMemo(()=>
    (t.zatCalDays||'Du,Se,Ch,Pa,Ju,Sh,Ya').split(','),
    [t.zatCalDays]
  );
  const CATS = useMemo(()=>CAT_STATIC.map(c=>({...c,name:t[c.tKey]||c.tKey})),[t]);

  const txt    = D?'#f9fafb':'#111827';
  const border = D?'#2a2a2a':'#e5e7eb';
  const muted  = D?'#6b7280':'#9ca3af';
  const bg     = D?'#161616':'#fff';
  const thBg   = D?'#111111':'#f3f4f6';
  const som    = t.zatSomUnit||"so'm";
  const pctJ   = t.zatPctJami||'jami';
  // Amount mask helpers
  const $f  = (v: number) => showBalances ? fmt(v)      : '••••••';
  const $m  = (v: number) => showBalances ? fmtMoney(v) : '••••••';

  // Calendar
  const handleDayClick=(date:Date)=>{
    if(pickPhase==='start'){setTempStart(date);setPickPhase('end');}
    else{
      if(tempStart){
        const s=tempStart.getTime()<date.getTime()?tempStart:date;
        const e=tempStart.getTime()<date.getTime()?date:tempStart;
        setRangeStart(s);setRangeEnd(e);
      }
      setTempStart(null);setPickPhase('start');setCalOpen(false);
    }
  };
  const openCal=()=>{
    setCalOpen(true);setPickPhase('start');setTempStart(null);setHoverDate(null);
    setCalMonth(new Date(rangeStart.getFullYear(),rangeStart.getMonth(),1));
  };
  const month2=new Date(calMonth.getFullYear(),calMonth.getMonth()+1,1);

  const barData  =MONTHLY_TREND.map(m=>({month:m.month,total:m.total}));
  const sbCats   =CATS.map(c=>({id:c.id,color:c.color,name:c.name}));

  // ── Dynamic date-based filtering ──────────────────────────────────────────
  const parseTxDate = (s:string) => {
    const [d,m,y] = s.split('.');
    return new Date(+y, +m-1, +d);
  };

  // Compute company scale: for 'all' view sum scales, for single view use that company
  const companyScale = useMemo((): Record<string, number> => {
    const catKeys = ['ofis','dostavka','transport','ombor','qurilish'];
    const ids = selectedCompanyIds && selectedCompanyIds.size > 0
      ? Array.from(selectedCompanyIds)
      : [viewOrg];
    const isAll = viewOrg === 'all' || (selectedCompanyIds && selectedCompanyIds.size > 1);
    const result: Record<string, number> = {};
    catKeys.forEach(k => {
      if (isAll) {
        result[k] = ids.reduce((s, id) => s + (COMPANY_COST_SCALE[id]?.[k] ?? 1), 0);
      } else {
        const activeId = viewOrg === 'all' ? (ids[0] ?? 'boran') : viewOrg;
        result[k] = COMPANY_COST_SCALE[activeId]?.[k] ?? 1;
      }
    });
    return result;
  }, [selectedCompanyIds, viewOrg]);

  const { filteredTotal, filteredCatAmounts } = useMemo(() => {
    const catKeys = ['ofis','dostavka','transport','ombor','qurilish'];
    const amounts: Record<string,number> = {};
    let total = 0;
    catKeys.forEach(k => {
      const baseSum = (DETAIL_MAP[k]||[]).filter(tx => {
        const d = parseTxDate(tx.date);
        return d >= rangeStart && d <= rangeEnd;
      }).reduce((s,tx) => s + tx.amount, 0);
      const scaled = Math.round(baseSum * (companyScale[k] ?? 1));
      amounts[k] = scaled;
      total += scaled;
    });
    return { filteredTotal: total, filteredCatAmounts: amounts };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd, companyScale]);

  const dynPctChange = useMemo(() => {
    const catKeys = ['ofis','dostavka','transport','ombor','qurilish'];
    const rangeLen = rangeEnd.getTime() - rangeStart.getTime();
    const prevEnd   = new Date(rangeStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - rangeLen);
    let prevTotal = 0;
    catKeys.forEach(k => {
      const base = (DETAIL_MAP[k]||[]).filter(tx => {
        const d = parseTxDate(tx.date);
        return d >= prevStart && d <= prevEnd;
      }).reduce((s,tx) => s + tx.amount, 0);
      prevTotal += Math.round(base * (companyScale[k] ?? 1));
    });
    // fallback: if no prev-period data, use MONTHLY_TREND for reference
    if (prevTotal === 0) {
      const m = rangeStart.getMonth(); // 0-based: 2=Mar
      const TREND_BY_MONTH: Record<number,number> = {9:0,10:1,11:2,0:3,1:4,2:5};
      const idx = TREND_BY_MONTH[m];
      if (idx !== undefined && idx > 0) prevTotal = MONTHLY_TREND[idx-1].total;
    }
    if (prevTotal === 0 || filteredTotal === 0) return null;
    return Math.round(((filteredTotal - prevTotal) / prevTotal) * 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTotal, rangeStart, rangeEnd, companyScale]);

  const donutData=CATS.map(c=>({name:c.name,value:filteredCatAmounts[c.id]??c.amount,color:c.color}));

  // Top-3 KPI cards — always sorted by amount desc
  const kpiTopCats = useMemo(()=>
    [...CATS].sort((a,b)=>(filteredCatAmounts[b.id]??0)-(filteredCatAmounts[a.id]??0)).slice(0,3)
  ,[filteredCatAmounts]);

  // Sort categories for table
  const sortedTableCats = useMemo(()=>{
    if(sortOrder==='default') return CATS;
    return [...CATS].sort((a,b)=>{
      const va = filteredCatAmounts[a.id]??0;
      const vb = filteredCatAmounts[b.id]??0;
      return sortOrder==='desc' ? vb-va : va-vb;
    });
  },[sortOrder, filteredCatAmounts]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const period = `${fmtDate(rangeStart)} - ${fmtDate(rangeEnd)}`;

    // ── Sheet 1: Xulosa (Category summary) ──────────────────────────────
    const orgLabel = viewOrg === 'all' || (selectedCompanyIds && selectedCompanyIds.size > 1)
      ? `Barcha tashkilotlar (${selectedCompanyIds?.size ?? 1} ta)`
      : viewOrg;
    const summaryRows: (string | number)[][] = [
      [`Xarajatlar hisoboti: ${period}`],
      [`Tashkilot: ${orgLabel}`],
      [],
      ['#', 'Kategoriya', `Summa (so'm)`, 'Jami %'],
    ];
    const totalAmt = sortedTableCats.reduce((s, c) => s + (filteredCatAmounts[c.id] ?? 0), 0);
    sortedTableCats.forEach((cat, i) => {
      const amt = filteredCatAmounts[cat.id] ?? 0;
      const pct = totalAmt > 0 ? +((amt / totalAmt) * 100).toFixed(1) : 0;
      summaryRows.push([i + 1, cat.name, amt, pct]);
    });
    summaryRows.push([]);
    summaryRows.push(['', 'JAMI', totalAmt, 100]);
    const wsSum = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSum['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSum, 'Xulosa');

    // ── Sheet 2: Batafsil tranzaksiyalar (filtered by date, scaled) ───────
    const detailHeader = ['Sana', 'Guruh', 'Modda', 'Tavsif', `Summa (so'm)`, 'Izoh', 'Hujjat turi'];
    const detailData: (string | number)[][] = [
      [`Batafsil xarajatlar: ${period}`],
      [`Tashkilot: ${orgLabel}`],
      [],
      detailHeader,
    ];
    const catKeys = ['ofis', 'dostavka', 'transport', 'ombor', 'qurilish'];
    catKeys.forEach(key => {
      const scale = companyScale[key] ?? 1;
      const rows = (DETAIL_MAP[key] || []).filter(tx => {
        const d = parseTxDate(tx.date);
        return d >= rangeStart && d <= rangeEnd;
      });
      rows.forEach(tx => {
        detailData.push([tx.date, tx.group, tx.item, tx.desc, Math.round(tx.amount * scale), tx.note, tx.reg]);
      });
    });
    const wsDet = XLSX.utils.aoa_to_sheet(detailData);
    wsDet['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsDet, 'Batafsil');

    // ── Download ─────────────────────────────────────────────────────────
    const fileName = `Xarajatlar_${fmtDate(rangeStart).replace(/\./g,'-')}_${fmtDate(rangeEnd).replace(/\./g,'-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const toggleCat=(id:string)=>setExpandedCats(prev=>{
    const next=new Set(prev);
    if(next.has(id))next.delete(id);else next.add(id);
    return next;
  });

  const openDetail=(key:string,title:string)=>{
    setDetailKey(key);
    setDetailTitle(title);
  };

  const detailRows  = detailKey ? (DETAIL_MAP[detailKey]||[]) : [];
  const detailPeriod= `${fmtDate(rangeStart)} – ${fmtDate(rangeEnd)}`;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return(
    <>
    <div style={{width:'100%'}}>
      <div className="space-y-5">

        {/* ─── HEADER ─── */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:38,height:38,borderRadius:12,background:'rgba(99,102,241,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <TrendingDown size={18} color="#6366f1"/>
            </div>
            <div>
              <h2 style={{fontSize:20,fontWeight:700,color:txt,letterSpacing:'-0.3px',margin:0}}>{t.zatTitle||'Xarajatlar'}</h2>
              <p style={{fontSize:11,color:muted,marginTop:1}}>{t.zatReportTitle||'Daromad va xarajatlar hisoboti'}</p>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            {/* Date range picker */}
            <div style={{position:'relative'}} ref={calRef}>
              <button onClick={openCal} style={{
                display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:12,
                fontSize:12,fontWeight:600,cursor:'pointer',
                border:`1.5px solid ${calOpen?'#6366f1':border}`,
                background:calOpen?(D?'rgba(99,102,241,0.12)':'rgba(99,102,241,0.06)'):bg,
                color:calOpen?'#6366f1':txt,transition:'all 0.15s',whiteSpace:'nowrap',
              }}>
                <Calendar size={13} color={calOpen?'#6366f1':muted}/>
                {fmtDate(rangeStart)} — {fmtDate(rangeEnd)}
                <ChevronDown size={12} color={muted}/>
              </button>
              {calOpen&&(
                <div style={{
                  position:'absolute',top:'calc(100% + 8px)',right:0,zIndex:200,
                  background:D?'#1a1a1a':'#fff',border:`1px solid ${border}`,
                  borderRadius:18,padding:18,
                  boxShadow:D?'0 20px 60px rgba(0,0,0,0.7)':'0 20px 60px rgba(0,0,0,0.15)',
                  minWidth:isMobile?264:524,
                }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}
                      style={{background:'none',border:'none',cursor:'pointer',color:muted,padding:4}}>
                      <ChevronLeft size={16}/>
                    </button>
                    <span style={{fontSize:11,color:muted,fontWeight:600}}>
                      {pickPhase==='start'?(t.zatPickStart||'📅 Boshlanish sanasini tanlang'):(t.zatPickEnd||'📅 Tugash sanasini tanlang')}
                    </span>
                    <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}
                      style={{background:'none',border:'none',cursor:'pointer',color:muted,padding:4}}>
                      <ChevronRight size={16}/>
                    </button>
                  </div>
                  <div style={{display:'flex',gap:24,flexDirection:isMobile?'column':'row'}}>
                    <CalMonth year={calMonth.getFullYear()} month={calMonth.getMonth()}
                      start={tempStart??rangeStart} end={tempStart?null:rangeEnd} hover={hoverDate}
                      onDayClick={handleDayClick} onDayHover={setHoverDate}
                      D={D} monthNames={MONTH_NAMES} dayNames={DAY_NAMES}/>
                    {!isMobile&&(
                      <CalMonth year={month2.getFullYear()} month={month2.getMonth()}
                        start={tempStart??rangeStart} end={tempStart?null:rangeEnd} hover={hoverDate}
                        onDayClick={handleDayClick} onDayHover={setHoverDate}
                        D={D} monthNames={MONTH_NAMES} dayNames={DAY_NAMES}/>
                    )}
                  </div>
                  <div style={{display:'flex',gap:6,marginTop:14,flexWrap:'wrap'}}>
                    {[
                      {label:t.zatThisMonth||"Bu oy",    s:new Date(2026,2,1),  e:new Date(2026,2,10)},
                      {label:t.zatLastMonth||"O'tgan oy",s:new Date(2026,1,1),  e:new Date(2026,1,28)},
                      {label:t.zatLast90||"90 kun",      s:new Date(2025,11,10),e:new Date(2026,2,10)},
                    ].map(r=>(
                      <button key={r.label} onClick={()=>{setRangeStart(r.s);setRangeEnd(r.e);setPickPhase('start');setTempStart(null);setCalOpen(false);}}
                        style={{padding:'5px 12px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',border:`1px solid ${border}`,background:D?'#252525':'#f3f4f6',color:muted}}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={exportToExcel} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:12,fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid #22c55e`,background:D?'rgba(34,197,94,0.1)':'rgba(34,197,94,0.07)',color:'#22c55e',transition:'all 0.15s',whiteSpace:'nowrap'}}>
              <Download size={13}/> {t.zatExport||'Excel'}
            </button>
            <button
              onClick={()=>setAddExpenseOpen(true)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:12,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',background:'#6366f1',color:'#fff',boxShadow:'0 4px 14px rgba(99,102,241,0.3)',transition:'all 0.15s'}}
            >
              <Plus size={13}/> {t.zatAdd||"Xarajat qo'shish"}
            </button>
          </div>
        </div>

        {/* ─── PERIOD BADGE ─── */}
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:12,background:D?'rgba(99,102,241,0.1)':'rgba(99,102,241,0.06)',border:`1px solid ${D?'rgba(99,102,241,0.25)':'rgba(99,102,241,0.15)'}`}}>
            <FileText size={13} color="#6366f1"/>
            <span style={{fontSize:12,fontWeight:700,color:'#6366f1'}}>{t.zatReportTitle||'DAROMAD VA XARAJATLAR HISOBOTI'}</span>
            <span style={{fontSize:11,color:muted}}>{fmtDate(rangeStart)} – {fmtDate(rangeEnd)}</span>
          </div>
          {/* Active company badge */}
          <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:12,background:D?'rgba(34,197,94,0.08)':'rgba(34,197,94,0.07)',border:`1px solid ${D?'rgba(34,197,94,0.2)':'rgba(34,197,94,0.2)'}`}}>
            <span style={{fontSize:11,fontWeight:700,color:'#22c55e'}}>
              {viewOrg === 'all' || (selectedCompanyIds && selectedCompanyIds.size > 1)
                ? `🌐 ${selectedCompanyIds?.size ?? 1} ta tashkilot`
                : `🏢 ${viewOrg}`}
            </span>
          </div>
        </div>

        {/* ─── KPI CARDS ─── */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12}}>
          <div style={{background:bg,border:`1px solid ${border}`,borderRadius:16,padding:'16px 18px',gridColumn:isMobile?'span 2':'auto',boxShadow:D?'none':'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:11,color:muted,textTransform:'uppercase',letterSpacing:'0.06em'}}>{t.zatTotal||'Jami xarajat'}</span>
              {dynPctChange !== null && (
                <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,background:dynPctChange>0?'rgba(239,68,68,0.12)':'rgba(34,197,94,0.12)',color:dynPctChange>0?'#ef4444':'#22c55e',display:'flex',alignItems:'center',gap:2}}>
                  {dynPctChange>0?<ArrowUpRight size={9}/>:<ArrowDownRight size={9}/>}{Math.abs(dynPctChange)}%
                </span>
              )}
            </div>
            <div style={{fontSize:isMobile?20:24,fontWeight:800,color:txt,letterSpacing:'-0.5px'}}>{$f(filteredTotal)}</div>
            <div style={{fontSize:10,color:muted,marginTop:3}}>{t.zatVsLast||"o'tgan oyga nisbatan"}</div>
          </div>
          {kpiTopCats.map(cat=>{
            const CatIcon=cat.icon;
            const catAmt = filteredCatAmounts[cat.id] ?? 0;
            const pct = filteredTotal > 0 ? Math.round((catAmt/filteredTotal)*100) : 0;
            return(
              <div key={cat.id} style={{background:bg,border:`1px solid ${border}`,borderRadius:16,padding:'16px 18px',boxShadow:D?'none':'0 1px 4px rgba(0,0,0,0.05)'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                  <div style={{width:28,height:28,borderRadius:8,flexShrink:0,background:`${cat.color}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <CatIcon size={13} color={cat.color}/>
                  </div>
                  <span style={{fontSize:10,color:muted,textTransform:'uppercase',letterSpacing:'0.04em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cat.name}</span>
                </div>
                <div style={{fontSize:18,fontWeight:800,color:txt,letterSpacing:'-0.4px'}}>{$f(catAmt)}</div>
                <div style={{marginTop:8,height:4,borderRadius:99,background:D?'#2a2a2a':'#e5e7eb',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:99,width:`${pct}%`,background:cat.color,transition:'width 0.5s'}}/>
                </div>
                <div style={{fontSize:10,color:muted,marginTop:4}}>{pct}% {pctJ}</div>
              </div>
            );
          })}
        </div>

        {/* ─── CHARTS ROW ─── */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14}}>
          <div style={{background:bg,border:`1px solid ${border}`,borderRadius:18,padding:'20px',boxShadow:D?'none':'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{marginBottom:16}}>
              <span style={{fontSize:14,fontWeight:700,color:txt}}>{t.zatDonutTitle||"Kategoriyalar bo'yicha"}</span>
              <p style={{fontSize:11,color:muted,marginTop:2}}>{t.zatDonutSub||'Taqsimot ulushi'}</p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:20}}>
              <div style={{position:'relative',flexShrink:0}}>
                <MiniDonutChart data={donutData} size={130} innerRadius={44} outerRadius={60} dark={D}/>
                <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',pointerEvents:'none'}}>
                  <div style={{fontSize:10,color:muted,fontWeight:600,lineHeight:1.2}}>{t.zatJamiLabel||'JAMI'}</div>
                  <div style={{fontSize:12,color:txt,fontWeight:800,lineHeight:1.2}}>{$f(TOTAL)}</div>
                </div>
              </div>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>
                {CATS.map(cat=>{
                  const pct=Math.round((cat.amount/TOTAL)*100);
                  return(
                    <div key={cat.id} style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{width:10,height:10,borderRadius:3,background:cat.color,flexShrink:0,display:'inline-block'}}/>
                      <span style={{fontSize:11,color:muted,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cat.name}</span>
                      <span style={{fontSize:11,fontWeight:700,color:txt}}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{background:bg,border:`1px solid ${border}`,borderRadius:18,padding:'20px',boxShadow:D?'none':'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div>
                <span style={{fontSize:14,fontWeight:700,color:txt}}>{t.zatTrendTitle||'Oylik trend'}</span>
                <p style={{fontSize:11,color:muted,marginTop:2}}>{t.zatTrendSub||"So'nggi 6 oy"}</p>
              </div>
              <div style={{display:'flex',background:D?'#1f1f1f':'#f3f4f6',borderRadius:8,padding:3,gap:2}}>
                {(['bar','line'] as const).map(v=>(
                  <button key={v} onClick={()=>setShowTrend(v)} style={{padding:'4px 10px',borderRadius:6,fontSize:10,fontWeight:600,border:'none',cursor:'pointer',background:showTrend===v?(D?'#333':'#fff'):'transparent',color:showTrend===v?txt:muted,boxShadow:showTrend===v?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
                    {v==='bar'?(t.zatBarBtn||'Bar'):(t.zatLineBtn||'Line')}
                  </button>
                ))}
              </div>
            </div>
            {showTrend==='bar'
              ?<MiniBarChart data={barData} labelKey="month" series={[{key:'total',name:t.zatTotal||'Xarajat',color:'#6366f1'}]} dark={D} height={120}/>
              :<MiniLineChart data={barData} labelKey="month" series={[{key:'total',name:t.zatTotal||'Xarajat',color:'#6366f1'}]} dark={D} height={120} showDots smooth/>
            }
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
              {MONTHLY_TREND.map(m=><span key={m.month} style={{fontSize:9,color:muted}}>{m.month}</span>)}
            </div>
          </div>
        </div>

        {/* ─── REPORT TABLE ─── */}
        <div style={{background:bg,border:`1px solid ${border}`,borderRadius:18,overflow:'hidden',boxShadow:D?'none':'0 1px 4px rgba(0,0,0,0.05)'}}>
          <div style={{background:D?'#111':'#f8f8f8',borderBottom:`1px solid ${border}`,padding:'14px 20px',textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:800,color:txt,textTransform:'uppercase',letterSpacing:'0.05em'}}>
              {t.zatReportTitle||'Daromad va xarajatlar hisoboti'}
            </div>
            <div style={{fontSize:11,color:muted,marginTop:3}}>
              {t.zatPeriodLabel||'Muddat'}: {fmtDate(rangeStart)} – {fmtDate(rangeEnd)}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr auto':'60px 1fr auto',padding:'8px 20px',borderBottom:`1px solid ${border}`,background:thBg,alignItems:'center'}}>
            {!isMobile&&<span style={{fontSize:10,fontWeight:700,color:muted,textTransform:'uppercase'}}>№</span>}
            <span style={{fontSize:10,fontWeight:700,color:muted,textTransform:'uppercase'}}>{t.zatItemCol||'Daromad va xarajat moddasi'}</span>
            <button
              onClick={()=>setSortOrder(s=>s==='default'?'desc':s==='desc'?'asc':'default')}
              style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4,background:'none',border:'none',cursor:'pointer',
                fontSize:10,fontWeight:700,color:sortOrder!=='default'?'#6366f1':muted,textTransform:'uppercase',padding:0,
                transition:'color 0.15s',
              }}
            >
              {t.zatSumCol||'Summa'}
              {sortOrder==='default' && <ArrowUpDown size={11} color={muted}/>}
              {sortOrder==='desc'    && <ArrowDown  size={11} color="#6366f1"/>}
              {sortOrder==='asc'     && <ArrowUp    size={11} color="#6366f1"/>}
            </button>
          </div>

          {sortedTableCats.map((cat,idx)=>{
            const CatIcon=cat.icon; const expanded=expandedCats.has(cat.id);
            const hasSubs=!!(cat as any).subs?.length;
            const catAmt = filteredCatAmounts[cat.id] ?? 0;
            const pct = filteredTotal > 0 ? Math.round((catAmt/filteredTotal)*100) : 0;
            return(
              <div key={cat.id}>
                {/* Category row — click opens detail */}
                <div
                  style={{
                    display:'grid',gridTemplateColumns:isMobile?'1fr auto':'60px 1fr auto',
                    padding:'12px 20px',borderBottom:`1px solid ${border}`,
                    background:D?'rgba(99,102,241,0.04)':'rgba(99,102,241,0.02)',
                    transition:'background 0.12s',alignItems:'center',
                    cursor:'pointer',
                  }}
                  onClick={()=>toggleCat(cat.id)}
                >
                  {!isMobile&&<span style={{fontSize:12,fontWeight:700,color:muted}}>{idx+1}</span>}
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:`${cat.color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <CatIcon size={14} color={cat.color}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:13,fontWeight:800,color:txt,textTransform:'uppercase',letterSpacing:'0.03em'}}>{cat.name}</span>
                      </div>
                      <div style={{height:3,borderRadius:99,background:D?'#2a2a2a':'#e9e9e9',marginTop:4,overflow:'hidden',width:'100%',maxWidth:200}}>
                        <div style={{height:'100%',borderRadius:99,width:`${pct}%`,background:cat.color}}/>
                      </div>
                    </div>
                    {hasSubs&&(
                      <span style={{color:muted,marginLeft:4,flexShrink:0}} onClick={e=>{e.stopPropagation();toggleCat(cat.id);}}>
                        {expanded?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
                      </span>
                    )}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span style={{fontSize:14,fontWeight:800,color:txt,whiteSpace:'nowrap'}}>{$m(catAmt)}</span>
                    {showBalances && <span style={{fontSize:9,color:muted,marginLeft:4}}>{som}</span>}
                    <div style={{fontSize:9,color:cat.color,fontWeight:700}}>{pct}%</div>
                  </div>
                </div>

                {/* Sub-rows */}
                {hasSubs&&expanded&&(cat as any).subs.map((s:any,si:number)=>(
                  <div key={si}
                    style={{display:'grid',gridTemplateColumns:isMobile?'1fr auto':'60px 1fr auto',padding:'10px 20px 10px 40px',borderBottom:`1px solid ${border}`,background:D?'rgba(255,255,255,0.015)':'rgba(0,0,0,0.012)',alignItems:'center',cursor:'pointer',transition:'background 0.1s'}}
                    onClick={()=>openDetail(`${cat.id}:${si}`, s.name)}
                  >
                    {!isMobile&&<span style={{fontSize:11,color:muted}}>{idx+1}.{si+1}</span>}
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:cat.color,display:'inline-block',flexShrink:0}}/>
                      <span style={{fontSize:12,color:txt}}>{s.name}</span>
                      <ExternalLink size={10} color={muted}/>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <span style={{fontSize:13,fontWeight:600,color:txt,whiteSpace:'nowrap'}}>{$m(s.amount)}</span>
                      {showBalances && <span style={{fontSize:9,color:muted,marginLeft:3}}>{som}</span>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* ИТОГО */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr auto':'60px 1fr auto',padding:'14px 20px',background:D?'#111':'#f0f0f5',borderTop:`2px solid ${border}`,alignItems:'center'}}>
            {!isMobile&&<span style={{fontSize:13,fontWeight:800,color:txt}}>—</span>}
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:'rgba(99,102,241,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <TrendingDown size={14} color="#6366f1"/>
              </div>
              <span style={{fontSize:14,fontWeight:900,color:txt,textTransform:'uppercase',letterSpacing:'0.05em'}}>{t.zatItogo||'JAMI (ИТО��О)'}</span>
            </div>
            <div style={{textAlign:'right'}}>
              <span style={{fontSize:16,fontWeight:900,color:'#6366f1',whiteSpace:'nowrap'}}>{$m(filteredTotal)}</span>
              {showBalances && <span style={{fontSize:10,color:muted,marginLeft:4}}>{som}</span>}
            </div>
          </div>
        </div>

        {/* ─── DYNAMIC CHART (collapsible) ─── */}
        <div style={{background:bg,border:`1px solid ${border}`,borderRadius:18,overflow:'hidden',boxShadow:D?'none':'0 1px 4px rgba(0,0,0,0.05)'}}>
          {/* Clickable header */}
          <div
            onClick={()=>setChartOpen(o=>!o)}
            style={{
              display:'flex',alignItems:'center',justifyContent:'space-between',
              gap:12,padding:'18px 24px',cursor:'pointer',
              userSelect:'none',
              borderBottom: chartOpen?`1px solid ${border}`:'none',
              transition:'border-color 0.2s',
            }}
          >
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{
                width:32,height:32,borderRadius:9,flexShrink:0,
                background:D?'rgba(99,102,241,0.15)':'rgba(99,102,241,0.08)',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                <BarChart2 size={15} color="#6366f1"/>
              </div>
              <div>
                <span style={{fontSize:14,fontWeight:700,color:txt,display:'block'}}>
                  {t.zatCatDynTitle||"Kategoriyalar bo'yicha oylik dinamika"}
                </span>
                <span style={{fontSize:11,color:muted}}>
                  {t.zatCatDynSub||"So'nggi 6 oylik ko'rsatkich"}
                </span>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              {/* Badge */}
              <span style={{
                fontSize:10,fontWeight:700,
                padding:'3px 8px',borderRadius:20,
                background:chartOpen?(D?'rgba(99,102,241,0.2)':'rgba(99,102,241,0.1)'):(D?'#232323':'#f0f0f5'),
                color:chartOpen?'#6366f1':muted,
                transition:'all 0.18s',
              }}>
                {chartOpen?(t.zatChartHide||'Yopish'):(t.zatChartShow||"Ko'rish")}
              </span>
              <span style={{
                width:28,height:28,borderRadius:8,
                display:'flex',alignItems:'center',justifyContent:'center',
                background:D?'#232323':'#f3f4f6',
                color:muted,
                transition:'transform 0.25s',
                transform:chartOpen?'rotate(180deg)':'rotate(0deg)',
              }}>
                <ChevronDown size={14}/>
              </span>
            </div>
          </div>

          {/* Collapsible body */}
          <div style={{
            overflow:'hidden',
            maxHeight:chartOpen?800:0,
            transition:'max-height 0.38s cubic-bezier(0.4,0,0.2,1)',
          }}>
            <div style={{padding:'20px 24px 24px'}}>
              {/* Chart type switcher */}
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
                <div style={{display:'flex',gap:3,padding:3,borderRadius:11,background:D?'#1a1a1a':'#f3f4f6',border:`1px solid ${border}`}}>
                  {([
                    {key:'stacked', Icon:BarChart2,  labelKey:'zatChartStacked'},
                    {key:'grouped', Icon:BarChart3,  labelKey:'zatChartGrouped'},
                    {key:'line',    Icon:TrendingUp, labelKey:'zatChartLine'},
                  ] as const).map(({key,Icon,labelKey})=>{
                    const label=t[labelKey]||labelKey;
                    const isActive=chartType===key;
                    return(
                      <button key={key} onClick={()=>setChartType(key)} title={label}
                        style={{
                          display:'flex',alignItems:'center',gap:isMobile?0:5,
                          padding:isMobile?'6px 8px':'6px 12px',
                          borderRadius:8,border:'none',cursor:'pointer',
                          fontSize:11,fontWeight:600,
                          background:isActive?(D?'#fff':'#111'):'transparent',
                          color:isActive?(D?'#111':'#fff'):muted,
                          transition:'all 0.18s',
                        }}>
                        <Icon size={13}/>
                        {!isMobile&&<span>{label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chart */}
              {chartType==='stacked' && <StackedBarChart data={MONTHLY_TREND} cats={sbCats} D={D} txt={txt} muted={muted}/>}
              {chartType==='grouped' && <GroupedBarChart data={MONTHLY_TREND} cats={sbCats} D={D} txt={txt} muted={muted}/>}
              {chartType==='line'    && <LineChartSVG    data={MONTHLY_TREND} cats={sbCats} D={D} txt={txt} muted={muted}/>}

              {/* Legend */}
              <div style={{display:'flex',flexWrap:'wrap',gap:14,marginTop:16}}>
                {CATS.map(cat=>(
                  <div key={cat.id} style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{
                      width:chartType==='line'?18:11,
                      height:chartType==='line'?3:11,
                      borderRadius:chartType==='line'?2:3,
                      background:cat.color,display:'inline-block',flexShrink:0,
                    }}/>
                    <span style={{fontSize:11,color:muted,fontWeight:500}}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    {/* ─── DETAIL MODAL ─── */}
    {detailKey && (
      <DetailModal
        rows={detailRows}
        title={detailTitle}
        period={detailPeriod}
        D={D} t={t}
        onClose={()=>setDetailKey(null)}
      />
    )}

    {/* ─── ADD EXPENSE MODAL ─── */}
    {addExpenseOpen && (
      <AddExpenseModal
        D={D} t={t}
        onClose={()=>setAddExpenseOpen(false)}
        onSave={(data)=>{ console.log('New expense:', data); }}
      />
    )}
    </>
  );
}