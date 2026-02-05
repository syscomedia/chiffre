'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import Sidebar from '@/components/Sidebar';
import {
    Mic, Send, Bot, User, Sparkles,
    Phone, PhoneOff, X,
    MessageSquare, History, Wand2,
    Repeat, Volume2, VolumeX, Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GET_AI_CONTEXT = gql`
  query GetAiContext($startDate: String!, $endDate: String!) {
    # Daily statistics for the period
    getChiffresByRange(startDate: $startDate, endDate: $endDate) {
      date
      recette_de_caisse
      total_diponce
      recette_net
      espaces
      cheque_bancaire
      tpe
      tpe2
      tickets_restaurant
      offres
      extra
      primes
    }

    # Global payment statistics
    getPaymentStats(startDate: $startDate, endDate: $endDate) {
      totalUnpaidInvoices
      totalRecetteNette
      totalExpenses
      totalFacturesPayees
      totalTPE
      totalCheque
      totalCash
      totalTicketsRestaurant
      totalBankDeposits
      totalRiadhExpenses
      totalOffres
    }

    # All invoices (suppliers)
    allInvoices: getInvoices {
      id
      supplier_name
      amount
      status
      date
      paid_date
      payment_method
      payer
      category
    }

    # List of suppliers
    getSuppliers {
      id
      name
    }

    # Employees
    getEmployees {
      id
      name
      department
    }

    # Bank deposits
    getBankDeposits(startDate: $startDate, endDate: $endDate) {
      id
      amount
      date
    }

    # Paid users (salaries)
    getPaidUsers(startDate: $startDate, endDate: $endDate) {
      username
      amount
    }
  }
`;

export default function AiPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [callInput, setCallInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('En attente...');
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const [showKeyboard, setShowKeyboard] = useState(false);

    // Refs
    const isCallingRef = useRef(false);
    const recognitionRef = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const networkErrorCount = useRef(0);
    const callInputRef = useRef<HTMLInputElement>(null);

    // Date range for the last 30 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: contextData } = useQuery(GET_AI_CONTEXT, {
        variables: { startDate, endDate }
    });

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Keep ref in sync
    useEffect(() => {
        isCallingRef.current = isCalling;
    }, [isCalling]);

    const statsContext = useMemo(() => {
        if (!contextData?.getChiffresByRange) return [];
        return contextData.getChiffresByRange.map((d: any) => ({
            date: d.date,
            recette: parseFloat(d.recette_de_caisse) || 0,
            depenses: parseFloat(d.total_diponce) || 0,
            net: parseFloat(d.recette_net) || 0,
            especes: parseFloat(d.espaces) || 0,
            cheque: parseFloat(d.cheque_bancaire) || 0,
            tpe: parseFloat(d.tpe) || 0,
            tickets: parseFloat(d.tickets_restaurant) || 0,
        }));
    }, [contextData]);

    // Process all data for AI context
    const aiContext = useMemo(() => {
        if (!contextData) return null;

        const invoices = contextData.allInvoices || [];
        const suppliers = contextData.getSuppliers || [];
        const employees = contextData.getEmployees || [];
        const bankDeposits = contextData.getBankDeposits || [];
        const paidUsers = contextData.getPaidUsers || [];
        const paymentStats = contextData.getPaymentStats || {};

        // Calculate unpaid total
        const unpaidTotal = invoices
            .filter((inv: any) => inv.status === 'unpaid')
            .reduce((acc: number, inv: any) => acc + (parseFloat(inv.amount) || 0), 0);

        // Calculate paid total
        const paidTotal = invoices
            .filter((inv: any) => inv.status === 'paid')
            .reduce((acc: number, inv: any) => acc + (parseFloat(inv.amount) || 0), 0);

        // Group invoices by supplier
        const supplierTotals: Record<string, { paid: number; unpaid: number; total: number; count: number }> = {};
        invoices.forEach((inv: any) => {
            const name = inv.supplier_name || 'Inconnu';
            const amount = parseFloat(inv.amount) || 0;
            if (!supplierTotals[name]) {
                supplierTotals[name] = { paid: 0, unpaid: 0, total: 0, count: 0 };
            }
            supplierTotals[name].total += amount;
            supplierTotals[name].count++;
            if (inv.status === 'paid') {
                supplierTotals[name].paid += amount;
            } else {
                supplierTotals[name].unpaid += amount;
            }
        });

        // Calculate bank deposits total
        const bankDepositsTotal = bankDeposits.reduce((acc: number, d: any) => acc + (parseFloat(d.amount) || 0), 0);

        // Calculate salaries total
        const salariesTotal = paidUsers.reduce((acc: number, u: any) => acc + (u.amount || 0), 0);

        return {
            invoices,
            suppliers: suppliers.map((s: any) => s.name),
            employees: employees.map((e: any) => e.name),
            supplierTotals,
            unpaidTotal,
            paidTotal,
            bankDepositsTotal,
            salariesTotal,
            paidUsers,
            paymentStats,
            stats: statsContext
        };
    }, [contextData, statsContext]);

    // Debug log
    useEffect(() => {
        if (aiContext) {
            console.log('=== AI Context Ready ===');
            console.log('Invoices:', aiContext.invoices.length);
            console.log('Suppliers:', aiContext.suppliers.length);
            console.log('Employees:', aiContext.employees.length);
            console.log('Unpaid Total:', aiContext.unpaidTotal.toFixed(3), 'DT');
            console.log('Paid Total:', aiContext.paidTotal.toFixed(3), 'DT');
        }
    }, [aiContext]);

    // Speech synthesis function with better French voice
    const speakText = (text: string) => {
        return new Promise<void>((resolve) => {
            if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
                resolve();
                return;
            }

            window.speechSynthesis.cancel();

            // Clean text for better speech
            let cleanText = text
                .replace(/[*#_`\[\]]/g, '')  // Remove markdown
                .replace(/\n+/g, '. ')        // Replace newlines with pauses
                .replace(/\s+/g, ' ')         // Normalize spaces
                .replace(/DT/g, 'dinars tunisiens')
                .replace(/(\d+)\.(\d{3})/g, '$1 virgule $2')  // 19857.834 -> 19857 virgule 834
                .replace(/(\d+)\.(\d{2})/g, '$1 virgule $2')   // 100.50 -> 100 virgule 50
                .replace(/(\d+),(\d+)/g, '$1 virgule $2')      // Handle comma decimals
                .trim();

            // Limit length for better quality
            if (cleanText.length > 300) {
                cleanText = cleanText.substring(0, 300) + '...';
            }

            if (!cleanText) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(cleanText);

            // Get voices
            const voices = window.speechSynthesis.getVoices();

            // Find best French voice - prefer natural/premium voices
            const premiumFrVoice = voices.find(v =>
                v.lang === 'fr-FR' &&
                (v.name.toLowerCase().includes('natural') ||
                    v.name.toLowerCase().includes('premium') ||
                    v.name.toLowerCase().includes('neural'))
            );
            const googleFrVoice = voices.find(v => v.lang === 'fr-FR' && v.name.toLowerCase().includes('google'));
            const microsoftFrVoice = voices.find(v => v.lang === 'fr-FR' && v.name.toLowerCase().includes('microsoft'));
            const anyFrFRVoice = voices.find(v => v.lang === 'fr-FR');
            const anyFrVoice = voices.find(v => v.lang.startsWith('fr'));

            const selectedVoice = premiumFrVoice || googleFrVoice || microsoftFrVoice || anyFrFRVoice || anyFrVoice;

            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log('Voice:', selectedVoice.name);
            }

            utterance.lang = 'fr-FR';
            utterance.rate = 1.0;   // Normal speed
            utterance.pitch = 1.05; // Slightly higher pitch sounds more natural
            utterance.volume = 1.0;

            let started = false;

            utterance.onstart = () => {
                started = true;
                setIsSpeaking(true);
                setVoiceStatus('🔊 AI parle...');
            };

            utterance.onend = () => {
                setIsSpeaking(false);
                setVoiceStatus('Prêt');
                resolve();
            };

            utterance.onerror = () => {
                setIsSpeaking(false);
                resolve();
            };

            setTimeout(() => {
                try {
                    window.speechSynthesis.speak(utterance);
                    setTimeout(() => {
                        if (!started) resolve();
                    }, 2000);
                } catch {
                    resolve();
                }
            }, 100);
        });
    };

    // Speech recognition function
    const startListening = () => {
        if (!micEnabled || typeof window === 'undefined') return;

        if (window.speechSynthesis?.speaking) {
            setTimeout(() => {
                if (isCallingRef.current) startListening();
            }, 500);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setMicEnabled(false);
            setShowKeyboard(true);
            setVoiceStatus('Micro non supporté - Utilisez le clavier');
            return;
        }

        // Cleanup
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { }
            recognitionRef.current = null;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            networkErrorCount.current = 0;
            setIsRecording(true);
            setVoiceStatus('🎤 Je vous écoute...');
        };

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            setIsRecording(false);
            networkErrorCount.current = 0;
            await sendMessageToAI(transcript);
        };

        recognition.onerror = (event: any) => {
            setIsRecording(false);

            if (event.error === 'aborted') return;

            if (event.error === 'network') {
                networkErrorCount.current++;

                if (networkErrorCount.current >= 3) {
                    // Disable mic after 3 network errors
                    setMicEnabled(false);
                    setShowKeyboard(true);
                    setVoiceStatus('⌨️ Utilisez le clavier (erreur réseau)');
                    networkErrorCount.current = 0;
                    return;
                }

                setVoiceStatus(`Reconnexion... (${networkErrorCount.current}/3)`);
                if (isCallingRef.current) {
                    setTimeout(() => startListening(), 2000);
                }
            } else if (event.error === 'no-speech') {
                setVoiceStatus('Aucune parole - Réessai...');
                if (isCallingRef.current) {
                    setTimeout(() => startListening(), 1500);
                }
            } else if (event.error === 'not-allowed') {
                setMicEnabled(false);
                setShowKeyboard(true);
                setVoiceStatus('⌨️ Micro bloqué - Utilisez le clavier');
            } else {
                if (isCallingRef.current) {
                    setTimeout(() => startListening(), 2000);
                }
            }
        };

        recognition.onend = () => {
            setIsRecording(false);
            recognitionRef.current = null;
        };

        setTimeout(() => {
            try {
                recognition.start();
                recognitionRef.current = recognition;
            } catch {
                if (isCallingRef.current) {
                    setTimeout(() => startListening(), 1000);
                }
            }
        }, 500);
    };

    // Send message to AI
    const sendMessageToAI = async (text: string) => {
        if (!text.trim()) return;

        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setCallInput('');
        setIsTyping(true);
        setVoiceStatus('🤔 AI réfléchit...');

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    context: aiContext,
                    history: messages.slice(-10)
                })
            });

            const data = await res.json();

            if (data.error) throw new Error(data.error);

            const aiResponse = data.result;
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
            setIsTyping(false);

            // If in call mode, speak and then listen
            if (isCallingRef.current) {
                if (voiceEnabled) {
                    await speakText(aiResponse);
                }
                setVoiceStatus('Prêt');

                // Start listening if mic is enabled
                if (isCallingRef.current && micEnabled) {
                    setTimeout(() => startListening(), 500);
                } else if (isCallingRef.current) {
                    setVoiceStatus('⌨️ Tapez votre message');
                    setShowKeyboard(true);
                    setTimeout(() => callInputRef.current?.focus(), 100);
                }
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'system', content: "Erreur: " + error.message }]);
            setIsTyping(false);
            setVoiceStatus('Erreur - Réessayez');

            if (isCallingRef.current && micEnabled) {
                setTimeout(() => startListening(), 2000);
            }
        }
    };

    // Start call
    const startCall = async () => {
        setIsCalling(true);
        isCallingRef.current = true;
        networkErrorCount.current = 0;
        setVoiceStatus('Initialisation...');

        const greeting = "Bonjour si riadh ! Je suis votre assistant Business Bey. Comment puis-je vous aider aujourd'hui?";
        setMessages(prev => [...prev, { role: 'assistant', content: greeting }]);

        if (voiceEnabled) {
            await speakText(greeting);
        }

        if (isCallingRef.current) {
            if (micEnabled) {
                startListening();
            } else {
                setShowKeyboard(true);
                setVoiceStatus('⌨️ Tapez votre message');
                setTimeout(() => callInputRef.current?.focus(), 100);
            }
        }
    };

    // Stop call
    const stopCall = () => {
        setIsCalling(false);
        isCallingRef.current = false;
        setIsRecording(false);
        setIsSpeaking(false);
        setVoiceStatus('En attente...');
        setShowKeyboard(false);
        setCallInput('');

        window.speechSynthesis?.cancel();

        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { }
            recognitionRef.current = null;
        }
    };

    // Handle call input send
    const handleCallSend = () => {
        if (callInput.trim()) {
            sendMessageToAI(callInput);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex overflow-hidden">
            <Sidebar role="admin" />

            <main className="flex-1 flex flex-col relative">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#c69f6e]/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4a3426]/10 rounded-full blur-[120px] pointer-events-none" />

                {/* Header */}
                <header className="px-4 md:px-8 py-4 md:py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-black/20 z-10">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-tr from-[#4a3426] to-[#c69f6e] p-[1px]">
                            <div className="w-full h-full bg-[#0a0a0a] rounded-[11px] md:rounded-[15px] flex items-center justify-center">
                                <Bot className="size-5 md:size-6 text-[#c69f6e]" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-sm md:text-xl font-black tracking-tight uppercase">AI Business Master</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-widest">Connecté</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setMessages([])}
                        className="p-2.5 md:p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-white/60 hover:text-white"
                    >
                        <Repeat size={16} />
                    </button>
                </header>

                {/* Chat Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-[160px] md:pb-40">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 md:space-y-12 px-4">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative">
                                <div className="absolute inset-0 bg-[#c69f6e]/20 blur-[60px] rounded-full" />
                                <Bot size={60} className="md:size-20 text-[#c69f6e] relative z-10" />
                            </motion.div>

                            <div className="space-y-3 md:space-y-4">
                                <h2 className="text-2xl md:text-4xl font-black tracking-tighter">Comment puis-je vous aider ?</h2>
                                <p className="text-white/40 font-medium text-sm md:text-base">Cliquez sur un sujet ou tapez votre message.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full">
                                {[
                                    { title: "Statistiques d'aujourd'hui", icon: Sparkles },
                                    { title: "Total factures non payées", icon: MessageSquare },
                                    { title: "Rapport de performance", icon: Wand2 },
                                    { title: "Synthèse hebdomadaire", icon: History }
                                ].map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessageToAI(suggestion.title)}
                                        className="p-4 md:p-6 bg-white/[0.03] border border-white/5 hover:border-[#c69f6e]/30 hover:bg-white/[0.05] rounded-xl md:rounded-[2rem] text-left transition-all group"
                                    >
                                        <suggestion.icon size={18} className="md:size-5 text-[#c69f6e] mb-3 md:mb-4 group-hover:scale-110 transition-transform" />
                                        <span className="text-[11px] md:text-xs font-bold uppercase tracking-widest leading-relaxed">{suggestion.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#c69f6e] text-white' : 'bg-white/10 text-[#c69f6e]'}`}>
                                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={`max-w-[85%] md:max-w-[80%] p-4 md:p-6 rounded-2xl md:rounded-[2rem] text-[13px] md:text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#c69f6e]/10 border border-[#c69f6e]/20 text-[#c69f6e]' : 'bg-white/[0.03] border border-white/10 text-white/90 shadow-xl'}`}>
                                    {msg.content}
                                </div>
                            </motion.div>
                        ))
                    )}

                    {isTyping && (
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 text-[#c69f6e] flex items-center justify-center shrink-0">
                                <Bot size={20} />
                            </div>
                            <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] flex items-center gap-2">
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-[#c69f6e] rounded-full" />
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#c69f6e] rounded-full" />
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#c69f6e] rounded-full" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="absolute bottom-[88px] md:bottom-0 left-0 right-0 p-3 md:p-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/98 to-transparent pt-8 md:pt-12 z-20">
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Posez une question à l'IA..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && input.trim() && sendMessageToAI(input)}
                                className="w-full h-12 md:h-16 bg-white/[0.03] border border-white/10 rounded-xl md:rounded-3xl pl-4 md:pl-6 pr-12 md:pr-16 text-sm font-medium outline-none focus:border-[#c69f6e]/40 focus:bg-white/[0.05] transition-all"
                            />
                            <button
                                onClick={() => input.trim() && sendMessageToAI(input)}
                                disabled={!input.trim() || isTyping}
                                className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-[#c69f6e] hover:bg-[#c69f6e]/80 rounded-lg md:rounded-2xl text-white transition-all disabled:opacity-30"
                            >
                                <Send size={16} className="md:size-[18px]" />
                            </button>
                        </div>

                        <button
                            onClick={isCalling ? stopCall : startCall}
                            className={`h-12 md:h-16 px-5 md:px-8 rounded-xl md:rounded-3xl flex items-center justify-center gap-2 md:gap-3 font-black text-[9px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-[0.2em] transition-all shadow-2xl ${isCalling ? 'bg-red-500 text-white' : 'bg-white text-black hover:scale-105 active:scale-95'}`}
                        >
                            {isCalling ? <PhoneOff size={18} className="md:size-5" /> : <Phone size={18} className="md:size-5" />}
                            <span className="hidden sm:inline">{isCalling ? 'Fin' : 'Appeler IA'}</span>
                            <span className="sm:hidden">{isCalling ? 'Fin' : 'Appel'}</span>
                        </button>
                    </div>
                </div>

                {/* Call Overlay */}
                <AnimatePresence>
                    {isCalling && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center"
                        >
                            <button onClick={stopCall} className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full">
                                <X size={32} />
                            </button>

                            <div className="flex flex-col items-center gap-8 text-center px-4 w-full max-w-lg">
                                {/* Avatar */}
                                <div className="relative">
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.1, 0.2] }}
                                        transition={{ repeat: Infinity, duration: 3 }}
                                        className="absolute inset-0 bg-[#c69f6e] rounded-full blur-[60px]"
                                    />
                                    <div className="relative w-32 h-32 md:w-40 md:h-40 bg-gradient-to-tr from-[#4a3426] to-[#c69f6e] rounded-full p-[2px]">
                                        <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                                            {isSpeaking ? (
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map(i => (
                                                        <motion.div
                                                            key={i}
                                                            animate={{ height: [6, 24, 6] }}
                                                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                                            className="w-1 md:w-1.5 bg-[#c69f6e] rounded-full"
                                                        />
                                                    ))}
                                                </div>
                                            ) : isRecording ? (
                                                <motion.div
                                                    animate={{ scale: [1, 1.15, 1] }}
                                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                                >
                                                    <Mic className="size-8 md:size-12 text-red-500" />
                                                </motion.div>
                                            ) : (
                                                <Bot className="size-12 md:size-16 text-[#c69f6e]" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black uppercase">Business Bey AI</h2>
                                    <p className="text-lg font-bold text-[#c69f6e]">{voiceStatus}</p>
                                    {isTyping && <p className="text-white/50 text-sm">AI réfléchit...</p>}
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-3 md:gap-4 scale-90 md:scale-100">
                                    <button
                                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${voiceEnabled ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}
                                    >
                                        {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (micEnabled) {
                                                startListening();
                                            }
                                        }}
                                        disabled={isRecording || isSpeaking || isTyping || !micEnabled}
                                        className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-white/10 hover:bg-white/20 disabled:opacity-40'}`}
                                    >
                                        <Mic className="size-6 md:size-8" />
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowKeyboard(!showKeyboard);
                                            if (!showKeyboard) {
                                                setTimeout(() => callInputRef.current?.focus(), 100);
                                            }
                                        }}
                                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${showKeyboard ? 'bg-[#c69f6e] text-white' : 'bg-white/10 text-white'}`}
                                    >
                                        <Keyboard size={20} />
                                    </button>

                                    <button
                                        onClick={stopCall}
                                        className="w-16 h-16 md:w-20 md:h-20 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-105 transition-all"
                                    >
                                        <PhoneOff className="size-6 md:size-8" />
                                    </button>
                                </div>

                                {/* Keyboard Input */}
                                <AnimatePresence>
                                    {showKeyboard && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 20 }}
                                            className="w-full"
                                        >
                                            <div className="flex gap-2">
                                                <input
                                                    ref={callInputRef}
                                                    type="text"
                                                    placeholder="Tapez votre message..."
                                                    value={callInput}
                                                    onChange={e => setCallInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleCallSend()}
                                                    disabled={isTyping}
                                                    className="flex-1 h-14 bg-white/10 border border-white/20 rounded-2xl px-5 text-sm outline-none focus:border-[#c69f6e] transition-all"
                                                />
                                                <button
                                                    onClick={handleCallSend}
                                                    disabled={!callInput.trim() || isTyping}
                                                    className="h-14 px-6 bg-[#c69f6e] rounded-2xl disabled:opacity-30 transition-all"
                                                >
                                                    <Send size={20} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Last message preview */}
                                {messages.length > 0 && (
                                    <div className="w-full mt-4 p-4 bg-white/5 rounded-2xl max-h-32 overflow-y-auto">
                                        <p className="text-sm text-white/70">
                                            {messages[messages.length - 1]?.content}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
