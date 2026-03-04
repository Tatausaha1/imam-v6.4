
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, isMockMode } from '../services/firebase';
import { Student, UserRole } from '../types';
import Layout from './Layout';
import { 
  UsersIcon, ShieldCheckIcon, Search, Loader2, 
  ArrowPathIcon, CheckCircleIcon, IdentificationIcon
} from './Ikon';
import { toast } from 'sonner';

const StudentUsers: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!q) return users;
    return users.filter(u => 
        (u.namaLengkap || '').toLowerCase().includes(q) || 
        (u.email || '').toLowerCase().includes(q) ||
        (String(u.idUnik || '')).includes(q)
    );
  }, [users, searchQuery]);

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
                      </div>
                  ))}
              </div>
          )}
      </div>
    </Layout>
  );
};

export default StudentUsers;
