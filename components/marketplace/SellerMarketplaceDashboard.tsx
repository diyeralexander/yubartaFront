
import React, { useMemo, useState } from 'react';
import { User, MarketplaceListing, ListingStatus, PurchaseOffer, PurchaseOfferStatus, Commitment } from '../../types';
import { useData, useNotificationStats } from '../../hooks/useData';
import ListingForm from './ListingForm';
import ListingDetailView from './ListingDetailView';
import PurchaseOfferDetailView from './PurchaseOfferDetailView'; // Import the detail view
import { CheckCircleIcon, XCircleIcon, SpinnerIcon, ArchiveBoxIcon, PlusIcon, TruckIcon, ShoppingCartIcon, DownloadIcon, EyeIcon } from '../icons';
import { Button, Badge, Card, CardHeader, CardContent, PageHeader, EmptyState, Section, Tabs, Table, TableHead, TableRow, TableCell } from '../UI';
import { getPublicUserDisplay } from '../../utils';
import { downloadListingPdf, downloadPurchaseOfferPdf } from '../PdfGenerator';

interface Props {
    currentUser: User;
}

const SellerMarketplaceDashboard = ({ currentUser }: Props) => {
    const { marketplaceListings, createListing, updateListing, generateNewListingId, purchaseOffers, updatePurchaseOffer, users, createCommitment, validateId } = useData();
    const stats = useNotificationStats(currentUser);
    const [view, setView] = useState<'LISTINGS' | 'OFFERS' | 'CREATE'>('LISTINGS');
    
    // State for viewing details
    const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
    const [offerToView, setOfferToView] = useState<PurchaseOffer | null>(null);
    
    // State for Rejection Workflow
    const [offerToReject, setOfferToReject] = useState<PurchaseOffer | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const myListings = useMemo(() => marketplaceListings.filter(l => l.sellerId === currentUser.id).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()), [marketplaceListings, currentUser.id]);
    
    const incomingOffers = useMemo(() => {
        const myListingIds = myListings.map(l => l.id);
        return purchaseOffers.filter(o => myListingIds.includes(o.listingId));
    }, [purchaseOffers, myListings]);

    const handleCreateListing = async (data: Omit<MarketplaceListing, 'id' | 'sellerId' | 'status' | 'createdAt'>) => {
        const newListing: MarketplaceListing = {
            ...data,
            id: generateNewListingId(), // M2-LST-...
            sellerId: currentUser.id,
            status: ListingStatus.PENDING_ADMIN,
            createdAt: new Date()
        };
        try {
            await createListing(newListing);
            setView('LISTINGS');
        } catch (error) {
            alert('Error al crear la publicación: ' + (error as Error).message);
        }
    };

    const handleAcceptOffer = async (offerId: string) => {
        setIsProcessing(true);
        const offer = purchaseOffers.find(o => o.id === offerId);
        if (!offer) {
            setIsProcessing(false);
            return;
        }

        // VALIDATION: Relaxed check for Legacy Support
        if (!validateId(offer.id, 'M2', 'BID') || !validateId(offer.listingId, 'M2', 'LST')) {
            console.warn('Warning: Processing decision on legacy data format. Proceeding...');
        }

        try {
            // 1. Update purchase offer status
            await updatePurchaseOffer(offerId, { status: PurchaseOfferStatus.ACCEPTED });

            // 2. Generate Commitment ID and create commitment
            const comDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const comRandom = Math.random().toString(36).substring(2, 6).toUpperCase();
            const newCommitmentId = `M2-COM-${comDate}-${comRandom}`;

            const newCommitment: Commitment = {
                id: newCommitmentId,
                offerId: offer.id,
                requirementId: offer.listingId,
                volume: offer.quantityRequested
            };
            await createCommitment(newCommitment);

            // 3. Update listing quantity and status
            const listing = marketplaceListings.find(l => l.id === offer.listingId);
            if (listing) {
                const newQuantity = Math.max(0, listing.quantity - offer.quantityRequested);
                const newStatus = newQuantity === 0 ? ListingStatus.SOLD : listing.status;
                await updateListing(offer.listingId, { quantity: newQuantity, status: newStatus });
            }

            alert('Oferta aceptada. Inventario actualizado.');
            setOfferToView(null);
        } catch (error) {
            alert('Error al aceptar la oferta: ' + (error as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectOffer = async () => {
        if (!offerToReject || !rejectionReason.trim()) {
            alert("Por favor indique una razón para el rechazo.");
            return;
        }
        setIsProcessing(true);
        try {
            await updatePurchaseOffer(offerToReject.id, {
                status: PurchaseOfferStatus.REJECTED,
                rejectionReason: rejectionReason
            });
            setOfferToReject(null);
            setOfferToView(null);
            setRejectionReason('');
            alert('Oferta rechazada y motivo enviado al comprador.');
        } catch (error) {
            alert('Error al rechazar la oferta: ' + (error as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadListingPdf = (listing: MarketplaceListing) => {
        downloadListingPdf(listing, currentUser, currentUser);
    };

    const handleDownloadOfferPdf = (offer: PurchaseOffer) => {
        const listing = myListings.find(l => l.id === offer.listingId);
        const buyer = users.find(u => u.id === offer.buyerId);
        if (listing && buyer) {
            downloadPurchaseOfferPdf(offer, listing, buyer, currentUser, currentUser);
        }
    };

    if (view === 'CREATE') {
        return (
            <div className="max-w-4xl mx-auto animate-fade-in">
                <Card>
                    <div className="flex justify-between items-center px-8 py-6 border-b border-[#F5F7F8] bg-[#FAFBFC] rounded-t-2xl">
                        <div>
                            <h2 className="text-xl font-bold text-[#0A0A0A]">Nueva Publicación</h2>
                            <p className="text-[#7A7A7A] text-sm mt-1">Completa la información para publicar tu material.</p>
                        </div>
                        <button onClick={() => setView('LISTINGS')} className="text-[#7A7A7A] hover:text-[#0A0A0A] text-2xl">&times;</button>
                    </div>
                    <div className="p-8">
                        <ListingForm onSubmit={handleCreateListing} onCancel={() => setView('LISTINGS')} />
                    </div>
                </Card>
            </div>
        );
    }

    if (selectedListing) {
        return (
            <div className="animate-fade-in space-y-6">
                <PageHeader 
                    title={selectedListing.title}
                    subtitle={`Detalle de publicación • ${selectedListing.status}`}
                    backAction={() => setSelectedListing(null)}
                    actions={
                        <Button variant="outline" icon={DownloadIcon} onClick={() => handleDownloadListingPdf(selectedListing)}>
                            Descargar Comprobante PDF
                        </Button>
                    }
                />
                <Card>
                    <CardHeader title="Información del Material" icon={ArchiveBoxIcon} />
                    <CardContent>
                        <ListingDetailView listing={selectedListing} seller={currentUser} currentUser={currentUser} />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <PageHeader 
                title="Gestión de Inventario" 
                subtitle="Publica tu material y revisa ofertas de compra."
                actions={
                    <Button onClick={() => setView('CREATE')} icon={PlusIcon} variant="primary">Publicar Material</Button>
                }
            />

            <Tabs 
                activeTab={view} 
                onChange={(id) => setView(id)}
                tabs={[
                    { id: 'LISTINGS', label: 'Mis Publicaciones', icon: ArchiveBoxIcon },
                    { id: 'OFFERS', label: 'Ofertas Recibidas', count: incomingOffers.filter(o => o.status === PurchaseOfferStatus.PENDING_SELLER).length > 0 ? stats.marketplace : undefined, icon: ShoppingCartIcon }
                ]} 
            />

            {view === 'LISTINGS' && (
                <div className="animate-fade-in">
                    <Section title="Mis Publicaciones">
                        {myListings.length === 0 ? (
                            <EmptyState title="Sin publicaciones" description="Publica tu primer lote de material para empezar a vender." icon={ArchiveBoxIcon} />
                        ) : (
                            <Table>
                                <TableHead>
                                    <TableCell isHeader>ID</TableCell>
                                    <TableCell isHeader>Foto</TableCell>
                                    <TableCell isHeader>Categoría / Subcategoría</TableCell>
                                    <TableCell isHeader>Cantidad / Frecuencia</TableCell>
                                    <TableCell isHeader>Vigencia</TableCell>
                                    <TableCell isHeader>Municipio</TableCell>
                                    <TableCell isHeader>Estado</TableCell>
                                    <TableCell isHeader align="right">Acción</TableCell>
                                </TableHead>
                                <tbody>
                                    {myListings.map(listing => (
                                        <TableRow key={listing.id} onClick={() => setSelectedListing(listing)}>
                                            <TableCell className="text-xs font-mono text-[#7A7A7A]">{listing.id}</TableCell>
                                            {/* 1. Foto */}
                                            <TableCell>
                                                <div className="h-12 w-12 bg-[#F5F7F8] rounded-lg overflow-hidden flex-shrink-0 border border-[#D6D6D6] flex items-center justify-center">
                                                    {listing.photos?.[0] ? (
                                                        <img src={listing.photos[0].content} className="w-full h-full object-cover" alt="miniatura" />
                                                    ) : (
                                                        <ArchiveBoxIcon className="w-5 h-5 text-[#7A7A7A]" />
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* 2. Categoría / Subcategoría */}
                                            <TableCell>
                                                <div>
                                                    <div className="font-bold text-[#0A0A0A] text-sm">{listing.category}</div>
                                                    <div className="text-xs text-[#007A8A] font-medium">{listing.subcategory || 'General'}</div>
                                                </div>
                                            </TableCell>

                                            {/* 3. Cantidad / Frecuencia */}
                                            <TableCell>
                                                <div className="font-bold text-[#0A0A0A]">
                                                    {listing.quantity} <span className="text-xs font-normal text-[#7A7A7A]">{listing.unit}</span>
                                                </div>
                                                <div className="mt-1">
                                                    <span className="inline-block bg-[#F5F7F8] border border-[#D6D6D6] px-1.5 py-0.5 rounded text-[10px] font-bold text-[#7A7A7A] uppercase tracking-wide">
                                                        {listing.frequency}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* 4. Vigencia */}
                                            <TableCell>
                                                <div className="text-xs text-[#3D3D3D] space-y-0.5">
                                                    <div><span className="text-[#7A7A7A]">Inicia:</span> {listing.validFrom}</div>
                                                    <div><span className="text-[#7A7A7A]">Finaliza:</span> <span className="font-bold">{listing.validUntil}</span></div>
                                                </div>
                                            </TableCell>

                                            {/* 5. Municipio */}
                                            <TableCell>
                                                <div className="font-bold text-[#0A0A0A] text-sm">{listing.locationCity}</div>
                                                <div className="text-xs text-[#7A7A7A]">{listing.locationDepartment}</div>
                                            </TableCell>

                                            {/* Estado */}
                                            <TableCell>
                                                <Badge variant={
                                                    listing.status === ListingStatus.ACTIVE ? 'green' :
                                                    listing.status === ListingStatus.PENDING_ADMIN ? 'yellow' :
                                                    listing.status === ListingStatus.SOLD ? 'blue' : 
                                                    listing.status === ListingStatus.REJECTED ? 'red' : 'gray'
                                                }>{listing.status}</Badge>
                                            </TableCell>

                                            {/* Acción */}
                                            <TableCell align="right">
                                                <Button size="sm" variant="secondary">Ver Detalle</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </Section>
                </div>
            )}

            {view === 'OFFERS' && (
                <div className="animate-fade-in">
                    <Section title="Ofertas Recibidas">
                        {incomingOffers.length === 0 ? (
                            <EmptyState title="Bandeja vacía" description="No tienes ofertas de compra pendientes." icon={TruckIcon} />
                        ) : (
                            <div className="space-y-4">
                                {incomingOffers.map(offer => {
                                    const listing = myListings.find(l => l.id === offer.listingId);
                                    const buyer = users.find(u => u.id === offer.buyerId);
                                    const buyerDisplay = getPublicUserDisplay(buyer, currentUser);
                                    
                                    if (offer.status === PurchaseOfferStatus.PENDING_ADMIN) return null;
                                    const showCertificateWarning = listing?.requiresCertificate && offer.canProvideCertificate === false;

                                    return (
                                        <Card key={offer.id} className="p-0 overflow-hidden">
                                            <div className="px-5 py-4 border-b border-[#F5F7F8] bg-[#FAFBFC] flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-[#007A8A] font-bold uppercase tracking-wide mb-1">Para: {listing?.title}</p>
                                                    <p className="text-sm font-bold text-[#0A0A0A]">{buyerDisplay.name}</p>
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    {offer.status === PurchaseOfferStatus.PENDING_SELLER && <Badge variant="yellow">Requiere Acción</Badge>}
                                                    {offer.status === PurchaseOfferStatus.ACCEPTED && <Badge variant="green">Aceptada</Badge>}
                                                    {offer.status === PurchaseOfferStatus.REJECTED && <Badge variant="red">Rechazada</Badge>}
                                                    <Button variant="outline" size="sm" icon={DownloadIcon} onClick={() => handleDownloadOfferPdf(offer)}>PDF</Button>
                                                </div>
                                            </div>
                                            
                                            <div className="p-5">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div>
                                                        <p className="text-xs text-[#7A7A7A] uppercase font-bold">Cantidad</p>
                                                        <p className="text-lg font-bold text-[#0A0A0A]">{offer.quantityRequested}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-[#7A7A7A] uppercase font-bold">Total Ofertado</p>
                                                        <p className="text-lg font-bold text-[#007A8A]">${new Intl.NumberFormat('es-CO').format(offer.totalPriceOffered)}</p>
                                                    </div>
                                                </div>
                                                
                                                {showCertificateWarning && (
                                                    <div className="mb-4 p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-800 flex items-start">
                                                        <span className="mr-2 text-lg leading-none">⚠️</span>
                                                        <p><strong>Atención:</strong> El comprador indicó que <u>NO</u> puede emitir el Certificado de Disposición Final.</p>
                                                    </div>
                                                )}
                                                
                                                <div className="bg-[#F5F7F8] rounded-lg p-3 text-xs text-[#7A7A7A] space-y-1 mb-4">
                                                    <p><strong className="text-[#3D3D3D]">Pago:</strong> {offer.condicionesPagoPropuestas}</p>
                                                    <p><strong className="text-[#3D3D3D]">Recogida:</strong> {offer.aceptaUbicacion ? 'Acepta Ubicación' : `Propone: ${offer.contrapropuestaLogistica}`}</p>
                                                </div>
                                                
                                                {offer.status === PurchaseOfferStatus.REJECTED && (
                                                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800">
                                                        <strong>Motivo Rechazo:</strong> {offer.rejectionReason}
                                                    </div>
                                                )}

                                                <div className="flex justify-end gap-2 pt-4 border-t border-[#F5F7F8]">
                                                    <Button variant="secondary" size="sm" icon={EyeIcon} onClick={() => setOfferToView(offer)}>Ver Detalle Completo</Button>
                                                    
                                                    {offer.status === PurchaseOfferStatus.PENDING_SELLER && (
                                                        <>
                                                            <Button variant="danger" size="sm" onClick={() => setOfferToReject(offer)} disabled={isProcessing}>Rechazar</Button>
                                                            <Button variant="success" size="sm" onClick={() => handleAcceptOffer(offer.id)} isLoading={isProcessing}>Aceptar Oferta</Button>
                                                        </>
                                                    )}
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

            {/* FULL OFFER DETAIL MODAL */}
            {offerToView && (
                <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-50 flex justify-center items-start pt-10 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-[#D6D6D6] overflow-hidden">
                        <div className="px-6 py-5 border-b border-[#F5F7F8] flex justify-between items-center bg-[#FAFBFC]">
                            <div>
                                <h3 className="text-xl font-bold text-[#0A0A0A]">Detalle Completo de Oferta</h3>
                                <p className="text-sm text-[#7A7A7A]">Revisa todas las condiciones antes de aceptar.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" icon={DownloadIcon} onClick={() => handleDownloadOfferPdf(offerToView)}>Descargar PDF</Button>
                                <button onClick={() => setOfferToView(null)} className="p-2 rounded-full hover:bg-[#F5F7F8] text-[#7A7A7A] transition-colors text-2xl leading-none">&times;</button>
                            </div>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <PurchaseOfferDetailView 
                                offer={offerToView} 
                                listing={myListings.find(l => l.id === offerToView.listingId)} 
                                seller={currentUser}
                                buyer={users.find(u => u.id === offerToView.buyerId)}
                                currentUser={currentUser}
                            />
                        </div>
                        <div className="p-6 bg-[#FAFBFC] border-t border-[#F5F7F8] flex justify-end gap-3">
                            {offerToView.status === PurchaseOfferStatus.PENDING_SELLER ? (
                                <>
                                    <Button variant="danger" onClick={() => { setOfferToReject(offerToView); setOfferToView(null); }} disabled={isProcessing}>Rechazar Oferta</Button>
                                    <Button variant="success" onClick={() => handleAcceptOffer(offerToView.id)} isLoading={isProcessing}>Aceptar Oferta</Button>
                                </>
                            ) : (
                                <Button variant="secondary" onClick={() => setOfferToView(null)}>Cerrar</Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* REJECTION MODAL */}
            {offerToReject && (
                <div className="fixed inset-0 bg-[#0A0A0A]/50 backdrop-blur-sm z-[60] flex justify-center items-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-[#D6D6D6]">
                        <h3 className="text-lg font-bold text-[#0A0A0A] mb-2">Rechazar Oferta</h3>
                        <p className="text-sm text-[#7A7A7A] mb-4">
                            Indica al comprador por qué estás rechazando su oferta. Esta información le permitirá ajustar su propuesta si lo desea.
                        </p>
                        <textarea 
                            className="w-full border border-[#D6D6D6] rounded-lg p-3 text-sm focus:ring-[#007A8A] focus:border-[#007A8A] min-h-[100px] mb-4"
                            placeholder="Ej: El precio propuesto es muy bajo, o la fecha de recogida no me sirve..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        ></textarea>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => { setOfferToReject(null); setRejectionReason(''); }}>Cancelar</Button>
                            <Button variant="danger" onClick={handleRejectOffer} isLoading={isProcessing}>Confirmar Rechazo</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerMarketplaceDashboard;
