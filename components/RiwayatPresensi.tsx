
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  CalendarIcon, CheckCircleIcon, ClockIcon, Search, 
  PencilIcon, TrashIcon, Loader2, HeartIcon, 
  SaveIcon, ChevronDownIcon, ArrowLeftIcon, BookOpenIcon,
  XCircleIcon
} from './Ikon';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ViewState, AttendanceStatus, UserRole, AttendanceRecord, Student } from '../types';

interface RiwayatPresensiProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  userRole: UserRole;
}

const RiwayatPresensi: React.FC<RiwayatPresensiProps> = ({ onBack, onNavigate, userRole }) => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({
      status: 'Hadir' as AttendanceStatus,
      checkIn: '',
      duha: '',
      zuhur: '',
      ashar: '',
      checkOut: ''
  });

  const isStudent = userRole === UserRole.SISWA;

  // Load Daftar Kelas
  useEffect(() => {
    if (isMockMode) {
        setClasses(['X IPA 1', 'X IPA 2', 'XI IPS 1', 'XI IPS 2', 'XII AGAMA']);
        return;
    }
    if (db) {
        db.collection('classes').get().then(s => {
            const names = s.docs.map(d => d.data().name).sort((a, b) => (a || '').localeCompare(b || ''));
            setClasses(names);
        });
        
        // Listener daftar siswa aktif hanya perlu sekali saat mount
        const unsubStudents = db.collection('students').where('status', '==', 'Aktif').onSnapshot(snap => {
            setAllStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
        });
        return () => unsubStudents();
    }
  }, []);

  // Load Data Absensi
  useEffect(() => {
    setLoading(true);

    if (isMockMode) {
        setTimeout(() => {
            setAttendanceRecords([
                { 
                    id: 's1_' + selectedDate, studentId: 's1', studentName: 'ADELIA SRI SUNDARI', 
                    class: 'XII IPA 1', status: 'Hadir', date: selectedDate, 
                    checkIn: '07:15:00', duha: '08:20:00', zuhur: '12:30:00', ashar: null, checkOut: null 
                } as any
            ]);
            setLoading(false);
        }, 500);
        return;
    }

    if (!db) return;
    
    const unsubAttendance = db.collection('attendance').where('date', '==', selectedDate).onSnapshot(snap => {
        setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
        setLoading(false);
    }, err => {
        console.error(err);
        setLoading(false);
    });

    return () => unsubAttendance();
  }, [selectedDate]);

  // Fungsi Ekstraksi Waktu (HH:mm) dari format manapun
  const cleanTime = (val: string | null) => {
      if (!val) return '';
      const timeStr = String(val);
      // Jika ada teks "(Haid)", ambil jam di depannya saja
      if (timeStr.includes('(')) return timeStr.split(' ')[0].substring(0, 5);
      return timeStr.substring(0, 5);
  };

  const isHaidTime = (val: string | null) => !!(val && String(val).includes('(Haid)'));

  const displayData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filteredStudents = allStudents.filter(s => {
        const matchesClass = selectedClass === 'All' || s.tingkatRombel === selectedClass;
        const matchesSearch = q === '' || 
                             (s.namaLengkap || '').toLowerCase().includes(q) ||
                             String(s.idUnik || '').toLowerCase().includes(q);
        return matchesClass && matchesSearch;
    }).sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));

    const attMap = new Map(attendanceRecords.map(r => [r.studentId, r]));

    return filteredStudents.map(student => {
        const record = attMap.get(student.id!);
        return record || {
            id: `${student.id}_${selectedDate}`,
            studentId: student.id!,
            studentName: student.namaLengkap,
            class: student.tingkatRombel,
            date: selectedDate,
            status: 'Alpha',
            checkIn: null, duha: null, zuhur: null, ashar: null, checkOut: null,
            idUnik: student.idUnik
        } as any;
    }).filter(r => filterStatus === 'All' || r.status === filterStatus);
  }, [allStudents, attendanceRecords, selectedDate, searchQuery, selectedClass, filterStatus]);

  const handleEditClick = (record: AttendanceRecord) => {
      setEditingRecord(record);
      setEditForm({ 
          status: record.status || 'Alpha', 
          checkIn: cleanTime(record.checkIn), 
          duha: cleanTime(record.duha), 
          zuhur: cleanTime(record.zuhur), 
          ashar: cleanTime(record.ashar), 
          checkOut: cleanTime(record.checkOut) 
      });
      setIsEditModalOpen(true);
  };

  const handleResetRecord = async (record: AttendanceRecord) => {
      const isExisting = attendanceRecords.find(r => r.studentId === record.studentId);
      if (!isExisting) {
          toast.error("Siswa ini belum melakukan presensi.");
          return;
      }
      if (!window.confirm(`Hapus seluruh rekaman kehadiran ${record.studentName} tanggal ${selectedDate}?`)) return;
      const toastId = toast.loading("Menghapus data di Firestore...");
      try {
          if (!isMockMode && db) {
              await db.collection('attendance').doc(record.id).delete();
          } else if (isMockMode) {
              setAttendanceRecords(prev => prev.filter(r => r.id !== record.id));
          }
          toast.success("Seluruh sesi berhasil direset", { id: toastId });
      } catch (e: any) {
          toast.error("Gagal: " + e.message, { id: toastId });
      }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingRecord) return;
      setSaving(true);
      const toastId = toast.loading("Menyimpan perubahan...");
      try {
          const status = editForm.status;
          const payload: any = {
              status: status,
              checkIn: editForm.checkIn ? `${editForm.checkIn}:00` : null,
              duha: editForm.duha ? `${editForm.duha}:00` : null,
              zuhur: editForm.zuhur ? `${editForm.zuhur}:00` : null,
              ashar: editForm.ashar ? `${editForm.ashar}:00` : null,
              checkOut: editForm.checkOut ? `${editForm.checkOut}:00` : null,
              studentId: editingRecord.studentId,
              studentName: editingRecord.studentName,
              class: editingRecord.class,
              date: selectedDate,
              idUnik: (editingRecord as any).idUnik || ''
          };
          if (!isMockMode && db) {
              await db.collection('attendance').doc(editingRecord.id).set(payload, { merge: true });
          } else if (isMockMode) {
              setAttendanceRecords(prev => {
                  const filtered = prev.filter(r => r.studentId !== editingRecord.studentId);
                  return [...filtered, { id: editingRecord.id, ...payload }];
              });
          }
          toast.success("Log diperbarui", { id: toastId });
          setIsEditModalOpen(false);
      } catch (e: any) {
          toast.error("Gagal menyimpan: " + e.message, { id: toastId });
      } finally {
          setSaving(false);
      }
  };

  const SessionStatus = ({ label, time }: { label: string, time: string | null }) => {
      const isFilled = !!time;
      const displayJam = cleanTime(time);
      return (
          <div className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border flex-1 transition-all ${
              isFilled 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
              : 'bg-slate-50 dark:bg-slate-900 border-transparent opacity-30'
          }`}>
              <span className="text-[6px] font-black uppercase tracking-tighter">{label}</span>
              <span className="text-[9px] font-mono font-black">{isFilled ? displayJam : '--:--'}</span>
          </div>
      );
  };

  return (
    <Layout title="Riwayat Absensi" subtitle={isStudent ? "Log Kehadiran Saya" : "Manajemen Data Riwayat"} icon={CalendarIcon} onBack={onBack}>
      <div className="p-4 lg:p-6 pb-32 space-y-6">
        {/* Filters Panel */}
        <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Tanggal</label>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" />
                </div>
                {!isStudent && (
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filter Rombel</label>
                        <div className="relative">
                            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase outline-none appearance-none cursor-pointer shadow-inner">
                                <option value="All">SEMUA KELAS</option>
                                {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}
            </div>
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input type="text" placeholder="Cari Nama atau ID Unik..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-indigo-100 rounded-2xl text-xs font-bold shadow-inner outline-none transition-all" />
            </div>
            {!isStudent && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['All', 'Hadir', 'Sakit', 'Izin', 'Alpha'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border whitespace-nowrap ${filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>{s === 'Alpha' ? 'Belum Direkam' : s}</button>
                    ))}
                </div>
            )}
        </div>

        {/* List Content */}
        <div className="space-y-4">
            {loading ? (
                <div className="py-20 text-center flex flex-col items-center gap-3"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Database...</p></div>
            ) : displayData.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {displayData.map((r) => {
                        const hasData = attendanceRecords.find(att => att.studentId === r.studentId);
                        return (
                        <div key={r.id} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group relative overflow-hidden transition-all hover:border-indigo-100">
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${r.status === 'Hadir' ? 'bg-emerald-500' : r.status === 'Alpha' ? 'bg-slate-200' : 'bg-amber-400'}`}></div>
                            
                            <div className="flex items-start justify-between mb-4 pl-2">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 border-2 transition-transform group-hover:scale-105 ${r.status === 'Alpha' ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{(r.studentName || '?').charAt(0)}</div>
                                    <div className="min-w-0">
                                        <h4 className={`font-black text-xs uppercase truncate mb-1.5 ${r.status === 'Alpha' ? 'text-slate-400' : 'text-slate-800 dark:text-white'}`}>{r.studentName}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${r.status === 'Alpha' ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {r.status === 'Alpha' ? 'BELUM DIREKAM' : r.status}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{r.class || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                {!isStudent && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditClick(r)} className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-sm active:scale-90" title="Edit Log"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleResetRecord(r)} className={`p-3 rounded-2xl transition-all shadow-sm active:scale-90 ${hasData ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-600 hover:text-white' : 'bg-slate-50/50 text-slate-200 cursor-not-allowed'}`} title="Reset Kehadiran (Hapus Seluruh Sesi)"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>

                            {/* PILAR 5 SESI TERPADU */}
                            <div className="flex gap-2 pl-2">
                                <SessionStatus label="MSK" time={r.checkIn} />
                                <SessionStatus label="DHA" time={r.duha} />
                                <SessionStatus label="ZHR" time={r.zuhur} />
                                <SessionStatus label="ASR" time={r.ashar} />
                                <SessionStatus label="PLG" time={r.checkOut} />
                            </div>
                        </div>
                    )})}
                </div>
            ) : (
                <div className="py-24 text-center bg-white dark:bg-[#151E32] rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
                    <Search className="w-12 h-12 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak Ada Data Siswa</p>
                </div>
            )}
        </div>
      </div>

      {/* Modal Edit/Koreksi */}
      {isEditModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-white/10 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
                  <div className="text-center mb-8">
                      <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-[0.2em]">Koreksi Log Sesi</h3>
                      <p className="text-[9px] font-bold text-indigo-500 mt-2 truncate">{(editingRecord?.studentName || '').toUpperCase()}</p>
                  </div>
                  
                  <form onSubmit={handleSaveEdit} className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Status Presensi</label>
                        <div className="relative">
                            <select value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value as AttendanceStatus})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase outline-none shadow-inner appearance-none cursor-pointer">
                                <option value="Alpha">BELUM DIREKAM (ALPHA)</option>
                                <option value="Hadir">HADIR</option>
                                <option value="Sakit">SAKIT</option>
                                <option value="Izin">IZIN / DISPEN</option>
                            </select>
                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Input Jam Per Sesi</p>
                          
                          <div className="space-y-3">
                              {[
                                { id: 'checkIn', label: 'Masuk' },
                                { id: 'duha', label: 'Duha' },
                                { id: 'zuhur', label: 'Zuhur' },
                                { id: 'ashar', label: 'Ashar' },
                                { id: 'checkOut', label: 'Pulang' }
                              ].map((s) => (
                                <div key={s.id} className="flex items-center gap-3">
                                    <label className="w-12 text-[8px] font-black text-slate-400 uppercase">{s.label}</label>
                                    <div className="flex-1 relative group">
                                        <input 
                                            type="time" 
                                            value={(editForm as any)[s.id]} 
                                            onChange={e => setEditForm({...editForm, [s.id]: e.target.value})} 
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black outline-none focus:border-indigo-500" 
                                        />
                                        {(editForm as any)[s.id] && (
                                            <button 
                                                type="button" 
                                                onClick={() => setEditForm({...editForm, [s.id]: ''})}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors"
                                                title="Hapus rekaman sesi ini dari database"
                                            >
                                                <XCircleIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                              ))}
                          </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-6">
                        <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveIcon className="w-4 h-4" />} Simpan Koreksi Sesi
                        </button>
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Batalkan</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default RiwayatPresensi;
