
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import { syncAllStudentsWithProfiles } from '../services/studentService';
import Layout from './Layout';
import { 
  CommandLineIcon, ArrowPathIcon, CheckCircleIcon, 
  Loader2, SparklesIcon, RectangleStackIcon, UsersIcon,
  ExclamationTriangleIcon, ShieldCheckIcon
} from './Ikon';
import { toast } from 'sonner';

interface DeveloperConsoleProps {
  onBack: () => void;
}

const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'database'>('overview');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const TABEL_SISTEM = [
      'users', 'students', 'teachers', 'classes', 'attendance', 
      'letters', 'schedules', 'journals', 'assignments', 'grades',
      'academic_years', 'settings', 'about_content', 
      'discipline_logs', 'violations_master', 'login_logs',
      'pengguna_siswa'
  ];

  const checkAllCollections = async () => {
    setConnectionStatus('checking');
    if (!db) return;
    try {
        const newStats: Record<string, number> = {};
        for (const col of TABEL_SISTEM) {
            const snap = await db.collection(col).limit(1).get();
            newStats[col] = snap.size; 
        }
        setStats(newStats);
        setConnectionStatus('connected');
        addLog(`Infrastruktur Terverifikasi: ${TABEL_SISTEM.length} Koleksi Terdeteksi.`);
    } catch (e: any) {
        setConnectionStatus('error');
        addLog(`Gagal Cek DB: ${e.message}`);
    }
  };

  const handleSyncStudentUsers = async () => {
      if (!db) return;
      if (!window.confirm("Sinkronisasi masal dari 'students' ke 'pengguna_siswa'? Ini akan melengkapi akun yang profilnya belum masuk tabel khusus dan menyelaraskan data di tabel 'users'.")) return;
      
      setLoadingAction(true);
      addLog("Memulai Sinkronisasi Tabel Pengguna Siswa...");

      try {
          const result = await syncAllStudentsWithProfiles((msg) => addLog(msg));
          
          addLog(`Sinkronisasi Selesai: ${result.updated} dari ${result.total} record diperbarui.`);
          toast.success("Sinkronisasi Selesai!");
          checkAllCollections();
      } catch (e: any) {
          addLog(`Error Sinkronisasi: ${e.message}`);
          toast.error("Gagal sinkronisasi.");
      } finally {
          setLoadingAction(false);
      }
  };

  const handleFullProvisioning = async () => {
    if (!db) return;
    if (!window.confirm("Inisialisasi tabel sistem? Data lama tetap aman.")) return;
    
    setLoadingAction(true);
    addLog("Memulai Protokol Provisioning Sistem IMAM v6.1...");

    try {
        const batch = db.batch();
        const userSiswaRef = db.collection('pengguna_siswa');
        const userSiswaSnap = await userSiswaRef.limit(1).get();
        if (userSiswaSnap.empty) {
            batch.set(userSiswaRef.doc('template-siswa'), {
                namaLengkap: 'TEMPLATE SISWA',
                nisn: '0000000000',
                idUnik: '00000',
                status: 'Sistem',
                createdAt: new Date().toISOString()
            });
            addLog("Tabel 'pengguna_siswa' diinisialisasi.");
        }
        await batch.commit();
        toast.success("Provisioning Selesai!");
        checkAllCollections();
    } catch (e: any) {
        addLog(`Kesalahan: ${e.message}`);
        toast.error("Provisioning gagal.");
    } finally {
        setLoadingAction(false);
    }
  };

  const handleResetAdmin = async () => {
      if (!auth || !db) return;
      if (!window.confirm("Coba inisialisasi ulang akun admin@admin.id? Ini hanya akan berhasil jika akun belum ada atau Anda ingin mendaftarkannya kembali.")) return;
      
      setLoadingAction(true);
      addLog("Mencoba inisialisasi akun admin@admin.id...");
      try {
          // Cek apakah dokumen di Firestore sudah ada
          const adminQuery = await db.collection('users').where('email', '==', 'admin@admin.id').get();
          if (!adminQuery.empty) {
              addLog(`Info: Ditemukan ${adminQuery.size} dokumen admin di Firestore.`);
          }

          await auth.createUserWithEmailAndPassword('admin@admin.id', 'admin123');
          addLog("Sukses: Akun admin@admin.id berhasil dibuat dengan password 'admin123'.");
          toast.success("Akun admin berhasil dibuat!");
      } catch (e: any) {
          if (e.code === 'auth/email-already-in-use') {
              addLog("Info: Akun admin@admin.id sudah ada di Firebase Auth.");
              toast.info("Akun sudah ada di Auth. Jika password 'admin123' tidak bisa, silakan hapus user di Firebase Console.");
          } else {
              addLog(`Error: ${e.message}`);
              toast.error("Gagal: " + e.message);
          }
      } finally {
          setLoadingAction(false);
      }
  };

  useEffect(() => { checkAllCollections(); }, []);

  return (
    <Layout title="Developer Console" subtitle="Manajemen Database Cloud" icon={CommandLineIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 space-y-8 max-w-5xl mx-auto w-full">
          <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit mb-4 shadow-inner">
              <button onClick={() => setActiveTab('overview')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' : 'text-slate-400'}`}>Health Check</button>
              <button onClick={() => setActiveTab('database')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'database' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' : 'text-slate-400'}`}>Skema Tabel</button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className={`p-8 rounded-[3rem] border flex flex-col md:flex-row items-center justify-between gap-8 bg-white dark:bg-[#151E32] border-slate-100 dark:border-slate-800`}>
                    <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-indigo-600 text-white shadow-xl transition-all`}>
                            <CheckCircleIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-lg">Konsol Kontrol</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Sinkronisasi Database Aktif</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={handleResetAdmin} disabled={loadingAction} className="px-6 py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                             {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheckIcon className="w-4 h-4" /> Reset Admin</>}
                        </button>
                        <button onClick={handleSyncStudentUsers} disabled={loadingAction} className="px-6 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                             {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UsersIcon className="w-4 h-4" /> Sinkron Akun Siswa</>}
                        </button>
                        <button onClick={handleFullProvisioning} disabled={loadingAction} className="px-6 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                            {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <><SparklesIcon className="w-4 h-4" /> Provisioning System</>}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {TABEL_SISTEM.map(col => (
                        <div key={col} className="bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className={`w-2 h-2 rounded-full ${stats[col] > 0 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-400'}`}></div>
                                <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">Firestore</span>
                            </div>
                            <h5 className="text-[9px] font-black text-slate-800 dark:text-white uppercase truncate">{col}</h5>
                            <p className="text-xl font-black text-indigo-600 mt-1">{stats[col] || 0}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-950 rounded-[2.5rem] p-8 font-mono text-[10px] h-64 overflow-y-auto border border-slate-800 shadow-2xl">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-4">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <span className="text-indigo-400 font-black uppercase tracking-widest">System Logs</span>
                    </div>
                    {logs.map((log, i) => (
                        <p key={i} className="text-slate-400 leading-relaxed mb-1"><span className="opacity-30">#</span> {log}</p>
                    ))}
                </div>

                {/* Database Index Fix Section */}
                <div className="p-8 rounded-[3rem] border border-amber-100 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                            <ExclamationTriangleIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <h4 className="font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight text-sm">Perbaikan Index Database</h4>
                            <p className="text-[9px] font-bold text-amber-700 dark:text-amber-500 uppercase mt-1 max-w-md">Jika riwayat login tidak muncul, Anda perlu mengaktifkan index komposit di Firebase Console.</p>
                        </div>
                    </div>
                    <a 
                        href="https://console.firebase.google.com/v1/r/project/studio-4774553931-88e8d/firestore/indexes?create_composite=Clpwcm9qZWN0cy9zdHVkaW8tNDc3NDU1MzkzMS04OGU4ZC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvbG9naW5fbG9ncy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgl0aW1lc3RhbXAQAhoMCghfX25hbWVfXxAC"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-amber-700 transition-all active:scale-95"
                    >
                        Klik Untuk Perbaiki Index
                    </a>
                </div>
            </div>
          )}

          {activeTab === 'database' && (
              <div className="py-24 text-center bg-white dark:bg-[#151E32] rounded-[3.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                  <RectangleStackIcon className="w-16 h-16 text-slate-100 dark:text-slate-800 mx-auto mb-6" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Skema Database Terenkripsi Aktif</p>
              </div>
          )}
      </div>
    </Layout>
  );
};

export default DeveloperConsole;
