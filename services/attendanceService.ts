
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import firebase from 'firebase/compat/app';
import { db, isMockMode } from './firebase';
import { format } from 'date-fns';
import { Student, AttendanceStatus } from '../types';

export type AttendanceSession = 'Masuk' | 'Duha' | 'Zuhur' | 'Ashar' | 'Pulang' | 'Masuk/Duha' | 'Ashar/Pulang';

interface ScanResult {
    success: boolean;
    message: string;
    student?: Student;
    timestamp?: string;
    statusRecorded?: AttendanceStatus;
}

// Koleksi disesuaikan dengan firestore.rules
const COLLECTION_ATTENDANCE = 'attendance';
const COLLECTION_STUDENTS = 'students';

export const recordAttendanceByScan = async (rawCode: string, session: AttendanceSession, isHaid: boolean = false): Promise<ScanResult> => {
    // Pembersihan kode dari karakter sampah (biasanya dari scanner hardware)
    const code = String(rawCode || '').replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
    if (!code) return { success: false, message: "ID KOSONG" };

    const today = format(new Date(), "yyyy-MM-dd");
    const nowFull = format(new Date(), "HH:mm:ss");
    const nowShort = format(new Date(), "HH:mm");
    
    const recordValue = isHaid ? `${nowShort} (Haid)` : nowFull;
    
    // Mapping sesi ke field database
    const fieldMap: Record<string, string> = {
        'Masuk': 'checkIn', 'Duha': 'duha', 'Zuhur': 'zuhur', 'Ashar': 'ashar', 'Pulang': 'checkOut'
    };
    const fieldName = fieldMap[session] || 'checkIn';

    if (isMockMode) return { success: true, message: "SIMULASI BERHASIL" } as any;
    if (!db) return { success: false, message: "DATABASE OFFLINE" };

    try {
        let studentData: Student | null = null;
        
        // 1. Cari berdasarkan idUnik (Prioritas Utama sesuai permintaan)
        const studentQuery = await db.collection(COLLECTION_STUDENTS)
            .where('idUnik', '==', code)
            .limit(1)
            .get();

        if (!studentQuery.empty) {
            const sDoc = studentQuery.docs[0];
            studentData = { id: sDoc.id, ...sDoc.data() } as Student;
        } else {
            // 2. Fallback: Cari berdasarkan Document ID (Jika idUnik adalah NISN)
            const studentDoc = await db.collection(COLLECTION_STUDENTS).doc(code).get();
            if (studentDoc.exists) {
                studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
            }
        }

        if (!studentData) return { success: false, message: `ID "${code}" TIDAK TERDAFTAR` };
        if (isHaid && studentData.jenisKelamin === 'Laki-laki') return { success: false, message: "KHUSUS PUTRI" };

        const attendanceId = `${studentData.id}_${today}`;
        const attendanceRef = db.collection(COLLECTION_ATTENDANCE).doc(attendanceId);
        const docSnapshot = await attendanceRef.get();
        const currentData = docSnapshot?.exists ? docSnapshot.data() : null;

        // Cek apakah sesi ini sudah diisi hari ini
        if (docSnapshot?.exists && currentData && currentData[fieldName]) {
            return { success: false, message: `SUDAH ABSEN ${session.toUpperCase()}`, student: studentData };
        }

        const updatePayload: any = { 
            [fieldName]: recordValue,
            studentId: studentData.id,
            studentName: studentData.namaLengkap,
            class: studentData.tingkatRombel,
            idUnik: studentData.idUnik || code,
            date: today,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Logika Status Otomatis
        if (isHaid) {
            updatePayload.status = 'Haid';
            // Catat jam yang sama ke seluruh sesi sholat (Duha, Zuhur, Ashar)
            // Sesuai permintaan: "otomatis mengisi status 'Haid' pada semua sesi ibadah (Duha/Zuhur/Ashar) lengkap dengan timestamp-nya"
            updatePayload.duha = recordValue;
            updatePayload.zuhur = recordValue;
            updatePayload.ashar = recordValue;
        } else if (!currentData?.status || currentData.status === 'Alpha' || currentData.status === 'Haid') {
            // Jika sebelumnya Haid tapi sekarang scan normal, update status jadi Hadir jika ini sesi Masuk
            if (session === 'Masuk') updatePayload.status = 'Hadir';
        }

        if (docSnapshot?.exists) await attendanceRef.update(updatePayload);
        else await attendanceRef.set(updatePayload);

        return { success: true, message: isHaid ? "HAID DICATAT" : "BERHASIL", student: studentData };
    } catch (error: any) {
        console.error("Attendance Log Error:", error);
        return { success: false, message: "ERROR DATABASE" };
    }
};
