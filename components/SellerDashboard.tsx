import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useData } from '../hooks/useData';
import { User, Requirement, RequirementStatus, Offer, OfferStatus, Category, FileAttachment, Role, CommunicationLog } from '../types';
import { CheckCircleIcon, XCircleIcon, HourglassIcon, PencilIcon, UserCircleIcon, SpinnerIcon, DownloadIcon } from './icons';
import RequirementDetailView from './RequirementDetailView';
import OfferDetailView from './OfferDetailView';
import { generateOfferPdf } from './PdfGenerator';
import OfferForm from './OfferForm';

interface SellerDashboardProps {
  currentUser: User;
}

const parseDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const addDays = (date: Date, days: number): Date => {
  const newDate = new Date(date.valueOf());
  newDate.setUTCDate(newDate.getUTCDate() + days);
  return newDate;
};

const OfferDetailModal = ({ offer, onClose }: {
    offer: Offer | null;
    onClose: () => void;
}) => {
    const { requirements, users } = useData();
    if (!offer) return null;

    const requirement = requirements.find(r => r.id === offer.requirementId);
    const seller = users.find(u => u.id === offer.sellerId);

    if (!requirement) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex justify-center items-start pt-10">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-100">
                <div className="p-8 overflow-y-auto">
                    <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                        <h2 className="text-2xl font-bold text-gray-900">Detalle de Mi Oferta</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
                            <span className="text-2xl leading-none">&times;</span>
                        </button>
                    </div>
                    <OfferDetailView 
                        offer={offer}
                        requirement={requirement}
                        seller={seller}
                        showSellerInfo={true}
                        showPenaltyFee={true}
                    />
                </div>
            </div>
        </div>
    );
};

const OfferStatusBadge = ({ status }: { status: OfferStatus }) => {
    const statusInfo: Record<OfferStatus, { text: string; className: string; Icon: React.ElementType }> = {
        [OfferStatus.PENDING_ADMIN]: { text: 'Revisión Admin', className: 'bg-gray-100 text-gray-700 border-gray-200', Icon: HourglassIcon },
        [OfferStatus.PENDING_BUYER]: { text: 'Revisión Comprador', className: 'bg-yellow-50 text-yellow-700 border-yellow-200', Icon: HourglassIcon },
        [OfferStatus.APPROVED]: { text: 'Aprobada', className: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircleIcon },
        [OfferStatus.REJECTED]: { text: 'Rechazada', className: 'bg-red-50 text-red-700 border-red-200', Icon: XCircleIcon },
        [OfferStatus.PENDING_EDIT]: { text: 'Edición Habilitada', className: 'bg-blue-50 text-blue-700 border-blue-200', Icon: PencilIcon },
        [OfferStatus.PENDING_SELLER_ACTION]: { text: 'Requiere Acción', className: 'bg-orange-50 text-orange-700 border-orange-200', Icon: PencilIcon },
        [OfferStatus.PENDING_DELETION]: { text: 'Eliminación Solicitada', className: 'bg-purple-50 text-purple-700 border-purple-200', Icon: XCircleIcon },
        [OfferStatus.HIDDEN_BY_ADMIN]: { text: 'Eliminada', className: 'bg-gray-200 text-gray-500 border-gray-300', Icon: XCircleIcon },
        [OfferStatus.PENDING_SELLER_APPROVAL]: { text: 'Por Aprobar', className: 'bg-purple-50 text-purple-700 border-purple-200', Icon: HourglassIcon },
        [OfferStatus.WAITING_FOR_OWNER_EDIT_APPROVAL]: { text: 'Revisión Cambios', className: 'bg-orange-50 text-orange-700 border-orange-200', Icon: HourglassIcon },
    };

    const current = statusInfo[status];
    if (!current) return null;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.className}`}>
            <current.Icon className="w-3 h-3 mr-1" />
            {current.text}
        </span>
    );
};


const SellerDashboard = ({ currentUser }: SellerDashboardProps) => {
  const { requirements, offers, users, commitments, setOffers, setUsers, generateNewOfferId, materialCategories, buyerTypes, colombianDepartments, colombiaDepartmentsAndMunicipalities } = useData();
  const [activeTab, setActiveTab] = useState('solicitudes');
  
  // State for Solicitudes Tab
  const [materialFilter, setMaterialFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'Activas' | 'Inactivas'>('Activas');
  const [buyerTypeFilter, setBuyerTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [repFilter, setRepFilter] = useState<'all' | 'yes' | 'no'>('all');

  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerToView, setOfferToView] = useState<Offer | null>(null);
  const [offerToEdit, setOfferToEdit] = useState<Offer | null>(null);
  const [offerToRespond, setOfferToRespond] = useState<Offer | null>(null);
  const [sellerReply, setSellerReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // State for Perfil Tab
  const [profileData, setProfileData] = useState<User>(currentUser);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [changeRequest, setChangeRequest] = useState<{ field: 'name' | 'idNumber' | 'email'; label: string } | null>(null);
  const [newValue, setNewValue] = useState('');
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);
  
  // Edit Review Modal
  const [offerForEditReview, setOfferForEditReview] = useState<Offer | null>(null);

  const municipalities = useMemo(() => {
    if (profileData.department) {
        return colombiaDepartmentsAndMunicipalities[profileData.department] || [];
    }
    return [];
  }, [profileData.department, colombiaDepartmentsAndMunicipalities]);

  const filteredRequirements = useMemo(() => {
    let filtered = requirements.filter(r => 
        r.status !== RequirementStatus.HIDDEN_BY_ADMIN && 
        r.status !== RequirementStatus.PENDING_BUYER_APPROVAL
    );

    if (statusFilter === 'Activas') {
        filtered = filtered.filter(r => r.status === RequirementStatus.ACTIVE);
    } else {
        filtered = filtered.filter(r => r.status === RequirementStatus.COMPLETED || r.status === RequirementStatus.CANCELLED);
    }

    if (materialFilter !== 'all') filtered = filtered.filter(r => r.categoryId === materialFilter);
    if (departmentFilter !== 'all') filtered = filtered.filter(r => r.departamentoRecepcion === departmentFilter);
    if (buyerTypeFilter !== 'all') {
        filtered = filtered.filter(r => {
            const buyer = users.find(u => u.id === r.buyerId);
            return buyer?.buyerType === buyerTypeFilter;
        });
    }
    if (buyerTypeFilter === 'Transformador' && repFilter !== 'all') {
        filtered = filtered.filter(r => {
            const buyer = users.find(u => u.id === r.buyerId);
            const certifiesREP = buyer?.certifiesREP === true;
            return repFilter === 'yes' ? certifiesREP : !certifiesREP;
        });
    }

    return filtered.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [requirements, materialFilter, statusFilter, buyerTypeFilter, departmentFilter, users, repFilter]);

  const myOffers = useMemo(() => offers.filter(o => 
      o.sellerId === currentUser.id && 
      o.status !== OfferStatus.HIDDEN_BY_ADMIN &&
      o.status !== OfferStatus.PENDING_SELLER_APPROVAL &&
      o.status !== OfferStatus.WAITING_FOR_OWNER_EDIT_APPROVAL
    ).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()), [offers, currentUser.id]);
  
  const suggestedOffers = useMemo(() => offers.filter(o => 
    o.sellerId === currentUser.id && 
    o.status === OfferStatus.PENDING_SELLER_APPROVAL
  ), [offers, currentUser.id]);

  const offersPendingEditApproval = useMemo(() => offers.filter(o => 
      o.sellerId === currentUser.id && 
      o.status === OfferStatus.WAITING_FOR_OWNER_EDIT_APPROVAL
  ), [offers, currentUser.id]);

  const prevOffersRef = useRef<Offer[] | undefined>(undefined);
  useEffect(() => {
    const newlyApprovedOffers = myOffers.filter(currentOffer => {
        const prevOffer = prevOffersRef.current?.find(p => p.id === currentOffer.id);
        return (
            currentOffer.status === OfferStatus.APPROVED &&
            prevOffer?.status !== OfferStatus.APPROVED
        );
    });

    if (newlyApprovedOffers.length > 0) {
        setTimeout(() => {
            if (window.confirm(`¡Ofertas aprobadas! ${newlyApprovedOffers.length} ofertas nuevas. ¿Descargar comprobantes?`)) {
                newlyApprovedOffers.forEach(offer => {
                    const requirement = requirements.find(r => r.id === offer.requirementId);
                    const seller = users.find(u => u.id === offer.sellerId);
                    const buyer = requirement ? users.find(u => u.id === requirement.buyerId) : undefined;
                    if (requirement && seller && buyer) {
                        generateOfferPdf(offer, requirement, seller, buyer, currentUser);
                    }
                });
            }
        }, 100);
    }
    prevOffersRef.current = myOffers;
  }, [myOffers, requirements, users]);

  const handleMakeOffer = (offerData: Omit<Offer, 'id' | 'sellerId' | 'status' | 'createdAt'>) => {
    const newOffer: Offer = {
        ...offerData,
        id: generateNewOfferId(),
        sellerId: currentUser.id,
        status: OfferStatus.PENDING_ADMIN,
        createdAt: new Date(),
    };
    setOffers(prev => [newOffer, ...prev]);
    alert('Oferta enviada a revisión.');
  };

  const handleUpdateOffer = (offerData: Omit<Offer, 'id' | 'sellerId' | 'status' | 'createdAt'>) => {
    if (!offerToEdit) return;
    setOffers(prev => prev.map(o => o.id === offerToEdit.id ? { ...o, ...offerData, status: OfferStatus.PENDING_ADMIN } : o));
    setOfferToEdit(null);
    alert('Oferta actualizada y enviada a revisión.');
  };
  
  const handleSellerAction = (action: 'reply' | 'request_edit' | 'request_delete') => {
    if (!offerToRespond) return;
    if (action === 'reply' && !sellerReply.trim()) { alert("Escribe una respuesta."); return; }

    setIsReplying(true);
    const message = sellerReply.trim() || (action === 'request_edit' ? 'Solicito editar oferta.' : 'Solicito cancelar oferta.');
    const newLog: CommunicationLog = {
        id: `log${Date.now()}`,
        author: 'SELLER',
        authorId: currentUser.id,
        message: message,
        timestamp: new Date(),
        eventType: 'SELLER_RESPONSE',
    };

    let newStatus: OfferStatus = offerToRespond.status;
    if (action === 'request_edit') newStatus = OfferStatus.PENDING_EDIT;
    else if (action === 'request_delete') newStatus = OfferStatus.PENDING_DELETION;

    setTimeout(() => {
        setOffers(prev => prev.map(o => o.id === offerToRespond.id ? { ...o, status: newStatus, communicationLog: [...(o.communicationLog || []), newLog] } : o));
        setOfferToRespond(null);
        setSellerReply('');
        setIsReplying(false);
    }, 1000);
  };

  const handleRequestEditOrDelete = (offerId: string, action: 'edit' | 'delete') => {
    const newStatus = action === 'edit' ? OfferStatus.PENDING_EDIT : OfferStatus.PENDING_DELETION;
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: newStatus } : o));
  };
  
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'department') setProfileData(prev => ({...prev, department: value, city: ''}));
    else setProfileData(prev => ({...prev, [name]: value}));
  };

  const handleProfileSave = (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingProfile(true);
      setTimeout(() => {
        setUsers(prev => prev.map(u => u.id === currentUser.id ? profileData : u));
        setIsSavingProfile(false);
        alert("Perfil actualizado.");
      }, 1500);
  };
  
  const handleRequestProfileFieldChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeRequest || !newValue) return;
    setIsSubmittingChange(true);
    setTimeout(() => {
        setUsers(prevUsers => prevUsers.map(u => {
            if (u.id === currentUser.id) {
                const updatedUser = { ...u, pendingChanges: { ...u.pendingChanges, [changeRequest.field]: newValue } };
                setProfileData(prev => ({ ...prev, pendingChanges: updatedUser.pendingChanges }));
                return updatedUser;
            }
            return u;
        }));
        setIsSubmittingChange(false);
        setChangeRequest(null);
        setNewValue('');
        alert('Solicitud enviada.');
    }, 1000);
  };

  const handleApproveSuggestedOffer = (offerId: string) => {
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: OfferStatus.PENDING_BUYER } : o));
    alert('Oferta enviada.');
  };

  const handleRejectSuggestedOffer = (offerId: string) => {
    if (window.confirm('¿Rechazar esta sugerencia?')) {
        setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: OfferStatus.HIDDEN_BY_ADMIN } : o)); 
    }
  };
  
  const handleApproveAdminEdit = (offer: Offer) => {
      if (!offer.pendingEdits) return;
      setOffers(prev => prev.map(o => {
          if (o.id === offer.id) {
              const updatedOffer = { ...o, ...o.pendingEdits, status: OfferStatus.PENDING_BUYER };
              delete updatedOffer.pendingEdits;
              return updatedOffer;
          }
          return o;
      }));
      setOfferForEditReview(null);
      alert('Cambios aprobados.');
  };

  const handleRejectAdminEdit = (offer: Offer) => {
      setOffers(prev => prev.map(o => {
          if (o.id === offer.id) {
              const revertedOffer = { ...o, status: OfferStatus.PENDING_BUYER };
              delete revertedOffer.pendingEdits;
              return revertedOffer;
          }
          return o;
      }));
      setOfferForEditReview(null);
      alert('Cambios rechazados.');
  };

  const renderSolicitudes = () => {
    if (selectedRequirement) {
        const buyer = users.find(u => u.id === selectedRequirement.buyerId);
        return (
             <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <button onClick={() => setSelectedRequirement(null)} className="text-sm font-medium text-teal-600 hover:text-teal-800 mb-6 transition-colors flex items-center">
                    <span className="mr-1">&larr;</span> Volver al mercado
                </button>
                <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                   <div>
                       <h1 className="text-2xl font-bold text-gray-900">{selectedRequirement.title}</h1>
                       <div className="flex items-center mt-2 text-sm text-gray-500">
                           <span className="font-semibold text-gray-700 mr-2">{buyer?.name || 'Comprador'}</span>
                           {buyer?.isVerified && <span className="text-green-600 flex items-center mr-3"><CheckCircleIcon className="w-4 h-4 mr-1"/> Verificado</span>}
                           {buyer?.buyerType && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs border border-gray-200">{buyer.buyerType}</span>}
                       </div>
                   </div>
                   {selectedRequirement.status === RequirementStatus.ACTIVE && (
                    <button 
                       onClick={() => setIsOfferModalOpen(true)}
                       className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 hover:shadow-lg transition-all active:scale-95"
                   >
                       Hacer Oferta
                   </button>
                   )}
                </div>
                <div className="border-t border-gray-100 pt-6">
                    <RequirementDetailView 
                        requirement={selectedRequirement} 
                        showTitle={false} 
                        buyer={buyer} 
                        showBuyerContactInfo={false} 
                        showManagementFee={false}
                    />
                </div>
             </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Filtros de Búsqueda</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Material</label>
                        <select value={materialFilter} onChange={(e) => setMaterialFilter(e.target.value)} className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                            <option value="all">Todos</option>
                            {Object.keys(materialCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Departamento</label>
                         <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm">
                            <option value="all">Todos</option>
                            {colombianDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                         </select>
                    </div>
                    <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Tipo Comprador</label>
                         <select 
                            value={buyerTypeFilter} 
                            onChange={(e) => {
                                const newBuyerType = e.target.value;
                                setBuyerTypeFilter(newBuyerType);
                                if (newBuyerType !== 'Transformador') setRepFilter('all');
                            }}
                            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                         >
                            <option value="all">Todos</option>
                            {buyerTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                         </select>
                    </div>
                    {buyerTypeFilter === 'Transformador' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Certifica REP</label>
                            <select 
                                value={repFilter} 
                                onChange={(e) => setRepFilter(e.target.value as 'all' | 'yes' | 'no')} 
                                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                            >
                                <option value="all">Todos</option>
                                <option value="yes">Sí</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRequirements.map(req => {
                    const buyer = users.find(u => u.id === req.buyerId);
                    
                    let estimatedPerDelivery = 0;
                    if (req.vigenciaInicio && req.vigenciaFin) {
                        try {
                            const start = parseDate(req.vigenciaInicio);
                            const end = parseDate(req.vigenciaFin);
                            if (start < end) {
                                let periods = 0;
                                let cursorDate = start;
                                while (cursorDate <= end) {
                                    periods++;
                                    switch (req.frecuencia) {
                                        case 'Semanal': cursorDate = addDays(cursorDate, 7); break;
                                        case 'Mensual': 
                                            const y = cursorDate.getUTCFullYear();
                                            const m = cursorDate.getUTCMonth();
                                            cursorDate = new Date(Date.UTC(y, m + 1, 1));
                                            break;
                                        case 'Anual':
                                            const yA = cursorDate.getUTCFullYear();
                                            cursorDate = new Date(Date.UTC(yA + 1, 0, 1));
                                            break;
                                        default: cursorDate = addDays(cursorDate, 365); break;
                                    }
                                }
                                estimatedPerDelivery = req.totalVolume / Math.max(1, periods);
                            } else estimatedPerDelivery = req.totalVolume;
                        } catch(e) { estimatedPerDelivery = req.totalVolume; }
                    } else estimatedPerDelivery = req.totalVolume;

                    return (
                    <div key={req.id} onClick={() => setSelectedRequirement(req)} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-teal-200 transition-all cursor-pointer group flex flex-col h-full">
                       <div className="flex justify-between items-start mb-3">
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-teal-700 bg-teal-50 rounded border border-teal-100">{req.categoryId}</span>
                            <span className="text-xs text-gray-400 font-mono">ID: {req.id}</span>
                       </div>
                       
                       <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-700 transition-colors mb-2 line-clamp-2">{req.title}</h3>
                       
                       <div className="text-sm text-gray-600 mb-4 flex-grow">
                           <div className="flex items-center mb-1">
                               <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></span>
                               {req.ciudadRecepcion}, {req.departamentoRecepcion}
                           </div>
                           <div className="flex items-center">
                               <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></span>
                               {buyer?.name}
                           </div>
                       </div>

                       <div className="pt-4 border-t border-gray-100 flex items-end justify-between">
                           <div>
                               <p className="text-xs text-gray-500 uppercase font-semibold">Total Global</p>
                               <p className="text-xl font-bold text-gray-900">{req.totalVolume} <span className="text-sm font-normal text-gray-500">{req.unidad}</span></p>
                           </div>
                           <div className="text-right">
                               <p className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded">{req.frecuencia}</p>
                           </div>
                       </div>
                    </div>
                )})}
                {filteredRequirements.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">No se encontraron solicitudes.</p>
                    </div>
                )}
            </div>
        </div>
    );
  };

  const renderMisOfertas = () => (
    <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Mis Ofertas</h2>
        {myOffers.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
                {myOffers.map(offer => {
                    const requirement = requirements.find(r => r.id === offer.requirementId);
                    const canRequestModify = offer.status === OfferStatus.PENDING_ADMIN || offer.status === OfferStatus.PENDING_BUYER;
                    const canEdit = offer.status === OfferStatus.PENDING_EDIT;
                    const needsAction = offer.status === OfferStatus.PENDING_SELLER_ACTION;
                    
                    return (
                        <div key={offer.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                           <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-grow cursor-pointer" onClick={() => setOfferToView(offer)}>
                                    <div className="flex items-center justify-between md:justify-start md:gap-4 mb-1">
                                        <h3 className="text-lg font-bold text-gray-900 hover:text-teal-700 transition-colors">{offer.cantidadOfertada} {offer.unidadMedida}</h3>
                                        <OfferStatusBadge status={offer.status} />
                                    </div>
                                    <p className="text-sm text-gray-600">Para: <span className="font-medium">{requirement?.title}</span></p>
                                    <p className="text-xs text-gray-400 mt-1 font-mono">Creada: {offer.createdAt.toLocaleDateString()}</p>
                                    
                                    {offer.status === OfferStatus.REJECTED && (
                                        <div className="mt-3 bg-red-50 border-l-4 border-red-400 p-2 text-xs text-red-800 rounded-r">
                                            Motivo: {offer.communicationLog?.[offer.communicationLog.length - 1]?.message || 'No especificado'}
                                        </div>
                                    )}
                                    {offer.status === OfferStatus.PENDING_EDIT && (
                                        <div className="mt-3 bg-blue-50 border-l-4 border-blue-400 p-2 text-xs text-blue-800 rounded-r">
                                            Feedback Admin: {offer.communicationLog?.[offer.communicationLog.length - 1]?.message}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-row md:flex-col gap-2 justify-end md:justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4 min-w-[140px]">
                                    {offer.status === OfferStatus.APPROVED && requirement && (
                                        <button
                                            onClick={() => {
                                                const buyer = users.find(u => u.id === requirement.buyerId);
                                                const seller = users.find(u => u.id === offer.sellerId);
                                                if (buyer && seller) generateOfferPdf(offer, requirement, seller, buyer, currentUser);
                                            }}
                                            className="w-full px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center"
                                        >
                                            <DownloadIcon className="w-3 h-3 mr-1" /> PDF
                                        </button>
                                    )}
                                    {needsAction ? (
                                        <button onClick={() => setOfferToRespond(offer)} className="w-full px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Responder</button>
                                    ) : canEdit ? (
                                        <button onClick={() => setOfferToEdit(offer)} className="w-full px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">Editar</button>
                                    ) : (
                                        offer.status !== OfferStatus.APPROVED && (
                                            <>
                                                <button onClick={() => handleRequestEditOrDelete(offer.id, 'edit')} disabled={!canRequestModify} className="w-full px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">Editar</button>
                                                <button onClick={() => handleRequestEditOrDelete(offer.id, 'delete')} disabled={!canRequestModify} className="w-full px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">Eliminar</button>
                                            </>
                                        )
                                    )}
                                </div>
                           </div>
                        </div>
                    )
                })}
            </div>
        ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No has realizado ninguna oferta.</p>
            </div>
        )}
    </div>
  );

  const renderSuggestedOffers = () => (
    <>
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Sugerencias y Pendientes</h2>
            <p className="text-gray-500 text-sm mt-1">Ofertas que requieren tu atención.</p>
        </div>
        <div className="space-y-4">
                {offersPendingEditApproval.map(offer => {
                     const requirement = requirements.find(r => r.id === offer.requirementId);
                     return (
                        <div key={offer.id} className="bg-white border border-orange-200 rounded-xl p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded mb-2 inline-block">CAMBIOS SUGERIDOS</span>
                                    <h3 className="text-lg font-bold text-gray-900">Oferta para {requirement?.title}</h3>
                                    <p className="text-sm text-gray-600 mt-1">El administrador propone cambios.</p>
                                </div>
                                <button 
                                    onClick={() => setOfferForEditReview(offer)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                                >
                                    Revisar
                                </button>
                            </div>
                        </div>
                     );
                 })}

                {suggestedOffers.map(offer => {
                    const requirement = requirements.find(r => r.id === offer.requirementId);
                    return (
                        <div key={offer.id} className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded mb-2 inline-block">NUEVA SUGERENCIA</span>
                                    <h3 className="text-lg font-bold text-gray-900">{offer.cantidadOfertada} {offer.unidadMedida}</h3>
                                    <p className="text-sm text-gray-600 mt-1">Para: {requirement?.title}</p>
                                </div>
                                <div className="flex space-x-3">
                                    <button 
                                        onClick={() => handleRejectSuggestedOffer(offer.id)}
                                        className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        Rechazar
                                    </button>
                                    <button 
                                        onClick={() => setOfferToView(offer)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Ver
                                    </button>
                                    <button 
                                        onClick={() => handleApproveSuggestedOffer(offer.id)}
                                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                                    >
                                        Aprobar y Enviar
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {suggestedOffers.length === 0 && offersPendingEditApproval.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">No tienes sugerencias pendientes.</p>
                    </div>
                )}
        </div>
    </>
  );

  const renderMiPerfil = () => {
    const commonInputClass = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500";
    const commonLabelClass = "block text-sm font-medium text-gray-700";

    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-4xl mx-auto">
            <div className="mb-8 flex items-center justify-between pb-6 border-b border-gray-100">
                 <div>
                    <h3 className="text-xl font-bold text-gray-900">Perfil de Empresa</h3>
                    <p className="text-sm text-gray-500 mt-1">Gestiona tu información comercial.</p>
                 </div>
                 {currentUser.isVerified ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                        <CheckCircleIcon className="h-4 w-4 mr-1.5"/> Verificado
                    </span>
                 ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                        <XCircleIcon className="h-4 w-4 mr-1.5"/> No Verificado
                    </span>
                 )}
            </div>

            <form onSubmit={handleProfileSave} className="space-y-8">
                 <section>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Datos Principales</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={commonLabelClass}>Razón Social</label>
                            <div className="flex gap-2">
                                <input type="text" value={profileData.name} readOnly className={`${commonInputClass} cursor-not-allowed`}/>
                                <button type="button" onClick={() => { setChangeRequest({ field: 'name', label: 'Razón Social' }); setNewValue(profileData.name || ''); }} className="text-xs text-teal-600 font-medium hover:underline whitespace-nowrap px-2">Cambiar</button>
                            </div>
                        </div>
                        <div>
                            <label className={commonLabelClass}>NIT/RUT</label>
                            <div className="flex gap-2">
                                <input type="text" value={profileData.idNumber || ''} readOnly className={`${commonInputClass} cursor-not-allowed`}/>
                                <button type="button" onClick={() => { setChangeRequest({ field: 'idNumber', label: 'NIT/RUT' }); setNewValue(profileData.idNumber || ''); }} className="text-xs text-teal-600 font-medium hover:underline whitespace-nowrap px-2">Cambiar</button>
                            </div>
                        </div>
                         <div className="md:col-span-2">
                            <label className={commonLabelClass}>Email</label>
                            <div className="flex gap-2">
                                <input type="email" value={profileData.email} readOnly className={`${commonInputClass} cursor-not-allowed`}/>
                                <button type="button" onClick={() => { setChangeRequest({ field: 'email', label: 'Email' }); setNewValue(profileData.email || ''); }} className="text-xs text-teal-600 font-medium hover:underline whitespace-nowrap px-2">Cambiar</button>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Contacto</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={commonLabelClass}>Nombre Contacto 1</label>
                            <input type="text" name="contactPerson1Name" value={profileData.contactPerson1Name || ''} onChange={handleProfileChange} className={commonInputClass}/>
                        </div>
                        <div>
                            <label className={commonLabelClass}>Cargo Contacto 1</label>
                            <input type="text" name="contactPerson1Position" value={profileData.contactPerson1Position || ''} onChange={handleProfileChange} className={commonInputClass}/>
                        </div>
                        <div>
                            <label className={commonLabelClass}>Teléfono 1</label>
                            <input type="tel" name="phone1" value={profileData.phone1 || ''} onChange={handleProfileChange} className={commonInputClass}/>
                        </div>
                    </div>
                </section>

                 <section>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Ubicación</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-3">
                            <label className={commonLabelClass}>Dirección</label>
                            <input type="text" name="address" value={profileData.address || ''} onChange={handleProfileChange} className={commonInputClass}/>
                        </div>
                        <div>
                            <label className={commonLabelClass}>Departamento</label>
                            <select name="department" value={profileData.department || ''} onChange={handleProfileChange} className={commonInputClass}>
                                <option value="">Seleccione...</option>
                                {colombianDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={commonLabelClass}>Ciudad</label>
                             <select name="city" value={profileData.city || ''} onChange={handleProfileChange} className={commonInputClass} disabled={!profileData.department}>
                                <option value="">Seleccione...</option>
                                {municipalities.map(mun => <option key={mun} value={mun}>{mun}</option>)}
                            </select>
                        </div>
                    </div>
                </section>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button type="submit" disabled={isSavingProfile} className="px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg shadow-sm hover:bg-teal-700 transition-all disabled:opacity-70 flex items-center justify-center min-w-[140px]">
                        {isSavingProfile ? <SpinnerIcon className="w-5 h-5 animate-spin"/> : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
        case 'solicitudes': return renderSolicitudes();
        case 'ofertas': return renderMisOfertas();
        case 'sugeridas': return renderSuggestedOffers();
        case 'perfil': return renderMiPerfil();
        default: return null;
    }
  };
  
    const requirementForCreate = selectedRequirement;
    const requirementForEdit = requirements.find(r => r.id === offerToEdit?.requirementId);
    
    const requirementForModal = requirementForEdit || requirementForCreate;
    const modalInitialData = offerToEdit || undefined;
    
    const handleSubmitModal = (data: Omit<Offer, 'id' | 'sellerId' | 'status' | 'createdAt'>) => {
        if (offerToEdit) handleUpdateOffer(data);
        else handleMakeOffer(data);
        setIsOfferModalOpen(false);
        setOfferToEdit(null);
    };

    const handleCloseModal = () => {
        setIsOfferModalOpen(false);
        setOfferToEdit(null);
    }
    
    const CommunicationModal = () => {
        if (!offerToRespond) return null;

        return (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-center">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900">Mensajes</h3>
                        <button onClick={() => setOfferToRespond(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                        {offerToRespond.communicationLog?.map(log => (
                            <div key={log.id} className={`flex flex-col ${log.author === 'SELLER' ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-gray-400 font-bold mb-1">{log.author} - {new Date(log.timestamp).toLocaleDateString()}</span>
                                <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${log.author === 'SELLER' ? 'bg-teal-100 text-teal-900 rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                                    {log.message}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex-shrink-0 pt-4 border-t border-gray-100">
                        <label htmlFor="sellerReply" className="block text-sm font-medium text-gray-700 mb-2">Tu Respuesta</label>
                        <textarea 
                            id="sellerReply"
                            value={sellerReply} 
                            onChange={(e) => setSellerReply(e.target.value)} 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm" 
                            rows={3}
                            placeholder="Escribe aquí..."
                        />
                        <div className="mt-4 flex justify-end space-x-3">
                            <button 
                                onClick={() => handleSellerAction('request_delete')} 
                                disabled={isReplying} 
                                className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                                Solicitar Cancelación
                            </button>
                            <button 
                                onClick={() => handleSellerAction('request_edit')} 
                                disabled={isReplying} 
                                className="px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                            >
                                Solicitar Edición
                            </button>
                            <button 
                                onClick={() => handleSellerAction('reply')} 
                                className="px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center min-w-[120px]" 
                                disabled={isReplying || !sellerReply.trim()}
                            >
                                {isReplying ? <SpinnerIcon className="w-4 h-4 animate-spin"/> : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-1">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
                { id: 'solicitudes', label: 'Mercado de Solicitudes' },
                { id: 'ofertas', label: 'Mis Ofertas' },
                { id: 'sugeridas', label: 'Sugerencias', count: suggestedOffers.length + offersPendingEditApproval.length },
                { id: 'perfil', label: 'Mi Perfil' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)} 
                    className={`${activeTab === tab.id 
                        ? 'border-teal-500 text-teal-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} 
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center`}
                >
                    {tab.label}
                    {tab.count ? (
                        <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{tab.count}</span>
                    ) : null}
                </button>
            ))}
        </nav>
      </div>

      <div>
        {renderContent()}
      </div>

      <OfferDetailModal 
          offer={offerToView} 
          onClose={() => setOfferToView(null)}
      />
      
      <CommunicationModal />
      
      {(isOfferModalOpen || offerToEdit) && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-start pt-10">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                  <div className="p-8 overflow-y-auto">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-2xl font-bold text-gray-900">{offerToEdit ? 'Editar Oferta' : 'Crear Oferta'}</h3>
                          <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                      </div>
                      {requirementForModal && (
                          <OfferForm 
                              requirement={requirementForModal}
                              initialData={modalInitialData}
                              onSubmit={handleSubmitModal}
                              onCancel={handleCloseModal}
                              submitButtonText={offerToEdit ? "Guardar Cambios" : "Enviar Oferta"}
                          />
                      )}
                  </div>
              </div>
          </div>
      )}
      
      {offerForEditReview && (
             <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-center">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <div className="p-8 overflow-y-auto">
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-orange-700">Revisión de Cambios</h3>
                            <p className="text-gray-500 mt-1">El administrador ha propuesto la siguiente versión.</p>
                        </div>
                        
                        <div className="border border-orange-200 bg-orange-50/30 p-6 rounded-xl">
                            {(() => {
                                const req = requirements.find(r => r.id === offerForEditReview.requirementId);
                                if (!req) return <p>Requerimiento no encontrado.</p>;
                                return (
                                    <OfferDetailView 
                                        offer={{...offerForEditReview, ...offerForEditReview.pendingEdits} as Offer} 
                                        requirement={req}
                                        showSellerInfo={false}
                                        showPenaltyFee={true}
                                    />
                                );
                            })()}
                        </div>
                    </div>
                    <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50 rounded-b-xl">
                        <button onClick={() => setOfferForEditReview(null)} className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
                        <button onClick={() => handleRejectAdminEdit(offerForEditReview)} className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">Rechazar Cambios</button>
                        <button onClick={() => handleApproveAdminEdit(offerForEditReview)} className="px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-sm">Aprobar Cambios</button>
                    </div>
                </div>
             </div>
        )}

    </div>
  );
};

export default SellerDashboard;