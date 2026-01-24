import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Mic, 
  MicOff, 
  StopCircle, 
  MoreVertical, 
  Layout, 
  FileText, 
  Clock, 
  ChevronRight, 
  CheckCircle, 
  Search, 
  Plus, 
  Settings,
  LogOut,
  Sparkles,
  Share,
  X,
  AudioLines,
  Highlighter,
  Download,
  Globe,
  Wand2,
  Loader2,
  BookOpen,
  GraduationCap,
  Briefcase,
  Printer,
  FileType,
  Languages,
  Zap,
  ShieldCheck,
  Trash2,
  Save,
  Pause,
  Play,
  Activity,
  Home,
  User,
  Users,
  UserPlus,
  Upload,
  Key
} from 'lucide-react';
import { toast as sonnerToast } from "sonner"; // Renamed to avoid conflict with shadcn/ui toast
import GeminiApiKeySettings from '@/components/GeminiApiKeySettings'; // Import the new component

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config); // REPLACE WITH YOUR FIREBASE CONFIG
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'meetily-ai'; // REPLACE WITH YOUR APP ID

// --- Gemini API Helper ---
const GEMINI_API_KEY_STORAGE_KEY = "geminiApiKey"; // Define the storage key

const generateGeminiContent = async (prompt: string) => {
  const apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY); // Retrieve from local storage
  if (!apiKey) {
      sonnerToast.error("Gemini API Key is missing. Please add it in the Settings.");
      console.warn("Gemini API Key not found (expected in local storage).");
      return "Gemini API Key is missing. Please add it in the Settings.";
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate content.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating content. Please try again later.";
  }
};

// --- 1. Base Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled = false, loading = false }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    dark: "bg-gray-800 hover:bg-gray-700 text-white"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const AudioVisualizer = ({ isRecording }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    const initAudio = async () => {
      if (!isRecording) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const audioCtx = audioContextRef.current;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048; 
        
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        
        analyserRef.current = analyser;
        sourceRef.current = source;
        
        draw();
      } catch (err) {
        console.error("Error accessing microphone for visualizer:", err);
      }
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !analyserRef.current) return;

      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const bufferLength = analyserRef.current.frequencyBinBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyserRef.current.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgb(15, 23, 42)';
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#818cf8';
      ctx.beginPath();

      const sliceWidth = width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128.0; 
        const sensitivity = 3.0; 
        const y = (v * sensitivity * (height / 2)) + (height / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    if (isRecording) {
      initAudio();
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgb(15, 23, 42)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (sourceRef.current) {
          sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
          sourceRef.current.disconnect();
      }
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (sourceRef.current) {
          try {
            sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
            sourceRef.current.disconnect(); 
          } catch(e) {}
      }
    };
  }, [isRecording]);

  return (
    <canvas 
      ref={canvasRef} 
      width={120} 
      height={40} 
      className="rounded-lg bg-slate-900 border border-slate-700 hidden sm:block" 
    />
  );
};

// --- 2. Navigation & Modal Components ---

const MobileNav = ({ view, setView, onOpenGeminiSettings }) => {
  if (view === 'recording' || view === 'review') return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-around items-center z-50 shadow-lg safe-area-pb">
      <button 
        onClick={() => setView('dashboard')} 
        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${view === 'dashboard' ? 'text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}
      >
        <Home size={24} />
        <span className="text-[10px] font-medium">Home</span>
      </button>
      
      <div className="w-px h-8 bg-gray-100"></div>
      
      <button 
        onClick={() => setView('settings')} 
        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${view === 'settings' ? 'text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}
      >
        <Settings size={24} />
        <span className="text-[10px] font-medium">Settings</span>
      </button>

      <div className="w-px h-8 bg-gray-100"></div>

      <button 
        onClick={onOpenGeminiSettings} 
        className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-gray-400 hover:bg-gray-50"
      >
        <Key size={24} />
        <span className="text-[10px] font-medium">API Key</span>
      </button>
    </div>
  );
};

const MeetingSetupModal = ({ isOpen, onClose, onStart }) => {
    const [title, setTitle] = useState('');
    const [participants, setParticipants] = useState([{ id: 1, name: '', nickname: '' }]);

    useEffect(() => {
        if (isOpen) {
            setTitle(`Meeting on ${new Date().toLocaleDateString()}`);
            setParticipants([{ id: 1, name: '', nickname: '' }]);
        }
    }, [isOpen]);

    const addParticipant = () => {
        setParticipants([...participants, { id: Date.now(), name: '', nickname: '' }]);
    };

    const removeParticipant = (id) => {
        if (participants.length > 1) {
            setParticipants(participants.filter(p => p.id !== id));
        }
    };

    const updateParticipant = (id, field, value) => {
        setParticipants(participants.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleStart = () => {
        const validParticipants = participants.filter(p => p.name.trim() !== '' || p.nickname.trim() !== '');
        const finalParticipants = validParticipants.length > 0 ? validParticipants : [{name: 'User', nickname: 'Speaker'}];
        
        const formattedParticipants = finalParticipants.map(p => ({
            ...p,
            nickname: p.nickname || p.name.split(' ')[0] || 'Speaker'
        }));

        onStart({ title: title || 'Untitled Meeting', participants: formattedParticipants });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-xl text-gray-900">Start New Recording</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Title</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                placeholder="e.g. Q4 Strategy Review"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-medium text-gray-700">Participants</label>
                                <button 
                                    onClick={addParticipant}
                                    className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    <Plus size={14} /> Add Person
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {participants.map((p, index) => (
                                    <div key={p.id} className="flex gap-3 items-start animate-in slide-in-from-left-2 duration-300">
                                        <div className="w-8 h-10 flex items-center justify-center text-gray-400 text-xs font-mono pt-2">
                                            {index + 1}.
                                        </div>
                                        <div className="flex-1 space-y-2 md:space-y-0 md:flex md:gap-2">
                                            <input 
                                                type="text" 
                                                value={p.name}
                                                onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                                                className="w-full md:w-2/3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                                placeholder="Full Name"
                                                autoFocus={index === 0 && participants.length === 1}
                                            />
                                            <input 
                                                type="text" 
                                                value={p.nickname}
                                                onChange={(e) => updateParticipant(p.id, 'nickname', e.target.value)}
                                                className="w-full md:w-1/3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                                placeholder="Nickname"
                                            />
                                        </div>
                                        {participants.length > 1 && (
                                            <button 
                                                onClick={() => removeParticipant(p.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 rounded-lg mt-0.5"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                List the people present. These names are used to attribute speakers in the minutes.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleStart} variant="primary" className="bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto shadow-lg shadow-indigo-200">
                        Start Recording
                    </Button>
                </div>
            </div>
        </div>
    );
};

const Sidebar = ({ view, setView, onOpenGeminiSettings }) => {
  const menuItems = [
    { id: 'dashboard', icon: Layout, label: 'My Recordings' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="hidden md:flex w-20 lg:w-64 bg-gray-50 border-r border-gray-200 h-full flex-col justify-between z-20">
      <div>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
          <span className="font-bold text-xl text-gray-800 hidden lg:block">Meetily</span>
        </div>
        
        <nav className="px-3 mt-6 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                view === item.id 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} />
              <span className="hidden lg:block">{item.label}</span>
            </button>
          ))}
          <button
            onClick={onOpenGeminiSettings}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Key size={20} />
            <span className="hidden lg:block">Gemini API Key</span>
          </button>
        </nav>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
          <LogOut size={20} />
          <span className="hidden lg:block">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

// --- 3. Main Page Components (Defined Before App) ---

const SettingsPage = ({ settings, onUpdate, onOpenGeminiSettings }) => {
    const [tempSettings, setTempSettings] = useState(settings);
    const [isSaved, setIsSaved] = useState(false);
    const [micStatus, setMicStatus] = useState('idle');
    const [newStaffName, setNewStaffName] = useState('');
    const [newStaffNick, setNewStaffNick] = useState('');
    const fileInputRef = useRef(null);

    const handleSave = () => {
        onUpdate(tempSettings);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            try {
                const lines = text.split(/\r\n|\n/);
                const newStaff = [];
                
                let startIndex = 0;
                if (lines.length > 0) {
                    const firstLine = lines[0].toLowerCase();
                    if (firstLine.includes('name') || firstLine.includes('nama')) {
                        startIndex = 1;
                    }
                }

                for (let i = startIndex; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const parts = line.split(',');
                    if (parts.length >= 1) {
                        const name = parts[0].trim().replace(/^"|"$/g, '');
                        let nickname = '';
                        
                        if (parts.length > 1) {
                            nickname = parts[1].trim().replace(/^"|"$/g, '');
                        }
                        
                        if (!nickname && name) {
                            nickname = name.split(' ')[0];
                        }

                        if (name) {
                             newStaff.push({
                                id: Date.now() + Math.random(),
                                name: name,
                                nickname: nickname
                            });
                        }
                    }
                }

                if (newStaff.length > 0) {
                     const currentList = tempSettings.staffList || [];
                     const combined = [...currentList, ...newStaff];
                     
                     if (combined.length > 200) {
                         alert(`Imported ${newStaff.length} staff. Total list exceeds 200 limit. Truncating to 200.`);
                         combined.length = 200;
                     } else {
                         alert(`Successfully imported ${newStaff.length} staff members.`);
                     }
                     
                     setTempSettings({ ...tempSettings, staffList: combined });
                } else {
                    alert("No valid data found in CSV. Format should be: Name, Nickname");
                }

            } catch (err) {
                console.error("CSV Parse Error", err);
                alert("Failed to parse CSV file.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleAddStaff = () => {
        if (!newStaffName.trim()) return;
        const newStaff = {
            id: Date.now(),
            name: newStaffName,
            nickname: newStaffNick || newStaffName.split(' ')[0]
        };
        const currentList = tempSettings.staffList || [];
        
        if (currentList.length >= 200) {
            alert("Maximum 200 staff members allowed.");
            return;
        }

        setTempSettings({ ...tempSettings, staffList: [...currentList, newStaff] });
        setNewStaffName('');
        setNewStaffNick('');
    };

    const handleRemoveStaff = (id) => {
        const currentList = tempSettings.staffList || [];
        setTempSettings({ ...tempSettings, staffList: currentList.filter(s => s.id !== id) });
    };

    const checkMicrophone = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicStatus('allowed');
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            console.error("Mic permission denied:", err);
            setMicStatus('denied');
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-gray-50 p-4 md:p-6 lg:p-10">
            <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">App Settings</h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">Customize configuration & directories.</p>
                </div>
                <div className="flex items-center gap-4">
                    {isSaved && (
                        <span className="text-green-600 flex items-center gap-1 text-sm font-medium animate-in fade-in slide-in-from-left-2">
                            <CheckCircle size={16} /> Saved!
                        </span>
                    )}
                    <Button onClick={handleSave} icon={Save} disabled={JSON.stringify(settings) === JSON.stringify(tempSettings)} className="w-full sm:w-auto">
                        Save Changes
                    </Button>
                </div>
            </header>

            <div className="max-w-4xl space-y-6">
                
                {/* Gemini API Key Settings */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                            <Key size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Gemini AI API Key</h2>
                            <p className="text-gray-500 text-sm">Configure your API key for AI features like minutes generation.</p>
                        </div>
                    </div>
                    <Button onClick={onOpenGeminiSettings} variant="secondary" icon={Key}>
                        Manage API Key
                    </Button>
                </div>

                {/* Staff Directory */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Staff / Assignees Directory</h2>
                            <p className="text-gray-500 text-sm">Add names here to help AI assign tasks correctly during minutes generation (Max 200).</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <UserPlus size={16}/> Add New Staff
                        </h3>
                        <div className="flex flex-col md:flex-row gap-3 mb-4">
                            <input 
                                type="text" 
                                placeholder="Full Name (e.g. Ahmad Albab)" 
                                value={newStaffName}
                                onChange={(e) => setNewStaffName(e.target.value)}
                                className="flex-[2] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                            />
                            <input 
                                type="text" 
                                placeholder="Nickname (e.g. Mad)" 
                                value={newStaffNick}
                                onChange={(e) => setNewStaffNick(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                            />
                            <Button onClick={handleAddStaff} icon={Plus} variant="secondary" className="md:w-auto w-full">Add</Button>
                        </div>

                         {/* CSV Upload Section */}
                        <div className="border-t border-gray-200 pt-3 mt-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Bulk Import</p>
                                    <p className="text-[10px] text-gray-400">CSV Format: Name, Nickname</p>
                                </div>
                                <div>
                                    <input 
                                        type="file" 
                                        accept=".csv" 
                                        ref={fileInputRef} 
                                        onChange={handleFileUpload} 
                                        className="hidden" 
                                    />
                                    <Button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        variant="secondary" 
                                        icon={Upload} 
                                        className="text-xs py-1 h-8"
                                    >
                                        Upload CSV
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Nickname</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(!tempSettings.staffList || tempSettings.staffList.length === 0) && (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-8 text-center text-gray-400 italic">No staff added yet.</td>
                                    </tr>
                                )}
                                {tempSettings.staffList?.map((staff) => (
                                    <tr key={staff.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-900">{staff.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{staff.nickname}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                onClick={() => handleRemoveStaff(staff.id)}
                                                className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="text-right mt-2 text-xs text-gray-400">
                        {tempSettings.staffList?.length || 0} / 200 staff
                    </div>
                </div>

                {/* Transcription Mode Settings */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Default Mode</h2>
                            <p className="text-gray-500 text-sm">Choose how text appears during live recording.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => setTempSettings({...tempSettings, transcriptionMode: 'fast'})}
                            className={`w-full p-4 rounded-lg border-2 text-left flex items-center gap-4 transition-all ${
                                tempSettings.transcriptionMode === 'fast'
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-200'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tempSettings.transcriptionMode === 'fast' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                <Zap size={16} />
                            </div>
                            <div>
                                <h3 className={`font-bold ${tempSettings.transcriptionMode === 'fast' ? 'text-indigo-900' : 'text-gray-900'}`}>Fast (Fluid)</h3>
                                <p className="text-sm text-gray-500">Shows text immediately. Faster but may correct itself.</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setTempSettings({...tempSettings, transcriptionMode: 'accurate'})}
                            className={`w-full p-4 rounded-lg border-2 text-left flex items-center gap-4 transition-all ${
                                tempSettings.transcriptionMode === 'accurate'
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-200'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tempSettings.transcriptionMode === 'accurate' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                <ShieldCheck size={16} />
                            </div>
                            <div>
                                <h3 className={`font-bold ${tempSettings.transcriptionMode === 'accurate' ? 'text-indigo-900' : 'text-gray-900'}`}>Accurate (Verified)</h3>
                                <p className="text-sm text-gray-500">Waits for full sentences. Highly accurate but slight delay.</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Language Settings */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                            <Globe size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Default Language</h2>
                            <p className="text-gray-500 text-sm">Select the primary language for new recordings.</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {['en-US', 'ms-MY', 'mix'].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setTempSettings({...tempSettings, language: lang})}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${
                                    tempSettings.language === lang 
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                    : 'border-gray-200 hover:border-indigo-200 text-gray-700'
                                }`}
                            >
                                <span className="block font-semibold mb-1">
                                    {lang === 'en-US' ? 'English' : lang === 'ms-MY' ? 'Bahasa Melayu' : 'English/Malay'}
                                </span>
                                <span className="text-xs opacity-70">
                                    {lang === 'en-US' ? 'Standard' : lang === 'ms-MY' ? 'Standard' : 'Mix (Manglish)'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Microphone Access Settings */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
                            <Mic size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Microphone Access</h2>
                            <p className="text-gray-500 text-sm">Check if the browser has permission to use your microphone.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Button 
                            onClick={checkMicrophone} 
                            variant="secondary"
                            className={`w-full sm:w-auto ${micStatus === 'allowed' ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : ''}`}
                        >
                            {micStatus === 'allowed' ? 'Test Again' : 'Request / Test Microphone'}
                        </Button>
                        
                        {micStatus === 'denied' && (
                            <span className="text-red-600 text-sm flex items-center gap-1 animate-in fade-in">
                                <X size={16}/> Access Denied. Check settings.
                            </span>
                        )}
                         {micStatus === 'allowed' && (
                            <span className="text-green-600 text-sm flex items-center gap-1 animate-in fade-in">
                                <CheckCircle size={16}/> Access verified
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = ({ user, onStartSession, onOpenSession }) => {
  const [sessions, setSessions] = useState([]);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'sessions'),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date()
      }));
      setSessions(fetched);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteClick = (sessionId, e) => {
    e.stopPropagation(); 
    setSessionToDelete(sessionId);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sessions', sessionToDelete));
      setSessionToDelete(null);
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const totalSessions = sessions.length;

  return (
    <div className="h-full overflow-y-auto bg-white p-4 md:p-6 lg:p-10 relative">
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Recorder Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Capture conversations and let AI take notes.</p>
        </div>
        <Button onClick={onStartSession} icon={Plus} className="w-full md:w-auto shadow-xl shadow-indigo-200">New Recording</Button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
        <div className="bg-indigo-50 p-4 md:p-6 rounded-2xl border border-indigo-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white text-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <AudioLines size={24} />
          </div>
          <div>
            <p className="text-sm text-indigo-600 font-medium">Total Recordings</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{totalSessions}</p>
          </div>
        </div>
        <div className="bg-purple-50 p-4 md:p-6 rounded-2xl border border-purple-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white text-purple-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-purple-600 font-medium">Minutes Transcribed</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{Math.floor((totalSessions * 15) / 60)}h {(totalSessions * 15) % 60}m</p>
          </div>
        </div>
        <div className="bg-emerald-50 p-4 md:p-6 rounded-2xl border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-white text-emerald-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-sm text-emerald-600 font-medium">AI Insights</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{totalSessions * 5}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-4">
        <h2 className="text-lg font-bold text-gray-900">Recent Recordings</h2>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search transcripts..." 
            className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64 bg-gray-50"
          />
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 md:p-16 text-center border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-white text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-sm">
            <Mic size={32} />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">No recordings yet</h3>
          <p className="text-gray-500 mb-6 md:mb-8 max-w-md mx-auto text-sm md:text-base">Start recording a meeting, lecture, or conversation. We'll handle the transcription and summaries for you.</p>
          <Button onClick={onStartSession} variant="primary" size="lg">Start Recording</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              onClick={() => onOpenSession(session.id)}
              className="group bg-white p-4 md:p-5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{session.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-500 mt-1">
                    <span>{session.startTime.toLocaleDateString()}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{session.duration ? `${Math.floor(session.duration / 60)}m ${session.duration % 60}s` : 'Processing...'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /> Transcribed</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4 ml-2">
                 <div className="hidden md:flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Words</span>
                    <span className="text-sm font-semibold text-gray-700">{session.transcript ? session.transcript.length * 12 : 0}</span>
                 </div>
                 <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden sm:block"></div>
                 <button 
                  onClick={(e) => handleDeleteClick(session.id, e)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete Recording"
                 >
                   <Trash2 size={20} />
                 </button>
                 <ChevronRight className="text-gray-300 group-hover:text-indigo-600 hidden sm:block" size={24} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <Trash2 size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Recording?</h3>
                  <p className="text-gray-500 text-center text-sm mb-6">
                      This action cannot be undone. This recording and its transcript will be permanently removed.
                  </p>
                  <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => setSessionToDelete(null)} className="flex-1">Cancel</Button>
                      <Button variant="danger" onClick={confirmDelete} className="flex-1">Delete</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const ActiveRecordingSession = ({ user, sessionId, onEnd, defaultSettings, sessionData }) => {
  const [transcript, setTranscript] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [language, setLanguage] = useState(defaultSettings?.language || 'mix'); 
  const [transcriptionMode, setTranscriptionMode] = useState(defaultSettings?.transcriptionMode || 'fast');
  const [interimText, setInterimText] = useState('');
  const [networkErrorCount, setNetworkErrorCount] = useState(0);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  
  const recognitionRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const isMicOnRef = useRef(isMicOn);

  // Extract participants or use default
  const participants = sessionData?.participants || [{ nickname: 'You' }];

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);
  
  useEffect(() => {
    let timer;
    if (isMicOn) {
      timer = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isMicOn]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimText]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported");
      const fakeInterval = setInterval(() => {
         if(!isMicOn) return;
         // Simulation Mode: Cycle through participants
         const dummyTexts = ["Recording sample text...", "Voice detection simulation...", "We need to schedule the next sprint."];
         const text = dummyTexts[Math.floor(Math.random() * dummyTexts.length)];
         addTranscriptPart(text, "Speaker");
      }, 4000);
      return () => clearInterval(fakeInterval);
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.lang = language === 'mix' ? 'ms-MY' : language;

    recognition.onstart = () => {
      console.log("Recognition started");
      setNetworkErrorCount(0);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        // Changed to generic "Speaker" for live view as requested
        addTranscriptPart(finalTranscript, "Speaker"); 
        setInterimText('');
      }

      if (transcriptionMode === 'fast') {
        setInterimText(currentInterim);
      } else {
        setInterimText('...'); 
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech error", event.error);
      if (event.error === 'not-allowed') {
        setIsMicOn(false);
      } else if (event.error === 'network') {
          setNetworkErrorCount(prev => prev + 1);
      }
    };

    recognition.onend = () => {
      if (isMicOnRef.current) {
        const baseDelay = 500;
        const delay = networkErrorCount > 0 ? Math.min(baseDelay * Math.pow(2, networkErrorCount), 5000) : baseDelay;

        setTimeout(() => {
            try {
                if (recognitionRef.current && isMicOnRef.current) {
                   recognitionRef.current.start();
                }
            } catch (e) {
                console.warn("Failed to restart recognition", e);
            }
        }, delay);
      }
    };
    
    if (isMicOn) {
      try {
        recognition.start();
      } catch(e) { console.error(e) }
    }

    recognitionRef.current = recognition;

    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null; 
            recognitionRef.current.stop();
        }
    };
  }, [isMicOn, language, transcriptionMode]);

  const addTranscriptPart = async (text, speaker) => {
    if (!text.trim()) return;
    
    let type = 'text';
    const lower = text.toLowerCase();
    if (lower.includes('schedule') || lower.includes('todo') || lower.includes('reminder') || lower.includes('email') || lower.includes('buat') || lower.includes('hantar')) {
      type = 'action_item';
    } else if (lower.includes('important') || lower.includes('key point') || lower.includes('penting')) {
        type = 'highlight';
    }

    const newPart = {
      id: Date.now(),
      speaker, // Generic "Speaker"
      text,
      timestamp: new Date().toISOString(),
      type
    };

    setTranscript(prev => [...prev, newPart]);
  };

  const handleStopRecording = async () => {
    setIsMicOn(false);
    if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
    }
    
    try {
      const sessionRef = doc(db, 'artifacts', appId, 'users', user.uid, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        status: 'completed',
        duration: elapsed,
        transcript: transcript,
        endTime: serverTimestamp(),
        language: language
      });
    } catch(e) {
      console.error("Save error", e);
    }

    onEnd();
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${mins}:${s}`;
  };

  return (
    <div className="h-full bg-slate-900 text-white flex flex-col relative overflow-hidden">
      {/* Top Bar - Mobile Responsive */}
      <div className="h-16 md:h-20 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900 z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
           <div className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest ${isMicOn ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-gray-700 text-gray-400'}`}>
                {isMicOn && <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse"></span>}
                {isMicOn ? 'REC' : 'PAUSED'}
           </div>
           <span className="text-xl md:text-3xl font-light font-mono text-white">{formatTime(elapsed)}</span>
           
           <div className="h-8 md:h-10 flex items-center ml-2 md:ml-4">
              <AudioVisualizer isRecording={isMicOn} />
           </div>
        </div>
        
        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-4">
           <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
             <button
               onClick={() => setTranscriptionMode('fast')}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${transcriptionMode === 'fast' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
             >
               <Zap size={14} />
               <span className="hidden lg:inline">Fast</span>
             </button>
             <button
               onClick={() => setTranscriptionMode('accurate')}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${transcriptionMode === 'accurate' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
             >
               <ShieldCheck size={14} />
               <span className="hidden lg:inline">Accurate</span>
             </button>
           </div>

           <div className="h-6 w-[1px] bg-slate-700"></div>

           <div className="relative">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="pl-9 pr-8 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer hover:bg-slate-750 transition-colors"
              >
                <option value="en-US">English</option>
                <option value="ms-MY">Bahasa</option>
                <option value="mix">Mix</option>
              </select>
           </div>
        </div>

        {/* Mobile Settings Toggle */}
        <button 
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setShowMobileSettings(!showMobileSettings)}
        >
            <Settings size={20} />
        </button>
      </div>

      {/* Mobile Settings Panel (Overlay) */}
      {showMobileSettings && (
          <div className="md:hidden bg-slate-800 border-b border-slate-700 p-4 absolute top-16 left-0 right-0 z-20 shadow-xl animate-in slide-in-from-top-2">
              <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                      <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Mode</label>
                      <div className="flex bg-slate-900 rounded-lg p-1">
                          <button onClick={() => setTranscriptionMode('fast')} className={`flex-1 py-2 rounded text-xs font-medium ${transcriptionMode === 'fast' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Fast</button>
                          <button onClick={() => setTranscriptionMode('accurate')} className={`flex-1 py-2 rounded text-xs font-medium ${transcriptionMode === 'accurate' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Accurate</button>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Language</label>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="ms-MY">Bahasa Melayu</option>
                        <option value="mix">English/Malay Mix</option>
                      </select>
                  </div>
              </div>
          </div>
      )}

      {/* Main Transcript Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-12 relative bg-slate-900">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-32">
            {transcript.length === 0 && !interimText && (
                <div className="flex flex-col items-center justify-center mt-20 md:mt-32 text-slate-500 opacity-50">
                    <Mic size={48} className="mb-4" />
                    <p className="text-lg md:text-xl">Listening...</p>
                </div>
            )}
            
            {transcript.map((t, idx) => (
                <div key={t.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="flex gap-3 md:gap-4">
                        <div className="w-12 md:w-16 pt-1 text-right shrink-0">
                             <span className="text-[10px] md:text-xs font-mono text-slate-500 block">
                                {new Date(t.timestamp).toLocaleTimeString([], {minute:'2-digit', second:'2-digit'})}
                             </span>
                        </div>
                        <div className="flex-1">
                            {/* Generic Speaker Label for live view */}
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Speaker</span>
                            </div>
                            <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl rounded-tl-none text-base md:text-lg leading-relaxed shadow-sm backdrop-blur-sm
                                ${t.type === 'action_item' ? 'bg-indigo-900/30 border border-indigo-500/30 text-indigo-100' : 
                                  t.type === 'highlight' ? 'bg-amber-900/20 border border-amber-500/30 text-amber-100' : 
                                  'bg-slate-800 border border-slate-700/50 text-slate-200'}`}>
                                {t.text}
                                {t.type === 'action_item' && (
                                    <div className="mt-2 flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-wider text-indigo-400">
                                        <CheckCircle size={12} /> Action Item
                                    </div>
                                )}
                            </div>
                        </div>
                   </div>
                </div>
            ))}
            
            {interimText && (
                 <div className="animate-pulse flex gap-3 md:gap-4 opacity-70">
                    <div className="w-12 md:w-16 pt-1 text-right shrink-0">
                         <span className="text-[10px] md:text-xs font-mono text-slate-600 block">...</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Speaker</span>
                        </div>
                        <div className="p-3 md:p-4 rounded-xl md:rounded-2xl rounded-tl-none text-base md:text-lg leading-relaxed border border-dashed border-slate-700 text-slate-400">
                            {interimText}
                        </div>
                    </div>
                 </div>
            )}
            <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Floating Control Bar */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-xl border border-slate-700 p-2 rounded-full shadow-2xl flex items-center gap-2 z-20 max-w-[90%] md:max-w-none justify-between">
        <button 
          onClick={() => setIsMicOn(!isMicOn)}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 ${isMicOn ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          title={isMicOn ? "Pause Recording" : "Resume Recording"}
        >
          {isMicOn ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
        </button>
        
        <div className="w-[1px] h-6 md:h-8 bg-slate-600 mx-1 md:mx-2"></div>

        <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-transparent hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors" title="Add Highlight">
            <Highlighter size={18} />
        </button>
        <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-transparent hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors" title="Add Note">
            <FileText size={18} />
        </button>

        <div className="w-[1px] h-6 md:h-8 bg-slate-600 mx-1 md:mx-2"></div>
        
        <button 
          onClick={handleStopRecording}
          className="px-4 md:px-6 h-10 md:h-12 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-2 transition-colors shadow-lg shadow-red-900/20 pr-4 md:pr-8 text-xs md:text-base whitespace-nowrap"
        >
          <StopCircle size={18} fill="currentColor" />
          <span>Stop</span>
        </button>
      </div>
    </div>
  );
};

// --- Session Review Component (Read-Only Mode) ---
const SessionReview = ({ user, sessionId, onBack, appSettings }) => {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('transcript'); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [genTemplate, setGenTemplate] = useState('general');
  const [displayLang, setDisplayLang] = useState('en'); 
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!user || !sessionId) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'sessions', sessionId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSession({
            id: doc.id,
            ...data,
            startTime: data.startTime?.toDate() || new Date()
        });
      }
    });
    return () => unsub();
  }, [user, sessionId]);

  const handleLanguageSwitch = async (lang) => {
    if (lang === displayLang) return;
    
    if (lang === 'ms' && !session.minutes_ms && session.minutes) {
       setIsTranslating(true);
       const prompt = `Translate the following HTML meeting minutes to Bahasa Melayu (Standard Malay). 
       Keep all HTML tags (h2, table, ul, li), structure, and inline styles exactly the same. 
       Only translate the text content within the tags. Do not change the layout.
       
       HTML:
       ${session.minutes}`;
       
       const translated = await generateGeminiContent(prompt);
       const cleanHtml = translated.replace(/```html|```/g, '');
       
       try {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sessions', sessionId), {
                minutes_ms: cleanHtml
           });
       } catch (e) {
           console.error("Translation save error", e);
       }
       setIsTranslating(false);
    }
    setDisplayLang(lang);
  };

  const handleGenerateMinutes = async () => {
    if (!session?.transcript?.length) return;
    setIsGenerating(true);
    setShowGenModal(false);

    const fullText = session.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
    
    // Prepare Context Data for AI
    const staffListString = appSettings?.staffList?.map(s => `- ${s.name} (Nickname: ${s.nickname})`).join('\n') || "No staff directory provided.";
    const participantsString = session.participants ? session.participants.map(p => `- ${p.name} (Nickname: ${p.nickname})`).join('\n') : "No specific participants listed.";

    let prompt = "";

    const commonInstructions = `
      Format the output as clean, semantic HTML suitable for embedding in a div. 
      - Use <h2> for main section headers.
      - Use <table> with <thead> and <tbody> for any structured data or action items.
      - Use <ul> and <li> for lists.
      - Do not use markdown code blocks (triple backticks), just return the raw HTML string.
      - Add inline styles to table borders to ensure they render well (e.g. style="border-collapse: collapse; width: 100%;").
      - Style table headers with a light gray background (style="background-color: #f3f4f6; text-align: left; padding: 8px;").
      - Style table cells with padding and border (style="border: 1px solid #e5e7eb; padding: 8px;").
    `;

    const taskAllocationInstructions = `
      Task Allocation Logic:
      - Analyze the transcript for task assignment keywords in Malay/English (e.g., "siapa boleh buat", "tolong handle", "assign to", "I will do", "awak buat ni").
      - When a task is detected, identify the assignee. 
      - Attempt to match the spoken name/nickname to the "Available Staff Directory" or "Meeting Participants" list provided below.
      - If a match is found, use the Full Name in the Action Items table.
    `;

    const contextData = `
      Context Data:
      Meeting Title: ${session.title}
      
      Meeting Participants:
      ${participantsString}

      Available Staff Directory (for matching assignees):
      ${staffListString}
    `;

    if (genTemplate === 'general') {
      prompt = `Analyze the following meeting transcript and generate structured Meeting Minutes in English. ${commonInstructions}
      
      ${contextData}

      ${taskAllocationInstructions}

      Include:
      1. Meeting Objective
      2. Key Discussion Points
      3. Action Items (Present this as a Table with columns: Task, Assignee (Full Name), Priority)
      4. Next Steps
      
      Transcript:
      ${fullText}`;
    } else if (genTemplate === 'viva') {
      prompt = `Act as an Academic Secretary. Analyze this Viva Voce (Oral Defense) transcript. ${commonInstructions}
      
      ${contextData}

      Generate a Formal Defense Report in English. Include:
      1. Candidate Name (if found) & Topic
      2. Presentation Summary
      3. Critical Defense Questions & Candidate Responses (Summarized)
      4. Examiner Feedback (Present this as a Table with columns: Examiner, Feedback, Severity)
      5. Final Verdict/Outcome Implication
      
      Transcript:
      ${fullText}`;
    } else if (genTemplate === 'seminar') {
      prompt = `Analyze this Seminar/Lecture transcript. ${commonInstructions}
      
      ${contextData}

      Generate a Learning Summary in English. Include:
      1. Seminar Topic & Speaker
      2. Executive Summary
      3. Key Learning Points (The "Aha" moments)
      4. Audience Q&A Summary (Present as a Table: Question, Answer, Key Takeaway)
      5. Resources/References Mentioned
      
      Transcript:
      ${fullText}`;
    }

    const generatedText = await generateGeminiContent(prompt);
    const cleanHtml = generatedText.replace(/```html|```/g, '');

    try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sessions', sessionId), {
            minutes: cleanHtml,
            minutes_ms: null,
            minutesType: genTemplate,
            minutesGeneratedAt: serverTimestamp()
        });
        setActiveTab('minutes');
        setDisplayLang('en');
    } catch (e) {
        console.error("Save error", e);
    }
    
    setIsGenerating(false);
  };

  const exportToWord = () => {
    const content = displayLang === 'ms' ? (session.minutes_ms || session.minutes) : session.minutes;
    if (!content) return;
    
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + content + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Meeting_Minutes_${displayLang}_${session.title.replace(/\s+/g, '_')}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const content = displayLang === 'ms' ? (session.minutes_ms || session.minutes) : session.minutes;
    if (!content) return;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Meeting Minutes</title>');
    printWindow.document.write(`
      <style>
        body { font-family: sans-serif; padding: 40px; }
        h2 { border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-top: 30px; color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f3f4f6; }
        ul { line-height: 1.6; }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(`<h1>${session.title}</h1>`);
    printWindow.document.write(`<p style="color: #666; margin-bottom: 30px;">Generated on ${new Date().toLocaleDateString()} (${displayLang === 'ms' ? 'Malay' : 'English'})</p>`);
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
    setShowExportMenu(false);
  };

  // Add html2pdf script loading for PDF functionality
  useEffect(() => {
    // This script is not directly used in the provided exportToPDF function,
    // which uses window.print(). If html2pdf.js is intended, it needs to be integrated.
    // For now, keeping the existing window.print() behavior.
    // loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");
  }, []);

  if (!session) return <div className="p-10 text-center text-gray-500">Retrieving transcript...</div>;

  const actionItems = session.transcript ? session.transcript.filter(t => t.type === 'action_item') : [];
  
  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate max-w-[200px] md:max-w-none">{session.title}</h1>
            <p className="text-xs md:text-sm text-gray-500">
                {session.startTime.toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2 md:gap-3 relative">
            {/* Desktop Generate Button */}
            <Button 
                onClick={() => setShowGenModal(true)} 
                variant="primary" 
                icon={Wand2}
                className="hidden md:flex bg-purple-600 hover:bg-purple-700 shadow-purple-500/20"
                loading={isGenerating}
            >
                {session.minutes ? 'Regenerate' : 'Generate AI'}
            </Button>
            
            {/* Mobile Generate Button (Icon Only) */}
            <button 
                onClick={() => setShowGenModal(true)} 
                className="md:hidden flex items-center justify-center w-10 h-10 bg-purple-600 text-white rounded-lg shadow-md"
                disabled={isGenerating}
            >
                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
            </button>

            <div className="w-[1px] h-8 bg-gray-200 mx-1 md:mx-2"></div>
            
            <div className="relative">
              <Button 
                variant="secondary" 
                icon={Download} 
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={!session.minutes}
                className="hidden md:flex"
              >
                Export
              </Button>
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={!session.minutes}
                className="md:hidden flex items-center justify-center w-10 h-10 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm"
              >
                <Download size={20} />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <button 
                    onClick={exportToWord}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 flex items-center gap-3 transition-colors"
                  >
                    <FileType size={18} className="text-blue-600" />
                    <span>Export to Word</span>
                  </button>
                  <div className="h-[1px] bg-gray-100"></div>
                  <button 
                    onClick={exportToPDF}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 text-gray-700 flex items-center gap-3 transition-colors"
                  >
                    <Printer size={18} className="text-red-600" />
                    <span>Print / PDF</span>
                  </button>
                </div>
              )}
            </div>
        </div>
      </header>

      {/* Redesigned Segmented Control Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4">
        <div className="bg-gray-100/80 p-1.5 rounded-xl flex md:inline-flex items-center gap-1 shadow-inner w-full md:w-auto overflow-x-auto">
          <button 
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'transcript' 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50 scale-[1.02]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <FileText size={16} className={activeTab === 'transcript' ? "text-indigo-600" : "text-gray-400"} />
            Full Transcript
          </button>
          
          <button 
            onClick={() => setActiveTab('minutes')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'minutes' 
                ? 'bg-white text-purple-600 shadow-sm ring-1 ring-gray-200/50 scale-[1.02]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            <Sparkles size={16} className={activeTab === 'minutes' ? "text-purple-600" : "text-gray-400"} />
            AI Minutes
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left Sidebar: AI Summary (Desktop) - Hidden on Mobile */}
        <div className="hidden md:block w-80 lg:w-96 bg-white border-r border-gray-200 overflow-y-auto p-6">
            <h2 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" />
                Quick Insights
            </h2>

            <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detected Action Items</h3>
                {actionItems.length > 0 ? (
                    <div className="space-y-3">
                        {actionItems.map((item, idx) => (
                            <div key={idx} className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm text-gray-800 flex gap-2 items-start">
                                <input type="checkbox" className="mt-1 text-indigo-600 rounded focus:ring-indigo-500" />
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">No explicit action items found.</p>
                )}
            </div>

            <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Session Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <span className="block text-xl font-bold text-gray-900">{session.transcript ? session.transcript.length : 0}</span>
                        <span className="text-xs text-gray-500">Segments</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <span className="block text-xl font-bold text-gray-900">{Math.floor(session.duration / 60)}m</span>
                        <span className="text-xs text-gray-500">Duration</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-12">
            
            {activeTab === 'transcript' && (
                <div className="max-w-3xl mx-auto bg-white shadow-sm border border-gray-200 rounded-xl min-h-[300px] md:min-h-[500px] p-4 md:p-12 relative animate-in fade-in duration-300">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-t-xl"></div>
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 mb-6 md:mb-8 border-b border-gray-100 pb-4">Full Transcript</h2>
                    <div className="space-y-4 md:space-y-6">
                        {session.transcript && session.transcript.length > 0 ? (
                            session.transcript.map((t) => (
                                <div key={t.id} className="group flex gap-3 md:gap-4 hover:bg-gray-50 p-2 rounded-lg -ml-2 transition-colors">
                                    <div className="w-12 md:w-16 pt-1 text-right shrink-0">
                                        <span className="text-[10px] md:text-xs font-mono text-gray-400 block group-hover:text-indigo-500 transition-colors">
                                            {new Date(t.timestamp).toLocaleTimeString([], {minute:'2-digit', second:'2-digit'})}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        {/* Generic Speaker Label */}
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">{t.speaker}</span>
                                        </div>
                                        <p className={`text-sm md:text-base leading-relaxed ${
                                            t.type === 'action_item' ? 'text-indigo-900 bg-indigo-50/50 px-2 py-1 rounded inline-block' : 
                                            t.type === 'highlight' ? 'text-amber-900 bg-amber-50/50 px-2 py-1 rounded inline-block' : 
                                            'text-gray-800'
                                        }`}>
                                            {t.text}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-400 italic mt-20">Transcript is empty.</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'minutes' && (
                <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
                    {session.minutes ? (
                        <div className="bg-white shadow-lg shadow-purple-100 border border-purple-100 rounded-xl min-h-[300px] md:min-h-[500px] p-4 md:p-12 relative">
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-t-xl"></div>
                             
                             <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 pb-4 border-b border-gray-100 gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                      <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">Meeting Minutes</h2>
                                      {isTranslating && <span className="text-[10px] md:text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Translating...</span>}
                                    </div>
                                    <p className="text-xs md:text-sm text-purple-600 font-medium uppercase tracking-wide">
                                        Template: {session.minutesType || 'General'}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                    <div className="flex bg-gray-100 rounded-lg p-1 w-full md:w-auto">
                                        <button 
                                            onClick={() => handleLanguageSwitch('en')}
                                            className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-all ${displayLang === 'en' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                        >
                                            English
                                        </button>
                                        <button 
                                            onClick={() => handleLanguageSwitch('ms')}
                                            className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-all ${displayLang === 'ms' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                        >
                                            Bahasa
                                        </button>
                                    </div>
                                    <div className="text-right text-gray-400 text-[10px] md:text-xs hidden md:block">
                                        Generated by Gemini AI
                                    </div>
                                </div>
                             </div>
                             
                             {isTranslating ? (
                                 <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                     <Languages size={48} className="mb-4 text-purple-200 animate-pulse" />
                                     <p>Translating to Bahasa Melayu...</p>
                                 </div>
                             ) : (
                                 <div 
                                    className="prose prose-slate prose-sm md:prose-lg max-w-none font-serif"
                                    dangerouslySetInnerHTML={{ __html: displayLang === 'ms' ? (session.minutes_ms || session.minutes) : session.minutes }}
                                 />
                             )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] md:h-[500px] bg-white rounded-xl border border-dashed border-gray-300 text-center p-8">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mb-4 md:mb-6">
                                <Wand2 size={32} />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">No Minutes Generated Yet</h3>
                            <p className="text-gray-500 max-w-sm mb-6 md:mb-8 text-sm md:text-base">
                                Use the "Generate AI" button to create a formatted report.
                            </p>
                            <Button onClick={() => setShowGenModal(true)} variant="primary" icon={Wand2} className="bg-purple-600 hover:bg-purple-700">
                                Generate Now
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {showGenModal && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                          <Wand2 className="text-purple-600" size={20} />
                          Generate Minutes
                      </h3>
                      <button onClick={() => setShowGenModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                  </div>
                  
                  <div className="p-4 md:p-6">
                      <p className="text-gray-600 text-sm mb-4 md:mb-6">Select a template below to instruct Gemini AI on how to format your meeting minutes.</p>
                      
                      <div className="space-y-3">
                          <button 
                            onClick={() => setGenTemplate('general')}
                            className={`w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 text-left transition-all ${genTemplate === 'general' ? 'border-purple-600 bg-purple-50' : 'border-gray-100 hover:border-purple-200'}`}
                          >
                              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${genTemplate === 'general' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                  <Briefcase size={18} />
                              </div>
                              <div>
                                  <h4 className={`font-bold text-sm md:text-base ${genTemplate === 'general' ? 'text-purple-900' : 'text-gray-900'}`}>General Meeting</h4>
                                  <p className="text-xs text-gray-500">Standard agenda, discussion, action items.</p>
                              </div>
                          </button>

                          <button 
                            onClick={() => setGenTemplate('viva')}
                            className={`w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 text-left transition-all ${genTemplate === 'viva' ? 'border-purple-600 bg-purple-50' : 'border-gray-100 hover:border-purple-200'}`}
                          >
                              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${genTemplate === 'viva' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                  <GraduationCap size={18} />
                              </div>
                              <div>
                                  <h4 className={`font-bold text-sm md:text-base ${genTemplate === 'viva' ? 'text-purple-900' : 'text-gray-900'}`}>Viva Voce (Defense)</h4>
                                  <p className="text-xs text-gray-500">Defense summary, Q&A, examiner feedback.</p>
                              </div>
                          </button>

                          <button 
                            onClick={() => setGenTemplate('seminar')}
                            className={`w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 text-left transition-all ${genTemplate === 'seminar' ? 'border-purple-600 bg-purple-50' : 'border-gray-100 hover:border-purple-200'}`}
                          >
                              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${genTemplate === 'seminar' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                  <BookOpen size={18} />
                              </div>
                              <div>
                                  <h4 className={`font-bold text-sm md:text-base ${genTemplate === 'seminar' ? 'text-purple-900' : 'text-gray-900'}`}>Seminar / Lecture</h4>
                                  <p className="text-xs text-gray-500">Key learnings, executive summary, resources.</p>
                              </div>
                          </button>
                      </div>
                  </div>
                  
                  <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setShowGenModal(false)}>Cancel</Button>
                      <Button onClick={handleGenerateMinutes} variant="primary" className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto">
                          Generate Report
                      </Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// --- 4. Main Component (Defined Last) ---

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [currentSessionData, setCurrentSessionData] = useState(null);
  const [showGeminiApiKeySettings, setShowGeminiApiKeySettings] = useState(false); // New state for API key settings
  
  const [appSettings, setAppSettings] = useState(() => {
    try {
        const saved = localStorage.getItem('meetily-settings');
        return saved ? { staffList: [], ...JSON.parse(saved) } : { language: 'mix', transcriptionMode: 'fast', staffList: [] };
    } catch(e) {
        return { language: 'mix', transcriptionMode: 'fast', staffList: [] };
    }
  });

  useEffect(() => {
    localStorage.setItem('meetily-settings', JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStartSession = (setupData) => {
      setShowSetupModal(false);
      setCurrentSessionData(setupData);
      startNewSession(setupData);
  };

  const startNewSession = async (setupData) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'sessions'), {
        startTime: serverTimestamp(),
        status: 'active',
        title: setupData.title,
        participants: setupData.participants,
        transcript: [],
        summary: null,
        minutes: null, 
        minutes_ms: null
      });
      setActiveSessionId(docRef.id);
      setView('recording');
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const openSessionReview = (sessionId) => {
    setActiveSessionId(sessionId);
    setView('review');
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-indigo-600">Loading Meetily...</div>;
  if (!user) return <div className="h-screen w-full flex items-center justify-center bg-gray-50">Initializing Secure Session...</div>;

  return (
    <div className="h-screen w-full bg-white text-gray-900 font-sans overflow-hidden flex flex-col md:flex-row">
      <Sidebar view={view} setView={setView} onOpenGeminiSettings={() => setShowGeminiApiKeySettings(true)} />
      
      <main className={`flex-1 h-full overflow-hidden relative flex flex-col ${view !== 'recording' && view !== 'review' ? 'pb-20 md:pb-0' : ''}`}>
        {view === 'dashboard' && (
          <Dashboard 
            user={user} 
            onStartSession={() => setShowSetupModal(true)} 
            onOpenSession={openSessionReview} 
          />
        )}
        {view === 'recording' && activeSessionId && (
          <ActiveRecordingSession 
            user={user} 
            sessionId={activeSessionId} 
            defaultSettings={appSettings}
            sessionData={currentSessionData}
            onEnd={() => setView('dashboard')} 
          />
        )}
        {view === 'review' && activeSessionId && (
          <SessionReview 
            user={user} 
            sessionId={activeSessionId} 
            appSettings={appSettings}
            onBack={() => setView('dashboard')} 
          />
        )}
        {view === 'settings' && (
            <SettingsPage 
                settings={appSettings} 
                onUpdate={setAppSettings} 
                onOpenGeminiSettings={() => setShowGeminiApiKeySettings(true)}
            />
        )}
      </main>

      {/* Modals & Nav */}
      <MeetingSetupModal 
        isOpen={showSetupModal} 
        onClose={() => setShowSetupModal(false)}
        onStart={handleStartSession}
      />
      <MobileNav view={view} setView={setView} onOpenGeminiSettings={() => setShowGeminiApiKeySettings(true)} />

      {/* Gemini API Key Settings Modal */}
      <GeminiApiKeySettings isOpen={showGeminiApiKeySettings} onClose={() => setShowGeminiApiKeySettings(false)} />
    </div>
  );
}

export default App;