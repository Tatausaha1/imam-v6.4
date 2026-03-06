
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect } from 'react';
import { addStudent } from '../services/studentService';
import { Student, UserRole } from '../types';
import { db, auth, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
import Layout from './Layout';
import { 
  UserPlusIcon, 
  Loader2, SaveIcon, 
  IdentificationIcon, ChevronDownIcon,
  PhoneIcon, BookOpenIcon, EnvelopeIcon,
  MapPinIcon, CalendarIcon, UsersIcon,
  CheckCircleIcon
} from './Ikon';

const PendaftaranSiswa: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
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
    tempatLahir: '',
    tanggalLahir: '',
    namaAyahKandung: '',
    namaIbuKandung: '',
    namaWali: '',
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
          let linkedUid = '';
          
          // ALUR PENDAFTARAN EMAIL OTOMATIS (SISI ADMIN)
          if (createAccount) {
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

          await addStudent(studentDataToSave as Student);

          toast.success("Siswa berhasil didaftarkan.", { id: toastId });
          setFormData({ ...initialFormState });
          setCreateAccount(false);
          setAccountEmail('');
          setAccountPassword('');
      } catch (e: any) { 
          toast.error("Gagal: " + (e.message || "Kesalahan Sistem"), { id: toastId }); 
      } finally { 
          setSaving(false); 
      }
  };

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER || userRole === UserRole.STAF;

  if (!canManage) {
      return (
          <Layout title="Pendaftaran Siswa" icon={UserPlusIcon} onBack={onBack}>
              <div className="p-8 text-center">
                  <p className="text-slate-500">Anda tidak memiliki akses ke fitur ini.</p>
              </div>
          </Layout>
      );
  }

  return (
    <Layout title="Pendaftaran Siswa Baru" subtitle="Formulir Penerimaan Peserta Didik Baru (PPDB)" icon={UserPlusIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-40 max-w-4xl mx-auto space-y-8">
        
        <div className="bg-white dark:bg-[#151E32] rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-6 lg:p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20">
                        <UserPlusIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Formulir Pendaftaran</h2>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">Lengkapi data calon siswa dengan benar</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="p-6 lg:p-10 space-y-12">
                
                {/* AKUN LOGIN */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                            <EnvelopeIcon className="w-4 h-4 text-indigo-500" /> Akses Login Digital
                        </h3>
                        <button 
                            type="button"
                            onClick={() => setCreateAccount(!createAccount)}
                            className={`w-12 h-6 rounded-full p-1 transition-all ${createAccount ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${createAccount ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                    
                    {createAccount && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-800 animate-in zoom-in duration-300">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1">Email Registrasi</label>
                                <input 
                                    type="email" 
                                    value={accountEmail}
                                    onChange={e => setAccountEmail(e.target.value.toLowerCase())}
                                    className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                                    placeholder="siswa@madrasah.id"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1">Password Akses</label>
                                <input 
                                    type="password" 
                                    value={accountPassword}
                                    onChange={e => setAccountPassword(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                                    placeholder="Min. 6 Karakter"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* IDENTITAS UTAMA */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
                        <IdentificationIcon className="w-4 h-4 text-indigo-500" /> Identitas Peserta Didik
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap *</label>
                            <input required type="text" value={formData.namaLengkap || ''} onChange={e => setFormData({...formData, namaLengkap: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="NAMA SESUAI IJAZAH" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1">ID UNIK * (Local ID)</label>
                            <input required type="text" value={formData.idUnik || ''} onChange={e => setFormData({...formData, idUnik: e.target.value})} className="w-full bg-indigo-50/30 dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl px-5 py-4 text-xs font-black shadow-lg shadow-indigo-500/5" placeholder="KODE UNIK SISWA" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NISN (Nasional)</label>
                            <input type="text" value={formData.nisn || ''} onChange={e => setFormData({...formData, nisn: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" placeholder="10 digit nomor induk" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NIK (Kependudukan)</label>
                            <input type="text" value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" placeholder="16 digit nomor NIK" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rombel Penempatan</label>
                            <div className="relative">
                                <select value={formData.tingkatRombel || ''} onChange={e => setFormData({...formData, tingkatRombel: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer shadow-inner">
                                    <option value="">-- PILIH ROMBEL --</option>
                                    {classList.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tempat Lahir</label>
                            <input type="text" value={formData.tempatLahir || ''} onChange={e => setFormData({...formData, tempatLahir: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" placeholder="KOTA/KABUPATEN" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Lahir</label>
                            <div className="relative">
                                <input type="date" value={formData.tanggalLahir || ''} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold outline-none" />
                                <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Kelamin</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setFormData({...formData, jenisKelamin: 'Laki-laki'})} className={`py-4 rounded-2xl border text-[9px] font-black uppercase transition-all ${formData.jenisKelamin === 'Laki-laki' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-400'}`}>Laki-laki</button>
                                <button type="button" onClick={() => setFormData({...formData, jenisKelamin: 'Perempuan'})} className={`py-4 rounded-2xl border text-[9px] font-black uppercase transition-all ${formData.jenisKelamin === 'Perempuan' ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-400'}`}>Perempuan</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KONTAK & ALAMAT */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
                        <MapPinIcon className="w-4 h-4 text-indigo-500" /> Kontak & Domisili
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Telepon/WA</label>
                            <div className="relative">
                                <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="tel" value={formData.noTelepon || ''} onChange={e => setFormData({...formData, noTelepon: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold" placeholder="08xxxxxxxxxx" />
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Lengkap</label>
                            <textarea value={formData.alamat || ''} onChange={e => setFormData({...formData, alamat: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold min-h-[100px]" placeholder="Jalan, RT/RW, Desa/Kelurahan, Kecamatan"></textarea>
                        </div>
                    </div>
                </div>

                {/* DATA ORANG TUA */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-3">
                        <UsersIcon className="w-4 h-4 text-indigo-500" /> Data Orang Tua / Wali
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Ayah Kandung</label>
                            <input type="text" value={formData.namaAyahKandung || ''} onChange={e => setFormData({...formData, namaAyahKandung: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" placeholder="NAMA AYAH" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Ibu Kandung</label>
                            <input type="text" value={formData.namaIbuKandung || ''} onChange={e => setFormData({...formData, namaIbuKandung: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" placeholder="NAMA IBU" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Wali (Opsional)</label>
                            <input type="text" value={formData.namaWali || ''} onChange={e => setFormData({...formData, namaWali: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" placeholder="NAMA WALI" />
                        </div>
                    </div>
                </div>

                <div className="pt-10 flex gap-4">
                    <button type="button" onClick={onBack} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 font-black rounded-2xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all text-[10px] uppercase tracking-widest">Batal</button>
                    <button type="submit" disabled={saving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
                        <span className="uppercase tracking-[0.2em] text-[10px]">DAFTARKAN SISWA SEKARANG</span>
                    </button>
                </div>
            </form>
        </div>
      </div>
    </Layout>
  );
};

export default PendaftaranSiswa;
