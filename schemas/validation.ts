import { 
  Company, 
  Product, 
  Client, 
  TransactionEvent, 
  SaleEvent, 
  PaymentEvent,
  CompanyJoinRequest,
  ValidationResult,
  CreateCompanyData,
  CreateProductData,
  CreateClientData,
  CreateSaleEventData,
  CreatePaymentEventData
} from './types';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

function createValidationResult(isValid: boolean, errors: string[] = []): ValidationResult {
  return { isValid, errors };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhoneNumber(phone: string): boolean {
  // Basic phone validation - should contain only numbers, spaces, +, -, (, )
  const phoneRegex = /^[\d\s\+\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
}

function isValidColorHex(color: string): boolean {
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return colorRegex.test(color);
}

// ============================================================================
// COMPANY VALIDATION
// ============================================================================

export function validateCompany(company: CreateCompanyData): ValidationResult {
  const errors: string[] = [];

  // REQUIRED FIELD: nombre is now mandatory
  if (!company.nombre || company.nombre.trim().length === 0) {
    errors.push('El nombre de la empresa es requerido');
  }

  if (company.nombre && company.nombre.trim().length > 100) {
    errors.push('El nombre de la empresa no puede exceder 100 caracteres');
  }

  if (!company.propietario || company.propietario.trim().length === 0) {
    errors.push('El propietario de la empresa es requerido');
  }

  return createValidationResult(errors.length === 0, errors);
}

// New validation function for existing Company objects (including updates)
export function validateExistingCompany(company: Partial<Company>): ValidationResult {
  const errors: string[] = [];

  if ('nombre' in company) {
    if (!company.nombre || company.nombre.trim().length === 0) {
      errors.push('El nombre de la empresa es requerido');
    }

    if (company.nombre && company.nombre.trim().length > 100) {
      errors.push('El nombre de la empresa no puede exceder 100 caracteres');
    }
  }

  if ('propietario' in company) {
    if (!company.propietario || company.propietario.trim().length === 0) {
      errors.push('El propietario de la empresa es requerido');
    }
  }

  return createValidationResult(errors.length === 0, errors);
}

// ============================================================================
// PRODUCT VALIDATION
// ============================================================================

export function validateProduct(product: CreateProductData): ValidationResult {
  const errors: string[] = [];

  if (!product.nombre || product.nombre.trim().length === 0) {
    errors.push('El nombre del producto es requerido');
  }

  if (product.nombre && product.nombre.trim().length > 50) {
    errors.push('El nombre del producto no puede exceder 50 caracteres');
  }

  if (!product.colorFondo || !isValidColorHex(product.colorFondo)) {
    errors.push('El color de fondo debe ser un código hexadecimal válido (ej: #FF0000)');
  }

  if (typeof product.posicion !== 'number' || product.posicion < 0) {
    errors.push('La posición debe ser un número mayor o igual a 0');
  }

  // REQUIRED FIELDS: ultimoCosto and ultimaGanancia are now mandatory
  if (typeof product.ultimoCosto !== 'number') {
    errors.push('El último costo es requerido y debe ser un número');
  } else if (product.ultimoCosto < 0) {
    errors.push('El último costo debe ser un número mayor o igual a 0');
  }

  if (typeof product.ultimaGanancia !== 'number') {
    errors.push('La última ganancia es requerida y debe ser un número');
  } else if (product.ultimaGanancia < 0) {
    errors.push('La última ganancia debe ser un número mayor o igual a 0');
  }

  if (typeof product.activo !== 'boolean') {
    errors.push('El estado activo debe ser verdadero o falso');
  }

  return createValidationResult(errors.length === 0, errors);
}

// New validation function for existing Product objects (including updates)
export function validateExistingProduct(product: Partial<Product>): ValidationResult {
  const errors: string[] = [];

  if ('nombre' in product) {
    if (!product.nombre || product.nombre.trim().length === 0) {
      errors.push('El nombre del producto es requerido');
    }

    if (product.nombre && product.nombre.trim().length > 50) {
      errors.push('El nombre del producto no puede exceder 50 caracteres');
    }
  }

  if ('colorFondo' in product) {
    if (!product.colorFondo || !isValidColorHex(product.colorFondo)) {
      errors.push('El color de fondo debe ser un código hexadecimal válido (ej: #FF0000)');
    }
  }

  if ('posicion' in product) {
    if (typeof product.posicion !== 'number' || product.posicion < 0) {
      errors.push('La posición debe ser un número mayor o igual a 0');
    }
  }

  // REQUIRED FIELDS: ultimoCosto and ultimaGanancia must be valid numbers if present
  if ('ultimoCosto' in product) {
    if (typeof product.ultimoCosto !== 'number') {
      errors.push('El último costo debe ser un número');
    } else if (product.ultimoCosto < 0) {
      errors.push('El último costo debe ser un número mayor o igual a 0');
    }
  }

  if ('ultimaGanancia' in product) {
    if (typeof product.ultimaGanancia !== 'number') {
      errors.push('La última ganancia debe ser un número');
    } else if (product.ultimaGanancia < 0) {
      errors.push('La última ganancia debe ser un número mayor o igual a 0');
    }
  }

  if ('activo' in product) {
    if (typeof product.activo !== 'boolean') {
      errors.push('El estado activo debe ser verdadero o falso');
    }
  }

  return createValidationResult(errors.length === 0, errors);
}

// ============================================================================
// CLIENT VALIDATION
// ============================================================================

export function validateClient(client: CreateClientData): ValidationResult {
  const errors: string[] = [];

  if (!client.nombre || client.nombre.trim().length === 0) {
    errors.push('El nombre del cliente es requerido');
  }

  if (client.nombre && client.nombre.trim().length > 100) {
    errors.push('El nombre del cliente no puede exceder 100 caracteres');
  }

  if (!client.direccion || client.direccion.trim().length === 0) {
    errors.push('La dirección del cliente es requerida');
  }

  if (client.direccion && client.direccion.trim().length > 200) {
    errors.push('La dirección no puede exceder 200 caracteres');
  }

  if (!client.telefono || client.telefono.trim().length === 0) {
    errors.push('El teléfono del cliente es requerido');
  }

  if (client.telefono && !isValidPhoneNumber(client.telefono)) {
    errors.push('El teléfono debe ser un número válido');
  }

  if (client.notas && client.notas.length > 500) {
    errors.push('Las notas no pueden exceder 500 caracteres');
  }

  if (typeof client.oculto !== 'boolean') {
    errors.push('El estado oculto debe ser verdadero o falso');
  }

  return createValidationResult(errors.length === 0, errors);
}

// ============================================================================
// TRANSACTION EVENT VALIDATION
// ============================================================================

export function validateSaleEvent(saleEvent: CreateSaleEventData): ValidationResult {
  const errors: string[] = [];

  if (!saleEvent.clienteId || saleEvent.clienteId.trim().length === 0) {
    errors.push('El ID del cliente es requerido');
  }

  if (!saleEvent.producto || saleEvent.producto.trim().length === 0) {
    errors.push('El producto es requerido');
  }

  if (typeof saleEvent.cantidad !== 'number' || saleEvent.cantidad <= 0) {
    errors.push('La cantidad debe ser un número mayor a 0');
  }

  if (typeof saleEvent.costoUnitario !== 'number' || saleEvent.costoUnitario < 0) {
    errors.push('El costo unitario debe ser un número mayor o igual a 0');
  }

  if (typeof saleEvent.gananciaUnitaria !== 'number' || saleEvent.gananciaUnitaria < 0) {
    errors.push('La ganancia unitaria debe ser un número mayor o igual a 0');
  }

  if (typeof saleEvent.totalVenta !== 'number' || saleEvent.totalVenta <= 0) {
    errors.push('El total de venta debe ser un número mayor a 0');
  }

  // Validate that totalVenta matches calculation
  const expectedTotal = saleEvent.cantidad * (saleEvent.costoUnitario + saleEvent.gananciaUnitaria);
  if (Math.abs(saleEvent.totalVenta - expectedTotal) > 0.01) {
    errors.push('El total de venta no coincide con el cálculo (cantidad × (costo + ganancia))');
  }

  if (saleEvent.productoColor && !isValidColorHex(saleEvent.productoColor)) {
    errors.push('El color del producto debe ser un código hexadecimal válido');
  }

  if (saleEvent.notas && saleEvent.notas.length > 500) {
    errors.push('Las notas no pueden exceder 500 caracteres');
  }

  return createValidationResult(errors.length === 0, errors);
}

export function validatePaymentEvent(paymentEvent: CreatePaymentEventData): ValidationResult {
  const errors: string[] = [];

  if (!paymentEvent.clienteId || paymentEvent.clienteId.trim().length === 0) {
    errors.push('El ID del cliente es requerido');
  }

  if (typeof paymentEvent.montoPago !== 'number' || paymentEvent.montoPago <= 0) {
    errors.push('El monto del pago debe ser un número mayor a 0');
  }

  if (paymentEvent.notas && paymentEvent.notas.length > 500) {
    errors.push('Las notas no pueden exceder 500 caracteres');
  }

  return createValidationResult(errors.length === 0, errors);
}

export function validateTransactionEvent(event: TransactionEvent): ValidationResult {
  // First validate common fields
  const errors: string[] = [];

  if (!event.clienteId || event.clienteId.trim().length === 0) {
    errors.push('El ID del cliente es requerido');
  }

  if (!event.fecha) {
    errors.push('La fecha del evento es requerida');
  }

  if (event.notas && event.notas.length > 500) {
    errors.push('Las notas no pueden exceder 500 caracteres');
  }

  if (typeof event.borrado !== 'boolean') {
    errors.push('El estado borrado debe ser verdadero o falso');
  }

  // Then validate type-specific fields
  if (event.tipo === 'venta') {
    const saleValidation = validateSaleEvent(event as CreateSaleEventData);
    errors.push(...saleValidation.errors);
  } else if (event.tipo === 'pago') {
    const paymentValidation = validatePaymentEvent(event as CreatePaymentEventData);
    errors.push(...paymentValidation.errors);
  } else {
    errors.push('Tipo de evento no válido. Debe ser "venta" o "pago"');
  }

  return createValidationResult(errors.length === 0, errors);
}

// ============================================================================
// COMPANY JOIN REQUEST VALIDATION
// ============================================================================

export function validateCompanyJoinRequest(request: Omit<CompanyJoinRequest, 'id' | 'creado'>): ValidationResult {
  const errors: string[] = [];

  if (!request.empresaId || request.empresaId.trim().length === 0) {
    errors.push('El ID de la empresa es requerido');
  }

  if (!request.solicitanteId || request.solicitanteId.trim().length === 0) {
    errors.push('El ID del solicitante es requerido');
  }

  if (!request.solicitanteEmail || !isValidEmail(request.solicitanteEmail)) {
    errors.push('El email del solicitante debe ser válido');
  }

  if (!['pendiente', 'aceptada', 'rechazada'].includes(request.estado)) {
    errors.push('El estado debe ser: pendiente, aceptada o rechazada');
  }

  return createValidationResult(errors.length === 0, errors);
}

// ============================================================================
// BUSINESS LOGIC VALIDATION
// ============================================================================

export function validateDebtCalculation(events: TransactionEvent[]): ValidationResult {
  const errors: string[] = [];
  let runningDebt = 0;

  // Sort events by date (oldest first) for proper calculation
  const sortedEvents = [...events].sort((a, b) => a.fecha.toMillis() - b.fecha.toMillis());

  for (const event of sortedEvents) {
    if (event.borrado) continue;

    if (event.tipo === 'venta') {
      runningDebt += event.totalVenta;
    } else if (event.tipo === 'pago') {
      runningDebt -= event.montoPago;
    }

    // Debt should never go significantly negative (allowing for small floating point errors)
    if (runningDebt < -0.01) {
      errors.push(`Pago excesivo detectado en evento ${event.id}: deuda resultante ${runningDebt}`);
    }
  }

  return createValidationResult(errors.length === 0, errors);
}