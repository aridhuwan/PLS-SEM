import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Settings,
  Save,
  CheckCircle, 
  X,
  UserPlus,
  Users,
  Upload,
  Globe,
  Zap,
  ShieldCheck,
  Trash2,
  Key
} from 'lucide-react';
import { Button } from '@/App'; // Assuming Button is exported from App.tsx or a common components file

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

export default SettingsPage;