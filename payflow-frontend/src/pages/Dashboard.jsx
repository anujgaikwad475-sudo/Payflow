import { useEffect, useState, useRef } from 'react';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  LogOut, 
  ShieldCheck, 
  KeyRound, 
  Wallet2, 
  Zap, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  Eye, 
  SendHorizontal, 
  X, 
  ArrowLeft, 
  QrCode, 
  ScanLine, 
  Camera, 
  PieChart,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { io } from 'socket.io-client';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [addAmount, setAddAmount] = useState('');
  const [transferData, setTransferData] = useState({ recipientIdentifier: '', amount: '', description: '', pin: '' });
  const [newPin, setNewPin] = useState('');
  const [hasPin, setHasPin] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Screen Modal State: null | 'BALANCE' | 'ADD_FUNDS' | 'SEND_MONEY' | 'HISTORY' | 'EXPENSE_TRACKER'
  const [activeWindow, setActiveWindow] = useState(null);

  // Send Money Sub-Tabs: 'MANUAL' | 'SCAN_QR' | 'MY_QR'
  const [sendTab, setSendTab] = useState('MANUAL');
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const controlsRef = useRef(null);

  const loadData = async () => {
    try {
      const [walletRes, txRes, pinRes] = await Promise.all([
        API.get('/wallet'),
        API.get('/wallet/transactions'),
        API.get('/wallet/pin-status'),
      ]);
      setBalance(walletRes.data.balance);
      setTransactions(txRes.data.data);
      setHasPin(pinRes.data.hasPin);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error fetching wallet data' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!userId) return;

    const host = window.location.hostname || 'localhost';
    const socket = io(`http://${host}:5001`);

    socket.emit('join_wallet', userId);

    socket.on('payment_received', (data) => {
      setBalance(data.newBalance);
      setMsg({
        type: 'success',
        text: `Incoming Credit: ₹${data.amount} received from ${data.senderName}`,
      });
      loadData();
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Handle QR Camera Scanner Lifecycle
  useEffect(() => {
    if (activeWindow === 'SEND_MONEY' && sendTab === 'SCAN_QR') {
      const codeReader = new BrowserMultiFormatReader();
      setCameraError('');
      setScannerActive(true);

      codeReader
        .decodeFromVideoDevice(undefined, videoRef.current, (result, error, controls) => {
          if (controls) controlsRef.current = controls;
          if (result) {
            const rawText = result.getText();
            let parsedIdentifier = rawText;

            try {
              const parsedJson = JSON.parse(rawText);
              if (parsedJson.payflowIdentifier || parsedJson.identifier) {
                parsedIdentifier = parsedJson.payflowIdentifier || parsedJson.identifier;
              }
            } catch {
              parsedIdentifier = rawText;
            }

            setTransferData((prev) => ({ ...prev, recipientIdentifier: parsedIdentifier }));
            if (controlsRef.current) controlsRef.current.stop();
            setScannerActive(false);
            setSendTab('MANUAL');
            setMsg({ type: 'success', text: `Recipient identified: ${parsedIdentifier}` });
          }
        })
        .catch(() => {
          setCameraError('Camera access unavailable. Please ensure permissions are granted.');
          setScannerActive(false);
        });

      return () => {
        if (controlsRef.current) controlsRef.current.stop();
        setScannerActive(false);
      };
    } else {
      if (controlsRef.current) controlsRef.current.stop();
      setScannerActive(false);
    }
  }, [activeWindow, sendTab]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSetPin = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/wallet/set-pin', { pin: newPin });
      setHasPin(true);
      setNewPin('');
      setMsg({ type: 'success', text: res.data.message });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to set PIN' });
    }
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await API.post('/wallet/add-money', { amount: Number(addAmount) });
      setBalance(res.data.balance);
      setAddAmount('');
      setMsg({ type: 'success', text: res.data.message });
      loadData();
      setActiveWindow(null);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Deposit failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await API.post('/wallet/transfer', {
        recipientIdentifier: transferData.recipientIdentifier,
        amount: Number(transferData.amount),
        description: transferData.description,
        pin: transferData.pin,
      });
      setTransferData({ recipientIdentifier: '', amount: '', description: '', pin: '' });
      setMsg({ type: 'success', text: res.data.message });
      loadData();
      setActiveWindow(null);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Transfer failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const sentTransactions = transactions.filter((tx) => tx.type === 'DEBIT');
  const receivedTransactions = transactions.filter((tx) => tx.type === 'CREDIT');
  const totalSent = sentTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  const totalReceived = receivedTransactions.reduce((acc, curr) => acc + curr.amount, 0);

  const myQrData = JSON.stringify({
    payflowIdentifier: user?.phone || user?.email,
    name: user?.name,
  });

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[#030712] text-slate-100 selection:bg-fuchsia-500 selection:text-white pb-20">
      {/* Dynamic Ambient Aurora Background Glows */}
      <div className="fixed -top-32 left-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-1/3 -right-20 w-[30rem] h-[30rem] bg-cyan-500/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed -bottom-20 left-10 w-[28rem] h-[28rem] bg-violet-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Glassmorphic Navigation Bar */}
      <nav className="border-b border-white/10 bg-slate-950/40 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-violet-500 to-cyan-400 p-[1.5px] shadow-lg shadow-fuchsia-500/20">
              <div className="h-full w-full bg-slate-950/80 rounded-[14px] flex items-center justify-center backdrop-blur-md">
                <Wallet2 className="text-cyan-300" size={22} />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 flex items-center gap-2">
                PayFlow 
                <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 text-fuchsia-300 border border-fuchsia-500/30 font-bold">
                  AURORA
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-white tracking-wide">{user?.name}</p>
              <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 transition duration-200 text-xs font-semibold backdrop-blur-lg shadow-sm"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Experience Hub */}
      <main className="max-w-6xl mx-auto px-6 pt-10 space-y-8 relative z-10">
        {/* Status Toast Banner */}
        {msg.text && (
          <div
            className={`p-4 rounded-2xl border backdrop-blur-xl flex items-center justify-between gap-3 shadow-2xl transition-all ${
              msg.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3 text-sm font-medium">
              {msg.type === 'error' ? <AlertTriangle size={18} className="text-rose-400 shrink-0" /> : <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
              <span>{msg.text}</span>
            </div>
            <button onClick={() => setMsg({ type: '', text: '' })} className="text-xs opacity-60 hover:opacity-100 uppercase tracking-wider font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Missing PIN Notice */}
        {!hasPin && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-violet-500/10 border border-amber-500/30 backdrop-blur-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                <KeyRound size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-200">Security PIN Missing</p>
                <p className="text-xs text-slate-300">Set a 4-digit PIN to enable instant P2P transfers.</p>
              </div>
            </div>
            <form onSubmit={handleSetPin} className="flex gap-2.5 w-full md:w-auto">
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                required
                className="w-28 text-center tracking-[0.3em] font-mono text-lg py-2.5 bg-slate-950/70 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-amber-400"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
              <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-300 hover:to-rose-300 text-slate-950 font-extrabold rounded-2xl text-sm transition shadow-lg shadow-amber-500/20">
                Save PIN
              </button>
            </form>
          </div>
        )}

        {/* Hero Greeting Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-semibold text-fuchsia-300 mb-2">
              <Sparkles size={14} /> Personal Wallet Hub
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              Welcome back, {user?.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1">Select an action to launch interactive floating windows</p>
          </div>

          {/* Quick Balance Preview Pill */}
          <div 
            onClick={() => setActiveWindow('BALANCE')}
            className="cursor-pointer group flex items-center gap-4 px-5 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition duration-200 backdrop-blur-xl shadow-lg"
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quick Balance</p>
              <p className="text-xl font-extrabold text-cyan-300 group-hover:text-cyan-200 transition font-mono">
                ₹{balance.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="h-8 w-8 rounded-xl bg-cyan-400/10 text-cyan-300 flex items-center justify-center border border-cyan-400/20 group-hover:scale-105 transition">
              <Eye size={16} />
            </div>
          </div>
        </div>

        {/* Action Hub Cards (Vibrant Aesthetic Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: View Balance */}
          <div
            onClick={() => setActiveWindow('BALANCE')}
            className="group cursor-pointer relative overflow-hidden rounded-3xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] hover:from-white/[0.09] hover:to-white/[0.04] border border-white/10 hover:border-cyan-400/50 transition-all duration-300 shadow-2xl flex flex-col justify-between"
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/20 rounded-full blur-2xl group-hover:bg-cyan-500/30 transition duration-300" />
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30 group-hover:scale-110 transition duration-200">
                <Eye size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-200 transition">View Balance</h3>
                <p className="text-xs text-slate-400 mt-0.5">Wallet funds & security status</p>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-cyan-300">
              <span>Inspect Funds</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition duration-200" />
            </div>
          </div>

          {/* Card 2: Add Funds */}
          <div
            onClick={() => setActiveWindow('ADD_FUNDS')}
            className="group cursor-pointer relative overflow-hidden rounded-3xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] hover:from-white/[0.09] hover:to-white/[0.04] border border-white/10 hover:border-emerald-400/50 transition-all duration-300 shadow-2xl flex flex-col justify-between"
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition duration-300" />
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30 group-hover:scale-110 transition duration-200">
                <PlusCircle size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-200 transition">Add Funds</h3>
                <p className="text-xs text-slate-400 mt-0.5">Top up your digital balance</p>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-emerald-300">
              <span>Simulate Deposit</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition duration-200" />
            </div>
          </div>

          {/* Card 3: Send Money */}
          <div
            onClick={() => {
              setActiveWindow('SEND_MONEY');
              setSendTab('MANUAL');
            }}
            className="group cursor-pointer relative overflow-hidden rounded-3xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] hover:from-white/[0.09] hover:to-white/[0.04] border border-white/10 hover:border-fuchsia-400/50 transition-all duration-300 shadow-2xl flex flex-col justify-between"
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-fuchsia-500/20 rounded-full blur-2xl group-hover:bg-fuchsia-500/30 transition duration-300" />
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-fuchsia-500/20 to-pink-500/20 text-fuchsia-300 flex items-center justify-center border border-fuchsia-400/30 group-hover:scale-110 transition duration-200">
                <SendHorizontal size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-fuchsia-200 transition">Send Money</h3>
                <p className="text-xs text-slate-400 mt-0.5">Scan QR or enter mobile/email</p>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-fuchsia-300">
              <span>Transfer with PIN</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition duration-200" />
            </div>
          </div>

          {/* Card 4: Expense Tracker */}
          <div
            onClick={() => setActiveWindow('EXPENSE_TRACKER')}
            className="group cursor-pointer relative overflow-hidden rounded-3xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] hover:from-white/[0.09] hover:to-white/[0.04] border border-white/10 hover:border-violet-400/50 transition-all duration-300 shadow-2xl flex flex-col justify-between"
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-violet-500/20 rounded-full blur-2xl group-hover:bg-violet-500/30 transition duration-300" />
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-violet-500/20 to-purple-500/20 text-violet-300 flex items-center justify-center border border-violet-400/30 group-hover:scale-110 transition duration-200">
                <PieChart size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-violet-200 transition">Expense Tracker</h3>
                <p className="text-xs text-slate-400 mt-0.5">Sent vs Received analytics</p>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-violet-300">
              <span>Split Outflows & Inflows</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition duration-200" />
            </div>
          </div>

          {/* Card 5: Full Transaction Ledger */}
          <div
            onClick={() => setActiveWindow('HISTORY')}
            className="group cursor-pointer relative overflow-hidden rounded-3xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] hover:from-white/[0.09] hover:to-white/[0.04] border border-white/10 hover:border-amber-400/50 transition-all duration-300 shadow-2xl flex flex-col justify-between sm:col-span-2 lg:col-span-2"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition duration-300" />
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-300 flex items-center justify-center border border-amber-400/30 group-hover:scale-110 transition duration-200">
                <History size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-200 transition">Transaction History</h3>
                <p className="text-xs text-slate-400 mt-0.5">All-time ledger timestamps and audit log</p>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-amber-300">
              <span>Browse Full Audit Ledger ({transactions.length} entries)</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition duration-200" />
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FLOATING GLASS WINDOW MODALS                                              */}
      {/* ========================================================================= */}
      {activeWindow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-2xl">
          
          {/* WINDOW 1: BALANCE */}
          {activeWindow === 'BALANCE' && (
            <div className="w-full max-w-lg bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-3xl overflow-hidden">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <button
                  onClick={() => setActiveWindow(null)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft size={16} /> Back to Hub
                </button>
                <button onClick={() => setActiveWindow(null)} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
                  <X size={20} />
                </button>
              </div>

              <div className="text-center py-6">
                <div className="h-16 w-16 mx-auto mb-4 rounded-3xl bg-cyan-500/10 text-cyan-300 flex items-center justify-center border border-cyan-400/30 shadow-inner">
                  <Eye size={32} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-300/80">Available Liquid Funds</span>
                <div className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-teal-200 to-white mt-2 font-mono">
                  ₹{balance.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="mt-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Account Owner</span>
                  <span className="font-semibold text-white">{user?.name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Registered Contact</span>
                  <span className="font-mono text-cyan-300">{user?.phone || user?.email}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Security State</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> PIN Protected
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleManualRefresh}
                  className="flex-1 py-3.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-white/10 transition"
                >
                  <RotateCw size={15} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
                  Refresh
                </button>
                <button
                  onClick={() => setActiveWindow('ADD_FUNDS')}
                  className="flex-1 py-3.5 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-extrabold rounded-2xl text-xs transition shadow-lg shadow-cyan-500/20"
                >
                  Deposit Money
                </button>
              </div>
            </div>
          )}

          {/* WINDOW 2: ADD FUNDS */}
          {activeWindow === 'ADD_FUNDS' && (
            <div className="w-full max-w-lg bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-3xl overflow-hidden">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <button
                  onClick={() => setActiveWindow(null)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft size={16} /> Back to Hub
                </button>
                <button onClick={() => setActiveWindow(null)} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <PlusCircle size={22} className="text-emerald-400" /> Instant Bank Deposit
                </h2>
                <p className="text-xs text-slate-400 mt-1">Simulate an external bank credit into your PayFlow balance.</p>
              </div>

              <form onSubmit={handleAddMoney} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Deposit Sum (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-500 font-bold text-lg">₹</span>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="500"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/15 rounded-2xl text-white text-base focus:outline-none focus:border-emerald-400 font-mono transition"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {[200, 500, 1000, 2500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAddAmount(preset.toString())}
                      className="flex-1 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-xs font-bold text-emerald-300 border border-emerald-500/30 transition"
                    >
                      +₹{preset}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold rounded-2xl text-sm transition shadow-lg shadow-emerald-500/25 disabled:opacity-50 mt-2"
                >
                  {isLoading ? 'Crediting Wallet...' : 'Confirm Deposit'}
                </button>
              </form>
            </div>
          )}

          {/* WINDOW 3: SEND MONEY */}
          {activeWindow === 'SEND_MONEY' && (
            <div className="w-full max-w-lg bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-3xl overflow-hidden">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <button
                  onClick={() => {
                    if (controlsRef.current) controlsRef.current.stop();
                    setActiveWindow(null);
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft size={16} /> Back to Hub
                </button>
                <button
                  onClick={() => {
                    if (controlsRef.current) controlsRef.current.stop();
                    setActiveWindow(null);
                  }}
                  className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Glowing Tab Pills */}
              <div className="flex p-1 mb-6 rounded-2xl bg-white/[0.04] border border-white/10">
                <button
                  onClick={() => setSendTab('MANUAL')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    sendTab === 'MANUAL' ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <SendHorizontal size={14} /> Transfer
                </button>
                <button
                  onClick={() => setSendTab('SCAN_QR')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    sendTab === 'SCAN_QR' ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ScanLine size={14} /> Scan QR
                </button>
                <button
                  onClick={() => setSendTab('MY_QR')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    sendTab === 'MY_QR' ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode size={14} /> My Code
                </button>
              </div>

              {/* Tab 1: Manual Transfer Form */}
              {sendTab === 'MANUAL' && (
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Recipient Identifier (Email or Phone)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="name@example.com or 9876543210"
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/15 rounded-2xl text-white text-sm focus:outline-none focus:border-fuchsia-400 transition"
                      value={transferData.recipientIdentifier}
                      onChange={(e) => setTransferData({ ...transferData, recipientIdentifier: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Amount (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-slate-500 font-bold text-sm">₹</span>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Amount"
                          className="w-full pl-8 pr-3 py-2.5 bg-white/[0.03] border border-white/15 rounded-2xl text-white text-sm focus:outline-none focus:border-fuchsia-400 font-mono transition"
                          value={transferData.amount}
                          onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        4-Digit PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        required
                        placeholder="••••"
                        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/15 rounded-2xl text-white text-center tracking-[0.3em] font-mono text-sm focus:outline-none focus:border-fuchsia-400 transition"
                        value={transferData.pin}
                        onChange={(e) => setTransferData({ ...transferData, pin: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Dinner, split bill, coffee..."
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/15 rounded-2xl text-white text-sm focus:outline-none focus:border-fuchsia-400 transition"
                      value={transferData.description}
                      onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-4 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-violet-500 hover:opacity-90 text-white font-extrabold rounded-2xl text-sm transition shadow-lg shadow-fuchsia-500/30 disabled:opacity-50"
                  >
                    {isLoading ? 'Authorizing...' : 'Authorize & Transfer'}
                  </button>
                </form>
              )}

              {/* Tab 2: Live Camera QR Scanner */}
              {sendTab === 'SCAN_QR' && (
                <div className="text-center py-3">
                  <div className="relative w-full max-w-xs mx-auto aspect-square rounded-3xl overflow-hidden bg-black border-2 border-dashed border-fuchsia-400/60 shadow-inner flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-4 border-fuchsia-500/40 pointer-events-none rounded-3xl animate-pulse" />
                    {!scannerActive && !cameraError && (
                      <div className="absolute flex flex-col items-center gap-2 text-slate-400 text-xs">
                        <Camera size={24} className="text-fuchsia-400 animate-bounce" />
                        <span>Initializing Camera Stream...</span>
                      </div>
                    )}
                  </div>

                  {cameraError ? (
                    <div className="p-3.5 mt-4 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl">
                      {cameraError}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4 font-medium">
                      Position a PayFlow QR code inside the viewfinder box.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 3: Receiver QR Code */}
              {sendTab === 'MY_QR' && (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400 mb-4">Share your personal matrix code to receive instant credits</p>
                  <div className="inline-block p-5 bg-white rounded-3xl shadow-2xl border-4 border-fuchsia-400/40">
                    <QRCodeSVG
                      value={myQrData}
                      size={210}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="mt-5">
                    <p className="text-base font-extrabold text-white">{user?.name}</p>
                    <p className="text-xs text-fuchsia-400 font-mono mt-0.5">{user?.phone || user?.email}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WINDOW 4: EXPENSE TRACKER */}
          {activeWindow === 'EXPENSE_TRACKER' && (
            <div className="w-full max-w-5xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="absolute -top-20 -right-20 w-56 h-56 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
                <button
                  onClick={() => setActiveWindow(null)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft size={16} /> Back to Hub
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleManualRefresh}
                    title="Refresh Ledger"
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 transition"
                  >
                    <RotateCw size={15} className={isRefreshing ? 'animate-spin text-violet-400' : ''} />
                  </button>
                  <button onClick={() => setActiveWindow(null)} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Expense Tracker Header */}
              <div className="mb-6 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center border border-violet-500/30">
                    <PieChart size={18} />
                  </div>
                  <h2 className="text-xl font-extrabold text-white">Expense & Cash Flow Ledger</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Categorized split of debited payouts and incoming peer credits.
                </p>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-4 mt-5">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 to-pink-500/5 border border-rose-500/30">
                    <span className="text-[11px] font-bold text-rose-300 uppercase tracking-widest">Total Outflow (Sent)</span>
                    <p className="text-3xl font-extrabold text-rose-200 mt-0.5 font-mono">₹{totalSent.toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{sentTransactions.length} debit transfers</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/30">
                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest">Total Inflow (Received)</span>
                    <p className="text-3xl font-extrabold text-emerald-200 mt-0.5 font-mono">₹{totalReceived.toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{receivedTransactions.length} credit transfers</p>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Dual Ledger View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1">
                
                {/* Column 1: Money Sent */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md py-1.5 border-b border-rose-500/20 z-10">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                      <ArrowUpRight size={16} /> Money Sent
                    </span>
                    <span className="text-[10px] text-rose-300 bg-rose-500/15 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">
                      {sentTransactions.length} Outbound
                    </span>
                  </div>

                  {sentTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      No sent transactions recorded yet.
                    </div>
                  ) : (
                    sentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/[0.04] transition flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white">To: {tx.party}</p>
                          <p className="text-xs text-slate-400">{tx.description || 'P2P Transfer'}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })} at {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-rose-300 font-mono">-₹{tx.amount.toLocaleString('en-IN')}</span>
                          <p className="text-[10px] text-slate-500 uppercase mt-0.5 font-bold">Debited</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Column 2: Money Received */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md py-1.5 border-b border-emerald-500/20 z-10">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <ArrowDownLeft size={16} /> Money Received
                    </span>
                    <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                      {receivedTransactions.length} Inbound
                    </span>
                  </div>

                  {receivedTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      No incoming transfers recorded yet.
                    </div>
                  ) : (
                    receivedTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] transition flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white">From: {tx.party}</p>
                          <p className="text-xs text-slate-400">{tx.description || 'Direct Credit'}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })} at {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-emerald-300 font-mono">+₹{tx.amount.toLocaleString('en-IN')}</span>
                          <p className="text-[10px] text-slate-500 uppercase mt-0.5 font-bold">Credited</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          )}

          {/* WINDOW 5: TRANSACTION HISTORY */}
          {activeWindow === 'HISTORY' && (
            <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-3xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
                <button
                  onClick={() => setActiveWindow(null)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft size={16} /> Back to Hub
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleManualRefresh}
                    title="Refresh Transactions"
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 transition"
                  >
                    <RotateCw size={15} className={isRefreshing ? 'animate-spin text-amber-400' : ''} />
                  </button>
                  <button onClick={() => setActiveWindow(null)} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="mb-4 shrink-0">
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <History size={22} className="text-amber-300" /> Unified Transaction Ledger
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{transactions.length} total events on record</p>
              </div>

              <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                {transactions.length === 0 ? (
                  <div className="py-16 text-center">
                    <History size={28} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-medium text-slate-400">Ledger is clean</p>
                    <p className="text-xs text-slate-600 mt-1">Start by adding funds or executing transfers.</p>
                  </div>
                ) : (
                  transactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT';
                    return (
                      <div
                        key={tx.id}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                              isCredit
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white">{tx.party}</p>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  isCredit
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {tx.type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {tx.description} • {new Date(tx.timestamp).toLocaleDateString()} at{' '}
                              {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-base font-extrabold tracking-tight font-mono ${
                              isCredit ? 'text-emerald-300' : 'text-slate-200'
                            }`}
                          >
                            {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Settled</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}