
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import { UserRole, Student, Teacher } from '../types';
import Layout from './Layout';
import { 
    ShieldCheckIcon, Loader2, SaveIcon, ChevronDownIcon, 
    XCircleIcon, PlusIcon
} from './Ikon';
import { toast } from 'sonner';

interface UserData {
    uid: string;
    displayName: string;
    email: string;
    role: string;
    studentId?: string;
    teacherId?: string;
    idUnik?: string;
    status?: string;
}

const CreateAccount: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: '', email: '', password: '', role: UserRole.SISWA, linkId: '', idUnik: ''
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    if (!db) return;
    setLoading(true);
    
    const unsubUsers = db.collection('users').onSnapshot(snap => {
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData)));
        setLoading(false);
    });

    db.collection('students').orderBy('namaLengkap').get().then(snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student))));
    db.collection('teachers').orderBy('name').get().then(snap => setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher))));

    return () => unsubUsers();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || (!formData.linkId && ![UserRole.ADMIN, UserRole.DEVELOPER].includes(formData.role))) {
        toast.error("Mohon lengkapi formulir pendaftaran.");
        return;
    }

    setSaving(true);
    const toastId = toast.loading("Mengaktivasi akses akun...");
    try {
        const userCredential = await auth!.createUserWithEmailAndPassword(formData.email, formData.password);
        const uid = userCredential.user?.uid;
        
        if (uid) {
            const userDoc: any = { 
                uid, 
                displayName: formData.displayName, 
                email: formData.email, 
                role: formData.role, 
                idUnik: formData.idUnik || '', 
                status: 'Active', 
                createdAt: new Date().toISOString() 
            };
            
            // Sinkronisasi khusus Siswa
            if (formData.role === UserRole.SISWA) {
                userDoc.studentId = formData.linkId;
                const studentMaster = students.find(s => s.id === formData.linkId);
                
                // 1. Update Tabel Master Siswa
                await db!.collection('students').doc(formData.linkId).update({ 
                    linkedUserId: uid, 
                    accountStatus: 'Active',
                    email: formData.email 
                });

                // 2. Tambah ke Tabel Spesifik pengguna_siswa (Sesuai Permintaan)
                await db!.collection('pengguna_siswa').doc(uid).set({
                    ...studentMaster,
                    uid: uid,
                    email: formData.email,
                    activatedAt: new Date().toISOString()
                });
            } else if (![UserRole.DEVELOPER, UserRole.ADMIN].includes(formData.role)) {
                userDoc.teacherId = formData.linkId;
                await db!.collection('teachers').doc(formData.linkId).update({ linkedUserId: uid });
            }
            
            // Simpan ke tabel User Utama
            await db!.collection('users').doc(uid).set(userDoc);
            
            toast.success(`Akun ${formData.displayName} berhasil diaktifkan!`, { id: toastId });
            setActiveTab('list');
        }
    } catch (err: any) {
        toast.error("Gagal: " + err.message, { id: toastId });
    } finally {
        setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
      const q = searchQuery.toLowerCase();
      return users.filter(u => (u.displayName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [users, searchQuery]);

  return (
    <Layout title="Manajemen User" subtitle="Otoritas & Hak Akses" icon={ShieldCheckIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 max-w-5xl mx-auto space-y-8">
        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit shadow-inner">
            <button onClick={() => setActiveTab('list')} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600' : 'text-slate-400'}`}>Daftar Pengguna</button>
            <button onClick={() => setActiveTab('create')} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Aktivasi Baru</button>
        </div>

        {activeTab === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map(user => (
                    <div key={user.uid} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">{(user.displayName || '?').charAt(0)}</div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase truncate">{user.displayName}</h4>
                            <p className="text-[10px] font-bold text-slate-400">{user.role}</p>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="max-w-xl mx-auto bg-white dark:bg-[#151E32] p-8 rounded-[3rem] border border-slate-100 shadow-xl">
                <form onSubmit={handleCreateAccount} className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[UserRole.ADMIN, UserRole.GURU, UserRole.STAF, UserRole.SISWA].map(r => (
                            <button key={r} type="button" onClick={() => setFormData({...formData, role: r as UserRole, linkId: '', displayName: ''})} className={`py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${formData.role === r ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-transparent text-slate-400'}`}>{r}</button>
                        ))}
                    </div>
                    {![UserRole.ADMIN, UserRole.DEVELOPER].includes(formData.role) && (
                        <div className="relative">
                            <select required value={formData.linkId} onChange={e => {
                                const id = e.target.value;
                                const sel = formData.role === UserRole.SISWA ? students.find(s=>s.id===id) : teachers.find(t=>t.id===id);
                                setFormData({
                                    ...formData, 
                                    linkId: id, 
                                    displayName: formData.role === UserRole.SISWA ? (sel as Student)?.namaLengkap : (sel as Teacher)?.name, 
                                    idUnik: formData.role === UserRole.SISWA ? (sel as Student)?.idUnik : (sel as Teacher)?.nip 
                                });
                            }} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none border border-slate-200 uppercase appearance-none cursor-pointer">
                                <option value="">-- HUBUNGKAN DATA MASTER --</option>
                                {formData.role === UserRole.SISWA ? students.map(s => <option key={s.id} value={s.id!}>{s.namaLengkap}</option>) : teachers.map(t => <option key={t.id} value={t.id!}>{t.name}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                    )}
                    <input required type="email" placeholder="Email Login" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 rounded-2xl text-xs font-bold" />
                    <input required type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 rounded-2xl text-xs font-bold" />
                    <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                        Aktifkan Akses Akun
                    </button>
                </form>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default CreateAccount;
