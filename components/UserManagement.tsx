
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, isMockMode } from '../services/firebase';
import { UserRole, ViewState } from '../types';
import Layout from './Layout';
import { 
  UsersIcon, ShieldCheckIcon, Search, Loader2, 
  PencilIcon, TrashIcon, XCircleIcon, SaveIcon,
  ChevronDownIcon, UserPlusIcon, CheckCircleIcon,
  PlusIcon
} from './Ikon';
import { toast } from 'sonner';

interface UserAccount {
    uid: string;
    displayName: string;
    email: string;
    role: UserRole;
    idUnik?: string;
    status?: string;
    createdAt?: string;
    lastLoginSso?: string;
}

const UserManagement: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void }> = ({ onBack, onNavigate }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserAccount> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!db) return;
    setLoading(true);
    
    const unsubscribe = db.collection('users').onSnapshot(snap => {
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserAccount)));
        setLoading(false);
    }, err => {
        console.error(err);
        toast.error("Gagal sinkronisasi user.");
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
        const matchesSearch = (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'All' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    }).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }, [users, searchQuery, roleFilter]);

  const handleEdit = (user: UserAccount) => {
      setEditingUser({ ...user });
      setIsEditModalOpen(true);
  };

  const handleDelete = async (user: UserAccount) => {
      if (user.role === UserRole.DEVELOPER) {
          toast.error("Role Developer tidak dapat dihapus melalui UI ini.");
          return;
      }
      if (window.confirm(`Hapus permanen akun ${user.displayName}? Ini hanya menghapus record database, bukan kredensial login Auth.`)) {
          try {
              await db!.collection('users').doc(user.uid).delete();
              toast.success("Akun berhasil dihapus dari database.");
          } catch (e) {
              toast.error("Gagal menghapus.");
          }
      }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser?.uid) return;
      setSaving(true);
      try {
          await db!.collection('users').doc(editingUser.uid).update({
              role: editingUser.role,
              displayName: editingUser.displayName
          });
          toast.success("Data user diperbarui.");
          setIsEditModalOpen(false);
      } catch (e) {
          toast.error("Gagal menyimpan.");
      } finally {
          setSaving(false);
      }
  };

  return (
    <Layout title="Manajemen User Global" subtitle="Kontrol Akses & Otoritas" icon={ShieldCheckIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 space-y-6 pb-40 max-w-6xl mx-auto w-full">
          
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-500/20">
              <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                      <UserPlusIcon className="w-8 h-8" />
                  </div>
                  <div>
                      <h3 className="text-xl font-black uppercase tracking-tight leading-none">Otoritas Digital</h3>
                      <p className="text-[10px] font-bold text-indigo-100 uppercase mt-2 tracking-widest opacity-80">Aktivasi & Kelola Akses Pengguna</p>
                  </div>
              </div>
              <button 
                onClick={() => onNavigate(ViewState.CREATE_ACCOUNT)}
                className="px-8 py-4 bg-white text-indigo-600 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center gap-3"
              >
                  <PlusIcon className="w-4 h-4" /> Tambah Akun Baru
              </button>
          </div>

          {/* Search & Filter */}
          <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Cari Nama atau Email..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-transparent rounded-2xl py-4 pl-12 pr-4 text-xs font-black outline-none text-slate-800 dark:text-white shadow-inner" 
                />
            </div>
            <div className="relative md:w-64">
                <select 
                    value={roleFilter} 
                    onChange={e => setRoleFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-transparent rounded-2xl py-4 pl-5 pr-10 text-xs font-black outline-none appearance-none cursor-pointer shadow-inner uppercase"
                >
                    <option value="All">Semua Peran</option>
                    {Object.values(UserRole).map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                </select>
                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* User Cards Grid */}
          {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Database Pengguna...</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map(user => (
                      <div key={user.uid} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm group transition-all hover:border-indigo-100 relative overflow-hidden flex flex-col">
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${user.role === UserRole.ADMIN ? 'bg-rose-500' : user.role === UserRole.SISWA ? 'bg-teal-500' : 'bg-indigo-500'}`}></div>
                          
                          <div className="flex items-center gap-4 mb-4 pl-2">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 border shadow-sm ${user.role === UserRole.ADMIN ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                  {(user.displayName || '?').charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                  <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase truncate">{user.displayName}</h4>
                                  <p className="text-[9px] font-bold text-slate-400 truncate">{user.email}</p>
                                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${user.role === UserRole.ADMIN ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                                      {user.role}
                                  </span>
                              </div>
                          </div>

                          <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800/50 flex gap-2 pl-2">
                              <button 
                                onClick={() => handleEdit(user)}
                                className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all"
                              >
                                  <PencilIcon className="w-3.5 h-3.5" /> Edit Akses
                              </button>
                              <button 
                                onClick={() => handleDelete(user)}
                                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-600 transition-all"
                              >
                                  <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && editingUser && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-white/10 animate-in zoom-in duration-300">
                  <div className="text-center mb-8">
                      <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-[0.2em]">Otoritas User</h3>
                      <p className="text-[10px] font-bold text-indigo-500 mt-2 truncate uppercase">{editingUser.displayName}</p>
                  </div>

                  <form onSubmit={handleSaveEdit} className="space-y-6">
                      <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Tampilan</label>
                          <input 
                            type="text" 
                            value={editingUser.displayName || ''} 
                            onChange={e => setEditingUser({...editingUser, displayName: e.target.value.toUpperCase()})}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-5 text-xs font-bold outline-none"
                          />
                      </div>

                      <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hak Akses (Role)</label>
                          <div className="relative">
                            <select 
                                value={editingUser.role} 
                                onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-5 text-xs font-bold outline-none appearance-none cursor-pointer uppercase"
                            >
                                {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-4">
                        <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveIcon className="w-4 h-4" />} Simpan Otoritas
                        </button>
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Batal</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default UserManagement;
