
import React, { useMemo, useState, useCallback } from 'react';
import { useData } from '../../hooks/useData';
import { Requirement, User, Offer, OfferStatus, Commitment, RequirementStatus, CommunicationLog } from '../../types';
import { CheckCircleIcon, SpinnerIcon, DownloadIcon, PlusIcon, PencilIcon, ArchiveBoxIcon, XCircleIcon, CameraIcon, ChartBarIcon, TruckIcon } from '../icons';
import { Button, Badge, Card, CardHeader, CardContent, PageHeader, Section, EmptyState, Tabs, StatCard, Table, TableHead, TableRow, TableCell } from '../UI';
import RequirementForm from '../RequirementForm';
import RequirementDetailView from '../RequirementDetailView';
import OfferDetailView from '../OfferDetailView';
import { downloadRequirementPdf, downloadSourcingOfferPdf } from '../PdfGenerator'; 
import OfferTimeline from '../OfferTimeline';
import { getPublicUserDisplay } from '../../utils';
import ProgressBar from '../ProgressBar';

// Helper to map status to UI Badge variants
const getStatusVariant = (status: RequirementStatus) => {
    switch (status) {
        case RequirementStatus.ACTIVE: return 'green';
        case RequirementStatus.PENDING_ADMIN: return 'gray';
        case RequirementStatus.PENDING_EDIT: return 'blue';
        case RequirementStatus.PENDING_DELETION: return 'red';
        case RequirementStatus.REJECTED: return 'red';
        case RequirementStatus.COMPLETED: return 'teal';
        case RequirementStatus.PENDING_QUANTITY_INCREASE: return 'yellow';
        case RequirementStatus.PENDING_BUYER_APPROVAL: return 'purple';
        case RequirementStatus.WAITING_FOR_OWNER_EDIT_APPROVAL: return 'orange';
        default: return 'gray';
    }
};

// --- MODALS ---
const RequirementFormModal = ({ isOpen, onClose, onSubmit, requirement }: { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; requirement?: Requirement;}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-50 flex justify-center items-start pt-10 transition-all">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[#D6D6D6] flex flex-col">
                <div className="flex justify-between items-center px-8 py-6 border-b border-[#F5F7F8] bg-[#FAFBFC] rounded-t-2xl sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">{requirement ? 'Editar Solicitud' : 'Nueva Solicitud Planificada'}</h2>
                        <p className="text-[#7A7A7A] text-sm mt-1 font-medium">Define los detalles técnicos y comerciales del suministro.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-[#7A7A7A] hover:bg-[#F5F7F8] transition-colors">
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                </div>
                <div className="p-8">
                    <RequirementForm onSubmit={onSubmit} onCancel={onClose} initialData={requirement} />
                </div>
            </div>
        </div>
    );
};

const OfferActionModal = ({ offer, isOpen, onClose, onApprove, onReject, currentUser }: any) => {
    const { requirements, users } = useData();
    const [isApproving, setIsApproving] = useState(false);
    
    // FIXED: Hooks must be called unconditionally before any return statement
    const requirement = useMemo(() => 
        offer ? requirements.find(r => r.id === offer.requirementId) : undefined
    , [requirements, offer]);
    
    const seller = useMemo(() => 
        offer ? users.find(u => u.id === offer.sellerId) : undefined
    , [users, offer]);
    
    const sellerDisplay = useMemo(() => 
        seller ? getPublicUserDisplay(seller, currentUser) : { name: 'Cargando...', subtext: '', contactHidden: true }
    , [seller, currentUser]);

    const handleApprove = useCallback(() => {
        if (!offer) return;
        setIsApproving(true);
        setTimeout(() => { 
            onApprove(offer.id); 
            setIsApproving(false); 
            onClose(); 
        }, 800);
    }, [offer, onApprove, onClose]);

    // Function to handle PDF download
    const handleDownloadPdf = () => {
        if (offer && requirement && seller) {
            downloadSourcingOfferPdf(offer, requirement, seller, currentUser, currentUser);
        }
    };

    if (!isOpen || !offer) return null;

    return (
        <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-50 flex justify-center items-start pt-10">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[#D6D6D6] overflow-hidden animate-fade-in-up">
                <div className="px-6 py-5 border-b border-[#F5F7F8] flex justify-between items-center bg-[#FAFBFC]">
                    <div>
                        <h2 className="text-lg font-bold text-[#0A0A0A]">Evaluar Oferta de Suministro</h2>
                        <p className="text-sm text-[#7A7A7A]">Proveedor: <span className="font-semibold text-[#007A8A]">{sellerDisplay.name}</span></p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" icon={DownloadIcon} onClick={handleDownloadPdf}>PDF Oferta</Button>
                        <button onClick={onClose} className="p-2 rounded-full text-[#7A7A7A] hover:bg-[#F5F7F8]">&times;</button>
                    </div>
                </div>
                <div className="p-8 overflow-y-auto">
                    {requirement && <OfferDetailView offer={offer} requirement={requirement} seller={seller} showSellerInfo={false} showPenaltyFee={false} currentUser={currentUser} />}
                </div>
                <div className="p-6 bg-[#FAFBFC] border-t border-[#F5F7F8] flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="danger" onClick={() => { onReject(offer); onClose(); }}>Rechazar</Button>
                    <Button variant="primary" onClick={handleApprove} isLoading={isApproving}>
                        Aprobar Oferta
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface BuyerDashboardProps {
  currentUser: User;
}

const BuyerDashboard = ({ currentUser }: BuyerDashboardProps) => {
  const {
    requirements, offers, commitments, users,
    createRequirement, updateRequirement,
    updateOffer, createCommitment,
    generateNewRequirementId, validateId
  } = useData();
  const [view, setView] = useState<'LIST' | 'DETAIL'>('LIST');
  const [mainTab, setMainTab] = useState<'REQUIREMENTS' | 'OFFERS'>('REQUIREMENTS'); // NEW MAIN TAB STATE
  
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [requirementToEdit, setRequirementToEdit] = useState<Requirement | null>(null);
  const [offerToReview, setOfferToReview] = useState<Offer | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [activeGlobalOffersTab, setActiveGlobalOffersTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING'); // NEW SUB TAB STATE

  const myRequirements = useMemo(() => requirements.filter(r => 
    r.buyerId === currentUser.id && 
    ![RequirementStatus.HIDDEN_BY_ADMIN, RequirementStatus.PENDING_BUYER_APPROVAL, RequirementStatus.WAITING_FOR_OWNER_EDIT_APPROVAL].includes(r.status)
  ).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()), [requirements, currentUser.id]);

  // Derived: All offers for my requirements
  const myIncomingOffers = useMemo(() => {
      const myReqIds = myRequirements.map(r => r.id);
      return offers.filter(o => myReqIds.includes(o.requirementId));
  }, [offers, myRequirements]);

  const selectedRequirement = useMemo(() => requirements.find(r => r.id === selectedReqId), [requirements, selectedReqId]);
  const reqOffers = useMemo(() => offers.filter(o => o.requirementId === selectedReqId), [offers, selectedReqId]);

  // Handlers
  const handleCreateReq = useCallback(async (data: any) => {
      try {
          const newReq: Partial<Requirement> = {
              ...data,
              id: generateNewRequirementId(),
              buyerId: currentUser.id,
              status: RequirementStatus.PENDING_ADMIN,
              createdAt: new Date(),
              totalVolume: data.cantidadRequerida,
              title: `${data.subcategoria || data.categoriaMaterial} - ${data.cantidadRequerida} ${data.unidad}`,
              description: data.especificacionesCalidad,
              categoryId: data.categoriaMaterial,
          };
          await createRequirement(newReq);
          setIsFormOpen(false);
      } catch (err: any) {
          alert('Error al crear solicitud: ' + err.message);
      }
  }, [currentUser.id, generateNewRequirementId, createRequirement]);

  const handleUpdateReq = useCallback(async (data: any) => {
      if(!requirementToEdit) return;
      try {
          await updateRequirement(requirementToEdit.id, { ...data, status: RequirementStatus.ACTIVE });
          setIsFormOpen(false);
          setRequirementToEdit(null);
      } catch (err: any) {
          alert('Error al actualizar solicitud: ' + err.message);
      }
  }, [requirementToEdit, updateRequirement]);

  const handleApproveOffer = useCallback(async (offerId: string) => {
      const offer = offers.find(o => o.id === offerId);
      if(!offer) return;
      const req = requirements.find(r => r.id === offer.requirementId);
      if(!req) return;

      // VALIDATION: Strict Cross-Module Check
      if (!validateId(offer.id, 'M1', 'OFF') || !validateId(req.id, 'M1', 'REQ')) {
          alert('Error Crítico: Intento de aprobar oferta con IDs inválidos o de otro módulo.');
          return;
      }

      try {
          // Update offer status
          await updateOffer(offerId, { status: OfferStatus.APPROVED });

          // Generate Commitment ID manually here to ensure M1 prefix
          const comDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const comRandom = Math.random().toString(36).substring(2, 6).toUpperCase();
          const newCommitmentId = `M1-COM-${comDate}-${comRandom}`;

          const newCommitment: Partial<Commitment> = {
              id: newCommitmentId,
              offerId: offer.id,
              requirementId: offer.requirementId,
              volume: offer.cantidadOfertada
          };

          await createCommitment(newCommitment);

          // Update Requirement Status if completed
          const allReqCommitments = commitments.filter(c => c.requirementId === req.id);
          const currentVol = allReqCommitments.reduce((s,c) => s + c.volume, 0) + offer.cantidadOfertada;

          if (currentVol >= req.totalVolume) {
              await updateRequirement(req.id, { status: RequirementStatus.COMPLETED });
          }
      } catch (err: any) {
          alert('Error al aprobar oferta: ' + err.message);
      }
  }, [offers, requirements, commitments, updateOffer, createCommitment, updateRequirement, validateId]);

  const handleRejectOffer = useCallback(async (offer: Offer) => {
      const reason = prompt("Indique el motivo del rechazo:");
      if(!reason) return;
      try {
          const newLog: CommunicationLog = { id: `log${Date.now()}`, author: 'BUYER', authorId: currentUser.id, message: reason, timestamp: new Date(), eventType: 'BUYER_REJECTION' };
          await updateOffer(offer.id, { status: OfferStatus.REJECTED, communicationLog: [...(offer.communicationLog || []), newLog] });
      } catch (err: any) {
          alert('Error al rechazar oferta: ' + err.message);
      }
  }, [currentUser.id, updateOffer]);

  const handleReqClick = useCallback((id: string) => { setSelectedReqId(id); setView('DETAIL'); }, []);
  const handleNewReqClick = useCallback(() => { setRequirementToEdit(null); setIsFormOpen(true); }, []);

  // PDF DOWNLOAD for Requirement
  const handleDownloadReqPdf = () => {
      if (selectedRequirement) {
          downloadRequirementPdf(selectedRequirement, currentUser, currentUser);
      }
  };

  // ... (Renderers remain same structure)
  const renderRequirementsTab = () => (
      <div className="animate-fade-in space-y-6">
          <Section 
            title="Mis Solicitudes de Suministro Planificado"
            action={
                <Button onClick={handleNewReqClick} icon={PlusIcon}>Nueva Solicitud</Button>
            }
          >
            {myRequirements.length === 0 ? (
                <EmptyState 
                    title="No tienes solicitudes activas" 
                    description="Crea tu primera solicitud de material para empezar a recibir ofertas de proveedores calificados."
                    icon={ArchiveBoxIcon}
                    action={<Button variant="primary" onClick={() => setIsFormOpen(true)}>Crear Primera Solicitud</Button>}
                />
            ) : (
                <Table>
                    <TableHead>
                        <TableCell isHeader>ID</TableCell>
                        <TableCell isHeader>Descripción</TableCell>
                        <TableCell isHeader>Estado</TableCell>
                        <TableCell isHeader>Progreso de Suministro</TableCell>
                        <TableCell isHeader>Ofertas</TableCell>
                        <TableCell isHeader align="right">Acción</TableCell>
                    </TableHead>
                    <tbody>
                        {myRequirements.map(req => {
                            const currentVol = commitments.filter(c => c.requirementId === req.id).reduce((s,c) => s + c.volume, 0);
                            const progress = Math.min(100, (currentVol / req.totalVolume) * 100);
                            const pendingCount = offers.filter(o => o.requirementId === req.id && o.status === OfferStatus.PENDING_BUYER).length;
                            
                            return (
                                <TableRow key={req.id} onClick={() => handleReqClick(req.id)}>
                                    <TableCell className="text-[#7A7A7A] font-mono text-xs">#{req.id}</TableCell>
                                    <TableCell>
                                        <div className="font-bold text-[#0A0A0A]">{req.title}</div>
                                        <div className="text-xs text-[#7A7A7A]">{req.categoriaMaterial}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(req.status)}>{req.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="w-full max-w-[140px]">
                                            <div className="flex justify-between text-xs mb-1 font-bold text-[#7A7A7A]">
                                                <span>{progress.toFixed(0)}%</span>
                                                <span>{currentVol}/{req.totalVolume}</span>
                                            </div>
                                            <div className="w-full bg-[#F5F7F8] rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-[#007A8A] h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {pendingCount > 0 ? (
                                            <Badge variant="yellow" className="animate-pulse">{pendingCount} Nuevas</Badge>
                                        ) : (
                                            <span className="text-[#7A7A7A] text-xs font-medium">Al día</span>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <span className="text-[#007A8A] font-bold text-xs hover:underline">Gestionar &rarr;</span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </tbody>
                </Table>
            )}
          </Section>
      </div>
  );

  const renderGlobalOffersTab = () => {
      // Filter offers based on activeGlobalOffersTab
      const filteredOffers = myIncomingOffers.filter(o => {
          if (activeGlobalOffersTab === 'PENDING') return o.status === OfferStatus.PENDING_BUYER;
          if (activeGlobalOffersTab === 'APPROVED') return o.status === OfferStatus.APPROVED;
          if (activeGlobalOffersTab === 'REJECTED') return o.status === OfferStatus.REJECTED || o.status === OfferStatus.PENDING_SELLER_ACTION;
          return false;
      });

      return (
          <div className="animate-fade-in space-y-6">
              <Tabs 
                activeTab={activeGlobalOffersTab}
                onChange={(id) => setActiveGlobalOffersTab(id)}
                tabs={[
                    { id: 'PENDING', label: 'Pendientes', count: myIncomingOffers.filter(o => o.status === OfferStatus.PENDING_BUYER).length, icon: ArchiveBoxIcon },
                    { id: 'APPROVED', label: 'Aprobadas', count: myIncomingOffers.filter(o => o.status === OfferStatus.APPROVED).length, icon: CheckCircleIcon },
                    { id: 'REJECTED', label: 'Rechazadas', count: myIncomingOffers.filter(o => o.status === OfferStatus.REJECTED || o.status === OfferStatus.PENDING_SELLER_ACTION).length, icon: XCircleIcon },
                ]}
              />

              <div className="grid grid-cols-1 gap-4">
                  {filteredOffers.length === 0 ? (
                      <EmptyState title="No hay ofertas" description="No se encontraron ofertas en esta categoría." icon={ArchiveBoxIcon} />
                  ) : (
                      filteredOffers.map(offer => {
                          const req = myRequirements.find(r => r.id === offer.requirementId);
                          if (!req) return null;
                          const seller = users.find(u => u.id === offer.sellerId);
                          const sellerDisplay = getPublicUserDisplay(seller, currentUser);
                          
                          // Calculate progress for the Crowdsourcing Bar
                          const currentVol = commitments.filter(c => c.requirementId === req.id).reduce((s,c) => s + c.volume, 0);

                          return (
                              <Card key={offer.id} className="hover:shadow-md transition-shadow">
                                  <div className="p-5">
                                      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                          <div>
                                              <div className="flex items-center gap-2 mb-1">
                                                  <Badge variant="blue">{req.title}</Badge>
                                                  <span className="text-xs text-[#7A7A7A] font-mono">ID: {req.id}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-sm font-bold text-[#0A0A0A]">Proveedor: {sellerDisplay.name}</span>
                                                  {!sellerDisplay.contactHidden && <span className="text-[10px] bg-green-100 text-green-800 px-1.5 rounded">Verificado</span>}
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <p className="text-xs text-[#7A7A7A] font-bold uppercase">Oferta</p>
                                              <p className="text-xl font-black text-[#007A8A]">{offer.cantidadOfertada} {offer.unidadMedida}</p>
                                          </div>
                                      </div>

                                      {/* Crowdsourcing Bar Context */}
                                      <div className="bg-[#F5F7F8] p-3 rounded-lg border border-[#D6D6D6] mb-4">
                                          <div className="flex justify-between items-end mb-1">
                                              <span className="text-xs font-bold text-[#005B6A] uppercase flex items-center gap-1">
                                                  <ChartBarIcon className="w-3 h-3"/> Meta de Suministro Planificado
                                              </span>
                                          </div>
                                          <ProgressBar current={currentVol} total={req.totalVolume} unit={req.unidad} />
                                          <p className="text-[10px] text-[#7A7A7A] mt-1 text-right italic">
                                              Esta oferta contribuiría con un {((offer.cantidadOfertada / req.totalVolume) * 100).toFixed(1)}% adicional a la meta.
                                          </p>
                                      </div>

                                      <div className="flex justify-between items-center pt-3 border-t border-[#F5F7F8]">
                                          <span className="text-xs text-[#7A7A7A]">Fecha Oferta: {new Date(offer.createdAt).toLocaleDateString()}</span>
                                          <Button size="sm" variant="secondary" onClick={() => setOfferToReview(offer)}>Revisar Detalle</Button>
                                      </div>
                                  </div>
                              </Card>
                          );
                      })
                  )}
              </div>
          </div>
      );
  };

  const renderDetail = () => {
      if (!selectedRequirement) return null;
      const pendingOffers = reqOffers.filter(o => o.status === OfferStatus.PENDING_BUYER);
      const approvedOffers = reqOffers.filter(o => o.status === OfferStatus.APPROVED);
      const rejectedOffers = reqOffers.filter(o => o.status === OfferStatus.REJECTED || o.status === OfferStatus.PENDING_SELLER_ACTION);
      
      const currentVol = commitments.filter(c => c.requirementId === selectedRequirement.id).reduce((s,c) => s + c.volume, 0);

      const offersToShow = activeDetailTab === 'PENDING' ? pendingOffers : activeDetailTab === 'APPROVED' ? approvedOffers : rejectedOffers;

      return (
          <div className="space-y-8 animate-fade-in">
              <PageHeader 
                title={selectedRequirement.title}
                subtitle={`${selectedRequirement.ciudadRecepcion} • Creado: ${new Date(selectedRequirement.createdAt).toLocaleDateString()}`}
                backAction={() => setView('LIST')}
                actions={
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => { setRequirementToEdit(selectedRequirement); setIsFormOpen(true); }} icon={PencilIcon}>Editar</Button>
                        <Button variant="outline" onClick={handleDownloadReqPdf} icon={DownloadIcon}>PDF</Button>
                    </div>
                }
              />

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard 
                    label="Volumen Asegurado" 
                    value={currentVol} 
                    subValue={`/ ${selectedRequirement.totalVolume} ${selectedRequirement.unidad}`} 
                    icon={ChartBarIcon} 
                    color="teal" 
                  />
                  <StatCard 
                    label="Ofertas Pendientes" 
                    value={pendingOffers.length} 
                    subValue={pendingOffers.length > 0 ? "Requieren tu atención" : "Al día"} 
                    icon={ArchiveBoxIcon} 
                    color="amber" 
                  />
                  <StatCard 
                    label="Proveedores Activos" 
                    value={approvedOffers.length} 
                    subValue="En cumplimiento" 
                    icon={TruckIcon} 
                    color="indigo" 
                  />
              </div>

              {/* Timeline Visualization if applicable */}
              {approvedOffers.length > 0 && (
                  <Card>
                      <CardContent>
                          <OfferTimeline requirement={selectedRequirement} approvedOffers={approvedOffers} currentUser={currentUser} />
                      </CardContent>
                  </Card>
              )}

              {/* Offer Management */}
              <Section title="Gestión de Ofertas">
                  <Tabs 
                    activeTab={activeDetailTab}
                    onChange={(id) => setActiveDetailTab(id)}
                    tabs={[
                        { id: 'PENDING', label: 'Pendientes', count: pendingOffers.length, icon: ArchiveBoxIcon },
                        { id: 'APPROVED', label: 'Aprobadas', count: approvedOffers.length, icon: CheckCircleIcon },
                        { id: 'REJECTED', label: 'Rechazadas', count: rejectedOffers.length, icon: XCircleIcon },
                    ]}
                  />

                  {offersToShow.length === 0 ? (
                      <EmptyState 
                        title="Sin ofertas en esta sección" 
                        description="No hay registros para mostrar con el filtro seleccionado."
                        icon={ArchiveBoxIcon}
                      />
                  ) : (
                      <Table>
                          <TableHead>
                              <TableCell isHeader>Proveedor</TableCell>
                              <TableCell isHeader>Cantidad</TableCell>
                              <TableCell isHeader>Fecha Recepción</TableCell>
                              <TableCell isHeader>Estado</TableCell>
                              <TableCell isHeader align="right">Acción</TableCell>
                          </TableHead>
                          <tbody>
                              {offersToShow.map(offer => {
                                  const seller = users.find(u => u.id === offer.sellerId);
                                  const display = getPublicUserDisplay(seller, currentUser);
                                  return (
                                      <TableRow key={offer.id} onClick={() => setOfferToReview(offer)}>
                                          <TableCell>
                                              <div className="font-bold text-[#0A0A0A]">{display.name}</div>
                                              {!display.contactHidden && <div className="text-xs text-[#7A7A7A]">Verificado</div>}
                                          </TableCell>
                                          <TableCell>
                                              <span className="font-bold text-[#007A8A]">{offer.cantidadOfertada} {offer.unidadMedida}</span>
                                          </TableCell>
                                          <TableCell className="text-[#7A7A7A] text-xs">
                                              {new Date(offer.createdAt).toLocaleDateString()}
                                          </TableCell>
                                          <TableCell>
                                              {offer.status === OfferStatus.PENDING_BUYER ? <Badge variant="yellow">Pendiente</Badge> : 
                                               offer.status === OfferStatus.APPROVED ? <Badge variant="green">Aprobada</Badge> :
                                               <Badge variant="red">Rechazada</Badge>}
                                          </TableCell>
                                          <TableCell align="right">
                                              <Button size="sm" variant="secondary" onClick={() => setOfferToReview(offer)}>Ver Detalle</Button>
                                          </TableCell>
                                      </TableRow>
                                  );
                              })}
                          </tbody>
                      </Table>
                  )}
              </Section>

              {/* Requirement Details */}
              <Card>
                  <CardHeader title="Especificaciones Técnicas" subtitle="Detalle original de la solicitud." icon={ArchiveBoxIcon} />
                  <CardContent>
                    <RequirementDetailView 
                        requirement={selectedRequirement} 
                        showTitle={false} 
                        showBuyerContactInfo={false} 
                        currentUser={currentUser} 
                        showManagementFee={true} // Explicitly true for Buyer Dashboard (Creator view)
                    />
                  </CardContent>
              </Card>
          </div>
      );
  };

  return (
    <div className="pb-12">
        {view === 'LIST' ? (
            <>
                <Tabs 
                    activeTab={mainTab} 
                    onChange={(id) => setMainTab(id)}
                    tabs={[
                        { id: 'REQUIREMENTS', label: 'Mis Solicitudes', icon: ArchiveBoxIcon },
                        { id: 'OFFERS', label: 'Ofertas Recibidas', icon: CheckCircleIcon, count: myIncomingOffers.length }
                    ]} 
                />
                {mainTab === 'REQUIREMENTS' && renderRequirementsTab()}
                {mainTab === 'OFFERS' && renderGlobalOffersTab()}
            </>
        ) : (
            renderDetail()
        )}
        
        <RequirementFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={requirementToEdit ? handleUpdateReq : handleCreateReq} requirement={requirementToEdit || undefined} />
        
        {/* MODAL IS CONDITIONALLY RENDERED HERE TO ENSURE HOOK CONSISTENCY */}
        {offerToReview && (
            <OfferActionModal 
                offer={offerToReview} 
                isOpen={true} 
                onClose={() => setOfferToReview(null)} 
                onApprove={handleApproveOffer} 
                onReject={handleRejectOffer} 
                currentUser={currentUser} 
            />
        )}
    </div>
  );
};

export default BuyerDashboard;
