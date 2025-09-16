import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  DocumentReference,
  CollectionReference,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { 
  Company, 
  CompanyMember, 
  Product, 
  Client, 
  TransactionEvent, 
  CompanyJoinRequest,
  UserProfile,
  UserCompanyMembership,
  COLLECTIONS,
  CreateCompanyData,
  CreateProductData,
  CreateClientData,
  CreateSaleEventData,
  CreatePaymentEventData
} from './types';

// ============================================================================
// COLLECTION REFERENCE HELPERS
// ============================================================================

export function getUserRef(userId: string): DocumentReference {
  return doc(db, COLLECTIONS.USUARIOS, userId);
}

export function getUserCompaniesRef(userId: string): CollectionReference {
  return collection(db, COLLECTIONS.USUARIOS, userId, COLLECTIONS.EMPRESAS);
}

export function getCompanyRef(empresaId: string): DocumentReference {
  return doc(db, COLLECTIONS.EMPRESAS, empresaId);
}

export function getCompanyMembersRef(empresaId: string): CollectionReference {
  return collection(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.MIEMBROS);
}

export function getCompanyMemberRef(empresaId: string, userId: string): DocumentReference {
  return doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.MIEMBROS, userId);
}

export function getProductsRef(empresaId: string): CollectionReference {
  return collection(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.PRODUCTOS);
}

export function getProductRef(empresaId: string, productId: string): DocumentReference {
  return doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.PRODUCTOS, productId);
}

export function getClientsRef(empresaId: string): CollectionReference {
  return collection(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.CLIENTES);
}

export function getClientRef(empresaId: string, clientId: string): DocumentReference {
  return doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.CLIENTES, clientId);
}

export function getEventsRef(empresaId: string): CollectionReference {
  return collection(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.EVENTOS);
}

export function getEventRef(empresaId: string, eventId: string): DocumentReference {
  return doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.EVENTOS, eventId);
}

export function getJoinRequestsRef(): CollectionReference {
  return collection(db, COLLECTIONS.SOLICITUDES);
}

export function getJoinRequestRef(requestId: string): DocumentReference {
  console.log('getJoinRequestRef called', {
    requestId,
    requestIdType: typeof requestId,
    requestIdLength: requestId?.length,
    collection: COLLECTIONS.SOLICITUDES
  });

  // Validate requestId
  if (!requestId || typeof requestId !== 'string' || requestId.trim().length === 0) {
    const error = new Error(`Invalid requestId for document reference: ${requestId}`);
    console.error('getJoinRequestRef validation failed', {
      requestId,
      requestIdType: typeof requestId,
      collection: COLLECTIONS.SOLICITUDES,
      error: error.message
    });
    throw error;
  }

  const trimmedRequestId = requestId.trim();
  const docRef = doc(db, COLLECTIONS.SOLICITUDES, trimmedRequestId);
  
  console.log('Document reference created', {
    requestId: trimmedRequestId,
    collection: COLLECTIONS.SOLICITUDES,
    docRefPath: docRef.path,
    docRefId: docRef.id
  });

  return docRef;
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function createUserProfile(userId: string, email: string): Promise<void> {
  const userProfile: UserProfile = {
    id: userId,
    email,
    creado: Timestamp.now()
  };
  
  await setDoc(getUserRef(userId), userProfile);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(getUserRef(userId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as UserProfile : null;
}

export async function addUserCompanyMembership(
  userId: string, 
  empresaId: string, 
  role: 'owner' | 'member'
): Promise<void> {
  const membership: UserCompanyMembership = {
    empresaId,
    role,
    fechaIngreso: Timestamp.now()
  };
  
  await setDoc(doc(getUserCompaniesRef(userId), empresaId), membership);
}

export async function getUserCompanyMemberships(userId: string): Promise<UserCompanyMembership[]> {
  const querySnapshot = await getDocs(getUserCompaniesRef(userId));
  return querySnapshot.docs.map(doc => ({
    empresaId: doc.id,
    ...doc.data()
  } as UserCompanyMembership));
}

export async function getUserCompanyMembershipsWithDetails(userId: string): Promise<(UserCompanyMembership & { companyName?: string })[]> {
  const memberships = await getUserCompanyMemberships(userId);
  
  const membershipsWithDetails = await Promise.all(
    memberships.map(async (membership) => {
      try {
        const company = await getCompany(membership.empresaId);
        return {
          ...membership,
          companyName: company?.nombre
        };
      } catch (error) {
        console.error(`Error fetching company ${membership.empresaId}:`, error);
        return membership;
      }
    })
  );
  
  return membershipsWithDetails;
}

// Helper function to get all companies for a user (for admin purposes)
export async function getUserCompanies(userId: string): Promise<Company[]> {
  const memberships = await getUserCompanyMemberships(userId);
  
  const companies = await Promise.all(
    memberships.map(async (membership) => {
      try {
        const company = await getCompany(membership.empresaId);
        return company;
      } catch (error) {
        console.error(`Error fetching company ${membership.empresaId}:`, error);
        return null;
      }
    })
  );
  
  // Filter out null companies and validate structure
  return companies.filter((company): company is Company => {
    if (!company) return false;
    
    // Validate required fields
    if (!company.nombre || company.nombre.trim().length === 0) {
      console.warn(`Company ${company.id} missing required nombre field`);
    }
    
    return true;
  });
}

// ============================================================================
// COMPANY OPERATIONS
// ============================================================================

export async function createCompany(companyData: CreateCompanyData, ownerId: string): Promise<string> {
  // Validate required fields
  if (!companyData.nombre || companyData.nombre.trim().length === 0) {
    throw new Error('Company name (nombre) is required');
  }
  
  const company: Company = {
    id: '', // Will be set by Firestore
    ...companyData,
    creado: Timestamp.now(),
    solicitudesAbiertas: false // Default to NOT accepting join requests (more secure)
  };
  
  // Create company document
  const companyRef = await addDoc(collection(db, COLLECTIONS.EMPRESAS), company);
  
  // Add owner as member
  const ownerMember: CompanyMember = {
    userId: ownerId,
    email: companyData.propietario, // Assuming propietario contains email for now
    role: 'owner',
    fechaIngreso: Timestamp.now()
  };
  
  await setDoc(getCompanyMemberRef(companyRef.id, ownerId), ownerMember);
  
  // Add membership to user's companies
  await addUserCompanyMembership(ownerId, companyRef.id, 'owner');
  
  return companyRef.id;
}

export async function getCompany(empresaId: string): Promise<Company | null> {
  const docSnap = await getDoc(getCompanyRef(empresaId));
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data();
  const company = { 
    id: docSnap.id, 
    ...data,
    // Ensure solicitudesAbiertas has default value for existing companies
    solicitudesAbiertas: data.solicitudesAbiertas ?? false
  } as Company;
  
  // Validate required fields for new structure
  if (!company.nombre || company.nombre.trim().length === 0) {
    console.warn(`Company ${company.id} missing required nombre field`);
  }
  
  return company;
}

export async function updateCompany(
  empresaId: string, 
  updates: Partial<Company>
): Promise<void> {
  // Validate required fields if they are being updated
  if ('nombre' in updates && (!updates.nombre || updates.nombre.trim().length === 0)) {
    throw new Error('Company nombre is required and cannot be empty');
  }
  
  await updateDoc(getCompanyRef(empresaId), updates);
}

export async function toggleCompanyJoinRequests(empresaId: string, isOpen: boolean): Promise<void> {
  console.log('toggleCompanyJoinRequests called', { empresaId, isOpen });
  
  try {
    const companyRef = getCompanyRef(empresaId);
    console.log('Company reference created', { empresaId, refPath: companyRef.path });
    
    await updateDoc(companyRef, {
      solicitudesAbiertas: isOpen
    });
    
    console.log('Company solicitudesAbiertas updated successfully', { empresaId, isOpen });
  } catch (error) {
    console.error('Error in toggleCompanyJoinRequests', { empresaId, isOpen, error });
    throw error;
  }
}

export async function getCompanyMembers(empresaId: string): Promise<CompanyMember[]> {
  const querySnapshot = await getDocs(getCompanyMembersRef(empresaId));
  return querySnapshot.docs.map(doc => doc.data() as CompanyMember);
}

export async function addCompanyMember(
  empresaId: string, 
  userId: string, 
  email: string
): Promise<void> {
  const member: CompanyMember = {
    userId,
    email,
    role: 'member',
    fechaIngreso: Timestamp.now()
  };
  
  await setDoc(getCompanyMemberRef(empresaId, userId), member);
  await addUserCompanyMembership(userId, empresaId, 'member');
}

export async function removeCompanyMember(empresaId: string, userId: string): Promise<void> {
  await deleteDoc(getCompanyMemberRef(empresaId, userId));
  await deleteDoc(doc(getUserCompaniesRef(userId), empresaId));
}

// ============================================================================
// PRODUCT OPERATIONS
// ============================================================================

export async function createProduct(empresaId: string, productData: CreateProductData): Promise<string> {
  const context = 'firestore-utils.createProduct';
  
  // Validate required fields
  if (typeof productData.ultimoCosto !== 'number') {
    throw new Error('Product ultimoCosto is required and must be a number');
  }
  
  if (typeof productData.ultimaGanancia !== 'number') {
    throw new Error('Product ultimaGanancia is required and must be a number');
  }
  
  console.log(`${context}: Starting Firestore product creation`, { 
    empresaId,
    productData: {
      nombre: productData.nombre,
      colorFondo: productData.colorFondo,
      posicion: productData.posicion,
      activo: productData.activo,
      ultimoCosto: productData.ultimoCosto,
      ultimaGanancia: productData.ultimaGanancia
    }
  });

  try {
    // Step 1: Prepare product document (do NOT store id field in Firestore)
    const product = {
      ...productData,
      creado: Timestamp.now()
    };
    
    console.log(`${context}: Product document prepared`, { 
      empresaId,
      productFields: Object.keys(product),
      createdTimestamp: product.creado
    });

    // Step 2: Get products collection reference
    const productsRef = getProductsRef(empresaId);
    console.log(`${context}: Products collection reference obtained`, { 
      empresaId,
      collectionPath: `empresas/${empresaId}/productos`
    });

    // Step 3: Add document to Firestore
    console.log(`${context}: Adding document to Firestore`);
    const productRef = await addDoc(productsRef, product);
    
    console.log(`${context}: Product created successfully in Firestore`, { 
      empresaId,
      productId: productRef.id,
      productName: productData.nombre
    });
    
    return productRef.id;
  } catch (error) {
    console.error(`${context}: Failed to create product in Firestore`, {
      empresaId,
      productName: productData.nombre,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        stack: error.stack
      } : error
    });
    throw error;
  }
}

export async function getProducts(empresaId: string): Promise<Product[]> {
  const context = 'firestore-utils.getProducts';
  console.log(`${context}: Starting query`, { empresaId });
  
  try {
    // Ultra-simple query - just get all products without any filters
    const productsRef = getProductsRef(empresaId);
    console.log(`${context}: Executing simple query (no filters)`);
    
    const querySnapshot = await getDocs(productsRef);
    console.log(`${context}: Query completed`, { 
      docCount: querySnapshot.docs.length,
      isEmpty: querySnapshot.empty
    });
    
    const products = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      console.log(`${context}: Raw document info`, {
        docId: doc.id,
        docIdType: typeof doc.id,
        docIdLength: doc.id?.length,
        docRef: doc.ref?.path,
        dataKeys: Object.keys(data),
        rawData: data
      });
      
      // Ensure Firestore document id always wins over any 'id' stored in data
      const product = { ...data, id: doc.id } as Product;
      
      // Validate required fields for new structure
      if (typeof product.ultimoCosto !== 'number') {
        console.warn(`${context}: Product ${product.id} missing required ultimoCosto field`);
      }
      
      if (typeof product.ultimaGanancia !== 'number') {
        console.warn(`${context}: Product ${product.id} missing required ultimaGanancia field`);
      }
      
      console.log(`${context}: Processing document`, {
        docId: doc.id,
        productName: data.nombre,
        productId: product.id,
        hasValidId: !!product.id && product.id !== '',
        activo: product.activo,
        posicion: product.posicion,
        hasUltimoCosto: typeof product.ultimoCosto === 'number',
        hasUltimaGanancia: typeof product.ultimaGanancia === 'number'
      });
      
      return product;
    });
    
    // Filter active products in memory and sort by position
    const activeProducts = products.filter(p => p.activo !== false);
    const sortedProducts = activeProducts.sort((a, b) => (a.posicion || 0) - (b.posicion || 0));
    
    console.log(`${context}: Returning products`, {
      totalCount: products.length,
      activeCount: activeProducts.length,
      finalCount: sortedProducts.length,
      productIds: sortedProducts.map(p => p.id),
      productNames: sortedProducts.map(p => p.nombre)
    });
    
    return sortedProducts;
  } catch (error) {
    console.error(`${context}: Query failed`, { 
      empresaId, 
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        code: (error as any).code
      } : error
    });
    throw error;
  }
}

export async function updateProduct(
  empresaId: string, 
  productId: string, 
  updates: Partial<Product>
): Promise<void> {
  // Validate required fields if they are being updated
  if ('ultimoCosto' in updates && typeof updates.ultimoCosto !== 'number') {
    throw new Error('Product ultimoCosto must be a number');
  }
  
  if ('ultimaGanancia' in updates && typeof updates.ultimaGanancia !== 'number') {
    throw new Error('Product ultimaGanancia must be a number');
  }
  
  const updateData = {
    ...updates,
    actualizado: Timestamp.now()
  };
  
  await updateDoc(getProductRef(empresaId, productId), updateData);
}

export async function deleteProduct(empresaId: string, productId: string): Promise<void> {
  await updateDoc(getProductRef(empresaId, productId), {
    activo: false,
    actualizado: Timestamp.now()
  });
}

// ============================================================================
// CLIENT OPERATIONS
// ============================================================================

export async function createClient(empresaId: string, clientData: CreateClientData): Promise<string> {
  const context = 'firestore-utils.createClient';
  
  console.log(`${context}: Starting Firestore client creation`, { 
    empresaId,
    clientData: {
      nombre: clientData.nombre,
      direccion: clientData.direccion,
      telefono: clientData.telefono,
      oculto: clientData.oculto,
      hasNotas: !!clientData.notas,
      hasFechaImportante: !!clientData.fechaImportante
    }
  });

  try {
    // Step 1: Prepare client document
    const client: Client = {
      id: '', // Will be set by Firestore
      ...clientData,
      deudaActual: 0, // Initialize with no debt
      creado: Timestamp.now()
    };
    
    console.log(`${context}: Client document prepared`, { 
      empresaId,
      clientFields: Object.keys(client),
      deudaActual: client.deudaActual,
      createdTimestamp: client.creado
    });

    // Step 2: Get clients collection reference
    const clientsRef = getClientsRef(empresaId);
    console.log(`${context}: Clients collection reference obtained`, { 
      empresaId,
      collectionPath: `empresas/${empresaId}/clientes`
    });

    // Step 3: Add document to Firestore
    console.log(`${context}: Adding document to Firestore`);
    const clientRef = await addDoc(clientsRef, client);
    
    console.log(`${context}: Client created successfully in Firestore`, { 
      empresaId,
      clientId: clientRef.id,
      clientName: clientData.nombre
    });
    
    return clientRef.id;
  } catch (error) {
    console.error(`${context}: Failed to create client in Firestore`, {
      empresaId,
      clientName: clientData.nombre,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        stack: error.stack
      } : error
    });
    throw error;
  }
}

export async function getClients(empresaId: string, includeHidden: boolean = false): Promise<Client[]> {
  let q = query(getClientsRef(empresaId));
  
  if (!includeHidden) {
    q = query(q, where('oculto', '==', false));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
}

export async function getClient(empresaId: string, clientId: string): Promise<Client | null> {
  const docSnap = await getDoc(getClientRef(empresaId, clientId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Client : null;
}

export async function updateClient(
  empresaId: string, 
  clientId: string, 
  updates: Partial<Client>
): Promise<void> {
  const updateData = {
    ...updates,
    actualizado: Timestamp.now()
  };
  
  await updateDoc(getClientRef(empresaId, clientId), updateData);
}

export async function updateClientDebt(
  empresaId: string, 
  clientId: string, 
  newDebt: number,
  lastTransactionDate?: Timestamp
): Promise<void> {
  const updates: any = {
    deudaActual: newDebt,
    actualizado: Timestamp.now()
  };
  
  if (lastTransactionDate) {
    updates.ultimaTransaccion = lastTransactionDate;
  }
  
  await updateDoc(getClientRef(empresaId, clientId), updates);
}

// ============================================================================
// TRANSACTION EVENT OPERATIONS
// ============================================================================

export async function createSaleEvent(
  empresaId: string, 
  saleData: CreateSaleEventData
): Promise<string> {
  const saleEvent: TransactionEvent = {
    id: '', // Will be set by Firestore
    ...saleData,
    tipo: 'venta',
    creado: Timestamp.now(),
    borrado: false
  };
  
  const eventRef = await addDoc(getEventsRef(empresaId), saleEvent);
  
  // Update client debt using simple service - recalculate from scratch for accuracy
  try {
    const { SimpleDebtService } = await import('../services/SimpleDebtService');
    
    // Get all events for this client including the new one
    const clientEvents = await getClientEvents(empresaId, saleData.clienteId);
    const allEvents = [...clientEvents, { ...saleEvent, id: eventRef.id }];
    
    // Calculate total debt from all transactions
    const { calculateClientDebt } = await import('./business-logic');
    const calculation = calculateClientDebt(allEvents);
    const finalDebt = calculation.totalDebt - calculation.favorBalance;
    
    // Update simple debt with calculated value
    await SimpleDebtService.getInstance().setClientDebt(empresaId, saleData.clienteId, 'Cliente', finalDebt);
    console.log(`Updated client ${saleData.clienteId} debt to: ${finalDebt}`);
  } catch (error) {
    console.warn('Failed to update client debt after sale creation:', error);
  }
  
  return eventRef.id;
}

export async function createPaymentEvent(
  empresaId: string, 
  paymentData: CreatePaymentEventData
): Promise<string> {
  const paymentEvent: TransactionEvent = {
    id: '', // Will be set by Firestore
    ...paymentData,
    tipo: 'pago',
    creado: Timestamp.now(),
    borrado: false
  };
  
  const eventRef = await addDoc(getEventsRef(empresaId), paymentEvent);
  
  // Update client debt using simple service - recalculate from scratch for accuracy
  try {
    const { SimpleDebtService } = await import('../services/SimpleDebtService');
    
    // Get all events for this client including the new one
    const clientEvents = await getClientEvents(empresaId, paymentData.clienteId);
    const allEvents = [...clientEvents, { ...paymentEvent, id: eventRef.id }];
    
    // Calculate total debt from all transactions
    const { calculateClientDebt } = await import('./business-logic');
    const calculation = calculateClientDebt(allEvents);
    const finalDebt = calculation.totalDebt - calculation.favorBalance;
    
    // Update simple debt with calculated value
    await SimpleDebtService.getInstance().setClientDebt(empresaId, paymentData.clienteId, 'Cliente', finalDebt);
    console.log(`Updated client ${paymentData.clienteId} debt to: ${finalDebt}`);
  } catch (error) {
    console.warn('Failed to update client debt after payment creation:', error);
  }
  
  return eventRef.id;
}

export async function getClientEvents(
  empresaId: string, 
  clientId: string
): Promise<TransactionEvent[]> {
  const q = query(
    getEventsRef(empresaId),
    where('clienteId', '==', clientId),
    where('borrado', '==', false),
    orderBy('fecha', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionEvent));
}

export async function updateTransactionEvent(
  empresaId: string, 
  eventId: string, 
  updates: Partial<TransactionEvent>
): Promise<void> {
  const updateData = {
    ...updates,
    editado: Timestamp.now()
  };
  
  await updateDoc(getEventRef(empresaId, eventId), updateData);
}

export async function deleteTransactionEvent(empresaId: string, eventId: string): Promise<void> {
  await updateDoc(getEventRef(empresaId, eventId), {
    borrado: true,
    editado: Timestamp.now()
  });
}

/**
 * Recalculate and update debt for a specific client based on all their transactions
 */
export async function recalculateAndUpdateClientDebt(empresaId: string, clientId: string): Promise<void> {
  try {
    const clientEvents = await getClientEvents(empresaId, clientId);
    const { calculateClientDebt } = await import('./business-logic');
    const calculation = calculateClientDebt(clientEvents);
    
    const finalDebt = calculation.totalDebt - calculation.favorBalance;
    const lastTransactionDate = clientEvents.length > 0 ? clientEvents[0].fecha : undefined;
    
    await updateClientDebt(empresaId, clientId, finalDebt, lastTransactionDate);
    
    console.log(`Recalculated debt for client ${clientId}: ${finalDebt}`);
  } catch (error) {
    console.error(`Failed to recalculate debt for client ${clientId}:`, error);
    throw error;
  }
}

// ============================================================================
// COMPANY JOIN REQUEST OPERATIONS
// ============================================================================

export async function createJoinRequest(
  empresaId: string, 
  solicitanteId: string, 
  solicitanteEmail: string
): Promise<string> {
  const request: CompanyJoinRequest = {
    id: '', // Will be set by Firestore
    empresaId,
    solicitanteId,
    solicitanteEmail,
    estado: 'pendiente',
    creado: Timestamp.now()
  };
  
  const requestRef = await addDoc(getJoinRequestsRef(), request);
  
  // Send notification to company owner
  try {
    const company = await getCompany(empresaId);
    if (company) {
      const NotificationService = (await import('@/services/NotificationService')).default;
      await NotificationService.getInstance().sendCompanyJoinRequestNotification(
        company.propietario,
        solicitanteEmail,
        company.nombre,
        requestRef.id
      );
    }
  } catch (error) {
    console.error('Error sending join request notification:', error);
    // Don't fail the request creation if notification fails
  }
  
  return requestRef.id;
}

export async function getPendingJoinRequests(empresaId: string): Promise<CompanyJoinRequest[]> {
  const q = query(
    getJoinRequestsRef(),
    where('empresaId', '==', empresaId),
    where('estado', '==', 'pendiente'),
    orderBy('creado', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  // IMPORTANT: Ensure Firestore doc.id overrides any 'id' stored in document data
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CompanyJoinRequest));
}

export async function updateJoinRequestStatus(
  requestId: string, 
  status: 'aceptada' | 'rechazada'
): Promise<void> {
  console.log('updateJoinRequestStatus called', {
    requestId,
    requestIdType: typeof requestId,
    requestIdLength: requestId?.length,
    status
  });

  // Validate requestId
  if (!requestId || typeof requestId !== 'string' || requestId.trim().length === 0) {
    const error = new Error(`Invalid requestId: ${requestId}`);
    console.error('updateJoinRequestStatus validation failed', {
      requestId,
      requestIdType: typeof requestId,
      error: error.message
    });
    throw error;
  }

  const trimmedRequestId = requestId.trim();
  
  try {
    const docRef = getJoinRequestRef(trimmedRequestId);
    console.log('Document reference created', {
      requestId: trimmedRequestId,
      docRefPath: docRef.path
    });

    await updateDoc(docRef, {
      estado: status,
      procesado: Timestamp.now()
    });

    console.log('Request status updated successfully', {
      requestId: trimmedRequestId,
      status
    });
  } catch (error) {
    console.error('updateJoinRequestStatus failed', {
      requestId: trimmedRequestId,
      status,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    throw error;
  }
}

export async function deleteJoinRequest(requestId: string): Promise<void> {
  console.log('deleteJoinRequest called', {
    requestId,
    requestIdType: typeof requestId,
    requestIdLength: requestId?.length
  });

  // Validate requestId
  if (!requestId || typeof requestId !== 'string' || requestId.trim().length === 0) {
    const error = new Error(`Invalid requestId for deletion: ${requestId}`);
    console.error('deleteJoinRequest validation failed', {
      requestId,
      requestIdType: typeof requestId,
      error: error.message
    });
    throw error;
  }

  const trimmedRequestId = requestId.trim();
  
  try {
    const docRef = getJoinRequestRef(trimmedRequestId);
    console.log('Deleting request document', {
      requestId: trimmedRequestId,
      docRefPath: docRef.path
    });

    await deleteDoc(docRef);

    console.log('Request deleted successfully', {
      requestId: trimmedRequestId
    });
  } catch (error) {
    console.error('deleteJoinRequest failed', {
      requestId: trimmedRequestId,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    throw error;
  }
}

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

export function subscribeToCompanyMembers(
  empresaId: string, 
  callback: (members: CompanyMember[]) => void
) {
  return onSnapshot(getCompanyMembersRef(empresaId), (snapshot) => {
    const members = snapshot.docs.map(doc => doc.data() as CompanyMember);
    callback(members);
  });
}

export function subscribeToProducts(
  empresaId: string, 
  callback: (products: Product[]) => void
) {
  const context = 'firestore-utils.subscribeToProducts';
  console.log(`${context}: Setting up subscription`, { empresaId });
  
  // Ultra-simple subscription - no filters at all
  const productsRef = getProductsRef(empresaId);
  return onSnapshot(productsRef, (snapshot) => {
    console.log(`${context}: Snapshot received`, { 
      empresaId,
      docCount: snapshot.docs.length,
      isEmpty: snapshot.empty
    });
    
    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      
      console.log(`${context}: Raw document info`, {
        docId: doc.id,
        docIdType: typeof doc.id,
        docIdLength: doc.id?.length,
        docRef: doc.ref?.path,
        dataKeys: Object.keys(data),
        rawData: data
      });
      
      // Ensure Firestore document id always wins over any 'id' stored in data
      const product = { ...data, id: doc.id } as Product;
      
      // Validate required fields for new structure
      if (typeof product.ultimoCosto !== 'number') {
        console.warn(`${context}: Product ${product.id} missing required ultimoCosto field`);
      }
      
      if (typeof product.ultimaGanancia !== 'number') {
        console.warn(`${context}: Product ${product.id} missing required ultimaGanancia field`);
      }
      
      console.log(`${context}: Processing document`, {
        docId: doc.id,
        productName: data.nombre,
        productId: product.id,
        hasValidId: !!product.id && product.id !== '',
        activo: product.activo,
        posicion: product.posicion,
        hasUltimoCosto: typeof product.ultimoCosto === 'number',
        hasUltimaGanancia: typeof product.ultimaGanancia === 'number'
      });
      
      return product;
    });
    
    // Filter active products in memory and sort by position
    const activeProducts = products.filter(p => p.activo !== false);
    const sortedProducts = activeProducts.sort((a, b) => (a.posicion || 0) - (b.posicion || 0));
    
    console.log(`${context}: Calling callback with products`, {
      empresaId,
      totalCount: products.length,
      activeCount: activeProducts.length,
      finalCount: sortedProducts.length,
      productIds: sortedProducts.map(p => p.id),
      productNames: sortedProducts.map(p => p.nombre)
    });
    
    callback(sortedProducts);
  });
}

export function subscribeToClients(
  empresaId: string, 
  includeHidden: boolean,
  callback: (clients: Client[]) => void
) {
  let q = query(getClientsRef(empresaId));
  
  if (!includeHidden) {
    q = query(q, where('oculto', '==', false));
  }
  
  return onSnapshot(q, (snapshot) => {
    const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
    callback(clients);
  });
}

export function subscribeToClientEvents(
  empresaId: string, 
  clientId: string,
  callback: (events: TransactionEvent[]) => void
) {
  const q = query(
    getEventsRef(empresaId),
    where('clienteId', '==', clientId),
    where('borrado', '==', false),
    orderBy('fecha', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionEvent));
    callback(events);
  });
}

export function subscribeToJoinRequests(
  empresaId: string,
  callback: (requests: CompanyJoinRequest[]) => void
) {
  const q = query(
    getJoinRequestsRef(),
    where('empresaId', '==', empresaId),
    where('estado', '==', 'pendiente'),
    orderBy('creado', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    // IMPORTANT: Ensure Firestore doc.id overrides any 'id' stored in document data
    const requests = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CompanyJoinRequest));
    callback(requests);
  });
}

export function subscribeToCompany(
  empresaId: string,
  callback: (company: Company | null) => void
) {
  return onSnapshot(getCompanyRef(empresaId), (doc) => {
    if (!doc.exists()) {
      callback(null);
      return;
    }
    
    const data = doc.data();
    const company = { id: doc.id, ...data } as Company;
    
    // Validate required fields for new structure
    if (!company.nombre || company.nombre.trim().length === 0) {
      console.warn(`Company ${company.id} missing required nombre field`);
    }
    
    callback(company);
  });
}