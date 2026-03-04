
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useMemo } from 'react';
import { ViewState, UserRole } from '../types';
import { 
  HomeIcon, UserIcon, QrCodeIcon, RobotIcon, ChartBarIcon, AppLogo, 
  BookOpenIcon, EnvelopeIcon, CalendarDaysIcon, UsersIcon, LogOutIcon,
  BriefcaseIcon, CalendarIcon, ArrowTrendingUpIcon, BuildingLibraryIcon,
  InfoIcon, XMarkIcon, CommandLineIcon, ClipboardDocumentListIcon, AcademicCapIcon,
  SparklesIcon, CogIcon, UserPlusIcon, HeadsetIcon, StarIcon, ClockIcon, ShieldCheckIcon,
  IdentificationIcon
} from './Ikon';

interface BilahSampingProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  userRole?: UserRole;
  onLogout?: () => void;
  onClose?: () => void;
}

interface SidebarItem {
    label: string;
    icon: React.ElementType;
    view?: ViewState;
    url?: string;
    roles?: UserRole[]; 
}

const BilahSamping: React.FC<BilahSampingProps> = ({ currentView, onNavigate, userRole = UserRole.GURU, onLogout, onClose }) => {
  
  const menuItems: SidebarItem[] = [
    { label: 'Beranda', icon: HomeIcon, view: ViewState.DASHBOARD },
    { label: 'Informasi Berita', icon: StarIcon, view: ViewState.NEWS },
    { label: 'Profil Madrasah', icon: BuildingLibraryIcon, view: ViewState.MADRASAH_INFO },
    { label: 'Data Induk Siswa', icon: UsersIcon, view: ViewState.STUDENTS, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH] },
    { label: 'Manajemen Akun Siswa', icon: ShieldCheckIcon, view: ViewState.STUDENT_USERS, roles: [UserRole.ADMIN, UserRole.DEVELOPER] },
    { label: 'Manajemen User Global', icon: UsersIcon, view: ViewState.USER_MANAGEMENT, roles: [UserRole.ADMIN, UserRole.DEVELOPER] }, // Tambahan
    { label: 'Direktori GTK', icon: BriefcaseIcon, view: ViewState.TEACHERS, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.KEPALA_MADRASAH] },
    { label: 'Daftar Unit Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH] },
    { label: 'Jadwal & Waktu', icon: CalendarIcon, view: ViewState.SCHEDULE },
    { label: 'Jurnal Harian Guru', icon: BookOpenIcon, view: ViewState.JOURNAL, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS, UserRole.STAF] },
    { label: 'Tugas & Pekerjaan Rumah', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS },
    { label: 'Penilaian Akademik', icon: AcademicCapIcon, view: ViewState.GRADES, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS] },
    { label: 'Laporan Hasil Belajar', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS },
    { label: 'Pindai Kehadiran QR', icon: QrCodeIcon, view: ViewState.SCANNER, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KETUA_KELAS] },
    { label: 'Input Presensi Manual', icon: QrCodeIcon, view: ViewState.PRESENSI, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS] },
    { label: 'Riwayat Absensi', icon: CalendarDaysIcon, view: ViewState.ATTENDANCE_HISTORY },
    { label: 'Kredit Poin Siswa', icon: ShieldCheckIcon, view: ViewState.POINTS },
    { label: 'Layanan Kemenag Hub', icon: BuildingLibraryIcon, view: ViewState.KEMENAG_HUB },
    { label: 'Live Chat (Bantuan)', icon: HeadsetIcon, view: ViewState.ADVISOR },
    { label: 'Asisten AI Guru', icon: SparklesIcon, view: ViewState.CONTENT_GENERATION, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS] },
    { label: 'Layanan Surat PTSP', icon: EnvelopeIcon, view: ViewState.LETTERS },
    { label: 'Cetak Laporan Resmi', icon: ChartBarIcon, view: ViewState.REPORTS, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.KEPALA_MADRASAH, UserRole.WALI_KELAS, UserRole.STAF] },
    { label: 'Identitas Digital (ID)', icon: IdentificationIcon, view: ViewState.ID_CARD },
    { label: 'Riwayat Login Sesi', icon: ClockIcon, view: ViewState.LOGIN_HISTORY },
    { label: 'Aktivasi Akses Akun', icon: UserPlusIcon, view: ViewState.CREATE_ACCOUNT, roles: [UserRole.ADMIN, UserRole.DEVELOPER] },
    { label: 'Konsol Developer', icon: CommandLineIcon, view: ViewState.DEVELOPER, roles: [UserRole.DEVELOPER] },
    { label: 'Pengaturan Sistem', icon: CogIcon, view: ViewState.SETTINGS },
    { label: 'Informasi Engine', icon: InfoIcon, view: ViewState.ABOUT },
  ];

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(userRole as UserRole);
    });
  }, [userRole]);

  return (
    <div className="h-full w-full bg-white dark:bg-[#0B1121] flex flex-col relative overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-5 pt-8 pb-5 flex items-center justify-between shrink-0 border-b border-slate-50 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                <AppLogo className="w-full h-full text-white" />
            </div>
            <div>
                <h1 className="font-black text-slate-900 dark:text-white text-lg leading-none tracking-tight">IMAM</h1>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1.5">Enterprise School v6.1</p>
            </div>
        </div>
        {onClose && (
            <button onClick={onClose} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 active:scale-90 transition-all">
                <XMarkIcon className="w-5 h-5" />
            </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {filteredItems.map((item, idx) => (
            <button
                key={idx}
                onClick={() => { 
                    if (item.url) {
                        window.open(item.url, '_blank');
                    } else if (item.view) {
                        onNavigate(item.view); 
                    }
                    if (onClose) onClose(); 
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[1.2rem] transition-all duration-300 group ${
                    !item.url && currentView === item.view
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 translate-x-1'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
            >
                <item.icon className={`w-4 h-4 shrink-0 transition-all duration-300 ${!item.url && currentView === item.view ? 'text-white scale-110' : 'text-slate-400 dark:text-slate-500 group-hover:scale-110'}`} />
                <span className={`text-[10px] font-black text-left tracking-widest flex-1 truncate ${!item.url && currentView === item.view ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
                {!item.url && currentView === item.view && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse"></div>
                )}
            </button>
        ))}
      </div>

      {/* User Info Footer */}
      <div className="p-3 border-t border-slate-50 dark:border-slate-800 mt-auto bg-slate-50/50 dark:bg-slate-900/50">
        <div 
            className="flex items-center gap-3 px-4 py-3 rounded-[1.5rem] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer group hover:border-indigo-200 transition-all" 
            onClick={() => onNavigate(ViewState.PROFILE)}
        >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] text-white shadow-md bg-gradient-to-br from-indigo-500 to-indigo-700 transform group-hover:scale-110 transition-transform`}>
                {(userRole || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">Akun Pengguna</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate mt-0.5">{userRole === UserRole.WALI_KELAS ? 'Wali Rombel' : userRole}</p>
            </div>
            {onLogout && (
                <button 
                    onClick={(e) => { e.stopPropagation(); if(window.confirm("Keluar dari aplikasi?")) onLogout(); }} 
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                >
                    <LogOutIcon className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default BilahSamping;
