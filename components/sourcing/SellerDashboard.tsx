
import React, { useMemo, useState } from 'react';
import { useData } from '../../hooks/useData';
import { User, Requirement, RequirementStatus, Offer, OfferStatus, CommunicationLog } from '../../types';
import { CheckCircleIcon, SpinnerIcon, DownloadIcon, TruckIcon, ArchiveBoxIcon, XCircleIcon, PencilIcon, ChartBarIcon, PlusIcon } from '../icons';
import { Button, Badge, Card, CardHeader, CardContent, PageHeader, Section, EmptyState, Tabs, StatCard, Table, TableHead, TableRow, TableCell } from '../UI';
import RequirementDetailView from '../RequirementDetailView';
import OfferDetailView from '../OfferDetailView';
import { downloadSourcingOfferPdf } from '../PdfGenerator'; // NEW IMPORT
import OfferForm from '../OfferForm';
import { getPublicUserDisplay, calculateDeliveryPeriods } from '../../utils';

interface SellerDashboardProps {
  currentUser: User;
}

const OfferStatusBadge = ({ status }: { status: OfferStatus }) => {
    const variants: Record<string, 'gray' | 'green' | 'red' | 'blue' | 'yellow' | 'orange' | 'purple'> = {
        [OfferStatus.PENDING_ADMIN]: 'gray',
        [OfferStatus.PENDING_BUYER]: 'yellow',
        [OfferStatus.APPROVED]: 'green',
        [OfferStatus.REJECTED]: 'red',
        [OfferStatus.PENDING_EDIT]: 'blue',
        [OfferStatus.PENDING_SELLER_ACTION]: 'orange',
    };
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>;
};

const SellerDashboard = ({ currentUser }: SellerDashboardProps) => {
  const { requirements, offers, users, createOffer, updateOffer, generateNewOfferId, materialCategories, colombianDepartments, validateId } = useData();
  const [view, setView] = useState<'MARKET' | 'MY_OFFERS'>('MARKET');
  
  // Filters
  const [materialFilter, setMaterialFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Actions
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerToEdit, setOfferToEdit] = useState<Offer | null>(null);
  const [offerToView, setOfferToView] = useState<Offer | null>(null);

  // Data Logic
  const availableRequirements = useMemo(() => {
      return requirements.filter(r => 
          r.status === RequirementStatus.ACTIVE &&
          (materialFilter === 'all' || r.categoryId === materialFilter) &&
          (deptFilter === 'all' || r.departamentoRecepcion === deptFilter)
      ).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [requirements, materialFilter, deptFilter]);

  const myOffers = useMemo(() => offers.filter(o => o.sellerId === currentUser.id).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()), [offers, currentUser.id]);

  const handleMakeOffer = async (data: any) => {
      if(!selectedReq) return;

      // STRICT VALIDATION
      if (!validateId(selectedReq.id, 'M1', 'REQ')) {
          alert('Error: No se puede realizar una oferta sobre una solicitud inválida o de otro módulo. (Debe ser M1-REQ)');
          return;
      }

      try {
          const newOffer: Partial<Offer> = {
              ...data,
              id: generateNewOfferId(),
              sellerId: currentUser.id,
              status: OfferStatus.PENDING_ADMIN,
              createdAt: new Date(),
          };
          await createOffer(newOffer);
          setIsOfferModalOpen(false);
          alert("Oferta enviada exitosamente. Pendiente de revisión.");
      } catch (err: any) {
          alert('Error al crear oferta: ' + err.message);
      }
  };

  const handleUpdateOffer = async (data: any) => {
      if(!offerToEdit) return;
      try {
          await updateOffer(offerToEdit.id, { ...data, status: OfferStatus.PENDING_ADMIN });
          setIsOfferModalOpen(false);
          setOfferToEdit(null);
          alert("Oferta actualizada y enviada a revisión.");
      } catch (err: any) {
          alert('Error al actualizar oferta: ' + err.message);
      }
  };

  const handleDownloadOfferPdf = (offer: Offer) => {
      const requirement = requirements.find(r => r.id === offer.requirementId);
      const buyer = users.find(u => u.id === requirement?.buyerId);
      if (offer && requirement && buyer) {
          downloadSourcingOfferPdf(offer, requirement, currentUser, buyer, currentUser);
      }
  };

  // --- VIEWS ---
  const renderMarket = () => (
      <div className="space-y-6 animate-fade-in">
          {/* Filters wrapped in a clean Card */}
          <Card>
              <div className="p-6 flex flex-col md:flex-row justify-between items-end gap-6">
                  <div>
                      <h2 className="text-lg font-bold text-[#0A0A0A]">Mercado de Oportunidades</h2>
                      <p className="text-[#7A7A7A] text-sm mt-1">Encuentra compradores confiables para tu material.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                      <div className="w-full sm:w-48">
                          <label className="block text-xs font-bold text-[#007A8A] uppercase tracking-wide mb-1">Material</label>
                          <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)} className="w-full border-[#D6D6D6] rounded-lg text-sm text-[#0A0A0A] font-medium focus:ring-[#007A8A] focus:border-[#007A8A] bg-[#FAFBFC] py-2 px-3">
                              <option value="all">Todos</option>
                              {Object.keys(materialCategories).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div className="w-full sm:w-48">
                          <label className="block text-xs font-bold text-[#007A8A] uppercase tracking-wide mb-1">Ubicación</label>
                          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="w-full border-[#D6D6D6] rounded-lg text-sm text-[#0A0A0A] font-medium focus:ring-[#007A8A] focus:border-[#007A8A] bg-[#FAFBFC] py-2 px-3">
                              <option value="all">Todo el país</option>
                              {colombianDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                  </div>
              </div>
          </Card>

          {/* List Table */}
          {availableRequirements.length === 0 ? (
              <div className="col-span-full">
                  <EmptyState 
                    title="No hay oportunidades" 
                    description="No encontramos solicitudes con los filtros seleccionados." 
                    icon={ArchiveBoxIcon} 
                  />
              </div>
          ) : (
              <Table>
                  <TableHead>
                      <TableCell isHeader>ID</TableCell>
                      <TableCell isHeader>Material</TableCell>
                      <TableCell isHeader>Presentación</TableCell>
                      <TableCell isHeader>Volumen / Frecuencia</TableCell>
                      <TableCell isHeader>Ubicación</TableCell>
                      <TableCell isHeader align="right">Acción</TableCell>
                  </TableHead>
                  <tbody>
                      {availableRequirements.map(req => {
                          const periods = calculateDeliveryPeriods(req.vigenciaInicio, req.vigenciaFin, req.frecuencia);
                          const volumePerPeriod = periods > 0 ? req.totalVolume / periods : req.totalVolume;

                          return (
                              <TableRow key={req.id} onClick={() => setSelectedReq(req)}>
                                  <TableCell className="text-xs font-mono text-[#7A7A7A]">{req.id}</TableCell>
                                  <TableCell>
                                      <div className="font-bold text-[#0A0A0A]">{req.categoryId}</div>
                                      <div className="text-xs text-[#7A7A7A] mt-0.5">{req.subcategoria || 'General'}</div>
                                  </TableCell>
                                  <TableCell>
                                      <Badge variant="gray">{req.presentacionMaterial}</Badge>
                                  </TableCell>
                                  <TableCell>
                                      <div className="font-bold text-[#007A8A]">
                                          {volumePerPeriod.toFixed(1)} {req.unidad}
                                      </div>
                                      <div className="text-xs text-[#7A7A7A] capitalize font-medium">
                                          /{req.frecuencia.toLowerCase()}
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      <div className="text-sm text-[#0A0A0A] font-medium">{req.ciudadRecepcion}</div>
                                      <div className="text-xs text-[#7A7A7A]">{req.departamentoRecepcion}</div>
                                  </TableCell>
                                  <TableCell align="right">
                                      <Button size="sm" variant="primary">Ofertar</Button>
                                  </TableCell>
                              </TableRow>
                          );
                      })}
                  </tbody>
              </Table>
          )}
      </div>
  );

  const renderMyOffers = () => (
      <div className="animate-fade-in space-y-6">
          <Section title="Mis Ofertas Activas">
            {myOffers.length === 0 ? (
                <EmptyState 
                    title="No has realizado ofertas" 
                    description="Explora el mercado para encontrar oportunidades de venta." 
                    icon={TruckIcon}
                    action={<Button onClick={() => setView('MARKET')}>Ir al Mercado</Button>}
                />
            ) : (
                <Table>
                    <TableHead>
                        <TableCell isHeader>Material y Solicitud</TableCell>
                        <TableCell isHeader>Volumen Ofertado</TableCell>
                        <TableCell isHeader>Esquema Suministro</TableCell>
                        <TableCell isHeader>Estado</TableCell>
                        <TableCell isHeader align="right">Acciones</TableCell>
                    </TableHead>
                    <tbody>
                        {myOffers.map(offer => {
                            const req = requirements.find(r => r.id === offer.requirementId);
                            const needsAction = offer.status === OfferStatus.PENDING_SELLER_ACTION;
                            // Allow editing if status is PENDING_ADMIN, PENDING_BUYER, PENDING_EDIT, OR REJECTED (to resubmit)
                            const canEdit = offer.status === OfferStatus.PENDING_EDIT || offer.status === OfferStatus.REJECTED || offer.status === OfferStatus.PENDING_ADMIN || offer.status === OfferStatus.PENDING_BUYER;

                            return (
                                <TableRow key={offer.id} onClick={() => setOfferToView(offer)}>
                                    <TableCell>
                                        {req ? (
                                            <div>
                                                <div className="text-xs font-bold text-[#007A8A] uppercase mb-0.5">{req.categoryId}</div>
                                                <div className="font-bold text-[#0A0A0A] text-sm mb-0.5">{req.title}</div>
                                                <div className="text-xs text-[#7A7A7A]">{req.subcategoria || 'General'}</div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-red-500 italic">Solicitud no disponible</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-black text-[#007A8A]">{offer.cantidadOfertada}</span>
                                            <span className="text-xs font-bold text-[#7A7A7A]">{offer.unidadMedida}</span>
                                        </div>
                                        <div className="text-[10px] text-[#7A7A7A] mt-1 bg-[#F5F7F8] px-1.5 py-0.5 rounded inline-block border border-[#D6D6D6]">
                                            ID: {offer.id}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Badge variant="blue" className="text-[10px]">{offer.frecuenciaSuministro}</Badge>
                                            <div className="text-xs text-[#3D3D3D] font-medium flex flex-col">
                                                <span>Desde: {offer.fechaInicioVigencia}</span>
                                                <span>Hasta: {offer.fechaFinVigencia}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col items-start gap-1">
                                            <OfferStatusBadge status={offer.status} />
                                            {offer.status === OfferStatus.REJECTED && (
                                                <div className="text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded max-w-[150px] leading-tight border border-red-100">
                                                    {offer.communicationLog?.[offer.communicationLog.length - 1]?.message || 'Ver detalle'}
                                                </div>
                                            )}
                                            {offer.status === OfferStatus.PENDING_EDIT && (
                                                <div className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded max-w-[150px] leading-tight border border-blue-100">
                                                    Feedback: {offer.communicationLog?.[offer.communicationLog.length - 1]?.message}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell align="right">
                                        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                            {needsAction ? (
                                                <Button size="sm" variant="primary" onClick={() => setOfferToView(offer)}>Responder</Button>
                                            ) : canEdit ? (
                                                <Button size="sm" variant="primary" onClick={() => { setOfferToEdit(offer); setIsOfferModalOpen(true); }} icon={PencilIcon}>
                                                    {offer.status === OfferStatus.REJECTED ? 'Corregir' : 'Editar'}
                                                </Button>
                                            ) : (
                                                <>
                                                    {offer.status === OfferStatus.APPROVED && req && (
                                                        <Button size="sm" variant="outline" onClick={() => handleDownloadOfferPdf(offer)} icon={DownloadIcon}>PDF</Button>
                                                    )}
                                                    <Button size="sm" variant="secondary" onClick={() => setOfferToView(offer)}>Ver Detalle</Button>
                                                </>
                                            )}
                                        </div>
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

  return (
    <div className="pb-12">
      <PageHeader title="Panel de Ventas" subtitle="Encuentra oportunidades y gestiona tus ofertas comerciales." />
      
      <Tabs 
        activeTab={view} 
        onChange={(id) => { setView(id); setSelectedReq(null); }}
        tabs={[
            { id: 'MARKET', label: 'Mercado de Oportunidades', icon: ArchiveBoxIcon },
            { id: 'MY_OFFERS', label: 'Mis Ofertas Enviadas', icon: TruckIcon }
        ]} 
      />

      {view === 'MARKET' && !selectedReq && renderMarket()}
      {view === 'MY_OFFERS' && renderMyOffers()}

      {/* Detail View for Requirement */}
      {selectedReq && (
          <div className="animate-fade-in space-y-6">
              <PageHeader 
                title={selectedReq.title}
                subtitle={`${selectedReq.categoryId} • ${selectedReq.ciudadRecepcion}`}
                backAction={() => setSelectedReq(null)}
                actions={
                    <Button 
                        variant="primary"
                        onClick={() => setIsOfferModalOpen(true)}
                        icon={PlusIcon}
                    >
                        Hacer Oferta
                    </Button>
                }
              />
              
              <Card>
                  <CardHeader title="Especificaciones del Comprador" subtitle="Revisa los detalles antes de ofertar." icon={ArchiveBoxIcon} />
                  <CardContent>
                      <RequirementDetailView requirement={selectedReq} showTitle={false} showBuyerContactInfo={false} currentUser={currentUser} />
                  </CardContent>
              </Card>
          </div>
      )}

      {/* Modals */}
      {(isOfferModalOpen || offerToEdit) && (
          <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-50 flex justify-center items-start pt-10">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-[#D6D6D6] overflow-hidden animate-fade-in-up">
                  <div className="px-6 py-5 border-b border-[#F5F7F8] flex justify-between items-center bg-[#FAFBFC]">
                      <h3 className="text-xl font-bold text-[#0A0A0A]">{offerToEdit ? 'Editar Oferta' : 'Crear Oferta'}</h3>
                      <button onClick={() => { setIsOfferModalOpen(false); setOfferToEdit(null); }} className="text-[#7A7A7A] hover:text-[#0A0A0A] text-2xl">&times;</button>
                  </div>
                  <div className="p-8 overflow-y-auto">
                      <OfferForm 
                        requirement={selectedReq || requirements.find(r => r.id === offerToEdit?.requirementId)!}
                        initialData={offerToEdit || undefined}
                        onSubmit={offerToEdit ? handleUpdateOffer : handleMakeOffer}
                        onCancel={() => { setIsOfferModalOpen(false); setOfferToEdit(null); }}
                        submitButtonText={offerToEdit ? "Guardar Cambios" : "Enviar Oferta"}
                      />
                  </div>
              </div>
          </div>
      )}

      {offerToView && (
          <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-50 flex justify-center items-start pt-10">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-[#D6D6D6] overflow-hidden animate-fade-in-up">
                  <div className="px-6 py-5 border-b border-[#F5F7F8] flex justify-between items-center bg-[#FAFBFC]">
                      <h3 className="text-xl font-bold text-[#0A0A0A]">Detalle de Oferta</h3>
                      <button onClick={() => setOfferToView(null)} className="text-[#7A7A7A] hover:text-[#0A0A0A] text-2xl">&times;</button>
                  </div>
                  <div className="p-8 overflow-y-auto">
                      <OfferDetailView 
                        offer={offerToView} 
                        requirement={requirements.find(r => r.id === offerToView.requirementId)!}
                        seller={currentUser}
                        showSellerInfo={true}
                        showPenaltyFee={true}
                        currentUser={currentUser}
                      />
                  </div>
                  <div className="p-6 bg-[#FAFBFC] border-t border-[#F5F7F8] flex justify-end gap-3">
                      <Button variant="outline" onClick={() => handleDownloadOfferPdf(offerToView)} icon={DownloadIcon}>Descargar Comprobante PDF</Button>
                      <Button variant="secondary" onClick={() => setOfferToView(null)}>Cerrar</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SellerDashboard;
