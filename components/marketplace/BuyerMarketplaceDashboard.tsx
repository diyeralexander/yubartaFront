
import React, { useMemo, useState } from 'react';
import { User, MarketplaceListing, ListingStatus, PurchaseOfferStatus, PurchaseOffer } from '../../types';
import { useData } from '../../hooks/useData';
import ListingDetailView from './ListingDetailView';
import PurchaseOfferForm from './PurchaseOfferForm';
import PurchaseOfferDetailView from './PurchaseOfferDetailView';
import { Button, Badge, Card, CardHeader, CardContent, PageHeader, EmptyState, Section, Table, TableHead, TableRow, TableCell, Tabs } from '../UI';
import { ArchiveBoxIcon, ShoppingCartIcon, TruckIcon, CameraIcon, DownloadIcon, EyeIcon, PencilIcon } from '../icons';
import { getPublicUserDisplay } from '../../utils';
import { downloadPurchaseOfferPdf } from '../PdfGenerator';

interface Props {
    currentUser: User;
}

const BuyerMarketplaceDashboard = ({ currentUser }: Props) => {
    const { marketplaceListings, materialCategories, colombianDepartments, purchaseOffers, createPurchaseOffer, updatePurchaseOffer, generateNewPurchaseOfferId, users, validateId } = useData();
    const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
    const [isMakingOffer, setIsMakingOffer] = useState(false);
    
    // State for viewing full offer details
    const [offerToView, setOfferToView] = useState<PurchaseOffer | null>(null);
    const [offerToEdit, setOfferToEdit] = useState<PurchaseOffer | null>(null);
    
    // View State for Tabs
    const [view, setView] = useState<'MARKET' | 'OFFERS'>('MARKET');

    // Filters
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [deptFilter, setDeptFilter] = useState('all');

    const availableListings = useMemo(() => {
        return marketplaceListings.filter(l => 
            l.status === ListingStatus.ACTIVE &&
            l.quantity > 0 && 
            (categoryFilter === 'all' || l.category === categoryFilter) &&
            (deptFilter === 'all' || l.locationDepartment === deptFilter)
        );
    }, [marketplaceListings, categoryFilter, deptFilter]);

    const myOffers = useMemo(() => purchaseOffers.filter(o => o.buyerId === currentUser.id).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()), [purchaseOffers, currentUser.id]);

    const handleSubmitOffer = async (offerData: Partial<PurchaseOffer>) => {
        // If editing existing offer
        if (offerToEdit) {
            try {
                await updatePurchaseOffer(offerToEdit.id, {
                    ...offerData,
                    status: PurchaseOfferStatus.PENDING_SELLER,
                    createdAt: new Date(),
                    rejectionReason: undefined
                });
                setIsMakingOffer(false);
                setOfferToEdit(null);
                setView('OFFERS');
                alert('Oferta actualizada y reenviada al vendedor.');
            } catch (err: any) {
                alert('Error al actualizar oferta: ' + err.message);
            }
            return;
        }

        if (!selectedListing) {
            alert("Error: No listing selected.");
            return;
        }

        // Relaxed validation
        if (!validateId(selectedListing.id, 'M2', 'LST')) {
            console.warn('Warning: Offering on a legacy listing ID. Proceeding...');
        }

        try {
            const newOffer: Partial<PurchaseOffer> = {
                id: generateNewPurchaseOfferId(),
                listingId: selectedListing.id,
                buyerId: currentUser.id,
                status: PurchaseOfferStatus.PENDING_ADMIN,
                createdAt: new Date(),
                quantityRequested: offerData.quantityRequested || 0,
                totalPriceOffered: offerData.totalPriceOffered || 0,

                // Logística
                tipoVehiculo: offerData.tipoVehiculo || 'A convenir',
                frecuenciaRetiro: offerData.frecuenciaRetiro || 'Única Vez',
                aceptaUbicacion: offerData.aceptaUbicacion ?? true,
                contrapropuestaLogistica: offerData.contrapropuestaLogistica,
                fechaRecogida: offerData.fechaRecogida || offerData.validFrom || new Date().toISOString().split('T')[0],

                // Precio
                aceptaPrecio: offerData.aceptaPrecio ?? true,
                contrapropuestaPrecio: offerData.contrapropuestaPrecio,
                offerPriceStructure: offerData.offerPriceStructure,
                priceExplanation: offerData.priceExplanation,

                // Calidad
                aceptaCalidad: offerData.aceptaCalidad ?? true,
                contrapropuestaCalidad: offerData.contrapropuestaCalidad,

                // Pago
                metodoPagoPropuesto: offerData.metodoPagoPropuesto || 'Transferencia',
                condicionesPagoPropuestas: offerData.condicionesPagoPropuestas || 'Contado',

                // Vigencia
                validFrom: offerData.validFrom || new Date().toISOString().split('T')[0],
                validUntil: offerData.validUntil || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],

                message: offerData.message,
                penaltyFeeAccepted: offerData.penaltyFeeAccepted ?? false,
                canProvideCertificate: offerData.canProvideCertificate
            };

            await createPurchaseOffer(newOffer);
            setIsMakingOffer(false);
            setSelectedListing(null);
            setView('OFFERS');
            alert('Oferta enviada con éxito. El administrador la revisará pronto.');
        } catch (error: any) {
            console.error("Error creating offer:", error);
            alert("Error al crear oferta: " + error.message);
        }
    };

    const handleEditRejected = (offer: PurchaseOffer) => {
        const listing = marketplaceListings.find(l => l.id === offer.listingId);
        if (!listing) {
            alert("La publicación asociada ya no está disponible.");
            return;
        }
        setSelectedListing(listing);
        setOfferToEdit(offer);
        setIsMakingOffer(true);
    };

    const handleDownloadPdf = (offer: PurchaseOffer) => {
        const listing = marketplaceListings.find(l => l.id === offer.listingId);
        const seller = users.find(u => u.id === listing?.sellerId);
        if (offer && listing && seller) {
            downloadPurchaseOfferPdf(offer, listing, currentUser, seller, currentUser);
        }
    };

    const getStatusBadge = (status: PurchaseOfferStatus) => {
        switch (status) {
            case PurchaseOfferStatus.ACCEPTED: return <Badge variant="green">Aceptada</Badge>;
            case PurchaseOfferStatus.REJECTED: return <Badge variant="red">Rechazada</Badge>;
            case PurchaseOfferStatus.PENDING_SELLER: return <Badge variant="yellow">En Revisión (Vendedor)</Badge>;
            case PurchaseOfferStatus.PENDING_ADMIN: return <Badge variant="gray">Revisión Admin</Badge>;
            case PurchaseOfferStatus.PENDING_BUYER_APPROVAL: return <Badge variant="purple">Por Aprobar</Badge>;
            default: return <Badge variant="gray">{status}</Badge>;
        }
    };

    if (selectedListing && !isMakingOffer) {
        return (
            <div className="animate-fade-in space-y-6">
                <PageHeader 
                    title={selectedListing.title}
                    subtitle={`${selectedListing.category} • ${selectedListing.locationCity}`}
                    backAction={() => setSelectedListing(null)}
                    actions={
                        <Button variant="primary" icon={ShoppingCartIcon} onClick={() => setIsMakingOffer(true)}>
                            Comprar / Ofertar
                        </Button>
                    }
                />
                <Card>
                    <CardHeader title="Detalle de la Publicación" icon={ArchiveBoxIcon} />
                    <CardContent>
                        <ListingDetailView listing={selectedListing} currentUser={currentUser} />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if ((selectedListing || offerToEdit) && isMakingOffer) {
        const targetListing = selectedListing || marketplaceListings.find(l => l.id === offerToEdit?.listingId)!;
        return (
            <div className="animate-fade-in max-w-4xl mx-auto">
               <Card>
                    <div className="flex justify-between items-center px-8 py-6 border-b border-[#F5F7F8] bg-[#FAFBFC] rounded-t-2xl">
                        <div>
                            <h2 className="text-xl font-bold text-[#0A0A0A]">{offerToEdit ? 'Corregir Oferta' : 'Realizar Oferta de Compra'}</h2>
                            <p className="text-[#7A7A7A] text-sm mt-1">{offerToEdit ? 'Ajusta las condiciones según el feedback.' : 'Define tu propuesta para este material.'}</p>
                        </div>
                        <button onClick={() => { setIsMakingOffer(false); setOfferToEdit(null); }} className="text-[#7A7A7A] hover:text-[#0A0A0A] text-2xl">&times;</button>
                    </div>
                    <div className="p-8">
                        {offerToEdit && offerToEdit.rejectionReason && (
                            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r text-sm text-red-800">
                                <strong>Razón de rechazo anterior:</strong> {offerToEdit.rejectionReason}
                            </div>
                        )}
                        <PurchaseOfferForm 
                            listing={targetListing}
                            initialData={offerToEdit || undefined}
                            onSubmit={handleSubmitOffer}
                            onCancel={() => { setIsMakingOffer(false); setOfferToEdit(null); }}
                        />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <Tabs 
                activeTab={view} 
                onChange={(id) => { setView(id); setSelectedListing(null); }}
                tabs={[
                    { id: 'MARKET', label: 'Bodega Virtual', icon: ArchiveBoxIcon },
                    { id: 'OFFERS', label: 'Mis Ofertas Enviadas', count: myOffers.length, icon: ShoppingCartIcon }
                ]} 
            />

            {view === 'MARKET' && (
                <div className="animate-fade-in space-y-6">
                    {/* Filters */}
                    <Card>
                        <div className="p-6 flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-[#007A8A] uppercase tracking-wide mb-1">Categoría</label>
                                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full border-[#D6D6D6] rounded-lg text-sm text-[#0A0A0A] font-medium focus:ring-[#007A8A] focus:border-[#007A8A] bg-[#FAFBFC] py-2 px-3">
                                    <option value="all">Todas</option>
                                    {Object.keys(materialCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-[#007A8A] uppercase tracking-wide mb-1">Departamento</label>
                                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="w-full border-[#D6D6D6] rounded-lg text-sm text-[#0A0A0A] font-medium focus:ring-[#007A8A] focus:border-[#007A8A] bg-[#FAFBFC] py-2 px-3">
                                    <option value="all">Todos</option>
                                    {colombianDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                                </select>
                            </div>
                        </div>
                    </Card>

                    <Section title="Material en Bodega">
                        {availableListings.length === 0 ? (
                            <EmptyState 
                                title="No hay materiales disponibles" 
                                description="Intenta ajustar los filtros para ver más resultados en la bodega." 
                                icon={ArchiveBoxIcon} 
                            />
                        ) : (
                            <Table>
                                <TableHead>
                                    <TableCell isHeader>ID</TableCell>
                                    <TableCell isHeader>Foto</TableCell>
                                    <TableCell isHeader>Categoría / Subcategoría</TableCell>
                                    <TableCell isHeader>Cantidad / Frecuencia</TableCell>
                                    <TableCell isHeader>Vigencia</TableCell>
                                    <TableCell isHeader>Municipio</TableCell>
                                    <TableCell isHeader align="right">Acción</TableCell>
                                </TableHead>
                                <tbody>
                                    {availableListings.map(listing => {
                                        const hasMultiplePhotos = listing.photos && listing.photos.length > 1;
                                        return (
                                            <TableRow key={listing.id} onClick={() => setSelectedListing(listing)}>
                                                <TableCell className="text-xs font-mono text-[#7A7A7A]">{listing.id}</TableCell>
                                                {/* 1. Foto */}
                                                <TableCell>
                                                    <div className="relative h-14 w-14 bg-[#F5F7F8] rounded-xl overflow-hidden flex-shrink-0 border border-[#D6D6D6] flex items-center justify-center group shadow-sm">
                                                        {listing.photos?.[0] ? (
                                                            <img src={listing.photos[0].content} className="w-full h-full object-cover" alt="miniatura" />
                                                        ) : (
                                                            <ArchiveBoxIcon className="w-6 h-6 text-[#D6D6D6]" />
                                                        )}
                                                        {hasMultiplePhotos && (
                                                            <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-lg">
                                                                +{listing.photos.length - 1}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* 2. Categoría / Subcategoría */}
                                                <TableCell>
                                                    <div>
                                                        <div className="font-bold text-[#0A0A0A] text-base">{listing.category}</div>
                                                        <div className="text-sm text-[#007A8A] font-medium">{listing.subcategory || 'General'}</div>
                                                    </div>
                                                </TableCell>
                                                
                                                {/* 3. Cantidad / Frecuencia */}
                                                <TableCell>
                                                    <div className="font-bold text-[#0A0A0A] text-base">
                                                        {listing.quantity} <span className="text-sm font-normal text-[#7A7A7A]">{listing.unit}</span>
                                                    </div>
                                                    <div className="mt-1">
                                                        <span className="inline-block bg-[#F5F7F8] border border-[#D6D6D6] px-2 py-0.5 rounded text-[10px] font-bold text-[#7A7A7A] uppercase tracking-wide">
                                                            {listing.frequency}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* 4. Vigencia */}
                                                <TableCell>
                                                    <div className="text-xs text-[#3D3D3D] space-y-1">
                                                        <div className="flex items-center">
                                                            <span className="w-12 text-[#7A7A7A]">Desde:</span> 
                                                            <span className="font-mono">{listing.validFrom}</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="w-12 text-[#7A7A7A]">Hasta:</span> 
                                                            <span className="font-mono font-bold text-[#B63A3A]">{listing.validUntil}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* 5. Municipio */}
                                                <TableCell>
                                                    <div className="font-bold text-[#0A0A0A] text-sm">{listing.locationCity}</div>
                                                    <div className="text-xs text-[#7A7A7A]">{listing.locationDepartment}</div>
                                                </TableCell>

                                                <TableCell align="right">
                                                    <Button size="sm" variant="secondary">Ver Detalle</Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        )}
                    </Section>
                </div>
            )}

            {view === 'OFFERS' && (
                <div className="animate-fade-in space-y-6">
                    <Section title="Historial de Ofertas">
                        {myOffers.length === 0 ? (
                            <EmptyState 
                                title="No has realizado ofertas" 
                                description="Tus ofertas de compra aparecerán aquí." 
                                icon={ShoppingCartIcon} 
                                action={<Button onClick={() => setView('MARKET')}>Explorar Bodega</Button>}
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {myOffers.map(offer => {
                                    const listing = marketplaceListings.find(l => l.id === offer.listingId);
                                    const seller = users.find(u => u.id === listing?.sellerId);
                                    const sellerDisplay = getPublicUserDisplay(seller, currentUser);
                                    return (
                                        <Card key={offer.id}>
                                            <div className="p-5">
                                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4 border-b border-[#F5F7F8] pb-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-[#7A7A7A] uppercase mb-1">Material</p>
                                                        <p className="text-lg font-bold text-[#0A0A0A]">{listing?.title || 'Publicación no disponible'}</p>
                                                        <p className="text-sm text-[#7A7A7A]">Vendedor: {sellerDisplay.name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-[#7A7A7A] uppercase mb-1">Estado</p>
                                                        {getStatusBadge(offer.status)}
                                                        <p className="text-xs text-[#7A7A7A] mt-1 font-mono">{new Date(offer.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-xs text-[#7A7A7A]">Cantidad</p>
                                                        <p className="font-semibold">{offer.quantityRequested} {listing?.unit}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-[#7A7A7A]">Oferta Total</p>
                                                        <p className="font-bold text-[#007A8A]">${new Intl.NumberFormat('es-CO').format(offer.totalPriceOffered)}</p>
                                                    </div>
                                                </div>

                                                {offer.penaltyFeeAccepted && (
                                                    <div className="mt-4 p-3 bg-[#FCEAEA] rounded-lg border border-[#B63A3A]/20 flex items-start gap-2">
                                                        <ArchiveBoxIcon className="w-4 h-4 text-[#B63A3A] mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-xs font-bold text-[#B63A3A] uppercase">Garantía de Cumplimiento</p>
                                                            <p className="text-xs text-[#B63A3A] mt-0.5">
                                                                Has aceptado la penalidad por no retiro.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {offer.status === PurchaseOfferStatus.REJECTED && (
                                                    <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r shadow-sm">
                                                        <p className="text-xs font-bold text-red-800 uppercase mb-1">Oferta Rechazada</p>
                                                        <p className="text-sm text-red-900">{offer.rejectionReason || 'Sin motivo especificado.'}</p>
                                                        <Button 
                                                            variant="white" 
                                                            size="sm" 
                                                            className="mt-3 text-red-600 border-red-200 hover:bg-red-100"
                                                            icon={PencilIcon}
                                                            onClick={() => handleEditRejected(offer)}
                                                        >
                                                            Corregir y Reenviar
                                                        </Button>
                                                    </div>
                                                )}

                                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#F5F7F8]">
                                                    <Button size="sm" variant="secondary" icon={EyeIcon} onClick={() => setOfferToView(offer)}>Ver Detalle Completo</Button>
                                                    <Button size="sm" variant="outline" icon={DownloadIcon} onClick={() => handleDownloadPdf(offer)}>PDF</Button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </Section>
                </div>
            )}

            {/* Modal de Detalle de Oferta - STANDARD MODAL STYLE */}
            {offerToView && (
                <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-50 flex justify-center items-start pt-10 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[#D6D6D6] overflow-hidden">
                        <div className="px-6 py-5 border-b border-[#F5F7F8] flex justify-between items-center bg-[#FAFBFC]">
                            <div>
                                <h3 className="text-xl font-bold text-[#0A0A0A]">Detalle de tu Oferta</h3>
                                <p className="text-sm text-[#7A7A7A]">Revisa la información enviada.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" icon={DownloadIcon} onClick={() => handleDownloadPdf(offerToView)}>Descargar PDF</Button>
                                <button onClick={() => setOfferToView(null)} className="p-2 rounded-full hover:bg-[#F5F7F8] text-[#7A7A7A] transition-colors text-2xl leading-none">&times;</button>
                            </div>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <PurchaseOfferDetailView 
                                offer={offerToView} 
                                listing={marketplaceListings.find(l => l.id === offerToView.listingId)} 
                                seller={users.find(u => u.id === marketplaceListings.find(l => l.id === offerToView.listingId)?.sellerId)}
                                buyer={currentUser}
                                currentUser={currentUser}
                            />
                        </div>
                        <div className="p-6 bg-[#FAFBFC] border-t border-[#F5F7F8] flex justify-end">
                            <Button variant="secondary" onClick={() => setOfferToView(null)}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuyerMarketplaceDashboard;
