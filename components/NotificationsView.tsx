
import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  BellIcon, CheckCircleIcon, AcademicCapIcon, 
  MegaphoneIcon, ArrowLeftIcon, TrashIcon,
  ClockIcon, ChevronRight
} from './Ikon';
import { Notification, ViewState } from '../types';
import { getNotifications, markAsRead } from '../services/notificationService';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface NotificationsViewProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ onBack, onNavigate }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = getNotifications((data) => {
      setNotifications(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read && notif.id) {
      await markAsRead(notif.id);
    }
    
    if (notif.link) {
      onNavigate(notif.link as ViewState);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <AcademicCapIcon className="w-5 h-5 text-indigo-500" />;
      case 'grade': return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
      case 'announcement': return <MegaphoneIcon className="w-5 h-5 text-orange-500" />;
      default: return <BellIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <Layout 
      title="Notifikasi" 
      subtitle="Pesan & Pemberitahuan Terbaru" 
      icon={BellIcon} 
      onBack={onBack}
    >
      <div className="p-4 lg:p-6 pb-24 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Notifikasi...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#151E32] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
              <BellIcon className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">Belum Ada Notifikasi</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Semua pemberitahuan penting akan muncul di sini.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group relative overflow-hidden ${
                  notif.read 
                    ? 'bg-white dark:bg-[#151E32] border-slate-100 dark:border-slate-800 opacity-70' 
                    : 'bg-white dark:bg-[#151E32] border-indigo-100 dark:border-indigo-900/50 shadow-sm ring-1 ring-indigo-500/5'
                }`}
              >
                {!notif.read && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                )}
                
                <div className={`p-2.5 rounded-xl shrink-0 ${notif.read ? 'bg-slate-50 dark:bg-slate-900' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-xs font-black uppercase tracking-tight truncate pr-4 ${notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[8px] font-bold text-slate-400 uppercase whitespace-nowrap flex items-center gap-1">
                      <ClockIcon className="w-2.5 h-2.5" />
                      {format(new Date(notif.createdAt), 'HH:mm', { locale: id })}
                    </span>
                  </div>
                  <p className={`text-[10px] leading-relaxed line-clamp-2 ${notif.read ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {notif.message}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                      {format(new Date(notif.createdAt), 'dd MMMM yyyy', { locale: id })}
                    </span>
                    {notif.link && (
                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Lihat Detail <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NotificationsView;
