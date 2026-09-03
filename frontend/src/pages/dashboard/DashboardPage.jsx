import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, AudioLines, BarChart3, Check, Mic2, Plus, Target, UsersRound
} from 'lucide-react';
import { userAPI } from '@/services/api';

const roleCards = [
  { label: 'Technical', tone: 'bg-[#d9efbf]', icon: BarChart3 },
  { label: 'Behavioral', tone: 'bg-[#f6d7be]', icon: UsersRound },
  { label: 'Product', tone: 'bg-[#d5e4f4]', icon: Target },
];

const Stat = ({ label, value, note, type }) => {
  const score = Number.parseFloat(value) || 0;
  const progress = Math.min(100, Math.max(0, score));

  return (
    <div className="skillora-card relative overflow-hidden rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] skillora-muted">{label}</p>
          <p className="mt-3 text-3xl font-display font-bold skillora-ink">{value}</p>
          <p className="mt-1 text-xs skillora-muted">{note}</p>
        </div>
        {type === 'sessions' ? (
          <div className="flex h-14 items-end gap-1.5" aria-hidden="true">
            {[35, 58, 45, 76, 62, 88].map((height, index) => (
              <span key={height} className="w-2 rounded-t bg-[#173500]" style={{ height: `${height}%`, opacity: 0.3 + index * 0.1 }} />
            ))}
          </div>
        ) : (
          <svg className="mr-2 h-24 w-24 shrink-0 -rotate-90" viewBox="0 0 42 42" aria-hidden="true">
            <circle cx="21" cy="21" r="16" fill="none" stroke="#d9efbf" strokeWidth="5" />
            <circle cx="21" cy="21" r="16" fill="none" stroke="#173500" strokeWidth="5" strokeDasharray={`${progress} ${100 - progress}`} strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#d9efbf]">
        <div className="h-full rounded-full bg-[#e8f24c]" style={{ width: `${type === 'sessions' ? Math.min(100, score * 10) : progress}%` }} />
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    userAPI.getDashboard().then(({ data }) => setStats(data.data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 skillora-ink">
      <section className="relative overflow-hidden rounded-[28px] border border-[#173500]/15 bg-[#f4f0dc] px-6 py-12 sm:px-12 lg:px-16">
        <div className="absolute right-8 top-8 hidden h-28 w-28 rotate-12 rounded-[45%] border-2 border-[#173500]/20 lg:block" />
        <div className="relative max-w-3xl">
          <h2 className="max-w-3xl text-4xl font-display font-bold leading-[0.98] tracking-tight sm:text-6xl">Practice with a panel that <span className="bg-[#e8f24c] px-2">thinks with you.</span></h2>
          <p className="mt-6 max-w-xl text-base leading-7 skillora-muted">Build confidence through live, interruptible conversations with technical, behavioral, and product interviewers.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/interviews/new" className="inline-flex items-center gap-2 rounded-lg bg-[#173500] px-5 py-3 text-sm font-semibold text-[#e8f24c] transition-transform hover:-translate-y-0.5"><Plus size={17} /> Start an interview <ArrowUpRight size={16} /></Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat type="sessions" label="Sessions completed" value={stats?.completedSessions ?? 0} note="Keep the rhythm going" />
        <Stat type="score" label="Average score" value={`${stats?.averageScore ?? 0}%`} note="Across every practice room" />
        <Stat type="score" label="Best score" value={`${stats?.bestScore ?? 0}%`} note="Your current personal best" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="skillora-card rounded-2xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] skillora-muted">Your interview panel</p><h3 className="mt-2 text-2xl font-display font-bold">Choose the pressure you need.</h3></div><AudioLines className="skillora-muted" /></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">{roleCards.map(({ label, tone, icon: Icon }) => <Link key={label} to="/interviews/new" className={`${tone} rounded-xl p-4 transition-transform hover:-translate-y-1`}><Icon size={20} /><p className="mt-8 text-sm font-bold">{label}</p><p className="mt-1 text-xs opacity-70">AI interviewer</p></Link>)}</div>
          <div className="mt-6 flex items-center gap-3 border-t border-[#173500]/10 pt-5 text-sm skillora-muted"><Check size={16} className="text-[#4b791e]" /> Mix roles to simulate a real interview panel</div>
        </div>
        <div className="rounded-2xl bg-[#173500] p-6 text-[#f7f5e9] sm:p-8"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b7c49b]">Quick start</p><Mic2 size={21} className="text-[#e8f24c]" /></div><h3 className="mt-8 max-w-xs text-3xl font-display font-bold leading-tight">Your next answer is one conversation away.</h3><p className="mt-4 text-sm leading-6 text-[#c6d0b2]">Start with a role, answer out loud, and let the panel adapt to what you say.</p><Link to="/interviews/new" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#e8f24c] px-4 py-3 text-sm font-bold text-[#173500] hover:bg-white">Practice now <ArrowUpRight size={16} /></Link></div>
      </section>

    </div>
  );
}
