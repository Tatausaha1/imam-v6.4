
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useRef } from 'react';
import { ViewState, UserRole, Student, ClassData } from '../types';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  UsersGroupIcon, BriefcaseIcon, UserIcon,
  QrCodeIcon, ArrowRightIcon, AcademicCapIcon, ClockIcon,
  CheckCircleIcon, ChartBarIcon, EnvelopeIcon,
  CalendarIcon, RobotIcon, BookOpenIcon, CogIcon,
  IdentificationIcon, StarIcon, BuildingLibraryIcon,
  LogOutIcon, CameraIcon, SparklesIcon, UserPlusIcon,
  ClipboardDocumentListIcon,
  PusakaIcon, RdmIcon, Emis40Icon, EmisIcon,
  SimsdmIcon, AbsensiKemenagIcon, PintarIcon, AsnDigitalIcon,
  ShieldCheckIcon, HeartIcon
} from './Ikon';
import { format } from 'date-fns';

interface BerandaProps {
  onNavigate: (view: ViewState) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userRole: UserRole;
  onLogout: () => void;
  onOpenSidebar?: () => void;
}

const Beranda: React.FC<BerandaProps> = ({ onNavigate, userRole, onLogout }) => {
  const [userName, setUserName] = useState<string>('Pengguna');
  const [userIdUnik, setUserIdUnik] = useState<string | null>(null);
  const [managedClass, setManagedClass] = useState<ClassData | null>(null);
  
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    pendingLetters: 0,
    attendanceToday: 0
  });
  
  const [maleStudents, setMaleStudents] = useState<number>(0);
  const [femaleStudents, setFemaleStudents] = useState<number>(0);
  const [classAttendancePct, setClassAttendancePct] = useState<number>(0);
  
  const [trendData, setTrendData] = useState<{day: string, val: number, fullDate: string}[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showChart, setShowChart] = useState(false);
  
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const isStudent = userRole === UserRole.SISWA;
  const isWaliKelas = userRole === UserRole.WALI_KELAS;
  const isTeacher = userRole === UserRole.GURU || isWaliKelas;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;
  const isKamad = userRole === UserRole.KEPALA_MADRASAH;

  const prestigePhoto = "https://lh3.googleusercontent.com/d/1nUuvSSEI4pj7YZd_Hy4iSO62LM-_KuoE";

  useEffect(() => {
    const fetchAllData = async () => {
        setLoadingStats(true);
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return { day: format(d, 'eee'), fullDate: format(d, 'yyyy-MM-dd'), val: 0 };
        });

        if (isMockMode) {
            setTimeout(() => {
                setStats({ students: 842, teachers: 56, classes: 24, pendingLetters: 5, attendanceToday: 92 });
                setMaleStudents(410); setFemaleStudents(432);
                setTrendData(last7Days.map(d => ({ ...d, val: 85 + Math.floor(Math.random() * 15) })));
                setTodayAttendance({ status: 'Hadir', checkIn: '07:12', duha: '08:05', zuhur: '12:30', ashar: null, checkOut: null });
                if (isWaliKelas) {
                    setManagedClass({ id: 'c1', name: 'XII IPA 1', level: '12', academicYear: '2023/2024' });
                    setClassAttendancePct(96);
                }
                setLoadingStats(false);
                setTimeout(() => setShowChart(true), 300);
            }, 800);
            return;
        }

        if (!db) return;
        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const [studentsSnap, teachersSnap, classesSnap, lettersSnap, attendanceTodaySnap] = await Promise.all([
                db.collection('students').where('status', '==', 'Aktif').get(),
                db.collection('teachers').get(),
                db.collection('classes').get(),
                db.collection('letters').where('status', '==', 'Pending').get(),
                db.collection('attendance').where('date', '==', todayStr).get()
            ]);

            const sDocs = studentsSnap.docs.map(d => d.data() as Student);
            setStats({ students: studentsSnap.size, teachers: teachersSnap.size, classes: classesSnap.size, pendingLetters: lettersSnap.size, attendanceToday: attendanceTodaySnap.size });
            setTrendData(last7Days.map(d => ({ ...d, val: 90 })));

            if (auth.currentUser) {
                const uid = auth.currentUser.uid;
                const myAtt = attendanceTodaySnap.docs.find(d => d.data().studentId === uid || d.data().idUnik === userIdUnik);
                if (myAtt) setTodayAttendance(myAtt.data());

                if (isWaliKelas) {
                    const myClassDoc = classesSnap.docs.find(d => d.data().teacherId === uid);
                    if (myClassDoc) {
                        const classData = { id: myClassDoc.id, ...myClassDoc.data() } as ClassData;
                        setManagedClass(classData);
                        const classStudents = sDocs.filter(s => s.tingkatRombel === classData.name);
                        const classAttendanceCount = attendanceTodaySnap.docs.filter(d => d.data().class === classData.name).length;
                        setMaleStudents(classStudents.filter(s => s.jenisKelamin === 'Laki-laki').length);
                        setFemaleStudents(classStudents.filter(s => s.jenisKelamin === 'Perempuan').length);
                        if (classStudents.length > 0) {
                            setClassAttendancePct(Math.round((classAttendanceCount / classStudents.length) * 100));
                        }
                    }
                } else {
                    setMaleStudents(sDocs.filter(d => d.jenisKelamin === 'Laki-laki').length);
                    setFemaleStudents(sDocs.filter(d => d.jenisKelamin === 'Perempuan').length);
                }
            }
        } catch (e) { console.error(e); } finally { setLoadingStats(false); setShowChart(true); }
    };
    fetchAllData();
  }, [userIdUnik, userRole, isWaliKelas]);

  useEffect(() => {
      if (auth.currentUser) {
          setUserName(auth.currentUser.displayName || 'Pengguna');
          if (db) {
              db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
                  if (doc.exists) {
                      const data = doc.data();
                      setUserIdUnik(data?.idUnik || data?.nisn || null);
                  }
              });
          }
      }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; 
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const quickMenuItems = [
    { show: true, label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30' },
    { show: true, label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/30' },
    { show: !isStudent, label: 'Presensi', icon: QrCodeIcon, view: ViewState.PRESENSI, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/30' },
    { show: isStudent, label: 'Kredit Poin', icon: ShieldCheckIcon, view: ViewState.POINTS, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { show: isAdmin || userRole === UserRole.STAF, label: 'PPDB', icon: UserPlusIcon, view: ViewState.ENROLLMENT, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { show: !isStudent && (isTeacher || isAdmin || isKamad), label: 'AI Guru', icon: SparklesIcon, view: ViewState.CONTENT_GENERATION, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30' },
    { show: isWaliKelas || isAdmin || isKamad, label: 'Daftar Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { show: true, label: 'Rapor', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { show: true, label: 'Surat PTSP', icon: EnvelopeIcon, view: ViewState.LETTERS, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    { show: isAdmin || isKamad || isWaliKelas, label: 'Laporan', icon: ChartBarIcon, view: ViewState.REPORTS, color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-800' }
  ];

  const kemenagServices = [
    { label: 'Pusaka', icon: PusakaIcon, url: 'https://pusaka-v3.kemenag.go.id/' },
    { label: 'RDM', icon: RdmIcon, url: 'https://hdmadrasah.id/login/auth' },
    { label: 'Emis 4.0', icon: Emis40Icon, url: 'https://emis.kemenag.go.id/' },
    { label: 'Emis GTK', icon: EmisIcon, url: 'https://emisgtk.kemenag.go.id/' },
    { label: 'SIMSDM', icon: SimsdmIcon, url: 'https://simpeg5.kemenag.go.id/' },
    { label: 'Absensi', icon: AbsensiKemenagIcon, url: 'https://sso.kemenag.go.id/auth/signin?appid=42095eeec431ac23eb12d2b772c94be0' },
    { label: 'Pintar', icon: PintarIcon, url: 'https://pintar.kemenag.go.id/' },
    { label: 'ASN Digital', icon: AsnDigitalIcon, url: 'https://asndigital.bkn.go.id/' }
  ];

  const MiniSessionTracker = ({ data }: { data: any }) => {
    const sessions = [
        { key: 'checkIn', label: 'M' },
        { key: 'duha', label: 'D' },
        { key: 'zuhur', label: 'Z' },
        { key: 'ashar', label: 'A' },
        { key: 'checkOut', label: 'P' }
    ];
    return (
        <div className="flex gap-1.5 mt-4">
            {sessions.map(s => {
                const val = data ? data[s.key] : null;
                const isHaid = val && String(val).includes('Haid');
                const isFilled = !!val;
                return (
                    <div key={s.key} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black border transition-all ${
                        isFilled 
                        ? (isHaid ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20' : 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20') 
                        : 'bg-white/10 border-white/5 text-white/30'
                    }`}>
                        {s.label}
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden transition-colors duration-500">
      
      {/* --- HEADER --- */}
      <div className="px-6 pt-12 pb-6 bg-white dark:bg-[#0B1121] rounded-b-[2.5rem] border-b border-slate-100 dark:border-slate-800/50 shadow-sm sticky top-0 z-40 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 animate-in fade-in slide-in-from-left-4 duration-1000">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    {isStudent ? 'Portal Siswa Digital' : isKamad ? 'Dashboard Pimpinan' : isWaliKelas ? 'Dashboard Wali Kelas' : 'Manajemen Madrasah'}
                </p>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight truncate animate-in fade-in slide-in-from-left-6 duration-1000 delay-100">
                Halo, {userName.split(' ')[0]}!
            </h1>
            <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-left-8 duration-1000 delay-200">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[8px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800 shadow-sm">
                    {userRole}
                </span>
                {isStudent && userIdUnik && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-black tracking-widest border border-amber-100 dark:border-amber-800 shadow-sm">
                        <IdentificationIcon className="w-3 h-3" /> {userIdUnik}
                    </span>
                )}
            </div>
          </div>
          <div className="flex gap-2.5 shrink-0 animate-in fade-in slide-in-from-right-4 duration-700">
             <button onClick={() => onNavigate(ViewState.SETTINGS)} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 dark:border-slate-800 hover:rotate-90">
                <CogIcon className="w-5 h-5" />
             </button>
             <button onClick={() => { if(window.confirm("Keluar sistem?")) onLogout(); }} className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all active:scale-90 border border-rose-100 dark:border-rose-900/30">
                <LogOutIcon className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* --- DYNAMIC STATS TRACK --- */}
        <div 
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={`flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-6 px-6 snap-x snap-mandatory scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing will-change-scroll`}
        >
            {isWaliKelas && managedClass && (
                <div 
                    onClick={() => onNavigate(ViewState.CLASSES)} 
                    className="min-w-[280px] snap-center bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-500/20 cursor-pointer group overflow-hidden relative animate-in fade-in slide-in-from-right-10 duration-700 hover:scale-[1.02] transition-all"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700"><UsersGroupIcon className="w-24 h-24" /></div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Rombel Binaan Saya</p>
                        <h3 className="text-xl font-black mb-1 group-hover:translate-x-1 transition-transform">
                            {managedClass.name}
                        </h3>
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2">
                                <ChartBarIcon className="w-3.5 h-3.5 opacity-60" />
                                <span className="text-[10px] font-bold">Presensi: {classAttendancePct}%</span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-4 py-1.5 rounded-xl">Kelola Siswa</span>
                        </div>
                    </div>
                </div>
            )}

            {isStudent && (
                <div 
                    onClick={() => onNavigate(ViewState.ATTENDANCE_HISTORY)} 
                    className="min-w-[280px] snap-center bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-500/20 cursor-pointer group overflow-hidden relative animate-in fade-in slide-in-from-right-10 duration-700 hover:scale-[1.02] transition-all"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700"><CheckCircleIcon className="w-24 h-24" /></div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Kehadiran Hari Ini</p>
                        <h3 className="text-xl font-black group-hover:translate-x-1 transition-transform">
                            {todayAttendance ? (todayAttendance.status === 'Hadir' ? 'Hadir' : todayAttendance.status) : 'Belum Scan'}
                        </h3>
                        
                        {/* 5 SESSION TRACKER */}
                        <MiniSessionTracker data={todayAttendance} />

                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2">
                                <ClockIcon className="w-3.5 h-3.5 opacity-60" />
                                <span className="text-[10px] font-bold">Live Sync</span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-4 py-1.5 rounded-xl">Detail Sesi</span>
                        </div>
                    </div>
                </div>
            )}

            {!isStudent && (
                <>
                    <div className="relative min-w-[300px] md:min-w-[360px] snap-center cursor-pointer group transition-all duration-700 animate-in fade-in slide-in-from-right-16 duration-700 delay-100">
                        <div className="relative z-10 rounded-[2.5rem] bg-[#0F172A] text-white shadow-2xl h-[200px] flex flex-col justify-end overflow-hidden border border-white/10 group-hover:scale-[1.02] group-hover:shadow-indigo-500/20">
                            <div className="absolute inset-0 z-0">
                                <img src={prestigePhoto} className="w-full h-full object-cover object-top scale-100 group-hover:scale-110 transition-transform duration-[3000ms]" alt="Pimpinan" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent"></div>
                                <div className="absolute inset-0 bg-indigo-900/10 mix-blend-overlay"></div>
                            </div>
                            <div className="absolute top-4 right-4 z-20">
                                <div className="bg-yellow-400 text-indigo-950 p-2 rounded-2xl shadow-xl border border-white/30 animate-pulse">
                                    <StarIcon className="w-5 h-5 fill-current" />
                                </div>
                            </div>
                            <div className="relative z-10 p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <SparklesIcon className="w-3.5 h-3.5 text-yellow-400" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-yellow-400 drop-shadow-md">Kepala Madrasah</span>
                                </div>
                                <h4 className="text-lg font-black uppercase tracking-tight leading-none drop-shadow-lg">H. Someran, S.Pd.,MM</h4>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-md border border-white/10">
                                        <p className="text-[8px] font-mono font-bold text-slate-300 uppercase tracking-tighter">NIP. 196703021996031001</p>
                                    </div>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <StatCardMini delay="delay-[600ms]" animate="animate-in fade-in slide-in-from-right-24" label={isWaliKelas ? "Populasi Kelas" : "Peserta Didik"} val={isWaliKelas ? (maleStudents + femaleStudents) : stats.students} icon={UsersGroupIcon} grad="from-blue-600 to-indigo-800" detail={`${maleStudents} L • ${femaleStudents} P`} onPress={() => onNavigate(ViewState.STUDENTS)} />
                    
                    {!isWaliKelas && (
                        <StatCardMini delay="delay-[700ms]" animate="animate-in fade-in slide-in-from-right-28" label="Direktori Guru" val={stats.teachers} icon={BriefcaseIcon} grad="from-emerald-600 to-teal-800" detail="Data GTK Madrasah" onPress={() => onNavigate(ViewState.TEACHERS)} />
                    )}

                    <div onClick={() => onNavigate(ViewState.REPORTS)} className="relative min-w-[280px] md:min-w-[320px] snap-center cursor-pointer group transition-all duration-700 animate-in fade-in slide-in-from-right-20 duration-700 delay-200">
                        <div className="relative z-10 p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-700 to-indigo-900 text-white shadow-xl h-[200px] flex flex-col overflow-hidden border border-white/5 group-hover:scale-[1.02]">
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-white/10 border border-white/10"><ChartBarIcon className="w-4 h-4 text-white" /></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Analitik Realtime</span>
                                    </div>
                                    <span className="text-[7px] font-black bg-white/20 px-2 py-0.5 rounded-md uppercase animate-pulse">Live Sync</span>
                                </div>
                                <div className="flex-1 flex items-end justify-between gap-2 px-1 pb-1">
                                    {trendData.map((d, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                            <div className={`w-full rounded-t-lg transition-all duration-1000 relative bg-emerald-400`} style={{ height: showChart ? `${Math.max(15, d.val * 0.65)}%` : '0%' }}></div>
                                            <span className="text-[7px] font-black opacity-50 uppercase">{d.day.substring(0,1)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 text-[8px] font-black uppercase tracking-widest opacity-60 flex items-center justify-between"><span>Laporan Aktivitas</span><ArrowRightIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide pb-40">
        
        {isStudent && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                <div onClick={() => onNavigate(ViewState.ID_CARD)} className="bg-white dark:bg-[#151E32] p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-5 group cursor-pointer active:scale-95 transition-all hover:shadow-2xl hover:shadow-indigo-500/10">
                    <div className="w-20 h-20 rounded-[2.2rem] bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 transition-all group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
                        <QrCodeIcon className="w-10 h-10" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">KARTU PELAJAR DIGITAL</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Tunjukkan pada Petugas Presensi di Gerbang</p>
                    </div>
                    <div className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40">
                        Buka Kartu
                    </div>
                </div>
            </div>
        )}

        {isWaliKelas && (
             <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 space-y-4">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Manajemen Rombel</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div onClick={() => onNavigate(ViewState.STUDENTS)} className="bg-white dark:bg-[#151E32] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 cursor-pointer hover:shadow-xl transition-all group">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><UsersGroupIcon className="w-7 h-7" /></div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Daftar Siswa</h4>
                            <p className="text-[9px] text-slate-500 uppercase mt-1">Data Induk Kelas</p>
                        </div>
                    </div>
                    <div onClick={() => onNavigate(ViewState.GRADES)} className="bg-white dark:bg-[#151E32] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 cursor-pointer hover:shadow-xl transition-all group">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><AcademicCapIcon className="w-7 h-7" /></div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Penilaian Kelas</h4>
                            <p className="text-[9px] text-slate-500 uppercase mt-1">Input Nilai Akademik</p>
                        </div>
                    </div>
                 </div>
             </div>
        )}

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            {quickMenuItems.map((item, idx) => item.show && (
                <button key={idx} onClick={() => onNavigate(item.view)} className="flex flex-col items-center gap-2 group">
                    <div className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center shadow-sm border border-black/5 active:scale-90 transition-all group-hover:-translate-y-1 group-hover:shadow-lg ${item.bg}`}>
                        <item.icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${item.color}`} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 text-center truncate w-full px-1">{item.label}</span>
                </button>
            ))}
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-450">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layanan Kemenag Hub</h3>
                <button 
                  onClick={() => onNavigate(ViewState.KEMENAG_HUB)}
                  className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-all"
                >
                  Lihat Semua <ArrowRightIcon className="w-3 h-3" />
                </button>
            </div>
            <div className="grid grid-cols-4 gap-4 bg-white/50 dark:bg-[#151E32]/50 p-6 rounded-[3rem] border border-slate-100 dark:border-slate-800/50 shadow-inner">
                {kemenagServices.map((service, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => window.open(service.url, '_blank')}
                        className="flex flex-col items-center gap-2 group active:scale-90 transition-all"
                    >
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl p-2.5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center group-hover:shadow-md group-hover:-translate-y-1 transition-all">
                            <service.icon className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter truncate w-full text-center">
                            {service.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                {isStudent ? 'JADWAL HARI INI' : 'Agenda Mendatang'}
            </h3>
            <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xl hover:shadow-indigo-500/5 group">
                <div className="flex items-center gap-5 p-4">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.5rem] flex flex-col items-center justify-center font-black shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <span className="text-[11px]">07:30</span>
                        <div className="w-4 h-0.5 bg-indigo-200 dark:bg-indigo-500/30 my-1 group-hover:bg-white/40"></div>
                        <span className="text-[11px]">09:00</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase truncate group-hover:translate-x-1 transition-transform">
                            {isStudent ? 'Matematika Wajib' : 'Kegiatan Belajar Mengajar'}
                        </h4>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                            {isStudent ? <><UserIcon className="w-3 h-3" /> Budi Santoso, S.Pd</> : <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Status: Sedang Berlangsung</>}
                        </div>
                    </div>
                    {isStudent && (
                        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[8px] font-black text-slate-400 border border-slate-100 dark:border-slate-700">
                            R. 12
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div onClick={() => onNavigate(ViewState.ADVISOR)} className="bg-indigo-50 dark:bg-indigo-900/10 rounded-[2.5rem] p-6 border border-indigo-100 dark:border-indigo-800/50 cursor-pointer group active:scale-[0.98] transition-all animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-600 hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-md transition-all group-hover:bg-indigo-600"><RobotIcon className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" /></div>
                <div className="flex-1">
                    <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Butuh Bantuan Sistem?</h4>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Tanyakan tentang fitur sistem kepada asisten cerdas IMAM melalui Live Chat.</p>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-indigo-300 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
      </div>
    </div>
  );
};

const StatCardMini = ({ label, val, icon: Icon, grad, detail, onPress, delay, animate }: any) => (
    <div onClick={onPress} className={`relative min-w-[280px] md:min-w-[300px] snap-center cursor-pointer group transition-all duration-700 hover:scale-[1.02] ${animate || ''} duration-700 ${delay}`}>
        <div className={`relative z-10 p-6 rounded-[2.5rem] bg-gradient-to-br ${grad} text-white shadow-xl h-[200px] flex flex-col overflow-hidden group-hover:shadow-2xl group-hover:ring-2 ring-white/20 transition-all`}>
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6"><div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors shadow-lg"><Icon className="w-6 h-6" /></div><span className="bg-white/20 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest group-hover:bg-white/30 transition-colors">Ringkasan</span></div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                <h3 className="text-4xl font-black mt-1 group-hover:translate-x-1 transition-transform">{val}</h3>
                <div className="mt-auto flex items-center justify-between text-[8px] font-black uppercase tracking-widest opacity-60"><span>{detail}</span><ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
        </div>
    </div>
);

export default Beranda;
