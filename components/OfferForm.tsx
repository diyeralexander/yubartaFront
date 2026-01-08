
import React, { useState, useEffect, useMemo } from 'react';
import { Offer, Requirement } from '../types';
import { SpinnerIcon, PlusIcon, TrashIcon } from './icons';
import { getPenaltyFeePerKg, parseDate, addDays, calculateDeliveryPeriods } from '../utils';

type OfferFormState = Omit<Offer, 'id' | 'sellerId' | 'status' | 'createdAt' | 'requirementId' | 'unidadMedida'>;

interface OfferFormProps {
    requirement: Requirement;
    initialData?: Offer;
    onSubmit: (offerData: Omit<Offer, 'id' | 'sellerId' | 'status' | 'createdAt'>) => void;
    onCancel: () => void;
    submitButtonText?: string;
}

interface PriceVariable {
    id: number;
    name: string;
    buyerValue: number;
    sellerValue: number;
    isNew: boolean;
}

const PriceConditionsDisplay = ({ conditions, currency }: { conditions: string, currency: string }) => {
    try {
        const parsed = JSON.parse(conditions);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return <>{conditions}</>;
        }
        const total = parsed.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

        return (
            <div>
                <ul className="space-y-1 text-gray-800">
                    {parsed.map((item, index) => (
                        <li key={index} className="flex justify-between items-center">
                            <span>{item.name}</span>
                            <span className="font-mono bg-gray-200 px-2 py-0.5 rounded-md text-sm">{new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(item.value)}</span>
                        </li>
                    ))}
                </ul>
                <div className="border-t mt-2 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total Estimado por Kg</span>
                    <span className="font-mono">{new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(total)}</span>
                </div>
            </div>
        );
    } catch (e) {
        return <>{conditions}</>;
    }
};

const OfferForm = ({ requirement, initialData, onSubmit, onCancel, submitButtonText = 'Enviar Oferta' }: OfferFormProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Date Helper
    const todayString = new Date().toISOString().split('T')[0];

    // Calculate valid date range for offer
    // The offer start date can be today or later, but must be within requirement validity
    const effectiveMinDate = requirement.vigenciaInicio > todayString ? requirement.vigenciaInicio : todayString;
    // If requirement end date is in the past, allow future dates (admin override case)
    const effectiveMaxDate = requirement.vigenciaFin < todayString ? '' : requirement.vigenciaFin;

    // State for granular price editing
    const [priceVariables, setPriceVariables] = useState<PriceVariable[]>([]);
    const [priceObservation, setPriceObservation] = useState('');

    const [formData, setFormData] = useState<OfferFormState>({
        cantidadOfertada: 0,
        frecuenciaSuministro: requirement.frecuencia, // Default to requirement's freq
        tipoVehiculo: '',
        aceptaEspecificacionesCalidad: true,
        contrapropuestaCalidad: '',
        aceptaCondicionesLogisticas: true,
        contrapropuestaLogistica: '',
        aceptaLugarEntrega: true,
        aceptaFormulaPrecio: true,
        contrapropuestaFormulaPrecio: '',
        aceptaCondicionesPago: true,
        contrapropuestaCondicionesPago: '',
        aceptaMetodoPago: true,
        contrapropuestaMetodoPago: '',
        fechaInicioVigencia: '',
        fechaFinVigencia: '',
        fotosMaterial: undefined,
        fotosProceso: undefined,
        fotosInstalaciones: undefined,
        communicationLog: [],
        penaltyFeeAccepted: false,
    });

    // Initialize price variables from requirement
    useEffect(() => {
        if (!initialData) {
            let variables: PriceVariable[] = [];
            try {
                const parsed = JSON.parse(requirement.condicionesPrecio);
                if (Array.isArray(parsed)) {
                    variables = parsed.map((item: any, index: number) => ({
                        id: Date.now() + index,
                        name: item.name,
                        buyerValue: Number(item.value) || 0,
                        sellerValue: Number(item.value) || 0, // Default seller value to buyer value
                        isNew: false
                    }));
                }
            } catch (e) {
                // If parsing fails, we can't use the granular editor easily, fallback to empty
            }
            setPriceVariables(variables);
        }
    }, [requirement.condicionesPrecio, initialData]);

    useEffect(() => {
        if (initialData) {
            const baseData = {
                cantidadOfertada: initialData.cantidadOfertada,
                frecuenciaSuministro: initialData.frecuenciaSuministro,
                tipoVehiculo: initialData.tipoVehiculo || '',
                aceptaEspecificacionesCalidad: initialData.aceptaEspecificacionesCalidad,
                contrapropuestaCalidad: initialData.contrapropuestaCalidad || '',
                aceptaCondicionesLogisticas: initialData.aceptaCondicionesLogisticas,
                contrapropuestaLogistica: initialData.contrapropuestaLogistica || '',
                aceptaLugarEntrega: initialData.aceptaLugarEntrega,
                aceptaFormulaPrecio: initialData.aceptaFormulaPrecio,
                contrapropuestaFormulaPrecio: initialData.contrapropuestaFormulaPrecio || '',
                aceptaCondicionesPago: initialData.aceptaCondicionesPago,
                contrapropuestaCondicionesPago: initialData.contrapropuestaCondicionesPago || '',
                aceptaMetodoPago: initialData.aceptaMetodoPago,
                contrapropuestaMetodoPago: initialData.contrapropuestaMetodoPago || '',
                fechaInicioVigencia: initialData.fechaInicioVigencia,
                fechaFinVigencia: initialData.fechaFinVigencia,
                fotosMaterial: initialData.fotosMaterial,
                fotosProceso: initialData.fotosProceso,
                fotosInstalaciones: initialData.fotosInstalaciones,
                communicationLog: initialData.communicationLog || [],
                penaltyFeeAccepted: initialData.penaltyFeeAccepted || false,
            };
            setFormData(baseData);

            // If editing existing offer that has a complex counter proposal
            if (!initialData.aceptaFormulaPrecio && initialData.contrapropuestaFormulaPrecio) {
                try {
                    // Try to parse if it's the new JSON format
                    const parsedCounter = JSON.parse(initialData.contrapropuestaFormulaPrecio);
                    if (parsedCounter.variables && Array.isArray(parsedCounter.variables)) {
                         
                         // Reconstruct variables merging saved state with requirement state (to know original buyer values)
                         let reqVariables: any[] = [];
                         try {
                             reqVariables = JSON.parse(requirement.condicionesPrecio) || [];
                         } catch (e) {}

                         const reconstructedVars: PriceVariable[] = parsedCounter.variables.map((v: any, idx: number) => {
                             // Try to find original value if saved, else look in requirement, else 0
                             let originalVal = v.originalValue;
                             if (originalVal === undefined) {
                                 const reqVar = reqVariables.find(rv => rv.name === v.name);
                                 originalVal = reqVar ? Number(reqVar.value) : 0;
                             }

                             return {
                                 id: Date.now() + idx,
                                 name: v.name,
                                 buyerValue: Number(originalVal),
                                 sellerValue: Number(v.value),
                                 isNew: v.isNew !== undefined ? v.isNew : (originalVal === 0 && !reqVariables.find(rv => rv.name === v.name))
                             };
                         });
                         
                         setPriceVariables(reconstructedVars);
                         setPriceObservation(parsedCounter.observation || '');
                    } else {
                        // Legacy text format
                         setPriceObservation(initialData.contrapropuestaFormulaPrecio);
                    }
                } catch (e) {
                    // It's plain text
                     setPriceObservation(initialData.contrapropuestaFormulaPrecio);
                }
            }
        } else {
             setFormData(prev => ({
                 ...prev,
                 frecuenciaSuministro: requirement.frecuencia,
                 cantidadOfertada: 0,
             }));
        }
    }, [initialData, requirement]);

    // Robust calculation of periods matching OfferTimeline logic using util
    const periodCount = useMemo(() => {
        return calculateDeliveryPeriods(formData.fechaInicioVigencia, formData.fechaFinVigencia, formData.frecuenciaSuministro);
    }, [formData.fechaInicioVigencia, formData.fechaFinVigencia, formData.frecuenciaSuministro]);

    // Derived value for display
    const estimatedPerDelivery = periodCount > 0 ? formData.cantidadOfertada / periodCount : 0;
    
    const counterProposalTotal = useMemo(() => {
        return priceVariables.reduce((sum, v) => sum + v.sellerValue, 0);
    }, [priceVariables]);

    // --- LOGIC CHANGE: STRICT PENALTY MIRRORING ---
    // The Penalty Fee for the Seller MUST match the Management Fee accepted by the Buyer.
    const penaltyFeePerKg = useMemo(() => {
        // Priority 1: Use the EXACT fee stored in the requirement (agreed by buyer)
        if (requirement.managementFeePerKg !== undefined && requirement.managementFeePerKg > 0) {
            return requirement.managementFeePerKg;
        }
        
        // Priority 2: Fallback Calculation (Legacy records)
        const totalTons = requirement.unidad === 'Kilogramos (Kg)' ? requirement.totalVolume / 1000 : requirement.totalVolume;
        return getPenaltyFeePerKg(totalTons);
    }, [requirement]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'radio' && !name.startsWith('mode_')) {
            const isTrue = value === 'true';
            const counterProposalField = `contrapropuesta${name.split('acepta')[1]}`;
            setFormData(prev => ({ 
                ...prev, 
                [name]: isTrue,
                ...(isTrue && { [counterProposalField]: '' })
            }));
        } else if (type === 'checkbox') {
             setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
        }
    };
    
    const handlePriceVariableChange = (id: number, field: 'name' | 'sellerValue', value: string) => {
        setPriceVariables(prev => prev.map(v => {
            if (v.id === id) {
                return { 
                    ...v, 
                    [field]: field === 'sellerValue' ? (parseFloat(value) || 0) : value 
                };
            }
            return v;
        }));
    };

    const addPriceVariable = () => {
        setPriceVariables(prev => [...prev, {
            id: Date.now(),
            name: '',
            buyerValue: 0,
            sellerValue: 0,
            isNew: true
        }]);
    };

    const removePriceVariable = (id: number) => {
        setPriceVariables(prev => prev.filter(v => v.id !== id));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target && typeof event.target.result === 'string') {
                    setFormData(prev => ({ 
                        ...prev, 
                        [name]: { name: file.name, content: event.target.result as string }
                    }));
                }
            };
            reader.readAsDataURL(file);
        } else {
            setFormData(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // --- DATE VALIDATION ---
        if (formData.fechaInicioVigencia < effectiveMinDate) {
            alert(`La fecha de inicio de la oferta no puede ser anterior a ${effectiveMinDate}.`);
            return;
        }

        if (formData.fechaFinVigencia < formData.fechaInicioVigencia) {
            alert('La fecha de fin de vigencia no puede ser anterior a la fecha de inicio.');
            return;
        }

        // Only validate max date if the requirement hasn't expired (admin override case)
        if (effectiveMaxDate && formData.fechaFinVigencia > effectiveMaxDate) {
            alert(`La fecha de fin de la oferta (${formData.fechaFinVigencia}) no puede ser posterior a la fecha de fin de la solicitud (${effectiveMaxDate}).`);
            return;
        }
        
        if (formData.cantidadOfertada <= 0) {
             alert('La cantidad ofertada debe ser mayor a 0.');
             return;
        }
        
        if (!formData.tipoVehiculo) {
             alert('Por favor, indique el tipo de vehículo para la entrega.');
             return;
        }

        // Penalty validation
        if (!formData.penaltyFeeAccepted) {
            alert('Es obligatorio aceptar la garantía de cumplimiento y penalidad para poder enviar la oferta.');
            return;
        }

        setIsSubmitting(true);
        
        // Construct price counter proposal data
        let finalCounterProposalFormula = formData.contrapropuestaFormulaPrecio;
        if (!formData.aceptaFormulaPrecio) {
            const priceData = {
                variables: priceVariables.map(v => ({ 
                    name: v.name, 
                    value: v.sellerValue,
                    originalValue: v.buyerValue,
                    isNew: v.isNew 
                })),
                total: counterProposalTotal,
                observation: priceObservation
            };
            finalCounterProposalFormula = JSON.stringify(priceData);
        }

        setTimeout(() => {
            onSubmit({
                ...formData,
                requirementId: requirement.id,
                unidadMedida: requirement.unidad,
                contrapropuestaFormulaPrecio: finalCounterProposalFormula
            });
            setIsSubmitting(false);
        }, 1500);
    };

    const commonInputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm";
    const commonLabelClass = "block text-sm font-medium text-gray-700";
    const radioLabelClass = "flex items-center space-x-2 text-sm";
    const conditionBlockClass = "mt-2 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-md text-sm text-gray-600";
    const fieldsetLegendClass = "text-lg font-medium text-gray-900";

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <fieldset>
                <legend className={fieldsetLegendClass}>1. Datos de la Oferta</legend>
                <div className="mt-4 space-y-6">
                    {/* 1. Fechas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="fechaInicioVigencia" className={commonLabelClass}>Inicio Vigencia</label>
                            <input
                                type="date"
                                name="fechaInicioVigencia"
                                id="fechaInicioVigencia"
                                value={formData.fechaInicioVigencia}
                                onChange={handleChange}
                                required
                                className={commonInputClass}
                                min={effectiveMinDate}
                                max={effectiveMaxDate || undefined}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {effectiveMaxDate
                                    ? `Rango válido: ${effectiveMinDate} a ${effectiveMaxDate}`
                                    : `Fecha mínima: ${effectiveMinDate}`}
                            </p>
                        </div>
                        <div>
                            <label htmlFor="fechaFinVigencia" className={commonLabelClass}>Fin Vigencia</label>
                            <input
                                type="date"
                                name="fechaFinVigencia"
                                id="fechaFinVigencia"
                                value={formData.fechaFinVigencia}
                                onChange={handleChange}
                                required
                                className={commonInputClass}
                                min={formData.fechaInicioVigencia || effectiveMinDate}
                                max={effectiveMaxDate || undefined}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {effectiveMaxDate
                                    ? `Límite máximo: ${effectiveMaxDate}`
                                    : 'Sin límite máximo (solicitud vencida - modo admin)'}
                            </p>
                        </div>
                    </div>
                    
                    {/* 2. Logística de Entrega (Vehículo y Frecuencia) */}
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                         <h4 className="text-sm font-semibold text-gray-700 mb-3">Logística de Entrega</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                 <label htmlFor="tipoVehiculo" className={commonLabelClass}>Tipo de Vehículo</label>
                                 <input 
                                    type="text" 
                                    name="tipoVehiculo" 
                                    id="tipoVehiculo" 
                                    value={formData.tipoVehiculo} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Ej: Camión Turbo, Doble Troque, Mula"
                                    className={commonInputClass}
                                 />
                                 <p className="text-xs text-gray-500 mt-1">Indique el tipo de vehículo utilizado para las entregas.</p>
                             </div>
                             <div>
                                 <label htmlFor="frecuenciaSuministro" className={commonLabelClass}>Frecuencia de Suministro</label>
                                <select 
                                    name="frecuenciaSuministro" 
                                    id="frecuenciaSuministro" 
                                    value={formData.frecuenciaSuministro} 
                                    onChange={handleChange} 
                                    className={commonInputClass}
                                >
                                    <option>Única Vez</option>
                                    <option>Diario</option>
                                    <option>Semanal</option>
                                    <option>Quincenal</option>
                                    <option>Mensual</option>
                                    <option>Trimestral</option>
                                    <option>Anual</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Propuesta de periodicidad.</p>
                            </div>
                         </div>
                    </div>

                    {/* 3. Cantidad Total */}
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="cantidadOfertada" className={commonLabelClass}>
                                    Cantidad TOTAL Global
                                </label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                    <input type="number" name="cantidadOfertada" id="cantidadOfertada" value={formData.cantidadOfertada} onChange={handleChange} required className={`${commonInputClass} pr-16`} />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                        <span className="text-gray-500 sm:text-sm">{requirement.unidad}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Suma total de todas las entregas ofertadas.</p>
                            </div>

                            <div className="bg-white p-3 rounded border border-gray-200 flex flex-col justify-center">
                                <div className="text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Periodos Estimados:</span>
                                        <strong>{periodCount}</strong>
                                    </div>
                                    <div className="flex justify-between mt-1 text-teal-700">
                                        <span>Promedio por entrega:</span>
                                        <strong>{estimatedPerDelivery.toFixed(2)} {requirement.unidad}</strong>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend className={fieldsetLegendClass}>2. Especificaciones Técnicas y de Calidad</legend>
                <p className="mt-1 text-sm text-gray-500">Condición del Comprador:</p>
                <div className={conditionBlockClass}>{requirement.especificacionesCalidad}</div>
                <div className="mt-4">
                    <label className={commonLabelClass}>¿Acepta las especificaciones de calidad?</label>
                    <div className="flex space-x-4 mt-2">
                        <label className={radioLabelClass}><input type="radio" name="aceptaEspecificacionesCalidad" value="true" checked={formData.aceptaEspecificacionesCalidad === true} onChange={handleChange}/> <span>Sí</span></label>
                        <label className={radioLabelClass}><input type="radio" name="aceptaEspecificacionesCalidad" value="false" checked={formData.aceptaEspecificacionesCalidad === false} onChange={handleChange}/> <span>No</span></label>
                    </div>
                </div>
                {!formData.aceptaEspecificacionesCalidad && (
                    <div className="mt-4">
                        <label htmlFor="contrapropuestaCalidad" className={commonLabelClass}>Contrapropuesta de Calidad</label>
                        <textarea name="contrapropuestaCalidad" id="contrapropuestaCalidad" rows={3} value={formData.contrapropuestaCalidad} onChange={handleChange} required className={commonInputClass}></textarea>
                    </div>
                )}
            </fieldset>

            <fieldset>
                <legend className={fieldsetLegendClass}>3. Condiciones Logísticas</legend>
                <p className="mt-1 text-sm text-gray-500">Condición del Comprador:</p>
                <div className={conditionBlockClass}>{requirement.especificacionesLogisticas}</div>
                <div className="mt-4">
                    <label className={commonLabelClass}>¿Acepta las condiciones logísticas?</label>
                    <div className="flex space-x-4 mt-2">
                        <label className={radioLabelClass}><input type="radio" name="aceptaCondicionesLogisticas" value="true" checked={formData.aceptaCondicionesLogisticas === true} onChange={handleChange}/> <span>Sí</span></label>
                        <label className={radioLabelClass}><input type="radio" name="aceptaCondicionesLogisticas" value="false" checked={formData.aceptaCondicionesLogisticas === false} onChange={handleChange}/> <span>No</span></label>
                    </div>
                </div>
                {!formData.aceptaCondicionesLogisticas && (
                        <div className="mt-4">
                        <label htmlFor="contrapropuestaLogistica" className={commonLabelClass}>Contrapropuesta Logística</label>
                        <textarea name="contrapropuestaLogistica" id="contrapropuestaLogistica" rows={3} value={formData.contrapropuestaLogistica} onChange={handleChange} required className={commonInputClass}></textarea>
                    </div>
                )}
            </fieldset>
            
                <fieldset>
                <legend className={fieldsetLegendClass}>4. Lugar de Entrega</legend>
                <p className="mt-1 text-sm text-gray-500">Lugar definido por el Comprador:</p>
                <div className={conditionBlockClass}>{requirement.ciudadRecepcion}, {requirement.departamentoRecepcion}</div>
                <div className="mt-4">
                    <label className={commonLabelClass}>¿Acepta el lugar de entrega?</label>
                    <div className="flex space-x-4 mt-2">
                        <label className={radioLabelClass}><input type="radio" name="aceptaLugarEntrega" value="true" checked={formData.aceptaLugarEntrega === true} onChange={handleChange}/> <span>Sí</span></label>
                        <label className={radioLabelClass}><input type="radio" name="aceptaLugarEntrega" value="false" checked={formData.aceptaLugarEntrega === false} onChange={handleChange}/> <span>No (detallar en contrapropuesta logística)</span></label>
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend className={fieldsetLegendClass}>5. Condiciones Económicas</legend>
                <div className="space-y-6">
                    <div>
                        <p className="mt-1 text-sm text-gray-500 mb-2">Fórmula de Precio del Comprador:</p>
                        <div className={conditionBlockClass}>
                            <PriceConditionsDisplay conditions={requirement.condicionesPrecio} currency={requirement.moneda} />
                        </div>
                        <div className="mt-4">
                            <label className={commonLabelClass}>¿Acepta la fórmula de precio y sus valores?</label>
                            <div className="flex space-x-4 mt-2">
                                <label className={radioLabelClass}><input type="radio" name="aceptaFormulaPrecio" value="true" checked={formData.aceptaFormulaPrecio === true} onChange={handleChange}/> <span>Sí, acepto todo</span></label>
                                <label className={radioLabelClass}><input type="radio" name="aceptaFormulaPrecio" value="false" checked={formData.aceptaFormulaPrecio === false} onChange={handleChange}/> <span>No, quiero realizar una contrapropuesta</span></label>
                            </div>
                        </div>
                        {!formData.aceptaFormulaPrecio && (
                            <div className="mt-4 bg-yellow-50 p-4 rounded-md border border-yellow-200">
                                <label className="block text-sm font-medium text-yellow-800 mb-3">Desglose de Contrapropuesta</label>
                                
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-yellow-100">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium text-gray-700">Variable</th>
                                                <th className="px-3 py-2 text-left font-medium text-gray-700">Propuesto (Comprador)</th>
                                                <th className="px-3 py-2 text-left font-medium text-gray-700">Tu Contrapropuesta (COP/kg)</th>
                                                <th className="px-3 py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {priceVariables.map((v) => (
                                                <tr key={v.id}>
                                                    <td className="px-3 py-2 text-gray-900">
                                                        {v.isNew ? (
                                                            <input 
                                                                type="text" 
                                                                value={v.name} 
                                                                onChange={(e) => handlePriceVariableChange(v.id, 'name', e.target.value)}
                                                                className="block w-full px-2 py-1 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                                                                placeholder="Nombre Variable"
                                                            />
                                                        ) : v.name}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-600">
                                                        {v.isNew ? '-' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: requirement.moneda, minimumFractionDigits: 0 }).format(v.buyerValue)}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input 
                                                            type="number" 
                                                            value={v.sellerValue} 
                                                            onChange={(e) => handlePriceVariableChange(v.id, 'sellerValue', e.target.value)}
                                                            className="block w-28 px-2 py-1 border border-gray-300 rounded-md text-right focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {v.isNew && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => removePriceVariable(v.id)}
                                                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                                                                title="Eliminar variable"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50">
                                            <tr>
                                                <td colSpan={2} className="px-3 py-2 text-right font-bold text-gray-700">Precio Final Contrapropuesta (COP/kg):</td>
                                                <td className="px-3 py-2 font-bold text-yellow-800">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: requirement.moneda, minimumFractionDigits: 0 }).format(counterProposalTotal)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                
                                <div className="mt-3">
                                    <button 
                                        type="button" 
                                        onClick={addPriceVariable}
                                        className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-800 transition-transform transform active:scale-95"
                                    >
                                        <PlusIcon className="h-4 w-4 mr-1" />
                                        Agregar Variable
                                    </button>
                                </div>

                                <div className="mt-4">
                                    <label htmlFor="priceObservation" className="block text-sm font-medium text-gray-700">Observaciones / Comentarios Finales</label>
                                    <textarea
                                        id="priceObservation"
                                        value={priceObservation}
                                        onChange={(e) => setPriceObservation(e.target.value)}
                                        rows={3}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                                        placeholder="Explica aquí tus cambios..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="mt-1 text-sm text-gray-500">Condiciones de Pago del Comprador:</p>
                        <div className={conditionBlockClass}>{requirement.tipoPago}</div>
                        <div className="mt-4">
                            <label className={commonLabelClass}>¿Acepta las condiciones de pago?</label>
                            <div className="flex space-x-4 mt-2">
                                <label className={radioLabelClass}><input type="radio" name="aceptaCondicionesPago" value="true" checked={formData.aceptaCondicionesPago === true} onChange={handleChange}/> <span>Sí</span></label>
                                <label className={radioLabelClass}><input type="radio" name="aceptaCondicionesPago" value="false" checked={formData.aceptaCondicionesPago === false} onChange={handleChange}/> <span>No</span></label>
                            </div>
                        </div>
                        {!formData.aceptaCondicionesPago && (
                            <div className="mt-4">
                                <label htmlFor="contrapropuestaCondicionesPago" className={commonLabelClass}>Contrapropuesta Condiciones de Pago</label>
                                <input type="text" name="contrapropuestaCondicionesPago" id="contrapropuestaCondicionesPago" value={formData.contrapropuestaCondicionesPago} onChange={handleChange} required className={commonInputClass}/>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="mt-1 text-sm text-gray-500">Método de Pago del Comprador:</p>
                        <div className={conditionBlockClass}>{requirement.metodoPago}</div>
                        <div className="mt-4">
                            <label className={commonLabelClass}>¿Acepta el método de pago?</label>
                            <div className="flex space-x-4 mt-2">
                                <label className={radioLabelClass}><input type="radio" name="aceptaMetodoPago" value="true" checked={formData.aceptaMetodoPago === true} onChange={handleChange}/> <span>Sí</span></label>
                                <label className={radioLabelClass}><input type="radio" name="aceptaMetodoPago" value="false" checked={formData.aceptaMetodoPago === false} onChange={handleChange}/> <span>No</span></label>
                            </div>
                        </div>
                        {!formData.aceptaMetodoPago && (
                            <div className="mt-4">
                                <label htmlFor="contrapropuestaMetodoPago" className={commonLabelClass}>Contrapropuesta Método de Pago</label>
                                <input type="text" name="contrapropuestaMetodoPago" id="contrapropuestaMetodoPago" value={formData.contrapropuestaMetodoPago} onChange={handleChange} required className={commonInputClass}/>
                            </div>
                        )}
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend className={fieldsetLegendClass}>6. Adjuntos (Opcional)</legend>
                <p className="mt-1 text-sm text-gray-500">Adjunta fotos para dar más confianza al comprador.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="fotosMaterial" className={commonLabelClass}>Fotos del Material</label>
                        <input type="file" name="fotosMaterial" id="fotosMaterial" onChange={handleFileChange} className={`${commonInputClass} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100`}/>
                        {formData.fotosMaterial && <span className="text-xs text-gray-500 mt-1 block">Archivo: {formData.fotosMaterial.name}</span>}
                    </div>
                    <div>
                        <label htmlFor="fotosProceso" className={commonLabelClass}>Fotos del Proceso</label>
                        <input type="file" name="fotosProceso" id="fotosProceso" onChange={handleFileChange} className={`${commonInputClass} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100`}/>
                        {formData.fotosProceso && <span className="text-xs text-gray-500 mt-1 block">Archivo: {formData.fotosProceso.name}</span>}
                    </div>
                    <div>
                        <label htmlFor="fotosInstalaciones" className={commonLabelClass}>Fotos de las Instalaciones</label>
                        <input type="file" name="fotosInstalaciones" id="fotosInstalaciones" onChange={handleFileChange} className={`${commonInputClass} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100`}/>
                        {formData.fotosInstalaciones && <span className="text-xs text-gray-500 mt-1 block">Archivo: {formData.fotosInstalaciones.name}</span>}
                    </div>
                </div>
            </fieldset>

            {/* Sección 7: Penalidad por Incumplimiento - AL FINAL */}
            <fieldset>
                <legend className="text-lg font-medium text-red-900">7. Garantía de Cumplimiento y Penalidad</legend>
                <div className="mt-4 bg-red-50 p-6 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800 mb-4">
                        Para asegurar la calidad y seriedad de la oferta, el vendedor acepta la siguiente condición de penalidad en caso de incumplimiento en las entregas pactadas o en la calidad especificada.
                    </p>
                    
                    <div className="bg-white p-3 rounded shadow-sm border border-red-100 mb-4 inline-block">
                        <span className="block text-gray-500 text-xs uppercase tracking-wide">Valor Penalidad por Kilo No Entregado</span>
                        <span className="text-lg font-bold text-red-700">
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
                                className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="penaltyFeeAccepted" className="font-medium text-red-900">
                                Acepto que se me cobrará un valor de {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(penaltyFeePerKg)} por Kilo por cada tonelada NO entregada al comprador según las especificaciones pactadas en esta oferta, una vez haya sido enviada y aceptada por el comprador.
                            </label>
                            <p className="text-red-700 text-xs mt-1">La aceptación de esta cláusula de garantía es obligatoria para enviar la oferta.</p>
                        </div>
                    </div>
                </div>
            </fieldset>

            <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={onCancel} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-transform transform active:scale-95">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 transition-transform transform active:scale-95 disabled:bg-teal-400 disabled:cursor-not-allowed w-48">
                    {isSubmitting ? <SpinnerIcon className="w-5 h-5" /> : submitButtonText}
                </button>
            </div>
        </form>
    );
};

export default OfferForm;
