
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useMemo, useEffect } from 'react';
import { db, isMockMode } from '../services/firebase';
import { Student, UserRole, Teacher, ClassData } from '../types';
import { 
    Loader2, ChevronDownIcon, PencilIcon, TrashIcon, BookOpenIcon,
    SaveIcon, ArrowLeftIcon, ArrowRightIcon, BriefcaseIcon, 
    UsersIcon, XCircleIcon, SparklesIcon, IdentificationIcon, StarIcon,
    CheckCircleIcon
} from './Ikon';
import { toast } from 'sonner';
import { updateStudent, deleteStudent } from '../services/studentService';

const ClassList: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [activeTab, setActiveTab] = useState<'personalia' | 'students' | 'subjects'>('personalia');
  
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isStudentEditModalOpen, setIsStudentEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [editDetail, setEditDetail] = useState<Partial<ClassData>>({});

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  useEffect(() => {
    setLoading(true);
    if (isMockMode) {
        setClasses([
            { id: '1', name: 'X IPA 1', level: '10', teacherId: 't1', teacherName: 'Budi Santoso, S.Pd', academicYear: '2023/2024' },
            { id: '2', name: 'XI IPS 2', level: '11', teacherId: 't2', teacherName: 'Siti Aminah, M.Ag', academicYear: '2023/2024' }
        ]);
        setAllStudents([
            { id: '25002', namaLengkap: 'ADELIA SRI SUNDARI', idUnik: '25002', tingkatRombel: 'X IPA 1', status: 'Aktif', jenisKelamin: 'Perempuan', nisn: '0086806440' } as Student,
            { id: '25002_dup', namaLengkap: 'ADELIA SRI SUNDARI', idUnik: '25002', tingkatRombel: 'XI IPS 2', status: 'Aktif', jenisKelamin: 'Perempuan', nisn: '0086806440' } as Student
        ]);
        setLoading(false);
        return;
    }

    if (!db) return;
    const unsubClasses = db.collection('classes').onSnapshot(snap => setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData))));
    const unsubStudents = db.collection('students').onSnapshot(snap => setAllStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))));
    const unsubTeachers = db.collection('teachers').onSnapshot(snap => setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher))));

    setLoading(false);
    return () => { unsubClasses(); unsubStudents(); unsubTeachers(); };
  }, []);

  // ANALISIS DATA GANDA GLOBAL (Mencari idUnik yang muncul di >1 dokumen)
  const duplicateRegistry = useMemo(() => {
    const map: Record<string, string[]> = {};
    allStudents.forEach(s => {
        if (s.idUnik) {
            // PERBAIKAN: Casting eksplisit ke String sebelum digunakan sebagai Key Map
            const uid = String(s.idUnik);
            if (!map[uid]) map[uid] = [];
            if (s.tingkatRombel) map[uid].push(s.tingkatRombel);
        }
    });
    return map;
  }, [allStudents]);

  const handleKickFromClass = async (studentId: string, studentName: string, currentRombel: string) => {
    if (!studentId) return;
    if (window.confirm(`Keluarkan ${studentName} dari kelas ${currentRombel}?`)) {
        const toastId = toast.loading("Memproses...");
        try {
            await updateStudent(studentId, { tingkatRombel: '' });
            toast.success("Siswa dikeluarkan dari rombel.", { id: toastId });
            setIsStudentEditModalOpen(false);
        } catch (e: any) { toast.error("Gagal: " + e.message, { id: toastId }); }
    }
  };

  const handleDeletePermanently = async (studentId: string, studentName: string) => {
    if (!studentId) return;
    if (window.confirm(`HAPUS PERMANEN data ${studentName}? Gunakan ini hanya untuk membersihkan duplikat data yang salah. Tindakan ini tidak dapat dibatalkan.`)) {
        const toastId = toast.loading("Menghapus dokumen...");
        try {
            await deleteStudent(studentId);
            toast.success("Data dihapus selamanya.", { id: toastId });
            setIsStudentEditModalOpen(false);
        } catch (e: any) { toast.error("Gagal: " + e.message, { id: toastId }); }
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent?.id) return;
    setSaving(true);
    try {
        await updateStudent(editingStudent.id, editingStudent);
        toast.success("Identitas diperbarui.");
        setIsStudentEditModalOpen(false);
    } catch (e) { toast.error("Gagal menyimpan."); } finally { setSaving(false); }
  };

  const handleUpdateClassInfo = async () => {
    if (!selectedClass?.id) return;
    setSaving(true);
    try {
        const teacher = teachers.find(t => t.id === editDetail.teacherId);
        const payload = { teacherId: editDetail.teacherId || '', teacherName: teacher?.name || '', academicYear: editDetail.academicYear || '' };
        if (!isMockMode && db) await db.collection('classes').doc(selectedClass.id).update(payload);
        setSelectedClass(prev => prev ? { ...prev, ...payload } : null);
        toast.success("Wali rombel diperbarui.");
    } catch (e) { toast.error("Gagal."); } finally { setSaving(false); }
  };

  const selectedClassStudents = useMemo(() => {
    if (!selectedClass) return [];
    return allStudents.filter(s => s.tingkatRombel === selectedClass.name)
        .sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));
  }, [selectedClass, allStudents]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden transition-all">
      <div className="bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl px-5 py-4 flex items-center justify-between z-40 sticky top-0 border-b border-slate-100 dark:border-slate-800 safe-pt">
          <div className="flex items-center gap-4">
              <button onClick={view === 'detail' ? () => setView('list') : onBack} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-90 transition-all"><ArrowLeftIcon className="w-5 h-5" /></button>
              <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{view === 'detail' ? selectedClass?.name : 'Database Rombel'}</h2>
                  <p className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">Audit Integritas Data</p>
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 lg:p-8 pb-40">
          {loading ? (
              <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" /></div>
          ) : view === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-500">
                  {classes.map(cls => {
                      const count = allStudents.filter(s => s.tingkatRombel === cls.name).length;
                      return (
                          <div key={cls.id} onClick={() => { setSelectedClass(cls); setEditDetail({...cls}); setView('detail'); setActiveTab('personalia'); }} className="bg-white dark:bg-[#151E32] p-6 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]">
                              <div>
                                  <div className="flex justify-between items-start mb-3">
                                      <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[8px] font-black uppercase">TK {cls.level}</span>
                                      <ArrowRightIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                  </div>
                                  <h4 className="text-base font-black text-slate-800 dark:text-white uppercase leading-none">{cls.name}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{count} Peserta Didik</p>
                              </div>
                              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><BriefcaseIcon className="w-4 h-4 text-slate-300" /></div>
                                  <div className="min-w-0 flex-1"><p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Wali Rombel</p><p className="text-[9px] font-bold text-slate-700 dark:text-slate-400 truncate">{cls.teacherName || 'BELUM DISET'}</p></div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          ) : (
              /* --- DETAIL VIEW --- */
              <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit shadow-inner">
                      {['personalia', 'students', 'subjects'].map((t) => (
                          <button key={t} onClick={() => setActiveTab(t as any)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-lg' : 'text-slate-400'}`}>
                              {t === 'personalia' ? 'Kelola Wali' : t === 'students' ? 'Peserta Didik' : 'Mapel'}
                          </button>
                      ))}
                  </div>

                  {activeTab === 'personalia' && (
                      <div className="bg-white dark:bg-[#151E32] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Wali Kelas Saat Ini</label>
                              <div className="relative">
                                  <select value={editDetail.teacherId || ''} onChange={e => setEditDetail({...editDetail, teacherId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black outline-none uppercase appearance-none cursor-pointer">
                                      <option value="">-- PILIH GURU --</option>
                                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                                  <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              </div>
                          </div>
                          <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tahun Pelajaran</label>
                              <input type="text" value={editDetail.academicYear || ''} onChange={e => setEditDetail({...editDetail, academicYear: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black outline-none" />
                          </div>
                          <button onClick={handleUpdateClassInfo} disabled={saving} className="md:col-span-2 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">Simpan Perubahan Personal</button>
                      </div>
                  )}

                  {activeTab === 'students' && (
                      <div className="space-y-4">
                          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                  <h3 className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest leading-none">Total: {selectedClassStudents.length} Siswa</h3>
                                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-2 italic">Gunakan Tombol Merah untuk Membersihkan Data Ganda</p>
                              </div>
                              <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                                  <span className="text-[9px] font-black text-rose-600 uppercase">Deteksi Data Ganda Aktif</span>
                              </div>
                          </div>

                          <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left">
                                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                          <tr>
                                              <th className="px-6 py-4 text-center w-12">No</th>
                                              <th className="px-6 py-4">Peserta Didik</th>
                                              <th className="px-6 py-4">ID UNIK</th>
                                              <th className="px-6 py-4 text-center">Analisis Sistem</th>
                                              <th className="px-6 py-4 text-center">Aksi Cepat</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                          {selectedClassStudents.map((s, idx) => {
                                              // PERBAIKAN: Pastikan casting string pada idUnik
                                              const uidStr = s.idUnik ? String(s.idUnik) : '';
                                              const locations = uidStr ? duplicateRegistry[uidStr] || [] : [];
                                              const isGanda = locations.length > 1;
                                              const otherClasses = locations.filter(l => l !== selectedClass?.name);

                                              return (
                                                  <tr key={s.id} className={`group transition-all ${isGanda ? 'bg-rose-50/40 dark:bg-rose-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                                                      <td className="px-6 py-5 text-center text-[10px] font-bold text-slate-400">{idx+1}</td>
                                                      <td className="px-6 py-5">
                                                          <div className="flex items-center gap-4">
                                                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] border shadow-sm ${s.jenisKelamin === 'Perempuan' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{(s.namaLengkap || '?').charAt(0)}</div>
                                                              <div className="min-w-0">
                                                                  <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{s.namaLengkap}</p>
                                                                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">NISN: {s.nisn}</p>
                                                              </div>
                                                          </div>
                                                      </td>
                                                      <td className="px-6 py-5 font-mono text-[10px] font-black text-indigo-600">{uidStr}</td>
                                                      <td className="px-6 py-5 text-center">
                                                          {isGanda ? (
                                                              <div className="flex flex-col items-center gap-1 animate-pulse">
                                                                  <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[7px] font-black uppercase tracking-tighter">ID GANDA</span>
                                                                  <p className="text-[6px] font-black text-rose-400 uppercase leading-none">Ada Di: {otherClasses.join(', ')}</p>
                                                              </div>
                                                          ) : (
                                                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-tighter">VALID/UNIK</span>
                                                          )}
                                                      </td>
                                                      <td className="px-6 py-5 text-center">
                                                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                              <button onClick={() => { setEditingStudent({...s}); setIsStudentEditModalOpen(true); }} className="p-2 rounded-xl bg-slate-100 text-indigo-600 hover:bg-white shadow-sm border border-transparent hover:border-slate-200" title="Edit Profil"><PencilIcon className="w-3.5 h-3.5" /></button>
                                                              <button onClick={() => handleKickFromClass(s.id!, s.namaLengkap, s.tingkatRombel)} className={`p-2 rounded-xl border shadow-sm transition-all ${isGanda ? 'bg-rose-600 text-white border-rose-400' : 'bg-slate-100 text-amber-600 border-transparent hover:bg-white hover:border-slate-200'}`} title="Keluarkan Dari Rombel">
                                                                  <XCircleIcon className="w-3.5 h-3.5" />
                                                              </button>
                                                              {isGanda && (
                                                                  <button onClick={() => handleDeletePermanently(s.id!, s.namaLengkap)} className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white shadow-sm border border-rose-100" title="HAPUS PERMANEN DOKUMEN INI">
                                                                      <TrashIcon className="w-3.5 h-3.5" />
                                                                  </button>
                                                              )}
                                                          </div>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'subjects' && (
                      <div className="py-24 text-center bg-white dark:bg-[#151E32] rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                          <BookOpenIcon className="w-16 h-16 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manajemen Mata Pelajaran Rombel</p>
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* MODAL EDIT */}
      {isStudentEditModalOpen && editingStudent && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 border border-white/10 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-sm uppercase tracking-widest">Koreksi Data Siswa</h3>
                    <button onClick={() => setIsStudentEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircleIcon className="w-6 h-6" /></button>
                  </div>

                  <div className="space-y-4">
                      <div><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Lengkap</label><input type="text" value={editingStudent.namaLengkap} onChange={e => setEditingStudent({...editingStudent, namaLengkap: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl text-xs font-bold" /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[9px] font-black text-slate-400 uppercase ml-1">ID UNIK</label><input type="text" value={editingStudent.idUnik} onChange={e => setEditingStudent({...editingStudent, idUnik: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl text-xs font-bold" /></div>
                          <div><label className="text-[9px] font-black text-slate-400 uppercase ml-1">NISN</label><input type="text" value={editingStudent.nisn} onChange={e => setEditingStudent({...editingStudent, nisn: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl text-xs font-bold" /></div>
                      </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                      <button onClick={() => setIsStudentEditModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[9px] uppercase tracking-widest">Tutup</button>
                      <button onClick={handleUpdateStudent} disabled={saving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveIcon className="w-4 h-4" />}
                        Simpan Perubahan
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ClassList;
