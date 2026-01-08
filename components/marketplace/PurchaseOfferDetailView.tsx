
import React, { useMemo } from 'react';
import { PurchaseOffer, MarketplaceListing, User, Role } from '../../types';
import { CheckCircleIcon, XCircleIcon, TruckIcon, ArchiveBoxIcon, UserCircleIcon, ChartBarIcon } from '../icons';
import { getPublicUserDisplay } from '../../utils';
import { getPenaltyFeePerKg } from '../../utils'; // Ensure utility is imported

interface Props {
    offer: PurchaseOffer;
    listing?: MarketplaceListing; // Optional because listing might be deleted/hidden
    seller?: User;
    buyer?: User;
    currentUser: User;
}

const Label = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
    <dt className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 text-slate-500 ${className}`}>{children}</dt>
);

const Value = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
    <dd className={`text-sm font-medium leading-relaxed text-slate-900 ${className}`}>{children || <span className="text-gray-400 italic">N/A</span>}</dd>
);

const DetailBlock = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <Label>{label}</Label>
        <Value>{value}</Value>
    </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string, icon: React.ElementType }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 text-slate-700">
        <Icon className="w-5 h-5" />
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
    </div>
);

const PurchaseOfferDetailView = ({ offer, listing, seller, buyer, currentUser }: Props) => {
    // Privacy Logic: Show detailed info if Admin or Owner (Buyer) or Counterparty (Seller)
    const isBuyer = currentUser.id === offer.buyerId;
    const isSeller = currentUser.id === listing?.sellerId; // The listing owner
    const isAdmin = currentUser.role === Role.ADMIN;
    
    // Privacy Check for "Penalty Fee" block - visible to all involved parties
    const showPenalty = isBuyer || isSeller || isAdmin;

    const sellerDisplay = getPublicUserDisplay(seller, currentUser);
    const buyerDisplay = getPublicUserDisplay(buyer, currentUser);

    // --- LOGIC: STRICT PENALTY MIRRORING ---
    const penaltyFeePerKg = useMemo(() => {
        if (!listing) return 0;
        
        // Priority 1: Use the exact fee stored in the listing (agreed by seller)
        if (listing.managementFeePerKg !== undefined && listing.managementFeePerKg > 0) {
            return listing.managementFeePerKg;
        }
        
        // Priority 2: Fallback Calculation
        const totalKg = listing.unit === 'Toneladas' ? listing.quantity * 1000 : listing.quantity;
        return getPenaltyFeePerKg(totalKg / 1000);
    }, [listing]);

    return (
        <div className="bg-white font-sans max-w-5xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-100 uppercase">Oferta de Compra</span>
                        <span className="text-xs text-slate-400 font-mono">ID: {offer.id}</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900">Para: {listing?.title || 'Publicación no disponible'}</h2>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-bold">Comprador Oferente</p>
                    <p className="text-sm font-bold text-slate-900">{buyerDisplay.name}</p>
                </div>
            </div>

            {/* Resumen Económico */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-100 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-slate-500" />
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Resumen de la Operación</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    <div>
                        <Label>Cantidad Solicitada</Label>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">{offer.quantityRequested}</span>
                            <span className="text-sm font-bold text-slate-500">{listing?.unit}</span>
                        </div>
                    </div>
                    <div className="flex flex-col md:items-center md:border-x md:border-slate-200 md:px-6">
                        <Label className="text-center w-full">Fecha de Recogida</Label>
                        <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-lg shadow-sm inline-block font-bold text-slate-800">
                            {offer.fechaRecogida}
                        </div>
                    </div>
                    <div className="md:text-right">
                        <Label>Valor Total Ofertado</Label>
                        <div className="text-2xl font-black text-teal-700 tracking-tight">
                            ${new Intl.NumberFormat('es-CO').format(offer.totalPriceOffered)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Columna Izquierda: Logística y Técnica */}
                <div className="space-y-8">
                    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <SectionHeader title="Condiciones Logísticas" icon={TruckIcon} />
                        <div className="space-y-4">
                            <DetailBlock label="Tipo de Vehículo" value={offer.tipoVehiculo} />
                            <DetailBlock label="Frecuencia Retiro" value={offer.frecuenciaRetiro} />
                            
                            <div className="pt-2 border-t border-slate-100">
                                <Label>Punto de Recogida</Label>
                                {offer.aceptaUbicacion ? (
                                    <div className="flex items-center text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 mt-1">
                                        <CheckCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Acepta recoger en ubicación del vendedor</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col text-sm bg-orange-50 px-4 py-3 rounded-lg border border-orange-100 mt-1">
                                        <span className="font-bold text-orange-800 mb-1 flex items-center"><XCircleIcon className="w-3 h-3 mr-1"/> Propone otro punto:</span>
                                        <span className="text-slate-700">{offer.contrapropuestaLogistica}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <SectionHeader title="Calidad y Certificados" icon={ArchiveBoxIcon} />
                        <div className="space-y-4">
                            <div>
                                <Label>Aceptación de Calidad</Label>
                                {offer.aceptaCalidad ? (
                                    <span className="text-emerald-600 font-bold text-sm flex items-center mt-1">
                                        <CheckCircleIcon className="w-4 h-4 mr-1"/> Acepta condiciones publicadas
                                    </span>
                                ) : (
                                    <div className="bg-yellow-50 p-3 rounded-lg text-sm text-slate-700 border border-yellow-100 mt-1">
                                        <strong>Observación:</strong> {offer.contrapropuestaCalidad}
                                    </div>
                                )}
                            </div>
                            {listing?.requiresCertificate && (
                                <div className="pt-3 border-t border-slate-100">
                                    <Label>Certificado de Disposición Final</Label>
                                    {offer.canProvideCertificate ? (
                                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-100 inline-block mt-1">
                                            Sí, puede certificar
                                        </span>
                                    ) : (
                                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-100 inline-block mt-1">
                                            No puede certificar
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Columna Derecha: Comercial y Legal */}
                <div className="space-y-8">
                    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <SectionHeader title="Detalle Comercial" icon={ChartBarIcon} />
                        <div className="space-y-4">
                            <div>
                                <Label>Negociación de Precio (Base: COP/kg)</Label>
                                {offer.aceptaPrecio ? (
                                    <span className="text-emerald-600 font-bold text-sm flex items-center mt-1">
                                        <CheckCircleIcon className="w-4 h-4 mr-1"/> Acepta precio de lista
                                    </span>
                                ) : (
                                    <div className="mt-1">
                                        <div className="bg-orange-50 p-3 rounded-t-lg text-sm text-orange-900 border border-orange-100 font-medium">
                                            Propuesta Personalizada
                                        </div>
                                        {offer.priceExplanation && (
                                            <div className="bg-white p-3 border-x border-b border-slate-200 rounded-b-lg text-xs text-slate-600 italic">
                                                "{offer.priceExplanation}"
                                            </div>
                                        )}
                                        {offer.offerPriceStructure && (
                                            <div className="mt-2 text-xs text-slate-500">
                                                * Estructura de costos detallada disponible en PDF.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <DetailBlock label="Método de Pago" value={offer.metodoPagoPropuesto} />
                                <DetailBlock label="Condiciones" value={offer.condicionesPagoPropuestas} />
                            </div>
                        </div>
                    </section>

                    {/* Penalidad - Visible para TODOS los involucrados en la transacción */}
                    {showPenalty && offer.penaltyFeeAccepted && (
                        <div className="bg-red-50 rounded-2xl border border-red-100 overflow-hidden relative">
                            <div className="absolute -right-4 -top-4 text-red-100 opacity-50 pointer-events-none">
                                <UserCircleIcon className="w-24 h-24" />
                            </div>
                            <div className="px-6 py-3 border-b border-red-100 bg-red-50 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <h3 className="text-xs font-black text-red-800 uppercase tracking-widest">
                                    Garantía de Cumplimiento (Comprador)
                                </h3>
                            </div>
                            <div className="p-6 relative z-10">
                                <p className="text-sm text-red-900 font-medium leading-relaxed">
                                    El comprador ha aceptado una penalidad de <strong className="text-red-700 bg-white px-1.5 py-0.5 rounded border border-red-100 shadow-sm">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(penaltyFeePerKg)}</strong> por Kilo no retirado.
                                </p>
                                <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-white text-red-700 border border-red-200 shadow-sm">
                                    <CheckCircleIcon className="w-3 h-3 mr-1.5" /> Cláusula Aceptada
                                </div>
                            </div>
                        </div>
                    )}

                    {offer.message && (
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <Label className="text-blue-800 mb-1">Notas Adicionales</Label>
                            <p className="text-sm text-blue-900">{offer.message}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PurchaseOfferDetailView;
