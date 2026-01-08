
import React, { useMemo } from 'react';
import { Requirement, User, FileAttachment, Role } from '../types';
import { DownloadIcon, LinkIcon, ChartBarIcon, TruckIcon, ArchiveBoxIcon, CheckCircleIcon, UserCircleIcon } from './icons';
import { getPublicUserDisplay } from '../utils';

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

// --- COMPONENTES AUXILIARES DE DISEÑO ---

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
            <a href="#" onClick={handleDownload} className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-colors mt-2 w-full sm:w-auto ${colorClass}`}>
                 <DownloadIcon className="h-3 w-3" />
                 <span className="truncate max-w-[200px]">{file.name}</span>
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

const PriceStructureTable = ({ conditions, currency }: { conditions: string, currency: string }) => {
    try {
        const parsed = JSON.parse(conditions);
        if (!Array.isArray(parsed) || parsed.length === 0) return <span className="text-sm text-slate-600">{conditions}</span>;
        
        const total = parsed.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

        return (
            <div className="bg-white rounded-lg border border-indigo-100 overflow-hidden w-full shadow-sm">
                <table className="w-full text-sm">
                    <tbody className="divide-y divide-indigo-50">
                        {parsed.map((item, index) => (
                            <tr key={index}>
                                <td className="px-4 py-2 text-slate-600 font-medium">{item.name}</td>
                                <td className="px-4 py-2 text-right font-semibold text-slate-900">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(item.value)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-indigo-50 border-t border-indigo-100">
                        <tr>
                            <td className="px-4 py-3 font-bold text-indigo-900 text-xs uppercase">Precio Base Total por Kilo</td>
                            <td className="px-4 py-3 text-right font-bold text-indigo-700 text-base">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(total)} / Kg
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    } catch (e) {
        return <span className="text-sm text-slate-600">{conditions}</span>;
    }
};

interface RequirementDetailViewProps {
    requirement: Requirement;
    showTitle?: boolean;
    buyer?: User;
    showBuyerContactInfo?: boolean; 
    onDeleteAttachment?: (reqId: string, field: string) => void;
    showManagementFee?: boolean;
    currentUser?: User;
}

const RequirementDetailView = ({ 
    requirement, 
    showTitle = true, 
    buyer,
    showBuyerContactInfo,
    showManagementFee,
    currentUser
}: RequirementDetailViewProps) => {

    const deliveryInfo = useMemo(() => {
        if (!requirement.vigenciaInicio || !requirement.vigenciaFin || requirement.frecuencia === 'Única Vez') {
            return { periods: 1, perDelivery: requirement.cantidadRequerida };
        }
        try {
            const start = parseDate(requirement.vigenciaInicio);
            const end = parseDate(requirement.vigenciaFin);
            if (start >= end) return { periods: 1, perDelivery: requirement.cantidadRequerida };
            let periods = 0;
            let cursorDate = start;
            while (cursorDate <= end) {
                periods++;
                switch (requirement.frecuencia) {
                    case 'Semanal': cursorDate = addDays(cursorDate, 7); break;
                    case 'Mensual': cursorDate = new Date(Date.UTC(cursorDate.getUTCFullYear(), cursorDate.getUTCMonth() + 1, 1)); break;
                    case 'Anual': cursorDate = new Date(Date.UTC(cursorDate.getUTCFullYear() + 1, 0, 1)); break;
                    default: cursorDate = addDays(cursorDate, 365); break;
                }
            }
            const validPeriods = Math.max(1, periods);
            return { periods: validPeriods, perDelivery: requirement.cantidadRequerida / validPeriods };
        } catch (e) {
            return { periods: 1, perDelivery: requirement.cantidadRequerida };
        }
    }, [requirement.vigenciaInicio, requirement.vigenciaFin, requirement.frecuencia, requirement.cantidadRequerida]);

    const buyerDisplay = currentUser ? getPublicUserDisplay(buyer, currentUser) : { name: 'Cargando...', subtext: '', contactHidden: true };
    const canViewManagementFee = currentUser && (currentUser.id === requirement.buyerId || currentUser.role === Role.ADMIN);
    
    // Cálculos de totales
    const totalKilos = requirement.unidad === 'Toneladas (Ton)' ? requirement.totalVolume * 1000 : requirement.totalVolume;
    const totalManagementFee = totalKilos * (requirement.managementFeePerKg || 0);

    return (
        <div className="bg-white font-sans max-w-5xl mx-auto space-y-8">
            
            {showTitle && (
                <div className="border-b border-slate-200 pb-6">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{requirement.title}</h2>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">ID: {requirement.id}</span>
                        <span className="text-sm text-slate-600 font-medium">Solicitado por: <strong className="text-slate-900">{buyerDisplay.name}</strong></span>
                    </div>
                </div>
            )}

            {/* --- BLOQUE SUPERIOR: RESUMEN DE EJECUCIÓN --- */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-100 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-slate-500" />
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Plan de Ejecución del Suministro</h3>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    
                    {/* 1. Promedio por Entrega (Izquierda - Prioridad) */}
                    <div>
                        <Label className="text-slate-400">Cantidad por Entrega</Label>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">{deliveryInfo.perDelivery.toFixed(1)}</span>
                            <span className="text-sm font-bold text-slate-500">{requirement.unidad}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">~{deliveryInfo.periods} entregas estimadas</p>
                    </div>

                    {/* 2. Frecuencia y Fechas (Centro) */}
                    <div className="flex flex-col md:items-center md:border-x md:border-slate-200 md:px-6">
                        <Label className="text-slate-400 text-center w-full">Periodicidad</Label>
                        <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-full shadow-sm inline-block mb-3">
                            <span className="text-base font-bold text-slate-800">{requirement.frecuencia}</span>
                        </div>
                        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-2">
                            <span>{requirement.vigenciaInicio}</span>
                            <span className="text-slate-300">➜</span>
                            <span>{requirement.vigenciaFin}</span>
                        </div>
                    </div>

                    {/* 3. Volumen Total Global (Derecha - Contexto) */}
                    <div className="md:text-right">
                        <Label className="text-slate-400">Volumen Total Global</Label>
                        <div className="flex items-baseline gap-1 md:justify-end">
                            <span className="text-2xl font-black text-slate-700 tracking-tight">{requirement.totalVolume}</span>
                            <span className="text-sm font-bold text-slate-500">{requirement.unidad}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* COLUMNA IZQUIERDA: TÉCNICA Y LOGÍSTICA */}
                <div className="space-y-8">
                    
                    {/* SECCIÓN 1: TÉCNICA */}
                    <section className="bg-blue-50/40 rounded-2xl border border-blue-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-blue-100 bg-blue-50 flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-blue-600 shadow-sm"><ArchiveBoxIcon className="w-4 h-4"/></div>
                            <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest">1. Especificaciones del Material</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                                <DetailBlock label="Categoría" value={requirement.categoriaMaterial} labelColor="text-blue-400" />
                                <DetailBlock label="Subcategoría" value={requirement.subcategoria} labelColor="text-blue-400" />
                                <div className="col-span-2">
                                    <Label className="text-blue-400">Presentación Requerida</Label>
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-white text-slate-700 border border-blue-100 shadow-sm">
                                        {requirement.presentacionMaterial}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-blue-100/50">
                                <Label className="text-blue-400">Detalle de Calidad</Label>
                                <div className="mt-1 mb-3 text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-blue-100">
                                    {requirement.especificacionesCalidad}
                                </div>
                                <ResourceLink 
                                    file={requirement.fichaTecnicaCalidad} 
                                    url={requirement.urlFichaTecnicaCalidad} 
                                    colorClass="text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-100"
                                />
                            </div>
                        </div>
                    </section>

                    {/* SECCIÓN 2: LOGÍSTICA */}
                    <section className="bg-teal-50/40 rounded-2xl border border-teal-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-teal-100 bg-teal-50 flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-teal-600 shadow-sm"><TruckIcon className="w-4 h-4"/></div>
                            <h3 className="text-xs font-black text-teal-800 uppercase tracking-widest">2. Logística y Ubicación</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                                <DetailBlock label="Departamento" value={requirement.departamentoRecepcion} labelColor="text-teal-500" />
                                <DetailBlock label="Ciudad / Municipio" value={requirement.ciudadRecepcion} labelColor="text-teal-500" />
                            </div>
                            
                            <div>
                                <Label className="text-teal-500">Condiciones de Recepción</Label>
                                <p className="text-sm text-slate-700 mt-1 mb-2 bg-white p-3 rounded-xl border border-teal-100">{requirement.especificacionesLogisticas}</p>
                                <ResourceLink 
                                    file={requirement.fichaTecnicaLogistica} 
                                    url={requirement.urlFichaTecnicaLogistica} 
                                    colorClass="text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-100"
                                />
                            </div>

                            {(requirement.terminosCalculoFletes || requirement.adjuntoTerminosFletes) && (
                                <div className="mt-4 bg-white p-4 rounded-xl border border-teal-100 shadow-sm">
                                    <Label className="text-teal-600">Términos para Fletes</Label>
                                    <p className="text-sm text-slate-700 mb-2">{requirement.terminosCalculoFletes}</p>
                                    <ResourceLink file={requirement.adjuntoTerminosFletes} colorClass="text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-100" />
                                </div>
                            )}
                        </div>
                    </section>

                </div>

                {/* COLUMNA DERECHA: COMERCIAL */}
                <div className="space-y-8">
                    
                    {/* SECCIÓN 3: COMERCIAL */}
                    <section className="bg-indigo-50/40 rounded-2xl border border-indigo-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50 flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-indigo-600 shadow-sm"><CheckCircleIcon className="w-4 h-4"/></div>
                            <h3 className="text-xs font-black text-indigo-800 uppercase tracking-widest">3. Condiciones Comerciales</h3>
                        </div>
                        <div className="p-6 space-y-8">
                            
                            {/* Grupo Pagos */}
                            <div>
                                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 border-b border-indigo-100 pb-1">Términos de Pago</h4>
                                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                                    <DetailBlock label="Tipo de Pago" value={requirement.tipoPago} labelColor="text-indigo-400" />
                                    <DetailBlock label="Método" value={requirement.metodoPago} labelColor="text-indigo-400" />
                                    <div className="col-span-2 pt-2 border-t border-indigo-50 mt-1">
                                        <DetailBlock 
                                            label="Anticipo Requerido" 
                                            value={requirement.porcentajeAnticipo > 0 ? <span className="font-bold text-indigo-700">{requirement.porcentajeAnticipo}%</span> : 'No aplica (0%)'} 
                                            labelColor="text-indigo-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Grupo Precios */}
                            <div>
                                <div className="flex justify-between items-end mb-3 border-b border-indigo-100 pb-1">
                                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Estructura de Precio</h4>
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">
                                        Moneda: {requirement.moneda}
                                    </span>
                                </div>
                                <PriceStructureTable conditions={requirement.condicionesPrecio} currency={requirement.moneda} />
                            </div>

                        </div>
                    </section>

                    {/* GESTIÓN YUBARTA (Privado) */}
                    {canViewManagementFee && showManagementFee && requirement.managementFeePerKg !== undefined && (
                        <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 overflow-hidden">
                            <div className="px-6 py-3 border-b border-emerald-100 bg-emerald-50 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest">
                                    Gestión Yubarta
                                </h3>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-6">
                                <DetailBlock 
                                    label="Tarifa por Kilo" 
                                    value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(requirement.managementFeePerKg)} 
                                    labelColor="text-emerald-600"
                                />
                                <DetailBlock 
                                    label="Total Estimado" 
                                    value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalManagementFee)} 
                                    labelColor="text-emerald-600"
                                />
                                {requirement.managementFeeAccepted && (
                                    <div className="col-span-2 pt-2">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            ✓ Tarifa Aceptada
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* INFORMACIÓN DEL COMPRADOR (Si aplica) */}
                    {buyer && showBuyerContactInfo && (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-6 py-3 border-b border-slate-200 bg-slate-100 flex items-center gap-2">
                                <UserCircleIcon className="w-4 h-4 text-slate-500"/>
                                <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Información del Solicitante</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <DetailBlock label="Razón Social" value={buyerDisplay.name} />
                                {!buyerDisplay.contactHidden && (
                                    <>
                                        <DetailBlock label="Email" value={buyer.email} />
                                        <DetailBlock label="Identificación" value={`${buyer.idType} ${buyer.idNumber}`} />
                                        <DetailBlock label="Teléfono" value={buyer.phone1} />
                                        <DetailBlock label="Dirección" value={`${buyer.address}, ${buyer.city}`} className="col-span-2" />
                                    </>
                                )}
                                {buyerDisplay.contactHidden && (
                                    <div className="col-span-2 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                                        <span className="mr-2 text-lg">🔒</span>
                                        La información de contacto detallada se revelará una vez que se acepte una oferta formal.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default RequirementDetailView;
