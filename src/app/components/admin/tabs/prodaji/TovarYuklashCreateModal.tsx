import React, { useState, useRef, useEffect, useCallback, CSSProperties, ReactNode } from 'react';
import {
  X, CheckCircle2, RefreshCw, Trash2, ChevronDown,
  Printer, Package,
  ChevronUp, ChevronLeft, ChevronRight,
  Minimize2, Maximize2, Search, CalendarDays, Clock,
} from 'lucide-react';
import { demo } from '../../../../data/demoLimit';
import { api, type Distributor } from '../../../../api/client';

function hasApiToken(): boolean {
  return !!localStorage.getItem('api_access_token');
}

function isDeliveryPerson(d: Distributor): boolean {
  const p = (d.position ?? d.user?.fullName ?? '').toLowerCase();
  const u = (d.user?.username ?? '').toLowerCase();
  return p.includes('delivery') || p.includes('yetkaz') || p.includes('kuryer')
    || p.includes('dostav') || p.includes('haydov')
    || u.includes('dostav');
}

function distributorName(d: Distributor): string {
  return d.user?.fullName?.trim() || d.user?.username || d.id;
}

/* ─── Types ──────────────────────────────────────────────── */
type ZayavkaStatus = 'otgr' | 'process' | 'done' | 'cancelled';
type ModalTab      = 'zayavki' | 'tovarlar';
type ModalMode     = 'normal' | 'compact';

interface ZayavkaRow {
  id:number; num:number; date:string; direction:string; tip:string;
  kodTT:string; kontragent:string; km:number; agent:string;
  status:ZayavkaStatus; marsh:string; summa:number; dolg:number;
  poluch:number; ves:number; timeObr:string; note:string;
}

/* ─── Mock data ──────────────────────────────────────────── */
const ZAYAVKI: ZayavkaRow[] = demo([
  { id:1,  num:19195, date:'14.03.2026 09:12', direction:'SHERIN', tip:'D2', kodTT:'24002', kontragent:'AMINJONOVA ANOR...',    km:610, agent:'Toshniёzov...',  status:'otgr',    marsh:'24-6-н.',  summa:1_038_160,  dolg:43_172_277,  poluch:0, ves:9,  timeObr:'09:14', note:'' },
  { id:2,  num:19196, date:'14.03.2026 09:18', direction:'SHERIN', tip:'D2', kodTT:'23004', kontragent:'SHAMS-NAVOIY XK',        km:650, agent:'Toshniёzov...',  status:'otgr',    marsh:'23-Эн.',   summa:3_659_628,  dolg:43_172_277,  poluch:0, ves:43, timeObr:'09:20', note:'' },
  { id:3,  num:19197, date:'14.03.2026 09:22', direction:'SHERIN', tip:'D2', kodTT:'23005', kontragent:'SAYIDOVA MARJON...',     km:620, agent:'Alisher...',     status:'otgr',    marsh:'23-6-н.',  summa:227_010,    dolg:1_328_665,   poluch:0, ves:5,  timeObr:'09:25', note:'' },
  { id:4,  num:19198, date:'14.03.2026 09:45', direction:'SHERIN', tip:'D2', kodTT:'28988', kontragent:'SAVDO OMAD LUX M...',    km:580, agent:'Alisher...',     status:'process', marsh:'23-6-н.',  summa:887_882,    dolg:4_758_063,   poluch:0, ves:14, timeObr:'',      note:'' },
  { id:5,  num:19199, date:'14.03.2026 09:30', direction:'SHERIN', tip:'D2', kodTT:'23008', kontragent:'MUSOYEVA OZODA S...',    km:600, agent:'Toshniёzov...',  status:'otgr',    marsh:'23-Эн.',   summa:2_817_064,  dolg:71_629_007,  poluch:0, ves:48, timeObr:'09:32', note:'' },
  { id:6,  num:19200, date:'14.03.2026 09:35', direction:'SHERIN', tip:'D2', kodTT:'23004', kontragent:'NAFIS NAVOIY BARA...',   km:590, agent:'Bobur...',       status:'otgr',    marsh:'20-Sp.',   summa:434_617,    dolg:721_425,     poluch:0, ves:13, timeObr:'09:38', note:'' },
  { id:7,  num:19201, date:'14.03.2026 09:40', direction:'SHERIN', tip:'D2', kodTT:'20005', kontragent:'XOSILOV OYBEK ISTA...',  km:610, agent:'Bobur...',       status:'process', marsh:'20-Сп.',   summa:594_900,    dolg:13_135_178,  poluch:0, ves:9,  timeObr:'',      note:'' },
  { id:8,  num:19209, date:'14.03.2026 10:07', direction:'SHERIN', tip:'D2', kodTT:'23111', kontragent:"GRAVIS 111 MAS'ULI...", km:620, agent:'Toshniёzov...',  status:'otgr',    marsh:'23-Сп.',   summa:3_366_782,  dolg:4_465_115,   poluch:0, ves:27, timeObr:'10:10', note:'Hammasi donaga' },
  { id:9,  num:19210, date:'14.03.2026 10:15', direction:'SHERIN', tip:'D2', kodTT:'23009', kontragent:'KURBONOVA DILDOR...',    km:600, agent:'Jasur...',       status:'otgr',    marsh:'23-Эн.',   summa:4_811_416,  dolg:127_446_678, poluch:0, ves:69, timeObr:'10:18', note:'' },
  { id:10, num:19211, date:'14.03.2026 10:20', direction:'SHERIN', tip:'D2', kodTT:'23040', kontragent:'ARTIQOVA LOBAR',          km:580, agent:'Jasur...',       status:'process', marsh:'23-Эн.',   summa:1_537_868,  dolg:7_971_289,   poluch:0, ves:25, timeObr:'',      note:'' },
  { id:11, num:19319, date:'14.03.2026 10:44', direction:'SHERIN', tip:'D2', kodTT:'28618', kontragent:'SAFARGUL AYA KELA...',   km:610, agent:'Sherzod...',     status:'otgr',    marsh:'22-10-.',  summa:2_902_195,  dolg:8_998_754,   poluch:0, ves:56, timeObr:'10:46', note:'' },
  { id:12, num:19320, date:'14.03.2026 10:50', direction:'SHERIN', tip:'D2', kodTT:'24029', kontragent:'KLASSIK OMAD SAVD...',   km:600, agent:'Sherzod...',     status:'process', marsh:'23-Сп.',   summa:1_352_577,  dolg:15_560_458,  poluch:0, ves:24, timeObr:'',      note:'' },
  { id:13, num:19321, date:'14.03.2026 11:05', direction:'SHERIN', tip:'D2', kodTT:'23043', kontragent:'SHIRIN ORZU 2020 M...',  km:620, agent:'Ulugbek...',     status:'otgr',    marsh:'23-Эн.',   summa:744_382,    dolg:3_791_171,   poluch:0, ves:14, timeObr:'11:08', note:'' },
  { id:14, num:19322, date:'14.03.2026 11:10', direction:'SHERIN', tip:'D2', kodTT:'28552', kontragent:'HUSANOVA DILRABO...',     km:590, agent:'Ulugbek...',     status:'process', marsh:'23-6-н.',  summa:771_550,    dolg:2_504_199,   poluch:0, ves:15, timeObr:'',      note:'' },
  { id:15, num:19323, date:'14.03.2026 11:15', direction:'SHERIN', tip:'D2', kodTT:'23082', kontragent:'RAHMATULLAYEV...',         km:605, agent:'Toshniёzov...',  status:'process', marsh:'23-Эн.',   summa:616_240,    dolg:1_200_870,   poluch:0, ves:12, timeObr:'',      note:'' },
]);

const SKLAD_LIST     = demo(['Sklad SHERIN', 'Sklad MARKAZ', 'Sklad SHIMOL', 'Sklad JANUB', 'Sklad ZARAFSHON']);
const TASHKILOT_LIST = demo(['OOO "BORAN LEADERS"', 'OOO "SHERIN TRADE"', 'OOO "NAVOIY SAVDO"', 'OOO "PILLER DIST"']);
const MUALLIF_LIST   = demo(['Zaripov Begzod', 'Ismatullayev Hamza', 'Xoliqov Sardor', 'Nazarov Dilshod', 'Mirzayev Alisher']);
const TRANSPORT_LIST = demo([
  'DAMAS (VAN) 01 561 VMA', 'DAMAS (VAN) 85 932 HNA', 'DAMAS (LABO) 01 555 XNA',
  'JAG 01 912 BNA', 'DAMAS (VAN) 60 R 123 ZA', 'DAMAS (VAN) 01 797 LC',
  'DAMAS 80 R 938 ZA', 'DAMAS (VAN) 01 819 MA',
]);
const HAYDOVCHI_LIST = demo([
  'Irgashev Azizxon Ilxomovich', 'Buronov Feruz Baxromovich',
  'Sadullayev Shuxrat Raximovich', 'Tuxtapilov Umrzoq Sotvoldiyev',
  'Nazarov Davlatbek Jurayev', 'Pirnazorov Olimjon Xasanov',
  'Rustamov Shoxrux Mirzayev', 'Abduxakimov Diyorbek Tursunov',
]);
/** Fallback faqat API yo'q bo'lganda — shofyor uchun */
const AGENT_LIST = demo([
  'Toshniёzov Obidjon Bekpulatovich', 'Alisher Karimov Saidovich',
  'Bobur Toshmatov Xolmurodov', 'Jasur Yusupov Abdullayev',
  'Sherzod Nazarov Mirzayev', 'Ulugbek Holmatov Ibragimov',
]);

/* ─── Utils ──────────────────────────────────────────────── */
function pad2(n:number){ return String(n).padStart(2,'0'); }
function fmtDT(d:Date){
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function fmtDate(d:Date){
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
}
function fmtTime(d:Date){
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function fmtN(n:number){ return n.toLocaleString('ru-RU'); }
function sameDay(a:Date,b:Date){
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}

/* ─── Sub-components ─────────────────────────────────────── */
interface DropdownFieldProps {
  label:string; value:string; options:string[];
  D:boolean; brd:string; inp:string; txt:string; muted:string; card:string; rowH:string;
  onSelect:(v:string)=>void;
  colorMap?:Record<string,string>;
  lblStyle:CSSProperties;
  flex?:string; minWidth?:number;
  searchPlaceholder?:string; notFoundText?:string;
}
function DropdownField({ label,value,options,D,brd,inp,txt,muted,card,rowH,onSelect,colorMap,lblStyle,flex,minWidth,searchPlaceholder,notFoundText }:DropdownFieldProps){
  const [open,setOpen]=useState(false);
  const [q,setQ]=useState('');
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!open)return;
    const fn=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown',fn);
    return()=>document.removeEventListener('mousedown',fn);
  },[open]);
  const filtered=options.filter(o=>o.toLowerCase().includes(q.toLowerCase()));
  const color=colorMap?.[value];
  return(
    <div ref={ref} style={{display:'flex',flexDirection:'column',flex:flex??'1',minWidth:minWidth??80,position:'relative'}}>
      <label style={lblStyle}>{label}</label>
      <button onClick={()=>{setOpen(o=>!o);setQ('');}} style={{
        display:'flex',alignItems:'center',gap:4,padding:'4px 10px',height:30,
        background:D?'#0d0d0d':inp,border:`1px solid ${open?'#6366f1':brd}`,borderRadius:7,
        cursor:'pointer',textAlign:'left',transition:'border-color 0.15s',width:'100%',
      }}>
        <span style={{flex:1,fontSize:12,color:color??(value?txt:muted),overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'left'}}>
          {value||'—'}
        </span>
        <ChevronDown size={11} color={muted} style={{flexShrink:0,transition:'transform 0.15s',transform:open?'rotate(180deg)':'none'}}/>
      </button>
      {open&&(
        <>
          <div style={{position:'fixed',inset:0,zIndex:10001}} onClick={()=>setOpen(false)}/>
          <div style={{
            position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:10002,
            background:D?'#1c1c1e':'#fff',border:`1px solid #6366f1`,borderRadius:10,
            boxShadow:'0 12px 40px rgba(0,0,0,0.7)',minWidth:'100%',maxWidth:300,
            overflow:'hidden',
          }}>
            {options.length>5&&(
              <div style={{padding:'6px 8px',borderBottom:`1px solid ${brd}`}}>
                <div style={{display:'flex',alignItems:'center',gap:5,background:inp,borderRadius:6,padding:'4px 8px'}}>
                  <Search size={11} color={muted}/>
                  <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
                    style={{flex:1,background:'none',border:'none',outline:'none',color:txt,fontSize:12}}
                    placeholder={searchPlaceholder??'Qidirish...'}/>
                </div>
              </div>
            )}
            <div style={{maxHeight:180,overflowY:'auto'}}>
              {filtered.map(opt=>{
                const c=colorMap?.[opt];
                return(
                  <button key={opt} onClick={()=>{onSelect(opt);setOpen(false);setQ('');}} style={{
                    display:'block',width:'100%',textAlign:'left',padding:'8px 12px',
                    background:opt===value?(D?'rgba(99,102,241,0.15)':'rgba(99,102,241,0.08)'):'none',
                    border:'none',color:c??txt,fontSize:12,cursor:'pointer',
                  }}
                  onMouseEnter={e=>(e.currentTarget.style.background=rowH)}
                  onMouseLeave={e=>(e.currentTarget.style.background=opt===value?(D?'rgba(99,102,241,0.15)':'rgba(99,102,241,0.08)'):'none')}
                  >
                    {c&&<span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:c,marginRight:6}}/>}
                    {opt}
                  </button>
                );
              })}
              {filtered.length===0&&<div style={{padding:'10px 12px',color:muted,fontSize:12}}>{notFoundText??'Topilmadi'}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── TimePicker ─────────────────────────────────────────── */
interface TimePickerProps {
  value:Date; onChange:(d:Date)=>void; label:string;
  D:boolean; brd:string; inp:string; txt:string; muted:string; card:string;
  lblStyle:CSSProperties; flex?:string; showDate?:boolean;
}
function TimePicker({ value,onChange,label,D,brd,inp,txt,muted,card,lblStyle,flex,showDate }:TimePickerProps){
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  const [h,setH]=useState(value.getHours());
  const [m,setM]=useState(value.getMinutes());
  const [s,setS]=useState(value.getSeconds());

  useEffect(()=>{
    if(!open)return;
    const fn=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown',fn);
    return()=>document.removeEventListener('mousedown',fn);
  },[open]);

  const apply=(nh:number,nm:number,ns:number)=>{
    const nd=new Date(value);
    nd.setHours(nh); nd.setMinutes(nm); nd.setSeconds(ns);
    onChange(nd);
  };

  const spin=(type:'h'|'m'|'s',delta:number)=>{
    if(type==='h'){ const v=(h+delta+24)%24; setH(v); apply(v,m,s); }
    if(type==='m'){ const v=(m+delta+60)%60; setM(v); apply(h,v,s); }
    if(type==='s'){ const v=(s+delta+60)%60; setS(v); apply(h,m,v); }
  };

  return(
    <div ref={ref} style={{display:'flex',flexDirection:'column',flex:flex??'0 0 auto',minWidth:0,position:'relative'}}>
      <label style={lblStyle}>{label}</label>
      <button onClick={()=>setOpen(o=>!o)} style={{
        display:'flex',alignItems:'center',gap:0,padding:'4px 10px',height:30,
        background:D?'#0d0d0d':inp,border:`1px solid ${open?'#6366f1':brd}`,borderRadius:7,
        cursor:'pointer',transition:'border-color 0.15s',whiteSpace:'nowrap',
      }}>
        {showDate&&(
          <>
            <span style={{fontSize:12,color:muted}}>{fmtDate(value)}</span>
            <span style={{fontSize:12,color:muted,margin:'0 6px'}}>|</span>
          </>
        )}
        <Clock size={11} color={muted} style={{marginRight:5,flexShrink:0}}/>
        <span style={{fontSize:12,color:txt,fontVariantNumeric:'tabular-nums'}}>{fmtTime(value)}</span>
        <ChevronDown size={11} color={muted} style={{marginLeft:5,flexShrink:0,transform:open?'rotate(180deg)':'none',transition:'transform 0.15s'}}/>
      </button>
      {open&&(
        <>
          <div style={{position:'fixed',inset:0,zIndex:10001}} onClick={()=>setOpen(false)}/>
          <div style={{
            position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:10002,
            background:card,border:`1px solid #6366f1`,borderRadius:12,
            boxShadow:'0 12px 40px rgba(0,0,0,0.7)',padding:'12px 16px',
            display:'flex',gap:12,alignItems:'center',
          }}>
            {(['h','m','s'] as const).map((type,i)=>{
              const val=type==='h'?h:type==='m'?m:s;
              return(
                <React.Fragment key={type}>
                  {i>0&&<span style={{color:muted,fontSize:16,fontWeight:300}}>:</span>}
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <button onClick={()=>spin(type,1)} style={{
                      width:28,height:22,borderRadius:5,border:`1px solid ${brd}`,
                      background:'none',color:muted,cursor:'pointer',fontSize:14,
                      display:'flex',alignItems:'center',justifyContent:'center',
                    }}><ChevronUp size={12}/></button>
                    <span style={{fontSize:18,fontWeight:700,color:txt,fontVariantNumeric:'tabular-nums',minWidth:28,textAlign:'center'}}>{pad2(val)}</span>
                    <button onClick={()=>spin(type,-1)} style={{
                      width:28,height:22,borderRadius:5,border:`1px solid ${brd}`,
                      background:'none',color:muted,cursor:'pointer',fontSize:14,
                      display:'flex',alignItems:'center',justifyContent:'center',
                    }}><ChevronDown size={12}/></button>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── HeaderDatePicker ───────────────────────────────────── */
interface HdpProps {
  start:Date|null; end:Date|null;
  onRange:(s:Date,e:Date|null)=>void;
  D:boolean; brd:string; txt:string; muted:string; card:string;
  monthNames:string[]; dayNames:string[];
  compact?:boolean;
  todayLabel?:string; okLabel?:string;
}
function HeaderDatePicker({ start,end,onRange,D,brd,txt,muted,card,monthNames,dayNames,compact,todayLabel,okLabel }:HdpProps){
  const [open,setOpen]=useState(false);
  const [viewYear,setViewYear]=useState(()=>(start??new Date()).getFullYear());
  const [viewMonth,setViewMonth]=useState(()=>(start??new Date()).getMonth());
  const [picking,setPicking]=useState<'start'|'end'>('start');
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(!open)return;
    const fn=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown',fn);
    return()=>document.removeEventListener('mousedown',fn);
  },[open]);

  const daysInMonth=(y:number,mo:number)=>new Date(y,mo+1,0).getDate();
  const firstDow=(y:number,mo:number)=>{ let d=new Date(y,mo,1).getDay(); return d===0?6:d-1; };

  const selectDay=(day:number)=>{
    const clicked=new Date(viewYear,viewMonth,day);
    if(picking==='start'){
      onRange(clicked,null);
      setPicking('end');
    } else {
      if(start && clicked<start){ onRange(clicked,null); setPicking('end'); }
      else { onRange(start??clicked,clicked); setOpen(false); setPicking('start'); }
    }
  };

  const label=()=>{
    if(!start) return '—';
    const s=`${pad2(start.getDate())}.${pad2(start.getMonth()+1)}.${start.getFullYear()}`;
    if(!end) return s;
    const e=`${pad2(end.getDate())}.${pad2(end.getMonth()+1)}.${end.getFullYear()}`;
    return sameDay(start,end)?s:`${s} – ${e}`;
  };

  const days=daysInMonth(viewYear,viewMonth);
  const offset=firstDow(viewYear,viewMonth);
  const cells:Array<number|null>=[...Array(offset).fill(null),...Array(days).fill(0).map((_,i)=>i+1)];
  while(cells.length%7!==0) cells.push(null);

  return(
    <div ref={ref} style={{position:'relative',flex:'0 0 auto'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        display:'flex',alignItems:'center',gap:5,padding:compact?'3px 8px':'4px 10px',
        height:compact?26:30,
        background:D?'#0d0d0d':'#fff',border:`1px solid ${open?'#6366f1':brd}`,
        borderRadius:7,cursor:'pointer',transition:'border-color 0.15s',
      }}>
        <CalendarDays size={11} color={open?'#6366f1':muted}/>
        <span style={{fontSize:12,color:start?txt:muted,whiteSpace:'nowrap'}}>{label()}</span>
        <ChevronDown size={10} color={muted} style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.15s'}}/>
      </button>
      {open&&(
        <>
          <div style={{position:'fixed',inset:0,zIndex:10003}} onClick={()=>setOpen(false)}/>
          <div style={{
            position:'absolute',top:'calc(100% + 6px)',left:0,zIndex:10004,
            background:card,border:`1px solid #6366f1`,borderRadius:14,
            boxShadow:'0 16px 48px rgba(0,0,0,0.8)',padding:'14px',minWidth:240,
          }}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <button onClick={()=>{ let m=viewMonth-1; let y=viewYear; if(m<0){m=11;y--;} setViewMonth(m);setViewYear(y); }}
                style={{width:26,height:26,borderRadius:6,border:`1px solid ${brd}`,background:'none',color:muted,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ChevronLeft size={12}/>
              </button>
              <span style={{fontSize:12,fontWeight:700,color:txt}}>{monthNames[viewMonth]} {viewYear}</span>
              <button onClick={()=>{ let m=viewMonth+1; let y=viewYear; if(m>11){m=0;y++;} setViewMonth(m);setViewYear(y); }}
                style={{width:26,height:26,borderRadius:6,border:`1px solid ${brd}`,background:'none',color:muted,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ChevronRight size={12}/>
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
              {dayNames.map(d=>(
                <div key={d} style={{textAlign:'center',fontSize:9,color:muted,fontWeight:700,padding:'2px 0'}}>{d}</div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
              {cells.map((day,i)=>{
                if(!day) return <div key={i}/>;
                const d=new Date(viewYear,viewMonth,day);
                const isStart=start&&sameDay(d,start);
                const isEnd=end&&sameDay(d,end);
                const inRange=start&&end&&d>start&&d<end;
                const isToday=sameDay(d,new Date());
                return(
                  <button key={i} onClick={()=>selectDay(day)} style={{
                    width:'100%',aspectRatio:'1',borderRadius:6,border:'none',
                    background:isStart||isEnd?'#6366f1':inRange?'rgba(99,102,241,0.18)':'none',
                    color:isStart||isEnd?'#fff':isToday?'#6366f1':txt,
                    fontSize:11,cursor:'pointer',fontWeight:isToday?700:400,
                    outline:isToday&&!isStart?`1px solid #6366f1`:'none',
                  }}>{day}</button>
                );
              })}
            </div>
            <div style={{marginTop:10,display:'flex',gap:6,justifyContent:'flex-end'}}>
              <button onClick={()=>{onRange(new Date(),null);setOpen(false);setPicking('start');}} style={{
                fontSize:11,padding:'4px 10px',borderRadius:6,border:`1px solid ${brd}`,
                background:'none',color:muted,cursor:'pointer',
              }}>{todayLabel??'Bugun'}</button>
              <button onClick={()=>{onRange(start??new Date(),end);setOpen(false);setPicking('start');}} style={{
                fontSize:11,padding:'4px 10px',borderRadius:6,border:'1px solid #6366f1',
                background:'rgba(99,102,241,0.15)',color:'#818cf8',cursor:'pointer',
              }}>{okLabel??'OK'}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export interface ConfirmedOrder {
  agent: string;
  transport: string;
  sklad: string;
  tashkilot: string;
  date: string;
  summa: number;
  ves: number;
  rowCount: number;
  dostavchik?: string;
  dostavchikId?: string | null;
}

interface Props {
  D: boolean;
  t: Record<string,string>;
  onClose: () => void;
  pageMode?: boolean;
  onConfirm?: (order: ConfirmedOrder) => void;
  selectedCompanyIds?: Set<string>;
}

export function TovarYuklashCreateModal({ D, t, onClose, pageMode=false, onConfirm, selectedCompanyIds }: Props) {
  const [mode,        setMode]        = useState<ModalMode>('normal');
  const [activeTab,   setActiveTab]   = useState<ModalTab>('zayavki');
  const [expanded,    setExpanded]    = useState<number|null>(null);
  const [isFullscreen,setIsFullscreen]= useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  /* ── Form state ── */
  const [samovivoz,   setSamovivoz]   = useState(false);
  const [reysHolati,  setReysHolati]  = useState('process');
  const [sklad,       setSklad]       = useState('Sklad SHERIN');
  const [tashkilot,   setTashkilot]   = useState('OOO "BORAN LEADERS"');
  const [muallif,     setMuallif]     = useState('Zaripov Begzod');
  const [transport,   setTransport]   = useState('');
  const [shofer,      setShofer]      = useState('');
  const [dostavchik,  setDostavchik]  = useState('');
  const [dostavchikId, setDostavchikId] = useState<string | null>(null);
  const [agent,       setAgent]       = useState('');
  const [yuklashVaqti,setYuklashVaqti]= useState(()=>new Date());
  const [hdStart,     setHdStart]     = useState<Date|null>(()=>new Date());
  const [hdEnd,       setHdEnd]       = useState<Date|null>(null);

  /* ── API: haqiqiy dostavchiklar ── */
  const [dostavchikList, setDostavchikList] = useState<string[]>([]);
  const [dostavchikMap,  setDostavchikMap]  = useState<Record<string, string>>({});
  const [dostavLoading,  setDostavLoading]  = useState(false);

  const companyId = selectedCompanyIds?.size === 1
    ? [...selectedCompanyIds][0]
    : undefined;

  const loadDostavchiklar = useCallback(async () => {
    if (!hasApiToken()) {
      setDostavchikList([]);
      setDostavchikMap({});
      return;
    }
    setDostavLoading(true);
    try {
      const list = await api.getDistributors(companyId);
      const delivery = list.filter(isDeliveryPerson);
      const source = delivery.length > 0 ? delivery : list.filter(d =>
        (d.position ?? '').toLowerCase().includes('dostav')
        || (d.user?.username ?? '').toLowerCase().includes('dostav'),
      );
      const names: string[] = [];
      const map: Record<string, string> = {};
      for (const d of source) {
        const name = distributorName(d);
        if (!name || names.includes(name)) continue;
        names.push(name);
        map[name] = d.id;
      }
      setDostavchikList(names);
      setDostavchikMap(map);
    } catch {
      setDostavchikList([]);
      setDostavchikMap({});
    } finally {
      setDostavLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadDostavchiklar(); }, [loadDostavchiklar]);

  /* ── Confirm (✓ galochka) ── */
  const handleConfirm = () => {
    if (onConfirm) {
      const today = new Date();
      const fmt = (d: Date) =>
        `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
      onConfirm({
        agent,
        transport,
        sklad,
        tashkilot,
        date: fmt(today),
        summa: totalSumma,
        ves: totalVes,
        rowCount: displayRows.length,
        dostavchik,
        dostavchikId,
      });
    }
  };

  /* ── Reset to default ── */
  const handleReset = () => {
    setSamovivoz(false);
    setReysHolati('process');
    setSklad('Sklad SHERIN');
    setTashkilot('OOO "BORAN LEADERS"');
    setMuallif('Zaripov Begzod');
    setTransport('');
    setShofer('');
    setDostavchik('');
    setDostavchikId(null);
    setAgent('');
    setYuklashVaqti(new Date());
    setHdStart(new Date());
    setHdEnd(null);
    setExpanded(null);
    setActiveTab('zayavki');
  };

  /* ── Theme ── */
  const bg    = D ? '#0d0d0d' : '#f5f5f7';
  const card  = D ? '#1c1c1e' : '#ffffff';
  const brd   = D ? '#2a2a2e' : '#e5e7eb';
  const txt   = D ? '#f2f2f7' : '#111827';
  const muted = D ? '#6b7280' : '#9ca3af';
  const hdr   = D ? '#161618' : '#f3f4f6';
  const rowH  = D ? '#222226' : '#f5f5f7';
  const inp   = D ? '#111113' : '#ffffff';

  const MONTH_NAMES=(t.zatCalMonths??'Yanvar,Fevral,Mart,Aprel,May,Iyun,Iyul,Avgust,Sentabr,Oktabr,Noyabr,Dekabr').split(',');
  const DAY_NAMES  =(t.zatCalDays??'Du,Se,Ch,Pa,Ju,Sh,Ya').split(',');

  /* Escape key */
  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{ if(e.key==='Escape') onClose(); };
    document.addEventListener('keydown',fn);
    return()=>document.removeEventListener('keydown',fn);
  },[onClose]);

  /* ── Agent + date filter ── */
  const agentShort = agent.trim().split(' ')[0];
  const parseRowDate=(dateStr:string)=>{
    const [d,mo,y]=(dateStr.split(' ')[0]??'').split('.');
    return new Date(parseInt(y),parseInt(mo)-1,parseInt(d));
  };
  const dateMatch=(r:{date:string})=>{
    if(!hdStart) return true;
    const rd=parseRowDate(r.date);
    if(!hdEnd) return sameDay(rd,hdStart);
    return rd>=hdStart && rd<=hdEnd;
  };
  const rows = agent
    ? ZAYAVKI.filter(r=> r.agent.startsWith(agentShort) && dateMatch(r))
    : [];
  const displayRows = rows;

  /* ── Totals (filtered) ── */
  const totalSumma = displayRows.reduce((s,r)=>s+r.summa,0);
  const totalVes   = displayRows.reduce((s,r)=>s+r.ves,0);
  const totalDolg  = displayRows.reduce((s,r)=>s+r.dolg,0);

  /* ── Reys holati ── */
  const reysOptions=[
    t.otgrProcess   ?? 'Jarayonda',
    t.otgrDone      ?? 'Yakunlangan',
    t.otgrCancelled ?? 'Bekor',
  ];
  const reysKeyToLabel=(key:string)=>({
    process  : t.otgrProcess   ?? 'Jarayonda',
    done     : t.otgrDone      ?? 'Yakunlangan',
    cancelled: t.otgrCancelled ?? 'Bekor',
  }[key] ?? key);
  const reysLabelToKey=(lbl:string)=>{
    const map:Record<string,string>={
      [t.otgrProcess   ??'Jarayonda']  :'process',
      [t.otgrDone      ??'Yakunlangan']:'done',
      [t.otgrCancelled ??'Bekor']      :'cancelled',
    };
    return map[lbl]??'process';
  };
  const reysColorMapLabel:Record<string,string>={
    [t.otgrProcess   ??'Jarayonda']  :'#f59e0b',
    [t.otgrDone      ??'Yakunlangan']:'#10b981',
    [t.otgrCancelled ??'Bekor']      :'#ef4444',
  };

  /* ── Status badge ── */
  const statusBadge=(s:ZayavkaStatus)=>{
    const c={otgr:'#10b981',process:'#f59e0b',done:'#6366f1',cancelled:'#ef4444'}[s];
    const l={otgr:'Отгр.',process:t.otgrProcess??'Jarayonda',done:t.otgrDone??'Yakunlandi',cancelled:t.otgrCancelled??'Bekor'}[s];
    return(
      <span style={{display:'inline-block',padding:'1px 7px',borderRadius:4,fontSize:10,
        background:c,color:'#fff',fontWeight:600,whiteSpace:'nowrap'}}>{l}</span>
    );
  };

  /* ── Shared styles ── */
  const lblStyle:CSSProperties={
    fontSize:9,color:muted,marginBottom:3,display:'block',fontWeight:600,
    letterSpacing:0.6,textTransform:'uppercase',whiteSpace:'nowrap',
  };
  const inpStyle:CSSProperties={
    background:D?'#0d0d0d':'#fff',border:`1px solid ${brd}`,borderRadius:7,color:txt,
    fontSize:12,padding:'4px 10px',outline:'none',width:'100%',height:30,
    boxSizing:'border-box',transition:'border-color 0.15s',
  };
  const fldWrap=(label:string,children:ReactNode,flex?:string,minW?:number)=>(
    <div style={{display:'flex',flexDirection:'column',flex:flex??'1',minWidth:minW??80}}>
      <label style={lblStyle}>{label}</label>
      {children}
    </div>
  );
  const dpProps={D,brd,inp,txt,muted,card,rowH,lblStyle,searchPlaceholder:t.zSearch??'Qidirish...',notFoundText:t.noDataFound??'Topilmadi'};

  /* ── TABS ── */
  const TABS:[ModalTab,string,ReactNode,number?][]=[
    ['zayavki',  t.modalZayavki  ??'Buyurtmalar', <Package size={12}/>, ZAYAVKI.length],
    ['tovarlar', t.modalTovarlar ??'Tovarlar',    <Package size={12}/>],
  ];

  /* ── TABLE COLS ── */
  const COLS=[
    { key:'n',          label:'N',                                      w:32,  center:true },
    { key:'num',        label:t.zNum??'№',                              w:56  },
    { key:'date',       label:t.otgrDate??t.zDate??'Sana',             w:110 },
    { key:'direction',  label:t.zDirection??'Yo\'n.',                   w:62  },
    { key:'tip',        label:t.modalTip??'Tip',                        w:36, center:true },
    { key:'kodTT',      label:t.modalKodTT??'KodTT',                   w:58  },
    { key:'kontragent', label:t.zClient??'Kontragent',                  w:160 },
    { key:'km',         label:'km',                                     w:40, right:true  },
    { key:'agent',      label:t.modalAgent??t.zAgent??'Agent',          w:90  },
    { key:'status',     label:t.zStatus??'Holat',                       w:88, center:true },
    { key:'marsh',      label:t.modalMarsh??'Marshrut',                 w:70  },
    { key:'summa',      label:t.otgrSumma??'Summa',                     w:118, right:true },
    { key:'dolg',       label:t.modalDolg??'Qarz',                      w:118, right:true },
    { key:'poluch',     label:t.modalPoluch??'Olingan',                  w:58, right:true  },
    { key:'ves',        label:t.otgrVes??'Vazn',                        w:44, right:true  },
    { key:'timeObr',    label:t.modalTimeOtgr??'Vaqt',                  w:100 },
    { key:'note',       label:t.zNote??'Izoh',                          w:120 },
  ];
  const cellVal=(row:ZayavkaRow,key:string)=>{
    if(key==='n')       return String(displayRows.indexOf(row)+1);
    if(key==='summa')   return fmtN(row.summa);
    if(key==='dolg')    return fmtN(row.dolg);
    if(key==='poluch')  return row.poluch?fmtN(row.poluch):'—';
    if(key==='ves')     return String(row.ves);
    if(key==='km')      return String(row.km);
    if(key==='timeObr') return row.timeObr||'—';
    if(key==='note')    return row.note||'—';
    return (row as Record<string,unknown>)[key] as string??'—';
  };

  /* ══ compact / normal ══ */
  const isCompact = !pageMode && mode === 'compact';

  const innerStyle:CSSProperties= pageMode
    ? isFullscreen
      ? { position:'fixed', inset:0, zIndex:9999, display:'flex', flexDirection:'column', background:bg, overflow:'hidden' }
      : { width:'100%', flex:1, minHeight:0, display:'flex', flexDirection:'column', background:bg, overflow:'hidden' }
    : {
    width:'100%',maxWidth:1340,
    height: isCompact ? 'auto' : '100vh',
    maxHeight: isCompact ? '54vh' : '100vh',
    display:'flex',flexDirection:'column',background:bg,
    boxShadow:'0 24px 80px rgba(0,0,0,0.9)',
    overflow:'hidden',
    borderRadius: isCompact ? '0 0 14px 14px' : 0,
  };

  const inner = (
    <>
      <style>{`
        .tycm-dt { display:flex!important; }
        .tycm-mob { display:none!important; }
        @media(max-width:767px){
          .tycm-dt  { display:none!important; }
          .tycm-mob { display:flex!important; }
          .tycm-fr  { flex-wrap:wrap!important; }
          .tycm-fr>div { min-width:calc(50% - 4px)!important; flex:1 1 calc(50% - 4px)!important; }
        }
        @media(max-width:480px){
          .tycm-fr>div { min-width:100%!important; flex:1 1 100%!important; }
        }
        .tycm-scroll::-webkit-scrollbar{height:4px}
        .tycm-scroll::-webkit-scrollbar-thumb{background:#2a2a2e;border-radius:4px}
        .tycm-tabs::-webkit-scrollbar{display:none}
        @keyframes tycmIn{from{opacity:0;transform:translateY(10px) scale(0.985)}to{opacity:1;transform:none}}
        @keyframes tycmFs{from{opacity:0;transform:scale(0.98)}to{opacity:1;transform:scale(1)}}
        .tycm-anim{animation:tycmIn 0.18s ease}
        .tycm-fs-anim{animation:tycmFs 0.18s ease}
        .tycm-inp:focus{border-color:#6366f1!important;outline:none!important}
        .tycm-tbtn:active{opacity:0.7}
        .tycm-row:hover td{background:${rowH}!important}
        .tycm-tbtn:hover{background:${rowH}!important}
      `}</style>
      <div className={pageMode ? (isFullscreen ? 'tycm-fs-anim' : undefined) : 'tycm-anim'} style={innerStyle}>

        {/* ══ HEADER ══ */}
        <div style={{
          background:D?'#111113':'#f8f8fa',
          borderBottom:`1px solid ${brd}`,
          padding:'0 14px',flexShrink:0,
          display:'flex',alignItems:'center',gap:10,minHeight:50,
          position:'relative',
        }}>
          {/* Purple left accent bar */}
          <div style={{position:'absolute',left:0,top:'18%',bottom:'18%',width:3,borderRadius:'0 3px 3px 0',background:'#6366f1'}}/>

          <Package size={15} style={{color:'#6366f1',flexShrink:0}}/>

          <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span style={{fontSize:13,fontWeight:700,color:txt,whiteSpace:'nowrap'}}>
              {t.tovarYuklashTitle??'Tovar yuklash'}
            </span>
            <span style={{
              background:'rgba(99,102,241,0.15)',color:'#818cf8',
              borderRadius:6,padding:'2px 9px',fontSize:12,fontWeight:700,
              border:'1px solid rgba(99,102,241,0.25)',flexShrink:0,
            }}>
              # 1 072
            </span>
            <HeaderDatePicker
              start={hdStart} end={hdEnd}
              onRange={(s,e)=>{ setHdStart(s); setHdEnd(e); }}
              D={D} brd={brd} txt={txt} muted={muted} card={card}
              monthNames={MONTH_NAMES} dayNames={DAY_NAMES} compact
              todayLabel={t.zCalToday??'Bugun'}
            />
          </div>

          <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
            {/* ✓ Confirm / galochka */}
            <button
              onClick={handleConfirm}
              title={t.otgrFinish??'Yakunlash'}
              style={{
                width:32,height:32,borderRadius:8,
                border:'1px solid rgba(16,185,129,0.35)',
                background:'rgba(16,185,129,0.15)',color:'#10b981',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',
                transition:'opacity 0.15s',
              }}
            ><CheckCircle2 size={14}/></button>
            {/* Printer */}
            <button title={t.modalPrint??'Chop etish'} style={{
              width:32,height:32,borderRadius:8,border:`1px solid ${brd}`,
              background:D?'#1c1c1e':'#eaeaee',color:muted,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              transition:'opacity 0.15s',
            }}><Printer size={14}/></button>
            {/* Refresh */}
            <button title={t.modalUpdateList??'Yangilash'} style={{
              width:32,height:32,borderRadius:8,
              border:'1px solid rgba(245,158,11,0.25)',
              background:'rgba(245,158,11,0.12)',color:'#f59e0b',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              transition:'opacity 0.15s',
            }}><RefreshCw size={14}/></button>

            {/* Fullscreen toggle */}
            <button
              onClick={()=>setIsFullscreen(f=>!f)}
              title={isFullscreen?'Oddiy ko\'rinish':'To\'liq ekran'}
              style={{
                width:32,height:32,borderRadius:8,
                border:`1px solid ${isFullscreen?'rgba(99,102,241,0.4)':brd}`,
                background:isFullscreen?'rgba(99,102,241,0.18)':(D?'#1c1c1e':'#eaeaee'),
                color:isFullscreen?'#818cf8':muted,
                cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                transition:'all 0.15s',
              }}
            >{isFullscreen?<Minimize2 size={13}/>:<Maximize2 size={13}/>}</button>

            {!pageMode&&(
              <button
                onClick={()=>setMode(m=>m==='compact'?'normal':'compact')}
                title={isCompact?(t.expand??'Kengaytirish'):(t.collapse??'Yig\'ish')}
                style={{
                  width:32,height:32,borderRadius:8,
                  border:`1px solid ${isCompact?'rgba(99,102,241,0.4)':brd}`,
                  background:isCompact?'rgba(99,102,241,0.18)':(D?'#1c1c1e':'#eaeaee'),
                  color:isCompact?'#818cf8':muted,
                  cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                }}
              ><Minimize2 size={13}/></button>
            )}

            {!pageMode&&(
              <button onClick={onClose} style={{
                width:32,height:32,borderRadius:8,
                border:'1px solid rgba(239,68,68,0.3)',
                background:'rgba(239,68,68,0.1)',color:'#ef4444',
                cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
              }}><X size={14} strokeWidth={2.5}/></button>
            )}
          </div>
        </div>

        {/* ══ FORM — hidden in compact mode ══ */}
        {!isCompact&&(
          <div style={{
            background:D?'#0a0a0c':'#f5f5f7',
            borderBottom:`1px solid ${brd}`,
            flexShrink:0,padding:'12px 14px',
            display:'flex',flexDirection:'column',gap:12,
          }}>

            {/* ─── Section A: Asosiy ma'lumotlar ─── */}
            <div>
              <div style={{fontSize:9,color:muted,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',marginBottom:8}}>
                {t.basicInfo}
              </div>
              <div className="tycm-fr" style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>

                {/* Samovivoz pill toggle */}
                <div style={{display:'flex',flexDirection:'column',gap:4,flex:'0 0 auto'}}>
                  <label style={lblStyle}>{t.modalSamovivoz??'Samovivoz'}</label>
                  <div style={{display:'flex',gap:2,background:D?'#161618':'#e5e5ea',borderRadius:8,padding:2,border:`1px solid ${brd}`}}>
                    {[(t.userYes??'Ha'),(t.userNo??"Yo'q")].map((lbl,i)=>{
                      const active=i===0?samovivoz:!samovivoz;
                      return(
                        <button key={i} onClick={()=>setSamovivoz(i===0)} style={{
                          padding:'4px 12px',borderRadius:6,border:'none',
                          background:active?'#6366f1':'transparent',
                          color:active?'#fff':muted,
                          fontSize:11,cursor:'pointer',fontWeight:active?600:400,
                          transition:'all 0.15s',whiteSpace:'nowrap',height:26,
                        }}>{lbl}</button>
                      );
                    })}
                  </div>
                </div>

                {fldWrap(t.modalNomer??'Raqam',
                  <input defaultValue="1 072" className="tycm-inp" style={{...inpStyle,width:70}}/>,
                  '0 0 70px',70
                )}
                <div style={{display:'flex',flexDirection:'column',flex:'0 0 auto',minWidth:0}}>
                  <label style={lblStyle}>{t.zDate??'Sana'}</label>
                  <HeaderDatePicker
                    start={hdStart} end={hdEnd}
                    onRange={(s,e)=>{ setHdStart(s); setHdEnd(e); }}
                    D={D} brd={brd} txt={txt} muted={muted} card={card}
                    monthNames={MONTH_NAMES} dayNames={DAY_NAMES}
                    todayLabel={t.zCalToday??'Bugun'}
                  />
                </div>
                <DropdownField label={t.modalSklad??'Sklad'} value={sklad} options={SKLAD_LIST}
                  onSelect={setSklad} {...dpProps} flex="1" minWidth={110}/>
                <DropdownField label={t.modalOrg??'Tashkilot'} value={tashkilot} options={TASHKILOT_LIST}
                  onSelect={setTashkilot} {...dpProps} flex="1.5" minWidth={140}/>
                <DropdownField
                  label={t.modalStatusReys??'Reys holati'}
                  value={reysKeyToLabel(reysHolati)}
                  options={reysOptions}
                  onSelect={v=>setReysHolati(reysLabelToKey(v))}
                  colorMap={reysColorMapLabel}
                  {...dpProps} flex="0 0 120px" minWidth={120}/>
                {fldWrap('ExID',
                  <input defaultValue="1 070" className="tycm-inp" style={{...inpStyle,width:60}}/>,
                  '0 0 60px',60
                )}
                <DropdownField label={t.otgrAuthor??'Muallif'} value={muallif} options={MUALLIF_LIST}
                  onSelect={setMuallif} {...dpProps} flex="1" minWidth={110}/>
              </div>
            </div>

            <div style={{height:1,background:brd}}/>

            {/* ─── Section B: Logistika ─── */}
            <div>
              <div style={{fontSize:9,color:muted,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',marginBottom:8}}>
                {t.logistics}
              </div>
              <div className="tycm-fr" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {/* Transport — hozircha lokal ro'yxat */}
                <div style={{flex:1,minWidth:200,display:'flex',flexDirection:'column',gap:4}}>
                  <label style={lblStyle}>{t.otgrTransport??'Transport'}</label>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <div style={{flex:1}}>
                      <DropdownField label="" value={transport} options={TRANSPORT_LIST}
                        onSelect={setTransport} {...dpProps} flex="1" minWidth={80}/>
                    </div>
                    <button onClick={()=>setTransport('')} style={{
                      width:28,height:30,borderRadius:7,
                      border:'1px solid rgba(239,68,68,0.25)',
                      background:'rgba(239,68,68,0.08)',
                      color:'#ef4444',cursor:'pointer',flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',
                    }}><X size={10}/></button>
                  </div>
                </div>

                {/* Shofyor — lokal (transport haydovchisi) */}
                <div style={{flex:1,minWidth:200,display:'flex',flexDirection:'column',gap:4}}>
                  <label style={lblStyle}>{t.modalShofer??'Shofyor'}</label>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <div style={{flex:1}}>
                      <DropdownField label="" value={shofer} options={HAYDOVCHI_LIST}
                        onSelect={setShofer} {...dpProps} flex="1" minWidth={80}/>
                    </div>
                    <button onClick={()=>setShofer('')} style={{
                      width:28,height:30,borderRadius:7,
                      border:'1px solid rgba(239,68,68,0.25)',
                      background:'rgba(239,68,68,0.08)',
                      color:'#ef4444',cursor:'pointer',flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',
                    }}><X size={10}/></button>
                  </div>
                </div>

                {/* Dostavchik — API dan */}
                <div style={{flex:1,minWidth:200,display:'flex',flexDirection:'column',gap:4}}>
                  <label style={lblStyle}>
                    {t.modalDostavchik??'Dostavchik'}
                    {dostavLoading && (
                      <span style={{marginLeft:6,fontWeight:500,color:muted,textTransform:'none',letterSpacing:0}}>
                        …
                      </span>
                    )}
                  </label>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <div style={{flex:1}}>
                      <DropdownField
                        label=""
                        value={dostavchik}
                        options={dostavchikList}
                        onSelect={(name) => {
                          setDostavchik(name);
                          setDostavchikId(dostavchikMap[name] ?? null);
                        }}
                        {...dpProps}
                        searchPlaceholder={t.zSearch ?? 'Qidiruv...'}
                        notFoundText={dostavLoading
                          ? '…'
                          : (hasApiToken()
                            ? (t.modalDostavchikEmpty ?? 'Dostavchik topilmadi')
                            : (t.modalDostavchikNoApi ?? 'API ulanmagan'))}
                        flex="1"
                        minWidth={80}
                      />
                    </div>
                    <button
                      onClick={() => { setDostavchik(''); setDostavchikId(null); }}
                      style={{
                        width:28,height:30,borderRadius:7,
                        border:'1px solid rgba(239,68,68,0.25)',
                        background:'rgba(239,68,68,0.08)',
                        color:'#ef4444',cursor:'pointer',flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',
                      }}
                    ><X size={10}/></button>
                    <button
                      onClick={() => loadDostavchiklar()}
                      title="Yangilash"
                      style={{
                        width:28,height:30,borderRadius:7,
                        border:`1px solid ${brd}`,
                        background: D ? '#161618' : '#f3f4f6',
                        color:'#10b981',cursor:'pointer',flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',
                      }}
                    ><RefreshCw size={11}/></button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{height:1,background:brd}}/>

            {/* ─── Section C: Qo'shimcha ─── */}
            <div>
              <div style={{fontSize:9,color:muted,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',marginBottom:8}}>
                {t.additionalInfo}
              </div>
              <div className="tycm-fr" style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>

                {/* Stat chips */}
                <div style={{display:'flex',gap:6,flex:'0 0 auto',alignSelf:'flex-end'}}>
                  {[
                    {label:t.modalVsego??'Jami',       val:displayRows.length,color:'#10b981',bg:'rgba(16,185,129,0.1)', brdC:'rgba(16,185,129,0.2)'},
                    {label:t.modalNeObr??'Ishlanmagan', val:0,                 color:'#ef4444',bg:'rgba(239,68,68,0.08)',  brdC:'rgba(239,68,68,0.2)'},
                  ].map(({label,val,color,bg:sBg,brdC})=>(
                    <div key={label} style={{
                      display:'flex',flexDirection:'column',alignItems:'center',
                      padding:'5px 13px',borderRadius:8,
                      background:sBg,border:`1px solid ${brdC}`,minWidth:58,
                    }}>
                      <div style={{fontSize:19,fontWeight:700,color,lineHeight:1}}>{val}</div>
                      <div style={{fontSize:9,color:muted,marginTop:2,textTransform:'uppercase',letterSpacing:0.4,whiteSpace:'nowrap'}}>{label}</div>
                    </div>
                  ))}
                </div>

                <TimePicker
                  value={yuklashVaqti} onChange={setYuklashVaqti}
                  label={t.modalTimeOtgr??'Yuklash vaqti'}
                  D={D} brd={brd} inp={D?'#0d0d0d':inp} txt={txt} muted={muted} card={card}
                  lblStyle={lblStyle} flex="0 0 190px" showDate
                />
                {fldWrap(t.otgrReys??'№ Reys',
                  <input defaultValue="1" className="tycm-inp" style={{...inpStyle,width:54}}/>,
                  '0 0 54px',54
                )}
                {fldWrap(t.modalPrimech??'Izoh',
                  <input defaultValue="" placeholder="Izoh..." className="tycm-inp" style={{...inpStyle}}/>,
                  '1',80
                )}
                <DropdownField label={t.zAgent??'Agent'} value={agent} options={AGENT_LIST}
                  onSelect={setAgent} {...dpProps} flex="2" minWidth={160}/>
                {fldWrap('UID',
                  <input readOnly defaultValue="98232126-592b-4562-93ed-..." className="tycm-inp"
                    style={{...inpStyle,color:muted,fontSize:10}}/>,
                  '1',110
                )}
              </div>
            </div>

          </div>
        )}

        {/* ══ TABS ══ */}
        <div style={{background:card,borderBottom:`1px solid ${brd}`,flexShrink:0}}>
          <div className="tycm-tabs" style={{display:'flex',overflowX:'auto',padding:'0 8px'}}>
            {TABS.map(([id,label,icon,count])=>{
              const active=activeTab===id;
              return(
                <button key={id} onClick={()=>setActiveTab(id)} style={{
                  display:'flex',alignItems:'center',gap:5,padding:'9px 12px',
                  background:'none',border:'none',
                  borderBottom:active?'2px solid #6366f1':'2px solid transparent',
                  color:active?'#6366f1':muted,cursor:'pointer',fontSize:12,
                  whiteSpace:'nowrap',flexShrink:0,transition:'color 0.15s,border-color 0.15s',
                }}>
                  {icon}<span>{label}</span>
                  {count!==undefined&&(
                    <span style={{
                      background:active?'#6366f1':(D?'#2a2a2e':'#e5e7eb'),
                      color:active?'#fff':muted,
                      borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:600,
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ TAB TOOLBAR ══ */}
        {activeTab==='zayavki'&&(
          <div style={{background:D?'#111113':'#f9fafb',borderBottom:`1px solid ${brd}`,
            padding:'6px 10px',display:'flex',gap:5,flexWrap:'wrap',flexShrink:0,alignItems:'center',
          }}>
            {/* Active agent filter badge */}
            <div style={{
              display:'flex',alignItems:'center',gap:5,padding:'3px 10px',height:28,
              borderRadius:6,
              border: agent ? '1px solid #6366f1' : `1px solid ${brd}`,
              background: agent ? 'rgba(99,102,241,0.12)' : (D?'#1c1c1e':'#f3f4f6'),
              flexShrink:0,
            }}>
              {agent
                ? <><span style={{fontSize:11,color:'#6366f1',fontWeight:600}}>{agentShort}</span>
                     <span style={{fontSize:10,color:muted}}>{displayRows.length} {t.zRowCount??'ta'}</span></>
                : <span style={{fontSize:11,color:muted}}>{t.agentNotSelected??'Agent tanlanmagan'}</span>
              }
            </div>
            <div style={{width:1,height:18,background:brd,alignSelf:'center'}}/>
            <button className="tycm-tbtn" style={{
              display:'flex',alignItems:'center',gap:4,padding:'5px 10px',height:28,
              borderRadius:6,border:`1px solid ${brd}`,background:D?'#1c1c1e':'#fff',
              color:txt,fontSize:11,cursor:'pointer',whiteSpace:'nowrap',
            }}>
              <RefreshCw size={11} color="#10b981" strokeWidth={2}/>
              <span>{t.modalUpdateList??'Ro\'yxatni yangilash'}</span>
            </button>
            <button className="tycm-tbtn" onClick={handleReset} style={{
              display:'flex',alignItems:'center',gap:4,padding:'5px 10px',height:28,
              borderRadius:6,border:`1px solid ${brd}`,background:D?'#1c1c1e':'#fff',
              color:'#ef4444',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',
            }}>
              <Trash2 size={11} strokeWidth={2}/>
              <span>{t.modalClearList??'Tozalash'}</span>
            </button>

            {/* Horizontal scroll arrows — right side */}
            <div className="tycm-dt" style={{marginLeft:'auto',display:'none',gap:3,alignItems:'center',flexShrink:0}}>
              <span style={{fontSize:10,color:muted,whiteSpace:'nowrap',marginRight:4}}>
                {displayRows.length} {t.zRowCount??'ta'}&nbsp;
                <span style={{color:'#10b981'}}>{fmtN(totalSumma)}</span>
              </span>
              <button
                onClick={()=>tableRef.current?.scrollBy({left:-320,behavior:'smooth'})}
                title="Chapga"
                style={{
                  width:26,height:26,borderRadius:6,border:`1px solid ${brd}`,
                  background:D?'#1c1c1e':'#e4e4e8',color:txt,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                }}
              ><ChevronLeft size={13}/></button>
              <button
                onClick={()=>tableRef.current?.scrollBy({left:320,behavior:'smooth'})}
                title="O'ngga"
                style={{
                  width:26,height:26,borderRadius:6,border:`1px solid ${brd}`,
                  background:D?'#1c1c1e':'#e4e4e8',color:txt,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                }}
              ><ChevronRight size={13}/></button>
            </div>
          </div>
        )}

        {/* ══ CONTENT ══ */}
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',minHeight:0}}>
          {activeTab==='zayavki'?(
            <>
              {/* Desktop table */}
              <div ref={tableRef} className="tycm-dt tycm-scroll" style={{
                flex:1,overflowX:'auto',overflowY:'auto',display:'none',flexDirection:'column',minHeight:0,
              }}>
                <table style={{borderCollapse:'collapse',fontSize:12,minWidth:1300,width:'100%'}}>
                  <thead>
                    <tr style={{background:hdr,position:'sticky',top:0,zIndex:2}}>
                      {COLS.map(c=>(
                        <th key={c.key} style={{
                          padding:'7px 7px',fontWeight:600,fontSize:10,color:muted,
                          textTransform:'uppercase',letterSpacing:0.3,whiteSpace:'nowrap',
                          textAlign:c.center?'center':c.right?'right':'left',
                          borderBottom:`2px solid ${brd}`,borderRight:`1px solid ${brd}`,
                          width:c.w,minWidth:c.w,
                        }}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.length===0?(
                      <tr>
                        <td colSpan={COLS.length} style={{
                          padding:'48px 20px',textAlign:'center',
                          color:muted,fontSize:12,
                        }}>
                          {!agent
                            ? `👆 ${t.agentSelectHint??'Avval agent tanlang'}`
                            : t.noDataFound??'Topilmadi'}
                        </td>
                      </tr>
                    ):displayRows.map(row=>(
                      <tr key={row.id} className="tycm-row" style={{borderBottom:`1px solid ${brd}`}}>
                        {COLS.map(c=>(
                          <td key={c.key} style={{
                            padding:'6px 7px',borderRight:`1px solid ${brd}`,
                            textAlign:c.center?'center':c.right?'right':'left',
                            color:c.key==='summa'?'#10b981':c.key==='dolg'?'#ef4444':c.key==='num'?'#6366f1':c.key==='n'?muted:txt,
                            whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                            maxWidth:c.w,fontWeight:c.key==='num'?600:400,
                          }}>
                            {c.key==='status'?statusBadge(row.status):cellVal(row,c.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:D?'#1a1a1e':'#f0f0f5',borderTop:`2px solid ${brd}`,position:'sticky',bottom:0}}>
                      {COLS.map(c=>(
                        <td key={c.key} style={{
                          padding:'7px 7px',borderRight:`1px solid ${brd}`,
                          textAlign:c.center?'center':c.right?'right':'left',
                          fontSize:11,fontWeight:700,
                          color:c.key==='summa'?'#10b981':c.key==='dolg'?'#ef4444':c.key==='ves'?'#6366f1':muted,
                        }}>
                          {c.key==='n'?`${displayRows.length} ${t.zRowCount??'ta'}`
                          :c.key==='summa'?fmtN(totalSumma)
                          :c.key==='dolg'?fmtN(totalDolg)
                          :c.key==='poluch'?'—'
                          :c.key==='ves'?String(totalVes):''}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="tycm-mob" style={{flex:1,overflowY:'auto',padding:'8px 10px',display:'none',flexDirection:'column',gap:5,minHeight:0}}>
                {displayRows.length===0&&(
                  <div style={{
                    flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                    justifyContent:'center',gap:8,padding:'48px 20px',
                    color:muted,fontSize:12,textAlign:'center',
                  }}>
                    <span style={{fontSize:28}}>👆</span>
                    <span>{!agent ? t.agentSelectHint??'Avval agent tanlang' : t.noDataFound??'Topilmadi'}</span>
                  </div>
                )}
                {displayRows.map(row=>{
                  const open=expanded===row.id;
                  return(
                    <div key={row.id} style={{background:card,borderRadius:10,border:`1px solid ${brd}`,overflow:'hidden'}}>
                      <button onClick={()=>setExpanded(open?null:row.id)} style={{
                        width:'100%',background:'none',border:'none',padding:'9px 11px',cursor:'pointer',textAlign:'left',
                      }}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:6}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,color:'#6366f1',fontWeight:700,marginBottom:1}}>#{row.num}</div>
                            <div style={{fontSize:12,color:txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.kontragent}</div>
                            <div style={{fontSize:11,color:muted,marginTop:2}}>{row.direction} · {row.marsh} · {row.date}</div>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3,flexShrink:0}}>
                            {statusBadge(row.status)}
                            <span style={{fontSize:12,color:'#10b981',fontWeight:600}}>{fmtN(row.summa)}</span>
                          </div>
                          <div style={{color:muted,alignSelf:'center',flexShrink:0}}>
                            {open?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
                          </div>
                        </div>
                      </button>
                      {open&&(
                        <div style={{borderTop:`1px solid ${brd}`,padding:'8px 11px',display:'flex',flexDirection:'column',gap:4}}>
                          {[
                            {label:t.modalAgent??'Agent',    val:row.agent},
                            {label:'km',                     val:String(row.km)},
                            {label:t.modalTip??'Tip',        val:row.tip},
                            {label:t.modalKodTT??'KodTT',    val:row.kodTT},
                            {label:t.modalMarsh??'Marshrut', val:row.marsh},
                            {label:t.otgrVes??'Vazn',        val:`${row.ves} kg`},
                            {label:t.modalDolg??'Qarz',      val:fmtN(row.dolg)},
                            {label:'Время обр.',             val:row.timeObr||'—'},
                            {label:t.zNote??'Izoh',          val:row.note||'—'},
                          ].map(({label,val})=>(
                            <div key={label} style={{display:'flex',justifyContent:'space-between',gap:8}}>
                              <span style={{fontSize:11,color:muted}}>{label}</span>
                              <span style={{fontSize:11,color:txt,fontWeight:500,textAlign:'right'}}>{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ):(
            /* ── Tovarlar tab placeholder ── */
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:muted,fontSize:13}}>
              <Package size={20} style={{marginRight:8,opacity:0.4}}/> {t.modalTovarlar??"Tovarlar ro'yxati"}
            </div>
          )}
        </div>

      </div>
    </>
  );

  if(pageMode) return <>{inner}</>;
  return(
    <div style={{
      position:'fixed',inset:0,zIndex:9000,
      display:'flex',alignItems:'stretch',justifyContent:'flex-end',
      background:'rgba(0,0,0,0.7)',
    }}>
      {inner}
    </div>
  );
}
