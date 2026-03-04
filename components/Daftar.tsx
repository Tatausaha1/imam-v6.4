
import React, { useState } from 'react';
import { auth, db, isMockMode } from '../services/firebase';
import { ArrowRightIcon, ShieldCheckIcon, AcademicCapIcon, UserIcon, LockIcon, Loader2, SparklesIcon, CalendarIcon, QrCodeIcon, CheckCircleIcon, AppLogo, EnvelopeIcon } from './Ikon';
import { UserRole } from '../types';
import { toast } from 'sonner';

interface DaftarProps {
  onLogin: (role: UserRole) => void;
  onLoginClick: () => void;
}

const Daftar: React.FC<DaftarProps> = ({ onLogin, onLoginClick }) => {
  const [regMode, setRegMode] = useState<'student' | 'staff'>('student');
  const [step, setStep] = useState<1 | 2>(1); 

  const [nisn, setNisn] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.GURU);
  
  const [verifiedStudent, setVerifiedStudent] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      if (!nisn || !birthDate) {
          setError('NISN dan Tanggal Lahir wajib diisi.');
          setLoading(false);
          return;
      }

      if (isMockMode) {
          setTimeout(() => {
              setVerifiedStudent({
                  id: 'mock-student-id',
                  namaLengkap: 'DIENDE ADELLYA AQILLA',
                  nisn: nisn,
                  idUnik: '25039', 
                  email: '',
                  tingkatRombel: 'XII IPA 1',
                  status: 'Aktif',
                  accountStatus: 'Inactive'
              });
              setStep(2);
              toast.success("Identitas Siswa Terverifikasi!");
              setLoading(false);
          }, 1000);
          return;
      }

      try {
          if (!db) throw new Error("Database offline");

          // Pencarian siswa berdasarkan NISN (Document ID)
          const studentDoc = await db.collection('students').doc(nisn).get();

          if (!studentDoc.exists) {
              setError('NISN tidak terdaftar di database induk. Hubungi Tata Usaha.');
              setLoading(false);
              return;
          }

          const data = studentDoc.data();

          if (data?.tanggalLahir !== birthDate) {
              setError('Kombinasi NISN dan Tanggal Lahir tidak cocok.');
              setLoading(false);
              return;
          }

          if (data?.accountStatus === 'Active') {
              setError('Siswa ini sudah memiliki email terdaftar. Silakan Login.');
              setLoading(false);
              return;
          }

          setVerifiedStudent({ id: studentDoc.id, ...data });
          setEmail(data?.email || '');
          setName(data?.namaLengkap);
          setStep(2);
          toast.success(`Halo, ${data?.namaLengkap.split(' ')[0]}! Silakan daftarkan email Anda.`);

      } catch (err: any) {
          console.error("Verification Error:", err);
          setError("Gagal memverifikasi data. Pastikan NISN sudah benar.");
      } finally {
          setLoading(false);
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
        setError('Konfirmasi kata sandi tidak cocok');
        setLoading(false);
        return;
    }

    if (password.length < 6) {
        setError('Kata sandi minimal 6 karakter');
        setLoading(false);
        return;
    }

    const finalRole = regMode === 'student' ? UserRole.SISWA : selectedRole;
    
    if (isMockMode) {
        setTimeout(() => {
            setLoading(false);
            onLogin(finalRole);
            toast.success("Pendaftaran Email Berhasil!");
        }, 1000);
        return;
    }

    try {
        if (auth) {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            if (userCredential.user) {
                const uid = userCredential.user.uid;
                const displayName = regMode === 'student' ? verifiedStudent.namaLengkap : name;

                await userCredential.user.updateProfile({ displayName: displayName });

                const userData: any = {
                    uid: uid,
                    displayName: displayName,
                    email: email,
                    role: finalRole,
                    createdAt: new Date().toISOString(),
                    status: 'Active'
                };

                if (regMode === 'student' && verifiedStudent) {
                    userData.studentId = verifiedStudent.id; 
                    userData.idUnik = verifiedStudent.idUnik || verifiedStudent.nisn;
                    userData.class = verifiedStudent.tingkatRombel;
                }

                if (db) {
                    // Simpan record user utama
                    await db.collection('users').doc(uid).set(userData);

                    if (regMode === 'student' && verifiedStudent) {
                        // Update status di tabel master siswa
                        await db.collection('students').doc(verifiedStudent.id).update({
                            accountStatus: 'Active',
                            linkedUserId: uid,
                            email: email
                        });
                        
                        // Tambah ke tabel khusus pengguna_siswa
                        await db.collection('pengguna_siswa').doc(uid).set({
                            ...verifiedStudent,
                            uid: uid,
                            email: email,
                            activatedAt: new Date().toISOString()
                        });
                    }
                }
            }
            
            toast.success("Akun Email Berhasil Didaftarkan!");
            onLogin(finalRole);
        }
    } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
            setError('Email ini sudah digunakan akun lain.');
        } else {
            setError('Gagal mendaftar: ' + (err.message || 'Kesalahan sistem'));
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] dark:bg-[#020617] text-slate-900 dark:text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:opacity-10 bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_80%,transparent_100%)]"></div>
      
      <div className="flex-1 flex flex-col justify-center px-6 z-10 relative">
        <div className="w-full max-w-md mx-auto bg-white/90 dark:bg-[#0B1121]/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-[3rem] p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-indigo-500/20">
                    <AppLogo className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Pendaftaran Email</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">IMAM Student Hub v6.2</p>
                
                <div className="flex justify-center gap-2 mt-8 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-[1.5rem] w-fit mx-auto border border-slate-100 dark:border-slate-800 shadow-inner">
                    <button onClick={() => { setRegMode('student'); setStep(1); setError(''); }} className={`text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all ${regMode === 'student' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-400'}`}>Siswa</button>
                    <button onClick={() => { setRegMode('staff'); setStep(2); setError(''); }} className={`text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all ${regMode === 'staff' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-400'}`}>Guru/Staf</button>
                </div>
            </div>

            {regMode === 'student' && step === 1 && (
                <form onSubmit={handleVerifyStudent} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-4">
                        <div className="group">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Induk Siswa Nasional (NISN)</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"><QrCodeIcon className="w-5 h-5" /></div>
                                <input type="text" value={nisn} onChange={(e) => setNisn(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-800 dark:text-white placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-inner" placeholder="Cth: 0086..." required />
                            </div>
                        </div>
                        <div className="group">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tanggal Lahir</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"><CalendarIcon className="w-5 h-5" /></div>
                                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-inner" required />
                            </div>
                        </div>
                    </div>
                    {error && <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase text-center border border-red-100 dark:border-red-900/30">{error}</div>}
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span className="uppercase tracking-[0.2em] text-xs">Verifikasi Data Induk</span><ArrowRightIcon className="w-5 h-5" /></>}
                    </button>
                </form>
            )}

            {(step === 2 || regMode === 'staff') && (
                <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                    {regMode === 'student' && verifiedStudent && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-4 rounded-2xl flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20"><CheckCircleIcon className="w-6 h-6" /></div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{verifiedStudent.namaLengkap}</p>
                                <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">Tingkat: {verifiedStudent.tingkatRombel}</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        {regMode === 'staff' && (
                            <div className="group">
                                <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 mb-1.5">Nama Lengkap</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-5 text-slate-800 dark:text-white font-bold text-sm shadow-inner" placeholder="NAMA LENGKAP & GELAR" required />
                            </div>
                        )}
                        <div className="group">
                            <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 mb-1.5">Email (Gunakan Email Aktif)</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500"><EnvelopeIcon className="w-5 h-5" /></div>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value.toLowerCase())} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-800 dark:text-white font-bold text-sm shadow-inner" placeholder="alamat@email.com" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="group">
                                <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 mb-1.5">Kata Sandi</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-5 text-slate-800 dark:text-white font-bold text-sm shadow-inner" placeholder="Min. 6 char" required />
                            </div>
                            <div className="group">
                                <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 mb-1.5">Konfirmasi</label>
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-5 text-slate-800 dark:text-white font-bold text-sm shadow-inner" placeholder="Ulangi" required />
                            </div>
                        </div>
                    </div>

                    {error && <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase text-center border border-red-100 dark:border-red-900/30">{error}</div>}
                    
                    <div className="flex gap-3 mt-6">
                        {regMode === 'student' && <button type="button" onClick={() => setStep(1)} className="px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest active:scale-95">Kembali</button>}
                        <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span className="uppercase tracking-[0.2em] text-xs">Aktifkan Akun Email</span></>}
                        </button>
                    </div>
                </form>
            )}

            <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Sudah memiliki akun terdaftar?</p>
                <button onClick={onLoginClick} className="mt-3 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest hover:underline">Masuk Sekarang</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Daftar;
