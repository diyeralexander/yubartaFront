
import React, { useState, useEffect, useMemo } from 'react';
import { MarketplaceListing, PurchaseOffer } from '../../types';
import { SpinnerIcon, PlusIcon, TrashIcon } from '../icons';
import { getPenaltyFeePerKg } from '../../utils';

interface Props {
    listing: MarketplaceListing;
    initialData?: Partial<PurchaseOffer>;
    onSubmit: (offer: Partial<PurchaseOffer>) => void;
    onCancel: () => void;
}

interface PriceVariable {
    id: number;
    name: string;
    value: string;
}

const PurchaseOfferForm = ({ listing, initialData, onSubmit, onCancel }: Props) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // DATE HELPER: Use Local Time, not UTC, to prevent validation errors in Western Hemisphere timezones
    const getLocalTodayString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayString = getLocalTodayString();

    // State for granular price editing
    const [priceVariables, setPriceVariables] = useState<PriceVariable[]>([]);

    const [formData, setFormData] = useState({
        quantityRequested: listing.quantity,
        
        // Logística
        aceptaUbicacion: true,
        contrapropuestaLogistica: '',
        frecuenciaRetiro: listing.frequency, // Default to listing
        
        // Calidad
        aceptaCalidad: true,
        contrapropuestaCalidad: '',

        // Precio
        aceptaPrecio: true,
        priceExplanation: '',
        
        // Pago
        metodoPagoPropuesto: 'Transferencia Bancaria',
        condicionesPagoPropuestas: 'Contado',
        
        // Vigencia Oferta
        validFrom: todayString,
        validUntil: '',

        message: '',
        canProvideCertificate: true, // Default to true, only relevant if listing requires it
        penaltyFeeAccepted: false // New field for Module 2 penalty symmetry
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                quantityRequested: initialData.quantityRequested || prev.quantityRequested,
                aceptaUbicacion: initialData.aceptaUbicacion ?? prev.aceptaUbicacion,
                contrapropuestaLogistica: initialData.contrapropuestaLogistica || prev.contrapropuestaLogistica,
                frecuenciaRetiro: initialData.frecuenciaRetiro || prev.frecuenciaRetiro,
                aceptaCalidad: initialData.aceptaCalidad ?? prev.aceptaCalidad,
                contrapropuestaCalidad: initialData.contrapropuestaCalidad || prev.contrapropuestaCalidad,
                aceptaPrecio: initialData.aceptaPrecio ?? prev.aceptaPrecio,
                priceExplanation: initialData.priceExplanation || prev.priceExplanation,
                metodoPagoPropuesto: initialData.metodoPagoPropuesto || prev.metodoPagoPropuesto,
                condicionesPagoPropuestas: initialData.condicionesPagoPropuestas || prev.condicionesPagoPropuestas,
                validFrom: initialData.validFrom || prev.validFrom,
                validUntil: initialData.validUntil || prev.validUntil,
                message: initialData.message || prev.message,
                canProvideCertificate: initialData.canProvideCertificate ?? prev.canProvideCertificate,
                penaltyFeeAccepted: initialData.penaltyFeeAccepted || false,
            }));

            // Restore price variables if existing
            if (initialData.offerPriceStructure) {
                try {
                    const parsed = JSON.parse(initialData.offerPriceStructure);
                    if (Array.isArray(parsed)) {
                        setPriceVariables(parsed.map((v: any, i: number) => ({
                            id: Date.now() + i,
                            name: v.name,
                            value: String(v.value)
                        })));
                    }
                } catch(e) {}
            }
        } else {
            // Init price variables from listing if available, or just base price
            let initialVars: PriceVariable[] = [];
            try {
                const parsed = JSON.parse(listing.priceStructure);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    initialVars = parsed.map((v: any, i: number) => ({
                        id: Date.now() + i,
                        name: v.name,
                        value: String(v.value)
                    }));
                } else {
                    initialVars = [{ id: Date.now(), name: 'Precio Base Publicado', value: String(listing.pricePerUnit) }];
                }
            } catch(e) {
                initialVars = [{ id: Date.now(), name: 'Precio Base Publicado', value: String(listing.pricePerUnit) }];
            }
            setPriceVariables(initialVars);
        }
    }, [initialData, listing]);

    // --- LOGIC CHANGE: STRICT PENALTY MIRRORING (MODULE 2) ---
    // The Penalty Fee for the Buyer MUST match the Management Fee accepted by the Seller in the Listing.
    const penaltyFeePerKg = useMemo(() => {
        // Priority 1: Use the EXACT fee stored in the listing (agreed by seller)
        if (listing.managementFeePerKg !== undefined && listing.managementFeePerKg > 0) {
            return listing.managementFeePerKg;
        }
        
        // Priority 2: Fallback Calculation
        const totalKg = listing.unit === 'Toneladas' ? listing.quantity * 1000 : listing.quantity;
        return getPenaltyFeePerKg(totalKg / 1000);
    }, [listing]);

    const counterProposalTotal = useMemo(() => {
        return priceVariables.reduce((sum, v) => sum + (parseFloat(v.value) || 0), 0);
    }, [priceVariables]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'radio') {
             setFormData(prev => ({ 
                ...prev, 
                [name]: value === 'true'
            }));
        } else if (type === 'number') {
             setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
        } else if (type === 'checkbox') {
             setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
             setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Price Variable Handlers
    const addPriceVariable = () => {
        setPriceVariables(prev => [...prev, { id: Date.now(), name: '', value: '0' }]);
    };

    const removePriceVariable = (id: number) => {
        if (priceVariables.length > 1) {
            setPriceVariables(prev => prev.filter(v => v.id !== id));
        }
    };

    const updatePriceVariable = (id: number, field: keyof PriceVariable, value: string) => {
        setPriceVariables(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // --- DATE VALIDATION ---
        // Basic check for empty strings
        if (!formData.validFrom) {
            alert('Por favor seleccione una fecha de inicio.');
            return;
        }

        if (formData.validFrom < todayString) {
            alert(`La fecha de inicio (${formData.validFrom}) no puede ser anterior a la fecha actual (${todayString}).`);
            return;
        }

        if (formData.validUntil && formData.validUntil < formData.validFrom) {
            alert('La fecha de fin de vigencia no puede ser anterior a la fecha de inicio.');
            return;
        }
        // -----------------------

        if (formData.quantityRequested <= 0 || formData.quantityRequested > listing.quantity) {
            alert(`La cantidad debe ser mayor a 0 y menor o igual a ${listing.quantity}.`);
            return;
        }
        
        if (!formData.aceptaPrecio && !formData.priceExplanation) {
            alert('Si realiza una contrapropuesta de precio, debe explicar la razón.');
            return;
        }

        if (!formData.aceptaCalidad && !formData.contrapropuestaCalidad) {
            alert('Si no acepta la calidad, debe especificar su contrapropuesta o requerimiento.');
            return;
        }

        // Penalty validation (Simetría Módulo 1)
        if (!formData.penaltyFeeAccepted) {
            alert('Es obligatorio aceptar la garantía de cumplimiento y penalidad para poder enviar la oferta de compra.');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            const finalPrice = formData.aceptaPrecio 
                ? listing.pricePerUnit * formData.quantityRequested
                : counterProposalTotal * formData.quantityRequested;
            
            const priceStructureJson = formData.aceptaPrecio 
                ? listing.priceStructure 
                : JSON.stringify({
                    variables: priceVariables.map(v => ({ 
                        name: v.name, 
                        value: parseFloat(v.value) || 0,
                        isNew: false 
                    })),
                    total: counterProposalTotal,
                    observation: formData.priceExplanation
                });

            onSubmit({
                quantityRequested: formData.quantityRequested,
                totalPriceOffered: finalPrice,
                frecuenciaRetiro: formData.frecuenciaRetiro,
                
                // Logística
                aceptaUbicacion: formData.aceptaUbicacion,
                contrapropuestaLogistica: formData.contrapropuestaLogistica,
                
                // Calidad
                aceptaCalidad: formData.aceptaCalidad,
                contrapropuestaCalidad: formData.contrapropuestaCalidad,

                // Precio
                aceptaPrecio: formData.aceptaPrecio,
                contrapropuestaPrecio: formData.aceptaPrecio ? undefined : counterProposalTotal,
                offerPriceStructure: priceStructureJson,
                priceExplanation: formData.priceExplanation,

                // Pago
                metodoPagoPropuesto: formData.metodoPagoPropuesto,
                condicionesPagoPropuestas: formData.condicionesPagoPropuestas,
                
                // Vigencia
                validFrom: formData.validFrom,
                validUntil: formData.validUntil || formData.validFrom, // Default until to from if empty

                message: formData.message,
                canProvideCertificate: formData.canProvideCertificate,
                penaltyFeeAccepted: formData.penaltyFeeAccepted
            });
            setIsSubmitting(false);
        }, 1000);
    };

    const commonInputClass = "mt-1 block w-full px-3 py-2 border border-[#D6D6D6] rounded-lg shadow-sm placeholder-[#7A7A7A] focus:outline-none focus:ring-[#007A8A] focus:border-[#007A8A] sm:text-sm text-[#0A0A0A] bg-white";
    const commonLabelClass = "block text-sm font-bold text-[#3D3D3D] mb-1";
    const radioLabelClass = "flex items-center space-x-2 text-sm text-[#3D3D3D] font-medium";
    const conditionBlockClass = "mt-2 p-3 bg-[#FAFBFC] border border-dashed border-[#D6D6D6] rounded-lg text-sm text-[#7A7A7A]";
    const fieldsetLegendClass = "text-lg font-bold text-[#0A0A0A] border-b border-[#F5F7F8] pb-2 mb-4 w-full";

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Datos Básicos de la Compra */}
            <fieldset className="bg-[#D7EEF0] p-6 rounded-2xl border border-[#005B6A]/10">
                <legend className="text-md font-bold text-[#005B6A] mb-4 uppercase tracking-wide">1. Definición de la Orden</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={commonLabelClass}>Cantidad a Comprar ({listing.unit})</label>
                        <input 
                            type="number" 
                            name="quantityRequested" 
                            value={formData.quantityRequested} 
                            onChange={handleChange} 
                            max={listing.quantity}
                            className={commonInputClass}
                        />
                        <p className="text-xs text-[#005B6A] mt-1 font-medium">Máximo disponible: {listing.quantity} {listing.unit}</p>
                    </div>
                    
                    <div>
                        <label className={commonLabelClass}>Vigencia de la Oferta (Desde - Hasta)</label>
                        <div className="flex gap-2">
                            <input 
                                type="date" 
                                name="validFrom" 
                                value={formData.validFrom} 
                                onChange={handleChange} 
                                required
                                min={todayString}
                                className={commonInputClass}
                            />
                            <input 
                                type="date" 
                                name="validUntil" 
                                value={formData.validUntil} 
                                onChange={handleChange} 
                                min={formData.validFrom}
                                className={commonInputClass}
                            />
                        </div>
                    </div>
                </div>
            </fieldset>

            {/* 2. Ubicación y Logística */}
            <fieldset>
                <legend className={fieldsetLegendClass}>2. Ubicación y Logística</legend>
                <div className={conditionBlockClass}>
                    <strong>Ubicación Vendedor:</strong> {listing.locationCity}, {listing.locationDepartment}.<br/>
                    {listing.logisticsDescription && <span className="text-xs">{listing.logisticsDescription}</span>}
                </div>
                <div className="mt-4">
                    <label className={commonLabelClass}>¿Acepta recoger el material en esta ubicación?</label>
                    <div className="flex space-x-6 mt-2">
                        <label className={radioLabelClass}><input type="radio" name="aceptaUbicacion" value="true" checked={formData.aceptaUbicacion === true} onChange={handleChange} className="text-[#007A8A] focus:ring-[#007A8A]"/> <span>Sí, acepto</span></label>
                        <label className={radioLabelClass}><input type="radio" name="aceptaUbicacion" value="false" checked={formData.aceptaUbicacion === false} onChange={handleChange} className="text-[#007A8A] focus:ring-[#007A8A]"/> <span>No, proponer punto</span></label>
                    </div>
                </div>
                {!formData.aceptaUbicacion && (
                    <div className="mt-3">
                        <label className={commonLabelClass}>Contrapropuesta Logística</label>
                        <textarea name="contrapropuestaLogistica" rows={2} value={formData.contrapropuestaLogistica} onChange={handleChange} className={commonInputClass} placeholder="Ej: Solicito entrega en mi planta en..."></textarea>
                    </div>
                )}
            </fieldset>

            {/* 3. Calidad */}
            <fieldset>
                <legend className={fieldsetLegendClass}>3. Calidad del Material</legend>
                <div className={conditionBlockClass}>
                    <strong>Descripción:</strong> {listing.description}<br/>
                    <strong>Detalles:</strong> {listing.qualityDescription || 'Ver ficha técnica.'}
                </div>
                <div className="mt-4">
                    <label className={commonLabelClass}>¿Acepta las condiciones de calidad descritas?</label>
                    <div className="flex space-x-6 mt-2">
                        <label className={radioLabelClass}><input type="radio" name="aceptaCalidad" value="true" checked={formData.aceptaCalidad === true} onChange={handleChange} className="text-[#007A8A] focus:ring-[#007A8A]"/> <span>Sí, acepto</span></label>
                        <label className={radioLabelClass}><input type="radio" name="aceptaCalidad" value="false" checked={formData.aceptaCalidad === false} onChange={handleChange} className="text-[#007A8A] focus:ring-[#007A8A]"/> <span>No, hacer observación</span></label>
                    </div>
                </div>
                {!formData.aceptaCalidad && (
                    <div className="mt-3">
                        <label className={commonLabelClass}>Contrapropuesta / Observación de Calidad</label>
                        <textarea name="contrapropuestaCalidad" rows={2} value={formData.contrapropuestaCalidad} onChange={handleChange} className={commonInputClass} placeholder="Especifique qué condiciones requiere o ajusta..."></textarea>
                    </div>
                )}
            </fieldset>

            {/* 4. Precio y Estructura */}
            <fieldset>
                <legend className={fieldsetLegendClass}>4. Negociación de Precio</legend>
                <div className={conditionBlockClass}>
                    Precio Lista por Kilo: <strong>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: listing.currency }).format(listing.pricePerUnit)} / kg</strong>
                </div>
                
                <div className="mt-4">
                    <label className={commonLabelClass}>¿Acepta el precio publicado?</label>
                    <div className="flex space-x-6 mt-2 mb-4">
                        <label className={radioLabelClass}><input type="radio" name="aceptaPrecio" value="true" checked={formData.aceptaPrecio === true} onChange={handleChange} className="text-[#007A8A] focus:ring-[#007A8A]"/> <span>Sí, acepto el precio lista</span></label>
                        <label className={radioLabelClass}><input type="radio" name="aceptaPrecio" value="false" checked={formData.aceptaPrecio === false} onChange={handleChange} className="text-[#007A8A] focus:ring-[#007A8A]"/> <span>No, quiero contraofertar</span></label>
                    </div>
                </div>

                {!formData.aceptaPrecio && (
                    <div className="bg-[#FFFDF0] p-4 rounded-xl border border-[#D6D6D6] shadow-sm">
                        <h4 className="text-sm font-bold text-[#7A7A7A] uppercase mb-3">Tu Propuesta de Precio</h4>
                        
                        <div className="space-y-3">
                            {priceVariables.map((variable) => (
                                <div key={variable.id} className="flex space-x-2 items-center">
                                    <input 
                                        type="text" 
                                        placeholder="Concepto" 
                                        value={variable.name}
                                        onChange={(e) => updatePriceVariable(variable.id, 'name', e.target.value)}
                                        className="flex-grow rounded-lg border-[#D6D6D6] border p-2 text-sm focus:ring-[#007A8A] focus:border-[#007A8A]"
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={variable.value}
                                        onChange={(e) => updatePriceVariable(variable.id, 'value', e.target.value)}
                                        className="w-32 rounded-lg border-[#D6D6D6] border p-2 text-sm text-right focus:ring-[#007A8A] focus:border-[#007A8A]"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => removePriceVariable(variable.id)}
                                        className="p-2 text-[#7A7A7A] hover:text-[#B63A3A] transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addPriceVariable} className="text-sm text-[#007A8A] font-bold flex items-center mt-2 hover:text-[#005B6A]">
                                <PlusIcon className="w-4 h-4 mr-1" /> Agregar Concepto
                            </button>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#D6D6D6] flex justify-between items-center">
                            <span className="font-bold text-[#3D3D3D]">Nuevo Precio Total:</span>
                            <span className="text-xl font-bold text-[#007A8A]">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: listing.currency }).format(counterProposalTotal)} / kg
                            </span>
                        </div>

                        <div className="mt-3">
                            <label className={commonLabelClass}>Justificación del Precio</label>
                            <textarea name="priceExplanation" rows={2} value={formData.priceExplanation} onChange={handleChange} className={commonInputClass} placeholder="Explica por qué propones este cambio..."></textarea>
                        </div>
                    </div>
                )}
            </fieldset>

            {/* 5. Pago */}
            <fieldset>
                <legend className={fieldsetLegendClass}>5. Condiciones de Pago</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={commonLabelClass}>Método de Pago</label>
                        <select name="metodoPagoPropuesto" value={formData.metodoPagoPropuesto} onChange={handleChange} className={commonInputClass}>
                            <option>Transferencia Bancaria</option>
                            <option>Efectivo</option>
                            <option>Cheque</option>
                            <option>Otro</option>
                        </select>
                    </div>
                    <div>
                        <label className={commonLabelClass}>Plazo de Pago</label>
                        <select name="condicionesPagoPropuestas" value={formData.condicionesPagoPropuestas} onChange={handleChange} className={commonInputClass}>
                            <option>Contado (Contraentrega)</option>
                            <option>Anticipado</option>
                            <option>A 8 días</option>
                            <option>A 15 días</option>
                            <option>A 30 días</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            {/* 6. Legal / Certificados */}
            {listing.requiresCertificate && (
                <fieldset className="bg-[#FFF7DA] border border-[#C98B00]/20 rounded-xl p-4">
                    <legend className="text-sm font-bold text-[#854D0E] mb-2 uppercase">Requisitos Legales</legend>
                    <label className="block text-sm font-medium text-[#3D3D3D] mb-2">El vendedor requiere certificado de disposición final. ¿Puede emitirlo?</label>
                    <div className="flex space-x-6">
                        <label className="inline-flex items-center">
                            <input 
                                type="radio" 
                                name="canProvideCertificate" 
                                value="true" 
                                checked={formData.canProvideCertificate === true} 
                                onChange={handleChange} 
                                className="form-radio h-4 w-4 text-[#007A8A] focus:ring-[#007A8A]"
                            />
                            <span className="ml-2 text-sm font-medium text-[#3D3D3D]">Sí, puedo certificar</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input 
                                type="radio" 
                                name="canProvideCertificate" 
                                value="false" 
                                checked={formData.canProvideCertificate === false} 
                                onChange={handleChange} 
                                className="form-radio h-4 w-4 text-[#7A7A7A] focus:ring-[#007A8A]"
                            />
                            <span className="ml-2 text-sm font-medium text-[#3D3D3D]">No puedo</span>
                        </label>
                    </div>
                </fieldset>
            )}

            {/* 7. Mensaje */}
            <fieldset>
                <legend className={fieldsetLegendClass}>Notas Adicionales</legend>
                <textarea name="message" rows={3} value={formData.message} onChange={handleChange} className={commonInputClass} placeholder="Cualquier otra condición o comentario..."></textarea>
            </fieldset>

            {/* 8. Garantía de Cumplimiento (Simetría M2) */}
            <fieldset>
                <legend className="text-lg font-medium text-[#B63A3A]">Garantía de Cumplimiento</legend>
                <div className="mt-4 bg-[#FCEAEA] p-6 rounded-lg border border-[#F8C4C4]">
                    <p className="text-sm text-[#7F1D1D] mb-4">
                        Para asegurar la seriedad de la oferta de compra, el comprador acepta la siguiente condición de penalidad en caso de no recoger el material o incumplir el pago en los términos pactados.
                    </p>
                    
                    <div className="bg-white p-3 rounded shadow-sm border border-[#FECACA] mb-4 inline-block">
                        <span className="block text-[#7F1D1D] text-xs uppercase tracking-wide">Valor Penalidad por Kilo No Retirado</span>
                        <span className="text-lg font-bold text-[#B63A3A]">
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(penaltyFeePerKg)}
                        </span>
                    </div>

                    <div className="flex items-start">
                        <div className="flex items-center h-5">
                            <input
                                id="penaltyFeeAccepted"
                                name="penaltyFeeAccepted"
                                type="checkbox"
                                checked={formData.penaltyFeeAccepted}
                                onChange={handleChange}
                                required
                                className="focus:ring-[#B63A3A] h-4 w-4 text-[#B63A3A] border-[#D6D6D6] rounded"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="penaltyFeeAccepted" className="font-medium text-[#7F1D1D]">
                                Acepto que se me cobrará un valor de {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(penaltyFeePerKg)} por Kilo por el material NO retirado o pagado según lo pactado en esta oferta, una vez haya sido aceptada por el vendedor.
                            </label>
                            <p className="text-[#B63A3A] text-xs mt-1 font-bold">La aceptación de esta cláusula es obligatoria para enviar la oferta.</p>
                        </div>
                    </div>
                </div>
            </fieldset>

            <div className="flex justify-end space-x-3 pt-6 border-t border-[#F5F7F8]">
                <button type="button" onClick={onCancel} className="bg-white py-2.5 px-6 border border-[#D6D6D6] rounded-lg shadow-sm text-sm font-bold text-[#3D3D3D] hover:bg-[#F5F7F8] transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-bold rounded-lg text-white bg-[#007A8A] hover:bg-[#005B6A] disabled:opacity-50 min-w-[160px] transition-all">
                    {isSubmitting ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Enviar Oferta de Compra'}
                </button>
            </div>
        </form>
    );
};

export default PurchaseOfferForm;
