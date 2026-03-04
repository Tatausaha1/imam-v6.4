
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import { db, isMockMode, auth } from './firebase';
import { Student, UserRole } from '../types';

const COLLECTION_NAME = 'students';
const COLLECTION_PENGGUNA_SISWA = 'pengguna_siswa';

export const getStudents = async (): Promise<Student[]> => {
  if (isMockMode) return [];
  try {
    if (!db) throw new Error("Database not initialized");
    const snapshot = await db.collection(COLLECTION_NAME).orderBy('namaLengkap').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (error: any) {
    console.error("Error fetching students:", error);
    throw error;
  }
};

export const addStudent = async (student: Student): Promise<void> => {
  if (isMockMode) return;
  try {
    if (!db) throw new Error("Database not initialized");
    const cleanId = student.idUnik ? String(student.idUnik).trim() : null;
    if (!cleanId) throw new Error("ID Unik wajib diisi sebagai Primary Key.");
    
    await db.collection(COLLECTION_NAME).doc(cleanId).set({
        ...student,
        idUnik: cleanId,
        createdAt: student.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error CRUD addStudent:", error);
    throw error;
  }
};

export const updateStudent = async (id: string, student: Partial<Student>): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        const lastModified = new Date().toISOString();
        
        await db.collection(COLLECTION_NAME).doc(id).update({
            ...student,
            lastModified
        });

        // Sync ke pengguna_siswa jika data idUnik atau Nama berubah
        const masterSnap = await db.collection(COLLECTION_NAME).doc(id).get();
        const masterData = masterSnap.data();
        
        if (masterData?.linkedUserId) {
            const userRef = db.collection('users').doc(masterData.linkedUserId);
            await userRef.update({
                displayName: masterData.namaLengkap,
                idUnik: masterData.idUnik,
                class: masterData.tingkatRombel,
                lastModified
            });
            
            const userSiswaRef = db.collection(COLLECTION_PENGGUNA_SISWA).doc(masterData.linkedUserId);
            const userSiswaSnap = await userSiswaRef.get();
            if (userSiswaSnap.exists) {
                await userSiswaRef.update({
                    ...student,
                    lastModified
                });
            }
        }
    } catch (error) {
        console.error("Error CRUD updateStudent:", error);
        throw error;
    }
}

export const deleteStudent = async (id: string): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        
        const doc = await db.collection(COLLECTION_NAME).doc(id).get();
        const data = doc.data();
        
        if (data?.linkedUserId) {
            // Hapus record di tabel user (hanya record, bukan auth user demi keamanan)
            await db.collection('users').doc(data.linkedUserId).delete();
            await db.collection(COLLECTION_PENGGUNA_SISWA).doc(data.linkedUserId).delete();
        }

        await db.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error) {
        console.error("Error CRUD deleteStudent:", error);
        throw error;
    }
}
