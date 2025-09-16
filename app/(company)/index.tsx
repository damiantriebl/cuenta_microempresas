import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import {
  createCompany,
  createJoinRequest,
  getCompany,
  getPendingJoinRequests,
  toggleCompanyJoinRequests
} from '@/schemas/firestore-utils';
import {
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Company, CreateCompanyData } from '@/schemas/types';

export default function CompanyScreen() {
  const router = useRouter();
  const { user, empresas, setEmpresaId, refreshEmpresas, signOutApp } = useAuth();



  // Form states
  const [nombreNueva, setNombreNueva] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Data states
  const [todasEmpresas, setTodasEmpresas] = useState<Company[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [userPendingRequests, setUserPendingRequests] = useState<Set<string>>(new Set());

  // Form validation
  const [nombreError, setNombreError] = useState('');

  // Pending requests count for owned companies
  const [pendingRequestsCount, setPendingRequestsCount] = useState<{ [key: string]: number }>({});

  // Companies details for user memberships
  const [userCompaniesDetails, setUserCompaniesDetails] = useState<{ [key: string]: Company }>({});

  const loadPendingRequestsCounts = useCallback(async () => {
    if (!user) return;

    console.log('loadPendingRequestsCounts called', { user: user.uid, empresas });

    const counts: { [key: string]: number } = {};
    const companiesDetails: { [key: string]: Company } = {};

    // Only check for owned companies
    const ownedCompanies = empresas.filter(membership => membership.role === 'owner');
    console.log('Owned companies found', ownedCompanies);

    await Promise.all(
      ownedCompanies.map(async (membership) => {
        try {
          console.log(`Loading data for company ${membership.empresaId}`);

          const requests = await getPendingJoinRequests(membership.empresaId);
          counts[membership.empresaId] = requests.length;
          console.log(`Requests count for ${membership.empresaId}: ${requests.length}`);

          // Also load company details for toggle functionality
          const company = await getCompany(membership.empresaId);
          console.log(`Company details for ${membership.empresaId}:`, company);

          if (company) {
            // Auto-migrate if solicitudesAbiertas is undefined
            if (company.solicitudesAbiertas === undefined) {
              console.log(`Auto-migrating solicitudesAbiertas for ${membership.empresaId}`);
              try {
                await toggleCompanyJoinRequests(membership.empresaId, false);
                company.solicitudesAbiertas = false;
                console.log(`Auto-migration completed for ${membership.empresaId}`);
              } catch (error) {
                console.error('Error auto-migrating company:', error);
                company.solicitudesAbiertas = false; // Set locally anyway
              }
            }
            companiesDetails[membership.empresaId] = company;
            console.log(`Company details stored for ${membership.empresaId}:`, company);
          }
        } catch (error) {
          console.error(`Error loading requests for ${membership.empresaId}:`, error);
          counts[membership.empresaId] = 0;
        }
      })
    );

    console.log('Final counts and details:', { counts, companiesDetails });

    setPendingRequestsCount(counts);
    setUserCompaniesDetails(companiesDetails);
  }, [user, empresas]);

  useEffect(() => {
    fetchAllCompanies();
    loadPendingRequestsCounts();
  }, [loadPendingRequestsCounts]);

  useEffect(() => {
    // Reload pending requests when empresas change
    if (empresas.length > 0) {
      loadPendingRequestsCounts();
    }
  }, [empresas, loadPendingRequestsCounts]);

  const fetchAllCompanies = async () => {
    setLoadingEmpresas(true);
    try {
      const q = query(
        collection(db, 'empresas'),
        orderBy('nombre')
      );
      const snapshot = await getDocs(q);
      const companies = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        solicitudesAbiertas: doc.data().solicitudesAbiertas ?? false // Default to false (CLOSED) if missing
      } as Company));
      setTodasEmpresas(companies);

      // También cargar las solicitudes pendientes del usuario
      await loadUserPendingRequests();
    } catch (error) {
      console.error('Error fetching companies:', error);
      Alert.alert('Error', 'No se pudieron cargar las empresas');
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const loadUserPendingRequests = async () => {
    if (!user) return;

    try {
      // Buscar solicitudes pendientes del usuario actual
      const q = query(
        collection(db, 'solicitudesEmpresa'),
        orderBy('creado', 'desc')
      );
      const snapshot = await getDocs(q);
      const pendingRequests = new Set<string>();

      snapshot.docs.forEach(doc => {
        const request = doc.data();
        if (request.solicitanteId === user.uid && request.estado === 'pendiente') {
          pendingRequests.add(request.empresaId);
        }
      });

      setUserPendingRequests(pendingRequests);
    } catch (error) {
      console.error('Error loading user pending requests:', error);
    }
  };

  const empresasFiltradas = useMemo(() => {
    // Excluir empresas en las que el usuario ya es miembro/propietario
    const membershipIds = new Set(empresas.map(m => m.empresaId));

    const disponibles = todasEmpresas.filter(empresa => {
      // Excluir empresas donde ya es miembro
      const isNotMember = !membershipIds.has(empresa.id);
      // Solo mostrar empresas con solicitudes ABIERTAS (true)
      const hasOpenRequests = empresa.solicitudesAbiertas === true;



      return isNotMember && hasOpenRequests;
    });

    if (!busqueda.trim()) return disponibles;

    const term = busqueda.toLowerCase().trim();
    return disponibles.filter(empresa =>
      empresa.nombre?.toLowerCase().includes(term)
    );
  }, [todasEmpresas, busqueda, empresas]);

  const validateCompanyName = (name: string): boolean => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNombreError('El nombre de la empresa es requerido');
      return false;
    }

    if (trimmedName.length < 3) {
      setNombreError('El nombre debe tener al menos 3 caracteres');
      return false;
    }

    if (trimmedName.length > 50) {
      setNombreError('El nombre no puede exceder 50 caracteres');
      return false;
    }

    // Check if company name already exists
    const nameExists = todasEmpresas.some(empresa =>
      empresa.nombre?.toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameExists) {
      setNombreError('Ya existe una empresa con este nombre');
      return false;
    }

    setNombreError('');
    return true;
  };

  const handleCrearEmpresa = async () => {
    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    const nombreTrimmed = nombreNueva.trim();

    if (!validateCompanyName(nombreTrimmed)) {
      return;
    }

    setIsCreating(true);

    try {
      const companyData: CreateCompanyData = {
        nombre: nombreTrimmed,
        propietario: user.email || user.uid
      };

      const empresaId = await createCompany(companyData, user.uid);

      // Refresh user's company memberships
      await refreshEmpresas();

      // Set the new company as active
      setEmpresaId(empresaId);

      Alert.alert(
        'Empresa creada',
        `La empresa "${nombreTrimmed}" ha sido creada exitosamente`,
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );

    } catch (error) {
      console.error('Error creating company:', error);
      Alert.alert('Error', 'No se pudo crear la empresa. Intenta nuevamente.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSeleccionarEmpresa = async (empresaId: string) => {
    try {
      // Verify company still exists
      const company = await getCompany(empresaId);
      if (!company) {
        Alert.alert('Error', 'La empresa seleccionada ya no existe');
        await refreshEmpresas();
        return;
      }

      setEmpresaId(empresaId);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error selecting company:', error);
      Alert.alert('Error', 'No se pudo acceder a la empresa');
    }
  };

  const handleSolicitarAcceso = async (empresaId: string, empresaNombre: string) => {
    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    // Check if user is already a member
    const isMember = empresas.some(membership => membership.empresaId === empresaId);
    if (isMember) {
      Alert.alert('Información', 'Ya eres miembro de esta empresa');
      return;
    }

    setIsSearching(true);

    try {
      // Check if company allows join requests
      const company = await getCompany(empresaId);
      if (!company) {
        Alert.alert('Error', 'La empresa ya no existe');
        return;
      }

      if (company.solicitudesAbiertas !== true) {
        Alert.alert(
          'Solicitudes cerradas',
          `La empresa "${empresaNombre}" no está aceptando nuevas solicitudes en este momento.`
        );
        return;
      }

      await createJoinRequest(empresaId, user.uid, user.email || '');

      // Actualizar el estado local inmediatamente
      setUserPendingRequests(prev => new Set(prev).add(empresaId));

      Alert.alert(
        'Solicitud enviada',
        `Tu solicitud para unirte a "${empresaNombre}" ha sido enviada. El propietario recibirá una notificación.`,
        [{ text: 'Entendido' }]
      );

    } catch (error) {
      console.error('Error creating join request:', error);
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta nuevamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewRequests = (empresaId: string) => {
    router.push({
      pathname: '/(company)/requests',
      params: { empresaId }
    });
  };

  const handleViewMembers = (empresaId: string) => {
    router.push({
      pathname: '/(company)/members',
      params: { empresaId }
    });
  };

  const handleToggleRequests = async (empresaId: string, companyName: string, currentStatus: boolean) => {
    console.log('handleToggleRequests called', {
      empresaId,
      companyName,
      currentStatus
    });

    const newStatus = !currentStatus;
    const action = newStatus ? 'abrir' : 'cerrar';

    console.log('Toggle action determined', {
      currentStatus,
      newStatus,
      action
    });

    console.log('Executing toggle action directly', { action, empresaId, newStatus });
    try {
      console.log('Calling toggleCompanyJoinRequests', { empresaId, newStatus });
      await toggleCompanyJoinRequests(empresaId, newStatus);
      console.log('toggleCompanyJoinRequests completed successfully');

      // IMMEDIATELY update local state
      setUserCompaniesDetails(prev => {
        const updated = {
          ...prev,
          [empresaId]: {
            ...prev[empresaId],
            solicitudesAbiertas: newStatus
          }
        };
        console.log('Updated local state', { prev, updated });
        return updated;
      });

      Alert.alert(
        'Éxito',
        `Las solicitudes han sido ${newStatus ? 'abiertas' : 'cerradas'} para "${companyName}"`
      );

      // Also refresh from server to be sure
      console.log('Refreshing data from server');
      await fetchAllCompanies();
      await loadPendingRequestsCounts();
      console.log('Data refresh completed');
    } catch (error) {
      console.error('Error toggling requests:', error);
      Alert.alert('Error', `No se pudo ${action} las solicitudes`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutApp();
              // La navegación se manejará automáticamente por el AuthProvider
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'No se pudo cerrar la sesión. Intenta nuevamente.');
            }
          },
        },
      ]
    );
  };

  const renderCompanyItem = ({ item }: { item: Company }) => {
    const isMember = empresas.some(membership => membership.empresaId === item.id);
    const hasPendingRequest = userPendingRequests.has(item.id);

    return (
      <View style={styles.companyItem}>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{item.nombre}</Text>
          <Text style={styles.companyDetails}>
            Creada: {item.creado?.toDate?.()?.toLocaleDateString() || 'Fecha no disponible'}
          </Text>
        </View>

        {isMember ? (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>Miembro</Text>
          </View>
        ) : hasPendingRequest ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Acceso solicitado</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.joinButton, isSearching && styles.disabledButton]}
            onPress={() => handleSolicitarAcceso(item.id, item.nombre)}
            disabled={isSearching}
          >
            <Text style={styles.joinButtonText}>Solicitar acceso</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header with logout button */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#dc3545" />
              <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Selecciona una empresa existente o crea una nueva para comenzar
          </Text>
        </View>

        {/* User's Companies Section */}
        {empresas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mis Empresas</Text>
            {empresas.map((membership) => (
              <View key={membership.empresaId} style={styles.userCompanyContainer}>
                <TouchableOpacity
                  style={styles.userCompanyItem}
                  onPress={() => handleSeleccionarEmpresa(membership.empresaId)}
                >
                  <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>
                      {membership.companyName || membership.empresaId}
                    </Text>
                    <Text style={styles.companyDetails}>
                      Rol: {membership.role === 'owner' ? 'Propietario' : 'Miembro'}
                    </Text>
                  </View>
                  <View style={[
                    styles.roleBadge,
                    membership.role === 'owner' ? styles.ownerBadge : styles.memberBadge
                  ]}>
                    <Text style={[
                      styles.roleBadgeText,
                      membership.role === 'owner' ? styles.ownerBadgeText : styles.memberBadgeText
                    ]}>
                      {membership.role === 'owner' ? 'Propietario' : 'Miembro'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Show management buttons for owners */}
                {membership.role === 'owner' ? (
                  <View style={styles.managementButtons}>
                    <TouchableOpacity
                      style={styles.requestsButton}
                      onPress={() => handleViewRequests(membership.empresaId)}
                    >
                      <Text style={styles.requestsButtonText}>
                        Solicitudes
                        {pendingRequestsCount[membership.empresaId] > 0 && (
                          <Text style={styles.requestsCount}>
                            {' '}({pendingRequestsCount[membership.empresaId]})
                          </Text>
                        )}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.membersButton}
                      onPress={() => handleViewMembers(membership.empresaId)}
                    >
                      <Text style={styles.membersButtonText}>Miembros</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.toggleRequestsButton,
                        userCompaniesDetails[membership.empresaId]?.solicitudesAbiertas === false && styles.closedRequestsButton
                      ]}
                      onPress={() => {
                        const currentCompany = userCompaniesDetails[membership.empresaId];
                        console.log('Toggle button pressed', {
                          empresaId: membership.empresaId,
                          currentCompany,
                          solicitudesAbiertas: currentCompany?.solicitudesAbiertas,
                          userCompaniesDetails
                        });
                        handleToggleRequests(
                          membership.empresaId,
                          membership.companyName || 'Empresa',
                          currentCompany?.solicitudesAbiertas === true
                        );
                      }}
                    >
                      <Text style={[
                        styles.toggleRequestsButtonText,
                        userCompaniesDetails[membership.empresaId]?.solicitudesAbiertas === false && styles.closedRequestsButtonText
                      ]}>
                        {userCompaniesDetails[membership.empresaId]?.solicitudesAbiertas === false ? 'Abrir solicitudes' : 'Cerrar solicitudes'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.memberNotice}>
                    <Text style={styles.memberNoticeText}>
                      Solo los propietarios pueden gestionar solicitudes y miembros
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Create New Company Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crear Nueva Empresa</Text>
          <View style={styles.createForm}>
            <TextInput
              placeholder="Nombre de la empresa"
              style={[styles.input, nombreError ? styles.inputError : null]}
              value={nombreNueva}
              onChangeText={(text) => {
                setNombreNueva(text);
                if (nombreError) {
                  setNombreError('');
                }
              }}
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleCrearEmpresa}
            />
            {nombreError ? (
              <Text style={styles.errorText}>{nombreError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.disabledButton]}
              onPress={handleCrearEmpresa}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.createButtonText}>Crear Empresa</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Companies Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buscar Empresas Existentes</Text>
          <TextInput
            placeholder="Buscar por nombre de empresa..."
            style={styles.searchInput}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {loadingEmpresas ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#25B4BD" />
              <Text style={styles.loadingText}>Cargando empresas...</Text>
            </View>
          ) : (
            <FlatList
              data={empresasFiltradas}
              keyExtractor={(item) => item.id}
              renderItem={renderCompanyItem}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {busqueda.trim()
                      ? 'No se encontraron empresas con ese nombre'
                      : 'No hay empresas disponibles'
                    }
                  </Text>
                </View>
              )}
              scrollEnabled={false}
              style={styles.companiesList}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebebeb',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc3545',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: "100%",
  },
  logoutButtonText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },

  // User Companies Styles
  userCompanyContainer: {
    marginBottom: 8,
  },
  userCompanyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#25B4BD',
  },
  managementButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  requestsButton: {
    backgroundColor: '#25B4BD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
  },
  requestsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  requestsCount: {
    backgroundColor: '#fff',
    color: '#25B4BD',
    paddingHorizontal: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  membersButton: {
    backgroundColor: '#279D2E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
  },
  membersButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleRequestsButton: {
    backgroundColor: '#f39c12',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
  },
  closedRequestsButton: {
    backgroundColor: '#dc3545',
  },
  toggleRequestsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closedRequestsButtonText: {
    color: '#fff',
  },
  memberNotice: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#6c757d',
  },
  memberNoticeText: {
    color: '#6c757d',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },

  // Create Form Styles
  createForm: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: -8,
    marginBottom: 4,
  },
  createButton: {
    backgroundColor: '#25B4BD',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Search Styles
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },

  // Company List Styles
  companiesList: {
    maxHeight: 300,
  },
  companyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  companyInfo: {
    flex: 1,
    marginRight: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 14,
    color: '#666666',
  },

  // Badge Styles
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  ownerBadge: {
    backgroundColor: '#25B4BD',
  },
  memberBadge: {
    backgroundColor: '#6c757d',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  memberBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingBadge: {
    backgroundColor: '#f39c12',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ownerBadgeText: {
    color: '#fff',
  },

  // Join Button Styles
  joinButton: {
    backgroundColor: '#279D2E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Loading and Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});


