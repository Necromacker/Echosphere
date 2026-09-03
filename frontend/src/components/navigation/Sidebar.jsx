import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  BrainCircuit, LayoutDashboard, MessageSquarePlus,
  ClipboardList, FileText, X
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard,   label: 'Dashboard' },
  { to: '/interviews',  icon: ClipboardList,      label: 'Interviews' },
  { to: '/interviews/new', icon: MessageSquarePlus, label: 'New Interview' },
  { to: '/resumes',     icon: FileText,            label: 'Resume' },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-full skillora-sidebar skillora-floating-panel">
        <SidebarContent horizontal />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-4 top-4 z-30 h-[calc(100%-2rem)] w-72 skillora-sidebar skillora-floating-panel flex flex-col lg:hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent onNavClick={onClose} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({ onNavClick, horizontal = false }) {
  return (
    <div className={horizontal ? 'flex w-full items-center gap-6 px-5' : 'flex h-full flex-col'}>
      {/* Logo */}
      <div className={horizontal ? 'flex shrink-0 items-center gap-3 py-3' : 'flex items-center gap-3 border-b border-black/10 px-6 py-6'}>
        <div className="skillora-mark">
          <BrainCircuit className="w-5 h-5 text-[#173500]" />
        </div>
        <span className="font-display font-bold text-lg text-[#173500]">Skillora</span>
      </div>

      {/* Nav */}
      <nav className={horizontal ? 'flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto py-2' : 'flex flex-1 space-y-1 overflow-y-auto px-4 py-6'}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              clsx(
                horizontal
                  ? 'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150'
                  : 'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#e8f24c] text-[#173500] border border-[#173500]/10'
                  : 'text-[#52604a] hover:text-[#173500] hover:bg-black/5'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx('w-5 h-5', isActive ? 'text-[#173500]' : '')} />
                <span className="flex-1">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  );
}
