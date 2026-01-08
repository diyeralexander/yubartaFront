
import React, { useState, useMemo, useCallback } from 'react';
import { useData, useNotificationStats } from '../../hooks/useData';
import { User, Requirement, Offer, RequirementStatus, OfferStatus, Role, CommunicationLog, UserStatus, ListingStatus } from '../../types';
import { DownloadIcon, UserCircleIcon, DatabaseIcon, ArchiveBoxIcon, ClipboardListIcon, SpinnerIcon, TrashIcon, CheckCircleIcon, XCircleIcon, PencilIcon, PlusIcon, TruckIcon, EyeIcon, ChartBarIcon, ShoppingCartIcon } from '../icons';
import { Button, Badge, Card, CardHeader, CardContent, PageHeader, Section, EmptyState, Tabs, Table, TableHead, TableRow, TableCell } from '../UI';
import RequirementDetailView from '../RequirementDetailView';
import OfferDetailView from '../OfferDetailView';
import UserDetailView from '../../components/UserDetailView';
import RequirementForm from '../RequirementForm';
import OfferForm from '../OfferForm';
import AdminMarketplaceDashboard from '../marketplace/AdminMarketplaceDashboard';

declare var XLSX: any;

interface AdminDashboardProps {
  currentUser: User;
}

// Navigation options
type AdminView = 'HOME' | 'SOURCING_OPS' | 'MARKETPLACE_OPS' | 'USER_MGMT' | 'REPORTS_ARCHIVE';

// Safe date access helper
const getTimestamp = (date?: Date | string) => {
    if (!date) return 0;
    const d = new Date(date);
    return isNaN(d.getTime()) ? 0 : d.getTime();
};

// Component moved outside to prevent re-creation on render
const StatusSelector = ({ current, type, id, onChange }: { current: string, type: 'REQ' | 'OFFER', id: string, onChange: (type: 'REQ' | 'OFFER', id: string, val: string) => void }) => (
    <select 
        className="text-xs border-slate-200 rounded-lg py-1 pl-2 pr-6 bg-slate-50 text-slate-600 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:bg-white transition-colors"
        value={current}
        onChange={(e) => onChange(type, id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
    >
        {type === 'REQ' 
            ? Object.values(RequirementStatus).map(s => <option key={s} value={s}>{s}</option>)
            : Object.values(OfferStatus).map(s => <option key={s} value={s}>{s}</option>)
        }
    </select>
);

const AdminDashboard = ({ currentUser }: AdminDashboardProps) => {
  const {
    users, requirements, offers, commitments, marketplaceListings, purchaseOffers,
    updateUser, deleteUser,
    createRequirement, updateRequirement,
    createOffer, updateOffer,
    generateNewRequirementId, generateNewOfferId,
    colombianDepartments, colombiaDepartmentsAndMunicipalities
  } = useData();
  const stats = useNotificationStats(currentUser);

  // --- NAVIGATION STATE ---
  const [currentView, setCurrentView] = useState<AdminView>('HOME');
  
  // --- SOURCING OPS STATE ---
  const [opsView, setOpsView] = useState<'REQ' | 'OFFER'>('REQ');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<'REQUIREMENT' | 'OFFER' | null>(null);
  const [selectedUserForAction, setSelectedUserForAction] = useState<string>('');
  const [targetReqForOffer, setTargetReqForOffer] = useState<string>('');
  
  // --- REPORTS & ARCHIVE STATE ---
  const [reportSubTab, setReportSubTab] = useState<'DOWNLOADS' | 'HISTORY'>('DOWNLOADS');

  // --- GENERIC EDIT/VIEW/MODERATION STATE ---
  const [editingItem, setEditingItem] = useState<{type: 'REQ' | 'OFFER' | 'USER', data: any} | null>(null);
  const [viewItem, setViewItem] = useState<{type: 'REQ' | 'OFFER' | 'USER', data: any} | null>(null);
  const [actionPrompt, setActionPrompt] = useState<{type: 'RETURN' | 'REJECT', itemType: 'REQ' | 'OFFER' | 'USER', itemId: string} | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  // --- USER MANAGEMENT FILTER STATE ---
  const [userFilters, setUserFilters] = useState({
      role: 'ALL',
      status: 'ALL', // ACTIVE, INACTIVE, DELETED, PENDING
      department: 'ALL',
      city: 'ALL',
      hasActivity: 'ALL' // YES, NO
  });
  
  // --- REPORTS FILTER STATE ---
  const [reportSearch, setReportSearch] = useState('');

  // --- DERIVED LISTS (SOURCING) ---
  const activeRequirements = useMemo(() => requirements.filter(r => 
      ![RequirementStatus.HIDDEN_BY_ADMIN, RequirementStatus.CANCELLED, RequirementStatus.REJECTED, RequirementStatus.COMPLETED].includes(r.status)
  ).sort((a,b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)), [requirements]);

  const activeOffers = useMemo(() => offers.filter(o => 
      ![OfferStatus.HIDDEN_BY_ADMIN, OfferStatus.REJECTED].includes(o.status)
  ).sort((a,b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)), [offers]);

  const archivedRequirements = useMemo(() => requirements.filter(r => 
      [RequirementStatus.HIDDEN_BY_ADMIN, RequirementStatus.CANCELLED, RequirementStatus.REJECTED, RequirementStatus.COMPLETED].includes(r.status)
  ).sort((a,b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)), [requirements]);

  const archivedOffers = useMemo(() => offers.filter(o => 
      [OfferStatus.HIDDEN_BY_ADMIN, OfferStatus.REJECTED].includes(o.status)
  ).sort((a,b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)), [offers]);

  const buyers = users.filter(u => u.role === Role.BUYER);
  const sellers = users.filter(u => u.role === Role.SELLER);

  // --- DERIVED PENDING QUEUES (NOTIFICATIONS) ---
  const pendingUsers = useMemo(() => users.filter(u => u.needsAdminApproval && !u.isVerified), [users]);
  const pendingDataChanges = useMemo(() => users.filter(u => u.pendingChanges && Object.keys(u.pendingChanges).length > 0), [users]);
  
  // New: Pending Marketplace Listings Notification
  const pendingListings = useMemo(() => marketplaceListings.filter(l => l.status === ListingStatus.PENDING_ADMIN), [marketplaceListings]);
  
  const totalNotifications = pendingUsers.length + pendingDataChanges.length;

  // --- DERIVED LISTS (USER MGMT) ---
  const filteredUsers = useMemo(() => {
      return users.filter(u => {
          if (userFilters.role !== 'ALL' && u.role !== userFilters.role) return false;
          
          if (userFilters.status === 'DELETED') {
              if (u.status !== 'DELETED') return false;
          } else if (userFilters.status !== 'ALL') {
              if (u.status === 'DELETED') return false; 
              if (userFilters.status === 'PENDING' && !u.needsAdminApproval) return false;
              if (userFilters.status === 'ACTIVE' && u.status !== 'ACTIVE') return false;
              if (userFilters.status === 'INACTIVE' && u.status !== 'INACTIVE') return false;
          } else {
              if (u.status === 'DELETED') return false; 
          }

          if (userFilters.department !== 'ALL' && u.department !== userFilters.department) return false;
          if (userFilters.city !== 'ALL' && u.city !== userFilters.city) return false;

          if (userFilters.hasActivity !== 'ALL') {
              const hasReq = requirements.some(r => r.buyerId === u.id);
              const hasOff = offers.some(o => o.sellerId === u.id);
              const isActive = hasReq || hasOff;
              if (userFilters.hasActivity === 'YES' && !isActive) return false;
              if (userFilters.hasActivity === 'NO' && isActive) return false;
          }

          return true;
      }).sort((a, b) => getTimestamp(b.registeredAt) - getTimestamp(a.registeredAt));
  }, [users, userFilters, requirements, offers]);


  // --- ACTIONS (SOURCING) ---
  const handleForceStatusChange = async (type: 'REQ' | 'OFFER', id: string, newStatus: string) => {
      try {
          if (type === 'REQ') {
              await updateRequirement(id, { status: newStatus as RequirementStatus });
          } else {
              await updateOffer(id, { status: newStatus as OfferStatus });
          }
      } catch (err: any) {
          alert('Error al actualizar estado: ' + err.message);
      }
  };

  const handleCreateRequirementOnBehalf = async (data: any) => {
      if (!selectedUserForAction) return;
      try {
          const newReq: Partial<Requirement> = {
              ...data,
              id: generateNewRequirementId(),
              buyerId: selectedUserForAction,
              status: RequirementStatus.PENDING_BUYER_APPROVAL,
              createdAt: new Date(),
              totalVolume: data.cantidadRequerida,
              title: `${data.subcategoria || data.categoriaMaterial} - ${data.cantidadRequerida} ${data.unidad}`,
              description: data.especificacionesCalidad,
              categoryId: data.categoriaMaterial,
              createdByAdmin: true,
          };
          await createRequirement(newReq);
          setIsFormOpen(false);
          alert('Solicitud creada. Pendiente de aprobación del comprador.');
      } catch (err: any) {
          alert('Error al crear solicitud: ' + err.message);
      }
  };

  const handleCreateOfferOnBehalf = async (data: any) => {
      if (!selectedUserForAction || !targetReqForOffer) return;
      try {
          const req = requirements.find(r => r.id === targetReqForOffer);
          const newOffer: Partial<Offer> = {
              ...data,
              id: generateNewOfferId(),
              sellerId: selectedUserForAction,
              requirementId: targetReqForOffer,
              unidadMedida: req?.unidad || 'Ton',
              status: OfferStatus.PENDING_SELLER_APPROVAL,
              createdAt: new Date(),
              createdByAdmin: true,
          };
          await createOffer(newOffer);
          setIsFormOpen(false);
          alert('Oferta creada. Pendiente de aprobación del vendedor.');
      } catch (err: any) {
          alert('Error al crear oferta: ' + err.message);
      }
  };

  // --- ACTIONS (USER MGMT) ---
  const handleUserAction = async (userId: string, action: 'VERIFY' | 'ACTIVATE' | 'DEACTIVATE' | 'DELETE' | 'FORCE_EDIT' | 'RETURN') => {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      try {
          switch (action) {
              case 'VERIFY':
                  await updateUser(userId, { isVerified: true, needsAdminApproval: false, status: 'ACTIVE' });
                  alert('Usuario verificado y activado.');
                  break;
              case 'ACTIVATE':
                  await updateUser(userId, { status: 'ACTIVE' });
                  break;
              case 'DEACTIVATE':
                  await updateUser(userId, { status: 'INACTIVE' });
                  break;
              case 'DELETE':
                  if (window.confirm("¿Seguro que desea eliminar este usuario? Quedará en el archivo de eliminados.")) {
                      await updateUser(userId, { status: 'DELETED' });
                  }
                  break;
              case 'FORCE_EDIT':
                  setEditingItem({ type: 'USER', data: user });
                  break;
              case 'RETURN':
                  setActionPrompt({ type: 'RETURN', itemType: 'USER', itemId: userId });
                  break;
          }
      } catch (err: any) {
          alert('Error al procesar acción: ' + err.message);
      }
  };

  // --- COMMON UPDATE HANDLER ---
  const handleUpdateData = async (type: 'REQ' | 'OFFER' | 'USER', data: any) => {
      try {
          if (type === 'REQ') {
              await updateRequirement(data.id, data);
          } else if (type === 'OFFER') {
              await updateOffer(data.id, data);
          } else if (type === 'USER') {
              await updateUser(data.id, data);
          }

          if (viewItem && viewItem.type === type && viewItem.data.id === data.id) {
              setViewItem({ type, data: { ...viewItem.data, ...data } });
          }

          setEditingItem(null);
          alert('Registro actualizado.');
      } catch (err: any) {
          alert('Error al actualizar: ' + err.message);
      }
  };

  const handleUserUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingItem && editingItem.type === 'USER') {
          handleUpdateData('USER', editingItem.data);
      }
  };
  
  const handleDataChangeDecision = async (userId: string, field: 'name' | 'idNumber' | 'email' | 'certifiesREP', approve: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.pendingChanges) return;
    const newValue = (user.pendingChanges as any)[field];
    if (newValue === undefined) return;

    try {
        const newPendingChanges = { ...user.pendingChanges };
        delete (newPendingChanges as any)[field];

        const updateData: any = { pendingChanges: newPendingChanges };
        if (approve) {
            updateData[field] = newValue;
        }

        await updateUser(userId, updateData);

        // Update local editing state to reflect changes immediately
        if (editingItem && editingItem.type === 'USER' && editingItem.data.id === userId) {
            const updatedPending = { ...editingItem.data.pendingChanges };
            delete updatedPending[field];
            setEditingItem({
                ...editingItem,
                data: {
                    ...editingItem.data,
                    [field]: approve ? newValue : editingItem.data[field],
                    pendingChanges: updatedPending
                }
            });
        }

        alert(approve ? "Cambio aprobado y aplicado." : "Cambio rechazado.");
    } catch (err: any) {
        alert('Error al procesar cambio: ' + err.message);
    }
  };

  const handleProcessAction = async () => {
      if (!actionPrompt) return;
      const { type, itemType, itemId } = actionPrompt;

      if (!feedbackText.trim()) {
          alert("Por favor ingrese un motivo o comentario.");
          return;
      }

      try {
          if (itemType === 'REQ') {
              const newStatus = type === 'RETURN' ? RequirementStatus.PENDING_EDIT : RequirementStatus.REJECTED;
              await updateRequirement(itemId, { status: newStatus, rejectionReason: feedbackText });
          } else if (itemType === 'OFFER') {
              const newStatus = type === 'RETURN' ? OfferStatus.PENDING_EDIT : OfferStatus.REJECTED;
              const existingOffer = offers.find(o => o.id === itemId);
              const newLog: CommunicationLog = { id: `log${Date.now()}`, author: 'ADMIN', authorId: currentUser.id, message: feedbackText, timestamp: new Date(), eventType: type === 'RETURN' ? 'ADMIN_FEEDBACK' : 'ADMIN_REJECTION' };
              await updateOffer(itemId, { status: newStatus, communicationLog: [...(existingOffer?.communicationLog || []), newLog] });
          } else if (itemType === 'USER') {
              await updateUser(itemId, { status: 'PENDING_VERIFICATION', adminNotes: feedbackText, needsAdminApproval: true });
          }

          setActionPrompt(null);
          setFeedbackText('');
          setViewItem(null);
          alert(`Acción procesada.`);
      } catch (err: any) {
          alert('Error al procesar acción: ' + err.message);
      }
  };

  // --- REPORT GENERATION LOGIC ---
  const downloadDatabase = (type: 'USERS' | 'SOURCING' | 'MARKETPLACE') => {
      console.log('Downloading DB:', type);
      const wb = XLSX.utils.book_new();
      const dateStr = new Date().toISOString().split('T')[0];

      if (type === 'USERS') {
          const userData = users.map(u => {
              const { password, pendingChanges, ...rest } = u;
              return {
                  ID: u.id,
                  Nombre: u.name,
                  Email: u.email,
                  Rol: u.role,
                  Estado: u.status,
                  Verificado: u.isVerified ? 'Sí' : 'No',
                  Tipo_Comprador: u.buyerType || 'N/A',
                  Certifica_REP: u.certifiesREP ? 'Sí' : 'No',
                  Fecha_Registro: u.registeredAt ? new Date(u.registeredAt).toISOString().split('T')[0] : 'N/A',
                  Ultima_Actividad: u.lastActivity ? new Date(u.lastActivity).toISOString().split('T')[0] : 'N/A',
                  Departamento: u.department,
                  Ciudad: u.city,
                  Direccion: u.address,
                  ID_Tipo: u.idType,
                  ID_Numero: u.idNumber,
                  Contacto1_Nombre: u.contactPerson1Name,
                  Contacto1_Cargo: u.contactPerson1Position,
                  Telefono1: u.phone1,
                  Admin_Notas: u.adminNotes || ''
              };
          });
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(userData), "Base de Datos Usuarios");
          XLSX.writeFile(wb, `BD_Usuarios_Yubarta_${dateStr}.xlsx`);
      } 
      else if (type === 'SOURCING') {
          const reqData = requirements.map(r => ({
              ID: r.id,
              Estado: r.status,
              Fecha_Creacion: new Date(r.createdAt).toISOString().split('T')[0],
              Comprador_ID: r.buyerId,
              Comprador: users.find(u => u.id === r.buyerId)?.name || 'N/A',
              Titulo: r.title,
              Categoria: r.categoryId,
              Subcategoria: r.subcategoria,
              Volumen_Total: r.totalVolume,
              Unidad: r.unidad,
              Frecuencia: r.frecuencia,
              Ciudad: r.ciudadRecepcion,
              Departamento: r.departamentoRecepcion,
              Vigencia_Inicio: r.vigenciaInicio,
              Vigencia_Fin: r.vigenciaFin,
              Tipo_Pago: r.tipoPago,
              Metodo_Pago: r.metodoPago,
              Precio_Condiciones: r.condicionesPrecio
          }));
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reqData), "Solicitudes (M1)");

          const offData = offers.map(o => {
              const req = requirements.find(r => r.id === o.requirementId);
              return {
                  ID: o.id,
                  Solicitud_ID: o.requirementId,
                  Solicitud_Titulo: req?.title || 'HUÉRFANA',
                  Estado: o.status,
                  Fecha_Creacion: new Date(o.createdAt).toISOString().split('T')[0],
                  Vendedor_ID: o.sellerId,
                  Vendedor: users.find(u => u.id === o.sellerId)?.name || 'N/A',
                  Cantidad: o.cantidadOfertada,
                  Unidad: o.unidadMedida,
                  Frecuencia: o.frecuenciaSuministro,
                  Vigencia_Inicio: o.fechaInicioVigencia,
                  Vigencia_Fin: o.fechaFinVigencia,
                  Acepta_Calidad: o.aceptaEspecificacionesCalidad ? 'Sí' : 'No',
                  Acepta_Logistica: o.aceptaCondicionesLogisticas ? 'Sí' : 'No',
                  Acepta_Precio: o.aceptaFormulaPrecio ? 'Sí' : 'No',
                  Acepta_Pago: o.aceptaCondicionesPago ? 'Sí' : 'No',
                  Penalidad_Aceptada: o.penaltyFeeAccepted ? 'Sí' : 'No'
              };
          });
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offData), "Ofertas (M1)");

          const comData = commitments.filter(c => requirements.some(r => r.id === c.requirementId)).map(c => ({
              ID_Compromiso: c.id,
              ID_Oferta: c.offerId,
              ID_Solicitud: c.requirementId,
              Volumen_Comprometido: c.volume
          }));
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comData), "Compromisos Cerrados (M1)");
          
          XLSX.writeFile(wb, `BD_Suministro_Planificado_${dateStr}.xlsx`);
      }
      else if (type === 'MARKETPLACE') {
          const listData = marketplaceListings.map(l => ({
              ID: l.id,
              Estado: l.status,
              Fecha_Publicacion: new Date(l.createdAt).toISOString().split('T')[0],
              Vendedor_ID: l.sellerId,
              Vendedor: users.find(u => u.id === l.sellerId)?.name || 'N/A',
              Titulo: l.title,
              Categoria: l.category,
              Subcategoria: l.subcategory,
              Cantidad: l.quantity,
              Unidad: l.unit,
              Precio_Unitario: l.pricePerUnit,
              Moneda: l.currency,
              Ubicacion: `${l.locationCity}, ${l.locationDepartment}`,
              Vigencia_Inicio: l.validFrom,
              Vigencia_Fin: l.validUntil,
              Requiere_Certificado: l.requiresCertificate ? 'Sí' : 'No'
          }));
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(listData), "Publicaciones Bodega (M2)");

          const poData = purchaseOffers.map(po => {
              const list = marketplaceListings.find(l => l.id === po.listingId);
              return {
                  ID: po.id,
                  Publicacion_ID: po.listingId,
                  Publicacion_Titulo: list?.title || 'HUÉRFANA',
                  Estado: po.status,
                  Fecha_Oferta: new Date(po.createdAt).toISOString().split('T')[0],
                  Comprador_ID: po.buyerId,
                  Comprador: users.find(u => u.id === po.buyerId)?.name || 'N/A',
                  Cantidad_Solicitada: po.quantityRequested,
                  Precio_Total: po.totalPriceOffered,
                  Metodo_Pago: po.metodoPagoPropuesto,
                  Condiciones_Pago: po.condicionesPagoPropuestas,
                  Fecha_Recogida: po.fechaRecogida,
                  Acepta_Ubicacion: po.aceptaUbicacion ? 'Sí' : 'No',
                  Penalidad_Aceptada: po.penaltyFeeAccepted ? 'Sí' : 'No'
              };
          });
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poData), "Ofertas Compra (M2)");

          const m2ComData = commitments.filter(c => marketplaceListings.some(l => l.id === c.requirementId)).map(c => ({
              ID_Compromiso: c.id,
              ID_Oferta_Compra: c.offerId,
              ID_Publicacion: c.requirementId,
              Volumen_Vendido: c.volume
          }));
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(m2ComData), "Cierres Bodega (M2)");

          XLSX.writeFile(wb, `BD_Bodega_Virtual_${dateStr}.xlsx`);
      }
  };

  // --- RENDER FUNCTIONS (INLINE TO AVOID RE-MOUNT ERRORS) ---
  const renderDashboardHome = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          <div onClick={() => setCurrentView('SOURCING_OPS')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-teal-500 cursor-pointer transition-all group relative">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                  <ClipboardListIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-teal-700">Demanda y Suministro Planificado</h3>
              <p className="text-sm text-slate-500">Gestión de contratos y operaciones recurrentes.</p>
              {stats.sourcing > 0 && (
                  <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-pulse border border-white">
                      {stats.sourcing}
                  </span>
              )}
          </div>

          <div onClick={() => setCurrentView('MARKETPLACE_OPS')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-500 cursor-pointer transition-all group relative">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  <ArchiveBoxIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-700">Bodega Virtual de Reciclados</h3>
              <p className="text-sm text-slate-500">Mercado spot y disponibilidad inmediata.</p>
              {stats.marketplace > 0 && (
                  <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-pulse border border-white">
                      {stats.marketplace}
                  </span>
              )}
          </div>

          <div onClick={() => setCurrentView('USER_MGMT')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-500 cursor-pointer transition-all group">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform relative">
                  <UserCircleIcon className="w-6 h-6" />
                  {stats.adminUsers > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                          {stats.adminUsers}
                      </span>
                  )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-700">Gestión de Usuarios</h3>
              <p className="text-sm text-slate-500">Verificar, editar y administrar perfiles.</p>
          </div>

          <div onClick={() => setCurrentView('REPORTS_ARCHIVE')} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-orange-500 cursor-pointer transition-all group">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                  <DownloadIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-orange-700">Reportes e Históricos</h3>
              <p className="text-sm text-slate-500">Descarga de bases de datos y archivo general.</p>
          </div>
      </div>
  );

  const renderUserManagementView = () => {
      const municipalities = userFilters.department !== 'ALL' ? colombiaDepartmentsAndMunicipalities[userFilters.department] || [] : [];

      return (
      <div className="animate-fade-in flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-64 space-y-6">
              {/* Notifications Widget */}
              {(pendingUsers.length > 0 || pendingDataChanges.length > 0) && (
                  <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm">
                      <h3 className="font-bold text-red-800 mb-3 text-sm uppercase tracking-wide flex items-center">
                          <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                          Atención Requerida
                      </h3>
                      <div className="space-y-2">
                          {pendingUsers.length > 0 && (
                              <button 
                                  onClick={() => setUserFilters({...userFilters, status: 'PENDING'})}
                                  className="w-full text-left bg-red-50 hover:bg-red-100 p-2 rounded-lg text-xs font-bold text-red-700 transition-colors flex justify-between items-center"
                              >
                                  <span>Usuarios Nuevos</span>
                                  <span className="bg-white px-2 py-0.5 rounded text-red-800 border border-red-200">{pendingUsers.length}</span>
                              </button>
                          )}
                          {pendingDataChanges.length > 0 && (
                              <div className="space-y-1">
                                  <p className="text-xs font-semibold text-yellow-800 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                                      {pendingDataChanges.length} Solicitudes de Cambio de Datos
                                  </p>
                                  <div className="pl-2 space-y-1">
                                      {pendingDataChanges.map(u => (
                                          <button 
                                              key={u.id} 
                                              onClick={() => setEditingItem({type: 'USER', data: u})}
                                              className="w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-gray-50 p-1.5 rounded flex items-center gap-2"
                                          >
                                              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                              {u.name}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit">
                  <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">Filtros de Usuarios</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Rol</label>
                          <select className="w-full border p-2 rounded text-sm" value={userFilters.role} onChange={e => setUserFilters({...userFilters, role: e.target.value})}>
                              <option value="ALL">Todos</option>
                              <option value={Role.BUYER}>Comprador</option>
                              <option value={Role.SELLER}>Vendedor</option>
                              <option value={Role.ADMIN}>Administrador</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                          <select className="w-full border p-2 rounded text-sm" value={userFilters.status} onChange={e => setUserFilters({...userFilters, status: e.target.value})}>
                              <option value="ALL">Activos e Inactivos</option>
                              <option value="ACTIVE">Activo</option>
                              <option value="INACTIVE">Inactivo</option>
                              <option value="PENDING">Pendiente Verif.</option>
                              <option value="DELETED">Eliminados (Papelera)</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Departamento</label>
                          <select 
                            className="w-full border p-2 rounded text-sm" 
                            value={userFilters.department} 
                            onChange={e => setUserFilters({...userFilters, department: e.target.value, city: 'ALL'})}
                          >
                              <option value="ALL">Todos</option>
                              {colombianDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Ciudad / Municipio</label>
                          <select 
                            className="w-full border p-2 rounded text-sm disabled:bg-slate-50 disabled:text-slate-400" 
                            value={userFilters.city} 
                            onChange={e => setUserFilters({...userFilters, city: e.target.value})}
                            disabled={userFilters.department === 'ALL'}
                          >
                              <option value="ALL">Todas</option>
                              {municipalities.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                      </div>
                  </div>
              </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Resultados ({filteredUsers.length})</h3>
                  <div className="text-xs text-slate-500">Orden: Registro más reciente</div>
              </div>
              <Table className="border-none shadow-none rounded-none">
                  <TableHead>
                      <TableCell isHeader>Usuario</TableCell>
                      <TableCell isHeader>Rol</TableCell>
                      <TableCell isHeader>Estado</TableCell>
                      <TableCell isHeader>Ubicación</TableCell>
                      <TableCell isHeader align="right">Acciones</TableCell>
                  </TableHead>
                  <tbody>
                      {filteredUsers.map(u => (
                          <TableRow key={u.id}>
                              <TableCell>
                                  <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${u.role === Role.ADMIN ? 'bg-slate-800' : u.role === Role.BUYER ? 'bg-indigo-500' : 'bg-teal-500'} relative`}>
                                          {u.name.charAt(0)}
                                          {u.pendingChanges && Object.keys(u.pendingChanges).length > 0 && (
                                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-white rounded-full"></span>
                                          )}
                                      </div>
                                      <div>
                                          <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                                          <div className="text-xs text-slate-500">{u.email}</div>
                                      </div>
                                  </div>
                              </TableCell>
                              <TableCell><Badge variant="gray">{u.role}</Badge></TableCell>
                              <TableCell>
                                  {u.status === 'ACTIVE' && <Badge variant="green">Activo</Badge>}
                                  {u.status === 'INACTIVE' && <Badge variant="yellow">Inactivo</Badge>}
                                  {u.status === 'DELETED' && <Badge variant="red">Eliminado</Badge>}
                                  {u.status === 'PENDING_VERIFICATION' && <Badge variant="orange">Pendiente</Badge>}
                              </TableCell>
                              <TableCell>
                                  <span className="text-xs text-slate-600">{u.city}, {u.department}</span>
                              </TableCell>
                              <TableCell align="right">
                                  <div className="flex justify-end gap-2">
                                      <button onClick={() => setViewItem({type: 'USER', data: u})} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Ver Perfil"><EyeIcon className="w-4 h-4"/></button>
                                      
                                      <div className="relative group">
                                          <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded relative">
                                              <PencilIcon className="w-4 h-4"/>
                                              {u.pendingChanges && Object.keys(u.pendingChanges).length > 0 && (
                                                  <span className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                              )}
                                          </button>
                                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-lg z-20 hidden group-hover:block p-1">
                                              <button onClick={() => handleUserAction(u.id, 'VERIFY')} className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 text-green-700 rounded font-medium">Verificar</button>
                                              <button onClick={() => handleUserAction(u.id, 'RETURN')} className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 text-orange-700 rounded font-medium">Solicitar Corrección</button>
                                              <button onClick={() => handleUserAction(u.id, 'FORCE_EDIT')} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-blue-700 rounded font-medium relative flex justify-between items-center">
                                                  Editar Datos
                                                  {u.pendingChanges && Object.keys(u.pendingChanges).length > 0 && (
                                                      <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 rounded-full font-bold">!</span>
                                                  )}
                                              </button>
                                              {u.status === 'ACTIVE' ? (
                                                  <button onClick={() => handleUserAction(u.id, 'DEACTIVATE')} className="w-full text-left px-3 py-2 text-xs hover:bg-yellow-50 text-yellow-700 rounded font-medium">Desactivar</button>
                                              ) : (
                                                  <button onClick={() => handleUserAction(u.id, 'ACTIVATE')} className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 text-green-700 rounded font-medium">Activar</button>
                                              )}
                                              <div className="h-px bg-slate-100 my-1"></div>
                                              <button onClick={() => handleUserAction(u.id, 'DELETE')} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-700 rounded font-medium">Eliminar</button>
                                          </div>
                                      </div>
                                  </div>
                              </TableCell>
                          </TableRow>
                      ))}
                  </tbody>
              </Table>
          </div>
      </div>
      );
  };

  const renderReportsAndArchiveView = () => {
      const items = [
          { 
              id: 'USERS', 
              label: 'Base de Datos de Usuarios', 
              description: 'Reporte completo de usuarios registrados.',
              icon: UserCircleIcon,
              color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
          },
          { 
              id: 'SOURCING', 
              label: 'Demanda y Suministro Planificado (Módulo 1)', 
              description: 'Consolidado de Solicitudes, Ofertas y Compromisos.',
              icon: TruckIcon,
              color: 'text-teal-600 bg-teal-50 border-teal-200'
          },
          { 
              id: 'MARKETPLACE', 
              label: 'Bodega Virtual de Reciclados (Módulo 2)', 
              description: 'Base de datos de Publicaciones, Ofertas de Compra y Cierres.',
              icon: ShoppingCartIcon,
              color: 'text-blue-600 bg-blue-50 border-blue-200'
          }
      ];

      return (
          <div className="animate-fade-in space-y-8">
              <Tabs 
                activeTab={reportSubTab} 
                onChange={(id) => setReportSubTab(id)}
                tabs={[
                    { id: 'DOWNLOADS', label: 'Descarga de Bases de Datos', icon: DatabaseIcon },
                    { id: 'HISTORY', label: 'Historial Suministro (M1)', icon: ArchiveBoxIcon },
                ]} 
              />

              {reportSubTab === 'DOWNLOADS' && (
                  <div className="max-w-5xl mx-auto">
                      <div className="mb-8 text-center">
                          <h2 className="text-2xl font-bold text-[#0A0A0A]">Descarga de Bases de Datos Maestras</h2>
                          <p className="text-[#7A7A7A] mt-2">Acceso exclusivo a la información histórica y activa del sistema.</p>
                      </div>
                      <div className="space-y-4">
                          {items.map(item => (
                              <div key={item.id} className="bg-white p-6 rounded-2xl border border-[#D6D6D6] shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6">
                                  <div className={`p-4 rounded-xl border ${item.color} flex-shrink-0`}>
                                      <item.icon className="w-8 h-8" />
                                  </div>
                                  <div className="flex-grow text-center md:text-left">
                                      <h3 className="text-lg font-bold text-[#0A0A0A]">{item.label}</h3>
                                      <p className="text-sm text-[#7A7A7A] mt-1">{item.description}</p>
                                  </div>
                                  <button 
                                      onClick={() => downloadDatabase(item.id as any)} 
                                      className="px-6 py-3 bg-[#007A8A] hover:bg-[#005B6A] text-white font-bold rounded-xl shadow-md transition-all flex items-center whitespace-nowrap active:scale-95"
                                  >
                                      <DownloadIcon className="w-5 h-5 mr-2" />
                                      Descargar Excel
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {reportSubTab === 'HISTORY' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wide">Solicitudes Cerradas (M1)</h4>
                            <Table>
                                <tbody>
                                {archivedRequirements.map(req => (
                                    <TableRow key={req.id}>
                                        <TableCell>
                                            <p className="font-bold text-sm text-slate-800">{req.title}</p>
                                            <Badge variant="gray">{req.status}</Badge>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button variant="outline" size="sm" onClick={() => handleForceStatusChange('REQ', req.id, RequirementStatus.ACTIVE)}>Reactivar</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                </tbody>
                            </Table>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wide">Ofertas Cerradas (M1)</h4>
                            <Table>
                                <tbody>
                                {archivedOffers.map(offer => (
                                    <TableRow key={offer.id}>
                                        <TableCell>
                                            <p className="font-bold text-sm text-slate-800">{offer.cantidadOfertada} {offer.unidadMedida}</p>
                                            <Badge variant="gray">{offer.status}</Badge>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button variant="outline" size="sm" onClick={() => handleForceStatusChange('OFFER', offer.id, OfferStatus.PENDING_BUYER)}>Reactivar</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                </div>
              )}
          </div>
      );
  };

  return (
    <div className="pb-12 font-sans min-h-screen">
        {currentView !== 'HOME' && (
            <div className="mb-6 flex items-center">
                <button onClick={() => setCurrentView('HOME')} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                    <span className="mr-2">&larr;</span> Volver al Panel Principal
                </button>
            </div>
        )}

        {currentView === 'HOME' && renderDashboardHome()}
        
        {currentView === 'USER_MGMT' && (
            <Section title="Gestión de Usuarios">
                {renderUserManagementView()}
            </Section>
        )}

        {currentView === 'REPORTS_ARCHIVE' && (
            <Section>
                {renderReportsAndArchiveView()}
            </Section>
        )}

        {currentView === 'MARKETPLACE_OPS' && (
            <AdminMarketplaceDashboard currentUser={currentUser} />
        )}

        {currentView === 'SOURCING_OPS' && (
            <div className="space-y-6 animate-fade-in">
                
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    {/* Sub-Tabs Switch */}
                    <div className="bg-white p-1 rounded-lg border border-[#D6D6D6] inline-flex shadow-sm">
                        <button
                            onClick={() => setOpsView('REQ')}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all gap-2 ${opsView === 'REQ' ? 'bg-[#003F4A] text-white shadow-sm' : 'text-[#7A7A7A] hover:bg-[#F5F7F8]'}`}
                        >
                            <DatabaseIcon className="w-4 h-4" />
                            Solicitudes Activas
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ml-1 ${opsView === 'REQ' ? 'bg-[#005B6A] text-[#D7EEF0]' : 'bg-[#F5F7F8] text-[#7A7A7A] border border-[#D6D6D6]'}`}>
                                {activeRequirements.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setOpsView('OFFER')}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all gap-2 ${opsView === 'OFFER' ? 'bg-[#003F4A] text-white shadow-sm' : 'text-[#7A7A7A] hover:bg-[#F5F7F8]'}`}
                        >
                            <TruckIcon className="w-4 h-4" />
                            Ofertas Activas
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ml-1 ${opsView === 'OFFER' ? 'bg-[#005B6A] text-[#D7EEF0]' : 'bg-[#F5F7F8] text-[#7A7A7A] border border-[#D6D6D6]'}`}>
                                {activeOffers.length}
                            </span>
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => { setFormType('REQUIREMENT'); setSelectedUserForAction(''); setIsFormOpen(true); }} icon={PlusIcon}>Crear Solicitud (x Buyer)</Button>
                        <Button size="sm" variant="secondary" onClick={() => { setFormType('OFFER'); setSelectedUserForAction(''); setIsFormOpen(true); }} icon={PlusIcon}>Crear Oferta (x Seller)</Button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-[#D6D6D6] shadow-sm overflow-hidden min-h-[400px]">
                    {opsView === 'REQ' ? (
                        <>
                            <div className="px-6 py-4 border-b border-[#F5F7F8] bg-[#FAFBFC]">
                                <h3 className="font-bold text-[#0A0A0A]">Gestión de Solicitudes (M1)</h3>
                                <p className="text-xs text-[#7A7A7A]">Listado completo de requerimientos activos en plataforma.</p>
                            </div>
                            {activeRequirements.length === 0 ? (
                                <EmptyState title="Sin solicitudes" description="No hay operaciones activas." icon={DatabaseIcon} />
                            ) : (
                                <Table className="border-none rounded-none shadow-none">
                                    <TableHead>
                                        <TableCell isHeader>ID</TableCell>
                                        <TableCell isHeader>Descripción</TableCell>
                                        <TableCell isHeader>Comprador</TableCell>
                                        <TableCell isHeader>Estado (Forzar)</TableCell>
                                        <TableCell isHeader align="right">Acciones</TableCell>
                                    </TableHead>
                                    <tbody>
                                        {activeRequirements.map(req => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-mono text-xs text-[#7A7A7A]">#{req.id.slice(-6)}</TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-slate-900">{req.title}</div>
                                                    <div className="text-xs text-slate-500">{req.totalVolume} {req.unidad}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{users.find(u => u.id === req.buyerId)?.name}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <StatusSelector current={req.status} type="REQ" id={req.id} onChange={handleForceStatusChange} />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setViewItem({type: 'REQ', data: req})} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition-colors font-bold flex items-center text-xs border border-teal-200" title="Ver Detalle Completo">
                                                            <EyeIcon className="w-3 h-3 mr-1"/> Ver
                                                        </button>
                                                        <button onClick={() => setEditingItem({type: 'REQ', data: req})} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><PencilIcon className="w-4 h-4"/></button>
                                                        <button onClick={() => handleForceStatusChange('REQ', req.id, RequirementStatus.HIDDEN_BY_ADMIN)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Archivar"><TrashIcon className="w-4 h-4"/></button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="px-6 py-4 border-b border-[#F5F7F8] bg-[#FAFBFC]">
                                <h3 className="font-bold text-[#0A0A0A]">Gestión de Ofertas (M1)</h3>
                                <p className="text-xs text-[#7A7A7A]">Control de ofertas de suministro activas.</p>
                            </div>
                            {activeOffers.length === 0 ? (
                                <EmptyState title="Sin ofertas" description="No hay ofertas activas." icon={TruckIcon} />
                            ) : (
                                <Table className="border-none rounded-none shadow-none">
                                    <TableHead>
                                        <TableCell isHeader>ID</TableCell>
                                        <TableCell isHeader>Cantidad</TableCell>
                                        <TableCell isHeader>Vendedor</TableCell>
                                        <TableCell isHeader>Para (Solicitud)</TableCell>
                                        <TableCell isHeader>Estado (Forzar)</TableCell>
                                        <TableCell isHeader align="right">Acciones</TableCell>
                                    </TableHead>
                                    <tbody>
                                        {activeOffers.map(offer => {
                                            const req = requirements.find(r => r.id === offer.requirementId);
                                            return (
                                                <TableRow key={offer.id}>
                                                    <TableCell className="font-mono text-xs text-[#7A7A7A]">#{offer.id.slice(-6)}</TableCell>
                                                    <TableCell>
                                                        <div className="font-bold text-slate-900">{offer.cantidadOfertada} {offer.unidadMedida}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">{users.find(u => u.id === offer.sellerId)?.name}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-slate-500 truncate max-w-[150px] block" title={req?.title}>{req?.title}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusSelector current={offer.status} type="OFFER" id={offer.id} onChange={handleForceStatusChange} />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setViewItem({type: 'OFFER', data: offer})} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition-colors font-bold flex items-center text-xs border border-teal-200" title="Ver Detalle Completo">
                                                                <EyeIcon className="w-3 h-3 mr-1"/> Ver
                                                            </button>
                                                            <button onClick={() => setEditingItem({type: 'OFFER', data: offer})} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><PencilIcon className="w-4 h-4"/></button>
                                                            <button onClick={() => handleForceStatusChange('OFFER', offer.id, OfferStatus.HIDDEN_BY_ADMIN)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Archivar"><TrashIcon className="w-4 h-4"/></button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}
        
        {/* VIEW DETAIL MODAL */}
        {viewItem && (
            <div className="fixed inset-0 bg-[#003F4A]/70 backdrop-blur-sm z-50 flex justify-center items-start pt-6 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-[#D6D6D6] overflow-hidden">
                    
                    {/* Header */}
                    <div className="px-8 py-5 border-b border-[#F5F7F8] flex justify-between items-center bg-[#FAFBFC]">
                        <div>
                            <div className="flex items-center gap-2">
                                <Badge variant="blue">{viewItem.type === 'REQ' ? 'Solicitud' : viewItem.type === 'OFFER' ? 'Oferta' : 'Usuario'}</Badge>
                                <span className="text-xs font-mono text-[#7A7A7A]">#{viewItem.data.id}</span>
                            </div>
                            <h2 className="text-xl font-bold text-[#0A0A0A] mt-1">Vista de Detalle Completa</h2>
                        </div>
                        <button onClick={() => setViewItem(null)} className="p-2 rounded-full hover:bg-[#F5F7F8] text-[#7A7A7A] transition-colors text-2xl leading-none">&times;</button>
                    </div>

                    {/* Content */}
                    <div className="p-8 overflow-y-auto bg-white flex-1">
                        {viewItem.type === 'REQ' ? (
                            <RequirementDetailView 
                                requirement={viewItem.data} 
                                buyer={users.find(u => u.id === viewItem.data.buyerId)}
                                showBuyerContactInfo={true}
                                showManagementFee={true}
                                currentUser={currentUser}
                            />
                        ) : viewItem.type === 'OFFER' ? (
                            <OfferDetailView 
                                offer={viewItem.data}
                                requirement={requirements.find(r => r.id === viewItem.data.requirementId)!}
                                seller={users.find(u => u.id === viewItem.data.sellerId)}
                                showSellerInfo={true}
                                showPenaltyFee={true}
                                currentUser={currentUser}
                            />
                        ) : (
                            <UserDetailView user={viewItem.data} />
                        )}
                    </div>

                    {/* Admin Actions Footer */}
                    <div className="p-6 bg-[#FAFBFC] border-t border-[#F5F7F8] flex flex-wrap justify-end gap-3 shadow-[0_-4px_6px_rgba(0,0,0,0.02)] relative z-10">
                        <div className="mr-auto flex items-center">
                            <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wide mr-2">Acciones de Administrador:</span>
                        </div>

                        <Button 
                            variant="white" 
                            onClick={() => setEditingItem({type: viewItem.type, data: viewItem.data})}
                            icon={PencilIcon}
                        >
                            Editar Contenido
                        </Button>

                        {viewItem.type !== 'USER' && (
                            <>
                                <div className="w-px h-8 bg-[#D6D6D6] mx-2"></div>
                                <Button 
                                    variant="danger" 
                                    onClick={() => setActionPrompt({type: 'REJECT', itemType: viewItem.type, itemId: viewItem.data.id})}
                                >
                                    Rechazar
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                    onClick={() => setActionPrompt({type: 'RETURN', itemType: viewItem.type, itemId: viewItem.data.id})}
                                >
                                    Devolver (Corregir)
                                </Button>
                                <Button 
                                    variant="success" 
                                    onClick={() => {
                                        handleForceStatusChange(viewItem.type as 'REQ'|'OFFER', viewItem.data.id, viewItem.type === 'REQ' ? RequirementStatus.ACTIVE : OfferStatus.PENDING_BUYER);
                                        setViewItem(null);
                                        alert('Elemento aprobado y activado.');
                                    }}
                                    icon={CheckCircleIcon}
                                >
                                    Aprobar / Verificar
                                </Button>
                            </>
                        )}
                        {viewItem.type === 'USER' && (
                             <Button 
                                variant="secondary" 
                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                onClick={() => setActionPrompt({type: 'RETURN', itemType: 'USER', itemId: viewItem.data.id})}
                            >
                                Solicitar Corrección
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* FEEDBACK PROMPT MODAL */}
        {actionPrompt && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                    <h3 className="text-lg font-bold text-[#0A0A0A] mb-2">
                        {actionPrompt.type === 'RETURN' ? 'Solicitud de Corrección' : 'Rechazar Elemento'}
                    </h3>
                    <p className="text-sm text-[#7A7A7A] mb-4">
                        {actionPrompt.type === 'RETURN' 
                            ? 'El usuario recibirá este comentario para realizar los ajustes necesarios.' 
                            : 'El elemento se marcará como rechazado y se archivará.'}
                    </p>
                    <textarea 
                        className="w-full border border-[#D6D6D6] rounded-lg p-3 text-sm focus:ring-[#007A8A] focus:border-[#007A8A] min-h-[100px]"
                        placeholder={actionPrompt.type === 'RETURN' ? "Indique qué debe corregir..." : "Indique el motivo del rechazo..."}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" size="sm" onClick={() => setActionPrompt(null)}>Cancelar</Button>
                        <Button variant="primary" size="sm" onClick={handleProcessAction}>Confirmar Acción</Button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: Create on Behalf */}
        {isFormOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-start pt-10">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8 max-h-[90vh] overflow-y-auto animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-slate-900">
                            {formType === 'REQUIREMENT' ? 'Crear Solicitud (Como Comprador)' : 'Crear Oferta (Como Vendedor)'}
                        </h3>
                        <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                    </div>

                    <div className="mb-6 bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <p className="text-sm text-amber-800 font-bold">⚠️ Modo Súper Admin: Esta acción creará un registro en nombre del usuario seleccionado. Requiere aprobación posterior del usuario.</p>
                    </div>

                    {formType === 'REQUIREMENT' ? (
                        !selectedUserForAction ? (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Seleccionar Comprador</label>
                                <select className="w-full p-3 border border-slate-300 rounded-xl" onChange={(e) => setSelectedUserForAction(e.target.value)}>
                                    <option value="">Seleccione...</option>
                                    {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <RequirementForm onSubmit={handleCreateRequirementOnBehalf} onCancel={() => setIsFormOpen(false)} />
                        )
                    ) : (
                        (!selectedUserForAction || !targetReqForOffer) ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">1. Seleccionar Vendedor</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-xl"
                                        value={selectedUserForAction}
                                        onChange={(e) => setSelectedUserForAction(e.target.value)}
                                    >
                                        <option value="">Seleccione...</option>
                                        {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">2. Seleccionar Solicitud Objetivo</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-xl"
                                        value={targetReqForOffer}
                                        onChange={(e) => setTargetReqForOffer(e.target.value)}
                                    >
                                        <option value="">Seleccione...</option>
                                        {activeRequirements.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                                    </select>
                                </div>
                                {selectedUserForAction && targetReqForOffer && (
                                    <p className="text-sm text-green-600 font-medium">✓ Selección completa. El formulario aparecerá automáticamente.</p>
                                )}
                                {(!selectedUserForAction || !targetReqForOffer) && (
                                    <p className="text-sm text-slate-500">Seleccione vendedor y solicitud para continuar.</p>
                                )}
                            </div>
                        ) : (
                            <OfferForm
                                requirement={requirements.find(r => r.id === targetReqForOffer)!}
                                onSubmit={handleCreateOfferOnBehalf}
                                onCancel={() => setIsFormOpen(false)}
                            />
                        )
                    )}
                </div>
            </div>
        )}

        {/* MODAL: Edit Data */}
        {editingItem && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-start pt-10">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8 max-h-[90vh] overflow-y-auto animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                        <h3 className="text-xl font-bold text-red-600">Edición Forzada (Súper Admin)</h3>
                        <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                    </div>
                    
                    {editingItem.type === 'REQ' && (
                        <RequirementForm initialData={editingItem.data} onSubmit={(d) => handleUpdateData('REQ', {...d, id: editingItem.data.id})} onCancel={() => setEditingItem(null)} />
                    )}
                    {editingItem.type === 'OFFER' && (
                        <OfferForm requirement={requirements.find(r => r.id === editingItem.data.requirementId)!} initialData={editingItem.data} onSubmit={(d) => handleUpdateData('OFFER', {...d, id: editingItem.data.id})} onCancel={() => setEditingItem(null)} />
                    )}
                    {editingItem.type === 'USER' && (
                        <div>
                            {/* Alert if pending changes exist */}
                            {editingItem.data.pendingChanges && Object.keys(editingItem.data.pendingChanges).length > 0 && (
                                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-sm font-bold text-yellow-800 uppercase mb-2">Solicitudes de Cambio Pendientes</h4>
                                            <ul className="list-disc list-inside text-sm text-yellow-700 mb-2">
                                                {Object.entries(editingItem.data.pendingChanges).map(([key, val]) => (
                                                    <li key={key}>
                                                        <strong>{key}:</strong> {String(val)}
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="text-xs text-yellow-600">El usuario ha solicitado habilitar/cambiar estos campos. Puede aprobarlos aquí directamente.</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        {Object.keys(editingItem.data.pendingChanges).map(field => (
                                            <div key={field} className="flex items-center gap-2 bg-white p-1 rounded border border-yellow-200">
                                                <span className="text-xs font-bold px-2">{field}</span>
                                                <button onClick={() => handleDataChangeDecision(editingItem.data.id, field as any, true)} className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Aprobar</button>
                                                <button onClick={() => handleDataChangeDecision(editingItem.data.id, field as any, false)} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Rechazar</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleUserUpdate} className="space-y-8">
                                {/* Common styles */}
                                {(() => {
                                    const commonInputClass = "mt-1 block w-full px-4 py-3 border border-[#D6D6D6] rounded-lg shadow-sm placeholder-[#7A7A7A] focus:outline-none focus:ring-2 focus:ring-[#007A8A] focus:border-[#007A8A] transition-all sm:text-sm text-[#0A0A0A] bg-white";
                                    const commonLabelClass = "block text-sm font-medium text-[#3D3D3D] mb-1";
                                    
                                    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                                        const { name, value } = e.target;
                                        const newData = { ...editingItem.data, [name]: value };
                                        
                                        // Reset city if department changes
                                        if (name === 'department') {
                                            newData.city = '';
                                        }
                                        
                                        setEditingItem({ ...editingItem, data: newData });
                                    };
                                    
                                    // Handle logic for "Registration Type" simulation
                                    const handleRegTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                                        const val = e.target.value;
                                        let updates: any = {};
                                        if (val === 'SELLER') {
                                            updates = { role: Role.SELLER, buyerType: undefined, certifiesREP: undefined };
                                        } else if (val === 'BUYER_TRANSFORMER') {
                                            updates = { role: Role.BUYER, buyerType: 'Transformador', certifiesREP: false };
                                        } else if (val === 'BUYER_AGGREGATOR') {
                                            updates = { role: Role.BUYER, buyerType: 'Gran Acopiador', certifiesREP: undefined };
                                        }
                                        setEditingItem({ ...editingItem, data: { ...editingItem.data, ...updates } });
                                    };

                                    const currentRegType = editingItem.data.role === Role.SELLER 
                                        ? 'SELLER' 
                                        : (editingItem.data.buyerType === 'Transformador' ? 'BUYER_TRANSFORMER' : 'BUYER_AGGREGATOR');

                                    const municipalities = editingItem.data.department ? colombiaDepartmentsAndMunicipalities[editingItem.data.department] || [] : [];

                                    return (
                                        <>
                                            {/* Section 0: Registration Type (Role Logic) */}
                                            <div className="bg-[#F5F7F8] p-4 rounded-lg border border-[#D6D6D6] mb-6">
                                                <label className="block text-sm font-bold text-[#3D3D3D] mb-2">Tipo de Cuenta (Simulando Registro)</label>
                                                <select value={currentRegType} onChange={handleRegTypeChange} className={commonInputClass}>
                                                    <option value="SELLER">Vendedor (Proveedor de Material)</option>
                                                    <option value="BUYER_TRANSFORMER">Comprador (Transformador)</option>
                                                    <option value="BUYER_AGGREGATOR">Comprador (Gran Acopiador)</option>
                                                </select>
                                            </div>

                                            {/* Section 1: Basic Info */}
                                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                                <div className="sm:col-span-2">
                                                    <label className={commonLabelClass}>Razón Social / Nombre</label>
                                                    <input type="text" name="name" value={editingItem.data.name} onChange={handleFieldChange} className={commonInputClass} required />
                                                </div>

                                                {currentRegType === 'BUYER_TRANSFORMER' && (
                                                     <div className="sm:col-span-2 bg-[#E6F4EC] p-4 rounded-lg border border-[#2E8B57]/20">
                                                        <label className="block text-sm font-medium text-[#2E8B57] mb-1">¿Certifica REP?</label>
                                                        <select 
                                                            name="certifiesREP" 
                                                            value={editingItem.data.certifiesREP ? 'yes' : 'no'} 
                                                            onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, certifiesREP: e.target.value === 'yes'}})}
                                                            className="block w-full px-3 py-2 border border-[#2E8B57]/30 rounded-md shadow-sm focus:ring-[#2E8B57] focus:border-[#2E8B57] sm:text-sm text-[#0A0A0A] bg-white"
                                                        >
                                                            <option value="no">No</option>
                                                            <option value="yes">Sí, certifica REP</option>
                                                        </select>
                                                    </div>
                                                )}

                                                <div className="sm:col-span-2">
                                                    <label className={commonLabelClass}>Correo Electrónico</label>
                                                    <input type="email" name="email" value={editingItem.data.email} onChange={handleFieldChange} className={commonInputClass} required />
                                                </div>

                                                {/* Identification */}
                                                <div className="sm:col-span-2 pt-4 border-t border-[#D6D6D6]">
                                                    <h4 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wide mb-4">Datos Legales</h4>
                                                </div>
                                                <div>
                                                    <label className={commonLabelClass}>Tipo ID</label>
                                                    <select name="idType" value={editingItem.data.idType || 'NIT'} onChange={handleFieldChange} className={commonInputClass}>
                                                        <option value="NIT">NIT</option>
                                                        <option value="CC">Cédula</option>
                                                        <option value="CE">Cédula Ext.</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className={commonLabelClass}>Número ID</label>
                                                    <input type="text" name="idNumber" value={editingItem.data.idNumber || ''} onChange={handleFieldChange} className={commonInputClass} required />
                                                </div>
                                                <div>
                                                    <label className={commonLabelClass}>Teléfono</label>
                                                    <input type="text" name="phone1" value={editingItem.data.phone1 || ''} onChange={handleFieldChange} className={commonInputClass} required />
                                                </div>
                                                <div>
                                                    <label className={commonLabelClass}>Ciudad</label>
                                                    <select name="department" value={editingItem.data.department || ''} onChange={handleFieldChange} className={commonInputClass}>
                                                        <option value="">Departamento...</option>
                                                        {colombianDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                                    </select>
                                                </div>
                                                
                                                {editingItem.data.department && (
                                                    <div className="sm:col-span-2">
                                                        <label className={commonLabelClass}>Municipio</label>
                                                        <select name="city" value={editingItem.data.city || ''} onChange={handleFieldChange} className={commonInputClass}>
                                                             <option value="">Seleccione municipio...</option>
                                                             {municipalities.map(mun => <option key={mun} value={mun}>{mun}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                                
                                                <div className="sm:col-span-2">
                                                    <label className={commonLabelClass}>Dirección</label>
                                                    <input type="text" name="address" value={editingItem.data.address || ''} onChange={handleFieldChange} className={commonInputClass} required />
                                                </div>

                                                {/* Contacts */}
                                                <div className="sm:col-span-2 pt-4 border-t border-[#D6D6D6]">
                                                    <h4 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wide mb-4">Contacto Principal</h4>
                                                </div>
                                                <div>
                                                    <label className={commonLabelClass}>Nombre</label>
                                                    <input type="text" name="contactPerson1Name" value={editingItem.data.contactPerson1Name || ''} onChange={handleFieldChange} className={commonInputClass} required />
                                                </div>
                                                <div>
                                                    <label className={commonLabelClass}>Cargo</label>
                                                    <input type="text" name="contactPerson1Position" value={editingItem.data.contactPerson1Position || ''} onChange={handleFieldChange} className={commonInputClass} required />
                                                </div>
                                                
                                                {/* Optional Contact 2 */}
                                                <div className="sm:col-span-2 pt-4 border-t border-[#D6D6D6]">
                                                    <h4 className="text-sm font-bold text-[#7A7A7A] uppercase tracking-wide mb-4">Contacto Secundario (Opcional)</h4>
                                                </div>
                                                <div>
                                                    <label className={commonLabelClass}>Nombre</label>
                                                    <input type="text" name="contactPerson2Name" value={editingItem.data.contactPerson2Name || ''} onChange={handleFieldChange} className={commonInputClass} />
                                                </div>
                                                <div>
                                                    <label className={commonLabelClass}>Cargo</label>
                                                    <input type="text" name="contactPerson2Position" value={editingItem.data.contactPerson2Position || ''} onChange={handleFieldChange} className={commonInputClass} />
                                                </div>
                                                <div>
                                                    <label className={commonLabelClass}>Teléfono 2</label>
                                                    <input type="text" name="phone2" value={editingItem.data.phone2 || ''} onChange={handleFieldChange} className={commonInputClass} />
                                                </div>
                                            </div>

                                            {/* Admin Controls Area */}
                                            <div className="mt-8 bg-gray-100 p-6 rounded-xl border border-gray-300">
                                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Zona de Administración</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className={commonLabelClass}>Estado de Cuenta</label>
                                                        <select name="status" value={editingItem.data.status} onChange={handleFieldChange} className={commonInputClass}>
                                                            <option value="ACTIVE">Activo</option>
                                                            <option value="INACTIVE">Inactivo</option>
                                                            <option value="PENDING_VERIFICATION">Pendiente Verificación</option>
                                                            <option value="DELETED">Eliminado (Papelera)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className={commonLabelClass}>Verificación de Identidad</label>
                                                        <select 
                                                            name="isVerified" 
                                                            value={editingItem.data.isVerified ? 'true' : 'false'} 
                                                            onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, isVerified: e.target.value === 'true'}})} 
                                                            className={commonInputClass}
                                                        >
                                                            <option value="true">Verificado</option>
                                                            <option value="false">No Verificado</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}

                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-4">
                                    <Button variant="secondary" onClick={() => setEditingItem(null)}>Cancelar</Button>
                                    <Button type="submit">Guardar Cambios de Perfil</Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminDashboard;
