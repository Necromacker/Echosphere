import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, SkipForward, CheckCircle,
  Clock, Mic, MicOff, Send, Loader2, AlertCircle, BrainCircuit, Volume2, VolumeX, MessageSquare,
  Phone, PhoneOff, Radio, Sparkles
} from 'lucide-react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { interviewAPI, sessionAPI, agoraAPI } from '@/services/api';
import toast from 'react-hot-toast';

const DIFFICULTY_CLR = { easy: 'badge-success', medium: 'badge-warning', hard: 'badge-danger' };
const CATEGORY_CLR   = { technical: 'badge-brand', behavioral: 'badge-slate', situational: 'badge-warning', hr: 'badge-success', culture_fit: 'badge-danger' };

export default function InterviewSessionPage() {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [session, setSession]     = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [savedAnswers, setSavedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Agora Conversational AI Agent State
  const clientRef = useRef(null);
  const trackRef = useRef(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const startAgoraVoiceSession = async () => {
    setIsConnectingVoice(true);
    try {
      // 1. Tell backend to start Agora Conversational AI Agent & get credentials
      const { data } = await agoraAPI.start(interviewId);
      const { appId, channelName, token, uid } = data.data;

      // 2. Initialize Agora RTC client
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // 3. Set up event listeners for AI agent voice BEFORE joining
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

      // 4. Join RTC channel FIRST (so we're in the room when the agent arrives)
      await client.join(appId, channelName, token || null, uid);
      console.log('[Agora] Candidate joined channel:', channelName, 'with uid:', uid);

      // 5. Create and publish microphone track BEFORE agent starts
      const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      trackRef.current = micTrack;
      setLocalAudioTrack(micTrack);
      await client.publish([micTrack]);
      console.log('[Agora] Candidate microphone published. Waiting for AI agent...');

      setIsVoiceActive(true);
      toast.success('Connected! AI interviewer is joining...', { icon: '🎙️' });
    } catch (err) {
      console.error('[Agora Connection Error]:', err);
      // Clean up in case of failure
      if (trackRef.current) {
        trackRef.current.stop();
        trackRef.current.close();
        trackRef.current = null;
        setLocalAudioTrack(null);
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

  const stopAgoraVoiceSession = async () => {
    try {
      if (trackRef.current) {
        trackRef.current.stop();
        trackRef.current.close();
        trackRef.current = null;
        setLocalAudioTrack(null);
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
      toast('Agora Voice Agent disconnected.', { icon: '🔌' });
    }
  };

  const toggleMuteMic = () => {
    if (trackRef.current) {
      const nextMuted = !isMicMuted;
      trackRef.current.setEnabled(!nextMuted);
      setIsMicMuted(nextMuted);
      toast(nextMuted ? 'Microphone muted' : 'Microphone unmuted', { icon: nextMuted ? '🔇' : '🎙️' });
    }
  };

  // Safe unmount cleanup only
  useEffect(() => {
    return () => {
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

  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let finalText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalText += e.results[i][0].transcript;
          }
        }
        // Only append text from results that are marked as final
        // Interim results are intentionally ignored to prevent word repetition
        if (finalText) {
          setAnswerText((prev) => {
            const trimmedPrev = prev.trimEnd();
            const separator = trimmedPrev.length > 0 ? ' ' : '';
            return trimmedPrev + separator + finalText.trim();
          });
        }
      };
      rec.onerror = (e) => {
        console.error('Speech recognition error', e.error);
        setIsListening(false);
        toast.error('Microphone access denied or failed.');
      };
      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) return toast.error('Voice typing not supported in this browser.');
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      toast.success('Listening... Start speaking now.', { icon: '🎙️' });
    }
  };

  // Stop listening when navigating away from question
  useEffect(() => {
    if (isListening && recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [currentIdx, recognition]);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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

  const currentQuestion = interview?.questions?.[currentIdx];
  const totalQuestions = interview?.questions?.length || 0;
  const progress = totalQuestions ? ((currentIdx + 1) / totalQuestions) * 100 : 0;

  const saveAnswer = useCallback(async (skipped = false) => {
    if (!session || !currentQuestion) return;
    if (!answerText.trim() && !skipped) return;

    setSubmitting(true);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    try {
      await sessionAPI.submitAnswer(session._id, {
        questionId: currentQuestion._id,
        answerText: skipped ? '' : answerText.trim(),
        timeTaken,
        skipped,
      });
      setSavedAnswers((prev) => ({ ...prev, [currentQuestion._id]: { answerText, skipped } }));
      setStartTime(Date.now());
    } catch {
      toast.error('Failed to save answer');
    } finally {
      setSubmitting(false);
    }
  }, [session, currentQuestion, answerText, startTime]);

  const handleNext = async (skip = false) => {
    await saveAnswer(skip);
    setAnswerText(savedAnswers[interview?.questions?.[currentIdx + 1]?._id]?.answerText || '');
    setCurrentIdx((i) => i + 1);
    setElapsed(0);
    setStartTime(Date.now());
  };

  const handlePrev = () => {
    const prev = interview?.questions?.[currentIdx - 1];
    setAnswerText(savedAnswers[prev?._id]?.answerText || '');
    setCurrentIdx((i) => i - 1);
  };

  const handleComplete = async () => {
    if (isVoiceActive) {
      await stopAgoraVoiceSession();
    }
    await saveAnswer(false);
    setCompleting(true);
    try {
      await sessionAPI.complete(session._id);
      toast.success('Session completed! Loading your results...');
      navigate(`/sessions/${session._id}/results`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete session');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <BrainCircuit className="w-12 h-12 text-brand-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading your interview session...</p>
        </div>
      </div>
    );
  }

  if (!interview || !session) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-white">{interview.jobTitle}</h2>
          <p className="text-slate-400 text-sm capitalize">{interview.experienceLevel} level • {totalQuestions} questions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm bg-surface px-3 py-1.5 rounded-lg border border-surface-border">
            <Clock className="w-4 h-4 text-brand-400" />
            <span className="text-white font-mono">{formatTime(elapsed)}</span>
          </div>
          <span className="text-sm text-slate-400">{currentIdx + 1} / {totalQuestions}</span>
        </div>
      </div>

      {/* Agora Conversational AI Agent Voice Panel */}
      <div className={`card p-5 border transition-all duration-300 ${
        isVoiceActive 
          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-500/20' 
          : 'border-brand-500/30 bg-brand-950/20'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl transition-colors ${
              isVoiceActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-500/20 text-brand-400'
            }`}>
              <Radio className={`w-6 h-6 ${isVoiceActive ? 'animate-pulse text-emerald-400' : 'text-brand-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-base flex items-center gap-2">
                  Agora Conversational AI Voice Agent
                  {isVoiceActive && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </h3>
                {isVoiceActive && (
                  <span className="badge badge-success text-[11px] py-0.5">
                    {isAiSpeaking ? 'AI Speaking 🔊' : 'Listening to You 🎙️'}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {isVoiceActive
                  ? 'Real-time conversational voice interview active (Deepgram Nova-3 + GPT-4o-mini + Minimax).'
                  : 'Start real-time two-way voice dialogue with the AI interviewer.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isVoiceActive ? (
              <>
                <button
                  type="button"
                  onClick={toggleMuteMic}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isMicMuted 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                      : 'bg-surface hover:bg-surface-hover text-slate-300 border border-surface-border'
                  }`}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                  {isMicMuted ? 'Unmute' : 'Mute'}
                </button>

                <button
                  type="button"
                  onClick={stopAgoraVoiceSession}
                  className="btn-secondary py-2 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30 gap-1.5"
                >
                  <PhoneOff className="w-4 h-4" />
                  Disconnect Voice
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startAgoraVoiceSession}
                disabled={isConnectingVoice}
                className="btn-primary py-2.5 px-4 text-sm gap-2 w-full sm:w-auto bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 shadow-md shadow-brand-500/20"
              >
                {isConnectingVoice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting to Agora...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    Start Agora Voice Interview
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Active voice waveform animation */}
        {isVoiceActive && (
          <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-1.5 h-5">
              {[40, 75, 50, 90, 60, 100, 45, 80, 55, 70].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isAiSpeaking ? 'bg-emerald-400' : 'bg-brand-400'
                  }`}
                  style={{
                    height: isAiSpeaking ? `${h}%` : '20%',
                    animation: isAiSpeaking ? `pulse 0.8s ease-in-out infinite alternate ${i * 0.08}s` : 'none'
                  }}
                />
              ))}
              <span className="text-xs text-slate-300 ml-2 font-mono">
                {isAiSpeaking ? 'AI is speaking...' : isMicMuted ? 'Mic Muted' : 'Mic Live • Speak naturally'}
              </span>
            </div>

            <span className="text-[11px] text-emerald-400 font-mono">
              Channel: interview_{interviewId.slice(-6)}
            </span>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="progress-bar">
        <motion.div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="card p-7 space-y-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-brand-400 font-bold text-sm">Q{currentIdx + 1}</span>
            <span className={`badge ${DIFFICULTY_CLR[currentQuestion?.difficulty] || 'badge-slate'}`}>
              {currentQuestion?.difficulty}
            </span>
            <span className={`badge ${CATEGORY_CLR[currentQuestion?.category] || 'badge-slate'}`}>
              {currentQuestion?.category?.replace('_', ' ')}
            </span>
            {savedAnswers[currentQuestion?._id] && (
              <span className="badge badge-success"><CheckCircle className="w-3 h-3" /> Saved</span>
            )}
          </div>

          <div>
            <p className="text-white text-lg leading-relaxed font-medium">
              {currentQuestion?.questionText}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="form-label !mb-0 flex items-center gap-2">
                Your Answer
              </label>
              <button 
                type="button" 
                onClick={toggleListening}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-surface hover:bg-surface-hover text-slate-400 border border-surface-border'}`}
              >
                <Mic className="w-3.5 h-3.5" />
                {isListening ? 'Listening...' : 'Voice Input'}
              </button>
            </div>
            <textarea
              className={`form-textarea h-44 transition-colors ${isListening ? 'border-brand-500 ring-1 ring-brand-500/50 bg-brand-500/5' : ''}`}
              placeholder="Type your answer here, or click 'Voice Input' to speak. Be concise yet thorough. For behavioral questions, use the STAR method..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
            />
            <p className="text-slate-500 text-xs mt-1.5">{answerText.length} characters</p>
          </div>

          {/* Keywords hint */}
          {currentQuestion?.expectedKeywords?.length > 0 && (
            <div className="p-3 rounded-lg bg-brand-600/10 border border-brand-500/20">
              <p className="text-xs text-brand-300">
                💡 <strong>Topic hints:</strong> {currentQuestion.expectedKeywords.join(' • ')}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={handlePrev} disabled={currentIdx === 0 || submitting}
          className="btn-secondary disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => handleNext(true)} disabled={submitting}
            className="btn-ghost text-slate-400">
            <SkipForward className="w-4 h-4" /> Skip
          </button>

          {currentIdx < totalQuestions - 1 ? (
            <button onClick={() => handleNext(false)} disabled={submitting || !answerText.trim()}
              className="btn-primary disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Save & Next</>}
            </button>
          ) : (
            <button onClick={handleComplete} disabled={completing}
              className="btn-primary bg-emerald-600 hover:bg-emerald-500">
              {completing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>
                : <><CheckCircle className="w-4 h-4" /> Finish & Get Results</>}
            </button>
          )}
        </div>
      </div>

      {/* Session completion warning */}
      {currentIdx === totalQuestions - 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card p-4 border-amber-500/30 bg-amber-600/10 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-sm">
            This is the last question. After saving, clicking <strong>"Finish & Get Results"</strong> will submit your answers and AI will evaluate your performance.
          </p>
        </motion.div>
      )}
    </div>
  );
}
