
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, isMockMode } from '../services/firebase';
import { Student, ViewState, MadrasahData, AttendanceRecord } from '../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id'; 
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { 
    CalendarIcon, Loader2, ChevronLeft, ChevronRight, 
    Search, ArrowLeftIcon, 
    CameraIcon, PencilIcon, TrashIcon,
    PrinterIcon,
    XCircleIcon, BookOpenIcon,
    ChevronDownIcon, SaveIcon, HeartIcon
} from './Ikon';

const Presensi: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void }> = ({ onBack, onNavigate }) => {
  const [date, setDate] = useState<Date>(new Date());
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendanceSnapshot, setAttendanceSnapshot] = useState<AttendanceRecord[]>([]);
  const [classList, setClassList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [madrasahInfo, setMadrasahInfo] = useState<MadrasahData | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isMockMode || !db) return;
    
    // Listener daftar siswa aktif hanya perlu sekali saat mount
    const unsubS = db.collection("students").where("status", "==", "Aktif").onSnapshot(s => {
        setAllStudents(s.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    });

    db.collection('classes').get().then(snap => {
        const names = snap.docs.map(doc => doc.data().name).sort();
        setClassList(names);
    });

    db.collection('settings').doc('madrasahInfo').get().then(doc => {
        if (doc.exists) setMadrasahInfo(doc.data() as MadrasahData);
    });

    return () => unsubS();
  }, []);

  useEffect(() => {
    if (isMockMode) {
        setLoading(true);
        setAllStudents([
            { id: '1', namaLengkap: 'ADELIA SRI SUNDARI', tingkatRombel: 'XII IPA 1', nisn: '0086806447', status: 'Aktif', jenisKelamin: 'Perempuan', idUnik: '25002' } as any
        ]);
        setClassList(['XII IPA 1']);
        setLoading(false); 
        return;
    }
    if (!db) return;

    setLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");
    
    const unsubA = db.collection("attendance").where("date", "==", dateStr).onSnapshot(s => {
        setAttendanceSnapshot(s.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
        setLoading(false);
    });

    return () => unsubA();
  }, [date]);

  const displayData = useMemo(() => {
    const searchLower = (searchTerm || '').toLowerCase().trim();
    const filteredStudents = allStudents
        .filter(s => {
            const name = String(s.namaLengkap || '').toLowerCase();
            const id = String(s.idUnik ?? '').toLowerCase();
            const matchesSearch = name.includes(searchLower) || id.includes(searchLower);
            const matchesClass = selectedClass === 'All' || s.tingkatRombel === selectedClass;
            return matchesSearch && matchesClass;
        })
        .sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));

    const attMap = new Map(attendanceSnapshot.map(r => [r.studentId, r]));
    
    return filteredStudents.map(s => {
        const record = attMap.get(s.id!);
        return (record || {
            id: `${s.id}_${format(date, "yyyy-MM-dd")}`,
            studentId: s.id!, studentName: s.namaLengkap, class: s.tingkatRombel,
            status: 'Alpha', checkIn: null, checkOut: null, duha: null, zuhur: null, ashar: null,
            idUnik: s.idUnik
        } as any);
    });
  }, [allStudents, attendanceSnapshot, date, searchTerm, selectedClass]);

  const formatTimeDisplay = (val: string | null) => {
    if (!val) return '--:--';
    const s = String(val);
    if (s.includes('(')) return s.split(' ')[0].substring(0, 5);
    return s.substring(0, 5);
  };

  const isHaidValue = (val: string | null) => !!(val && String(val).includes('(Haid)'));

  const handleEditClick = (record: AttendanceRecord) => {
      setEditingRecord({ ...record });
      setIsModalOpen(true);
  };

  const handleDeleteRecord = async (record: AttendanceRecord) => {
      if (record.status === 'Alpha' && !record.checkIn && !record.id.includes('-')) {
          toast.error("Data presensi belum tercatat.");
          return;
      }
      if (!window.confirm(`Hapus data presensi ${record.studentName} hari ini secara permanen?`)) return;
      const toastId = toast.loading("Menghapus record...");
      try {
          if (!isMockMode && db) {
              await db.collection("attendance").doc(record.id).delete();
          } else if (isMockMode) {
              setAttendanceSnapshot(prev => prev.filter(r => r.id !== record.id));
          }
          toast.success("Data dihapus", { id: toastId });
      } catch (e) {
          toast.error("Gagal menghapus data", { id: toastId });
      }
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingRecord) return;
      setSaving(true);
      const toastId = toast.loading("Menyimpan perubahan...");
      try {
          if (!isMockMode && db) {
              await db.collection("attendance").doc(editingRecord.id).set(editingRecord, { merge: true });
          } else if (isMockMode) {
              setAttendanceSnapshot(prev => {
                  const exists = prev.find(r => r.id === editingRecord.id);
                  if (exists) return prev.map(r => r.id === editingRecord.id ? editingRecord : r);
                  return [...prev, editingRecord];
              });
          }
          toast.success("Presensi diperbarui", { id: toastId });
          setIsModalOpen(false);
      } catch (e) {
          toast.error("Gagal memperbarui data", { id: toastId });
      } finally {
          setSaving(false);
      }
  };

  const handleExportPDF = async () => {
    if (loading) { toast.error("Memuat data..."); return; }
    if (displayData.length === 0) { toast.error("Tidak ada data."); return; }
    const toastId = toast.loading("Membangun Dokumen PDF...");
    
    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const centerX = pageWidth / 2;
        const margin = 15;

        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text("KEMENTERIAN AGAMA REPUBLIK INDONESIA", centerX + 8, 14, { align: "center" });
        doc.setFontSize(12);
        doc.text((madrasahInfo?.nama || "MAN 1 HULU SUNGAI TENGAH").toUpperCase(), centerX + 8, 24, { align: "center" });
        doc.setLineWidth(0.6); doc.line(margin, 30, pageWidth - margin, 30);

        autoTable(doc, {
            startY: 40,
            head: [['NO', 'ID UNIK', 'NAMA LENGKAP SISWA', 'KLS', 'MSK', 'DHA', 'ZHR', 'ASR', 'PLG', 'ST']],
            body: displayData.map((r, i) => {
                const haidTime = (r.duha || r.zuhur || r.ashar || '').includes('(Haid)') ? formatTimeDisplay(r.duha || r.zuhur || r.ashar) : '';
                return [
                    i + 1, r.idUnik || '-', (r.studentName || '').toUpperCase(), (r.class || '').replace('IPA ', '').replace('IPS ', ''),
                    formatTimeDisplay(r.checkIn), formatTimeDisplay(r.duha), formatTimeDisplay(r.zuhur), formatTimeDisplay(r.ashar), formatTimeDisplay(r.checkOut),
                    r.status === 'Haid' ? `HD ${haidTime}` : r.status === 'Alpha' ? 'A' : 'H'
                ]
            }),
            headStyles: { fillColor: [43, 58, 85], halign: 'center', fontSize: 6.5, textColor: [255, 255, 255] },
            styles: { fontSize: 6.5, font: 'helvetica', cellPadding: 1.5 }
        });

        doc.save(`PRESENSI_${selectedClass}_${format(date, 'yyyyMMdd')}.pdf`);
        toast.success("PDF Berhasil Dibuat", { id: toastId });
    } catch (e) { toast.error("Gagal mencetak laporan PDF."); }
  };

  const SessionPill = ({ label, time, color }: { label: string, time: string | null, color: string }) => {
      const isFilled = !!time;
      const isHaid = isHaidValue(time);
      const activeColorClass = isHaid ? 'text-rose-600' : `text-${color}-600`;
      const activeBgClass = isHaid ? 'bg-rose-50 border-rose-100' : `bg-${color}-50/50 dark:bg-${color}-900/10 border-${color}-100`;

      return (
        <div className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all ${
            isFilled ? activeBgClass : 'bg-slate-50/30 dark:bg-slate-900/30 border-slate-100 opacity-40'
        }`}>
            <span className={`text-[6px] font-black uppercase tracking-tighter ${isFilled ? activeColorClass : 'text-slate-400'}`}>{label}</span>
            <span className={`text-[10px] font-mono font-black ${isFilled ? activeColorClass : 'text-slate-300'}`}>
                {isFilled ? formatTimeDisplay(time) : '--:--'}
            </span>
        </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden">
      {/* Header Sticky */}
      <div className="bg-white/80 dark:bg-[#0B1121]/90 backdrop-blur-xl px-5 py-4 flex items-center justify-between z-40 sticky top-0 border-b border-slate-100 dark:border-slate-800 safe-pt">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90 transition-all hover:text-indigo-600"><ArrowLeftIcon className="w-5 h-5" /></button>
              <div>
                  <h2 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">Presensi Siswa</h2>
                  <p className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">Manajemen Database Kehadiran</p>
              </div>
          </div>
          <div className="flex gap-2">
              <button onClick={handleExportPDF} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl transition-all hover:bg-rose-50 hover:text-rose-600"><PrinterIcon className="w-5 h-5" /></button>
              <button onClick={() => onNavigate(ViewState.SCANNER)} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"><CameraIcon className="w-5 h-5" /></button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 lg:p-8 space-y-6 pb-40 max-w-5xl mx-auto w-full">
          
          {/* Filters Card */}
          <div className="bg-white dark:bg-[#151E32] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
              <div className="relative group w-full">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Cari nama lengkap atau ID unik siswa..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-indigo-100 dark:focus:border-indigo-900 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none text-slate-800 dark:text-white shadow-inner transition-all"
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <button onClick={() => setDate(new Date(date.getTime() - 86400000))} className="p-2.5 rounded-xl transition-all active:scale-90 hover:bg-white dark:hover:bg-slate-800 text-slate-400"><ChevronLeft className="w-4 h-4"/></button>
                      <div className="flex-1 text-center min-w-[140px]"><h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">{format(date, "dd MMMM yyyy", { locale: localeID })}</h3></div>
                      <button onClick={() => setDate(new Date(date.getTime() + 86400000))} className="p-2.5 rounded-xl transition-all active:scale-90 hover:bg-white dark:hover:bg-slate-800 text-slate-400"><ChevronRight className="w-4 h-4"/></button>
                  </div>
                  <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors"><BookOpenIcon className="w-4 h-4" /></div>
                      <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-10 text-xs font-black text-slate-800 dark:text-white outline-none appearance-none cursor-pointer shadow-inner">
                          <option value="All">SEMUA ROMBEL</option>
                          {classList.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
              </div>
          </div>

          {/* Records List */}
          <div className="space-y-4">
              {loading ? (
                  <div className="py-20 text-center flex flex-col items-center gap-3"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Absensi...</p></div>
              ) : displayData.length > 0 ? (
                  displayData.map((record) => {
                    const isHaid = record.status === 'Haid';
                    const haidTime = isHaid ? formatTimeDisplay(record.duha || record.zuhur || record.ashar) : '';
                    return (
                    <div key={record.id} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group relative overflow-hidden transition-all hover:shadow-xl hover:border-indigo-100">
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${isHaid ? 'bg-rose-500' : 'bg-indigo-500 opacity-20'}`}></div>
                        <div className="flex items-start justify-between mb-6 pl-2">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 border-2 transition-transform group-hover:scale-105 ${isHaid ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{(record.studentName || '?').charAt(0)}</div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-sm uppercase truncate text-slate-800 dark:text-white">{record.studentName}</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{record.class || '-'}</span>
                                        <span className="text-[9px] font-mono text-slate-300">#{record.idUnik || '-'}</span>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${isHaid ? 'bg-rose-50 text-rose-600' : 'text-slate-400 bg-slate-100'}`}>{isHaid ? `HAID (${haidTime})` : record.status}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => handleEditClick(record)} className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all"><PencilIcon className="w-4 h-4" /></button>
                               <button onClick={() => handleDeleteRecord(record)} className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-rose-600 rounded-2xl transition-all"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="flex gap-2.5 pl-2 cursor-pointer" onClick={() => handleEditClick(record)}>
                            <SessionPill label="MSK" time={record.checkIn} color="emerald" />
                            <SessionPill label="DHA" time={record.duha} color="violet" />
                            <SessionPill label="ZHR" time={record.zuhur} color="blue" />
                            <SessionPill label="ASR" time={record.ashar} color="amber" />
                            <SessionPill label="PLG" time={record.checkOut} color="rose" />
                        </div>
                    </div>
                  )})
              ) : (
                <div className="py-24 text-center bg-white dark:bg-[#151E32] rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <Search className="w-12 h-12 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada siswa yang sesuai kriteria</p>
                </div>
              )}
          </div>
      </div>

      {/* Modal Koreksi Data Lengkap */}
      {isModalOpen && editingRecord && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-white/10 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
                  <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase mb-6 text-center tracking-[0.2em]">Koreksi Kehadiran</h3>
                  
                  <form onSubmit={handleSaveCorrection} className="space-y-6">
                      <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nama Peserta Didik</label>
                          <div className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black text-indigo-600 truncate">{editingRecord.studentName}</div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Status Kehadiran</label>
                        <select 
                            value={editingRecord.status} 
                            onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value as any })}
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase outline-none shadow-inner cursor-pointer"
                        >
                            <option value="Hadir">HADIR</option>
                            <option value="Haid">HAID</option>
                            <option value="Sakit">SAKIT</option>
                            <option value="Izin">IZIN</option>
                            <option value="Alpha">ALPHA / ALPA</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Jam Masuk</label>
                              <input 
                                type="time" 
                                value={formatTimeDisplay(editingRecord.checkIn)} 
                                onChange={e => setEditingRecord({ ...editingRecord, checkIn: editingRecord.status === 'Haid' ? `${e.target.value} (Haid)` : `${e.target.value}:00` })}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black shadow-inner"
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Jam Pulang</label>
                              <input 
                                type="time" 
                                value={formatTimeDisplay(editingRecord.checkOut)} 
                                onChange={e => setEditingRecord({ ...editingRecord, checkOut: `${e.target.value}:00` })}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black shadow-inner"
                              />
                          </div>
                      </div>

                      <div className="pt-4 flex flex-col gap-3">
                        <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                           {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveIcon className="w-4 h-4" />} Simpan Perubahan
                        </button>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Batalkan</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

export default Presensi;
