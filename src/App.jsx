import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  ChevronRight, 
  Activity, 
  Sparkles,
  Camera,
  X,
  Search,
  ArrowRight,
  MessageCircle,
  Send,
  Volume2,
  StopCircle,
  ThumbsUp,
  RefreshCw,
  History,
  Share2,
  Trash2,
  Image as ImageIcon,
  Loader,
  Filter
} from 'lucide-react';

/* -------------------------------------------------------------------------
  NUTRI-NODE: AI-NATIVE CONSUMER HEALTH EXPERIENCE
  -------------------------------------------------------------------------
  Concept: Moves beyond "reading labels" to "interpreting intent".
  Tech: React, Tailwind, Gemini API (Text, Vision & TTS).
*/

// --- Audio Utility for Gemini TTS ---
const pcmToWav = (pcmData, sampleRate = 24000) => {
  const buffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length * 2, true);

  const pcmView = new Int16Array(buffer, 44);
  for (let i = 0; i < pcmData.length; i++) {
    pcmView[i] = pcmData[i];
  }

  return buffer;
};

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// --- Components Defined OUTSIDE Main Component ---

const Header = ({ reset, currentDiet, setDiet }) => (
  <div className="w-full max-w-4xl mx-auto flex justify-between items-center p-6 pb-2">
    <div className="flex items-center gap-2" onClick={reset} style={{cursor: 'pointer'}}>
      <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
        <Brain className="text-white w-6 h-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-800">NutriNode</h1>
    </div>
    
    {/* Diet Selector - Feature Update */}
    <div className="relative group">
        <button className="bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-2 hover:border-emerald-400 transition-colors">
            <Filter className="w-3 h-3" />
            {currentDiet}
        </button>
        <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-100 shadow-xl rounded-xl overflow-hidden hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
            {['Standard', 'Vegan', 'Keto', 'Gluten-Free', 'Low-FODMAP', 'Paleo'].map(diet => (
                <div 
                    key={diet}
                    onClick={() => setDiet(diet)}
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-emerald-50 ${currentDiet === diet ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-600'}`}
                >
                    {diet}
                </div>
            ))}
        </div>
    </div>
  </div>
);

const ScanningOverlay = ({ message }) => (
  <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
    <div className="relative">
      <div className="w-24 h-24 border-4 border-emerald-100 rounded-full animate-pulse"></div>
      <div className="absolute inset-0 border-t-4 border-emerald-500 rounded-full animate-spin"></div>
      <Activity className="absolute inset-0 m-auto text-emerald-500 w-8 h-8" />
    </div>
    <h2 className="mt-8 text-xl font-bold text-slate-800">Analyzing Composition</h2>
    <p className="text-slate-500 mt-2 text-center max-w-xs">{message}</p>
  </div>
);

const NutriNode = () => {
  // --- State Management ---
  const [viewState, setViewState] = useState('idle'); 
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeCard, setActiveCard] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [dietaryProfile, setDietaryProfile] = useState('Standard'); // New Feature
  
  // New Features State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); 
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [alternative, setAlternative] = useState(null);
  const [isAltLoading, setIsAltLoading] = useState(false);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Constants & Config ---
  // ⚠️ IMPORTANT FOR LOCAL DEV:
  // In your local VS Code, uncomment the line below to use your .env file.
  // const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''; 

  // For this web preview, we use a placeholder:
  const API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || ''; 

  const LOADING_MESSAGES = [
    "Scanning visual data...",
    "Identifying ingredients...",
    `Applying ${dietaryProfile} lens...`, // Dynamic loading message
    "Cross-referencing health studies...",
    "Synthesizing verdict..."
  ];

  // --- Mock Data ---
  const DEMO_SCENARIOS = {
    "Healthy Cereal?": "Whole grain oats, sugar, corn starch, honey, brown sugar syrup, salt, tripotassium phosphate, canola oil, natural almond flavor, vitamin E.",
    "Energy Drink": "Carbonated water, sucrose, glucose, citric acid, taurine, sodium citrate, caffeine, glucuronolactone, inositol, niacinamide, pyridoxine hydrochloride, calcium pantothenate, Blue 1, Red 40.",
    "Veggie Burger": "Water, pea protein isolate, expeller-pressed canola oil, refined coconut oil, rice protein, natural flavors, cocoa butter, mung bean protein, methylcellulose, potato starch, apple extract, salt, potassium chloride, vinegar, lemon juice concentrate, sunflower lecithin, beet juice extract."
  };

  // --- Load History on Mount ---
  useEffect(() => {
    const saved = localStorage.getItem('nutrinode_history');
    if (saved) {
      try {
        setScanHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // --- Save History ---
  const saveToHistory = (newAnalysis, text) => {
    const newItem = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      category: newAnalysis.product_category_guess,
      verdict: newAnalysis.verdict_short,
      score: newAnalysis.health_score,
      emoji: newAnalysis.verdict_emoji,
      fullAnalysis: newAnalysis,
      originalText: text
    };
    
    const updatedHistory = [newItem, ...scanHistory].slice(0, 5); 
    setScanHistory(updatedHistory);
    localStorage.setItem('nutrinode_history', JSON.stringify(updatedHistory));
  };

  const loadFromHistory = (item) => {
    setAnalysis(item.fullAnalysis);
    setInputText(item.originalText || "Scanned from Image");
    setViewState('result');
  };

  const clearHistory = (e) => {
    e.stopPropagation();
    setScanHistory([]);
    localStorage.removeItem('nutrinode_history');
  };

  const getApiKey = () => {
    if (API_KEY) return API_KEY;
    try {
      // @ts-ignore
      return import.meta.env?.VITE_GEMINI_API_KEY || '';
    } catch (e) {
      return '';
    }
  };

  // --- AI Integration: Image Handling ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setViewState('analyzing');
    setLoadingStep(0);
    setChatHistory([]);
    setAlternative(null);
    setChatOpen(false);

    const progressInterval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      const mimeType = file.type;

      try {
        const currentKey = getApiKey();
        if (!currentKey) {
           alert("Missing API Key! Please configure your .env file.");
           setViewState('error');
           clearInterval(progressInterval);
           return;
        }

        const prompt = `
          Analyze this image of a food product (ingredient label or packaging).
          Target Audience Profile: ${dietaryProfile} Diet.
          
          Strictly evaluate ingredients based on the ${dietaryProfile} diet rules.
          Example: If diet is Keto, Sugar/Grains are 'Avoid'. If Vegan, Honey/Dairy are 'Avoid'.
          
          Return a valid JSON object with this exact schema:
          {
            "product_category_guess": "String (e.g. 'Energy Drink', 'Cereal')",
            "verdict_emoji": "String (single emoji)",
            "verdict_short": "String (5-7 words max, punchy, like a headline)",
            "health_score": Number (1-100, heavily weighted by if it fits the ${dietaryProfile} diet),
            "nutritional_density": "String (Low/Medium/High)",
            "processing_level": "String (Minimal/Moderate/Ultra-processed)",
            "executive_summary": "String (2-3 sentences. Use 'I' and 'You'. Explain if it fits the ${dietaryProfile} diet and the 'vibe'.)",
            "intent_inference": "String (Guess why the user might be eating this.)",
            "ingredients_breakdown": [
              {
                "name": "String (Ingredient Name)",
                "category": "String (e.g. 'Sugar', 'Preservative', 'Whole Food')",
                "risk_level": "String (Safe/Caution/Avoid - strict for ${dietaryProfile})",
                "reasoning": "String (Why? Explain specific relation to ${dietaryProfile} if relevant.)"
              }
            ],
            "uncertainties": [
              "String (List 1-2 things you are guessing about)"
            ],
            "suggested_questions": [
              "String (Generate 3 context-aware questions the user might want to ask next, e.g. 'Is this really keto?', 'What is [Obscure Ingredient]?')"
            ]
          }
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${currentKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType, data: base64Data } }
              ]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        const data = await response.json();
        clearInterval(progressInterval);

        if (data.candidates && data.candidates[0].content) {
          const resultText = data.candidates[0].content.parts[0].text;
          const resultJson = JSON.parse(resultText);
          setAnalysis(resultJson);
          saveToHistory(resultJson, "Scanned Image");
          setViewState('result');
        } else {
          throw new Error("Invalid AI response from image");
        }

      } catch (error) {
        console.error(error);
        clearInterval(progressInterval);
        setViewState('error');
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // --- AI Integration: Core Text Analysis ---
  const performAnalysis = async (text) => {
    const currentKey = getApiKey();
    if (!currentKey) {
      alert("Missing API Key! Please configure your .env file.");
      setViewState('error');
      return;
    }

    if (!text || text.length < 3) {
      alert("Please enter some ingredients.");
      return;
    }

    setViewState('analyzing');
    setLoadingStep(0);
    setChatHistory([]); 
    setAlternative(null);
    setChatOpen(false);

    const progressInterval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);

    try {
      const systemPrompt = `
        You are NutriNode, an AI-Native food analyst. 
        Target Audience Profile: ${dietaryProfile} Diet.
        
        Analyze the following ingredient list: "${text}"
        
        Strictly evaluate ingredients based on the ${dietaryProfile} diet rules.
        Example: If diet is Keto, Sugar/Grains are 'Avoid'. If Vegan, Honey/Dairy are 'Avoid'.
        
        Return a valid JSON object with this exact schema:
        {
          "product_category_guess": "String (e.g. 'Energy Drink', 'Cereal')",
          "verdict_emoji": "String (single emoji)",
          "verdict_short": "String (5-7 words max, punchy, like a headline)",
          "health_score": Number (1-100, heavily weighted by if it fits the ${dietaryProfile} diet),
          "nutritional_density": "String (Low/Medium/High)",
          "processing_level": "String (Minimal/Moderate/Ultra-processed)",
          "executive_summary": "String (2-3 sentences. Use 'I' and 'You'. Explain if it fits the ${dietaryProfile} diet and the 'vibe'.)",
          "intent_inference": "String (Guess why the user might be eating this.)",
          "ingredients_breakdown": [
            {
              "name": "String (Ingredient Name)",
              "category": "String (e.g. 'Sugar', 'Preservative', 'Whole Food')",
              "risk_level": "String (Safe/Caution/Avoid - strict for ${dietaryProfile})",
              "reasoning": "String (Why? Explain specific relation to ${dietaryProfile} if relevant.)"
            }
          ],
          "uncertainties": [
            "String (List 1-2 things you are guessing about)"
          ],
          "suggested_questions": [
            "String (Generate 3 context-aware questions the user might want to ask next)"
          ]
        }
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${currentKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();
      
      clearInterval(progressInterval);

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (data.candidates && data.candidates[0].content) {
        const resultText = data.candidates[0].content.parts[0].text;
        const resultJson = JSON.parse(resultText);
        
        setAnalysis(resultJson);
        saveToHistory(resultJson, text); 
        setViewState('result');
      } else {
        throw new Error("Invalid AI response");
      }

    } catch (error) {
      console.error(error);
      clearInterval(progressInterval);
      setViewState('error');
    }
  };

  // --- AI Integration: Chat Follow-up ---
  const handleChatSubmit = async (e, forcedMessage = null) => {
    if (e) e.preventDefault();
    const userMsg = forcedMessage || chatInput;
    if (!userMsg.trim()) return;

    if (!forcedMessage) setChatInput(''); // Only clear if user typed
    
    // If it's a chip click, open the chat
    if (forcedMessage) setChatOpen(true);

    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    const currentKey = getApiKey();

    try {
      const contextPrompt = `
        You are a helpful nutritionist assistant named NutriNode.
        User's Diet Goal: ${dietaryProfile}.
        
        CURRENT ANALYSIS CONTEXT:
        Product: ${analysis.product_category_guess}
        Verdict: ${analysis.verdict_short}
        Summary: ${analysis.executive_summary}
        Ingredients: ${JSON.stringify(analysis.ingredients_breakdown.map(i => i.name))}
        
        USER QUESTION: "${userMsg}"
        
        Answer the user's question briefly and helpfully based on the context above.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${currentKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextPrompt }] }]
        })
      });

      const data = await response.json();

      if (data.error) {
         throw new Error(data.error.message);
      }

      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't formulate an answer.";

      setChatHistory(prev => [...prev, { role: 'model', text: aiResponse }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I had trouble connecting. Please check your network or API key." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- AI Integration: Suggest Alternative ---
  const generateAlternative = async () => {
    setIsAltLoading(true);
    const currentKey = getApiKey();
    try {
      const prompt = `
        Context: A user is looking at a ${analysis.product_category_guess} which has a health score of ${analysis.health_score}/100.
        Dietary Goal: ${dietaryProfile}.
        Task: Suggest ONE specific healthier alternative type of product that fits the ${dietaryProfile} diet better.
        Return JSON: { "name": "String", "reason": "String", "key_swap": "String" }
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${currentKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();
      const altData = JSON.parse(data.candidates[0].content.parts[0].text);
      setAlternative(altData);

    } catch (error) {
      console.error(error);
    } finally {
      setIsAltLoading(false);
    }
  };

  // --- AI Integration: Text-to-Speech (Gemini TTS) ---
  const playAudioSummary = async () => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAudio(false);
      return;
    }
    
    const currentKey = getApiKey();

    try {
      setIsPlayingAudio(true); 
      const textToSay = `Here is the Nutri Node verdict. ${analysis.verdict_short}. ${analysis.executive_summary}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${currentKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: textToSay }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Aoede" } // Friendly female voice
              }
            }
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.error("TTS API Error:", data.error);
        setIsPlayingAudio(false);
        return;
      }

      const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        // Decode Base64 to PCM
        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Convert PCM (Int16) to WAV
        const pcm16 = new Int16Array(bytes.buffer);
        const wavBuffer = pcmToWav(pcm16, 24000); // 24kHz is standard for this model
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.play();
      } else {
        setIsPlayingAudio(false);
      }

    } catch (error) {
      console.error("TTS Error", error);
      setIsPlayingAudio(false);
    }
  };

  const handleShare = async () => {
    if (!analysis) return;
    const shareText = `🍎 NutriNode Verdict (${dietaryProfile} View): ${analysis.verdict_short}\n\n"${analysis.executive_summary}"\n\nHealth Score: ${analysis.health_score}/100`;
    
    try {
      await navigator.clipboard.writeText(shareText);
      alert("Verdict copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleScan = () => {
    setViewState('scanning');
    setTimeout(() => {
      performAnalysis(inputText);
    }, 1500);
  };

  const reset = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setViewState('idle');
    setInputText('');
    setAnalysis(null);
    setActiveCard(null);
    setChatOpen(false);
    setAlternative(null);
  };

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {(viewState === 'scanning' || viewState === 'analyzing') && <ScanningOverlay message={LOADING_MESSAGES[loadingStep]} />}

      <Header reset={reset} currentDiet={dietaryProfile} setDiet={setDietaryProfile} />

      {viewState === 'idle' && (
        <div className="max-w-4xl mx-auto p-6 flex flex-col items-center min-h-[60vh] justify-center">
          
          <div className="text-center space-y-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div 
              onClick={triggerFileInput} 
              className="inline-block relative group cursor-pointer"
            >
              {/* Hidden File Input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment" 
                onChange={handleImageUpload}
              />
              
              <div className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl shadow-slate-200 group-hover:scale-105 transition-transform duration-300">
                <Camera className="w-12 h-12 text-emerald-600" />
                <div className="absolute -bottom-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <Scan className="w-3 h-3" />
                  AI-Lens
                </div>
              </div>
            </div>
            
            <div className="space-y-3 max-w-lg mx-auto">
              <h2 className="text-4xl font-bold text-slate-800 tracking-tight">What are you eating?</h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                Tap the Lens to scan packaging, or paste text below.<br/>
                <span className="text-emerald-600 font-medium">Decode ingredients instantly.</span>
              </p>
            </div>
          </div>

          {/* Input Zone */}
          <div className="w-full max-w-2xl space-y-6 bg-white p-2 rounded-3xl shadow-xl shadow-slate-200/50 z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <div className="relative group">
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste ingredients here..."
                className="w-full h-40 p-6 bg-slate-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none resize-none text-base transition-all placeholder:text-slate-400"
              />
              <button 
                onClick={handleScan}
                disabled={!inputText}
                className="absolute bottom-4 right-4 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 active:scale-95"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* History Section */}
          {scanHistory.length > 0 && (
            <div className="w-full max-w-2xl mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                  <History className="w-4 h-4" />
                  <span>Recent Scans</span>
                </div>
                <button onClick={clearHistory} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scanHistory.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="bg-white p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{item.emoji}</span>
                        <span className="font-semibold text-slate-700 text-sm">{item.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{item.verdict}</p>
                    </div>
                    <div className={`
                      text-xs font-bold px-2 py-1 rounded-full
                      ${item.score > 70 ? 'bg-emerald-100 text-emerald-700' : item.score > 40 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}
                    `}>
                      {item.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

           {/* Demo Pills */}
           <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Try a Demo Scan
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {Object.entries(DEMO_SCENARIOS).map(([label, text]) => (
                  <button
                    key={label}
                    onClick={() => setInputText(text)}
                    className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-full text-sm font-medium transition-all border border-slate-200 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-md"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
        </div>
      )}

      {viewState === 'result' && analysis && (
        <div className="max-w-3xl mx-auto p-6 space-y-6 animate-in slide-in-from-bottom-10 duration-500 pb-32">
          
          {/* Top Verdict Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col gap-1">
                <span className="bg-white/10 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-md self-start">
                    {analysis.product_category_guess}
                </span>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider pl-1 pt-1">
                    {dietaryProfile} View
                </span>
              </div>
              <div className="flex gap-3">
                 {/* Share Button */}
                 <button 
                  onClick={handleShare}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors backdrop-blur-md"
                  title="Copy Verdict"
                >
                  <Share2 className="w-6 h-6 text-white" />
                </button>
                 {/* TTS Button */}
                 <button 
                  onClick={playAudioSummary}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors backdrop-blur-md"
                >
                  {isPlayingAudio ? <StopCircle className="w-6 h-6 text-emerald-400" /> : <Volume2 className="w-6 h-6 text-white" />}
                </button>
                <span className="text-5xl">{analysis.verdict_emoji}</span>
              </div>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4 max-w-lg">
              {analysis.verdict_short}
            </h2>
            
            <div className="flex gap-8 mt-8 border-t border-white/10 pt-6">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Health Score</p>
                <div className="text-3xl font-bold text-emerald-400">{analysis.health_score}/100</div>
              </div>
              <div className="w-px bg-white/10"></div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Processing</p>
                <div className="text-xl font-semibold text-white">{analysis.processing_level}</div>
              </div>
              <div className="w-px bg-white/10 hidden sm:block"></div>
              <div className="hidden sm:block">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Density</p>
                <div className="text-xl font-semibold text-white">{analysis.nutritional_density}</div>
              </div>
            </div>
          </div>

          {/* The "Co-Pilot" Insight */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <h3 className="text-xl font-bold text-slate-800">AI Analysis</h3>
            </div>
            <p className="text-slate-600 leading-relaxed text-lg">
              {analysis.executive_summary}
            </p>
            <div className="mt-6 p-5 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-xs font-bold text-purple-700 mb-2 uppercase tracking-wide">Intent Check</p>
              <p className="text-purple-800 text-base italic">"{analysis.intent_inference}"</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature: Better Alternative ✨ */}
            {analysis.health_score < 70 && (
              <div className="space-y-3">
                {!alternative ? (
                  <button 
                      onClick={generateAlternative}
                      disabled={isAltLoading}
                      className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-medium hover:bg-emerald-100 transition-colors"
                  >
                      {isAltLoading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <ThumbsUp className="w-8 h-8" />}
                      <span>{isAltLoading ? "Finding healthier option..." : "Find a Better Alternative ✨"}</span>
                  </button>
                ) : (
                    <div className="h-full bg-emerald-50 border border-emerald-100 rounded-2xl p-6 animate-in fade-in slide-in-from-top-2">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-emerald-800 text-lg">Try this instead:</h4>
                        <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-1 rounded-full">Better Choice</span>
                      </div>
                      <p className="text-xl font-bold text-slate-800 mb-2">{alternative.name}</p>
                      <p className="text-sm text-slate-600 mb-4">{alternative.reason}</p>
                      <div className="text-sm font-medium text-emerald-700 flex items-center gap-2 bg-white/50 p-2 rounded-lg">
                          <CheckCircle className="w-4 h-4" />
                          {alternative.key_swap}
                      </div>
                    </div>
                )}
              </div>
            )}

            {/* Uncertainty / Honesty Module */}
            {analysis.uncertainties && analysis.uncertainties.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-amber-800">Uncertainty Log</h3>
                </div>
                <p className="text-sm text-amber-700 mb-3">
                  To be honest, I'm making some assumptions here:
                </p>
                <ul className="list-disc list-inside text-sm text-amber-700 space-y-2">
                  {analysis.uncertainties.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Ingredient Breakdown */}
          <div>
            <h3 className="font-bold text-slate-800 mb-4 px-1 text-lg">Key Components</h3>
            <div className="space-y-3">
              {analysis.ingredients_breakdown.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActiveCard(activeCard === idx ? null : idx)}
                  className={`
                    rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden
                    ${activeCard === idx ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'bg-white border-slate-100 hover:border-slate-300'}
                  `}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-3 h-3 rounded-full flex-shrink-0
                        ${item.risk_level === 'Safe' ? 'bg-emerald-500' : item.risk_level === 'Caution' ? 'bg-amber-500' : 'bg-rose-500'}
                      `}></div>
                      <span className="font-semibold text-slate-700 text-lg">{item.name}</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${activeCard === idx ? 'rotate-90' : ''}`} />
                  </div>
                  
                  {/* Expandable Details */}
                  {activeCard === idx && (
                    <div className="px-4 pb-4 pt-0 text-base text-slate-600 animate-in slide-in-from-top-2 ml-7">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="mb-2"><span className="font-medium text-slate-900">Category:</span> {item.category}</p>
                        <p className="leading-relaxed">{item.reasoning}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feature: Chat Assistant ✨ */}
          <div className="pt-8 border-t border-slate-200">
             <button 
               onClick={() => setChatOpen(!chatOpen)}
               className="w-full flex items-center justify-between p-5 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-colors"
             >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-6 h-6" />
                  <span className="font-semibold text-lg">Ask NutriNode ✨</span>
                </div>
                <ChevronRight className={`w-6 h-6 transition-transform ${chatOpen ? 'rotate-90' : ''}`} />
             </button>
             
             {chatOpen && (
               <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md animate-in slide-in-from-top-2">
                  <div className="p-6 bg-slate-50 max-h-96 overflow-y-auto space-y-4">
                     {/* Suggested Questions Chips (New Feature) */}
                     {analysis.suggested_questions && analysis.suggested_questions.length > 0 && chatHistory.length === 0 && (
                        <div className="mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Suggested for you</p>
                            <div className="flex flex-wrap gap-2">
                                {analysis.suggested_questions.map((q, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => handleChatSubmit(null, q)}
                                        className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                     )}

                     {chatHistory.length === 0 && !analysis.suggested_questions && (
                        <p className="text-sm text-slate-400 text-center italic py-4">
                          Ask me about allergens, diet compatibility, or specific ingredients.
                        </p>
                     )}
                     {chatHistory.map((msg, idx) => (
                       <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`
                            max-w-[85%] p-4 rounded-2xl text-base leading-relaxed
                            ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}
                          `}>
                            {msg.text}
                          </div>
                       </div>
                     ))}
                     {isChatLoading && (
                       <div className="flex justify-start">
                          <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm">
                             <div className="flex gap-2">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                             </div>
                          </div>
                       </div>
                     )}
                  </div>
                  <form onSubmit={(e) => handleChatSubmit(e)} className="p-4 border-t border-slate-100 flex gap-3 bg-white">
                     <input 
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask a follow-up..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                     />
                     <button 
                        type="submit" 
                        disabled={!chatInput.trim() || isChatLoading}
                        className="p-3 bg-emerald-500 text-white rounded-xl disabled:opacity-50 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                     >
                        <Send className="w-5 h-5" />
                     </button>
                  </form>
               </div>
             )}
          </div>

          <button 
            onClick={reset}
            className="w-full py-4 text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            Scan Another Product
          </button>
        </div>
      )}

      {viewState === 'error' && (
        <div className="max-w-md mx-auto p-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
          <div className="bg-rose-50 p-4 rounded-full mb-6">
             <AlertTriangle className="w-12 h-12 text-rose-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Analysis Failed</h3>
          <p className="text-slate-500 mb-8 text-lg">We couldn't make sense of those ingredients (or the image was unclear). Please try again.</p>
          <button 
            onClick={reset}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default NutriNode;