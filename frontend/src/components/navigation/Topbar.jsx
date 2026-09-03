import { Menu, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/dashboard': 'AI Interview',
  '/interviews': 'My Interviews',
  '/interviews/new': 'New Interview',
  '/sessions': 'Session History',
  '/resumes': 'My Resumes',
  '/jobs': 'Jobs Portal',
  '/profile': 'Profile',
};

export default function Topbar({ onMenuClick }) {
  const user = { name: 'Guest Candidate' };
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'AI Interview';

  return (
    <header className="skillora-topbar h-16 border-b border-black/10 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-[#52604a] hover:text-[#173500] hover:bg-black/5 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-display font-semibold text-[#173500]">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-[#52604a] hover:text-[#173500] hover:bg-black/5 transition-colors relative">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-surface-border">
          <div className="w-8 h-8 rounded-full bg-[#e8f24c] flex items-center justify-center text-[#173500] font-bold text-xs">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-[#52604a] font-medium hidden sm:block">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
