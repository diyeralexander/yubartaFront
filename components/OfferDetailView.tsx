
import React, { useMemo } from 'react';
import { Offer, Requirement, User, FileAttachment, Role } from '../types';
import { CameraIcon, DownloadIcon, CheckCircleIcon, XCircleIcon, TruckIcon, ChartBarIcon, UserCircleIcon, ArchiveBoxIcon, ShieldCheckIcon } from './icons';
import { getPublicUserDisplay } from '../utils';
import { getPenaltyFeePerKg } from '../utils'; // Ensure utility is imported

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

const ComparisonRow = ({ label, accepted, counterProposal, currency, labelColor = 'text-slate-500' }: { label: string; accepted: boolean; counterProposal?: string; currency?: string; labelColor?: string }) => {
    let content = null;

    if (accepted) {
        content = (
            <div className="flex items-center text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                <CheckCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Acepta condiciones del cliente</span>
            </div>
        );
    } else {
        let displayCounter: React.ReactNode = counterProposal || 'No especificada';
        
        // Parsed JSON check for price formula
        // Aceptamos tanto "Precio" como "Estructura de Precio" para activar el renderizado de tabla
        if ((label === 'Precio' || label === 'Estructura de Precio') && counterProposal && counterProposal.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(counterProposal);
                if (parsed.variables) {
                    displayCounter = (
                        <div className="mt-2 w-full bg-white rounded-lg border border-orange-200 overflow-hidden">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-orange-50 border-b border-orange-200 text-orange-800">
                                        <th className="py-2 px-3 text-left font-semibold">Concepto</th>
                                        <th className="py-2 px-3 text-right font-semibold">Valor Propuesto (COP/kg)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-700">
                                    {parsed.variables.map((v: any, idx: number) => (
                                        <tr key={idx} className="border-b border-orange-100 last:border-0">
                                            <td className="py-2 px-3">
                                                {v.name}
                                                {v.isNew && <span className="ml-2 text-[9px] bg-orange-100 text-orange-700 px-1 rounded border border-orange-200">NUEVO</span>}
                                            </td>
                                            <td className="py-2 px-3 text-right font-medium">
                                                {currency ? new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(v.value) : v.value}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-bold text-orange-900 bg-orange-50/50">
                                    <tr>
                                        <td className="py-2 px-3">Total</td>
                                        <td className="py-2 px-3 text-right">{currency ? new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(parsed.total) : parsed.total}</td>
                                    </tr>
                                </tfoot>
                            </table>
                            {parsed.observation && <p className="text-xs text-slate-500 italic p-3 border-t border-orange-100 bg-white"><strong>Nota:</strong> {parsed.observation}</p>}
                        </div>
                    );
                }
            } catch(e) {}
        } else {
             displayCounter = <p className="text-sm text-slate-700 font-medium">{displayCounter}</p>;
        }

        content = (
            <div className="flex flex-col text-sm bg-orange-50 px-4 py-3 rounded-lg border border-orange-100">
                <div className="flex items-center font-bold text-orange-800 mb-2">
                    <XCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>Contrapropuesta</span>
                </div>
                <div className="w-full">
                    {displayCounter}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-4 last:mb-0">
            <Label className={labelColor}>{label}</Label>
            <dd>{content}</dd>
        </div>
    );
};

const AttachmentBadge: React.FC<{ file?: FileAttachment, label: string }> = ({ file, label }) => {
    if (!file?.content) return null;
    
    const handleDownload = (e: React.MouseEvent) => {
        e.preventDefault();
        const a = document.createElement('a');
        a.href = file.content;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-300 hover:text-blue-700 transition-all group w-full"
        >
            <div className="p-1.5 bg-blue-50 rounded text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-700">
                <CameraIcon className="w-4 h-4" />
            </div>
            <div className="text-left overflow-hidden">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-900">{file.name}</p>
            </div>
            <DownloadIcon className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-500" />
        </button>
    );
};

const SectionHeader = ({ title, icon: Icon }: { title: string, icon: React.ElementType }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <Icon className="w-5 h-5 text-slate-400" />
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
    </div>
);

interface OfferDetailViewProps {
    offer: Offer;
    requirement: Requirement;
    seller?: User;
    showSellerInfo: boolean;
    showPenaltyFee?: boolean;
    currentUser?: User;
}

const OfferDetailView = ({ offer, requirement, seller, showSellerInfo, showPenaltyFee = false, currentUser }: OfferDetailViewProps) => {

    const deliveryInfo = useMemo(() => {
        if (!offer.fechaInicioVigencia || !offer.fechaFinVigencia || offer.frecuenciaSuministro === 'Única Vez') {
            return { periods: 1, perDelivery: offer.cantidadOfertada };
        }
        try {
            const start = parseDate(offer.fechaInicioVigencia);
            const end = parseDate(offer.fechaFinVigencia);
            if (start >= end) return { periods: 1, perDelivery: offer.cantidadOfertada };
            let periods = 0;
            let cursorDate = start;
            while (cursorDate <= end) {
                periods++;
                switch (offer.frecuenciaSuministro) {
                    case 'Diario': cursorDate = addDays(cursorDate, 1); break;
                    case 'Semanal': cursorDate = addDays(cursorDate, 7); break;
                    case 'Quincenal': cursorDate = addDays(cursorDate, 14); break;
                    case 'Mensual': cursorDate = new Date(Date.UTC(cursorDate.getUTCFullYear(), cursorDate.getUTCMonth() + 1, 1)); break;
                    case 'Trimestral': cursorDate = new Date(Date.UTC(cursorDate.getUTCFullYear(), cursorDate.getUTCMonth() + 3, 1)); break;
                    case 'Anual': cursorDate = new Date(Date.UTC(cursorDate.getUTCFullYear() + 1, 0, 1)); break;
                    default: cursorDate = addDays(cursorDate, 365); break;
                }
            }
            const validPeriods = Math.max(1, periods);
            return { periods: validPeriods, perDelivery: offer.cantidadOfertada / validPeriods };
        } catch (e) {
            return { periods: 1, perDelivery: offer.cantidadOfertada };
        }
    }, [offer.fechaInicioVigencia, offer.fechaFinVigencia, offer.frecuenciaSuministro, offer.cantidadOfertada]);

    // --- LOGIC: STRICT PENALTY MIRRORING ---
    const penaltyFeePerKg = useMemo(() => {
        // First priority: Use the value directly from the requirement (what the buyer agreed to)
        if (requirement.managementFeePerKg !== undefined) {
            return requirement.managementFeePerKg;
        }
        // Fallback for legacy data
        const totalTons = requirement.unidad === 'Kilogramos (Kg)' ? requirement.totalVolume / 1000 : requirement.totalVolume;
        return getPenaltyFeePerKg(totalTons);
    }, [requirement]);

    const sellerDisplay = currentUser ? getPublicUserDisplay(seller, currentUser) : { name: 'Cargando...', subtext: '', contactHidden: true };
    const canViewPenalty = currentUser && (currentUser.id === offer.sellerId || currentUser.role === Role.ADMIN);
    const isOwner = currentUser?.id === offer.sellerId;

    const attachments = [
        { label: "Material", file: offer.fotosMaterial },
        { label: "Proceso", file: offer.fotosProceso },
        { label: "Instalaciones", file: offer.fotosInstalaciones },
    ].filter((a): a is { label: string; file: FileAttachment } => !!a.file);

    return (
        <div className="bg-white font-sans max-w-5xl mx-auto space-y-8">
            
            {/* Header de Oferta */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-100 uppercase">Oferta de Suministro</span>
                        <span className="text-xs text-slate-400 font-mono">ID: {offer.id}</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900">Para: {requirement.title}</h2>
                </div>
                {showSellerInfo && seller && (
                    <div className="mt-4 md:mt-0 text-right">
                        <p className="text-sm font-bold text-slate-900">{sellerDisplay.name}</p>
                        <p className="text-xs text-slate-500">{sellerDisplay.subtext}</p>
                    </div>
                )}
            </div>

            {/* --- BLOQUE 1: RESUMEN DE EJECUCIÓN --- */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-100 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-slate-500" />
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Plan de Suministro Propuesto</h3>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    
                    {/* 1. Cantidad por Entrega */}
                    <div>
                        <Label className="text-slate-400">Cantidad por Entrega</Label>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">{deliveryInfo.perDelivery.toFixed(1)}</span>
                            <span className="text-xs font-bold text-slate-500">{offer.unidadMedida}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">~{deliveryInfo.periods} entregas estimadas</p>
                    </div>

                    {/* 2. Frecuencia y Fechas */}
                    <div className="flex flex-col md:items-center md:border-x md:border-slate-200 md:px-6">
                        <Label className="text-slate-400 text-center w-full">Frecuencia Propuesta</Label>
                        <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-full shadow-sm inline-block mb-3">
                            <span className="text-base font-bold text-slate-800">{offer.frecuenciaSuministro}</span>
                        </div>
                        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-2">
                            <span>{offer.fechaInicioVigencia}</span>
                            <span className="text-slate-300">➜</span>
                            <span>{offer.fechaFinVigencia}</span>
                        </div>
                    </div>

                    {/* 3. Total Global */}
                    <div className="md:text-right">
                        <Label className="text-slate-400">Cantidad Total Global</Label>
                        <div className="flex items-baseline gap-1 md:justify-end">
                            <span className="text-2xl font-black text-slate-700 tracking-tight">{offer.cantidadOfertada}</span>
                            <span className="text-sm font-bold text-slate-500">{offer.unidadMedida}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* COLUMNA IZQUIERDA: TÉCNICA Y LOGÍSTICA */}
                <div className="space-y-8">
                    
                    {/* SECCIÓN 1: TÉCNICA (Azul) */}
                    <section className="bg-blue-50/40 rounded-2xl border border-blue-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-blue-100 bg-blue-50 flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-blue-600 shadow-sm"><ArchiveBoxIcon className="w-4 h-4"/></div>
                            <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest">1. Especificaciones del Material</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <ComparisonRow 
                                label="Calidad del Material" 
                                accepted={offer.aceptaEspecificacionesCalidad} 
                                counterProposal={offer.contrapropuestaCalidad} 
                                labelColor="text-blue-400"
                            />
                            
                            {/* Evidencia (Fotos) */}
                            {attachments.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-blue-100/50">
                                    <Label className="text-blue-400">Evidencia Fotográfica</Label>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        {attachments.map((att, idx) => (
                                            <AttachmentBadge key={idx} file={att.file} label={att.label} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* SECCIÓN 2: LOGÍSTICA (Teal) */}
                    <section className="bg-teal-50/40 rounded-2xl border border-teal-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-teal-100 bg-teal-50 flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-teal-600 shadow-sm"><TruckIcon className="w-4 h-4"/></div>
                            <h3 className="text-xs font-black text-teal-800 uppercase tracking-widest">2. Logística y Entrega</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <DetailBlock label="Tipo de Vehículo" value={offer.tipoVehiculo} labelColor="text-teal-500" />
                            
                            <ComparisonRow 
                                label="Condiciones Logísticas" 
                                accepted={offer.aceptaCondicionesLogisticas} 
                                counterProposal={offer.contrapropuestaLogistica} 
                                labelColor="text-teal-500"
                            />
                            
                            <div className="pt-2 border-t border-teal-100/50">
                                <Label className="text-teal-500 mb-2">Lugar de Entrega</Label>
                                {offer.aceptaLugarEntrega ? (
                                    <div className="flex items-center text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                                        <CheckCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Acepta entregar en: {requirement.ciudadRecepcion}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col text-sm bg-orange-50 px-4 py-3 rounded-lg border border-orange-100">
                                        <div className="flex items-center font-bold text-orange-800 mb-1">
                                            <XCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                            <span>Propone otro lugar</span>
                                        </div>
                                        <p className="text-slate-700 text-xs">Ver detalles en contrapropuesta logística.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                </div>

                {/* COLUMNA DERECHA: COMERCIAL */}
                <div className="space-y-8">
                    
                    {/* SECCIÓN 3: COMERCIAL (Indigo) */}
                    <section className="bg-indigo-50/40 rounded-2xl border border-indigo-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50 flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-indigo-600 shadow-sm"><CheckCircleIcon className="w-4 h-4"/></div>
                            <h3 className="text-xs font-black text-indigo-800 uppercase tracking-widest">3. Condiciones Comerciales</h3>
                        </div>
                        <div className="p-6 space-y-8">
                            
                            {/* Grupo Precio */}
                            <div>
                                <div className="flex justify-between items-end mb-3 border-b border-indigo-100 pb-1">
                                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Propuesta de Precio</h4>
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">
                                        Moneda: {requirement.moneda}
                                    </span>
                                </div>
                                <ComparisonRow 
                                    label="Estructura de Precio" 
                                    accepted={offer.aceptaFormulaPrecio} 
                                    counterProposal={offer.contrapropuestaFormulaPrecio} 
                                    currency={requirement.moneda} 
                                    labelColor="text-indigo-400"
                                />
                            </div>

                            {/* Grupo Pagos */}
                            <div>
                                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 border-b border-indigo-100 pb-1">Términos de Pago</h4>
                                <div className="space-y-4">
                                    <ComparisonRow label="Condiciones de Pago" accepted={offer.aceptaCondicionesPago} counterProposal={offer.contrapropuestaCondicionesPago} labelColor="text-indigo-400" />
                                    <ComparisonRow label="Método de Pago" accepted={offer.aceptaMetodoPago} counterProposal={offer.contrapropuestaMetodoPago} labelColor="text-indigo-400" />
                                </div>
                            </div>

                        </div>
                    </section>

                    {/* Penalidad (Visible para Vendedor y Admin) */}
                    {canViewPenalty && showPenaltyFee && offer.penaltyFeeAccepted && (
                        <div className="bg-red-50 rounded-2xl border border-red-100 overflow-hidden relative">
                            <div className="absolute -right-6 -top-6 text-red-100 opacity-60 pointer-events-none">
                                <ArchiveBoxIcon className="w-32 h-32 transform rotate-12" />
                            </div>
                            <div className="px-6 py-4 border-b border-red-100 bg-red-50/50 flex items-center gap-2 relative z-10">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <h3 className="text-xs font-black text-red-800 uppercase tracking-widest">
                                    Garantía de Cumplimiento
                                </h3>
                            </div>
                            <div className="p-6 relative z-10">
                                <p className="text-sm text-red-900 font-medium leading-relaxed">
                                    El vendedor ha aceptado una penalidad de <strong className="text-red-700 bg-white px-1.5 py-0.5 rounded border border-red-100 shadow-sm">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(penaltyFeePerKg)}</strong> por Kilo no entregado.
                                </p>
                                <div className="mt-4 flex items-center text-xs text-red-700 font-bold bg-white/60 p-2 rounded-lg w-fit">
                                    <CheckCircleIcon className="w-3 h-3 mr-1.5" />
                                    Cláusula Aceptada y Vinculante
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Historial */}
                    {offer.communicationLog && offer.communicationLog.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <SectionHeader title="Historial de Cambios" icon={ArchiveBoxIcon} />
                            <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {offer.communicationLog.map(log => (
                                    <div key={log.id} className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm">
                                        <div className="flex justify-between text-xs text-slate-400 font-bold mb-1 uppercase">
                                            <span>{log.author}</span>
                                            <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-slate-700">{log.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SECCIÓN DE TRAZABILIDAD PARA EL VENDEDOR (Módulo 1) */}
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
                            <p className="font-mono font-bold text-slate-800 text-base">{offer.id}</p>
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Fecha de Registro</p>
                            <p className="font-bold text-slate-800">{new Date(offer.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="col-span-full border-t border-slate-200 pt-4 mt-2 relative z-10">
                            <div className="flex items-start gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="font-bold text-slate-800 block">Confirmación de Términos Legales</span>
                                    <p className="mt-1 leading-relaxed">
                                        Como vendedor, usted aceptó explícitamente las condiciones de penalidad 
                                        (<strong className="text-slate-900">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(penaltyFeePerKg)}/Kg</strong>) 
                                        y los términos de la plataforma al momento de crear y enviar esta oferta. Este registro sirve como respaldo de dicha aceptación.
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

export default OfferDetailView;
