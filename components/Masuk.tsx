
import React, { useState, useEffect } from 'react';
import { LockIcon, ArrowRightIcon, Loader2, ShieldCheckIcon, AppLogo, EnvelopeIcon, ArrowPathIcon } from './Ikon';
import { UserRole } from '../types';
import { auth, db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
import firebaseConfig from '../firebase-applet-config.json';

interface MasukProps {
  onLogin: (role: UserRole) => void;
  onRegisterClick?: () => void; // Tambahan
}

const Masuk: React.FC<MasukProps> = ({ onLogin, onRegisterClick }) => {
  // Set default ke admin@admin.id sesuai permintaan
  const [email, setEmail] = useState('admin@admin.id');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const u = email.trim();
    const p = password.trim();

    // --- LOGIKA LOGIN SIMULASI (Mock Mode) ---
    if (isMockMode) {
      setTimeout(() => {
        const lowerU = u.toLowerCase();
        let detectedRole = UserRole.GURU;
        
        // Prioritas deteksi admin@admin.id
        if (lowerU === 'admin@admin.id' || lowerU.includes('admin')) {
            detectedRole = UserRole.ADMIN;
        } else if (lowerU.includes('siswa')) {
            detectedRole = UserRole.SISWA;
        } else if (lowerU.includes('dev')) {
            detectedRole = UserRole.DEVELOPER;
        }
        
        onLogin(detectedRole);
        toast.success(`Mode Simulasi: Masuk sebagai ${detectedRole.toUpperCase()}`);
      }, 800);
      return;
    }

    // --- LOGIKA LOGIN REAL (FIREBASE) ---
    try {
        if (!auth || !db) throw new Error("Layanan database tidak tersedia.");
        
        // 1. Sign-in ke Firebase Auth
        let userCredential;
        try {
            console.log("Attempting login for:", u);
            userCredential = await auth.signInWithEmailAndPassword(u, p);
            console.log("Login successful:", userCredential.user?.uid);
        } catch (signInErr: any) {
            console.error("Sign-in error details:", signInErr.code, signInErr.message);
            
            // Jika akun admin@admin.id gagal login
            if (u === 'admin@admin.id') {
                if (signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/wrong-password') {
                    console.log("Admin account issue detected. Attempting auto-registration/reset...");
                    try {
                        userCredential = await auth.createUserWithEmailAndPassword(u, p);
                        toast.success("Akun Admin Utama berhasil diinisialisasi.");
                    } catch (createErr: any) {
                        console.error("Auto-registration failed:", createErr.code, createErr.message);
                        if (createErr.code === 'auth/email-already-in-use') {
                            setError('Password Admin salah. Silakan hubungi pengembang untuk reset.');
                            throw signInErr;
                        }
                        throw createErr;
                    }
                } else {
                    throw signInErr;
                }
            } else {
                throw signInErr;
            }
        }
        
        const user = userCredential.user;

        if (user) {
            // 2. Ambil peran (role) dari Firestore users collection
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const role = userDoc.data()?.role as UserRole || UserRole.GURU;
                onLogin(role);
                toast.success(`Selamat datang, ${user.displayName || 'Administrator'}`);
            } else {
                // Auto-provisioning dokumen Firestore untuk admin default jika belum ada
                if (u === 'admin@admin.id') {
                    const adminData = {
                        uid: user.uid,
                        displayName: 'Sistem Administrator',
                        email: u,
                        role: UserRole.ADMIN,
                        status: 'Active',
                        createdAt: new Date().toISOString()
                    };
                    await db.collection('users').doc(user.uid).set(adminData);
                    onLogin(UserRole.ADMIN);
                    toast.success("Profil Administrator dikonfigurasi.");
                } else {
                    // Default role untuk user lain yang baru daftar lewat login
                    onLogin(UserRole.GURU);
                }
            }
        }
    } catch (err: any) {
        setLoading(false);
        console.error("Login Error:", err.code, err.message);
        
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            setError('Email atau Password salah.');
        } else if (err.code === 'auth/too-many-requests') {
            setError('Terlalu banyak percobaan. Coba lagi nanti.');
        } else if (err.code === 'auth/network-request-failed') {
            setError('Koneksi internet bermasalah atau domain tidak diizinkan. Silakan periksa konfigurasi Firebase.');
            console.error("Network Error Details:", {
                apiKey: (firebaseConfig as any).apiKey,
                authDomain: (firebaseConfig as any).authDomain,
                projectId: (firebaseConfig as any).projectId
            });
        } else {
            setError('Gagal masuk: ' + (err.message || 'Kesalahan sistem'));
        }
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 relative overflow-hidden">
      
      {loading && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 dark:bg-[#020617]/95 backdrop-blur-xl animate-in fade-in duration-500">
              <div className="w-20 h-20 mb-8 animate-pulse">
                  <AppLogo className="w-full h-full drop-shadow-[0_0_20px_rgba(79,70,229,0.3)]" />
              </div>
              <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em]">Memverifikasi Otoritas...</p>
              </div>
          </div>
      )}

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-700 via-blue-600 to-indigo-900 relative items-center justify-center p-12 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="relative z-10 text-center max-w-lg">
              <div className="inline-flex mb-8">
                <AppLogo className="w-32 h-32" />
              </div>
              <h1 className="text-5xl font-black text-white mb-6 leading-tight tracking-tight text-shadow-xl">IMAM <br/>Digital Hub</h1>
              <p className="text-indigo-100 text-lg opacity-80 font-medium">Sistem Manajemen Terintegrasi MAN 1 Hulu Sungai Tengah.</p>
          </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative h-full">
        <div className="w-full max-w-sm z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="lg:hidden text-center mb-10">
                <AppLogo className="w-20 h-20 mx-auto" />
            </div>

            <div className="text-center lg:text-left">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Login Akses</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">IMAM School Management v6.2</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-4">
                    <div className="group">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Administrator</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                <EnvelopeIcon className="w-5 h-5" />
                            </div>
                            <input 
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
                                placeholder="admin@admin.id" required
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                <LockIcon className="w-5 h-5" />
                            </div>
                            <input 
                                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
                                placeholder="••••••••" required
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest flex flex-col gap-2 animate-bounce border border-red-100 dark:border-red-900/30">
                        <div className="flex items-center gap-3">
                            <ShieldCheckIcon className="w-4 h-4" /> {error}
                        </div>
                        {error.includes('Email atau Password salah') && (
                            <button 
                              type="button" 
                              onClick={async () => {
                                  if (!email) { toast.error("Masukkan email terlebih dahulu."); return; }
                                  try {
                                      await auth?.sendPasswordResetEmail(email);
                                      toast.success("Link reset password telah dikirim ke email Anda.");
                                  } catch (e: any) {
                                      toast.error("Gagal mengirim link reset: " + e.message);
                                  }
                              }}
                              className="text-indigo-600 dark:text-indigo-400 underline text-[9px] font-black uppercase tracking-widest text-left ml-7"
                            >
                                Lupa Password? Klik di sini
                            </button>
                        )}
                    </div>
                )}

                <button 
                    type="submit" disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                    <span className="uppercase tracking-[0.2em] text-xs relative z-10">Buka Sesi Admin</span>
                    <ArrowRightIcon className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
            </form>

            <div className="text-center pt-4">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Belum memiliki akun?</p>
                <button 
                  onClick={onRegisterClick}
                  className="px-8 py-3 bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                >
                    Daftar Akun Baru
                </button>
            </div>

            <div className="text-center mt-12">
                <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em]">MAN 1 Hulu Sungai Tengah</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Masuk;
