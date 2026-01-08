
import React, { useMemo } from 'react';
import { MarketplaceListing, User, FileAttachment, Role } from '../../types';
import { DownloadIcon, LinkIcon, ArchiveBoxIcon, TruckIcon, CheckCircleIcon, ChartBarIcon, CameraIcon, ShieldCheckIcon } from '../icons';
import { getPublicUserDisplay } from '../../utils';

interface Props {
    listing: MarketplaceListing;
    seller?: User;
    currentUser?: User;
}

// --- COMPONENTES VISUALES ---

const Label = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
    <dt className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${className}`}>{children}</dt>
);

const Value = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
    <dd className={`text-sm font-medium leading-relaxed ${className}`}>{children || <span className="text-gray-400 italic">N/A</span>}</dd>
);

const DetailBlock = ({ label, value, className = '', labelColor = 'text-slate-500', valueColor = 'text-slate-900' }: { label: string; value: React.ReactNode; className?: string, labelColor?: string, valueColor?: string }) => (
    <div className={className}>
        <Label className={labelColor}>{label}</Label>
        <Value className={valueColor}>{value}</Value>
    </div>
);

const SectionHeader = ({ title, icon: Icon, colorClass = 'text-slate-700' }: { title: string, icon: React.ElementType, colorClass?: string }) => (
    <div className={`flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 ${colorClass}`}>
        <Icon className="w-5 h-5" />
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
    </div>
);

const ResourceLink = ({ file, url, colorClass = 'text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-100' }: { file?: FileAttachment, url?: string, colorClass?: string }) => {
    if (!file?.content && !url) return null;

    if (file?.content) {
        const handleDownload = (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            const a = document.createElement('a');
            a.href = file.content;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        return (
            <a href="#" onClick={handleDownload} className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-colors mt-2 w-full sm:w-auto ${colorClass}`} title={file.name}>
                 <DownloadIcon className="h-3 w-3" />
                 <span className="truncate max-w-[200px]">Descargar Adjunto</span>
            </a>
        );
    } 
    
    if (url) {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-colors mt-2 w-full sm:w-auto ${colorClass}`}>
                <LinkIcon className="h-3 w-3" />
                <span>Ver Enlace Externo</span>
            </a>
        );
    }
    return null;
};

const PriceStructureTable = ({ structureStr, currency, total }: { structureStr: string, currency: string, total: number }) => {
    let variables: { name: string, value: number }[] = [];
    try {
        variables = JSON.parse(structureStr);
    } catch (e) {
        variables = [{ name: 'Precio Base', value: total }];
    }

    return (
        <div className="bg-white rounded-lg border border-indigo-100 overflow-hidden w-full shadow-sm">
            <table className="w-full text-sm">
                <thead className="bg-indigo-50/50 text-indigo-900 border-b border-indigo-100">
                    <tr>
                        <th className="px-4 py-2 text-left font-semibold text-xs uppercase">Concepto</th>
                        <th className="px-4 py-2 text-right font-semibold text-xs uppercase">Valor ({currency}/kg)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50">
                    {variables.map((item, index) => (
                        <tr key={index}>
                            <td className="px-4 py-2 text-slate-600 font-medium">{item.name}</td>
                            <td className="px-4 py-2 text-right font-medium text-slate-800">
                                {new Intl.NumberFormat('es-CO', { style: 'decimal', minimumFractionDigits: 0 }).format(item.value)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-indigo-50 border-t border-indigo-100">
                    <tr>
                        <td className="px-4 py-3 font-bold text-indigo-900 text-xs uppercase">Precio Total por Kilo</td>
                        <td className="px-4 py-3 text-right font-black text-indigo-700 text-base">
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(total)} / Kg
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

const ListingDetailView = ({ listing, seller, currentUser }: Props) => {
    const sellerDisplay = currentUser ? getPublicUserDisplay(seller, currentUser) : { name: 'Cargando...', subtext: '', contactHidden: true };
    const canViewManagementFee = currentUser && (currentUser.id === listing.sellerId || currentUser.role === Role.ADMIN);
    const isOwner = currentUser?.id === listing.sellerId;
    
    // Totales
    const totalKg = listing.unit === 'Toneladas' ? listing.quantity * 1000 : listing.quantity;
    const managementFeeTotal = totalKg * (listing.managementFeePerKg || 0);

    return (
        <div className="bg-white font-sans max-w-5xl mx-auto space-y-8">
            
            {/* Header de la Publicación */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 uppercase">Oferta de Bodega</span>
                        <span className="text-xs text-slate-400 font-mono">ID: {listing.id}</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{listing.title}</h2>
                    <div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
                        <span>Vendedor: <strong>{sellerDisplay.name}</strong></span>
                        {seller?.isVerified && !sellerDisplay.contactHidden && (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-100 flex items-center">
                                <CheckCircleIcon className="w-3 h-3 mr-1" /> Verificado
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* --- BLOQUE 1: RESUMEN DE DISPONIBILIDAD (Destacado) --- */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-100 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-slate-500" />
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Resumen de Oferta</h3>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {/* Cantidad */}
                    <div>
                        <Label className="text-slate-400">Cantidad Disponible</Label>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-slate-900 tracking-tight">{listing.quantity}</span>
                            <span className="text-lg font-bold text-slate-500">{listing.unit}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-medium">{listing.frequency !== 'Única Vez' ? `Suministro ${listing.frequency}` : 'Lote Único'}</p>
                    </div>

                    {/* Vigencia */}
                    <div className="flex flex-col md:items-center md:border-x md:border-slate-200 md:px-6">
                        <Label className="text-slate-400 text-center w-full">Vigencia de la Publicación</Label>
                        <div className="text-xs font-bold text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center gap-1 w-full text-center">
                            <span>{listing.validFrom}</span>
                            <span className="text-slate-300 text-[10px]">▼ HASTA ▼</span>
                            <span>{listing.validUntil}</span>
                        </div>
                    </div>

                    {/* Precio Unitario */}
                    <div className="md:text-right">
                        <Label className="text-slate-400">Precio por Unidad</Label>
                        <div className="flex items-baseline gap-1 md:justify-end">
                            <span className="text-3xl font-black text-indigo-700 tracking-tight">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: listing.currency, minimumFractionDigits: 0 }).format(listing.pricePerUnit)}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                            Moneda: {listing.currency}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COLUMNA IZQUIERDA: TÉCNICA Y LOGÍSTICA (2/3 ancho) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* SECCIÓN 1: TÉCNICA (Azul) */}
                    <section className="bg-blue-50/40 rounded-2xl border border-blue-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-blue-100 bg-blue-50 flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-blue-600 shadow-sm"><ArchiveBoxIcon className="w-4 h-4"/></div>
                            <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest">1. Ficha Técnica del Material</h3>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                                <DetailBlock label="Categoría" value={listing.category} labelColor="text-blue-400" />
                                <DetailBlock label="Subcategoría" value={listing.subcategory || 'General'} labelColor="text-blue-400" />
                                <DetailBlock label="Presentación" value={listing.presentation} labelColor="text-blue-400" />
                            </div>
                            
                            <div className="mb-6">
                                <Label className="text-blue-400">Descripción Detallada</Label>
                                <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-blue-100">
                                    {listing.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-blue-100/50">
                                <div>
                                    <Label className="text-blue-400">Detalles de Calidad</Label>
                                    <p className="text-sm text-slate-700">{listing.qualityDescription || 'Ver adjuntos.'}</p>
                                    <ResourceLink file={listing.qualityFile} url={listing.qualityUrl} colorClass="text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-100" />
                                </div>
                                <div>
                                    {listing.requiresCertificate && (
                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                            <Label className="text-amber-700">Requisito Legal</Label>
                                            <p className="text-xs text-amber-800 font-medium mt-1">
                                                Este material requiere que el comprador emita un <strong>Certificado de Disposición Final</strong>.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECCIÓN 2: LOGÍSTICA (Teal) */}
                    <section className="bg-teal-50/40 rounded-2xl border border-teal-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-teal-100 bg-teal-50 flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-teal-600 shadow-sm"><TruckIcon className="w-4 h-4"/></div>
                            <h3 className="text-xs font-black text-teal-800 uppercase tracking-widest">2. Ubicación y Logística</h3>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <DetailBlock label="Departamento" value={listing.locationDepartment} labelColor="text-teal-500" />
                                <DetailBlock label="Ciudad / Municipio" value={listing.locationCity} labelColor="text-teal-500" />
                            </div>
                            
                            <div>
                                <Label className="text-teal-500">Condiciones de Carga/Retiro</Label>
                                <p className="text-sm text-slate-700 mb-2">{listing.logisticsDescription || 'A coordinar.'}</p>
                                {listing.logisticNotes && (
                                    <p className="text-xs text-slate-500 italic bg-white p-2 rounded border border-teal-100 inline-block">
                                        Nota: {listing.logisticNotes}
                                    </p>
                                )}
                                <div className="mt-2">
                                    <ResourceLink file={listing.logisticsFile} url={listing.logisticsUrl} colorClass="text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-100" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Galería */}
                    {listing.photos && listing.photos.length > 0 && (
                        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <SectionHeader title="Evidencia Fotográfica" icon={CameraIcon} />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {listing.photos.map((photo, idx) => (
                                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                                        <img src={photo.content} alt={photo.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* COLUMNA DERECHA: COMERCIAL (1/3 ancho) */}
                <div className="space-y-8">
                    
                    {/* SECCIÓN 3: COMERCIAL (Indigo) */}
                    <section className="bg-indigo-50/40 rounded-2xl border border-indigo-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50 flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-indigo-600 shadow-sm"><CheckCircleIcon className="w-4 h-4"/></div>
                            <h3 className="text-xs font-black text-indigo-800 uppercase tracking-widest">3. Desglose del Precio</h3>
                        </div>
                        <div className="p-6">
                            <PriceStructureTable structureStr={listing.priceStructure} currency={listing.currency} total={listing.pricePerUnit} />
                            
                            <div className="mt-4 p-3 bg-indigo-100/50 rounded-lg text-xs text-indigo-800 border border-indigo-100">
                                <p><strong>Nota:</strong> El comprador puede proponer un método de pago diferente en su oferta.</p>
                            </div>
                        </div>
                    </section>

                    {/* GESTIÓN YUBARTA (Privado) */}
                    {canViewManagementFee && listing.managementFeePerKg !== undefined && (
                        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 overflow-hidden relative">
                            <div className="px-6 py-3 border-b border-emerald-100 bg-emerald-50 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest">
                                    Fee de Gestión (Privado)
                                </h3>
                            </div>
                            <div className="p-6 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-emerald-700">Tarifa por {listing.unit === 'Toneladas' ? 'Kg' : 'Unidad'}:</span>
                                    <strong className="text-emerald-900">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(listing.managementFeePerKg)}</strong>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-emerald-100">
                                    <span className="text-emerald-700 font-bold">Total Estimado:</span>
                                    <strong className="text-emerald-900">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(managementFeeTotal)}</strong>
                                </div>
                                {listing.managementFeeAccepted && (
                                    <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-white text-emerald-700 border border-emerald-200 shadow-sm">
                                        <CheckCircleIcon className="w-3 h-3 mr-1" /> Tarifa Aceptada
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* SECCIÓN DE TRAZABILIDAD PARA EL VENDEDOR (Módulo 2) */}
            {isOwner && (
                <div className="mt-8 pt-6 border-t border-slate-200 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheckIcon className="w-5 h-5 text-slate-400" />
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Registro de Trazabilidad (Vista del Vendedor)</h4>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-sm text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <ShieldCheckIcon className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Identificador Único</p>
                            <p className="font-mono font-bold text-slate-800 text-base">{listing.id}</p>
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Fecha de Publicación</p>
                            <p className="font-bold text-slate-800">{new Date(listing.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="col-span-full border-t border-slate-200 pt-4 mt-2 relative z-10">
                            <div className="flex items-start gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="font-bold text-slate-800 block">Confirmación de Servicio</span>
                                    <p className="mt-1 leading-relaxed">
                                        El usuario aceptó explícitamente el Fee de Gestión de Yubarta 
                                        (<strong className="text-slate-900">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(listing.managementFeePerKg || 0)}/Kg</strong>) 
                                        al momento de realizar esta publicación en la bodega.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListingDetailView;
