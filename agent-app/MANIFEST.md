# Agent Mobil Ilova — Ajratilgan fayllar

> **Maqsad:** Admin paneldan ajratilgan agent (savdo agenti) mobil ilova.  
> **Holat:** Hozirgi kod `_legacy-src/` da nusxa sifatida saqlangan. Keyin qayta yoziladi.  
> **Til:** Hali tanlanmagan (keyinroq aniqlanadi).

---

## Bosh sahifa (Dashboard) — referens

Rasmga mos ekran: `src/app/pages/Dashboard.tsx`

| UI element | Kod |
|------------|-----|
| Kompaniya: `OOO "BORAN LEADERS"` | `companyName` (122-qator) |
| Agent: `Абдужакимов Диёрбек` | `agentName` (120-qator) |
| Jami sotish + ko'z tugmasi | `showBalance`, `totalBalance` |
| Sana: `Juma 29.05.2026` | `fullDate` |
| 4 ta tezkor tugma | Qo'shish, Yangilash, Batafsil, Ko'proq |
| Klientlar ro'yxati `89 / 1 / 88` | `clientsData` statistikasi |
| Vizitlar soni | dashboard kartochkalar |
| Jami sotish `0` | `cartValue` / `getTotal()` |
| Pastki nav: Asosiy, Dostavka, Locatsiya, Plan, Xabarlar | `BottomNav.tsx` |

---

## Agent ilova marshrutlari

Fayl: `src/app/routes.ts` (faqat agent qismi)

| Yo'l | Sahifa | Fayl |
|------|--------|------|
| `/` yoki `/home` | Bosh sahifa | `pages/Dashboard.tsx` |
| `/products` | Mahsulotlar | `pages/Products.tsx` |
| `/clients` | Klientlar ro'yxati | `pages/ClientsList.tsx` |
| `/clients/:id` yoki `/client/:id` | Klient tafsiloti | `pages/ClientDetail.tsx` |
| `/visit` | Vizit / buyurtma | `pages/Visit.tsx` |
| `/visit/category/:id` | Kategoriya | `pages/CategoryDetail.tsx` |
| `/visit/product/:id` | Mahsulot | `pages/ProductDetail.tsx` |
| `/order-summary` | Buyurtma yakuni | `pages/OrderSummary.tsx` |
| `/sverka/:clientId` | Akt-sverka | `pages/Sverka.tsx` |
| `/plan` | Plan | `pages/Plan.tsx` |
| `/messages` | Xabarlar ro'yxati | `pages/Messages.tsx` |
| `/messages/:chatId` | Chat | `pages/Chat.tsx` |
| `/profile` | Profil | `pages/profile.tsx` |
| `/locatsiya` | Lokatsiya / xarita | `pages/LocatsiyaPage.tsx` |
| `/liniya` | Liniya | `pages/Liniya.tsx` |
| `/sotrudniki` | Xodimlar | `pages/Sotrudniki.tsx` |

---

## 1. Sahifalar (pages) — 16 ta

```
src/app/pages/
├── Dashboard.tsx       ★ Bosh sahifa (rasm)
├── ClientsList.tsx     Klientlar + xarita + qidiruv
├── ClientDetail.tsx    Klient profili, to'lov, vizit
├── Visit.tsx           Mahsulot tanlash, savatcha
├── CategoryDetail.tsx  Kategoriya ichidagi mahsulotlar
├── ProductDetail.tsx   Bitta mahsulot
├── OrderSummary.tsx    Buyurtma tasdiqlash
├── Sverka.tsx          Hisob-kitob / akt-sverka
├── Plan.tsx            Savdo rejasi
├── Messages.tsx        Xabarlar ro'yxati
├── Chat.tsx            Chat oynasi
├── Profile.tsx         Profil, parol
├── LocatsiyaPage.tsx   GPS xarita
├── Liniya.tsx          Yo'nalish
├── Sotrudniki.tsx      Xodimlar
└── Products.tsx        Mahsulotlar katalogi
```

---

## 2. Komponentlar (components) — agent uchun

### Faqat agent ilovasi

```
src/app/components/
├── BottomNav.tsx           Pastki navigatsiya (480px mobil)
├── CartContext.tsx         Savatcha, buyurtmalar, to'lovlar
├── ProductCard.tsx         Mahsulot kartochkasi
├── SearchClients.tsx       Klient qidiruv
└── figma/
    └── ImageWithFallback.tsx
```

### Agent + Admin (umumiy — qayta yozishda alohida qaror kerak)

```
src/app/components/
├── ThemeContext.tsx        Qorong'u rejim + til (uz_latn, uz_cyrl, ru)
├── ClientMap.tsx           Xarita (Leaflet) — agent va admin
├── AddClient.tsx           Yangi klient qo'shish — agent va admin
└── AddProductDrawer.tsx    Mahsulot qo'shish (asosan admin, lekin agent Visit bilan bog'liq)
```

---

## 3. Ma'lumotlar (data)

```
src/app/data/
├── clients.ts              Klientlar ro'yxati (8 ta mock)
└── categories.ts           Mahsulot kategoriyalari (SHERIN, TIM, SIR...)
```

**Agent uchun KERAK EMAS:**
- `adminData.ts` (154 KB)
- `adminProducts.ts`

---

## 4. Context va App kirish nuqtasi

```
src/app/
├── App.tsx                 ThemeProvider + CartProvider + Router
└── routes.ts               Agent marshrutlari (admin qismini olib tashlash kerak)

src/
├── main.tsx
└── styles/
    ├── index.css
    ├── tailwind.css
    └── theme.css
```

**Agent uchun KERAK EMAS:**
- `AdminAuthContext.tsx`
- `LangContext.tsx` (admin til tizimi — agent `ThemeContext` ishlatadi)

---

## 5. Rasmlar (assets)

```
src/assets/
├── 2a99a8088f15654ac307b4f6c4d88bef7a24f8bd.png   ProductDetail
└── 58fc246c4a155129d1144ff650ab41d756727992.png
```

---

## 6. UI kutubxonasi (shadcn/ui)

Agent ilovasi hozir to'g'ridan-to'g'ri shadcn ishlatmaydi — asosan inline style va Tailwind.  
Qayta yozishda kerak bo'lishi mumkin:

```
src/app/components/ui/   (40+ komponent — ixtiyoriy)
```

---

## 7. Admin panel — AJRATILMASLIGI KERAK

Quyidagilar agent ilovaga **kirmaydi**:

```
src/app/pages/
├── AdminLogin.tsx
├── AdminSelectCompany.tsx
└── AdminPanel.tsx

src/app/components/
├── AdminAuthContext.tsx
├── AdminProductsTab.tsx
├── admin/                  (barcha admin tab va modal)
├── EmployeeMapModal.tsx    (faqat admin)
├── InlineEmployeeMap.tsx   (faqat admin)
├── MiniCharts.tsx          (faqat admin)
├── MapLayerSwitcher.tsx    (asosan admin)
└── GarageIcon.tsx          (faqat admin)

src/app/data/
├── adminData.ts
└── adminProducts.ts
```

---

## 8. package.json — agent uchun kerakli kutubxonalar

```json
{
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "react-router": "7.13.0",
  "leaflet": "^1.9.4",
  "react-leaflet": "^5.0.0",
  "@types/leaflet": "^1.9.21",
  "lucide-react": "0.487.0",
  "tailwindcss": "4.1.12",
  "vite": "6.3.5"
}
```

**Ixtiyoriy (hozir ishlatilmaydi yoki kam):** recharts, xlsx, react-dnd, MUI

---

## 9. Ekranlar oqimi

```
Dashboard (/)
    ├── Klientlar ro'yxati → /clients
    │       └── ClientDetail → /visit (buyurtma)
    │               ├── CategoryDetail → ProductDetail
    │               └── OrderSummary
    ├── Locatsiya → /locatsiya (ClientMap)
    ├── Plan → /plan
    ├── Xabarlar → /messages → /messages/:id
    └── Profil → /profile

BottomNav:
    Asosiy (/) | Dostavka (o'chirilgan) | Locatsiya | Plan | Xabarlar
```

---

## 10. localStorage kalitlari (agent)

| Kalit | Ma'nosi |
|-------|---------|
| `crm_cart_items` | Savatcha |
| `crm_submitted_orders` | Buyurtmalar |
| `crm_current_client` | Joriy klient |
| `crm_payments` | To'lovlar |
| `crm_profile_password` | Profil paroli |
| `crm_chats` | Xabarlar |

---

## Keyingi qadam

1. Til tanlang (React Native, Flutter, Kotlin, Capacitor + React, va h.k.)
2. `agent-app/` ichida yangi loyiha yaratiladi
3. `_legacy-src/` dagi kod referens sifatida ishlatiladi
4. Admin panel alohida qoladi
