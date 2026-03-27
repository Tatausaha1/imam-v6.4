
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, isMockMode, auth } from '../services/firebase';
import { adminUpdatePassword } from '../services/authService';
import { Student, UserRole } from '../types';
import Layout from './Layout';
import { 
  UsersIcon, ShieldCheckIcon, Search, Loader2, 
  ArrowPathIcon, CheckCircleIcon, IdentificationIcon,
  LockIcon, PencilIcon, EnvelopeIcon, SaveIcon, XCircleIcon
} from './Ikon';
import { toast } from 'sonner';

const StudentUsers: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // State untuk Ubah Password (Admin)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [targetUid, setTargetUid] = useState('');
  const [targetName, setTargetName] = useState('');

  useEffect(() => {
    if (!db) return;
    setLoading(true);
    
    const unsubscribe = db.collection('pengguna_siswa').onSnapshot(snap => {
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
        setLoading(false);
    }, err => {
        console.error(err);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = q ? users.filter(u => 
        (u.namaLengkap || '').toLowerCase().includes(q) || 
        (u.email || '').toLowerCase().includes(q) ||
        (String(u.idUnik || '')).includes(q)
    ) : users;
    
    return [...filtered].sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));
  }, [users, searchQuery]);

  const handleOpenPasswordModal = (uid: string, name: string) => {
      setTargetUid(uid);
      setTargetName(name);
      setNewPassword('');
      setIsPasswordModalOpen(true);
  };

  const handleUpdatePassword = async () => {
      if (newPassword.length < 6) {
          toast.error("Password minimal 6 karakter.");
          return;
      }
      setUpdatingPassword(true);
      const toastId = toast.loading("Memperbarui password...");
      try {
          const res = await adminUpdatePassword(targetUid, newPassword);
          if (res.success) {
              toast.success("Password berhasil diperbarui.", { id: toastId });
              setIsPasswordModalOpen(false);
          } else {
              toast.error("Gagal: " + res.error, { id: toastId });
          }
      } catch (e: any) {
          toast.error("Gagal: " + e.message, { id: toastId });
      } finally {
          setUpdatingPassword(false);
      }
  };

  const handleResetPasswordEmail = async (email: string) => {
      if (!email) {
          toast.error("Email tidak ditemukan.");
          return;
      }
      const toastId = toast.loading("Mengirim email reset...");
      try {
          if (isMockMode) {
              await new Promise(r => setTimeout(r, 1000));
          } else if (auth) {
              await auth.sendPasswordResetEmail(email);
          }
          toast.success("Email reset password telah dikirim ke " + email, { id: toastId });
      } catch (e: any) {
          toast.error("Gagal: " + e.message, { id: toastId });
      }
  };

  return (
    <Layout title="User Siswa Aktif" subtitle="Database pengguna_siswa" icon={ShieldCheckIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 space-y-6 pb-40">
          <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Cari akun siswa..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-transparent rounded-2xl py-4 pl-12 pr-4 text-xs font-black outline-none text-slate-800 dark:text-white" 
                />
            </div>
            <div className="flex items-center gap-3 px-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                <CheckCircleIcon className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{filteredUsers.length} Akun Terdaftar</span>
            </div>
          </div>

          {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Akun...</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map(user => (
                      <div key={user.uid} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm group">
                          <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg">
                                  {(user.namaLengkap || '?').charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                  <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase truncate">{user.namaLengkap}</h4>
                                  <p className="text-[9px] font-bold text-slate-400 truncate">{user.email}</p>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-50 dark:border-slate-800">
                              <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-center">
                                  <p className="text-[7px] font-black text-slate-400 uppercase">ID UNIK</p>
                                  <p className="text-[10px] font-mono font-black text-indigo-600">{user.idUnik || '-'}</p>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-center">
                                  <p className="text-[7px] font-black text-slate-400 uppercase">ROMBEL</p>
                                  <p className="text-[10px] font-black text-slate-700 dark:text-slate-300">{user.tingkatRombel || '-'}</p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
                              <button 
                                onClick={() => handleOpenPasswordModal(user.uid, user.namaLengkap)}
                                className="flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-[8px] font-black uppercase text-indigo-600 hover:bg-indigo-100 transition-all"
                              >
                                  <LockIcon className="w-2.5 h-2.5" /> Ubah Pass
                              </button>
                              <button 
                                onClick={() => handleResetPasswordEmail(user.email)}
                                className="flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-[8px] font-black uppercase text-emerald-600 hover:bg-emerald-50 transition-all"
                              >
                                  <EnvelopeIcon className="w-2.5 h-2.5" /> Reset Link
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* MODAL UBAH PASSWORD */}
      {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in duration-300">
                  <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <LockIcon className="w-8 h-8" />
                      </div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Ubah Password Siswa</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{targetName}</p>
                  </div>

                  <div className="space-y-2">
                      <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1">Password Baru</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-indigo-500"
                        placeholder="Masukkan password baru..."
                      />
                  </div>

                  <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setIsPasswordModalOpen(false)}
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest"
                      >
                          Batal
                      </button>
                      <button 
                        onClick={handleUpdatePassword}
                        disabled={updatingPassword}
                        className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
                          SIMPAN PASSWORD
                      </button>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default StudentUsers;
