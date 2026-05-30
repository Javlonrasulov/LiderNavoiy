import { useState } from "react";
import { useTheme } from "../../components/ThemeContext";
import { useNavigate } from "react-router";
import BottomNav from "../../components/BottomNav";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Trophy, Medal, TrendingUp, BarChart2, ChevronDown, ChevronRight, Crown, ChevronLeft } from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const myAgentId = 3;

// Statistics mock data
const dailyStats = [
  { time: "08:00", sales: 120000 },
  { time: "10:00", sales: 350000 },
  { time: "12:00", sales: 580000 },
  { time: "14:00", sales: 720000 },
  { time: "16:00", sales: 950000 },
  { time: "18:00", sales: 1200000 },
  { time: "20:00", sales: 1350000 },
];

const weeklyStats = [
  { day: "Dush", sales: 2100000 },
  { day: "Sesh", sales: 1850000 },
  { day: "Chor", sales: 2450000 },
  { day: "Pay", sales: 2200000 },
  { day: "Jum", sales: 2800000 },
  { day: "Shan", sales: 3100000 },
  { day: "Yak", sales: 2650000 },
];

const monthlyStats = [
  { month: "Yan", sales: 12500000 },
  { month: "Fev", sales: 14200000 },
  { month: "Mar", sales: 13800000 },
  { month: "Apr", sales: 15600000 },
  { month: "May", sales: 16500000 },
  { month: "Iyun", sales: 17200000 },
  { month: "Iyul", sales: 18900000 },
  { month: "Avg", sales: 16800000 },
  { month: "Sen", sales: 19200000 },
  { month: "Okt", sales: 20100000 },
  { month: "Noy", sales: 18500000 },
  { month: "Dek", sales: 21300000 },
];

const categories = [
  {
    id: "sheringa",
    label: { uz_latn: "Sherin", uz_cyrl: "Шерин", ru: "Шерин" },
    color: "#6366f1",
    bg: "bg-indigo-500",
    plan: 5_000_000,
    done: 3_750_000,
  },
  {
    id: "tim",
    label: { uz_latn: "Tim", uz_cyrl: "Тим", ru: "Тим" },
    color: "#10b981",
    bg: "bg-emerald-500",
    plan: 8_000_000,
    done: 4_960_000,
  },
  {
    id: "sir",
    label: { uz_latn: "Sir", uz_cyrl: "Сир", ru: "Сир" },
    color: "#f59e0b",
    bg: "bg-amber-500",
    plan: 3_500_000,
    done: 3_150_000,
  },
];

// Each agent has per-category done percentages
const agents = [
  {
    id: 1, name: "Nazarov Jasur", plan: 16_500_000, done: 15_180_000,
    cats: { sheringa: 96, tim: 90, sir: 91 },
  },
  {
    id: 2, name: "Qodirov Sherzod", plan: 16_500_000, done: 14_025_000,
    cats: { sheringa: 88, tim: 82, sir: 86 },
  },
  {
    id: myAgentId, name: "Abdujaqimov Diyorbek", plan: 16_500_000, done: 11_860_000,
    cats: { sheringa: 75, tim: 62, sir: 90 },
  },
  {
    id: 4, name: "Toshmatov Sanjar", plan: 16_500_000, done: 10_395_000,
    cats: { sheringa: 70, tim: 58, sir: 78 },
  },
  {
    id: 5, name: "Mirzayev Bobur", plan: 16_500_000, done: 9_075_000,
    cats: { sheringa: 61, tim: 50, sir: 67 },
  },
  {
    id: 6, name: "Yusupov Eldor", plan: 16_500_000, done: 7_590_000,
    cats: { sheringa: 50, tim: 42, sir: 55 },
  },
  {
    id: 7, name: "Raxmatullayev Timur", plan: 16_500_000, done: 5_775_000,
    cats: { sheringa: 38, tim: 32, sir: 41 },
  },
  {
    id: 8, name: "Holmatov Ravshan", plan: 16_500_000, done: 3_960_000,
    cats: { sheringa: 25, tim: 20, sir: 30 },
  },
];

const rankMeta = [
  { icon: Crown, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400", podiumBg: "bg-yellow-400/20" },
  { icon: Trophy, color: "text-gray-400",   bg: "bg-gray-400/10",  border: "border-gray-400",  podiumBg: "bg-gray-400/10"  },
  { icon: Medal,  color: "text-amber-600",  bg: "bg-amber-600/10", border: "border-amber-600", podiumBg: "bg-amber-600/10" },
];

// podium display order: [2nd, 1st, 3rd] → sortedAgents indices [1, 0, 2]
const PODIUM_ORDER = [1, 0, 2];
// podium heights: left=2nd(medium), center=1st(tall), right=3rd(short)
const PODIUM_HEIGHTS = { 0: "h-28", 1: "h-20", 2: "h-16" };

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + " ming";
  return n.toString();
}

function pct(done: number, plan: number) {
  return Math.min(100, Math.round((done / plan) * 100));
}

// ─── Radial Progress ──────────────────────────────────────────────────────────
function RadialProgress({
  value,
  color,
  size = 110,
  textColor = "text-white",
}: {
  value: number;
  color: string;
  size?: number;
  textColor?: string;
}) {
  const data = [{ value, fill: color }];
  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="72%"
          outerRadius="100%"
          startAngle={90}
          endAngle={90 - 360 * (value / 100)}
          data={data}
          barSize={10}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "rgba(128,128,128,0.15)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${textColor}`} style={{ fontSize: size < 80 ? 13 : 18, lineHeight: 1 }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

// ─── Mini category badge row ──────────────────────────────────────────────────
function CatBars({
  cats,
  isDark,
}: {
  cats: { sheringa: number; tim: number; sir: number };
  isDark: boolean;
}) {
  const items = [
    { key: "sheringa", label: "Sherin", color: "#818cf8", val: cats.sheringa },
    { key: "tim",      label: "Tim",      color: "#34d399", val: cats.tim      },
    { key: "sir",      label: "Sir",      color: "#fbbf24", val: cats.sir      },
  ];
  const maxH = 120;
  return (
    <div className="flex gap-6 mt-3 justify-center items-end">
      {items.map((it) => (
        <div key={it.key} className="flex flex-col items-center gap-1" style={{ width: 38 }}>
          <span className="text-xs" style={{ color: it.color }}>{it.val}%</span>
          <div
            className="rounded-xl overflow-hidden relative"
            style={{ width: 38, height: maxH, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-xl transition-all duration-700"
              style={{ height: `${it.val}%`, background: it.color, opacity: 0.88 }}
            />
          </div>
          <span className="text-xs" style={{ color: it.color }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Plan() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"my" | "all">("my");
  const [statsPeriod, setStatsPeriod] = useState<"day" | "week" | "month">("day");
  const [openAgentId, setOpenAgentId] = useState<number | null>(null);

  const bg     = isDark ? "bg-black"    : "bg-gray-50";
  const card   = isDark ? "bg-gray-900" : "bg-white";
  const sub    = isDark ? "text-gray-400" : "text-gray-500";
  const txt    = isDark ? "text-white"  : "text-black";
  const border = isDark ? "border-gray-800" : "border-gray-200";

  const t = {
    uz_latn: {
      title: "Plan",
      myPlan: "Mening rejam",
      allAgents: "Barcha agentlar",
      total: "Umumiy plan",
      completed: "Bajarildi",
      remaining: "Qoldi",
      planLabel: "Reja",
      doneLabel: "Bajarildi",
      statistics: "Statistika",
      day: "Kun",
      week: "Hafta",
      month: "Oy",
      sales: "Sotildi",
    },
    uz_cyrl: {
      title: "Режа",
      myPlan: "Менинг режам",
      allAgents: "Барча агентлар",
      total: "Умумий режа",
      completed: "Бажарилди",
      remaining: "Қолди",
      planLabel: "Режа",
      doneLabel: "Бажарилди",
      statistics: "Статистика",
      day: "Кун",
      week: "Ҳафта",
      month: "Ой",
      sales: "Сотилди",
    },
    ru: {
      title: "План",
      myPlan: "Мой план",
      allAgents: "Все агенты",
      total: "Общий план",
      completed: "Выполнено",
      remaining: "Осталось",
      planLabel: "План",
      doneLabel: "Выполнено",
      statistics: "Статистика",
      day: "День",
      week: "Неделя",
      month: "Месяц",
      sales: "Продано",
    },
  }[language];

  const totalPlan = categories.reduce((s, c) => s + c.plan, 0);
  const totalDone = categories.reduce((s, c) => s + c.done, 0);
  const totalPct  = pct(totalDone, totalPlan);

  const sortedAgents = [...agents].sort((a, b) => pct(b.done, b.plan) - pct(a.done, a.plan));

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`} style={{ scrollbarWidth: "none" }}>
      <style>{`::-webkit-scrollbar{display:none}`}</style>
      <div className="max-w-md mx-auto flex flex-col min-h-screen">

        {/* Header */}
        <div className={`relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900'
            : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="relative px-5 pt-8 pb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-white text-lg tracking-wide">{t.title}</h1>
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-4 gap-3">
          {(["my", "all"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-3 rounded-2xl text-sm transition-all ${
                tab === id
                  ? "bg-blue-500 text-white"
                  : isDark
                  ? "bg-gray-900 text-gray-400"
                  : "bg-white text-gray-500"
              }`}
            >
              {id === "my" ? t.myPlan : t.allAgents}
            </button>
          ))}
        </div>

        {/* ── MY PLAN TAB ── */}
        {tab === "my" && (
          <div className="flex-1 px-5 py-4 pb-28 overflow-y-auto space-y-4" style={{ scrollbarWidth: "none" }}>

            {/* Total Card */}
            <div
              className="rounded-3xl p-5 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#312e81 0%,#1e40af 50%,#0e7490 100%)" }}
            >
              <div className="absolute right-4 top-4 opacity-10">
                <BarChart2 className="w-24 h-24 text-white" />
              </div>
              <div className="text-white/70 text-sm mb-1">{t.total}</div>
              <div className="text-white text-3xl mb-4">{fmt(totalPlan)} сум</div>

              <div className="flex items-center gap-6">
                <RadialProgress value={totalPct} color="#60a5fa" size={120} />
                <div className="flex flex-col gap-3 flex-1">
                  <div>
                    <div className="text-white/60 text-xs">{t.completed}</div>
                    <div className="text-white text-lg">{fmt(totalDone)} сум</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">{t.remaining}</div>
                    <div className="text-white text-lg">{fmt(totalPlan - totalDone)} сум</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-400 transition-all duration-700"
                  style={{ width: `${totalPct}%` }}
                />
              </div>
              <div className="flex justify-between text-white/50 text-xs mt-1">
                <span>0</span>
                <span>{fmt(totalPlan)}</span>
              </div>
            </div>

            {/* Statistics Card */}
            <div className={`rounded-3xl p-5 ${card}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg ${txt}`}>{t.statistics}</h2>
                <div className="flex gap-2">
                  {(["day", "week", "month"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setStatsPeriod(period)}
                      className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                        statsPeriod === period
                          ? "bg-blue-500 text-white"
                          : isDark
                          ? "bg-gray-800 text-gray-400"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {period === "day" ? t.day : period === "week" ? t.week : t.month}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-64">
                {statsPeriod === "day" && (
                  <ResponsiveContainer key="day-container" width="100%" height="100%">
                    <LineChart key="daily-chart" data={dailyStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis 
                        key="day-xaxis"
                        dataKey="time" 
                        stroke={isDark ? "#9ca3af" : "#6b7280"}
                        style={{ fontSize: 11 }}
                        tick={{ fill: isDark ? "#9ca3af" : "#6b7280" }}
                        axisLine={{ stroke: isDark ? "#374151" : "#e5e7eb" }}
                      />
                      <YAxis 
                        key="day-yaxis"
                        stroke={isDark ? "#9ca3af" : "#6b7280"}
                        style={{ fontSize: 11 }}
                        tick={{ fill: isDark ? "#9ca3af" : "#6b7280" }}
                        tickFormatter={(val) => fmt(val)}
                        axisLine={{ stroke: isDark ? "#374151" : "#e5e7eb" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#1f2937" : "#fff",
                          border: "none",
                          borderRadius: 12,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        labelStyle={{ color: isDark ? "#fff" : "#000", fontSize: 12 }}
                        itemStyle={{ color: "#3b82f6", fontSize: 12 }}
                        formatter={(val: number) => [fmt(val) + " сум", t.sales]}
                      />
                      <Line 
                        key="day-line"
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: "#3b82f6", r: 4 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                {statsPeriod === "week" && (
                  <ResponsiveContainer key="week-container" width="100%" height="100%">
                    <BarChart key="weekly-chart" data={weeklyStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis 
                        key="week-xaxis"
                        dataKey="day" 
                        stroke={isDark ? "#9ca3af" : "#6b7280"}
                        style={{ fontSize: 11 }}
                        tick={{ fill: isDark ? "#9ca3af" : "#6b7280" }}
                        axisLine={{ stroke: isDark ? "#374151" : "#e5e7eb" }}
                      />
                      <YAxis 
                        key="week-yaxis"
                        stroke={isDark ? "#9ca3af" : "#6b7280"}
                        style={{ fontSize: 11 }}
                        tick={{ fill: isDark ? "#9ca3af" : "#6b7280" }}
                        tickFormatter={(val) => fmt(val)}
                        axisLine={{ stroke: isDark ? "#374151" : "#e5e7eb" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#1f2937" : "#fff",
                          border: "none",
                          borderRadius: 12,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        labelStyle={{ color: isDark ? "#fff" : "#000", fontSize: 12 }}
                        itemStyle={{ color: "#10b981", fontSize: 12 }}
                        formatter={(val: number) => [fmt(val) + " сум", t.sales]}
                      />
                      <Bar 
                        key="week-bar"
                        dataKey="sales" 
                        fill="#10b981"
                        radius={[8, 8, 0, 0]}
                        isAnimationActive={true}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {statsPeriod === "month" && (
                  <ResponsiveContainer key="month-container" width="100%" height="100%">
                    <LineChart key="monthly-chart" data={monthlyStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis 
                        key="month-xaxis"
                        dataKey="month" 
                        stroke={isDark ? "#9ca3af" : "#6b7280"}
                        style={{ fontSize: 11 }}
                        tick={{ fill: isDark ? "#9ca3af" : "#6b7280" }}
                        axisLine={{ stroke: isDark ? "#374151" : "#e5e7eb" }}
                      />
                      <YAxis 
                        key="month-yaxis"
                        stroke={isDark ? "#9ca3af" : "#6b7280"}
                        style={{ fontSize: 11 }}
                        tick={{ fill: isDark ? "#9ca3af" : "#6b7280" }}
                        tickFormatter={(val) => fmt(val)}
                        axisLine={{ stroke: isDark ? "#374151" : "#e5e7eb" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#1f2937" : "#fff",
                          border: "none",
                          borderRadius: 12,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        labelStyle={{ color: isDark ? "#fff" : "#000", fontSize: 12 }}
                        itemStyle={{ color: "#f59e0b", fontSize: 12 }}
                        formatter={(val: number) => [fmt(val) + " сум", t.sales]}
                      />
                      <Line 
                        key="month-line"
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        dot={{ fill: "#f59e0b", r: 4 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Summary info */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: isDark ? "#374151" : "#e5e7eb" }}>
                <div className="flex justify-between items-center">
                  <span className={sub}>
                    {statsPeriod === "day" ? "Bugungi savdo" : statsPeriod === "week" ? "Haftalik savdo" : "Oylik savdo"}
                  </span>
                  <span className={`text-lg ${txt}`}>
                    {fmt(
                      statsPeriod === "day" 
                        ? dailyStats[dailyStats.length - 1].sales 
                        : statsPeriod === "week"
                        ? weeklyStats.reduce((sum, d) => sum + d.sales, 0)
                        : monthlyStats[monthlyStats.length - 1].sales
                    )} сум
                  </span>
                </div>
              </div>
            </div>

            {/* Category Cards */}
            {categories.map((cat) => {
              const p     = pct(cat.done, cat.plan);
              const label = cat.label[language as keyof typeof cat.label];
              return (
                <div key={cat.id} className={`rounded-3xl p-5 ${card}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${cat.bg} rounded-xl flex items-center justify-center`}>
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className={`${txt} text-base`}>{label}</div>
                        <div className={`${sub} text-xs`}>{t.planLabel}: {fmt(cat.plan)} сум</div>
                      </div>
                    </div>
                    <RadialProgress
                      value={p}
                      color={cat.color}
                      size={72}
                      textColor={isDark ? "text-white" : "text-black"}
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className={`flex-1 rounded-2xl p-3 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                      <div className={`text-xs ${sub}`}>{t.doneLabel}</div>
                      <div className={`text-sm ${txt}`}>{fmt(cat.done)} сум</div>
                    </div>
                    <div className={`flex-1 rounded-2xl p-3 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                      <div className={`text-xs ${sub}`}>{t.remaining}</div>
                      <div className={`text-sm ${txt}`}>{fmt(cat.plan - cat.done)} сум</div>
                    </div>
                  </div>

                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden" style={{ background: isDark ? "#374151" : "#e5e7eb" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${p}%`, background: cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ALL AGENTS TAB ── */}
        {tab === "all" && (
          <div className="flex-1 px-5 py-4 pb-28 overflow-y-auto space-y-3" style={{ scrollbarWidth: "none" }}>

            {/* Podium — order: 2nd | 1st | 3rd */}
            <div className="flex items-end justify-center gap-3 py-4">
              {PODIUM_ORDER.map((rankIdx) => {
                const agent  = sortedAgents[rankIdx];
                if (!agent) return null;
                const p      = pct(agent.done, agent.plan);
                const meta   = rankMeta[rankIdx];
                const Icon   = meta.icon;
                const isMe   = agent.id === myAgentId;
                const height = PODIUM_HEIGHTS[rankIdx as keyof typeof PODIUM_HEIGHTS];
                return (
                  <div key={agent.id} className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${meta.bg}`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div className={`text-xs text-center leading-tight ${isMe ? "text-blue-500" : txt}`}>
                      {agent.name.split(" ")[0]}
                    </div>
                    <div className={`text-sm ${meta.color}`}>{p}%</div>
                    <div
                      className={`w-full rounded-t-2xl flex items-center justify-center ${height} ${meta.podiumBg} border-t-2 ${meta.border}`}
                    >
                      <span className={`text-sm ${meta.color}`}>{rankIdx + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full list */}
            <div className="space-y-2">
              {sortedAgents.map((agent, idx) => {
                const p    = pct(agent.done, agent.plan);
                const isMe = agent.id === myAgentId;
                const isOpen = openAgentId === agent.id;
                const barColor =
                  idx === 0 ? "#facc15" :
                  idx === 1 ? "#9ca3af" :
                  idx === 2 ? "#d97706" : "#3b82f6";
                return (
                  <div
                    key={agent.id}
                    className={`px-4 py-4 rounded-2xl ${card} ${isMe ? (isDark ? "border border-blue-500/40" : "border border-blue-400/40") : ""}`}
                  >
                    {/* Clickable header row */}
                    <button
                      className="flex items-center gap-3 w-full text-left"
                      onClick={() => setOpenAgentId(isOpen ? null : agent.id)}
                    >
                      {/* Rank badge */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                          idx === 0 ? "bg-yellow-400/20 text-yellow-400" :
                          idx === 1 ? "bg-gray-400/20 text-gray-400" :
                          idx === 2 ? "bg-amber-600/20 text-amber-600" :
                          isDark    ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {idx + 1}
                      </div>

                      {/* Name + main bar */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm truncate ${isMe ? "text-blue-500" : txt}`}>
                          {agent.name} {isMe && "✦"}
                        </div>
                        <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "#374151" : "#e5e7eb" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${p}%`, background: barColor }}
                          />
                        </div>
                      </div>

                      <span className={`text-sm flex-shrink-0 ${isMe ? "text-blue-500" : txt}`}>{p}%</span>
                      {isOpen
                        ? <ChevronDown className={`w-4 h-4 flex-shrink-0 text-blue-400 transition-transform duration-200`} />
                        : <ChevronRight className={`w-4 h-4 flex-shrink-0 ${sub} transition-transform duration-200`} />
                      }
                    </button>

                    {/* Category breakdown — only when open */}
                    {isOpen && (
                      <div className="mt-1">
                        <CatBars cats={agent.cats} isDark={isDark} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <BottomNav activePage="plan" onNavigate={(page) => {
          if (page === 'home') navigate('/');
          else if (page === 'dostavka') navigate('/visit');
          else if (page === 'locatsiya') navigate('/locatsiya');
          else if (page === 'plan') navigate('/plan');
          else if (page === 'messages') navigate('/messages');
        }} />
      </div>
    </div>
  );
}