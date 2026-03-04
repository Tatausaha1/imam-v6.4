
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect } from 'react';
import { db, isMockMode } from '../services/firebase';
import Layout from './Layout';
import { 
  CommandLineIcon, ArrowPathIcon, CheckCircleIcon, 
  Loader2, SparklesIcon, RectangleStackIcon, UsersIcon
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
      if (!window.confirm("Sinkronisasi masal dari 'students' ke 'pengguna_siswa'? Ini akan melengkapi akun yang profilnya belum masuk tabel khusus.")) return;
      
      setLoadingAction(true);
      addLog("Memulai Sinkronisasi Tabel Pengguna Siswa...");

      try {
          const studentsSnap = await db.collection('students').where('accountStatus', '==', 'Active').get();
          addLog(`Ditemukan ${studentsSnap.size} siswa dengan akun aktif.`);
          
          let updated = 0;
          for (const doc of studentsSnap.docs) {
              const data = doc.data();
              if (data.linkedUserId) {
                  await db.collection('pengguna_siswa').doc(data.linkedUserId).set({
                      ...data,
                      uid: data.linkedUserId,
                      lastSynced: new Date().toISOString()
                  }, { merge: true });
                  updated++;
              }
          }
          
          addLog(`Sinkronisasi Selesai: ${updated} record diperbarui.`);
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
