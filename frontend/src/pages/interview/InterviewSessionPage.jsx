import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Check, ClipboardList } from 'lucide-react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { agoraAPI, interviewAPI, sessionAPI } from '@/services/api';
import toast from 'react-hot-toast';

export default function InterviewSessionPage() {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [session, setSession] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [savedAnswers, setSavedAnswers] = useState({});
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const speechRecognitionRef = useRef(null);
  const agoraClientRef = useRef(null);
  const microphoneTrackRef = useRef(null);
  const agoraStartedRef = useRef(false);
  
  useEffect(() => {
    const startSession = async () => {
      try {
        const { data: interviewData } = await interviewAPI.getById(interviewId);
        setInterview(interviewData.interview);
        const { data: sessionData } = await sessionAPI.start(interviewId);
        setSession(sessionData.session);
        const existingAnswers = Object.fromEntries(
          (sessionData.session.answers || []).map((answer) => [answer.questionId, answer.answerText || ''])
        );
        setAnswers(existingAnswers);
        setSavedAnswers(existingAnswers);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to start session');
        navigate('/interviews');
      } finally {
        setLoading(false);
      }
    };
    startSession();
  }, [interviewId, navigate]);

  const currentQuestion = interview?.questions?.[currentIdx];
  const totalQuestions = interview?.questions?.length || 0;
  const currentAnswer = answers[currentQuestion?._id] || '';

  const stopSpeechCapture = () => {
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
  };

  const startSpeechCapture = (questionId) => {
    if (speechRecognitionRef.current || !questionId) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();

      if (transcript) {
        setAnswers((previous) => ({
          ...previous,
          [questionId]: `${previous[questionId] || ''}${previous[questionId] ? ' ' : ''}${transcript}`,
        }));
      }
    };
    recognition.onend = () => {
      if (speechRecognitionRef.current === recognition) {
        try { recognition.start(); } catch { /* The browser is already restarting recognition. */ }
      }
    };
    recognition.onerror = () => {
      speechRecognitionRef.current = null;
    };

    speechRecognitionRef.current = recognition;
    try { recognition.start(); } catch { speechRecognitionRef.current = null; }
  };

  const startAgoraConversation = async () => {
    if (agoraStartedRef.current) return;
    agoraStartedRef.current = true;

    try {
      const { data } = await agoraAPI.start(interviewId);
      const { appId, channelName, token, uid } = data.data;
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      agoraClientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          user.audioTrack.play();
        }
      });

      await client.join(appId, channelName, token || null, uid);
      const microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack();
      microphoneTrackRef.current = microphoneTrack;
      await client.publish([microphoneTrack]);
      startSpeechCapture(currentQuestion?._id);
    } catch (err) {
      agoraStartedRef.current = false;
      microphoneTrackRef.current?.stop();
      microphoneTrackRef.current?.close();
      microphoneTrackRef.current = null;
      if (agoraClientRef.current) {
        try { await agoraClientRef.current.leave(); } catch { /* No active Agora client to leave. */ }
        agoraClientRef.current = null;
      }
      toast.error(err.response?.data?.message || 'Unable to start the AI interviewer.');
    }
  };

  const stopAgoraConversation = async () => {
    microphoneTrackRef.current?.stop();
    microphoneTrackRef.current?.close();
    microphoneTrackRef.current = null;
    if (agoraClientRef.current) {
      try { await agoraClientRef.current.leave(); } catch { /* The client may already have left. */ }
      agoraClientRef.current = null;
    }
    if (agoraStartedRef.current) {
      try { await agoraAPI.stop(interviewId); } catch { /* Finishing the interview should not be blocked. */ }
      agoraStartedRef.current = false;
    }
  };

  useEffect(() => {
    if (session && currentQuestion) startAgoraConversation();
  }, [session, currentQuestion]);

  useEffect(() => {
    if (agoraStartedRef.current && currentQuestion && !isMicMuted) {
      startSpeechCapture(currentQuestion._id);
    }
  }, [currentQuestion, isMicMuted]);

  const goToNextQuestion = async () => {
    if (!currentQuestion || !session || isGeneratingNext) return;
    const answerText = currentAnswer.trim();
    setIsGeneratingNext(true);
    try {
      const { data } = await sessionAPI.nextQuestion(session._id, {
        questionId: currentQuestion._id,
        answerText,
        timeTaken: 0,
        skipped: !answerText,
        forceNewQuestion: waitingForNextQuestion,
      });
      setSession(data.session);
      setSavedAnswers((previous) => ({ ...previous, [currentQuestion._id]: answerText }));
      if (!data.question) {
        setWaitingForNextQuestion(Boolean(data.waitingForNextQuestion));
        toast.success(data.agentMessage || 'All questions are complete. Finish the interview when ready.');
        return;
      }

      setWaitingForNextQuestion(false);
      setInterview((previous) => ({
        ...previous,
        questions: [...(previous.questions || []), data.question],
      }));
      stopSpeechCapture();
      setCurrentIdx(data.questionIndex);
      await agoraAPI.nextQuestion(interviewId, { questionIndex: data.questionIndex });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load the next question');
    } finally {
      setIsGeneratingNext(false);
    }
  };

  const toggleMute = async () => {
    if (!microphoneTrackRef.current) {
      toast.error('The interview microphone is not ready yet.');
      return;
    }
    const nextMuted = !isMicMuted;
    await microphoneTrackRef.current.setEnabled(!nextMuted);
    setIsMicMuted(nextMuted);
    if (nextMuted) stopSpeechCapture();
    else startSpeechCapture(currentQuestion._id);
  };

  const finishInterview = async () => {
    if (!session || completing) return;
    setCompleting(true);
    try {
      await stopAgoraConversation();
      const answersPayload = (interview.questions || []).map((question) => {
        const answerText = (answers[question._id] || '').trim();
        return {
          questionId: question._id,
          questionText: question.questionText,
          answerText,
          timeTaken: 0,
          skipped: !answerText,
        };
      });
      await sessionAPI.complete(session._id, { answers: answersPayload });
      toast.success('Interview submitted for review');
      navigate(`/sessions/${session._id}/results`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to finish interview');
    } finally {
      setCompleting(false);
    }
  };

  useEffect(() => () => {
    stopSpeechCapture();
    stopAgoraConversation();
  }, []);

  if (loading) {
    return <div className="skillora-page flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#173500]" /></div>;
  }
  if (!interview || !session || !currentQuestion) return null;

  return (
    <div className="skillora-page mx-auto max-w-6xl animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-white">{interview.jobTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">Answer each question, save your response, then finish the interview for review.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="card h-fit p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-white">
            <ClipboardList className="h-5 w-5 text-[#173500]" />
            Questions in this Interview ({totalQuestions})
          </h3>
          <div className="space-y-2">
            {interview.questions.map((question, index) => {
              const isActive = index === currentIdx;
              const isSaved = Object.prototype.hasOwnProperty.call(savedAnswers, question._id);
              return (
                <button
                  key={question._id || index}
                  type="button"
                  onClick={() => {
                    stopSpeechCapture();
                    setCurrentIdx(index);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    isActive
                      ? 'border-[#173500] bg-[#e8f24c]/25'
                      : isSaved
                        ? 'border-[#a9ce85] bg-[#d9efbf]/35 hover:border-[#173500]/45'
                        : 'border-[#173500]/15 bg-[#fffef6] hover:border-[#173500]/45'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSaved ? 'bg-[#d9efbf] text-[#315711]' : isActive ? 'bg-[#173500] text-[#e8f24c]' : 'bg-[#e7eadc] text-[#66745e]'
                    }`}>
                      {isSaved ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="min-w-0 truncate text-sm font-medium text-[#173500]">Question {index + 1}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="card p-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#315711]">Question {currentIdx + 1} of {totalQuestions}</span>
              <span className="rounded-full bg-[#e7eadc] px-2.5 py-1 text-xs font-medium capitalize text-[#52604a]">{currentQuestion.category || 'Technical'}</span>
            </div>
            <p className="text-base font-medium leading-relaxed text-[#173500]">{currentQuestion.questionText}</p>
          </div>

          <div className="card p-6">
            <label htmlFor="spoken-words" className="mb-3 block font-display text-base font-bold text-white">Your Spoken Words</label>
            <textarea
              id="spoken-words"
              value={currentAnswer}
              onChange={(event) => setAnswers((previous) => ({ ...previous, [currentQuestion._id]: event.target.value }))}
              className="form-textarea h-44 w-full"
              placeholder="Type the answer you would say in the interview..."
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={goToNextQuestion} disabled={isGeneratingNext} className="btn-secondary">
              {isGeneratingNext ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</> : 'Next Question'}
            </button>
            <button type="button" onClick={toggleMute} className="btn-secondary">
              {isMicMuted ? 'Unmute' : 'Mute'}
            </button>
            <button type="button" onClick={finishInterview} disabled={completing} className="btn-primary">
              {completing ? <><Loader2 className="h-4 w-4 animate-spin" /> Finishing...</> : 'Finish Interview'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
