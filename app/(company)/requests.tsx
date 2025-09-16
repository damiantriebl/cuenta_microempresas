import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import {
  getPendingJoinRequests,
  updateJoinRequestStatus,
  addCompanyMember,
  getCompany,
  subscribeToJoinRequests,
} from '@/schemas/firestore-utils';
import { CompanyJoinRequest, Company, CompanyMember } from '@/schemas/types';
import { companyService } from '@/services/CompanyService';
export default function CompanyRequestsScreen() {
  const router = useRouter();
  const { empresaId } = useLocalSearchParams<{ empresaId: string }>();
  const { user } = useAuth();
  const [requests, setRequests] = useState<CompanyJoinRequest[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!empresaId || !user) return;
    loadInitialData();
    const unsubscribe = subscribeToJoinRequests(empresaId, (newRequests) => {

      const validRequests = newRequests.filter(request => {
        const hasValidId = request.id && typeof request.id === 'string' && request.id.trim().length > 0;
        if (!hasValidId) {
          console.warn('Skipping real-time request with invalid ID', request);
        }
        return hasValidId;
      });

      setRequests(validRequests);
    });
    return () => unsubscribe();
  }, [empresaId, user]);
  const verifyOwnerPermissions = (company: Company | null, user: any, userRole: string | null) => {
    if (!user || !company) {

      return {
        isOwner: false,
        verificationMethod: 'none' as const,
        debugInfo: {
          companyOwner: company?.propietario || 'N/A',
          userUid: user?.uid || 'N/A',
          userEmail: user?.email || 'N/A',
          userRole: userRole || 'N/A'
        }
      };
    }
    if (company.propietario === user.uid) {

      return {
        isOwner: true,
        verificationMethod: 'propietario_uid' as const,
        debugInfo: {
          companyOwner: company.propietario,
          userUid: user.uid,
          userEmail: user.email || 'N/A',
          userRole: userRole || 'N/A'
        }
      };
    }
    if (company.propietario === user.email) {

      return {
        isOwner: true,
        verificationMethod: 'propietario_email' as const,
        debugInfo: {
          companyOwner: company.propietario,
          userUid: user.uid,
          userEmail: user.email || 'N/A',
          userRole: userRole || 'N/A'
        }
      };
    }
    if (userRole === 'owner') {

      return {
        isOwner: true,
        verificationMethod: 'member_role' as const,
        debugInfo: {
          companyOwner: company.propietario,
          userUid: user.uid,
          userEmail: user.email || 'N/A',
          userRole: userRole
        }
      };
    }

    return {
      isOwner: false,
      verificationMethod: 'none' as const,
      debugInfo: {
        companyOwner: company.propietario,
        userUid: user.uid,
        userEmail: user.email || 'N/A',
        userRole: userRole || 'N/A'
      }
    };
  };
  const loadInitialData = async () => {
    if (!empresaId || !user) return;
    try {
      setLoading(true);

      const companyData = await getCompany(empresaId);
      setCompany(companyData);

      const membersResponse = await companyService.getCompanyMembers(empresaId);
      let currentUserRole: string | null = null;
      if (membersResponse.success && membersResponse.data) {
        const currentUserMember = membersResponse.data.find(
          member => member.userId === user.uid || member.email === user.email
        );
        if (currentUserMember) {
          currentUserRole = currentUserMember.role;
          setUserRole(currentUserMember.role);

        } else {
          setUserRole(null);

        }
      } else {
        console.error('Failed to load company members', membersResponse.error);
        setUserRole(null);
      }
      const permissionCheck = verifyOwnerPermissions(companyData, user, currentUserRole);
      if (!permissionCheck.isOwner) {

        Alert.alert(
          'Acceso Denegado',
          'Solo los propietarios pueden ver las solicitudes de la empresa.',
          [
            {
              text: 'Entendido',
              onPress: () => router.back()
            }
          ]
        );
        return;
      }
      const pendingRequests = await getPendingJoinRequests(empresaId);

      const invalidRequests = pendingRequests.filter(r => !r.id || typeof r.id !== 'string' || r.id.trim().length === 0);
      if (invalidRequests.length > 0) {
        console.error('Found requests with invalid IDs', invalidRequests);
      }
      const validRequests = pendingRequests.filter(request => {
        const hasValidId = request.id && typeof request.id === 'string' && request.id.trim().length > 0;
        if (!hasValidId) {
          console.warn('Skipping request with invalid ID', request);
        }
        return hasValidId;
      });

      setRequests(validRequests);
    } catch (error) {
      console.error('Error loading company requests:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };
  const handleApproveRequest = async (request: CompanyJoinRequest) => {
    if (!user || !company) return;
    const permissionCheck = verifyOwnerPermissions(company, user, userRole);
    if (!permissionCheck.isOwner) {

      Alert.alert(
        'Error',
        'Solo el propietario puede aprobar solicitudes',
        [
          {
            text: 'OK',
            onPress: () => {

            }
          }
        ]
      );
      return;
    }

    processRequest(request, 'aceptada');
  };
  const handleRejectRequest = async (request: CompanyJoinRequest) => {
    if (!user || !company) return;
    const permissionCheck = verifyOwnerPermissions(company, user, userRole);
    if (!permissionCheck.isOwner) {

      Alert.alert(
        'Error',
        'Solo el propietario puede rechazar solicitudes',
        [
          {
            text: 'OK',
            onPress: () => {

            }
          }
        ]
      );
      return;
    }

    Alert.alert(
      'Rechazar solicitud',
      `¿Estás seguro de que quieres rechazar la solicitud de ${request.solicitanteEmail}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: () => processRequest(request, 'rechazada'),
        },
      ]
    );
  };
  const processRequest = async (
    request: CompanyJoinRequest,
    status: 'aceptada' | 'rechazada'
  ) => {
    if (!company) return;

    if (!request.id || typeof request.id !== 'string' || request.id.trim().length === 0) {
      console.error('Invalid request ID', {
        requestId: request.id,
        requestIdType: typeof request.id,
        request: request
      });
      Alert.alert(
        'Error',
        'ID de solicitud inválido. Esta solicitud no se puede procesar. Por favor, recarga la página.',
        [
          {
            text: 'Recargar',
            onPress: () => {
              loadInitialData();
            }
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
      return;
    }
    setProcessingRequests(prev => new Set(prev).add(request.id));
    try {
      if (status === 'aceptada') {

        await addCompanyMember(
          request.empresaId,
          request.solicitanteId,
          request.solicitanteEmail
        );
     
        Alert.alert(
          'Solicitud aprobada',
          `${request.solicitanteEmail} ahora es miembro de la empresa`
        );
      } else {

        await updateJoinRequestStatus(request.id, status);
       
        Alert.alert(
          'Solicitud rechazada',
          `Se ha rechazado la solicitud de ${request.solicitanteEmail}`
        );
      }

      const { deleteJoinRequest } = await import('@/schemas/firestore-utils');
      await deleteJoinRequest(request.id);

      setRequests(prev => prev.filter(r => r.id !== request.id));

    } catch (error) {
      console.error('Error processing request:', error);
      Alert.alert('Error', 'No se pudo procesar la solicitud');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(request.id);
        return newSet;
      });
    }
  };
  const renderRequestItem = ({ item }: { item: CompanyJoinRequest }) => {
    const isProcessing = processingRequests.has(item.id);
    const permissionCheck = verifyOwnerPermissions(company, user, userRole);
    const isOwner = permissionCheck.isOwner;
    const hasValidId = item.id && typeof item.id === 'string' && item.id.trim().length > 0;
    return (
      <View style={styles.requestItem}>
        <View style={styles.requestInfo}>
          <Text style={styles.requesterEmail}>{item.solicitanteEmail}</Text>
          <Text style={styles.requestDate}>
            Solicitado: {item.creado?.toDate?.()?.toLocaleDateString() || 'Fecha no disponible'}
          </Text>
          {!hasValidId && (
            <Text style={styles.errorText}>
              ⚠️ Solicitud con ID inválido - no se puede procesar
            </Text>
          )}
        </View>
        {isOwner && hasValidId ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.approveButton, isProcessing && styles.disabledButton]}
              onPress={() => handleApproveRequest(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.approveButtonText}>Aceptar acceso</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectButton, isProcessing && styles.disabledButton]}
              onPress={() => handleRejectRequest(item)}
              disabled={isProcessing}
            >
              <Text style={styles.rejectButtonText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        ) : !hasValidId ? (
          <View style={styles.errorBadge}>
            <Text style={styles.errorBadgeText}>ID inválido</Text>
          </View>
        ) : (
          <View style={styles.noPermissionBadge}>
            <Text style={styles.noPermissionText}>Solo propietario</Text>
          </View>
        )}
      </View>
    );
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25B4BD" />
        <Text style={styles.loadingText}>Cargando solicitudes...</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Solicitudes de Acceso</Text>
        {company && (
          <Text style={styles.companyName}>{company.nombre}</Text>
        )}
        {}
        {user && (
          <>
            <Text style={styles.debugText}>
              Usuario: {user.email} | Rol: {(userRole === 'owner') ? 'Propietario' : 'Miembro'}
            </Text>
          </>
        )}
      </View>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No hay solicitudes pendientes
            </Text>
            <Text style={styles.emptySubtext}>
              Las nuevas solicitudes aparecerán aquí automáticamente
            </Text>
          </View>
        )}
        contentContainerStyle={requests.length === 0 ? styles.emptyList : undefined}
      />
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebebeb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    color: '#666666',
  },
  debugText: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '500',
    marginTop: 2,
  },
  errorBadge: {
    backgroundColor: '#f8d7da',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorBadgeText: {
    color: '#721c24',
    fontSize: 12,
    fontWeight: '500',
  },
  debugButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  debugButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  offlineButton: {
    backgroundColor: '#dc3545',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  requestItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requesterEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 14,
    color: '#666666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#279D2E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  noPermissionBadge: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  noPermissionText: {
    color: '#6c757d',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ebebeb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: '#25B4BD',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  floatingOfflineButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ff6b35',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  floatingButtonText: {
    fontSize: 24,
    color: '#fff',
  },
});