
import React, { useState, useMemo } from 'react';
import { User, ListingStatus, PurchaseOfferStatus, MarketplaceListing, PurchaseOffer, Role } from '../../types';
import { useData } from '../../hooks/useData';
import ListingDetailView from './ListingDetailView';
import ListingForm from './ListingForm';
import PurchaseOfferForm from './PurchaseOfferForm';
import PurchaseOfferDetailView from './PurchaseOfferDetailView'; 
import { SpinnerIcon, XCircleIcon, ArchiveBoxIcon, ShoppingCartIcon, PencilIcon, TrashIcon, PlusIcon, ClipboardListIcon, DatabaseIcon, EyeIcon, CheckCircleIcon, DownloadIcon, TruckIcon } from '../icons';
import { Button, Badge, Card, CardHeader, CardContent, PageHeader, EmptyState, Section, Tabs, Table, TableHead, TableRow, TableCell } from '../UI';
import { getPublicUserDisplay } from '../../utils';

declare var XLSX: any;

interface Props {
    currentUser: User;
}

type AdminTab = 'OPERATIONS' | 'ARCHIVE' | 'REPORTS';
type OperationsView = 'LISTING' | 'OFFER';

// FIXED: Component moved outside to prevent re-creation on every render (Error #310)
const StatusSelector = ({ current, type, id, onChange }: { current: string, type: 'LISTING' | 'OFFER', id: string, onChange: (type: 'LISTING' | 'OFFER', id: string, val: string) => void }) => (
    <select 
        className="text-xs border-[#D6D6D6] rounded-lg py-1 pl-2 pr-6 bg-[#FAFBFC] text-[#3D3D3D] focus:ring-[#007A8A] focus:border-[#007A8A] cursor-pointer hover:bg-white transition-colors"
        value={current}
        onChange={(e) => onChange(type, id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
    >
        {type === 'LISTING' 
            ? Object.values(ListingStatus).map(s => <option key={s} value={s}>{s}</option>)
            : Object.values(PurchaseOfferStatus).map(s => <option key={s} value={s}>{s}</option>)
        }
    </select>
);

const AdminMarketplaceDashboard = ({ currentUser }: Props) => {
    const {
        marketplaceListings, purchaseOffers, users,
        createListing, updateListing,
        createPurchaseOffer, updatePurchaseOffer,
        generateNewListingId, generateNewPurchaseOfferId
    } = useData();
    const [activeTab, setActiveTab] = useState<AdminTab>('OPERATIONS');
    const [opsView, setOpsView] = useState<OperationsView>('LISTING');
    
    // Action State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<'LISTING' | 'OFFER' | null>(null);
    const [selectedUser, setSelectedUser] = useState('');
    const [targetListing, setTargetListing] = useState<MarketplaceListing | null>(null);
    const [editingItem, setEditingItem] = useState<{type: 'LISTING' | 'OFFER', data: any} | null>(null);

    // Detail & Moderation State
    const [viewItem, setViewItem] = useState<{type: 'LISTING' | 'OFFER', data: any} | null>(null);
    const [actionPrompt, setActionPrompt] = useState<{type: 'RETURN' | 'REJECT', itemType: 'LISTING' | 'OFFER', itemId: string} | null>(null);
    const [feedbackText, setFeedbackText] = useState('');

    // --- LISTS & FILTERS ---
    const activeListings = useMemo(() => marketplaceListings.filter(l => l.status !== ListingStatus.REJECTED && l.status !== ListingStatus.SOLD && l.status !== ListingStatus.HIDDEN_BY_ADMIN), [marketplaceListings]);
    const archivedListings = useMemo(() => marketplaceListings.filter(l => l.status === ListingStatus.REJECTED || l.status === ListingStatus.SOLD || l.status === ListingStatus.HIDDEN_BY_ADMIN), [marketplaceListings]);
    
    const pendingListingsCount = useMemo(() => activeListings.filter(l => l.status === ListingStatus.PENDING_ADMIN).length, [activeListings]);

    const activeOffers = useMemo(() => purchaseOffers.filter(o => o.status !== PurchaseOfferStatus.REJECTED && o.status !== PurchaseOfferStatus.HIDDEN_BY_ADMIN), [purchaseOffers]);
    const archivedOffers = useMemo(() => purchaseOffers.filter(o => o.status === PurchaseOfferStatus.REJECTED || o.status === PurchaseOfferStatus.HIDDEN_BY_ADMIN), [purchaseOffers]);
    
    const pendingOffersCount = useMemo(() => activeOffers.filter(o => o.status === PurchaseOfferStatus.PENDING_ADMIN).length, [activeOffers]);

    const buyers = users.filter(u => u.role === Role.BUYER);
    const sellers = users.filter(u => u.role === Role.SELLER);

    // --- ACTIONS ---
    const handleForceStatusChange = async (type: 'LISTING' | 'OFFER', id: string, newStatus: string) => {
        if (!window.confirm(`⚠️ SUPER ADMIN: ¿Forzar estado a "${newStatus}"?`)) return;
        try {
            if (type === 'LISTING') {
                await updateListing(id, { status: newStatus as ListingStatus });
            } else {
                await updatePurchaseOffer(id, { status: newStatus as PurchaseOfferStatus });
            }
        } catch (err: any) {
            alert('Error al cambiar estado: ' + err.message);
        }
    };

    const handleQuickApprove = async (type: 'LISTING' | 'OFFER', id: string) => {
        try {
            if (type === 'LISTING') {
                await updateListing(id, { status: ListingStatus.ACTIVE });
            } else {
                await updatePurchaseOffer(id, { status: PurchaseOfferStatus.PENDING_SELLER });
            }
        } catch (err: any) {
            alert('Error al aprobar: ' + err.message);
        }
    };

    const handleCreateListingOnBehalf = async (data: any) => {
        if (!selectedUser) return;
        try {
            const newListing: Partial<MarketplaceListing> = {
                ...data,
                id: generateNewListingId(),
                sellerId: selectedUser,
                status: ListingStatus.PENDING_SELLER_APPROVAL,
                createdAt: new Date(),
                createdByAdmin: true,
            };
            await createListing(newListing);
            setIsFormOpen(false);
            alert('Publicación creada. Vendedor debe aprobarla.');
        } catch (err: any) {
            alert('Error al crear publicación: ' + err.message);
        }
    };

    const handleCreateOfferOnBehalf = async (data: any) => {
        if (!selectedUser || !targetListing) return;
        try {
            const newOffer: Partial<PurchaseOffer> = {
                ...data,
                id: generateNewPurchaseOfferId(),
                listingId: targetListing.id,
                buyerId: selectedUser,
                status: PurchaseOfferStatus.PENDING_BUYER_APPROVAL,
                createdAt: new Date(),
                createdByAdmin: true,
            };
            await createPurchaseOffer(newOffer);
            setIsFormOpen(false);
            alert('Oferta creada. Comprador debe aprobarla.');
        } catch (err: any) {
            alert('Error al crear oferta: ' + err.message);
        }
    };

    const handleUpdateData = async (type: 'LISTING' | 'OFFER', data: any) => {
        try {
            if (type === 'LISTING') {
                await updateListing(data.id, data);
                if (viewItem?.type === 'LISTING' && viewItem.data.id === data.id) {
                    setViewItem({ type: 'LISTING', data: { ...viewItem.data, ...data } });
                }
            } else {
                await updatePurchaseOffer(data.id, data);
                if (viewItem?.type === 'OFFER' && viewItem.data.id === data.id) {
                    setViewItem({ type: 'OFFER', data: { ...viewItem.data, ...data } });
                }
            }
            setEditingItem(null);
            alert('Datos actualizados.');
        } catch (err: any) {
            alert('Error al actualizar: ' + err.message);
        }
    };

    const handleProcessAction = async () => {
        if (!actionPrompt) return;
        const { type, itemType, itemId } = actionPrompt;

        if (!feedbackText.trim()) {
            alert("Por favor ingrese un motivo o comentario.");
            return;
        }

        const reason = `${type === 'RETURN' ? 'DEVOLUCIÓN (Corregir): ' : 'RECHAZO: '} ${feedbackText}`;

        try {
            if (itemType === 'LISTING') {
                await updateListing(itemId, { status: ListingStatus.REJECTED, rejectionReason: reason });
            } else {
                await updatePurchaseOffer(itemId, { status: PurchaseOfferStatus.REJECTED, rejectionReason: reason });
            }

            setActionPrompt(null);
            setFeedbackText('');
            setViewItem(null);
            alert(`Acción procesada: ${type === 'RETURN' ? 'Devuelto para ajustes' : 'Rechazado'}.`);
        } catch (err: any) {
            alert('Error al procesar acción: ' + err.message);
        }
    };

    // --- EXPORT ---
    const exportFullData = () => {
        const allListings = [...marketplaceListings];
        const allOffers = [...purchaseOffers];

        const listingsData = allListings.map(l => {
            const seller = users.find(u => u.id === l.sellerId);
            return {
                ID_Publicacion: l.id,
                Estado: l.status,
                Fecha_Creacion: l.createdAt.toISOString().split('T')[0],
                Vendedor_ID: l.sellerId,
                Vendedor_Nombre: seller?.name || 'N/A',
                Titulo: l.title,
                Categoria: l.category,
                Subcategoria: l.subcategory || 'N/A',
                Cantidad: l.quantity,
                Unidad: l.unit,
                Precio_Unitario: l.pricePerUnit,
                Moneda: l.currency,
                Ubicacion_Ciudad: l.locationCity,
                Ubicacion_Depto: l.locationDepartment,
                Vigencia_Desde: l.validFrom,
                Vigencia_Hasta: l.validUntil,
                Descripcion: l.description,
                Motivo_Rechazo: l.rejectionReason || 'N/A',
                Creado_Por_Admin: l.createdByAdmin ? 'Sí' : 'No'
            };
        });

        const offersData = allOffers.map(o => {
            const buyer = users.find(u => u.id === o.buyerId);
            const listing = allListings.find(l => l.id === o.listingId);
            const seller = listing ? users.find(u => u.id === listing.sellerId) : null;

            return {
                ID_Oferta: o.id,
                ID_Publicacion: o.listingId,
                Titulo_Publicacion: listing?.title || 'HUÉRFANA',
                Estado: o.status,
                Fecha_Oferta: o.createdAt.toISOString().split('T')[0],
                Comprador_ID: o.buyerId,
                Comprador_Nombre: buyer?.name || 'N/A',
                Vendedor_Nombre: seller?.name || 'N/A',
                Cantidad_Solicitada: o.quantityRequested,
                Precio_Total_Oferta: o.totalPriceOffered,
                Acepta_Precio_Lista: o.aceptaPrecio ? 'Sí' : 'No',
                Contrapropuesta_Precio: o.contrapropuestaPrecio || 'N/A',
                Metodo_Pago: o.metodoPagoPropuesto,
                Condiciones_Pago: o.condicionesPagoPropuestas,
                Logistica_Vehiculo: o.tipoVehiculo,
                Acepta_Ubicacion: o.aceptaUbicacion ? 'Sí' : 'No',
                Contrapropuesta_Logistica: o.contrapropuestaLogistica || 'N/A',
                Fecha_Recogida: o.fechaRecogida,
                Mensaje: o.message || 'N/A',
                Motivo_Rechazo: o.rejectionReason || 'N/A',
                Creado_Por_Admin: o.createdByAdmin ? 'Sí' : 'No'
            };
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(listingsData), "Publicaciones");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offersData), "Ofertas de Compra");
        XLSX.writeFile(wb, `Reporte_Bodega_SupplyX_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-8 pb-12 font-sans">
            
            <Tabs 
                activeTab={activeTab} 
                onChange={(id) => setActiveTab(id)}
                tabs={[
                    { id: 'OPERATIONS', label: 'Operaciones', icon: ClipboardListIcon },
                    { id: 'ARCHIVE', label: 'Historial/Archivo', icon: ArchiveBoxIcon },
                    { id: 'REPORTS', label: 'Descargar Reportes', icon: DownloadIcon },
                ]} 
            />

            {activeTab === 'REPORTS' && (
                <div className="animate-fade-in">
                    <Card className="max-w-2xl mx-auto text-center p-10">
                        <div className="w-16 h-16 bg-[#E3FAF6] text-[#007A8A] rounded-full flex items-center justify-center mx-auto mb-6">
                            <DatabaseIcon className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-2">Exportación Completa de Bodega</h2>
                        <p className="text-[#7A7A7A] mb-8 max-w-md mx-auto">
                            Descarga un archivo Excel con el 100% de la información de Publicaciones y Ofertas (Activas, Cerradas, Eliminadas) con trazabilidad completa.
                        </p>
                        <Button size="lg" onClick={exportFullData} icon={DownloadIcon} fullWidth>
                            Descargar Reporte Maestro
                        </Button>
                    </Card>
                </div>
            )}

            {activeTab === 'OPERATIONS' && (
                <div className="space-y-6 animate-fade-in">
                    
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="bg-white p-1 rounded-lg border border-[#D6D6D6] inline-flex shadow-sm">
                            <button
                                onClick={() => setOpsView('LISTING')}
                                className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all gap-2 ${opsView === 'LISTING' ? 'bg-[#003F4A] text-white shadow-sm' : 'text-[#7A7A7A] hover:bg-[#F5F7F8]'}`}
                            >
                                <ArchiveBoxIcon className="w-4 h-4" />
                                Publicaciones
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ml-1 ${opsView === 'LISTING' ? 'bg-[#005B6A] text-[#D7EEF0]' : 'bg-[#F5F7F8] text-[#7A7A7A] border border-[#D6D6D6]'}`}>
                                    {activeListings.length}
                                </span>
                                {pendingListingsCount > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md ml-1 bg-yellow-500 text-white font-bold animate-pulse">
                                        {pendingListingsCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setOpsView('OFFER')}
                                className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all gap-2 ${opsView === 'OFFER' ? 'bg-[#003F4A] text-white shadow-sm' : 'text-[#7A7A7A] hover:bg-[#F5F7F8]'}`}
                            >
                                <ShoppingCartIcon className="w-4 h-4" />
                                Ofertas de Compra
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ml-1 ${opsView === 'OFFER' ? 'bg-[#005B6A] text-[#D7EEF0]' : 'bg-[#F5F7F8] text-[#7A7A7A] border border-[#D6D6D6]'}`}>
                                    {activeOffers.length}
                                </span>
                                {pendingOffersCount > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md ml-1 bg-yellow-500 text-white font-bold animate-pulse">
                                        {pendingOffersCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => { setFormMode('LISTING'); setSelectedUser(''); setIsFormOpen(true); }} icon={PlusIcon}>Publicar (x Vendedor)</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setFormMode('OFFER'); setSelectedUser(''); setIsFormOpen(true); }} icon={PlusIcon}>Ofertar (x Comprador)</Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#D6D6D6] shadow-sm overflow-hidden min-h-[400px]">
                        {opsView === 'LISTING' ? (
                            <>
                                <div className="px-6 py-4 border-b border-[#F5F7F8] bg-[#FAFBFC]">
                                    <h3 className="font-bold text-[#0A0A0A]">Gestión de Publicaciones</h3>
                                    <p className="text-xs text-[#7A7A7A]">Material disponible publicado por vendedores.</p>
                                </div>
                                {activeListings.length === 0 ? (
                                    <EmptyState title="Sin publicaciones" description="No hay material activo en la bodega." icon={ArchiveBoxIcon} />
                                ) : (
                                    <Table className="border-none rounded-none shadow-none">
                                        <TableHead>
                                            <TableCell isHeader>Título</TableCell>
                                            <TableCell isHeader>Vendedor</TableCell>
                                            <TableCell isHeader>Estado (Forzar)</TableCell>
                                            <TableCell isHeader align="right">Acciones</TableCell>
                                        </TableHead>
                                        <tbody>
                                            {activeListings.map(l => (
                                                <TableRow key={l.id} className={l.status === ListingStatus.PENDING_ADMIN ? 'bg-yellow-50/50' : ''}>
                                                    <TableCell>
                                                        <div className="font-bold text-[#0A0A0A]">{l.title}</div>
                                                        <div className="text-xs text-[#7A7A7A]">{l.quantity} {l.unit} • {l.locationCity}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">{users.find(u => u.id === l.sellerId)?.name}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusSelector current={l.status} type="LISTING" id={l.id} onChange={handleForceStatusChange} />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <div className="flex justify-end gap-2">
                                                            {l.status === ListingStatus.PENDING_ADMIN && (
                                                                <button onClick={() => handleQuickApprove('LISTING', l.id)} className="p-1.5 text-white bg-green-600 hover:bg-green-700 rounded transition-colors font-bold flex items-center text-xs shadow-sm mr-2">
                                                                    <CheckCircleIcon className="w-3 h-3 mr-1"/> Aprobar
                                                                </button>
                                                            )}
                                                            <button onClick={() => setViewItem({type: 'LISTING', data: l})} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition-colors font-bold flex items-center text-xs border border-teal-200" title="Ver Detalle Completo">
                                                                <EyeIcon className="w-3 h-3 mr-1"/> Ver
                                                            </button>
                                                            <button onClick={() => setEditingItem({type: 'LISTING', data: l})} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><PencilIcon className="w-4 h-4"/></button>
                                                            <button onClick={() => handleForceStatusChange('LISTING', l.id, ListingStatus.HIDDEN_BY_ADMIN)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Archivar"><TrashIcon className="w-4 h-4"/></button>
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
                                    <h3 className="font-bold text-[#0A0A0A]">Gestión de Ofertas de Compra</h3>
                                    <p className="text-xs text-[#7A7A7A]">Transacciones iniciadas por compradores.</p>
                                </div>
                                {activeOffers.length === 0 ? (
                                    <EmptyState title="Sin ofertas" description="No hay ofertas de compra activas." icon={ShoppingCartIcon} />
                                ) : (
                                    <Table className="border-none rounded-none shadow-none">
                                        <TableHead>
                                            <TableCell isHeader>Oferta Total</TableCell>
                                            <TableCell isHeader>Para (Publicación)</TableCell>
                                            <TableCell isHeader>Comprador</TableCell>
                                            <TableCell isHeader>Estado (Forzar)</TableCell>
                                            <TableCell isHeader align="right">Acciones</TableCell>
                                        </TableHead>
                                        <tbody>
                                            {activeOffers.map(o => {
                                                const listing = marketplaceListings.find(l => l.id === o.listingId);
                                                return (
                                                    <TableRow key={o.id} className={o.status === PurchaseOfferStatus.PENDING_ADMIN ? 'bg-yellow-50/50' : ''}>
                                                        <TableCell>
                                                            <div className="font-bold text-[#0A0A0A]">${new Intl.NumberFormat('es-CO').format(o.totalPriceOffered)}</div>
                                                            <div className="text-xs text-[#7A7A7A]">{o.quantityRequested} {listing?.unit}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-xs text-[#7A7A7A] truncate max-w-[150px] block" title={listing?.title}>{listing?.title}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm">{users.find(u => u.id === o.buyerId)?.name}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <StatusSelector current={o.status} type="OFFER" id={o.id} onChange={handleForceStatusChange} />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <div className="flex justify-end gap-2">
                                                                {o.status === PurchaseOfferStatus.PENDING_ADMIN && (
                                                                    <button onClick={() => handleQuickApprove('OFFER', o.id)} className="p-1.5 text-white bg-green-600 hover:bg-green-700 rounded transition-colors font-bold flex items-center text-xs shadow-sm mr-2">
                                                                        <CheckCircleIcon className="w-3 h-3 mr-1"/> Aprobar
                                                                    </button>
                                                                )}
                                                                <button onClick={() => setViewItem({type: 'OFFER', data: o})} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition-colors font-bold flex items-center text-xs border border-teal-200" title="Ver Detalle Completo">
                                                                    <EyeIcon className="w-3 h-3 mr-1"/> Ver
                                                                </button>
                                                                <button onClick={() => setEditingItem({type: 'OFFER', data: o})} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><PencilIcon className="w-4 h-4"/></button>
                                                                <button onClick={() => handleForceStatusChange('OFFER', o.id, PurchaseOfferStatus.HIDDEN_BY_ADMIN)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Archivar"><TrashIcon className="w-4 h-4"/></button>
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

            {activeTab === 'ARCHIVE' && (
                <div className="space-y-8 animate-fade-in">
                    <Section title="Historial de Bodega">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-sm font-bold text-[#7A7A7A] uppercase mb-4 tracking-wide">Publicaciones Cerradas</h4>
                                <Table>
                                    <tbody>
                                    {archivedListings.map(l => (
                                        <TableRow key={l.id}>
                                            <TableCell>
                                                <span className="text-sm font-bold text-[#0A0A0A]">{l.title}</span>
                                                <Badge variant="gray">{l.status}</Badge>
                                            </TableCell>
                                            <TableCell align="right">
                                                <button onClick={() => handleForceStatusChange('LISTING', l.id, ListingStatus.ACTIVE)} className="text-xs text-blue-600 font-bold hover:underline">Reactivar</button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    </tbody>
                                </Table>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-[#7A7A7A] uppercase mb-4 tracking-wide">Ofertas Cerradas</h4>
                                <Table>
                                    <tbody>
                                    {archivedOffers.map(o => (
                                        <TableRow key={o.id}>
                                            <TableCell>
                                                <span className="text-sm font-bold text-[#0A0A0A]">${new Intl.NumberFormat('es-CO').format(o.totalPriceOffered)}</span>
                                                <Badge variant="gray">{o.status}</Badge>
                                            </TableCell>
                                            <TableCell align="right">
                                                <button onClick={() => handleForceStatusChange('OFFER', o.id, PurchaseOfferStatus.PENDING_ADMIN)} className="text-xs text-blue-600 font-bold hover:underline">Reactivar</button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                    </Section>
                </div>
            )}

            {/* VIEW DETAIL MODAL */}
            {viewItem && (
                <div className="fixed inset-0 bg-[#003F4A]/70 backdrop-blur-sm z-50 flex justify-center items-start pt-6 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-[#D6D6D6] overflow-hidden">
                        
                        <div className="px-8 py-5 border-b border-[#F5F7F8] flex justify-between items-center bg-[#FAFBFC]">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="blue">{viewItem.type === 'LISTING' ? 'Publicación' : 'Oferta Compra'}</Badge>
                                    <span className="text-xs font-mono text-[#7A7A7A]">#{viewItem.data.id}</span>
                                </div>
                                <h2 className="text-xl font-bold text-[#0A0A0A] mt-1">Vista de Detalle Completa</h2>
                            </div>
                            <button onClick={() => setViewItem(null)} className="p-2 rounded-full hover:bg-[#F5F7F8] text-[#7A7A7A] transition-colors text-2xl leading-none">&times;</button>
                        </div>

                        <div className="p-8 overflow-y-auto bg-white flex-1">
                            {viewItem.type === 'LISTING' ? (
                                <ListingDetailView 
                                    listing={viewItem.data} 
                                    seller={users.find(u => u.id === viewItem.data.sellerId)}
                                    currentUser={currentUser}
                                />
                            ) : (
                                <PurchaseOfferDetailView 
                                    offer={viewItem.data} 
                                    listing={marketplaceListings.find(l => l.id === viewItem.data.listingId)} 
                                    seller={users.find(u => u.id === marketplaceListings.find(l => l.id === viewItem.data.listingId)?.sellerId)}
                                    buyer={users.find(u => u.id === viewItem.data.buyerId)}
                                    currentUser={currentUser}
                                />
                            )}
                        </div>

                        <div className="p-6 bg-[#FAFBFC] border-t border-[#F5F7F8] flex flex-wrap justify-end gap-3 shadow-[0_-4px_6px_rgba(0,0,0,0.02)] relative z-10">
                            <div className="mr-auto flex items-center">
                                <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wide mr-2">Acciones Admin:</span>
                            </div>

                            <Button 
                                variant="white" 
                                onClick={() => setEditingItem({type: viewItem.type, data: viewItem.data})}
                                icon={PencilIcon}
                            >
                                Editar
                            </Button>

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
                                Devolver (Ajustes)
                            </Button>

                            <Button 
                                variant="success" 
                                onClick={() => {
                                    handleForceStatusChange(viewItem.type, viewItem.data.id, viewItem.type === 'LISTING' ? ListingStatus.ACTIVE : PurchaseOfferStatus.PENDING_SELLER);
                                    setViewItem(null);
                                    alert('Aprobado y activado.');
                                }}
                                icon={CheckCircleIcon}
                            >
                                Aprobar / Verificar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* FEEDBACK PROMPT MODAL */}
            {actionPrompt && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                        <h3 className="text-lg font-bold text-[#0A0A0A] mb-2">
                            {actionPrompt.type === 'RETURN' ? 'Devolver para Ajustes' : 'Rechazar Elemento'}
                        </h3>
                        <p className="text-sm text-[#7A7A7A] mb-4">
                            {actionPrompt.type === 'RETURN' 
                                ? 'El elemento se marcará para corrección. Indique qué debe ajustar el usuario.' 
                                : 'El elemento será rechazado y archivado.'}
                        </p>
                        <textarea 
                            className="w-full border border-[#D6D6D6] rounded-lg p-3 text-sm focus:ring-[#007A8A] focus:border-[#007A8A] min-h-[100px]"
                            placeholder={actionPrompt.type === 'RETURN' ? "Indique los cambios necesarios..." : "Indique el motivo del rechazo..."}
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

            {/* FORMS & EDITING MODALS */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-[#0A0A0A]/40 z-50 flex justify-center items-start pt-10 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col border border-[#D6D6D6] overflow-hidden animate-fade-in-up">
                        <div className="flex justify-between items-center px-8 py-6 border-b border-[#F5F7F8] bg-[#FAFBFC]">
                            <h3 className="text-xl font-bold text-[#0A0A0A]">{formMode === 'LISTING' ? 'Publicar como Vendedor' : 'Ofertar como Comprador'}</h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-2xl text-[#7A7A7A] hover:text-[#0A0A0A]">&times;</button>
                        </div>
                        <div className="p-8 overflow-y-auto max-h-[85vh]">
                            <div className="mb-6 bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-sm text-yellow-800 font-bold">
                                ⚠️ Acción en nombre de tercero. Requiere aprobación posterior del usuario.
                            </div>
                            
                            {formMode === 'LISTING' ? (
                                !selectedUser ? (
                                    <div className="space-y-4">
                                        <label className="font-bold text-[#3D3D3D] block">Seleccionar Vendedor</label>
                                        <select className="w-full p-3 border border-[#D6D6D6] rounded-xl focus:ring-[#007A8A] focus:border-[#007A8A]" onChange={e => setSelectedUser(e.target.value)}>
                                            <option value="">Seleccione...</option>
                                            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <ListingForm onSubmit={handleCreateListingOnBehalf} onCancel={() => setIsFormOpen(false)} />
                                )
                            ) : (
                                !selectedUser || !targetListing ? (
                                    <div className="space-y-4">
                                        <label className="font-bold text-[#3D3D3D] block">1. Comprador</label>
                                        <select className="w-full p-3 border border-[#D6D6D6] rounded-xl focus:ring-[#007A8A] focus:border-[#007A8A]" onChange={e => setSelectedUser(e.target.value)}>
                                            <option value="">Seleccione...</option>
                                            {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                        <label className="font-bold text-[#3D3D3D] block">2. Publicación Objetivo</label>
                                        <select className="w-full p-3 border border-[#D6D6D6] rounded-xl focus:ring-[#007A8A] focus:border-[#007A8A]" onChange={e => setTargetListing(marketplaceListings.find(l => l.id === e.target.value) || null)}>
                                            <option value="">Seleccione...</option>
                                            {activeListings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <PurchaseOfferForm listing={targetListing} onSubmit={handleCreateOfferOnBehalf} onCancel={() => setIsFormOpen(false)} />
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editingItem && (
                <div className="fixed inset-0 bg-[#0A0A0A]/40 z-50 flex justify-center items-start pt-10 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col border border-[#D6D6D6] overflow-hidden animate-fade-in-up">
                        <div className="flex justify-between items-center px-8 py-6 border-b border-[#F5F7F8] bg-[#FAFBFC]">
                            <h3 className="text-xl font-bold text-red-600">Edición Forzada (Admin)</h3>
                            <button onClick={() => setEditingItem(null)} className="text-2xl text-[#7A7A7A] hover:text-[#0A0A0A]">&times;</button>
                        </div>
                        <div className="p-8 overflow-y-auto max-h-[85vh]">
                            {editingItem.type === 'LISTING' ? (
                                <ListingForm initialData={editingItem.data} onSubmit={(d) => handleUpdateData('LISTING', {...d, id: editingItem.data.id})} onCancel={() => setEditingItem(null)} />
                            ) : (
                                <PurchaseOfferForm listing={marketplaceListings.find(l => l.id === editingItem.data.listingId)!} initialData={editingItem.data} onSubmit={(d) => handleUpdateData('OFFER', {...d, id: editingItem.data.id})} onCancel={() => setEditingItem(null)} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMarketplaceDashboard;
