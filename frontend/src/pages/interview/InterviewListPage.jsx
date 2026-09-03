import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Briefcase, Clock, Trash2, RotateCcw, BarChart3, Search } from 'lucide-react';
import { interviewAPI } from '@/services/api';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  draft:       { label: 'Draft',       cls: 'badge-slate'   },
  ready:       { label: 'Ready',       cls: 'badge-brand'   },
  in_progress: { label: 'In Progress', cls: 'badge-warning' },
  completed:   { label: 'Completed',   cls: 'badge-success' },
};

const GEN_MAP = {
  pending:    { label: 'Pending',    cls: 'badge-slate'   },
  generating: { label: 'Generating', cls: 'badge-warning' },
  generated:  { label: 'Generated',  cls: 'badge-success' },
  failed:     { label: 'Failed',     cls: 'badge-danger'  },
};

export default function InterviewListPage() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    interviewAPI.getAll()
      .then(({ data }) => setInterviews(data.interviews || []))
      .catch(() => toast.error('Failed to load interviews'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this interview?')) return;
    setDeleting(id);
    try {
      await interviewAPI.delete(id);
      setInterviews((prev) => prev.filter((i) => i._id !== id));
      toast.success('Interview deleted');
    } catch {
      toast.error('Failed to delete interview');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = interviews.filter(
    (i) =>
      i.jobTitle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="skillora-page space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 skillora-muted" />
          <input type="text" placeholder="Search interviews..." className="form-input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Link to="/interviews/new" className="btn-primary flex-shrink-0"><Plus className="w-4 h-4" /> New Interview</Link>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-surface-border rounded w-1/3 mb-3" />
              <div className="h-3 bg-surface-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Briefcase className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {search ? 'No results found' : 'No interviews yet'}
          </h3>
          <p className="text-slate-500 mb-6">
            {search ? 'Try a different search term' : 'Create your first AI-powered mock interview'}
          </p>
          {!search && (
            <Link to="/interviews/new" className="btn-primary inline-flex">
              <Plus className="w-4 h-4" /> Create Interview
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((interview, idx) => {
            const statusInfo = STATUS_MAP[interview.status] || STATUS_MAP.draft;
            const genInfo = GEN_MAP[interview.generationStatus] || GEN_MAP.pending;
            const completedSession = interview.lastCompletedSession;

            return (
              <motion.div
                key={interview._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card p-6 hover:border-brand-500/40 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-brand-600/20 rounded-xl flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-brand-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{interview.jobTitle}</h3>
                        <span className={statusInfo.cls}>{statusInfo.label}</span>
                        <span className={genInfo.cls}>{genInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="capitalize">{interview.experienceLevel} level</span>
                        <span>•</span>
                        <span>{interview.numberOfQuestions} questions</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {completedSession ? (
                      <Link
                        to={`/sessions/${completedSession._id}/results`}
                        className="btn-primary px-4 py-2"
                      >
                        <BarChart3 className="w-4 h-4" /> View Score · {completedSession.overallScore ?? 0}%
                      </Link>
                    ) : (
                      <span className="rounded-xl border border-[#173500]/15 bg-[#f2f4e6] px-4 py-2 text-sm font-semibold text-[#66745e]">
                        Score pending
                      </span>
                    )}
                    <Link
                      to={`/interviews/${interview._id}/session`}
                      aria-label={`Retry ${interview.jobTitle} interview`}
                      title="Retry interview"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#173500]/25 bg-[#fffef6] text-[#173500] transition-colors hover:bg-[#e8f24c]"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(interview._id)}
                      disabled={deleting === interview._id}
                      aria-label={`Delete ${interview.jobTitle} interview`}
                      title="Delete interview"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d95d48]/35 bg-[#fffef6] text-[#d95d48] transition-colors hover:bg-[#fbe5df] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
