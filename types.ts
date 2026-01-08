
export enum Role {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'PENDING_VERIFICATION' | 'BLOCKED';

export enum RequirementStatus {
  PENDING_ADMIN = 'Pendiente Admin',
  ACTIVE = 'Activo',
  PENDING_EDIT = 'Pendiente Edicion',
  PENDING_DELETION = 'Pendiente Eliminacion',
  COMPLETED = 'Completado',
  PENDING_QUANTITY_INCREASE = 'Pendiente Aumento Cantidad',
  CANCELLED = 'Cancelado',
  REJECTED = 'Rechazado',
  HIDDEN_BY_ADMIN = 'Oculto por Admin', 
  PENDING_BUYER_APPROVAL = 'Pendiente Aprobación Comprador', 
  WAITING_FOR_OWNER_EDIT_APPROVAL = 'Esperando Aprobación Edición Dueño',
}

export enum OfferStatus {
  PENDING_ADMIN = 'Pendiente Admin',
  PENDING_BUYER = 'Pendiente Comprador',
  APPROVED = 'Aprobada',
  REJECTED = 'Rechazada',
  PENDING_EDIT = 'Pendiente Edicion',
  PENDING_DELETION = 'Pendiente Eliminacion',
  PENDING_SELLER_ACTION = 'Pendiente Acción Vendedor',
  HIDDEN_BY_ADMIN = 'Oculto por Admin',
  PENDING_SELLER_APPROVAL = 'Pendiente Aprobación Vendedor', 
  WAITING_FOR_OWNER_EDIT_APPROVAL = 'Esperando Aprobación Edición Dueño', 
}

// --- NUEVOS TIPOS PARA EL MÓDULO DE MERCADO (MARKETPLACE) ---

export enum ListingStatus {
  PENDING_ADMIN = 'En Revisión',
  ACTIVE = 'Publicado',
  REJECTED = 'Rechazado',
  SOLD = 'Vendido',
  HIDDEN = 'Oculto', // Pausado por el vendedor
  PENDING_SELLER_APPROVAL = 'Pendiente Aprobación Vendedor', // Creado por Admin
  WAITING_FOR_OWNER_EDIT_APPROVAL = 'Esperando Aprobación Edición Dueño',
  HIDDEN_BY_ADMIN = 'Archivado por Admin',
}

export enum PurchaseOfferStatus {
  PENDING_ADMIN = 'Revisión Admin',     // 1. Comprador oferta -> Admin revisa
  PENDING_SELLER = 'Revisión Vendedor', // 2. Admin aprueba -> Vendedor decide
  ACCEPTED = 'Aceptada',                // 3. Vendedor acepta -> Cierra trato
  REJECTED = 'Rechazada',               // Admin o Vendedor rechazan
  PENDING_BUYER_APPROVAL = 'Pendiente Aprobación Comprador', // Creado por Admin
  HIDDEN_BY_ADMIN = 'Archivado por Admin',
}

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  status: ListingStatus;
  createdAt: Date;

  // Datos del Material
  title: string;
  category: string;
  subcategory?: string; 
  presentation?: string; 
  description: string; // Descripción general breve
  
  quantity: number;
  unit: string; // Ton, Kg, Unidades
  
  // Precio Estructurado
  pricePerUnit: number; // El total calculado
  priceStructure: string; // JSON string: {name: string, value: number}[]
  currency: string;

  // Vigencia y Disponibilidad
  validFrom: string;
  validUntil: string;
  frequency: string;
  requiresCertificate?: boolean;
  
  // Calidad Detallada
  qualityDescription?: string;
  qualityFile?: FileAttachment;
  qualityUrl?: string;

  // Logística Detallada
  logisticsDescription?: string;
  logisticsFile?: FileAttachment;
  logisticsUrl?: string;
  logisticNotes?: string;
  
  // Ubicación y Logística General
  locationCity: string;
  locationDepartment: string;

  // Media (Galería de fotos)
  photos: FileAttachment[];
  
  // Admin fields
  rejectionReason?: string;
  createdByAdmin?: boolean;

  // Fee de Yubarta (Simetría con Requirement)
  managementFeePerKg?: number; 
  managementFeeAccepted?: boolean;
}

export interface PurchaseOffer {
  id: string;
  listingId: string; // ID de la publicación padre
  buyerId: string;
  status: PurchaseOfferStatus;
  createdAt: Date;

  // -- Condiciones de la Oferta (Espejo de complejidad Módulo 1) --
  
  // 1. Cantidad y Precio Global
  quantityRequested: number;
  totalPriceOffered: number; // Calculado o propuesto (TOTAL FINAL)
  
  // 2. Logística de Recogida
  tipoVehiculo: string; // Ej: Turbo, Doble Troque
  frecuenciaRetiro: string; // Ej: Única vez, Semanal
  fechaRecogida: string; // Fecha estimada de inicio de recogida
  
  // 3. Negociación de Ubicación
  aceptaUbicacion: boolean; // El comprador acepta ir al punto del vendedor
  contrapropuestaLogistica?: string; // Si false, propone otro punto

  // 4. Negociación de Precio
  aceptaPrecio: boolean;
  contrapropuestaPrecio?: number; // Precio unitario propuesto diferente (Legacy / Simple)
  offerPriceStructure?: string; // JSON String: Breakdown of variables {name, value}[]
  priceExplanation?: string; // Why the price is proposed

  // 5. Negociación de Calidad
  aceptaCalidad: boolean;
  contrapropuestaCalidad?: string;

  // 6. Propuesta de Pago (El Listing no suele tener esto fijo, el comprador propone)
  metodoPagoPropuesto: string; // Efectivo, Transferencia
  condicionesPagoPropuestas: string; // Contado, 30 días

  // 7. Vigencia de la Oferta
  validFrom: string;
  validUntil: string;

  message?: string; // Notas adicionales
  
  // New field: Capability to provide certificate if requested
  canProvideCertificate?: boolean;

  // Admin fields
  rejectionReason?: string;
  createdByAdmin?: boolean;

  // Penalidad (Simetría con Offer)
  penaltyFeeAccepted?: boolean;
}

// -------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name:string;
  email: string;
  password?: string;
  role: Role;
  
  // Enhanced User Management Fields
  status: UserStatus;
  isVerified?: boolean;
  needsAdminApproval?: boolean;
  registeredAt: Date;
  lastActivity: Date;
  adminNotes?: string; // Comentarios de devolución/ajustes

  idType?: string;
  idNumber?: string;
  phone1?: string;
  phone2?: string;
  contactPerson1Name?: string;
  contactPerson1Position?: string;
  contactPerson2Name?: string;
  contactPerson2Position?: string;
  address?: string;
  city?: string;
  department?: string;

  buyerType?: 'Transformador' | 'Gran Acopiador';
  certifiesREP?: boolean;

  pendingChanges?: {
    name?: string;
    idNumber?: string;
    email?: string;
    certifiesREP?: boolean;
  };
}

export interface FileAttachment {
  name: string;
  content: string; // Data URL
}

export interface Requirement {
  id: string;
  buyerId: string;
  status: RequirementStatus;
  createdAt: Date;

  categoryId: string; 
  totalVolume: number; 
  title: string; 
  description: string; 
  
  categoriaMaterial: string;
  subcategoria?: string;
  presentacionMaterial: string;

  cantidadRequerida: number;
  unidad: string;
  frecuencia: string;

  especificacionesCalidad: string;
  fichaTecnicaCalidad?: FileAttachment;
  urlFichaTecnicaCalidad?: string; 

  especificacionesLogisticas: string;
  fichaTecnicaLogistica?: FileAttachment;
  urlFichaTecnicaLogistica?: string; 
  
  terminosCalculoFletes?: string;
  adjuntoTerminosFletes?: FileAttachment;
  
  departamentoRecepcion: string;
  ciudadRecepcion: string;

  moneda: string;
  condicionesPrecio: string;
  tipoPago: string;
  metodoPago: string;
  porcentajeAnticipo: number;

  vigenciaInicio: string;
  vigenciaFin: string;

  rejectionReason?: string;

  pendingQuantityIncrease?: number;
  triggeringOfferIdForIncrease?: string;

  createdByAdmin?: boolean;
  
  pendingEdits?: Partial<Requirement>;

  managementFeePerKg?: number; 
  managementFeeAccepted?: boolean; 
}

export type CommunicationEventType = 'BUYER_REJECTION' | 'ADMIN_FEEDBACK' | 'SELLER_RESPONSE' | 'ADMIN_REJECTION' | 'ADMIN_RESPONSE';

export interface CommunicationLog {
  id: string;
  author: 'BUYER' | 'ADMIN' | 'SELLER';
  authorId: string;
  message: string;
  timestamp: Date;
  eventType: CommunicationEventType;
}

export interface Offer {
  id: string;
  sellerId: string;
  requirementId: string;
  status: OfferStatus;
  createdAt: Date;

  cantidadOfertada: number;
  unidadMedida: string;
  frecuenciaSuministro: string;
  tipoVehiculo?: string; 

  aceptaEspecificacionesCalidad: boolean;
  contrapropuestaCalidad?: string;

  aceptaCondicionesLogisticas: boolean;
  contrapropuestaLogistica?: string;

  aceptaLugarEntrega: boolean;

  aceptaFormulaPrecio: boolean;
  contrapropuestaFormulaPrecio?: string;
  aceptaCondicionesPago: boolean;
  contrapropuestaCondicionesPago?: string;
  aceptaMetodoPago: boolean;
  contrapropuestaMetodoPago?: string;

  fechaInicioVigencia: string;
  fechaFinVigencia: string;

  fotosMaterial?: FileAttachment;
  fotosProceso?: FileAttachment;
  fotosInstalaciones?: FileAttachment;

  communicationLog?: CommunicationLog[];
  
  createdByAdmin?: boolean;

  pendingEdits?: Partial<Offer>;

  penaltyFeeAccepted?: boolean;
}


export interface Commitment {
  id:string;
  offerId: string;
  requirementId: string; // En Marketplace se usará listingId
  volume: number;
}
