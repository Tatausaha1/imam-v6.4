
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ViewState, UserRole } from '../types';
import { toast } from 'sonner';
import { Loader2, AppLogo } from './Ikon';
import { auth, db, isMockMode } from '../services/firebase';

// Komponen Inti (Dimuat Langsung)
import Masuk from './Masuk';
import Beranda from './Beranda';
import NavigasiBawah from './NavigasiBawah';
import BilahSamping from './BilahSamping';
import ProtectedRoute from './ProtectedRoute';

// Lazy Loaded Components
const Daftar = lazy(() => import('./Daftar')); // Tambahan Baru
const Presensi = lazy(() => import('./Presensi'));
const ContentGeneration = lazy(() => import('./ContentGeneration'));
const ClassList = lazy(() => import('./ClassList'));
const Schedule = lazy(() => import('./Schedule'));
const Profile = lazy(() => import('./Profile'));
const Reports = lazy(() => import('./Reports'));
const Advisor = lazy(() => import('./Advisor'));
const Settings = lazy(() => import('./Settings'));
const AllFeatures = lazy(() => import('./AllFeatures'));
const RiwayatPresensi = lazy(() => import('./RiwayatPresensi'));
const QRScanner = lazy(() => import('./QRScanner'));
const JurnalMengajar = lazy(() => import('./JurnalMengajar'));
const Assignments = lazy(() => import('./Assignments'));
const Grades = lazy(() => import('./Grades'));
const DataSiswa = lazy(() => import('./DataSiswa'));
const StudentUsers = lazy(() => import('./StudentUsers'));
const DataGuru = lazy(() => import('./DataGuru'));
const IDCard = lazy(() => import('./IDCard'));
const Letters = lazy(() => import('./Letters'));
const CreateAccount = lazy(() => import('./CreateAccount'));
const UserManagement = lazy(() => import('./UserManagement'));
const DeveloperConsole = lazy(() => import('./DeveloperConsole'));
const LoginHistory = lazy(() => import('./LoginHistory'));
const About = lazy(() => import('./About'));
const History = lazy(() => import('./History'));
const MadrasahInfo = lazy(() => import('./MadrasahInfo'));
const KemenagHub = lazy(() => import('./KemenagHub'));
const PendaftaranSiswa = lazy(() => import('./PendaftaranSiswa'));
const PointsView = lazy(() => import('./PointsView'));
const AcademicYear = lazy(() => import('./AcademicYear'));
const ClassPromotion = lazy(() => import('./ClassPromotion'));
const News = lazy(() => import('./News'));
const Premium = lazy(() => import('./Premium'));
const GenericView = lazy(() => import('./GenericView'));
const NotificationsView = lazy(() => import('./NotificationsView'));

const PageLoader = () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-white/50 dark:bg-[#020617]/50 backdrop-blur-sm animate-in fade-in duration-300">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin opacity-40 mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Memuat Modul...</p>
    </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LOGIN);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GURU);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewKey, setViewKey] = useState(0); 

  useEffect(() => {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
      
      setIsDarkTheme(shouldBeDark);
      if (shouldBeDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      
      const handleOnline = () => { setIsOnline(true); toast.success("Koneksi online."); };
      const handleOffline = () => { setIsOnline(false); toast.warning("Mode Offline Aktif."); };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      if (isMockMode) {
          setAuthLoading(false); 
      } else if (auth) {
          const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
              if (user && db) {
                  try {
                      const userRef = db.collection('users').doc(user.uid);
                      const userDoc = await userRef.get();
                      
                      if (userDoc.exists) {
                          const data = userDoc.data();
                          const role = data?.role as UserRole || UserRole.GURU;
                          setUserRole(role);
                          setCurrentView(prev => (prev === ViewState.LOGIN || prev === ViewState.REGISTER) ? ViewState.DASHBOARD : prev);
                      }
                  } catch (e: any) { 
                      console.warn("Auth sync failure:", e.message);
                  }
              }
              setAuthLoading(false);
          });
          return () => unsubscribeAuth();
      } else {
          setAuthLoading(false);
      }

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  const handleNavigate = (view: ViewState) => {
    setViewKey(prev => prev + 1);
    setCurrentView(view);
  };

  const toggleTheme = () => {
    setIsDarkTheme(prev => {
        const next = !prev;
        localStorage.setItem('theme', next ? 'dark' : 'light');
        if (next) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return next;
    });
  };

  const handleLoginSuccess = (role: UserRole) => {
    setUserRole(role);
    handleNavigate(ViewState.DASHBOARD);
  };

  const handleLogout = async () => {
    if (!isMockMode && auth) await auth.signOut();
    setUserRole(UserRole.GURU);
    handleNavigate(ViewState.LOGIN);
  };

  const backToDashboard = () => handleNavigate(ViewState.DASHBOARD);

  if (authLoading) {
      return (
          <div className="fixed inset-0 h-screen w-full flex flex-col items-center justify-center bg-[#020617] z-[100]">
              <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-500">
                  <div className="w-16 h-16 mb-6 opacity-40"><AppLogo className="w-full h-full" /></div>
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin opacity-30" />
              </div>
          </div>
      );
  }

  const isLoginPage = currentView === ViewState.LOGIN || currentView === ViewState.REGISTER;

  const staffAbove = [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH];
  const adminDevOnly = [UserRole.ADMIN, UserRole.DEVELOPER];
  const devOnly = [UserRole.DEVELOPER];

  const renderView = () => {
    return (
      <Suspense fallback={<PageLoader />}>
        <div key={viewKey} className="h-full w-full relative">
          {(() => {
            switch (currentView) {
              case ViewState.LOGIN: return <Masuk onLogin={handleLoginSuccess} onRegisterClick={() => handleNavigate(ViewState.REGISTER)} />;
              case ViewState.REGISTER: return <Daftar onLogin={handleLoginSuccess} onLoginClick={() => handleNavigate(ViewState.LOGIN)} />;
              case ViewState.DASHBOARD: return <Beranda onNavigate={handleNavigate} isDarkMode={isDarkTheme} onToggleTheme={toggleTheme} userRole={userRole} onLogout={handleLogout} />;
              case ViewState.PROFILE: return <Profile onBack={backToDashboard} onLogout={handleLogout} />;
              case ViewState.SCHEDULE: return <Schedule onBack={backToDashboard} />;
              case ViewState.ALL_FEATURES: return <AllFeatures onBack={backToDashboard} onNavigate={handleNavigate} userRole={userRole} />;
              case ViewState.NEWS: return <News onBack={backToDashboard} />;
              case ViewState.ABOUT: return <About onBack={backToDashboard} />;
              case ViewState.LOGIN_HISTORY: return <LoginHistory onBack={backToDashboard} />;
              case ViewState.ID_CARD: return <IDCard onBack={backToDashboard} />;
              case ViewState.HISTORY: return <History onBack={backToDashboard} userRole={userRole} />;
              case ViewState.PREMIUM: return <Premium onBack={backToDashboard} />;
              case ViewState.ADVISOR: return <Advisor onBack={backToDashboard} />;
              case ViewState.MADRASAH_INFO: return <MadrasahInfo onBack={backToDashboard} />;
              case ViewState.KEMENAG_HUB: return <KemenagHub onBack={backToDashboard} />;
              case ViewState.ENROLLMENT: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><PendaftaranSiswa onBack={backToDashboard} userRole={userRole} /></ProtectedRoute>;
              case ViewState.CLASSES: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><ClassList onBack={backToDashboard} userRole={userRole} /></ProtectedRoute>;
              case ViewState.SCANNER: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><QRScanner onBack={backToDashboard} /></ProtectedRoute>;
              case ViewState.ATTENDANCE_HISTORY: return <RiwayatPresensi onBack={backToDashboard} onNavigate={handleNavigate} userRole={userRole} />;
              case ViewState.PRESENSI: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><Presensi onBack={backToDashboard} onNavigate={handleNavigate} /></ProtectedRoute>;
              case ViewState.CONTENT_GENERATION: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><ContentGeneration onBack={backToDashboard} /></ProtectedRoute>;
              case ViewState.REPORTS: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={backToDashboard}><Reports onBack={backToDashboard} /></ProtectedRoute>;
              case ViewState.JOURNAL: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><JurnalMengajar onBack={backToDashboard} userRole={userRole} /></ProtectedRoute>;
              case ViewState.ASSIGNMENTS: return <Assignments onBack={backToDashboard} userRole={userRole} />;
              case ViewState.GRADES:
              case ViewState.REPORT_CARDS: return <Grades onBack={backToDashboard} userRole={userRole} />;
              case ViewState.STUDENTS: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><DataSiswa onBack={backToDashboard} userRole={userRole} /></ProtectedRoute>;
              case ViewState.STUDENT_USERS: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={backToDashboard}><StudentUsers onBack={backToDashboard} /></ProtectedRoute>;
              case ViewState.TEACHERS: return <ProtectedRoute allowedRoles={staffAbove} userRole={userRole} onBack={backToDashboard}><DataGuru onBack={backToDashboard} userRole={userRole} /></ProtectedRoute>;
              case ViewState.LETTERS: return <Letters onBack={backToDashboard} userRole={userRole} />;
              case ViewState.POINTS: return <PointsView onBack={backToDashboard} />;
              case ViewState.ACADEMIC_YEAR: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={backToDashboard}><AcademicYear onBack={backToDashboard} /></ProtectedRoute>;
              case ViewState.PROMOTION: return <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={backToDashboard}><ClassPromotion onBack={backToDashboard} /></ProtectedRoute>;
              case ViewState.PUSAKA: return <GenericView title="Pusaka Kemenag" onBack={backToDashboard} description="Integrasi resmi dengan Pusaka Super Apps RI." />;
              case ViewState.CREATE_ACCOUNT: 
                return (
                    <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={backToDashboard}>
                        <CreateAccount onBack={backToDashboard} userRole={userRole} />
                    </ProtectedRoute>
                );
              case ViewState.USER_MANAGEMENT:
                return (
                    <ProtectedRoute allowedRoles={adminDevOnly} userRole={userRole} onBack={backToDashboard}>
                        <UserManagement onBack={backToDashboard} onNavigate={handleNavigate} />
                    </ProtectedRoute>
                );
              case ViewState.DEVELOPER: return <ProtectedRoute allowedRoles={devOnly} userRole={userRole} onBack={backToDashboard}><DeveloperConsole onBack={backToDashboard} /></ProtectedRoute>;
              case ViewState.SETTINGS: return <Settings onBack={backToDashboard} onNavigate={handleNavigate} onLogout={handleLogout} isDarkMode={isDarkTheme} onToggleTheme={toggleTheme} userRole={userRole} />;
              case ViewState.NOTIFICATIONS: return <NotificationsView onBack={backToDashboard} onNavigate={handleNavigate} />;
              default: return <GenericView title="Fitur" onBack={backToDashboard} />;
            }
          })()}
        </div>
      </Suspense>
    );
  };

  return (
    <div className="h-full w-full flex flex-col font-sans overflow-hidden bg-white dark:bg-[#020617] relative">
        {!isOnline && (
            <div className="fixed top-0 left-0 right-0 z-[1000] bg-orange-600 text-white text-[9px] font-black uppercase tracking-[0.2em] text-center py-1">
                Mode Offline Aktif
            </div>
        )}
        
        <div className="h-full w-full relative flex overflow-hidden z-10">
            {!isLoginPage && (
                <div className="hidden lg:block w-72 lg:w-80 shrink-0 h-full border-r border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-[#0B1121]/50 backdrop-blur-xl z-40">
                    <BilahSamping currentView={currentView} onNavigate={handleNavigate} userRole={userRole} onLogout={handleLogout} />
                </div>
            )}
            
            <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden">
                <div className="flex-1 overflow-hidden relative">
                    {renderView()}
                </div>
                
                {!isLoginPage && (
                    <div className="lg:hidden shrink-0 z-50">
                        <NavigasiBawah currentView={currentView} onNavigate={handleNavigate} userRole={userRole} />
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default App;
