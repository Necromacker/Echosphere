import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, Check, Menu, Mic2, Sparkles } from 'lucide-react';

const roles = ['Technical', 'Behavioural', 'Product', 'Hiring Manager'];

function PaperSketch({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 170 210" fill="none" aria-hidden="true">
      <path d="M29 16 143 27l-12 158-116-12L29 16Z" stroke="currentColor" strokeWidth="2" />
      <path d="m47 42 80 8M44 59l66 7M42 79l84 8M40 97l66 7M38 119l81 8M36 137l52 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m53 36-6 10m85 6-5 11m-84 26-6 11m88 8-5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="38" cy="43" r="4" fill="currentColor" />
      <circle cx="35" cy="81" r="4" fill="currentColor" />
      <circle cx="33" cy="120" r="4" fill="currentColor" />
    </svg>
  );
}

function Squiggle({ className = '' }) {
  return <svg className={className} viewBox="0 0 180 50" fill="none" aria-hidden="true"><path d="M3 28c13-34 22 28 35-1s22 28 35-2 22 28 35-1 22 28 35-1 22 22 34-2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
}

export default function LandingPage() {
  return (
    <div className="skillora-landing min-h-screen overflow-hidden">
      <nav className="relative z-10 mx-auto mt-5 flex max-w-6xl items-center justify-between rounded-2xl border border-dashed border-[#173500]/35 bg-[#f7f5e9]/90 px-4 py-3 backdrop-blur-md sm:px-5">
        <Link to="/" className="flex items-center gap-3" aria-label="Skillora home">
          <span className="skillora-logo-box"><BrainCircuit size={25} /></span>
          <span className="text-xl font-black tracking-tight text-[#173500]">Skillora</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-semibold text-[#52604a] md:flex">
          <a href="#interview">AI Interview</a><a href="#roles">Features</a><a href="#how">How it works</a><a href="#pricing">Pricing</a>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="hidden rounded-lg border border-[#173500]/40 px-4 py-2 text-sm font-bold text-[#173500] transition hover:bg-white/60 sm:inline-flex">Dashboard</Link>
          <Link to="/interviews/new" className="rounded-lg bg-[#173500] px-4 py-2.5 text-sm font-bold text-[#e8f24c] transition hover:-translate-y-0.5 hover:bg-[#294d0e]">Start free</Link>
          <button className="rounded-lg p-2 text-[#173500] md:hidden" aria-label="Open menu"><Menu size={20} /></button>
        </div>
      </nav>

      <main id="interview" className="skillora-grid relative mx-auto mt-10 max-w-7xl px-5 pb-16 pt-16 text-center sm:mt-14 sm:px-8 sm:pt-20">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <span className="inline-flex items-center gap-2 bg-[#e8f24c] px-3 py-1.5 text-xs font-bold text-[#173500]"><Sparkles size={13} /> Next-gen AI interview practice</span>
          <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-black leading-[0.94] tracking-[-0.055em] text-[#173500] sm:text-7xl lg:text-[6.6rem]">Meet your next<br /><span className="inline-block bg-[#e8f24c] px-3 pb-2">best interview.</span></h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-[#52604a] sm:text-xl">A live AI interview panel that listens, adapts, and challenges you like the real thing.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/interviews/new" className="inline-flex items-center gap-2 rounded-lg bg-[#173500] px-6 py-3.5 text-sm font-bold text-[#e8f24c] shadow-[0_8px_0_#b8c32e] transition hover:translate-y-0.5 hover:shadow-[0_5px_0_#b8c32e]">Practice for free <ArrowRight size={17} /></Link>
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-[#173500]/40 bg-[#f7f5e9] px-6 py-3.5 text-sm font-bold text-[#173500]">View dashboard</Link>
          </div>
          <p className="mt-5 text-xs font-semibold text-[#75816c]">No account required · Real-time voice · Human-style feedback</p>
        </motion.div>

        <PaperSketch className="absolute -left-2 top-56 hidden w-32 rotate-[-13deg] text-[#173500] lg:block" />
        <PaperSketch className="absolute -right-2 top-[30rem] hidden w-32 rotate-[16deg] text-[#173500]/60 lg:block" />
        <Squiggle className="absolute bottom-10 left-16 hidden w-36 rotate-[-10deg] text-[#173500] lg:block" />

        <section id="roles" className="mx-auto mt-20 max-w-4xl border-y border-[#173500]/20 py-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#74806c]">One room. Multiple perspectives.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-black text-[#173500] sm:gap-x-12">{roles.map((role) => <span key={role} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#e8f24c] ring-1 ring-[#173500]/20" />{role}</span>)}</div>
        </section>
      </main>

      <section id="how" className="mx-auto grid max-w-7xl gap-5 px-5 pb-20 sm:px-8 md:grid-cols-3">
        <div className="rounded-2xl bg-[#173500] p-7 text-[#f7f5e9] md:col-span-2"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.18em] text-[#b9c79f]">The Skillora difference</span><Mic2 className="text-[#e8f24c]" size={23} /></div><h2 className="mt-12 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">Questions that move with your thinking.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#c6d2b5]">Answer naturally. Your next question changes with your confidence, your gaps, and the perspective the panel needs next.</p><Link to="/interviews/new" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#e8f24c] px-4 py-3 text-sm font-bold text-[#173500]">Build a practice room <ArrowRight size={16} /></Link></div>
        <div id="pricing" className="rounded-2xl border border-[#173500]/15 bg-[#fffef6] p-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#74806c]">Built for confidence</p><h3 className="mt-8 text-3xl font-black leading-tight text-[#173500]">A better rehearsal for a high-stakes room.</h3><ul className="mt-7 space-y-4 text-sm font-semibold text-[#52604a]">{['Interruptible voice conversations', 'Technical and behavioural roles', 'Adaptive follow-up questions'].map((item) => <li key={item} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d9efbf] text-[#315711]"><Check size={14} /></span>{item}</li>)}</ul></div>
      </section>

      <footer className="border-t border-[#173500]/15 px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 text-sm text-[#66745e] sm:flex-row sm:items-center"><span className="font-black text-[#173500]">Skillora</span><span>AI interview practice, made more human.</span></div></footer>
    </div>
  );
}
