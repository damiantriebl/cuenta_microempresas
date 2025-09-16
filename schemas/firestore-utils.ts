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
  console.log('Document reference creado', {
    requestId: trimmedRequestId,
    collection: COLLECTIONS.SOLICITUDES,
    docRefPath: docRef.path,
    docRefId: docRef.id
  });
  return docRef;
}
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
  return companies.filter((company): company is Company => {
    if (!company) return false;
    if (!company.nombre || company.nombre.trim().length === 0) {
      console.warn(`Company ${company.id} missing required nombre field`);
    }
    return true;
  });
}
export async function createCompany(companyData: CreateCompanyData, ownerId: string): Promise<string> {
  if (!companyData.nombre || companyData.nombre.trim().length === 0) {
    throw new Error('Company name (nombre) is required');
  }
  const company: Company = {
    id: '', // Will be set by Firestore
    ...companyData,
    creado: Timestamp.now(),
    solicitudesAbiertas: false // Default to NOT accepting join requests (more secure)
  };
  const companyRef = await addDoc(collection(db, COLLECTIONS.EMPRESAS), company);
  const ownerMember: CompanyMember = {
    userId: ownerId,
    email: companyData.propietario, // Assuming propietario contains email for now
    role: 'owner',
    fechaIngreso: Timestamp.now()
  };
  await setDoc(getCompanyMemberRef(companyRef.id, ownerId), ownerMember);
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
    solicitudesAbiertas: data.solicitudesAbiertas ?? false
  } as Company;
  if (!company.nombre || company.nombre.trim().length === 0) {
    console.warn(`Company ${company.id} missing required nombre field`);
  }
  return company;
}
export async function updateCompany(
  empresaId: string, 
  updates: Partial<Company>
): Promise<void> {
  if ('nombre' in updates && (!updates.nombre || updates.nombre.trim().length === 0)) {
    throw new Error('Company nombre is required and cannot be empty');
  }
  await updateDoc(getCompanyRef(empresaId), updates);
}
export async function toggleCompanyJoinRequests(empresaId: string, isOpen: boolean): Promise<void> {
  console.log('toggleCompanyJoinRequests called', { empresaId, isOpen });
  try {
    const companyRef = getCompanyRef(empresaId);
    console.log('Empresa reference creado', { empresaId, refPath: companyRef.path });
    await updateDoc(companyRef, {
      solicitudesAbiertas: isOpen
    });
    console.log('Empresa solicitudesAbiertas actualizado exitosamente', { empresaId, isOpen });
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
export async function createProduct(empresaId: string, productData: CreateProductData): Promise<string> {
  const context = 'firestore-utils.createProduct';
  if (typeof productData.ultimoCosto !== 'number') {
    throw new Error('Product ultimoCosto is required and must be a number');
  }
  if (typeof productData.ultimaGanancia !== 'number') {
    throw new Error('Product ultimaGanancia is required and must be a number');
  }
  console.log(`${context}: Iniciando Firestore producto creation`, { 
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
    const product = {
      ...productData,
      creado: Timestamp.now()
    };
    console.log(`${context}: Producto document prepared`, { 
      empresaId,
      productFields: Object.keys(product),
      createdTimestamp: product.creado
    });
    const productsRef = getProductsRef(empresaId);
    console.log(`${context}: Products collection reference obtained`, { 
      empresaId,
      collectionPath: `empresas/${empresaId}/productos`
    });
    console.log(`${context}: Adding document to Firestore`);
    const productRef = await addDoc(productsRef, product);
    console.log(`${context}: Producto creado exitosamente in Firestore`, { 
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
  console.log(`${context}: Iniciando query`, { empresaId });
  try {
    const productsRef = getProductsRef(empresaId);
    console.log(`${context}: Executing simple query (no filters)`);
    const querySnapshot = await getDocs(productsRef);
    console.log(`${context}: Query completado`, { 
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
      const product = { ...data, id: doc.id } as Product;
      if (typeof product.ultimoCosto !== 'number') {
        console.warn(`${context}: Product ${product.id} missing required ultimoCosto field`);
      }
      if (typeof product.ultimaGanancia !== 'number') {
        console.warn(`${context}: Product ${product.id} missing required ultimaGanancia field`);
      }
      console.log(`${context}: Procesando document`, {
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
export async function createClient(empresaId: string, clientData: CreateClientData): Promise<string> {
  const context = 'firestore-utils.createClient';
  console.log(`${context}: Iniciando Firestore cliente creation`, { 
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
    const client: Client = {
      id: '', // Will be set by Firestore
      ...clientData,
      deudaActual: 0, // Initialize with no debt
      creado: Timestamp.now()
    };
    console.log(`${context}: Cliente document prepared`, { 
      empresaId,
      clientFields: Object.keys(client),
      deudaActual: client.deudaActual,
      createdTimestamp: client.creado
    });
    const clientsRef = getClientsRef(empresaId);
    console.log(`${context}: Clients collection reference obtained`, { 
      empresaId,
      collectionPath: `empresas/${empresaId}/clientes`
    });
    console.log(`${context}: Adding document to Firestore`);
    const clientRef = await addDoc(clientsRef, client);
    console.log(`${context}: Cliente creado exitosamente in Firestore`, { 
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
  try {
    const { SimpleDebtService } = await import('../services/SimpleDebtService');
    const clientEvents = await getClientEvents(empresaId, saleData.clienteId);
    const allEvents = [...clientEvents, { ...saleEvent, id: eventRef.id }];
    const { calculateClientDebt } = await import('./business-logic');
    const calculation = calculateClientDebt(allEvents);
    const finalDebt = calculation.totalDebt - calculation.favorBalance;
    await SimpleDebtService.getInstance().setClientDebt(empresaId, saleData.clienteId, 'Cliente', finalDebt);
    console.log(`Actualizado cliente ${saleData.clienteId} deuda to: ${finalDebt}`);
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
  try {
    const { SimpleDebtService } = await import('../services/SimpleDebtService');
    const clientEvents = await getClientEvents(empresaId, paymentData.clienteId);
    const allEvents = [...clientEvents, { ...paymentEvent, id: eventRef.id }];
    const { calculateClientDebt } = await import('./business-logic');
    const calculation = calculateClientDebt(allEvents);
    const finalDebt = calculation.totalDebt - calculation.favorBalance;
    await SimpleDebtService.getInstance().setClientDebt(empresaId, paymentData.clienteId, 'Cliente', finalDebt);
    console.log(`Actualizado cliente ${paymentData.clienteId} deuda to: ${finalDebt}`);
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
export async function recalculateAndUpdateClientDebt(empresaId: string, clientId: string): Promise<void> {
  try {
    const clientEvents = await getClientEvents(empresaId, clientId);
    const { calculateClientDebt } = await import('./business-logic');
    const calculation = calculateClientDebt(clientEvents);
    const finalDebt = calculation.totalDebt - calculation.favorBalance;
    const lastTransactionDate = clientEvents.length > 0 ? clientEvents[0].fecha : undefined;
    await updateClientDebt(empresaId, clientId, finalDebt, lastTransactionDate);
    console.log(`Recalculado deuda for cliente ${clientId}: ${finalDebt}`);
  } catch (error) {
    console.error(`Failed to recalculate debt for client ${clientId}:`, error);
    throw error;
  }
}
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
  try {
    const company = await getCompany(empresaId);
    if (company) {
      console.log('Company join request created - no push notification sent', {
        empresaId,
        solicitanteEmail,
        companyName: company.nombre
      });
    }
  } catch (error) {
    console.error('Error sending join request notification:', error);
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
    console.log('Document reference creado', {
      requestId: trimmedRequestId,
      docRefPath: docRef.path
    });
    await updateDoc(docRef, {
      estado: status,
      procesado: Timestamp.now()
    });
    console.log('Request status actualizado exitosamente', {
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
    console.log('Request eliminado exitosamente', {
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
      const product = { ...data, id: doc.id } as Product;
      if (typeof product.ultimoCosto !== 'number') {
        console.warn(`${context}: Product ${product.id} missing required ultimoCosto field`);
      }
      if (typeof product.ultimaGanancia !== 'number') {
        console.warn(`${context}: Product ${product.id} missing required ultimaGanancia field`);
      }
      console.log(`${context}: Procesando document`, {
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
    if (!company.nombre || company.nombre.trim().length === 0) {
      console.warn(`Company ${company.id} missing required nombre field`);
    }
    callback(company);
  });
}
