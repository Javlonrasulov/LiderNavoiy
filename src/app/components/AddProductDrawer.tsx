import { useRef, useState } from 'react';
import {
  X, ChevronLeft, Camera, Upload, Trash2,
  Package, Tag, Building2, Layers,
  Scale, DollarSign, Barcode, Hash,
  CheckCircle2, Check, Plus, Maximize2, Minimize2,
} from 'lucide-react';
import { ADMIN_ORGS } from '../data/adminProducts';
import { api } from '../api/client';
import { compressProductImage } from '../utils/compressImage';
import { resolveProductImageUrl } from '../utils/productImageUrl';

// ── Shared AddForm type ──────────────────────────────────────────────────────
export type AddForm = {
  ismi: string; kodShort: string; artikul: string; brend: string;
  gruppa: string; postavshik: string; org: string;
  tipTo: string; shtUpakovka: string; netto: string; brutto: string;
  srok: string; rtl: string; balance: string; shtrixKod: string; ikpu: string;
  hajmM3: string; format: string; edIzmUpak: string; edIzmSht: string;
  sotuv: string; asosiyEd: string; holat: string;
  mobil: boolean; buyurtmaQoldiq: boolean; markalangan: boolean;
  buTara: boolean; tara: string; donaTarada: string;
  categoryId: string;
  imageUrl: string;
};

// ── Category type (shared) ───────────────────────────────────────────────────
export interface DrawerCategory {
  id: string;
  name: string;
  color: string;
  emoji: string;
  image?: string;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  D: boolean;
  addForm: AddForm;
  setF: (k: keyof AddForm, v: string | boolean) => void;
  patchForm?: (patch: Partial<AddForm>) => void;
  addTab: 'asosiy' | 'extra' | 'balans';
  setAddTab: (t: 'asosiy' | 'extra' | 'balans') => void;
  onClose: () => void;
  onSave: () => void;
  categories?: DrawerCategory[];
  isEdit?: boolean;
  editTitle?: string;
  saveError?: string | null;
  t?: Record<string, string>;
}

// ── Brand color map ──────────────────────────────────────────────────────────
const BRAND_COLORS: Record<string, string> = {
  SHERIN: '#e11d48', PILLER: '#f59e0b', TIM: '#3b82f6',
  ANDALUS: '#8b5cf6', "A'LO TA'M": '#10b981', SIR: '#f97316',
  DEFAULT: '#6366f1',
};

// ── Main component ───────────────────────────────────────────────────────────
export function AddProductDrawer({ D, addForm, setF, patchForm, addTab, setAddTab, onClose, onSave, categories = [], isEdit = false, editTitle, saveError = null, t = {} }: Props) {
  const applyPatch = patchForm ?? ((patch: Partial<AddForm>) => {
    for (const [key, value] of Object.entries(patch)) {
      setF(key as keyof AddForm, value as string | boolean);
    }
  });
  const imgPreview = resolveProductImageUrl(addForm.imageUrl);
  const [imgDrag, setImgDrag]       = useState(false);
  const [maximized, setMaximized]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Colours ─────────────────────────────────────────────────────────────
  const bg   = D ? '#0d0f14' : '#ffffff';
  const bg2  = D ? '#13161e' : '#f8f9fb';
  const bg3  = D ? '#1a1d27' : '#f1f3f8';
  const bdr  = D ? '#252836' : '#e8eaf0';
  const txt  = D ? '#f1f2f6' : '#111827';
  const sub  = D ? '#6b7280' : '#9ca3af';
  const sub2 = D ? '#4b5563' : '#d1d5db';
  const acc  = '#6366f1';

  const inpCls = [
    'w-full h-11 px-4 rounded-2xl border text-sm outline-none transition-all duration-200',
    D
      ? 'bg-[#1a1d27] border-[#252836] text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:bg-[#1e2132]'
      : 'bg-[#f8f9fb] border-[#e8eaf0] text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:bg-white',
  ].join(' ');

  const selCls = inpCls + ' cursor-pointer';

  // ── Section heading ──────────────────────────────────────────────────────
  function SectionHead({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: D ? '#1e2132' : '#ededf8' }}>
          <span style={{ color: acc }}>{icon}</span>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: sub }}>{label}</span>
      </div>
    );
  }

  function FLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-xs mb-1.5 ml-1" style={{ color: sub }}>{children}</label>;
  }

  // ── Toggle switch ────────────────────────────────────────────────────────
  function Toggle({ fkey }: { fkey: keyof AddForm }) {
    const val = addForm[fkey] as boolean;
    return (
      <button type="button" onClick={() => setF(fkey, !val)}
        className="flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 relative"
        style={{ background: val ? acc : D ? '#252836' : '#e5e7eb' }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-all duration-300"
          style={{ left: val ? '22px' : '2px', background: '#ffffff' }} />
      </button>
    );
  }

  function ToggleRow({ label, fkey, hint }: { label: string; fkey: keyof AddForm; hint?: string }) {
    return (
      <div className="flex items-center justify-between gap-3 py-3.5"
        style={{ borderBottom: `1px solid ${bdr}` }}>
        <div>
          <p className="text-sm" style={{ color: txt }}>{label}</p>
          {hint && <p className="text-xs mt-0.5" style={{ color: sub }}>{hint}</p>}
        </div>
        <Toggle fkey={fkey} />
      </div>
    );
  }

  // ── Image handlers ───────────────────────────────────────────────────────
  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    try {
      const compressed = await compressProductImage(file);
      try {
        const uploaded = await api.uploadProductImage(compressed);
        setF('imageUrl', uploaded.url);
      } catch {
        setF('imageUrl', compressed);
      }
    } catch (err) {
      console.error('Product image compress failed', err);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function clearImage() {
    setF('imageUrl', '');
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── Sotuv turi pills ─────────────────────────────────────────────────────
  const tipOptions = ['Штучн.', 'Тарози', 'Весов.'];

  // ── Holat options ────────────────────────────────────────────────────────
  const holatOptions = [
    { val: 'Доступ открыт', label: t.holatOchiq    ?? 'Ochiq',     color: '#10b981' },
    { val: 'Доступ закрыт', label: t.holatYopiq    ?? 'Yopiq',     color: '#ef4444' },
    { val: 'Архив',         label: t.holatArxiv    ?? 'Arxiv',     color: '#6b7280' },
    { val: 'Черновик',      label: t.holatQoralama ?? 'Qoralama',  color: '#f59e0b' },
  ];

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const tabs: { key: 'asosiy' | 'extra' | 'balans'; label: string }[] = [
    { key: 'asosiy', label: t.drawerTabMain  ?? 'Asosiy' },
    { key: 'extra',  label: t.drawerTabPrice ?? 'Narx & Kod' },
    { key: 'balans', label: t.drawerTabOrg   ?? 'Org & Holat' },
  ];

  // ── Modal size classes ───────────────────────────────────────────────────
  const modalW = maximized ? '100vw' : 'min(600px, 96vw)';
  const modalH = maximized ? '100vh' : 'min(90vh, 900px)';
  const modalR = maximized ? '0px'   : '24px';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      {/* ── Modal card ── */}
      <div
        className="flex flex-col overflow-hidden shadow-2xl transition-all duration-300"
        style={{
          width: modalW,
          height: modalH,
          background: bg,
          borderRadius: modalR,
          border: maximized ? 'none' : `1px solid ${bdr}`,
        }}>

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-0" style={{ borderBottom: `1px solid ${bdr}` }}>

          {/* Top nav row */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={onClose}
              className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
              style={{ color: sub }}>
              <ChevronLeft size={16} />
              <span>{t.drawerBack ?? 'Orqaga'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: acc }} />
              <span className="text-xs font-medium" style={{ color: sub }}>{isEdit ? (editTitle ?? t.drawerSaveEdit ?? 'Tahrirlash') : (t.drawerSaveAdd ?? 'Yangi mahsulot')}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Maximize / minimize toggle */}
              <button
                onClick={() => setMaximized(m => !m)}
                title={maximized ? (t.drawerMinimize ?? 'Kichraytirish') : (t.drawerMaximize ?? 'Kattalashtirish')}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
                style={{ background: bg3, color: sub }}>
                {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
                style={{ background: bg3, color: sub }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Live title */}
          <div className="mb-4">
            <h2 className="text-xl font-bold truncate" style={{ color: addForm.ismi ? txt : sub2 }}>
              {addForm.ismi || (t.drawerNamePh ?? 'Mahsulot nomi...')}
            </h2>
            {addForm.brend && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: BRAND_COLORS[addForm.brend.toUpperCase()] ?? BRAND_COLORS.DEFAULT }} />
                <span className="text-xs" style={{ color: sub }}>{addForm.brend}</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex">
            {tabs.map(tb => (
              <button key={tb.key} onClick={() => setAddTab(tb.key)}
                className="flex-1 py-3 text-xs font-semibold transition-all relative"
                style={{ color: addTab === tb.key ? acc : sub }}>
                {tb.label}
                {addTab === tb.key && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full"
                    style={{ background: acc }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* ════ TAB: ASOSIY ════ */}
          {addTab === 'asosiy' && <>

            {/* Image upload */}
            <div>
              <SectionHead icon={<Camera size={14} />} label={t.drawerImgSec ?? 'Mahsulot rasmi'} />
              {imgPreview ? (
                <div className="relative rounded-2xl overflow-hidden" style={{ border: `1px solid ${bdr}` }}>
                  <img src={imgPreview} alt="preview" className="w-full h-52 object-cover" />
                  <div className="absolute inset-0 flex items-end gap-2 p-3"
                    style={{ background: 'linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 60%)' }}>
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-medium"
                      style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,.2)' }}>
                      <Upload size={11} /> {t.drawerImgReplace ?? 'Almashtirish'}
                    </button>
                    <button onClick={clearImage}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-medium"
                      style={{ background: 'rgba(239,68,68,.7)', backdropFilter: 'blur(6px)' }}>
                      <Trash2 size={11} /> {t.drawerImgDel ?? "O'chirish"}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setImgDrag(true); }}
                  onDragLeave={() => setImgDrag(false)}
                  onDrop={e => { e.preventDefault(); setImgDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  className="w-full h-48 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 cursor-pointer"
                  style={{
                    border: `2px dashed ${imgDrag ? acc : bdr}`,
                    background: imgDrag ? (D ? '#1e2132' : '#f0f0ff') : bg2,
                  }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: D ? '#1e2132' : '#ededf8' }}>
                    <Camera size={24} style={{ color: acc }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: txt }}>{t.drawerImgUpload ?? 'Rasm yuklash'}</p>
                    <p className="text-xs mt-0.5" style={{ color: sub }}>JPG, PNG, WEBP · maks 5MB</p>
                    <p className="text-xs" style={{ color: sub }}>{t.drawerImgHint ?? 'Bosing yoki suring'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl"
                    style={{ background: acc + '22', border: `1px solid ${acc}44` }}>
                    <Plus size={12} style={{ color: acc }} />
                    <span className="text-xs font-medium" style={{ color: acc }}>{t.drawerImgFile ?? 'Fayl tanlash'}</span>
                  </div>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {/* Basic info */}
            <div>
              <SectionHead icon={<Package size={14} />} label={t.drawerMainSec ?? "Asosiy ma'lumotlar"} />
              <div className="space-y-3">
                <div>
                  <FLabel>{t.drawerNameLabel ?? 'Mahsulot nomi *'}</FLabel>
                  <input className={inpCls} value={addForm.ismi}
                    onChange={e => setF('ismi', e.target.value)}
                    placeholder={t.drawerNamePh ?? "Mahsulot to'liq nomi..."} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FLabel>{t.drawerArtLabel ?? 'Artikul'}</FLabel>
                    <input className={inpCls} value={addForm.artikul}
                      onChange={e => setF('artikul', e.target.value)} placeholder="ШПВК0208" />
                  </div>
                  <div>
                    <FLabel>{t.drawerKodLabel ?? 'Kod'}</FLabel>
                    <input className={inpCls} value={addForm.kodShort}
                      onChange={e => setF('kodShort', e.target.value)} placeholder="10001" />
                  </div>
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <SectionHead icon={<Tag size={14} />} label={t.drawerCatSec ?? 'Kategoriya'} />
              <div className="space-y-3">
                {categories.length > 0 ? (
                  <div>
                    <FLabel>{t.drawerCatSelectLbl ?? 'Kategoriyani tanlang'}</FLabel>
                    <div className="flex flex-wrap gap-2">
                      {/* No category option */}
                      <button
                        type="button"
                        onClick={() => applyPatch({ categoryId: '', brend: '', gruppa: '' })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium transition-all duration-200"
                        style={{
                          background: !addForm.categoryId ? (D ? '#1e2132' : '#ededf8') : (D ? '#1a1d27' : '#f1f3f8'),
                          border: `1.5px solid ${!addForm.categoryId ? acc : bdr}`,
                          color: !addForm.categoryId ? acc : sub,
                          boxShadow: !addForm.categoryId ? `0 0 0 3px ${acc}18` : 'none',
                        }}
                      >
                        <span style={{ color: sub }}>—</span>
                        <span>{t.drawerNoCat ?? 'Kategoriyasiz'}</span>
                      </button>
                      {categories.map(cat => {
                        const isActive = addForm.categoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => applyPatch({
                              categoryId: cat.id,
                              brend: cat.name,
                              gruppa: cat.name,
                            })}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all duration-200"
                            style={{
                              background: isActive ? cat.color : (D ? '#1a1d27' : '#f1f3f8'),
                              border: `1.5px solid ${isActive ? cat.color : bdr}`,
                              color: isActive ? '#ffffff' : txt,
                              boxShadow: isActive ? `0 4px 14px ${cat.color}50` : 'none',
                              transform: isActive ? 'scale(1.04)' : 'scale(1)',
                            }}
                          >
                            {cat.image
                              ? <img src={cat.image} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                              : <span className="text-sm">{cat.emoji}</span>}
                            {cat.name}
                            {isActive && <Check size={11} />}
                          </button>
                        );
                      })}
                    </div>
                    {addForm.categoryId && (
                      <p className="text-xs mt-2 ml-1" style={{ color: sub }}>
                        {t.drawerCatAuto ?? "Brend va Guruh avtomatik to'ldirildi"}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl"
                    style={{ border: `1.5px dashed ${bdr}`, background: bg2 }}
                  >
                    <span className="text-2xl">📂</span>
                    <p className="text-xs text-center" style={{ color: sub }}>
                      {t.drawerNoCatYet ?? "Hali kategoriyalar yo'q. Avval kategoriya yarating."}
                    </p>
                  </div>
                )}
                {/* Manual brend/gruppa — always visible for advanced override */}
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${bdr}`, background: bg2 }}
                >
                  <div className="px-3 py-2" style={{ borderBottom: `1px solid ${bdr}` }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: sub }}>
                      {t.drawerManual ?? "Qo'lda kiritish (ixtiyoriy)"}
                    </p>
                  </div>
                  <div className="px-3 py-3 space-y-2.5">
                    <div>
                      <FLabel>{t.drawerBrendLabel ?? 'Brend'}</FLabel>
                      <input className={inpCls} value={addForm.brend}
                        onChange={e => setF('brend', e.target.value)} placeholder="SHERIN, PILLER..." />
                    </div>
                    <div>
                      <FLabel>{t.drawerGruppaLabel ?? 'Guruh'}</FLabel>
                      <input className={inpCls} value={addForm.gruppa}
                        onChange={e => setF('gruppa', e.target.value)} placeholder="Шерин (Склад)..." />
                    </div>
                  </div>
                </div>
                <div>
                  <FLabel>{t.drawerPostavLabel ?? 'Postavshik'}</FLabel>
                  <input className={inpCls} value={addForm.postavshik}
                    onChange={e => setF('postavshik', e.target.value)}
                    placeholder='ЧП "SALAR MEAT PRODUCT"' />
                </div>
              </div>
            </div>

            {/* O'lcham */}
            <div>
              <SectionHead icon={<Scale size={14} />} label={t.drawerSizeSec ?? "O'lcham va sotuv turi"} />
              <div className="space-y-3">
                <div>
                  <FLabel>{t.drawerTipLabel ?? 'Sotuv turi'}</FLabel>
                  <div className="flex gap-2">
                    {tipOptions.map(tip => {
                      const active = addForm.tipTo === tip;
                      return (
                        <button key={tip} type="button"
                          onClick={() => setF('tipTo', tip)}
                          className="flex-1 h-10 rounded-2xl text-xs font-semibold transition-all duration-200"
                          style={{
                            background: active ? acc : bg2,
                            color: active ? '#fff' : sub,
                            border: `1px solid ${active ? acc : bdr}`,
                            boxShadow: active ? `0 4px 12px ${acc}40` : 'none',
                          }}>
                          {tip}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <FLabel>шт.уп</FLabel>
                    <input type="number" className={inpCls} value={addForm.shtUpakovka}
                      onChange={e => setF('shtUpakovka', e.target.value)} placeholder="1" />
                  </div>
                  <div>
                    <FLabel>Netto (kg)</FLabel>
                    <input type="number" className={inpCls} value={addForm.netto}
                      onChange={e => setF('netto', e.target.value)} placeholder="0.400" />
                  </div>
                  <div>
                    <FLabel>Brutto (kg)</FLabel>
                    <input type="number" className={inpCls} value={addForm.brutto}
                      onChange={e => setF('brutto', e.target.value)} placeholder="0.000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FLabel>{t.drawerSrokLabel ?? 'Muddati (oy)'}</FLabel>
                    <input type="number" className={inpCls} value={addForm.srok}
                      onChange={e => setF('srok', e.target.value)} placeholder="12" />
                  </div>
                  <div>
                    <FLabel>{t.drawerUnitLabel ?? "Asosiy o'lchov"}</FLabel>
                    <select className={selCls} value={addForm.asosiyEd}
                      onChange={e => setF('asosiyEd', e.target.value)}>
                      {['шт','кг','л','Блок/упак','Упак','Ящик'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div>
              <SectionHead icon={<Layers size={14} />} label={t.drawerSettingsSec ?? 'Sozlamalar'} />
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${bdr}`, background: bg2 }}>
                <div className="px-4">
                  <ToggleRow label={t.drawerMobil ?? 'Mobil sotuv'} fkey="mobil" hint={t.drawerMobilHint ?? "Agentlar ilovada ko'radi"} />
                  <ToggleRow label={t.drawerNoStock ?? 'Qoldiqsiz buyurtma'} fkey="buyurtmaQoldiq"
                    hint={t.drawerNoStockHint ?? "Sklad bo'sh bo'lsa ham buyurtma qabul qilish"} />
                  <div className="flex items-center justify-between gap-3 py-3.5">
                    <div>
                      <p className="text-sm" style={{ color: txt }}>{t.drawerMarked ?? 'Markalangan'}</p>
                      <p className="text-xs mt-0.5" style={{ color: sub }}>{t.drawerMarkedHint ?? 'Maxsus belgilash kerak'}</p>
                    </div>
                    <Toggle fkey="markalangan" />
                  </div>
                </div>
              </div>
            </div>

          </>}

          {/* ════ TAB: NARX & KOD ════ */}
          {addTab === 'extra' && <>

            <div>
              <SectionHead icon={<DollarSign size={14} />} label={t.drawerPriceSec ?? 'Narx va qoldiq'} />
              <div className="space-y-3">
                <div>
                  <FLabel>{t.drawerRtlLabel ?? "RTL narxi (so'm)"}</FLabel>
                  <div className="relative">
                    <input type="number" className={inpCls} value={addForm.rtl}
                      onChange={e => setF('rtl', e.target.value)}
                      placeholder="0" style={{ paddingRight: '52px' }} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: sub }}>so'm</span>
                  </div>
                </div>
                <div>
                  <FLabel>{t.drawerBalLabel ?? 'Qoldiq (dona)'}</FLabel>
                  <div className="relative">
                    <input type="number" className={inpCls} value={addForm.balance}
                      onChange={e => setF('balance', e.target.value)}
                      placeholder="0" style={{ paddingRight: '52px' }} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: sub }}>dona</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <SectionHead icon={<Barcode size={14} />} label={t.drawerBarcodeSec ?? 'Identifikatsiya kodlar'} />
              <div className="space-y-3">
                <div>
                  <FLabel>Shtrix-kod (Barcode)</FLabel>
                  <input className={inpCls} value={addForm.shtrixKod}
                    onChange={e => setF('shtrixKod', e.target.value)} placeholder="4600100064501" />
                </div>
                <div>
                  <FLabel>ИКПУ / MXIK</FLabel>
                  <input className={inpCls} value={addForm.ikpu}
                    onChange={e => setF('ikpu', e.target.value)} placeholder="10200645" />
                </div>
                <div>
                  <FLabel>Format</FLabel>
                  <input className={inpCls} value={addForm.format}
                    onChange={e => setF('format', e.target.value)} placeholder="..." />
                </div>
              </div>
            </div>

          </>}

          {/* ════ TAB: ORG & HOLAT ════ */}
          {addTab === 'balans' && <>

            <div>
              <SectionHead icon={<Building2 size={14} />} label={t.drawerOrgSec ?? 'Tashkilot'} />
              <div className="grid grid-cols-2 gap-2">
                {ADMIN_ORGS.map(o => {
                  const active = addForm.org === o.id;
                  return (
                    <button key={o.id} type="button"
                      onClick={() => setF('org', o.id)}
                      className="h-12 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                      style={{
                        background: active ? acc : bg2,
                        color: active ? '#fff' : txt,
                        border: `1px solid ${active ? acc : bdr}`,
                        boxShadow: active ? `0 4px 14px ${acc}40` : 'none',
                      }}>
                      {active && <Check size={14} />}
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionHead icon={<CheckCircle2 size={14} />} label={t.drawerStatusSec ?? 'Holat'} />
              <div className="space-y-2">
                {holatOptions.map(h => {
                  const active = addForm.holat === h.val;
                  return (
                    <button key={h.val} type="button"
                      onClick={() => setF('holat', h.val)}
                      className="w-full h-12 rounded-2xl text-sm font-medium transition-all duration-200 flex items-center gap-3 px-4"
                      style={{
                        background: active ? h.color + '18' : bg2,
                        color: active ? h.color : txt,
                        border: `1px solid ${active ? h.color + '60' : bdr}`,
                      }}>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: h.color }} />
                      {h.label}
                      {active && <Check size={14} className="ml-auto" style={{ color: h.color }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionHead icon={<Hash size={14} />} label={t.drawerTaraSec ?? 'Tara hisobi'} />
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${bdr}`, background: bg2 }}>
                <div className="px-4">
                  <div className="flex items-center justify-between gap-3 py-3.5"
                    style={{ borderBottom: addForm.buTara ? `1px solid ${bdr}` : 'none' }}>
                    <p className="text-sm" style={{ color: txt }}>{t.drawerIsTara ?? 'Bu mahsulot tara'}</p>
                    <Toggle fkey="buTara" />
                  </div>
                  {addForm.buTara && (
                    <div className="py-3 space-y-3">
                      <div>
                        <FLabel>{t.drawerTaraName ?? 'Tara nomi'}</FLabel>
                        <input className={inpCls} value={addForm.tara}
                          onChange={e => setF('tara', e.target.value)} placeholder="..." />
                      </div>
                      <div>
                        <FLabel>{t.drawerTaraCount ?? 'Dona tarada'}</FLabel>
                        <input type="number" className={inpCls} value={addForm.donaTarada}
                          onChange={e => setF('donaTarada', e.target.value)} placeholder="0" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </>}

        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-5 py-4"
          style={{ borderTop: `1px solid ${bdr}`, background: bg }}>
          {saveError && (() => {
            const sep = saveError.indexOf(': ');
            const title = sep > 0 ? saveError.slice(0, sep) : saveError;
            const reason = sep > 0 ? saveError.slice(sep + 2) : null;
            return (
              <div className="mb-3 px-3 py-2.5 rounded-2xl text-xs"
                style={{ background: '#ef444418', border: '1px solid #ef444444', color: '#ef4444' }}>
                <p className="font-semibold">{title}</p>
                {reason && <p className="mt-1 font-medium opacity-90">{reason}</p>}
              </div>
            );
          })()}
          <div className="flex items-center gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl text-sm font-semibold transition-all duration-200 hover:opacity-80"
            style={{ background: bg3, color: sub, border: `1px solid ${bdr}` }}>
            {t.drawerCancel ?? 'Bekor qilish'}
          </button>
          <button type="button" onClick={onSave}
            className="h-12 px-8 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:opacity-90"
            style={{
              flex: '2 2 0',
              background: acc,
              color: '#ffffff',
              boxShadow: `0 6px 20px ${acc}50`,
            }}>
            <Check size={15} />
            {isEdit ? (t.drawerSaveEdit ?? editTitle ?? 'Saqlash') : (t.drawerSaveAdd ?? "Mahsulot qo'shish")}
          </button>
          </div>
        </div>

      </div>
    </div>
  );
}