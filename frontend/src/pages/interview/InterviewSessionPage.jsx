import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Mic, MicOff, Loader2, BrainCircuit,
  Phone, Radio, ShieldCheck, Award, ArrowRight, CheckCircle2, ChevronRight
} from 'lucide-react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { interviewAPI, sessionAPI, agoraAPI } from '@/services/api';
import toast from 'react-hot-toast';

export default function InterviewSessionPage() {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Active question index
  const [currentIdx, setCurrentIdx] = useState(0);

  // Spoken answers dictionary: { [questionId]: "answer text" }
  const [savedAnswers, setSavedAnswers] = useState({});

  // Live spoken words for the CURRENT question being answered
  const [spokenTranscript, setSpokenTranscript] = useState('');

  // Agora Conversational AI Agent State
  const clientRef = useRef(null);
  const trackRef = useRef(null);
  const recognitionRef = useRef(null);

  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // Elapsed interview timer
  useEffect(() => {
    let timer;
    if (isVoiceActive) {
      timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isVoiceActive]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Load interview and session
  useEffect(() => {
    const init = async () => {
      try {
        const { data: intData } = await interviewAPI.getById(interviewId);
        setInterview(intData.interview);
        const { data: sessData } = await sessionAPI.start(interviewId);
        setSession(sessData.session);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to start session');
        navigate('/interviews');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [interviewId, navigate]);

  // Continuous speech-to-text to capture candidate's spoken words for the ACTIVE question
  const startSpeechCapture = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (e) => {
        let chunk = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            chunk += ' ' + e.results[i][0].transcript;
          }
        }
        if (chunk.trim()) {
          setSpokenTranscript((prev) => (prev ? prev + ' ' + chunk.trim() : chunk.trim()));
        }
      };

      rec.onerror = (e) => {
        console.warn('[SpeechRec] Error/Info:', e.error);
      };

      rec.onend = () => {
        if (recognitionRef.current && isVoiceActive) {
          try { rec.start(); } catch {}
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.warn('[SpeechRec] Init failed:', err);
    }
  };

  const stopSpeechCapture = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  };

  // Start Agora Voice Session
  const startAgoraVoiceSession = async () => {
    setIsConnectingVoice(true);
    try {
      const { data } = await agoraAPI.start(interviewId);
      const { appId, channelName, token, uid } = data.data;

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          user.audioTrack.play();
          setIsAiSpeaking(true);
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'audio') {
          setIsAiSpeaking(false);
        }
      });

      client.on('user-joined', (user) => {
        console.log('[Agora] Remote user joined channel:', user.uid);
      });

      client.on('user-left', (user) => {
        console.log('[Agora] Remote user left channel:', user.uid);
        setIsAiSpeaking(false);
      });

      await client.join(appId, channelName, token || null, uid);

      const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      trackRef.current = micTrack;
      await client.publish([micTrack]);

      setIsVoiceActive(true);
      startSpeechCapture();
      toast.success('Connected! Agora AI Interviewer is joining...', { icon: '🎙️' });
    } catch (err) {
      console.error('[Agora Connection Error]:', err);
      if (trackRef.current) {
        trackRef.current.stop();
        trackRef.current.close();
        trackRef.current = null;
      }
      if (clientRef.current) {
        try { await clientRef.current.leave(); } catch {}
        clientRef.current = null;
      }
      toast.error(err.response?.data?.message || err.message || 'Failed to connect Agora Voice Agent');
    } finally {
      setIsConnectingVoice(false);
    }
  };

  // Disconnect Agora
  const stopAgoraVoiceSession = async () => {
    stopSpeechCapture();
    try {
      if (trackRef.current) {
        trackRef.current.stop();
        trackRef.current.close();
        trackRef.current = null;
      }
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }
      await agoraAPI.stop(interviewId);
    } catch (err) {
      console.error('[Agora Stop Error]:', err);
    } finally {
      setIsVoiceActive(false);
      setIsAiSpeaking(false);
      setIsMicMuted(false);
    }
  };

  const toggleMuteMic = () => {
    if (trackRef.current) {
      const nextMuted = !isMicMuted;
      trackRef.current.setEnabled(!nextMuted);
      setIsMicMuted(nextMuted);
      toast(nextMuted ? 'Microphone muted' : 'Microphone unmuted', {
        icon: nextMuted ? '🔇' : '🎙️',
      });
    }
  };

  // Save current question's spoken answer and provide ONLY next question to Agora
  const handleSaveAndNext = async (targetIdx = null) => {
    const currentQ = interview?.questions?.[currentIdx];
    if (currentQ) {
      const currentSpoken = spokenTranscript.trim();
      const existing = savedAnswers[currentQ._id] || '';
      const combined = (existing ? existing + ' ' : '') + currentSpoken;
      setSavedAnswers((prev) => ({
        ...prev,
        [currentQ._id]: combined.trim(),
      }));
    }

    // Reset spoken transcript to fresh for the next question
    setSpokenTranscript('');

    const nextIndex = targetIdx !== null ? targetIdx : currentIdx + 1;
    if (nextIndex < (interview?.questions?.length || 0)) {
      setCurrentIdx(nextIndex);
      // Dynamically provide ONLY this next question to Agora
      try {
        await agoraAPI.nextQuestion(interviewId, { questionIndex: nextIndex });
      } catch (err) {
        console.warn('[Agora] Next question update error:', err);
      }
      toast.success(`Question ${currentIdx + 1} saved! Agora presenting Question ${nextIndex + 1}...`, {
        icon: '✅',
      });
    }
  };

  // Conclude session: compile distinct per-question answers and send to Groq for evaluation
  const handleFinishAndEvaluate = async () => {
    setCompleting(true);
    try {
      await stopAgoraVoiceSession();

      // Ensure active question's latest spoken speech is saved
      const currentQ = interview?.questions?.[currentIdx];
      const currentSpoken = spokenTranscript.trim();
      const finalSaved = { ...savedAnswers };
      if (currentQ && currentSpoken) {
        const existing = finalSaved[currentQ._id] || '';
        finalSaved[currentQ._id] = ((existing ? existing + ' ' : '') + currentSpoken).trim();
      }

      // Format distinct per-question answers for Groq
      const answersPayload = (interview?.questions || []).map((q) => {
        const text = (finalSaved[q._id] || '').trim();
        return {
          questionId: q._id,
          questionText: q.questionText,
          answerText: text,
          timeTaken: 0,
          skipped: !text,
        };
      });

      // Send per-question answers to backend for Groq review
      await sessionAPI.complete(session._id, {
        answers: answersPayload,
      });

      toast.success('Interview concluded! Groq analysis is ready.', { icon: '🎉' });
      navigate(`/sessions/${session._id}/results`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete session evaluation');
    } finally {
      setCompleting(false);
    }
  };

  // Safe unmount
  useEffect(() => {
    return () => {
      stopSpeechCapture();
      if (trackRef.current) {
        trackRef.current.stop();
        trackRef.current.close();
        trackRef.current = null;
      }
      if (clientRef.current) {
        try { clientRef.current.leave(); } catch {}
        clientRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <BrainCircuit className="w-12 h-12 text-brand-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Setting up voice interview room...</p>
        </div>
      </div>
    );
  }

  if (!interview || !session) return null;

  const totalQuestions = interview.questions?.length || 0;
  const currentQuestion = interview.questions?.[currentIdx];
  const activeSavedText = savedAnswers[currentQuestion?._id] || '';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-surface-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-white text-xl">{interview.jobTitle}</h2>
            <span className="badge badge-brand text-xs capitalize">{interview.experienceLevel}</span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Agora Voice Interview • Evaluated Question-by-Question by Groq AI
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm bg-surface px-3.5 py-1.5 rounded-xl border border-surface-border">
            <Clock className="w-4 h-4 text-brand-400" />
            <span className="text-white font-mono font-medium">{formatTime(elapsed)}</span>
          </div>
        </div>
      </div>

      {/* Question Stepper Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {interview.questions?.map((q, idx) => {
          const isSaved = !!savedAnswers[q._id];
          const isActive = idx === currentIdx;
          return (
            <button
              key={q._id || idx}
              onClick={() => handleSaveAndNext(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : isSaved
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                  : 'bg-surface text-slate-400 border border-surface-border hover:text-white'
              }`}
            >
              {isSaved ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <span>Q{idx + 1}</span>
              )}
              <span>Question {idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Main Voice Room Stage */}
      <div
        className={`card p-6 text-center transition-all duration-500 border ${
          isVoiceActive
            ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-surface to-surface shadow-2xl shadow-emerald-950/30 ring-1 ring-emerald-500/20'
            : 'border-surface-border bg-gradient-to-b from-brand-950/20 via-surface to-surface'
        }`}
      >
        {/* Animated Voice Visualizer Orb */}
        <div className="relative mx-auto my-4 w-28 h-28 flex items-center justify-center">
          {isVoiceActive ? (
            <>
              <motion.div
                animate={{
                  scale: isAiSpeaking ? [1, 1.25, 1] : [1, 1.08, 1],
                  opacity: isAiSpeaking ? [0.6, 0.2, 0.6] : [0.4, 0.15, 0.4],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl"
              />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                {isAiSpeaking ? (
                  <Radio className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </div>
            </>
          ) : (
            <div className="w-24 h-24 rounded-full bg-surface-border/60 border border-surface-border flex items-center justify-center text-slate-400">
              <Phone className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Dynamic Status Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {isVoiceActive ? (
            <span
              className={`badge py-1 px-3 text-xs flex items-center gap-2 ${
                isAiSpeaking
                  ? 'badge-success shadow-sm shadow-emerald-500/20'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              {isAiSpeaking ? 'AI Interviewer Speaking...' : `Answering Question ${currentIdx + 1}`}
            </span>
          ) : (
            <span className="badge badge-slate text-xs">Voice Session Ready</span>
          )}
        </div>

        {/* Current Active Question Display */}
        {currentQuestion && (
          <div className="mb-5 p-4 rounded-xl bg-surface/90 border border-brand-500/30 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                Target Question {currentIdx + 1} of {totalQuestions}
              </span>
              <span className="badge badge-slate text-[11px] capitalize">
                {currentQuestion.category || 'Technical'}
              </span>
            </div>
            <p className="text-white text-base font-medium leading-relaxed">
              {currentQuestion.questionText}
            </p>
            {currentQuestion.expectedKeywords?.length > 0 && (
              <p className="text-[11px] text-slate-400 pt-1">
                Key concepts: {currentQuestion.expectedKeywords.join(' • ')}
              </p>
            )}
          </div>
        )}

        {/* Live Spoken Words for this Question */}
        {isVoiceActive && (
          <div className="mb-6 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Your Spoken Words for Question {currentIdx + 1}:
              </span>
              <span className="text-[11px] text-slate-400">
                {[activeSavedText, spokenTranscript].filter(Boolean).join(' ').split(/\s+/).filter(Boolean).length} words
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface/80 border border-surface-border text-slate-200 text-sm min-h-[75px] max-h-36 overflow-y-auto leading-relaxed">
              {activeSavedText && (
                <span className="text-emerald-300 font-medium">
                  {activeSavedText}{' '}
                </span>
              )}
              {spokenTranscript ? (
                <span className="text-white">{spokenTranscript}</span>
              ) : !activeSavedText ? (
                <span className="text-slate-500 italic">
                  Speak into your microphone now to answer Question {currentIdx + 1}. When finished, click "Next Question" to save your answer and move to the next question with a fresh transcript...
                </span>
              ) : null}
            </div>
          </div>
        )}

        {/* Controls and Transitions */}
        {!isVoiceActive ? (
          <button
            onClick={startAgoraVoiceSession}
            disabled={isConnectingVoice}
            className="btn-primary text-base py-3 px-8 mx-auto shadow-xl shadow-brand-500/20"
          >
            {isConnectingVoice ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Connecting to Agora...
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" /> Start Voice Interview
              </>
            )}
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={toggleMuteMic}
              className={`btn-secondary text-xs px-4 py-2 ${
                isMicMuted ? 'bg-red-500/20 text-red-400 border-red-500/30' : ''
              }`}
            >
              {isMicMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
              {isMicMuted ? 'Unmute' : 'Mute'}
            </button>

            {currentIdx < totalQuestions - 1 ? (
              <button
                onClick={() => handleSaveAndNext()}
                className="btn-primary text-sm px-6 py-2.5 shadow-lg shadow-brand-500/25 flex items-center gap-2"
              >
                <span>Save Answer & Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}

            <button
              onClick={handleFinishAndEvaluate}
              disabled={completing}
              className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-sm px-6 py-2.5 shadow-lg shadow-emerald-900/30 flex items-center gap-2"
            >
              {completing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Groq Evaluating Answers...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" /> Finish & Submit for Groq Review
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Target Questions Overview & Saved Answers Review */}
      <div className="card p-6 border-surface-border">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          Questions in this Interview ({totalQuestions})
        </h3>
        <div className="space-y-2.5">
          {interview.questions?.map((q, idx) => {
            const isSaved = !!savedAnswers[q._id];
            const isActive = idx === currentIdx;
            return (
              <div
                key={q._id || idx}
                onClick={() => handleSaveAndNext(idx)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isActive
                    ? 'border-brand-500/60 bg-brand-950/20 ring-1 ring-brand-500/30'
                    : isSaved
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : 'border-surface-border bg-surface/50 hover:bg-surface'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSaved
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : isActive
                        ? 'bg-brand-500 text-white'
                        : 'bg-surface-border text-slate-400'
                    }`}
                  >
                    {isSaved ? '✓' : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200 leading-snug">{q.questionText}</p>
                    {isSaved && (
                      <p className="text-xs text-emerald-400 mt-1 line-clamp-1 italic">
                        Answer saved: "{savedAnswers[q._id]}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isActive ? (
                    <span className="badge badge-brand text-[10px]">Active</span>
                  ) : isSaved ? (
                    <span className="badge badge-success text-[10px]">Saved</span>
                  ) : (
                    <span className="badge badge-slate text-[10px]">Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
