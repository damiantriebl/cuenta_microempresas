import {
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import {
  Company,
  CreateCompanyData,
  ServiceResponse,
  ValidationResult,
  CompanyMember,
  COLLECTIONS
} from '@/schemas/types';
import { validateCompany } from '@/schemas/validation';
import {
  createCompany as createCompanyInFirestore,
  getCompany as getCompanyFromFirestore,
  updateCompany as updateCompanyInFirestore,
  getCompanyMembers as getCompanyMembersFromFirestore,
  addCompanyMember as addCompanyMemberToFirestore,
  removeCompanyMember as removeCompanyMemberFromFirestore,
  subscribeToCompany,
  subscribeToCompanyMembers
} from '@/schemas/firestore-utils';
export class CompanyService {
  constructor() {
  }
  async createCompany(companyData: CreateCompanyData, ownerId: string): Promise<ServiceResponse<string>> {
    const context = 'CompanyService.createCompany';
    console.log(`${context}: Iniciando empresa creation`, {
      companyName: companyData.nombre,
      ownerId
    });
    try {
      const validation = validateCompany(companyData);
      if (!validation.isValid) {
        console.error(`${context}: Validation failed`, { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }
      const companyId = await createCompanyInFirestore(companyData, ownerId);
      console.log(`${context}: Empresa creado exitosamente`, {
        companyId,
        companyName: companyData.nombre,
        ownerId
      });
      return {
        success: true,
        data: companyId
      };
    } catch (error) {
      console.error(`${context}: Company creation failed`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  async getCompany(empresaId: string): Promise<ServiceResponse<Company>> {
    const context = 'CompanyService.getCompany';
    try {
      const company = await getCompanyFromFirestore(empresaId);
      if (!company) {
        return {
          success: false,
          errors: ['Empresa no encontrada']
        };
      }
      return {
        success: true,
        data: company
      };
    } catch (error) {
      console.error(`${context}: Failed to get company`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  async updateCompany(empresaId: string, updateData: Partial<Company>): Promise<ServiceResponse<void>> {
    const context = 'CompanyService.updateCompany';
    try {
      await updateCompanyInFirestore(empresaId, updateData);
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error(`${context}: Failed to update company`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  async getCompanyMembers(empresaId: string): Promise<ServiceResponse<CompanyMember[]>> {
    const context = 'CompanyService.getCompanyMembers';
    try {
      const members = await getCompanyMembersFromFirestore(empresaId);
      return {
        success: true,
        data: members
      };
    } catch (error) {
      console.error(`${context}: Failed to get company members`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  async addCompanyMember(empresaId: string, memberData: Omit<CompanyMember, 'fechaIngreso'>): Promise<ServiceResponse<void>> {
    const context = 'CompanyService.addCompanyMember';
    try {
      await addCompanyMemberToFirestore(empresaId, memberData.userId, memberData.email);
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error(`${context}: Failed to add company member`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  async removeCompanyMember(empresaId: string, userId: string): Promise<ServiceResponse<void>> {
    const context = 'CompanyService.removeCompanyMember';
    try {
      await removeCompanyMemberFromFirestore(empresaId, userId);
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error(`${context}: Failed to remove company member`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  subscribeToCompany(empresaId: string, callback: (company: Company | null) => void): Unsubscribe {
    return subscribeToCompany(empresaId, callback);
  }
  subscribeToCompanyMembers(empresaId: string, callback: (members: CompanyMember[]) => void): Unsubscribe {
    return subscribeToCompanyMembers(empresaId, callback);
  }
}
export const companyService = new CompanyService();
export default CompanyService;