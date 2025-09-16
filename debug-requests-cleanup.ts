// Debug script to clean up malformed join requests
// This can be run to identify and clean up any requests with invalid IDs

import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/schemas/firestore-utils';
import { COLLECTIONS } from '@/schemas/types';

export async function debugJoinRequests(empresaId: string) {
  console.log('=== DEBUG JOIN REQUESTS ===');
  console.log('Company ID:', empresaId);
  
  try {
    // Get all requests for this company
    const q = query(
      collection(db, COLLECTIONS.SOLICITUDES),
      where('empresaId', '==', empresaId)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('Total requests found:', querySnapshot.docs.length);
    
    const validRequests = [];
    const invalidRequests = [];
    
    querySnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const request = {
        id: docSnap.id,
        ...data
      };
      
      console.log('Request:', {
        id: docSnap.id,
        idType: typeof docSnap.id,
        idLength: docSnap.id?.length,
        hasId: !!docSnap.id,
        data: data
      });
      
      // Check if request has valid structure
      if (!docSnap.id || typeof docSnap.id !== 'string' || docSnap.id.trim().length === 0) {
        invalidRequests.push(request);
      } else if (!data.solicitanteId || !data.solicitanteEmail || !data.empresaId) {
        invalidRequests.push(request);
      } else {
        validRequests.push(request);
      }
    });
    
    console.log('Valid requests:', validRequests.length);
    console.log('Invalid requests:', invalidRequests.length);
    
    if (invalidRequests.length > 0) {
      console.log('Invalid requests details:', invalidRequests);
    }
    
    return {
      total: querySnapshot.docs.length,
      valid: validRequests,
      invalid: invalidRequests
    };
    
  } catch (error) {
    console.error('Error debugging join requests:', error);
    throw error;
  }
}

export async function cleanupInvalidRequests(empresaId: string, dryRun: boolean = true) {
  console.log('=== CLEANUP INVALID REQUESTS ===');
  console.log('Company ID:', empresaId);
  console.log('Dry run:', dryRun);
  
  const debugResult = await debugJoinRequests(empresaId);
  
  if (debugResult.invalid.length === 0) {
    console.log('No invalid requests found. Nothing to clean up.');
    return { cleaned: 0, errors: [] };
  }
  
  console.log(`Found ${debugResult.invalid.length} invalid requests`);
  
  if (dryRun) {
    console.log('DRY RUN - Would delete these requests:', debugResult.invalid);
    return { cleaned: 0, errors: [], wouldDelete: debugResult.invalid };
  }
  
  // Actually delete invalid requests
  const errors = [];
  let cleaned = 0;
  
  for (const invalidRequest of debugResult.invalid) {
    try {
      if (invalidRequest.id && typeof invalidRequest.id === 'string') {
        await deleteDoc(doc(db, COLLECTIONS.SOLICITUDES, invalidRequest.id));
        cleaned++;
        console.log('Deleted invalid request:', invalidRequest.id);
      } else {
        console.log('Cannot delete request without valid ID:', invalidRequest);
      }
    } catch (error) {
      console.error('Error deleting request:', invalidRequest.id, error);
      errors.push({ requestId: invalidRequest.id, error });
    }
  }
  
  console.log(`Cleanup complete. Deleted: ${cleaned}, Errors: ${errors.length}`);
  
  return { cleaned, errors };
}

// Helper function to call from React component
export function useRequestsDebug() {
  return {
    debugRequests: debugJoinRequests,
    cleanupRequests: cleanupInvalidRequests
  };
}