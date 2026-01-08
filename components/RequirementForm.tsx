
import React, { useState, useMemo, useEffect } from 'react';
import { Requirement, FileAttachment } from '../types';
import { useCommonData } from '../hooks/useData';
import { SpinnerIcon } from './icons';
import { getManagementFeePerKg, parseDate, addDays, calculateDeliveryPeriods } from '../utils';

// The form manages its own detailed state, including the 'other' fields
type FormState = Omit<Requirement, 'id' | 'buyerId' | 'status' | 'createdAt' | 'categoryId' | 'totalVolume' | 'title' | 'description'> & {
    otraCategoriaMaterial?: string;
    otraSubcategoria?: string;
    otraPresentacionMaterial?: string;
    otroTipoPago?: string;
    otroMetodoPago?: string;
    
    // State to track selection mode (not saved to DB directly)
    inputTypeCalidad: 'file' | 'url';
    inputTypeLogistica: 'file' | 'url';
};

interface RequirementFormProps {
    onSubmit: (data: Omit<Requirement, 'id' | 'buyerId' | 'status' | 'createdAt' | 'categoryId' | 'totalVolume' | 'title' | 'description'>) => void;
    onCancel: () => void;
    initialData?: Requirement;
}

const RequirementForm = ({ onSubmit, onCancel, initialData }: RequirementFormProps) => {
    // Architectural change: Use useCommonData instead of monolithic useData
    const { presentationOptions, materialCategories, colombianDepartments, colombiaDepartmentsAndMunicipalities } = useCommonData();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Date Helper for Validation
    const todayString = new Date().toISOString().split('T')[0];

    // This function sets up the initial form state
    const getInitialState = (): FormState => {
        const baseState: FormState = {
            categoriaMaterial: 'Plásticos',
            subcategoria: '',
            presentacionMaterial: 'Pacas',
            cantidadRequerida: 0,
            unidad: 'Toneladas (Ton)',
            frecuencia: 'Única Vez',
            especificacionesCalidad: '',
            especificacionesLogisticas: '',
            departamentoRecepcion: '',
            ciudadRecepcion: '',
            moneda: 'COP',
            condicionesPrecio: '',
            tipoPago: 'Contado',
            metodoPago: 'Transferencia Bancaria',
            porcentajeAnticipo: 0,
            vigenciaInicio: '',
            vigenciaFin: '',
            otraCategoriaMaterial: '',
            otraSubcategoria: '',
            otraPresentacionMaterial: '',
            otroTipoPago: '',
            otroMetodoPago: '',
            
            urlFichaTecnicaCalidad: '',
            urlFichaTecnicaLogistica: '',
            inputTypeCalidad: 'file',
            inputTypeLogistica: 'file',
            
            terminosCalculoFletes: '',
            adjuntoTerminosFletes: undefined,

            managementFeePerKg: 0,
            managementFeeAccepted: false,
        };

        if (!initialData) {
            return baseState;
        }

        const populatedState = { ...baseState, ...initialData };
        
        // Determine input types based on existing data
        if (initialData.urlFichaTecnicaCalidad && !initialData.fichaTecnicaCalidad) {
            populatedState.inputTypeCalidad = 'url';
        }
        if (initialData.urlFichaTecnicaLogistica && !initialData.fichaTecnicaLogistica) {
            populatedState.inputTypeLogistica = 'url';
        }

        const isCustomCategory = !Object.keys(materialCategories).includes(initialData.categoriaMaterial);
        if (isCustomCategory) {
            populatedState.otraCategoriaMaterial = initialData.categoriaMaterial;
            populatedState.categoriaMaterial = 'Otro';
        }

        const subcategoriesForInitial = materialCategories[populatedState.categoriaMaterial] || [];
        const isCustomSubcategory = initialData.subcategoria && !subcategoriesForInitial.includes(initialData.subcategoria);
        if (isCustomSubcategory) {
            populatedState.otraSubcategoria = initialData.subcategoria;
            populatedState.subcategoria = 'Otro';
        }

        const isCustomPresentation = initialData.presentacionMaterial && !presentationOptions.includes(initialData.presentacionMaterial);
        if (isCustomPresentation) {
            populatedState.otraPresentacionMaterial = initialData.presentacionMaterial;
            populatedState.presentacionMaterial = 'Otro';
        }

        const tipoPagoOptions = ['Contado', 'Pago a 8 días', 'Pago a 15 días'];
        if (initialData.tipoPago && !tipoPagoOptions.includes(initialData.tipoPago)) {
            populatedState.otroTipoPago = initialData.tipoPago;
            populatedState.tipoPago = 'Otro';
        }

        const metodoPagoOptions = ['Transferencia Bancaria', 'Efectivo', 'Cheque'];
         if (initialData.metodoPago && !metodoPagoOptions.includes(initialData.metodoPago)) {
            populatedState.otroMetodoPago = initialData.metodoPago;
            populatedState.metodoPago = 'Otro';
        }
        
        return populatedState;
    };
    
    const [formData, setFormData] = useState<FormState>(getInitialState());
    
    const municipalities = useMemo(() => {
        if (formData.departamentoRecepcion) {
            return colombiaDepartmentsAndMunicipalities[formData.departamentoRecepcion] || [];
        }
        return [];
    }, [formData.departamentoRecepcion, colombiaDepartmentsAndMunicipalities]);

    // Recalcular tarifa de gestión cuando cambia la cantidad (Using utility function)
    useEffect(() => {
        if (formData.cantidadRequerida > 0) {
            const tons = formData.unidad === 'Toneladas (Ton)' ? formData.cantidadRequerida * 1000 : formData.cantidadRequerida;
            const fee = getManagementFeePerKg(tons);
            setFormData(prev => ({ ...prev, managementFeePerKg: fee }));
        } else {
            setFormData(prev => ({ ...prev, managementFeePerKg: 0 }));
        }
    }, [formData.cantidadRequerida, formData.unidad]);

    // Period Calculation (Using utility function)
    const periodCount = useMemo(() => {
        return calculateDeliveryPeriods(formData.vigenciaInicio, formData.vigenciaFin, formData.frecuencia);
    }, [formData.vigenciaInicio, formData.vigenciaFin, formData.frecuencia]);

    // Derived value for display info
    const displayedPerDelivery = periodCount > 0 ? formData.cantidadRequerida / periodCount : 0;

    const getInitialPriceVariables = () => {
        if (initialData?.condicionesPrecio) {
            try {
                const parsed = JSON.parse(initialData.condicionesPrecio);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((v: any, i: number) => ({
                        id: Date.now() + i,
                        name: v.name || '',
                        value: String(v.value || '0')
                    }));
                }
            } catch (e) {
                // Not a valid JSON array, treat as old format. Fall through to default.
            }
        }
        return [{ id: Date.now(), name: 'Precio Base', value: '0' }];
    };

    const [priceVariables, setPriceVariables] = useState(getInitialPriceVariables());


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        let processedValue: string | number | boolean = value;
        if (type === 'number') {
            processedValue = value === '' ? 0 : parseFloat(value);
        }
        if (type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        }
        
        const newState = { ...formData, [name]: processedValue };

        // If category changes, reset subcategory fields
        if (name === 'categoriaMaterial') {
            newState.subcategoria = '';
            newState.otraSubcategoria = '';
        }

        if (name === 'tipoPago' && value !== 'Otro') {
            newState.otroTipoPago = '';
        }
        if (name === 'metodoPago' && value !== 'Otro') {
            newState.otroMetodoPago = '';
        }
        
        if (name === 'departamentoRecepcion') {
            newState.ciudadRecepcion = '';
        }

        setFormData(newState);
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
        if (formData.vigenciaInicio < todayString) {
            alert('La fecha de inicio de vigencia no puede ser anterior a la fecha actual.');
            return;
        }

        if (formData.vigenciaFin < formData.vigenciaInicio) {
            alert('La fecha de fin de vigencia no puede ser anterior a la fecha de inicio.');
            return;
        }
        // -----------------------

        if (formData.cantidadRequerida <= 0) {
            alert('La cantidad requerida debe ser mayor a 0.');
            return;
        }

        // VALIDACIÓN OBLIGATORIA
        if (!formData.managementFeeAccepted) {
            alert('Es obligatorio aceptar el costo de gestión de Yubarta para poder enviar la solicitud. Por favor, marque la casilla al final del formulario.');
            return;
        }

        setIsSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            const finalData = { ...formData };
            if (finalData.categoriaMaterial === 'Otro') {
                finalData.categoriaMaterial = finalData.otraCategoriaMaterial || 'Otro';
            }
            if (finalData.subcategoria === 'Otro') {
                finalData.subcategoria = finalData.otraSubcategoria || 'Otro';
            }
            if (finalData.presentacionMaterial === 'Otro') {
                finalData.presentacionMaterial = finalData.otraPresentacionMaterial || 'Otro';
            }
            if (finalData.tipoPago === 'Otro') {
                finalData.tipoPago = finalData.otroTipoPago || 'Otro';
            }
            if (finalData.metodoPago === 'Otro') {
                finalData.metodoPago = finalData.otroMetodoPago || 'Otro';
            }
            
            finalData.condicionesPrecio = JSON.stringify(
                priceVariables.map(({ name, value }) => ({ name, value: parseFloat(value) || 0 }))
            );

            // Ensure exclusivity of file vs URL
            if (finalData.inputTypeCalidad === 'file') {
                finalData.urlFichaTecnicaCalidad = undefined;
            } else {
                finalData.fichaTecnicaCalidad = undefined;
            }

            if (finalData.inputTypeLogistica === 'file') {
                finalData.urlFichaTecnicaLogistica = undefined;
            } else {
                finalData.fichaTecnicaLogistica = undefined;
            }

            delete finalData.otraCategoriaMaterial;
            delete finalData.otraSubcategoria;
            delete finalData.otraPresentacionMaterial;
            delete finalData.otroTipoPago;
            delete finalData.otroMetodoPago;
            delete finalData.inputTypeCalidad;
            delete finalData.inputTypeLogistica;
            
            onSubmit(finalData);
            setIsSubmitting(false);
        }, 1500);
    };
    
    const handleVariableChange = (id: number, field: 'name' | 'value', value: string) => {
        setPriceVariables(vars => vars.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const addVariable = () => {
        setPriceVariables(vars => [...vars, { id: Date.now(), name: '', value: '0' }]);
    };

    const removeVariable = (id: number) => {
        if (priceVariables.length > 1) {
            setPriceVariables(vars => vars.filter(v => v.id !== id));
        }
    };
    
    const totalEstimado = useMemo(() => {
        return priceVariables.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);
    }, [priceVariables]);


    const commonInputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm";
    const commonLabelClass = "block text-sm font-medium text-gray-700";
    const fileInputClass = `${commonInputClass} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100`;
    
    const subcategoryOptions = materialCategories[formData.categoriaMaterial] || [];

    // Calcular costos de gestión para mostrar
    // La fórmula da valor por kilo.
    // Costo Total = Cantidad (Kg) * ValorPorKg
    // Si la cantidad está en toneladas, multiplicar por 1000.
    const totalKilos = formData.unidad === 'Toneladas (Ton)' ? formData.cantidadRequerida * 1000 : formData.cantidadRequerida;
    const managementFeeTotal = totalKilos * (formData.managementFeePerKg || 0);

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Sección 1: Descripción del Material */}
            <fieldset>
                <legend className="text-lg font-medium text-gray-900">1. Descripción del Material</legend>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="categoriaMaterial" className={commonLabelClass}>Categoría de Material</label>
                        <select id="categoriaMaterial" name="categoriaMaterial" value={formData.categoriaMaterial} onChange={handleChange} className={commonInputClass}>
                           {Object.keys(materialCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>

                    {formData.categoriaMaterial === 'Otro' && (
                        <div>
                            <label htmlFor="otraCategoriaMaterial" className={commonLabelClass}>Especificar otra categoría</label>
                            <input type="text" id="otraCategoriaMaterial" name="otraCategoriaMaterial" value={formData.otraCategoriaMaterial} onChange={handleChange} placeholder="Ej: Textiles" required className={commonInputClass} />
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="subcategoria" className={commonLabelClass}>Subcategoría</label>
                        <select 
                            id="subcategoria" 
                            name="subcategoria" 
                            value={formData.subcategoria} 
                            onChange={handleChange} 
                            className={commonInputClass}
                            disabled={subcategoryOptions.length === 0 && formData.categoriaMaterial !== 'Otro'}
                        >
                            <option value="">{subcategoryOptions.length > 0 ? 'Seleccione una subcategoría' : 'N/A'}</option>
                            {subcategoryOptions.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                    </div>
                    
                    {formData.subcategoria === 'Otro' && (
                         <div>
                            <label htmlFor="otraSubcategoria" className={commonLabelClass}>Especificar otra subcategoría</label>
                            <input type="text" id="otraSubcategoria" name="otraSubcategoria" value={formData.otraSubcategoria} onChange={handleChange} placeholder="Ej: Algodón" required className={commonInputClass} />
                        </div>
                    )}

                    <div>
                        <label htmlFor="presentacionMaterial" className={commonLabelClass}>Presentación del Material</label>
                        <select id="presentacionMaterial" name="presentacionMaterial" value={formData.presentacionMaterial} onChange={handleChange} className={commonInputClass}>
                            {presentationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    {formData.presentacionMaterial === 'Otro' && (
                         <div>
                            <label htmlFor="otraPresentacionMaterial" className={commonLabelClass}>Especificar otra presentación</label>
                            <input type="text" id="otraPresentacionMaterial" name="otraPresentacionMaterial" value={formData.otraPresentacionMaterial} onChange={handleChange} placeholder="Ej: Triturado" required className={commonInputClass} />
                        </div>
                    )}
                </div>
            </fieldset>

             {/* Sección 2: Cantidad y Frecuencia */}
            <fieldset>
                <legend className="text-lg font-medium text-gray-900">2. Cantidad y Frecuencia</legend>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Fechas primero para calcular periodos */}
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                         <div>
                            <label htmlFor="frecuencia" className={commonLabelClass}>Frecuencia</label>
                            <select id="frecuencia" name="frecuencia" value={formData.frecuencia} onChange={handleChange} className={commonInputClass}>
                                <option>Única Vez</option>
                                <option>Semanal</option>
                                <option>Mensual</option>
                                <option>Anual</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="vigenciaInicio" className={commonLabelClass}>Inicio de Vigencia</label>
                            <input 
                                type="date" 
                                id="vigenciaInicio" 
                                name="vigenciaInicio" 
                                value={formData.vigenciaInicio} 
                                onChange={handleChange} 
                                required 
                                className={commonInputClass}
                                min={todayString}
                            />
                        </div>
                         <div>
                            <label htmlFor="vigenciaFin" className={commonLabelClass}>Fin de Vigencia</label>
                            <input 
                                type="date" 
                                id="vigenciaFin" 
                                name="vigenciaFin" 
                                value={formData.vigenciaFin} 
                                onChange={handleChange} 
                                required 
                                className={commonInputClass}
                                min={formData.vigenciaInicio || todayString}
                            />
                        </div>
                    </div>

                    {/* Quantity Definition */}
                    <div className="sm:col-span-2 bg-gray-50 p-4 rounded-md border border-gray-200">
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                            <div className="sm:col-span-2">
                                <label htmlFor="cantidadRequerida" className={commonLabelClass}>Cantidad TOTAL Global</label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                    <input 
                                        type="number" 
                                        id="cantidadRequerida" 
                                        name="cantidadRequerida" 
                                        value={formData.cantidadRequerida} 
                                        onChange={handleChange}
                                        required 
                                        className={`${commonInputClass} pr-36`} 
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center bg-gray-100 border-l border-gray-300 rounded-r-md">
                                        <select 
                                            id="unidad" 
                                            name="unidad" 
                                            value={formData.unidad} 
                                            onChange={handleChange} 
                                            className="h-full py-0 pl-3 pr-8 border-transparent bg-transparent text-gray-700 font-medium sm:text-sm rounded-r-md focus:ring-teal-500 focus:border-teal-500 cursor-pointer hover:bg-gray-200 transition-colors"
                                        >
                                            <option>Toneladas (Ton)</option>
                                            <option>Kilogramos (Kg)</option>
                                        </select>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Suma total requerida durante toda la vigencia.</p>
                            </div>

                             <div className="bg-white p-3 rounded border border-gray-200 flex flex-col justify-center h-full">
                                <div className="text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Periodos Est.:</span>
                                        <strong>{periodCount}</strong>
                                    </div>
                                    <div className="flex justify-between mt-1 text-teal-700">
                                        <span>Prom./Entrega:</span>
                                        <strong>{displayedPerDelivery.toFixed(2)}</strong>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            </fieldset>

            {/* Sección 3: Especificaciones de Calidad y Logística */}
            <fieldset>
                <legend className="text-lg font-medium text-gray-900">3. Especificaciones de Calidad y Logística</legend>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                        <label htmlFor="especificacionesCalidad" className={commonLabelClass}>Especificaciones de Calidad</label>
                        <textarea id="especificacionesCalidad" name="especificacionesCalidad" value={formData.especificacionesCalidad} onChange={handleChange} rows={3} className={commonInputClass}></textarea>
                    </div>
                    
                    {/* Ficha Técnica Calidad Toggle */}
                    <div>
                        <label className={commonLabelClass}>Ficha Técnica de Calidad (Opcional)</label>
                        <div className="flex space-x-4 mt-2 mb-2">
                            <label className="inline-flex items-center">
                                <input 
                                    type="radio" 
                                    className="form-radio text-teal-600" 
                                    name="inputTypeCalidad" 
                                    value="file" 
                                    checked={formData.inputTypeCalidad === 'file'} 
                                    onChange={() => setFormData({...formData, inputTypeCalidad: 'file'})} 
                                />
                                <span className="ml-2 text-sm">Subir Archivo</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input 
                                    type="radio" 
                                    className="form-radio text-teal-600" 
                                    name="inputTypeCalidad" 
                                    value="url" 
                                    checked={formData.inputTypeCalidad === 'url'} 
                                    onChange={() => setFormData({...formData, inputTypeCalidad: 'url'})} 
                                />
                                <span className="ml-2 text-sm">Insertar URL</span>
                            </label>
                        </div>
                        {formData.inputTypeCalidad === 'file' ? (
                            <>
                                <input type="file" id="fichaTecnicaCalidad" name="fichaTecnicaCalidad" onChange={handleFileChange} className={fileInputClass} />
                                {formData.fichaTecnicaCalidad && <span className="text-xs text-gray-500 mt-1 block">Archivo: {formData.fichaTecnicaCalidad.name}</span>}
                            </>
                        ) : (
                             <input type="url" id="urlFichaTecnicaCalidad" name="urlFichaTecnicaCalidad" value={formData.urlFichaTecnicaCalidad || ''} onChange={handleChange} placeholder="https://..." className={commonInputClass} />
                        )}
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="especificacionesLogisticas" className={commonLabelClass}>Especificaciones Logísticas</label>
                        <textarea id="especificacionesLogisticas" name="especificacionesLogisticas" value={formData.especificacionesLogisticas} onChange={handleChange} rows={3} className={commonInputClass}></textarea>
                    </div>

                     {/* Ficha Técnica Logística Toggle */}
                     <div>
                        <label className={commonLabelClass}>Ficha Técnica de Logística (Opcional)</label>
                        <div className="flex space-x-4 mt-2 mb-2">
                            <label className="inline-flex items-center">
                                <input 
                                    type="radio" 
                                    className="form-radio text-teal-600" 
                                    name="inputTypeLogistica" 
                                    value="file" 
                                    checked={formData.inputTypeLogistica === 'file'} 
                                    onChange={() => setFormData({...formData, inputTypeLogistica: 'file'})} 
                                />
                                <span className="ml-2 text-sm">Subir Archivo</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input 
                                    type="radio" 
                                    className="form-radio text-teal-600" 
                                    name="inputTypeLogistica" 
                                    value="url" 
                                    checked={formData.inputTypeLogistica === 'url'} 
                                    onChange={() => setFormData({...formData, inputTypeLogistica: 'url'})} 
                                />
                                <span className="ml-2 text-sm">Insertar URL</span>
                            </label>
                        </div>
                        {formData.inputTypeLogistica === 'file' ? (
                            <>
                                <input type="file" id="fichaTecnicaLogistica" name="fichaTecnicaLogistica" onChange={handleFileChange} className={fileInputClass} />
                                {formData.fichaTecnicaLogistica && <span className="text-xs text-gray-500 mt-1 block">Archivo: {formData.fichaTecnicaLogistica.name}</span>}
                            </>
                        ) : (
                             <input type="url" id="urlFichaTecnicaLogistica" name="urlFichaTecnicaLogistica" value={formData.urlFichaTecnicaLogistica || ''} onChange={handleChange} placeholder="https://..." className={commonInputClass} />
                        )}
                    </div>

                    {/* Términos para cálculo de fletes */}
                    <div className="sm:col-span-2 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <label htmlFor="terminosCalculoFletes" className={`${commonLabelClass} text-yellow-900`}>Términos para cálculo de fletes</label>
                        <div className="mt-2 mb-4 text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                            <p className="font-bold mb-1">⚠️ Disclaimer, Sugerencia y Advertencia Legal</p>
                            <p className="mb-2">
                                Para que el Vendedor pueda evaluar de manera precisa y legal el costo del flete, es crucial que utilices el sistema SICE-TAC (Sistema de Información de Costos Eficientes para el Transporte Automotor de Carga). La ley colombiana establece que los valores arrojados por esta herramienta son la referencia del costo mínimo legal del flete. Esto asegura que el costo logístico de tu compra sea transparente y formal.
                            </p>
                            <p className="font-bold text-red-700">🚨 Advertencia Legal sobre el Costo Mínimo</p>
                            <ul className="list-disc list-inside mt-1 mb-2">
                                <li><span className="font-semibold">No es legal:</span> No se puede pactar un pago por debajo de los costos mínimos definidos por el SICE-TAC.</li>
                                <li><span className="font-semibold">Consecuencias:</span> Las empresas y generadores de carga que realicen estos pagos pueden enfrentar investigaciones, multas de hasta 700 salarios mínimos mensuales legales vigentes, y hasta demandas civiles.</li>
                            </ul>
                            <a href="https://plc.mintransporte.gov.co/runtime/empresa/ctl/sicetac/mid/417" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium flex items-center mt-2">
                                Ir a herramienta SICE-TAC &rarr;
                            </a>
                        </div>
                        <textarea id="terminosCalculoFletes" name="terminosCalculoFletes" value={formData.terminosCalculoFletes || ''} onChange={handleChange} rows={3} className={commonInputClass} placeholder="Especifique los términos o condiciones adicionales para el cálculo del flete..."></textarea>
                        
                        <div className="mt-3">
                            <label htmlFor="adjuntoTerminosFletes" className="block text-sm font-medium text-gray-700 mb-1">Adjuntar documento de términos (Opcional)</label>
                            <input type="file" id="adjuntoTerminosFletes" name="adjuntoTerminosFletes" onChange={handleFileChange} className={fileInputClass} />
                            {formData.adjuntoTerminosFletes && <span className="text-xs text-gray-500 mt-1 block">Archivo: {formData.adjuntoTerminosFletes.name}</span>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="departamentoRecepcion" className={commonLabelClass}>Departamento de Recepción</label>
                        <select id="departamentoRecepcion" name="departamentoRecepcion" value={formData.departamentoRecepcion} onChange={handleChange} required className={commonInputClass}>
                            <option value="" disabled>Seleccione un departamento</option>
                            {colombianDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="ciudadRecepcion" className={commonLabelClass}>Ciudad de Recepción</label>
                         <select id="ciudadRecepcion" name="ciudadRecepcion" value={formData.ciudadRecepcion} onChange={handleChange} required className={commonInputClass} disabled={!formData.departamentoRecepcion}>
                            <option value="" disabled>Seleccione una ciudad</option>
                            {municipalities.map(mun => <option key={mun} value={mun}>{mun}</option>)}
                        </select>
                    </div>
                </div>
            </fieldset>
            
            {/* Sección 4: Condiciones Comerciales */}
            <fieldset>
                <legend className="text-lg font-medium text-gray-900">4. Definición de Precios</legend>
                <div className="mt-6 space-y-6 bg-gray-50 p-6 rounded-lg border">
                    <h3 className="text-md font-semibold text-gray-800">Estructura del Precio</h3>
                    
                    <div className="w-full sm:w-1/2">
                        <label htmlFor="moneda" className={commonLabelClass}>Moneda</label>
                        <select id="moneda" name="moneda" value={formData.moneda} onChange={handleChange} className={commonInputClass}>
                            <option value="COP">COP - Peso Colombiano</option>
                            <option value="USD">USD - Dólar Americano</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className={commonLabelClass}>Variables de Precio (COP/kg)</label>
                        {priceVariables.map((variable) => (
                            <div key={variable.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                <input 
                                    type="text" 
                                    placeholder="Nombre (ej. Precio Base)"
                                    value={variable.name}
                                    onChange={(e) => handleVariableChange(variable.id, 'name', e.target.value)}
                                    className={commonInputClass + " mt-0"}
                                />
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number"
                                        step="any"
                                        placeholder="Valor por Kg (ej. 2000)"
                                        value={variable.value}
                                        onChange={(e) => handleVariableChange(variable.id, 'value', e.target.value)}
                                        className={commonInputClass + " mt-0"}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => removeVariable(variable.id)} 
                                        disabled={priceVariables.length <= 1} 
                                        className="p-2 text-gray-500 rounded-full hover:bg-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform transform active:scale-95"
                                        aria-label="Eliminar variable"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <button type="button" onClick={addVariable} className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-800 transition-transform transform active:scale-95">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Agregar Variable
                        </button>
                    </div>

                    <div className="pt-4 border-t text-right">
                        <span className="text-gray-600">Total Estimado por Kilo: </span>
                        <span className="text-xl font-bold text-gray-900">
                             {new Intl.NumberFormat('es-CO', { style: 'currency', currency: formData.moneda, minimumFractionDigits: 2 }).format(totalEstimado)} / Kg
                        </span>
                    </div>
                </div>

                <div className="mt-6">
                    <h3 className="text-md font-semibold text-gray-800">Condiciones de Pago</h3>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="tipoPago" className={commonLabelClass}>Tipo de Pago</label>
                            <select id="tipoPago" name="tipoPago" value={formData.tipoPago} onChange={handleChange} className={commonInputClass}>
                                <option>Contado</option>
                                <option>Pago a 8 días</option>
                                <option>Pago a 15 días</option>
                                <option>Otro</option>
                            </select>
                        </div>

                        {formData.tipoPago === 'Otro' && (
                            <div>
                                <label htmlFor="otroTipoPago" className={commonLabelClass}>Especificar otro tipo de pago</label>
                                <input type="text" id="otroTipoPago" name="otroTipoPago" value={formData.otroTipoPago} onChange={handleChange} required className={commonInputClass} />
                            </div>
                        )}

                        <div>
                            <label htmlFor="metodoPago" className={commonLabelClass}>Método de Pago</label>
                            <select id="metodoPago" name="metodoPago" value={formData.metodoPago} onChange={handleChange} className={commonInputClass}>
                                <option>Transferencia Bancaria</option>
                                <option>Efectivo</option>
                                <option>Cheque</option>
                                <option>Otro</option>
                            </select>
                        </div>
                        
                        {formData.metodoPago === 'Otro' && (
                            <div>
                                <label htmlFor="otroMetodoPago" className={commonLabelClass}>Especificar otro método de pago</label>
                                <input type="text" id="otroMetodoPago" name="otroMetodoPago" value={formData.otroMetodoPago} onChange={handleChange} required className={commonInputClass} />
                            </div>
                        )}
                        
                        <div className="sm:col-span-2">
                            <label htmlFor="porcentajeAnticipo" className={commonLabelClass}>% de Anticipo</label>
                            <input type="number" id="porcentajeAnticipo" name="porcentajeAnticipo" value={formData.porcentajeAnticipo} onChange={handleChange} min="0" max="100" className={commonInputClass} />
                        </div>
                    </div>
                </div>
            </fieldset>

            {/* Sección 5: Costo de Gestión Yubarta - AL FINAL */}
            {formData.cantidadRequerida > 0 && (
                <fieldset>
                    <legend className="text-lg font-medium text-teal-900">5. Costo de Gestión Yubarta</legend>
                    <div className="mt-4 bg-teal-50 p-6 rounded-lg border border-teal-200">
                        <p className="text-sm text-teal-800 mb-4">
                            Este valor corresponde a la gestión comercial, verificación de proveedores, revisión de calidad y aseguramiento de entregas.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
                            <div className="bg-white p-3 rounded shadow-sm border border-teal-100">
                                <span className="block text-gray-500 text-xs uppercase tracking-wide">Valor por Kilo (Fórmula)</span>
                                <span className="text-lg font-bold text-teal-700">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(formData.managementFeePerKg || 0)}
                                </span>
                            </div>
                            <div className="bg-white p-3 rounded shadow-sm border border-teal-100">
                                <span className="block text-gray-500 text-xs uppercase tracking-wide">Total Estimado</span>
                                <span className="text-lg font-bold text-teal-700">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(managementFeeTotal)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="managementFeeAccepted"
                                    name="managementFeeAccepted"
                                    type="checkbox"
                                    checked={formData.managementFeeAccepted}
                                    onChange={handleChange}
                                    required
                                    className="focus:ring-teal-500 h-4 w-4 text-teal-600 border-gray-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="managementFeeAccepted" className="font-medium text-teal-900">
                                    Acepto el valor a pagar por kilo ({new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(formData.managementFeePerKg || 0)}) a Yubarta por concepto de gestión comercial y aseguramiento de calidad.
                                </label>
                                <p className="text-teal-700 text-xs mt-1">Al marcar esta casilla, confirma que entiende que este valor se facturará sobre el material efectivamente transado. <strong>La aceptación es obligatoria para continuar.</strong></p>
                            </div>
                        </div>
                    </div>
                </fieldset>
            )}

            {/* Botones de Acción */}
            <div className="pt-5 flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-transform transform active:scale-95">
                    Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-transform transform active:scale-95 disabled:bg-teal-400 disabled:cursor-not-allowed w-40">
                    {isSubmitting ? <SpinnerIcon className="w-5 h-5" /> : 'Enviar a Revisión'}
                </button>
            </div>
        </form>
    );
};

export default RequirementForm;
