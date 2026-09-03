import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, TrendingUp, ThumbsUp, Target, Lightbulb,
  BookOpen, ChevronDown, ChevronUp, CheckCircle,
  RotateCcw, ArrowLeft
} from 'lucide-react';
import { sessionAPI } from '@/services/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';

export default function SessionResultPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedAnswer, setExpandedAnswer] = useState(null);

  useEffect(() => {
    sessionAPI.getById(id)
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) return <p className="text-slate-400 text-center mt-20">Session not found.</p>;

  const score = session.overallScore ?? 0;
  const scoreColor = score >= 70 ? '#5f9b3d' : score >= 40 ? '#d8a70a' : '#d95d48';
  const scoreLabel = score >= 70 ? 'Excellent' : score >= 40 ? 'Good' : 'Needs Work';

  const barData = session.answers.map((a, i) => ({
    name: `Q${i + 1}`,
    score: a.aiScore ?? 0,
  }));

  return (
    <div className="skillora-page max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <Link to="/sessions" className="btn-ghost inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back to History
      </Link>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Score Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-8 text-center"
        >
          <div className="mb-4 inline-flex h-24 w-24 items-center justify-center rounded-full border-4"
            style={{ borderColor: scoreColor, boxShadow: `0 0 24px ${scoreColor}26` }}>
            <span className="font-display text-3xl font-bold" style={{ color: scoreColor }}>{score}%</span>
          </div>
          <h2 className="mb-1 font-display text-2xl font-bold text-white">{scoreLabel}!</h2>
          <p className="mb-5 text-slate-400">{session.interviewId?.jobTitle} • {session.answers.length} questions answered</p>

          {session.overallFeedback && (
            <p className="rounded-xl border border-[#173500]/10 bg-[#f2f4e6] p-4 text-sm leading-relaxed text-slate-300">
              {session.overallFeedback}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <Link to="/interviews/new" className="btn-primary">
              <RotateCcw className="w-4 h-4" /> Practice Again
            </Link>
            <Link to="/dashboard" className="btn-secondary">Dashboard</Link>
          </div>
        </motion.div>

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <TrendingUp className="h-5 w-5 text-[#315711]" /> Score Per Question
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} barSize={28} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#66745e', fontSize: 11 }} axisLine={{ stroke: '#d8ddca' }} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#66745e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fffef6', border: '1px solid #cbd5b9', borderRadius: '12px', color: '#173500' }}
                labelStyle={{ color: '#173500' }}
                itemStyle={{ color: '#315711' }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 7 ? '#5f9b3d' : entry.score >= 4 ? '#d8a70a' : '#d95d48'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-[#5f9b3d]" /> Strengths
          </h3>
          {session.strengths?.length ? (
            <ul className="space-y-2">
              {session.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-[#5f9b3d] mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          ) : <p className="text-slate-500 text-sm">No specific strengths noted.</p>}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#d8a70a]" /> Areas to Improve
          </h3>
          {session.areasForImprovement?.length ? (
            <ul className="space-y-2">
              {session.areasForImprovement.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <Lightbulb className="w-4 h-4 text-[#d8a70a] mt-0.5 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          ) : <p className="text-slate-500 text-sm">Keep practicing!</p>}
        </div>
      </div>

      {/* Recommended Resources */}
      {session.recommendedResources?.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#315711]" /> Recommended Resources
          </h3>
          <ul className="space-y-2">
            {session.recommendedResources.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="w-6 h-6 rounded-full bg-[#e8f24c] text-[#173500] flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Answers */}
      <div className="card p-6">
        <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#d8a70a]" /> Question-by-Question Review
        </h3>
        <div className="space-y-3">
          {session.answers.map((answer, i) => {
            const isExpanded = expandedAnswer === i;
            const score = answer.aiScore ?? 0;
            const color = score >= 7 ? 'text-[#5f9b3d]' : score >= 4 ? 'text-[#d8a70a]' : 'text-[#d95d48]';

            return (
              <div key={i} className="overflow-hidden rounded-xl border border-[#173500]/15 bg-[#fffef6]">
                <button
                  onClick={() => setExpandedAnswer(isExpanded ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-[#f2f4e6]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-[#e8f24c] text-[#173500] flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <p className="text-sm text-white truncate">{answer.questionText}</p>
                    {answer.skipped && <span className="badge-warning badge flex-shrink-0">Skipped</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className={`text-sm font-bold ${color}`}>{score}/10</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 border-t border-[#173500]/15 bg-[#f7f5e9] p-4"
                  >
                    {answer.answerText && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Your Answer</p>
                        <p className="text-slate-300 text-sm leading-relaxed">{answer.answerText}</p>
                      </div>
                    )}
                    {answer.aiFeedback && (
                      <div className="rounded-lg border border-[#a9ce85] bg-[#e8f24c]/20 p-3">
                        <p className="mb-1 text-xs uppercase tracking-wide text-[#315711]">AI Feedback</p>
                        <p className="text-sm leading-relaxed text-slate-300">{answer.aiFeedback}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
