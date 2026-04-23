import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged,
  User,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  Triangle, 
  Square, 
  Circle, 
  Star, 
  Users, 
  Trophy, 
  Check, 
  X, 
  ArrowRight, 
  Plus, 
  Trash2,
  LogOut
} from 'lucide-react';
import { auth, db, handleFirestoreError, testConnection, googleProvider } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

const appId = 'kahoot-clone-app';
const ROOMS_PATH = `artifacts/${appId}/public/data/quiz_rooms`;

// Option Styles
const OPTION_STYLES = [
  { color: 'bg-red-600', hover: 'hover:bg-red-700', icon: Triangle },
  { color: 'bg-blue-600', hover: 'hover:bg-blue-700', icon: Square },
  { color: 'bg-yellow-500', hover: 'hover:bg-yellow-600', icon: Circle },
  { color: 'bg-green-600', hover: 'hover:bg-green-700', icon: Star },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // App State: 'home', 'host_setup', 'hosting', 'playing'
  const [appMode, setAppMode] = useState<'home' | 'host_setup' | 'hosting' | 'playing'>('home');
  const [roomData, setRoomData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [roomPin, setRoomPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  
  const [quizForm, setQuizForm] = useState([
    { question: 'Apa ibu kota Indonesia?', options: ['Bandung', 'Surabaya', 'Jakarta', 'Medan'], correct: 2, timeLimit: 20 },
    { question: 'Berapa hasil dari 5 + 7 x 2?', options: ['24', '19', '17', '14'], correct: 1, timeLimit: 30 },
    { question: 'Planet manakah yang dijuluki Planet Merah?', options: ['Venus', 'Mars', 'Jupiter', 'Saturnus'], correct: 1, timeLimit: 20 },
  ]);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("Gagal masuk dengan Google.");
    }
  };

  // Room Listener
  useEffect(() => {
    if (!user || !roomPin || appMode === 'home' || appMode === 'host_setup') return;

    const roomRef = doc(db, ROOMS_PATH, roomPin);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomData(snapshot.data());
      } else {
        setErrorMsg('Ruangan tidak ditemukan atau telah ditutup.');
        setAppMode('home');
        setRoomData(null);
      }
    }, (err) => {
      console.error("Room listener error:", err);
    });

    const participantsRef = collection(db, ROOMS_PATH, roomPin, 'participants');
    const unsubParticipants = onSnapshot(participantsRef, (snapshot) => {
      const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setParticipants(players);
    }, (err) => {
      console.error("Participants listener error:", err);
    });

    return () => {
      unsubRoom();
      unsubParticipants();
    };
  }, [user, roomPin, appMode]);

  const handleCreateRoom = async () => {
    if (!user) return;
    
    // Validation
    for (const q of quizForm) {
      if (!q.question || q.options.some(o => !o)) {
        alert("Mohon isi semua pertanyaan dan pilihan jawaban!");
        return;
      }
    }

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const roomRef = doc(db, ROOMS_PATH, pin);
    
    try {
      await setDoc(roomRef, {
        pin: pin,
        hostId: user.uid,
        status: 'lobby',
        currentQ: 0,
        startedAt: null,
        quiz: quizForm
      });
      setRoomPin(pin);
      setAppMode('hosting');
    } catch (err: any) {
      handleFirestoreError(err, 'create', ROOMS_PATH);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !roomPin || !playerName) return;

    if (roomData?.status !== 'lobby') {
      setErrorMsg("Kuis sudah dimulai atau sudah selesai.");
      return;
    }

    const participantRef = doc(db, ROOMS_PATH, roomPin, 'participants', user.uid);
    
    try {
      await setDoc(participantRef, {
        name: playerName,
        score: 0,
        answers: {}
      });
      setAppMode('playing');
    } catch (err: any) {
      console.error("Join error:", err);
      setErrorMsg("Gagal bergabung. Pastikan PIN benar.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-700 text-white">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-3xl font-black italic tracking-tighter"
        >
          KUISKU...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col text-gray-900 border-none overflow-x-hidden">
      <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10 shrink-0">
        <div className="text-2xl font-black tracking-tighter text-purple-700 flex items-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-500 fill-current" />
          KUISKU
        </div>
        {appMode !== 'home' && (
          <button 
            onClick={() => {
              setAppMode('home');
              setRoomData(null);
              setRoomPin('');
            }}
            className="flex items-center gap-1 text-gray-500 hover:text-red-500 font-bold text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        )}
      </header>

      {errorMsg && (
        <div className="bg-red-600 text-white p-3 text-center font-bold relative z-20">
          {errorMsg}
          <button onClick={() => setErrorMsg('')} className="absolute right-4 top-3 opacity-80 hover:opacity-100">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col relative overflow-y-auto">
        <AnimatePresence mode="wait">
          {appMode === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 w-full"
            >
              <HomeView 
                roomPin={roomPin} setRoomPin={setRoomPin}
                playerName={playerName} setPlayerName={setPlayerName}
                onJoin={handleJoinRoom}
                onCreateClick={() => setAppMode('host_setup')}
                user={user}
                onLogin={handleGoogleLogin}
              />
            </motion.div>
          )}

          {appMode === 'host_setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 w-full"
            >
              <HostSetupView 
                quizForm={quizForm} 
                setQuizForm={setQuizForm} 
                onCreateRoom={handleCreateRoom}
                onCancel={() => setAppMode('home')}
              />
            </motion.div>
          )}

          {appMode === 'hosting' && roomData && (
            <motion.div key="hosting" className="flex-1 w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <HostGameView roomData={roomData} participants={participants} roomPin={roomPin} />
            </motion.div>
          )}

          {appMode === 'playing' && roomData && (
            <motion.div key="playing" className="flex-1 w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PlayerGameView roomData={roomData} user={user!} participants={participants} roomPin={roomPin} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Views & Components (Sub-components of App) ---

function HomeView({ roomPin, setRoomPin, playerName, setPlayerName, onJoin, onCreateClick, user, onLogin }: any) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-purple-700 p-6 min-h-[calc(100vh-4rem)]">
      <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 w-full max-w-md text-center border-b-8 border-gray-200">
        <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tight italic">KUISKU!</h1>
        <p className="text-purple-600 font-bold mb-8 uppercase tracking-widest text-xs">Ayo Main Bareng Teman!</p>
        
        {!user ? (
          <div className="flex flex-col gap-4">
            <p className="text-gray-500 font-bold text-sm">Masuk untuk mulai bermain atau membuat kuis.</p>
            <button 
              onClick={onLogin}
              className="w-full bg-white border-4 border-gray-100 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg hover:bg-gray-50 transition-all shadow-[0_4px_0_rgb(229,231,235)] active:shadow-none active:translate-y-1"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
              MASUK DENGAN GOOGLE
            </button>
          </div>
        ) : (
          <form onSubmit={onJoin} className="flex flex-col gap-5 mb-10">
            <input 
              type="text" 
              placeholder="PIN RUANGAN" 
              className="w-full text-center text-3xl font-black p-5 border-4 border-gray-100 rounded-2xl focus:border-purple-400 focus:outline-none transition-all placeholder:text-gray-300"
              value={roomPin}
              onChange={(e) => setRoomPin(e.target.value)}
              required
              maxLength={6}
            />
            <input 
              type="text" 
              placeholder="NAMA KAMU" 
              className="w-full text-center text-2xl font-bold p-5 border-4 border-gray-100 rounded-2xl focus:border-purple-400 focus:outline-none transition-all placeholder:text-gray-300"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
              maxLength={15}
            />
            <button 
              type="submit"
              className="group relative w-full bg-blue-600 text-white font-black text-2xl py-6 rounded-2xl hover:bg-blue-700 transition-all shadow-[0_8px_0_rgb(30,58,138)] active:shadow-none active:translate-y-2"
            >
              MAIN SEKARANG
            </button>
          </form>
        )}

        <div className="border-t border-gray-100 pt-8 mt-2">
          <p className="text-gray-400 mb-2 font-bold text-xs uppercase">Mau jadi pembawa acara?</p>
          <button 
            onClick={user ? onCreateClick : onLogin}
            className="text-purple-600 font-black text-lg hover:text-purple-800 transition-colors underline decoration-4 underline-offset-4"
          >
            BUAT KUIS SENDIRI
          </button>
        </div>
      </div>
    </div>
  );
}

function HostSetupView({ quizForm, setQuizForm, onCreateRoom, onCancel }: any) {
  const addQuestion = () => {
    setQuizForm([...quizForm, { question: '', options: ['', '', '', ''], correct: 0, timeLimit: 20 }]);
  };
  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuiz = [...quizForm];
    (newQuiz as any)[index][field] = value;
    setQuizForm(newQuiz);
  };
  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const newQuiz = [...quizForm];
    newQuiz[qIndex].options[optIndex] = value;
    setQuizForm(newQuiz);
  };
  const removeQuestion = (index: number) => {
    if (quizForm.length <= 1) return;
    setQuizForm(quizForm.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 border-l-8 border-purple-600 pl-4 uppercase tracking-tighter">Rancang Kuis</h2>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-5 py-2 text-gray-600 font-black bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors">BATAL</button>
            <button onClick={onCreateRoom} className="px-6 py-2 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition-all uppercase text-sm">BUAT ROOM!</button>
          </div>
        </header>

        <div className="space-y-8">
          {quizForm.map((q, qIndex) => (
            <motion.div 
              key={qIndex} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border-2 border-gray-100"
            >
              <div className="flex justify-between items-center mb-6">
                <span className="bg-purple-100 text-purple-700 px-4 py-1 rounded-full font-black text-xs uppercase tracking-widest">Pertanyaan {qIndex + 1}</span>
                <button onClick={() => removeQuestion(qIndex)} className="text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <input 
                type="text" 
                placeholder="Mulai ketik pertanyaan hebat Anda..."
                className="w-full text-xl sm:text-2xl p-4 border-b-4 border-gray-100 focus:border-purple-500 outline-none mb-8 font-black placeholder:text-gray-200"
                value={q.question}
                onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className={`flex items-center p-3 rounded-2xl border-4 transition-all ${q.correct === optIndex ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <button 
                      onClick={() => updateQuestion(qIndex, 'correct', optIndex)}
                      className={`w-6 h-6 rounded-full border-4 mr-3 transition-all ${q.correct === optIndex ? 'bg-green-500 border-green-200' : 'border-gray-200 hover:border-purple-200'}`}
                    />
                    <input 
                      type="text" 
                      placeholder={`Jawaban ${optIndex + 1}`}
                      className="flex-1 bg-transparent outline-none font-bold text-base"
                      value={opt}
                      onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Durasi:</label>
                <div className="flex gap-2">
                  {[10, 20, 30, 60].map(val => (
                    <button
                      key={val}
                      onClick={() => updateQuestion(qIndex, 'timeLimit', val)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${q.timeLimit === val ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {val}s
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}

          <button 
            onClick={addQuestion}
            className="w-full py-6 border-4 border-dashed border-gray-300 text-gray-400 font-black rounded-3xl hover:border-purple-300 hover:text-purple-400 transition-all flex items-center justify-center gap-3 text-lg sm:text-xl"
          >
            <Plus className="w-8 h-8" /> TAMBAH PERTANYAAN
          </button>
        </div>
      </div>
    </div>
  );
}

function HostGameView({ roomData, participants, roomPin }: any) {
  const roomRef = doc(db, ROOMS_PATH, roomPin);
  const currentQIndex = roomData.currentQ;
  const qData = roomData.quiz[currentQIndex];

  const startGameOrNext = async () => {
    let nextStatus = 'question';
    let nextQ = roomData.currentQ;
    if (roomData.status === 'lobby') {
      nextQ = 0;
    } else if (roomData.status === 'leaderboard') {
      if (nextQ + 1 >= roomData.quiz.length) {
        nextStatus = 'podium';
      } else {
        nextQ++;
      }
    }
    await updateDoc(roomRef, {
      status: nextStatus,
      currentQ: nextQ,
      startedAt: Date.now()
    }).catch(err => handleFirestoreError(err, 'update', ROOMS_PATH));
  };
  const showLeaderboard = async () => {
    await updateDoc(roomRef, { status: 'leaderboard' })
      .catch(err => handleFirestoreError(err, 'update', ROOMS_PATH));
  };

  if (roomData.status === 'lobby') {
    return (
      <div className="flex-1 flex flex-col bg-purple-700 p-6 sm:p-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center shadow-2xl mb-8 border-b-8 border-gray-200">
          <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-xs mb-4">GABUNG SEKARANG!</p>
          <div className="text-7xl sm:text-9xl font-black text-gray-900 tracking-tighter mb-4">{roomPin}</div>
          <p className="text-lg sm:text-xl font-bold text-purple-600">Menunggu Teman-teman Masuk...</p>
        </div>
        <div className="flex-1 bg-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm border-2 border-white/10 relative overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="text-xl sm:text-3xl font-black text-white flex items-center gap-3">
              <Users className="w-8 h-8 sm:w-10 sm:h-10" /> {participants.length} PEMAIN
            </div>
            <button 
              onClick={startGameOrNext}
              disabled={participants.length === 0}
              className="bg-green-500 text-white px-8 sm:px-12 py-3 sm:py-5 rounded-2xl font-black text-xl sm:text-3xl shadow-[0_8px_0_rgb(21,128,61)] hover:bg-green-600 active:translate-y-2 active:shadow-none transition-all uppercase disabled:opacity-50"
            >
              MULAI!
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AnimatePresence>
              {participants.map((p: any) => (
                <motion.div 
                  key={p.id}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="bg-white p-4 rounded-xl font-black text-center text-purple-700 shadow-lg truncate border-b-4 border-gray-200 text-sm"
                >
                  {p.name}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }
  if (roomData.status === 'question') {
    const answeredCount = participants.filter((p: any) => p.answers && p.answers[currentQIndex] !== undefined).length;
    return (
      <div className="flex-1 flex flex-col bg-gray-50 p-6 sm:p-8">
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl mb-10 relative text-center border-b-8 border-gray-200">
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 leading-tight">{qData.question}</h2>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-6 py-2 rounded-full font-black text-xs sm:text-lg shadow-lg whitespace-nowrap">
            PERTANYAAN {currentQIndex + 1} / {roomData.quiz.length}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center relative py-10 scale-75 sm:scale-100">
          <HostTimer startedAt={roomData.startedAt} timeLimit={qData.timeLimit} onTimeUp={showLeaderboard} totalAnswered={answeredCount} totalPlayers={participants.length} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-10">
          {qData.options.map((opt: string, idx: number) => {
            const style = OPTION_STYLES[idx];
            const Icon = style.icon;
            return (
              <div key={idx} className={`${style.color} text-white p-6 sm:p-8 rounded-3xl font-black text-xl sm:text-3xl flex items-center gap-4 sm:gap-6 shadow-[0_8px_0_rgba(0,0,0,0.2)]`}>
                <div className="bg-white/20 p-3 sm:p-4 rounded-2xl">
                  <Icon className="w-8 h-8 sm:w-12 sm:h-12 text-white fill-current" />
                </div>
                {opt}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  if (roomData.status === 'leaderboard') {
    const sortedPlayers = [...participants].sort((a, b) => b.score - a.score).slice(0, 5);
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-purple-700 p-6 sm:p-8">
        <h2 className="text-4xl sm:text-6xl font-black text-white mb-12 italic tracking-tighter uppercase whitespace-nowrap">SCOREBOARD</h2>
        <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl w-full max-w-2xl p-6 sm:p-10 mb-12 border-b-[8px] sm:border-b-[12px] border-gray-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-500 via-blue-500 to-green-500" />
          <div className="mb-8 text-center pt-4">
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-3">Jawaban Benar</p>
            <div className={`${OPTION_STYLES[qData.correct].color} text-white px-8 py-3 rounded-2xl font-black text-xl inline-block shadow-lg`}>
              {qData.options[qData.correct]}
            </div>
          </div>
          <div className="space-y-3">
            {sortedPlayers.map((p: any, idx: number) => (
              <motion.div 
                key={p.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex justify-between items-center bg-gray-50 p-4 sm:p-6 rounded-2xl"
              >
                <div className="flex items-center gap-4 sm:gap-6">
                  <span className={`text-2xl sm:text-3xl font-black italic ${idx === 0 ? 'text-yellow-500' : 'text-gray-300'}`}>{idx + 1}</span>
                  <span className="text-lg sm:text-2xl font-black text-gray-900 truncate max-w-[150px] sm:max-w-xs">{p.name}</span>
                </div>
                <span className="text-lg sm:text-2xl font-black text-purple-600">{p.score} <span className="text-[10px] uppercase opacity-60">PTS</span></span>
              </motion.div>
            ))}
          </div>
        </div>
        <button 
          onClick={startGameOrNext}
          className="bg-blue-500 text-white px-12 sm:px-20 py-4 sm:py-6 rounded-3xl font-black text-2xl sm:text-4xl shadow-[0_8px_0_rgb(30,58,138)] hover:bg-blue-600 active:translate-y-2 active:shadow-none transition-all flex items-center gap-4 uppercase"
        >
          {currentQIndex + 1 >= roomData.quiz.length ? 'SELESAI!' : 'LANJUT!'} <ArrowRight className="w-6 h-6 sm:w-10 sm:h-10" />
        </button>
      </div>
    );
  }
  if (roomData.status === 'podium') {
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-indigo-900 p-6 sm:p-8 text-white relative overflow-hidden">
        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring' }}>
          <Trophy className="w-24 h-24 sm:w-32 sm:h-32 text-yellow-400 mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] fill-current" />
        </motion.div>
        <h1 className="text-4xl sm:text-7xl font-black mb-12 sm:mb-20 italic uppercase tracking-tighter">JUARA KUIS!</h1>
        <div className="flex items-end gap-3 sm:gap-6 h-[250px] sm:h-[400px]">
          {sorted[1] && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} className="flex flex-col items-center">
              <div className="text-sm sm:text-2xl font-black mb-2 truncate max-w-[80px] sm:max-w-none">{sorted[1].name}</div>
              <div className="text-[10px] sm:text-lg font-bold text-blue-300 mb-2 sm:mb-4">{sorted[1].score} PTS</div>
              <div className="bg-gray-400 w-20 sm:w-32 h-24 sm:h-48 rounded-t-2xl sm:rounded-t-3xl flex justify-center pt-4 sm:pt-8 text-indigo-900 font-black text-3xl sm:text-6xl shadow-2xl relative">
                2
              </div>
            </motion.div>
          )}
          {sorted[0] && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} className="flex flex-col items-center z-10">
              <div className="text-xl sm:text-4xl font-black mb-2 sm:mb-4 text-yellow-400 drop-shadow-md truncate max-w-[100px] sm:max-w-none">{sorted[0].name}</div>
              <div className="text-xs sm:text-xl font-bold text-yellow-200 mb-3 sm:mb-6">{sorted[0].score} PTS</div>
              <div className="bg-yellow-400 w-24 sm:w-36 h-40 sm:h-72 rounded-t-2xl sm:rounded-t-3xl flex justify-center pt-4 sm:pt-8 text-yellow-900 font-black text-4xl sm:text-7xl shadow-2xl border-x-2 sm:border-x-4 border-yellow-300 relative">
                1
              </div>
            </motion.div>
          )}
          {sorted[2] && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} className="flex flex-col items-center">
              <div className="text-sm sm:text-2xl font-black mb-2 truncate max-w-[80px] sm:max-w-none">{sorted[2].name}</div>
              <div className="text-[10px] sm:text-lg font-bold text-orange-300 mb-2 sm:mb-4">{sorted[2].score} PTS</div>
              <div className="bg-orange-500 w-20 sm:w-32 h-16 sm:h-36 rounded-t-2xl sm:rounded-t-3xl flex justify-center pt-2 sm:pt-8 text-orange-950 font-black text-2xl sm:text-5xl shadow-2xl relative">
                3
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

function HostTimer({ startedAt, timeLimit, onTimeUp, totalAnswered, totalPlayers }: any) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, Math.ceil(timeLimit - elapsed));
      setTimeLeft(remaining);
      if (remaining === 0 || (totalPlayers > 0 && totalAnswered === totalPlayers)) {
        clearInterval(interval);
        setTimeout(onTimeUp, 1000);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt, timeLimit, totalAnswered, totalPlayers, onTimeUp]);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90">
          <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-200" />
          <circle 
            cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="12" fill="transparent" 
            className="text-purple-600 transition-all duration-100"
            strokeDasharray="283%"
            style={{ strokeDashoffset: `${283 * (1 - timeLeft / timeLimit)}%` } as any}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-6xl sm:text-8xl font-black text-gray-900 leading-none">{timeLeft}</span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Detik Lagi</span>
        </div>
      </div>
      <div className="bg-white px-6 py-3 sm:px-8 sm:py-4 rounded-2xl shadow-lg border-b-4 border-gray-100 whitespace-nowrap">
        <span className="text-3xl sm:text-4xl font-black text-purple-700">{totalAnswered}</span>
        <span className="text-sm sm:text-xl font-bold text-gray-400 uppercase tracking-tighter"> JAWABAN MASUK</span>
      </div>
    </div>
  );
}

function PlayerGameView({ roomData, user, participants, roomPin }: any) {
  const me = participants.find((p: any) => p.id === user.uid);
  const qIndex = roomData.currentQ;
  const currentQData = roomData.quiz[qIndex];
  const hasAnswered = me?.answers && me.answers[qIndex] !== undefined;

  const submitAnswer = async (optionIndex: number) => {
    if (hasAnswered || roomData.status !== 'question') return;
    const timeElapsed = (Date.now() - roomData.startedAt) / 1000;
    const isCorrect = optionIndex === currentQData.correct;
    let pointsEarned = 0;
    if (isCorrect) {
      const timeRatio = Math.min(1, timeElapsed / currentQData.timeLimit);
      pointsEarned = Math.round(1000 * (1 - (timeRatio / 2)));
    }
    const participantRef = doc(db, ROOMS_PATH, roomPin, 'participants', user.uid);
    try {
      await updateDoc(participantRef, {
        score: (me.score || 0) + pointsEarned,
        [`answers.${qIndex}`]: {
          option: optionIndex,
          points: pointsEarned,
          correct: isCorrect
        }
      });
    } catch (err: any) {
      handleFirestoreError(err, 'update', `${ROOMS_PATH}/${roomPin}`);
    }
  };

  if (roomData.status === 'lobby') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-green-500 p-10 text-white text-center">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Check className="w-32 h-32 sm:w-40 sm:h-40 mb-8 mx-auto bg-white/20 p-8 rounded-full" />
        </motion.div>
        <h2 className="text-4xl sm:text-5xl font-black mb-6 italic uppercase tracking-tighter">MASUK!</h2>
        <p className="text-xl sm:text-2xl font-bold opacity-80 max-w-xs uppercase leading-relaxed mx-auto italic">Tunggu Host Memulai Kuis Di Depan Ya!</p>
      </div>
    );
  }
  if (roomData.status === 'question') {
    if (hasAnswered) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-purple-600 p-10 text-white text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white/20 p-8 sm:p-10 rounded-[2rem] sm:rounded-[3rem] mb-8">
            <Check className="w-20 h-20 sm:w-32 sm:h-32" />
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4 italic uppercase">SIAP!</h2>
          <p className="text-lg sm:text-xl font-bold opacity-70 italic">Jawaban kamu sudah kami simpan...</p>
        </div>
      );
    }
    return (
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-100">
        {currentQData.options.map((_: any, idx: number) => {
          const style = OPTION_STYLES[idx];
          const Icon = style.icon;
          return (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.9, brightness: 0.8 }}
              onClick={() => submitAnswer(idx)}
              className={`${style.color} rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-[0_8px_0_rgba(0,0,0,0.2)] active:translate-y-2 active:shadow-none transition-all py-10 sm:py-0`}
            >
              <Icon className="w-24 h-24 sm:w-40 sm:h-40 text-white/90 fill-current" />
            </motion.button>
          );
        })}
      </div>
    );
  }
  if (roomData.status === 'leaderboard') {
    const answerData = me?.answers[qIndex];
    const isCorrect = answerData?.correct;
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex(p => p.id === user.uid) + 1;
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-white text-center ${isCorrect ? 'bg-green-500' : 'bg-red-600'}`}>
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} className="mb-6">
          {isCorrect ? (
            <Check className="w-32 h-32 sm:w-48 sm:h-48 bg-white/20 p-8 sm:p-10 rounded-full" />
          ) : (
            <X className="w-32 h-32 sm:w-48 sm:h-48 bg-white/20 p-8 sm:p-10 rounded-full" />
          )}
        </motion.div>
        <h2 className="text-5xl sm:text-7xl font-black mb-4 italic drop-shadow-xl uppercase tracking-tighter">{isCorrect ? 'MANTAP!' : 'WADUH!'}</h2>
        <p className="text-2xl sm:text-4xl font-black mb-10">
          {isCorrect ? `+${answerData?.points || 0} PTS` : 'Oalah, salah sedikit...'}
        </p>
        <div className="bg-black/20 rounded-[2.5rem] p-8 w-full max-w-sm backdrop-blur-xl border border-white/10">
          <div className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em] mb-3">POSISI KAMU</div>
          <div className="text-5xl sm:text-6xl font-black mb-6 italic tracking-tighter">#{myRank}</div>
          <div className="h-0.5 w-full bg-white/10 mb-6" />
          <div className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em] mb-1">TOTAL SKOR</div>
          <div className="text-3xl sm:text-4xl font-black tracking-tighter">{me?.score || 0} <span className="text-base">PTS</span></div>
        </div>
      </div>
    );
  }
  if (roomData.status === 'podium') {
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex(p => p.id === user.uid) + 1;
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-indigo-700 p-8 text-white text-center">
        <Trophy className="w-24 h-24 sm:w-32 sm:h-32 text-yellow-400 mb-8 drop-shadow-lg fill-current" />
        <h2 className="text-2xl sm:text-3xl font-black mb-2 opacity-60 uppercase tracking-widest italic">PERMAINAN SELESAI</h2>
        <h1 className="text-7xl sm:text-8xl font-black mb-10 italic tracking-tighter text-yellow-300">#{myRank}</h1>
        <div className="bg-white/10 px-10 py-5 rounded-2xl backdrop-blur-sm border border-white/10">
          <p className="text-2xl sm:text-3xl font-black">{me?.score || 0} PTS</p>
        </div>
        <div className="mt-16 animate-pulse text-[10px] font-black opacity-50 uppercase tracking-[0.5em]">Tengok Layar Depan!</div>
      </div>
    );
  }
  return null;
}
