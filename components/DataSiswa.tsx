
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { deleteStudent, updateStudent, addStudent } from '../services/studentService';
import { Student, UserRole } from '../types';
import { db, auth, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
import Layout from './Layout';
import { 
  UsersGroupIcon, 
  PencilIcon, TrashIcon, Search, PlusIcon,
  Loader2, XCircleIcon, SaveIcon, 
  IdentificationIcon, ChevronDownIcon,
  SparklesIcon, HeartIcon, PhoneIcon,
  BookOpenIcon, EnvelopeIcon, LockIcon,
  CheckCircleIcon
} from './Ikon';

const DataSiswa: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [classList, setClassList] = useState<string[]>([]);

  // State untuk Pendaftaran Email Langsung
  const [createAccount, setCreateAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');

  const initialFormState: Partial<Student> = {
    namaLengkap: '',
    nisn: '',
    idUnik: '',
    nik: '',
    email: '',
    tingkatRombel: '',
    status: 'Aktif',
    jenisKelamin: 'Laki-laki',
    noTelepon: '',
    alamat: '',
    disciplinePoints: 100,
    accountStatus: 'Inactive'
  };

  const [formData, setFormData] = useState<Partial<Student>>(initialFormState);

  useEffect(() => {
    if (isMockMode) {
      setClassList(['X IPA 1', 'XI IPS 1', 'XII AGAMA']);
      return;
    }
    if (db) {
      db.collection('classes').get().then(snap => {
        setClassList(snap.docs.map(d => d.data().name).sort());
      });
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    if (isMockMode) {
        setTimeout(() => {
            setStudents([
                { id: '25002', namaLengkap: 'ADELIA SRI SUNDARI', nisn: '0086806440', idUnik: '25002', tingkatRombel: 'XII IPA 1', status: 'Aktif', jenisKelamin: 'Perempuan', accountStatus: 'Active' } as Student,
                { id: '25039', namaLengkap: 'DIENDE ADELLYA AQILLA', nisn: '0086806447', idUnik: '25039', tingkatRombel: '', status: 'Aktif', jenisKelamin: 'Perempuan', accountStatus: 'Inactive' } as Student
            ]);
            setLoading(false);
        }, 800);
        return;
    }

    if (!db) return;
    
    const unsubscribe = db.collection('students')
        .orderBy('namaLengkap')
        .onSnapshot(
            snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
                setStudents(data);
                setLoading(false);
            }, 
            err => {
                console.error("Access denied:", err.message);
                setLoading(false);
            }
        );

    return () => unsubscribe();
  }, []);

  const processedStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(s => {
        const name = String(s.namaLengkap || '').toLowerCase();
        const id = String(s.idUnik ?? '').toLowerCase();
        const nisn = String(s.nisn ?? '').toLowerCase();
        return name.includes(q) || id.includes(q) || nisn.includes(q);
    });
  }, [students, searchQuery]);

  const handleAddNew = () => { 
    setEditingId(null); 
    setFormData({ ...initialFormState }); 
    setCreateAccount(false);
    setAccountEmail('');
    setAccountPassword('');
    setIsModalOpen(true); 
  };

  const handleEdit = (student: Student) => { 
    setEditingId(student.id || null); 
    setFormData({ ...student }); 
    setCreateAccount(false);
    setIsModalOpen(true); 
  };

  const handleDelete = async (student: Student) => {
      if (!student.id) return;
      if (window.confirm(`Hapus data permanen ${student.namaLengkap}? Seluruh data login terkait (jika ada) akan terputus.`)) {
          try { await deleteStudent(student.id); toast.success("Data dihapus."); }
          catch (e) { toast.error("Gagal menghapus."); }
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.namaLengkap || !formData.idUnik) {
          toast.error("Nama dan ID UNIK wajib diisi.");
          return;
      }

      if (createAccount && (!accountEmail || accountPassword.length < 6)) {
          toast.error("Lengkapi Email dan Password (min 6 char) untuk aktivasi akun.");
          return;
      }

      setSaving(true);
      const toastId = toast.loading(createAccount ? "Mendaftarkan siswa dan email..." : "Menyimpan ke database...");

      try {
          let linkedUid = formData.linkedUserId || '';
          
          // ALUR PENDAFTARAN EMAIL OTOMATIS (SISI ADMIN)
          if (createAccount && !editingId) {
              if (isMockMode) {
                  await new Promise(r => setTimeout(r, 1000));
                  linkedUid = "mock-uid-" + Date.now();
              } else if (auth) {
                  // 1. Buat User di Firebase Auth
                  const userCred = await auth.createUserWithEmailAndPassword(accountEmail, accountPassword);
                  linkedUid = userCred.user?.uid || '';
                  
                  // 2. Set Profile Display Name
                  await userCred.user?.updateProfile({ displayName: formData.namaLengkap });

                  // 3. Buat Dokumen User Utama
                  const userDoc = {
                      uid: linkedUid,
                      displayName: formData.namaLengkap,
                      email: accountEmail,
                      role: UserRole.SISWA,
                      studentId: formData.idUnik,
                      idUnik: formData.idUnik,
                      class: formData.tingkatRombel,
                      createdAt: new Date().toISOString(),
                      status: 'Active'
                  };
                  await db!.collection('users').doc(linkedUid).set(userDoc);
                  
                  // 4. Tambah ke Pengguna Siswa Terverifikasi
                  await db!.collection('pengguna_siswa').doc(linkedUid).set({
                      ...formData,
                      uid: linkedUid,
                      email: accountEmail,
                      activatedBy: 'Admin'
                  });
              }
          }

          const studentDataToSave = { 
              ...formData, 
              email: accountEmail || formData.email,
              linkedUserId: linkedUid,
              accountStatus: linkedUid ? 'Active' : (formData.accountStatus || 'Inactive')
          };

          if (editingId) {
              await updateStudent(editingId, studentDataToSave);
          } else {
              await addStudent(studentDataToSave as Student);
          }

          toast.success("Database berhasil diperbarui.", { id: toastId });
          setIsModalOpen(false);
      } catch (e: any) { 
          toast.error("Gagal: " + (e.message || "Kesalahan Sistem"), { id: toastId }); 
      } finally { 
          setSaving(false); 
      }
  };

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  return (
    <Layout title="Data Induk Siswa" subtitle="Master Database & Email Registration" icon={UsersGroupIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-40 space-y-6">
        
        {/* Search Bar */}
        <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Cari Nama, ID Unik, atau NISN..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-transparent rounded-2xl py-4 pl-12 pr-4 text-xs font-black outline-none text-slate-800 dark:text-white shadow-inner focus:bg-white transition-all" 
                />
            </div>
            {canManage && (
                <button onClick={handleAddNew} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                    <PlusIcon className="w-4 h-4" /> Tambah Siswa
                </button>
            )}
        </div>

        {/* Cards Grid */}
        {loading ? (
            <div className="text-center py-24 flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500 opacity-20" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sinkronisasi...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-700">
                {processedStudents.map((s) => (
                    <div key={s.id} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col group transition-all hover:shadow-xl hover:border-indigo-100 relative overflow-hidden">
                        
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border shadow-sm shrink-0 transition-transform group-hover:scale-105 ${s.jenisKelamin === 'Perempuan' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                {(s.namaLengkap || '?').charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase truncate">{s.namaLengkap}</h4>
                                <p className="text-[9px] font-mono font-bold text-indigo-600 mt-1 uppercase tracking-tighter">ID: {String(s.idUnik)}</p>
                                <div className="flex gap-1.5 mt-1.5">
                                    <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-md ${s.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{s.status}</span>
                                    {s.accountStatus === 'Active' ? (
                                        <span className="flex items-center gap-1 text-[7px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            <EnvelopeIcon className="w-2.5 h-2.5" /> Email Aktif
                                        </span>
                                    ) : (
                                        <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-400">Email Belum Terdaftar</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto space-y-3">
                            <div className={`p-3 rounded-2xl border flex items-center justify-between ${s.tingkatRombel ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'bg-rose-50 border-rose-100'}`}>
                                <div className="flex items-center gap-2">
                                    <BookOpenIcon className={`w-3.5 h-3.5 ${s.tingkatRombel ? 'text-indigo-500' : 'text-rose-500'}`} />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${s.tingkatRombel ? 'text-slate-600 dark:text-slate-300' : 'text-rose-600'}`}>
                                        {s.tingkatRombel || 'BELUM DISET'}
                                    </span>
                                </div>
                                {canManage && <button onClick={() => handleEdit(s)} className="text-[8px] font-black text-indigo-600 hover:underline">Kelola</button>}
                            </div>

                            {canManage && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(s)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-all text-[9px] font-black uppercase"><PencilIcon className="w-3 h-3"/> Edit</button>
                                    <button onClick={() => handleDelete(s)} className="px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 transition-all"><TrashIcon className="w-3.5 h-3.5"/></button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* FORM MODAL - UPDATED WITH EMAIL REGISTRATION */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-2xl rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[92vh] border border-white/10 relative overflow-hidden">
                  
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0B1121] z-10">
                      <div>
                          <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">{editingId ? 'Koreksi Profil' : 'Registrasi Siswa Baru'}</h3>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">Portal Administrasi Digital</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                          <XCircleIcon className="w-7 h-7" />
                      </button>
                  </div>

                  <div className="p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 pb-12">
                      <form id="studentForm" onSubmit={handleSave} className="space-y-10">
                          
                          {/* BAGIAN AKUN LOGIN (EMAIL) */}
                          {!editingId && (
                              <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-800 shadow-inner">
                                  <div className="flex items-center justify-between mb-6">
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                              <EnvelopeIcon className="w-5 h-5" />
                                          </div>
                                          <div>
                                              <h4 className="text-xs font-black text-slate-800 dark:text-indigo-400 uppercase tracking-widest">Akses Login (Email)</h4>
                                              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Berikan akses login ke siswa sekarang</p>
                                          </div>
                                      </div>
                                      <button 
                                        type="button"
                                        onClick={() => setCreateAccount(!createAccount)}
                                        className={`w-12 h-6 rounded-full p-1 transition-all ${createAccount ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                      >
                                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${createAccount ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                      </button>
                                  </div>

                                  {createAccount && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4">
                                          <div className="space-y-1.5">
                                              <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1">Email Registrasi</label>
                                              <input 
                                                type="email" 
                                                value={accountEmail}
                                                onChange={e => setAccountEmail(e.target.value.toLowerCase())}
                                                className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none"
                                                placeholder="siswa@madrasah.id"
                                              />
                                          </div>
                                          <div className="space-y-1.5">
                                              <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1">Password Akses</label>
                                              <input 
                                                type="password" 
                                                value={accountPassword}
                                                onChange={e => setAccountPassword(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none"
                                                placeholder="Min. 6 Karakter"
                                              />
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}

                          <div className="space-y-5">
                              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-50 dark:border-indigo-900/30 pb-2">
                                  <IdentificationIcon className="w-3.5 h-3.5" /> Informasi Peserta Didik
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap Siswa *</label>
                                      <input required type="text" value={formData.namaLengkap || ''} onChange={e => setFormData({...formData, namaLengkap: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="NAMA SESUAI IJAZAH" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1">ID UNIK * (Local Identifier)</label>
                                      <input required disabled={!!editingId} type="text" value={formData.idUnik || ''} onChange={e => setFormData({...formData, idUnik: e.target.value})} className="w-full bg-indigo-50/30 dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl px-5 py-4 text-xs font-black shadow-lg shadow-indigo-500/5 disabled:opacity-50" placeholder="KODE UNIK SISWA" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NISN (Data Nasional)</label>
                                      <input type="text" value={formData.nisn || ''} onChange={e => setFormData({...formData, nisn: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" placeholder="10 digit nomor induk" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rombel Penempatan</label>
                                      <div className="relative">
                                          <select value={formData.tingkatRombel || ''} onChange={e => setFormData({...formData, tingkatRombel: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer shadow-inner">
                                              <option value="">-- TANPA ROMBEL --</option>
                                              {classList.map(c => <option key={c} value={c}>{c}</option>)}
                                          </select>
                                          <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                      </div>
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Kelamin</label>
                                      <div className="grid grid-cols-2 gap-2">
                                          <button type="button" onClick={() => setFormData({...formData, jenisKelamin: 'Laki-laki'})} className={`py-3.5 rounded-xl border text-[9px] font-black uppercase transition-all ${formData.jenisKelamin === 'Laki-laki' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-400'}`}>Laki-laki</button>
                                          <button type="button" onClick={() => setFormData({...formData, jenisKelamin: 'Perempuan'})} className={`py-3.5 rounded-xl border text-[9px] font-black uppercase transition-all ${formData.jenisKelamin === 'Perempuan' ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-400'}`}>Perempuan</button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </form>
                  </div>

                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1121] flex gap-4 z-10">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 font-black rounded-2xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all text-[10px] uppercase tracking-widest">Batal</button>
                      <button type="submit" form="studentForm" disabled={saving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
                        <span className="uppercase tracking-[0.2em] text-[10px]">{editingId ? 'SIMPAN PERUBAHAN' : 'REGISTRASI DATA & EMAIL'}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default DataSiswa;
