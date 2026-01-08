
import React, { useState, useMemo, useEffect } from 'react';
import { MarketplaceListing } from '../../types';
import { useData } from '../../hooks/useData';
import { SpinnerIcon, CameraIcon, TrashIcon, PlusIcon } from '../icons';
import { getManagementFeePerKg } from '../../utils';

// Internal type for form state to handle "other" fields and UI-specific logic
type ListingFormState = Omit<MarketplaceListing, 'id' | 'sellerId' | 'status' | 'createdAt'> & {
    otraCategoriaMaterial?: string;
    otraSubcategoria?: string;
    otraPresentacionMaterial?: string;
    
    // UI helpers
    inputTypeCalidad: 'file' | 'url';
    inputTypeLogistica: 'file' | 'url';
};

interface PriceVariable {
    id: number;
    name: string;
    value: string;
}

interface Props {
    initialData?: MarketplaceListing;
    onSubmit: (data: Omit<MarketplaceListing, 'id' | 'sellerId' | 'status' | 'createdAt'>) => void;
    onCancel: () => void;
}

const ListingForm = ({ initialData, onSubmit, onCancel }: Props) => {
    const { materialCategories, presentationOptions, colombianDepartments, colombiaDepartmentsAndMunicipalities } = useData();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Date Helper: Local time to avoid UTC shift issues
    const getLocalTodayString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayString = getLocalTodayString();

    // Initial state logic
    const getInitialState = (): ListingFormState => {
        const baseState: ListingFormState = {
            title: '',
            category: 'Plásticos',
            subcategory: '',
            presentation: 'Pacas',
            description: '',
            quantity: 0,
            unit: 'Toneladas',
            pricePerUnit: 0,
            priceStructure: '',
            currency: 'COP',
            validFrom: '',
            validUntil: '',
            frequency: 'Única Vez', // Default value
            requiresCertificate: false, // Default value
            locationCity: '',
            locationDepartment: '',
            qualityDescription: '',
            logisticsDescription: '',
            photos: [],
            otraCategoriaMaterial: '',
            otraSubcategoria: '',
            otraPresentacionMaterial: '',
            inputTypeCalidad: 'file',
            inputTypeLogistica: 'file',
            managementFeePerKg: 0,
            managementFeeAccepted: false,
        };

        if (!initialData) return baseState;

        const populated = { ...baseState, ...initialData };

        // Logic for "Otro" fields
        const isCustomCategory = !Object.keys(materialCategories).includes(initialData.category);
        if (isCustomCategory) {
            populated.otraCategoriaMaterial = initialData.category;
            populated.category = 'Otro';
        }

        const subcategoriesForInitial = materialCategories[populated.category] || [];
        const isCustomSubcategory = initialData.subcategory && !subcategoriesForInitial.includes(initialData.subcategory);
        if (isCustomSubcategory) {
            populated.otraSubcategoria = initialData.subcategory;
            populated.subcategory = 'Otro';
        }

        const isCustomPresentation = initialData.presentation && !presentationOptions.includes(initialData.presentation);
        if (isCustomPresentation) {
            populated.otraPresentacionMaterial = initialData.presentation;
            populated.presentation = 'Otro';
        }
        
        // Determine input types
        if (initialData.qualityUrl && !initialData.qualityFile) populated.inputTypeCalidad = 'url';
        if (initialData.logisticsUrl && !initialData.logisticsFile) populated.inputTypeLogistica = 'url';

        return populated;
    };

    const [formData, setFormData] = useState<ListingFormState>(getInitialState());
    
    // Price variables state
    const [priceVariables, setPriceVariables] = useState<PriceVariable[]>(() => {
        if (initialData?.priceStructure) {
            try {
                const parsed = JSON.parse(initialData.priceStructure);
                if (Array.isArray(parsed)) {
                    return parsed.map((p: any, i: number) => ({ id: i, name: p.name, value: p.value.toString() }));
                }
            } catch(e) {}
        }
        // Default start with one variable if new or empty
        return [{ id: Date.now(), name: 'Precio Base', value: '0' }];
    });

    const municipalities = useMemo(() => {
        if (formData.locationDepartment) {
            return colombiaDepartmentsAndMunicipalities[formData.locationDepartment] || [];
        }
        return [];
    }, [formData.locationDepartment, colombiaDepartmentsAndMunicipalities]);

    const subcategoryOptions = materialCategories[formData.category] || [];

    // Calculate total price automatically (Memoized derived value)
    const totalEstimatedPrice = useMemo(() => {
        return priceVariables.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);
    }, [priceVariables]);

    // Recalcular tarifa de gestión cuando cambia la cantidad (Using utility function)
    useEffect(() => {
        if (formData.quantity > 0) {
            const totalKg = formData.unit === 'Toneladas' ? formData.quantity * 1000 : formData.quantity;
            const fee = getManagementFeePerKg(totalKg);
            setFormData(prev => {
                // Prevent update loop by checking if value actually changed
                if (prev.managementFeePerKg === fee) return prev;
                return { ...prev, managementFeePerKg: fee };
            });
        } else {
            setFormData(prev => {
                if (prev.managementFeePerKg === 0) return prev;
                return { ...prev, managementFeePerKg: 0 };
            });
        }
    }, [formData.quantity, formData.unit]);

    // --- CÁLCULO DE ESTIMACIÓN DE ENTREGAS ---
    const deliveryCalculation = useMemo(() => {
        if (!formData.quantity || !formData.validFrom || !formData.validUntil) return null;
        
        if (formData.frequency === 'Única Vez') {
            return {
                periods: 1,
                perDelivery: formData.quantity,
                message: `Se realizará una única entrega de ${formData.quantity} ${formData.unit}.`
            };
        }

        const start = new Date(formData.validFrom);
        const end = new Date(formData.validUntil);
        
        if (start >= end) return null;

        let periods = 0;
        // Simple approximation for estimation
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        switch (formData.frequency) {
            case 'Semanal':
                periods = Math.ceil(diffDays / 7);
                break;
            case 'Quincenal':
                periods = Math.ceil(diffDays / 15);
                break;
            case 'Mensual':
                periods = Math.ceil(diffDays / 30);
                break;
            case 'Trimestral':
                periods = Math.ceil(diffDays / 90);
                break;
            case 'Anual':
                periods = Math.ceil(diffDays / 365);
                break;
            default:
                periods = 1;
        }

        // Avoid division by zero
        periods = Math.max(1, periods);
        const perDelivery = formData.quantity / periods;

        return {
            periods,
            perDelivery,
            message: `Según las fechas (${diffDays} días aprox) y frecuencia seleccionada, esto equivale a aproximadamente ${periods} entregas de ${perDelivery.toFixed(1)} ${formData.unit} cada una.`
        };

    }, [formData.quantity, formData.validFrom, formData.validUntil, formData.frequency, formData.unit]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let processedValue: string | number | boolean = value;

        if (type === 'number') {
            processedValue = parseFloat(value);
        } 
        if (type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        }

        const newState = { ...formData, [name]: processedValue };

        // Logic to reset subcategories if category changes
        if (name === 'category') {
            newState.subcategory = '';
            newState.otraSubcategoria = '';
        }
        if (name === 'locationDepartment') {
            newState.locationCity = '';
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
                    if (name === 'photos') {
                        setFormData(prev => ({
                            ...prev,
                            photos: [...(prev.photos || []), { name: file.name, content: event.target.result as string }]
                        }));
                    } else {
                        // Generic file attachment (qualityFile, logisticsFile)
                        setFormData(prev => ({
                            ...prev,
                            [name]: { name: file.name, content: event.target.result as string }
                        }));
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos?.filter((_, i) => i !== index)
        }));
    };
    
    // Price Variable Handlers
    const addVariable = () => {
        setPriceVariables(prev => [...prev, { id: Date.now(), name: '', value: '0' }]);
    };

    const removeVariable = (id: number) => {
        if (priceVariables.length > 1) {
            setPriceVariables(prev => prev.filter(v => v.id !== id));
        }
    };

    const updateVariable = (id: number, field: keyof PriceVariable, value: string) => {
        setPriceVariables(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Removed explicit title check as it is now auto-generated
        if (!formData.quantity || !formData.description) {
            alert('Por favor complete los campos obligatorios.');
            return;
        }

        if (totalEstimatedPrice <= 0) {
            alert('El precio total debe ser mayor a 0.');
            return;
        }

        if (!formData.validFrom || !formData.validUntil) {
            alert('Debe especificar las fechas de vigencia de la oferta.');
            return;
        }

        // --- DATE VALIDATION ---
        if (formData.validFrom < todayString) {
            alert(`La fecha de inicio de vigencia (${formData.validFrom}) no puede ser anterior a la fecha actual (${todayString}).`);
            return;
        }

        if (formData.validUntil < formData.validFrom) {
            alert('La fecha de fin de vigencia no puede ser anterior a la fecha de inicio.');
            return;
        }
        // -----------------------

        // VALIDACIÓN: Fotos Obligatorias
        if (!formData.photos || formData.photos.length === 0) {
            alert('Es obligatorio subir al menos una foto del material para publicar.');
            return;
        }

        // VALIDACIÓN: Fee de Gestión (Simetría Módulo 1)
        if (!formData.managementFeeAccepted) {
            alert('Es obligatorio aceptar el costo de gestión de Yubarta para poder publicar la oferta. Por favor, marque la casilla al final del formulario.');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            const finalData = { ...formData };

            // Apply calculated price at submission time
            finalData.pricePerUnit = totalEstimatedPrice;

            // Resolve "Otro" fields
            if (finalData.category === 'Otro') finalData.category = finalData.otraCategoriaMaterial || 'Otro';
            if (finalData.subcategory === 'Otro') finalData.subcategory = finalData.otraSubcategoria || 'Otro';
            if (finalData.presentation === 'Otro') finalData.presentation = finalData.otraPresentacionMaterial || 'Otro';

            // Auto-generate title for internal use
            finalData.title = `${finalData.category} ${finalData.subcategory ? '- ' + finalData.subcategory : ''}`;

            // Clean up temporary fields
            delete finalData.otraCategoriaMaterial;
            delete finalData.otraSubcategoria;
            delete finalData.otraPresentacionMaterial;
            
            // Clean up exclusivity
            if (finalData.inputTypeCalidad === 'file') finalData.qualityUrl = undefined;
            else finalData.qualityFile = undefined;
            
            if (finalData.inputTypeLogistica === 'file') finalData.logisticsUrl = undefined;
            else finalData.logisticsFile = undefined;
            
            delete finalData.inputTypeCalidad;
            delete finalData.inputTypeLogistica;

            // Serialize Price Structure
            finalData.priceStructure = JSON.stringify(priceVariables.map(v => ({ name: v.name, value: parseFloat(v.value) || 0 })));

            onSubmit(finalData);
            setIsSubmitting(false);
        }, 1000);
    };

    const commonInputClass = "mt-1 block w-full px-3 py-2 border border-[#D6D6D6] rounded-lg shadow-sm placeholder-[#7A7A7A] focus:outline-none focus:ring-[#007A8A] focus:border-[#007A8A] sm:text-sm text-[#0A0A0A] bg-white";
    const commonLabelClass = "block text-sm font-medium text-[#3D3D3D] mb-1";
    const fieldsetLegendClass = "text-lg font-bold text-[#0A0A0A] border-b border-[#F5F7F8] pb-2 mb-4 w-full";

    const totalKg = formData.unit === 'Toneladas' ? formData.quantity * 1000 : formData.quantity;
    const managementFeeTotal = totalKg * (formData.managementFeePerKg || 0);

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. Información General */}
            <fieldset>
                <legend className={fieldsetLegendClass}>1. Información General del Material</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Categorización */}
                    <div>
                        <label className={commonLabelClass}>Categoría</label>
                        <select name="category" value={formData.category} onChange={handleChange} className={commonInputClass}>
                            {Object.keys(materialCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    {formData.category === 'Otro' && (
                        <div>
                            <label className={commonLabelClass}>¿Cuál?</label>
                            <input type="text" name="otraCategoriaMaterial" value={formData.otraCategoriaMaterial} onChange={handleChange} required className={commonInputClass} />
                        </div>
                    )}

                    <div>
                        <label className={commonLabelClass}>Subcategoría</label>
                        <select name="subcategory" value={formData.subcategory || ''} onChange={handleChange} className={commonInputClass} disabled={subcategoryOptions.length === 0 && formData.category !== 'Otro'}>
                            <option value="">{subcategoryOptions.length > 0 ? 'Seleccione...' : 'N/A'}</option>
                            {subcategoryOptions.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                    </div>
                    {formData.subcategory === 'Otro' && (
                        <div>
                            <label className={commonLabelClass}>¿Cuál?</label>
                            <input type="text" name="otraSubcategoria" value={formData.otraSubcategoria} onChange={handleChange} required className={commonInputClass} />
                        </div>
                    )}

                    <div>
                        <label className={commonLabelClass}>Presentación</label>
                        <select name="presentation" value={formData.presentation} onChange={handleChange} className={commonInputClass}>
                            {presentationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    {formData.presentation === 'Otro' && (
                        <div>
                            <label className={commonLabelClass}>¿Cuál?</label>
                            <input type="text" name="otraPresentacionMaterial" value={formData.otraPresentacionMaterial} onChange={handleChange} required className={commonInputClass} />
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Descripción Breve</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} required rows={2} className={commonInputClass} placeholder="Resumen del material para el listado..." />
                    </div>
                </div>
            </fieldset>

            {/* 2. Vigencia, Cantidad y Frecuencia */}
            <fieldset>
                <legend className={fieldsetLegendClass}>2. Vigencia y Cantidad</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={commonLabelClass}>Vigente Desde</label>
                            <input 
                                type="date" 
                                name="validFrom" 
                                value={formData.validFrom} 
                                onChange={handleChange} 
                                required 
                                className={commonInputClass} 
                                min={todayString} 
                            />
                        </div>
                        <div>
                            <label className={commonLabelClass}>Vigente Hasta</label>
                            <input 
                                type="date" 
                                name="validUntil" 
                                value={formData.validUntil} 
                                onChange={handleChange} 
                                required 
                                className={commonInputClass} 
                                min={formData.validFrom || todayString} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className={commonLabelClass}>Frecuencia de Entregas</label>
                        <select name="frequency" value={formData.frequency} onChange={handleChange} className={commonInputClass}>
                            <option>Única Vez</option>
                            <option>Semanal</option>
                            <option>Quincenal</option>
                            <option>Mensual</option>
                            <option>Trimestral</option>
                            <option>Anual</option>
                        </select>
                    </div>

                    <div>
                        <label className={commonLabelClass}>Cantidad TOTAL a Vender</label>
                        <div className="flex space-x-2">
                            <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required className={commonInputClass} min="0" />
                            <select name="unit" value={formData.unit} onChange={handleChange} className="mt-1 block rounded-lg border-[#D6D6D6] border p-2 bg-[#F5F7F8] text-[#0A0A0A] focus:ring-[#007A8A]">
                                <option>Toneladas</option>
                                <option>Kg</option>
                                <option>Unidades</option>
                            </select>
                        </div>
                        <p className="text-xs text-[#7A7A7A] mt-1">Total acumulado durante la vigencia.</p>
                    </div>

                    {deliveryCalculation && (
                        <div className="md:col-span-2 bg-[#E3FAF6] border border-[#6FD6C2] rounded-lg p-4 text-sm text-[#005B6A]">
                            <p className="font-bold flex items-center">
                                <span className="mr-2 text-xl">ℹ️</span> Resumen de Suministro:
                            </p>
                            <p className="mt-1 ml-6">{deliveryCalculation.message}</p>
                        </div>
                    )}
                </div>
            </fieldset>

            {/* 3. Estructura de Precio */}
            <fieldset>
                <div className="flex justify-between items-center mb-4 border-b border-[#F5F7F8] pb-2">
                    <h4 className="text-lg font-bold text-[#0A0A0A]">3. Estructura de Precio</h4>
                    <select name="currency" value={formData.currency} onChange={handleChange} className="text-sm border-[#D6D6D6] rounded-md border p-1 bg-white">
                        <option>COP</option>
                        <option>USD</option>
                    </select>
                </div>
                
                <div className="bg-[#FAFBFC] p-4 rounded-lg border border-[#D6D6D6] space-y-3">
                    <div className="flex justify-between text-xs font-bold text-[#7A7A7A] uppercase px-2">
                        <span>Concepto</span>
                        <span>Valor (COP/kg)</span>
                    </div>
                    {priceVariables.map((variable) => (
                        <div key={variable.id} className="flex space-x-2 items-center">
                            <input 
                                type="text" 
                                placeholder="Ej: Precio Base" 
                                value={variable.name}
                                onChange={(e) => updateVariable(variable.id, 'name', e.target.value)}
                                className="flex-grow rounded-lg border-[#D6D6D6] border p-2 text-sm focus:outline-none focus:ring-[#007A8A]"
                            />
                            <input 
                                type="number" 
                                placeholder="0" 
                                value={variable.value}
                                onChange={(e) => updateVariable(variable.id, 'value', e.target.value)}
                                className="w-32 rounded-lg border-[#D6D6D6] border p-2 text-sm text-right focus:outline-none focus:ring-[#007A8A]"
                            />
                            <button 
                                type="button" 
                                onClick={() => removeVariable(variable.id)}
                                disabled={priceVariables.length <= 1}
                                className="p-2 text-[#7A7A7A] hover:text-[#B63A3A] disabled:opacity-30 transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    
                    <button type="button" onClick={addVariable} className="text-sm text-[#007A8A] hover:text-[#005B6A] flex items-center mt-2 font-bold">
                        <PlusIcon className="w-4 h-4 mr-1" /> Agregar Variable
                    </button>

                    <div className="pt-3 border-t border-[#D6D6D6] flex justify-between items-center">
                        <span className="font-bold text-[#3D3D3D]">Precio Total por Kilo:</span>
                        <span className="text-xl font-bold text-[#007A8A]">
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: formData.currency }).format(totalEstimatedPrice)}
                        </span>
                    </div>
                </div>
            </fieldset>

            {/* 4. Detalles de Calidad */}
            <fieldset>
                <legend className={fieldsetLegendClass}>4. Detalles de Calidad</legend>
                <div className="space-y-4">
                    <div>
                        <label className={commonLabelClass}>Descripción Técnica / Calidad</label>
                        <textarea name="qualityDescription" value={formData.qualityDescription} onChange={handleChange} rows={3} className={commonInputClass} placeholder="Pureza, contaminación, origen, ficha técnica..." />
                    </div>
                    
                    <div className="bg-[#FAFBFC] p-4 rounded-lg border border-[#D6D6D6]">
                        <label className="block text-xs font-bold text-[#7A7A7A] uppercase mb-2">Documentación Adicional (Opcional)</label>
                        <div className="flex space-x-4 mb-3">
                            <label className="inline-flex items-center text-sm font-medium text-[#3D3D3D]">
                                <input type="radio" name="inputTypeCalidad" value="file" checked={formData.inputTypeCalidad === 'file'} onChange={() => setFormData({...formData, inputTypeCalidad: 'file'})} className="mr-2 text-[#007A8A] focus:ring-[#007A8A]" />
                                Subir PDF/Imagen
                            </label>
                            <label className="inline-flex items-center text-sm font-medium text-[#3D3D3D]">
                                <input type="radio" name="inputTypeCalidad" value="url" checked={formData.inputTypeCalidad === 'url'} onChange={() => setFormData({...formData, inputTypeCalidad: 'url'})} className="mr-2 text-[#007A8A] focus:ring-[#007A8A]" />
                                Enlace Externo
                            </label>
                        </div>
                        {formData.inputTypeCalidad === 'file' ? (
                            <input type="file" name="qualityFile" onChange={handleFileChange} className="block w-full text-sm text-[#7A7A7A] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#E3FAF6] file:text-[#007A8A] hover:file:bg-[#D7EEF0]" accept=".pdf,image/*" />
                        ) : (
                            <input type="url" name="qualityUrl" value={formData.qualityUrl || ''} onChange={handleChange} placeholder="https://..." className={commonInputClass} />
                        )}
                    </div>
                </div>
            </fieldset>

            {/* 5. Detalles Logísticos */}
            <fieldset>
                <legend className={fieldsetLegendClass}>5. Detalles Logísticos</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className={commonLabelClass}>Departamento Ubicación</label>
                        <select name="locationDepartment" value={formData.locationDepartment} onChange={handleChange} required className={commonInputClass}>
                            <option value="">Seleccione...</option>
                            {colombianDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={commonLabelClass}>Ciudad Ubicación</label>
                        <select name="locationCity" value={formData.locationCity} onChange={handleChange} required className={commonInputClass} disabled={!formData.locationDepartment}>
                            <option value="">Seleccione...</option>
                            {municipalities.map(mun => <option key={mun} value={mun}>{mun}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={commonLabelClass}>Descripción Logística</label>
                        <textarea name="logisticsDescription" value={formData.logisticsDescription} onChange={handleChange} rows={2} className={commonInputClass} placeholder="Condiciones de carga, horarios, tipo de vehículo requerido..." />
                    </div>

                    <div className="bg-[#FAFBFC] p-4 rounded-lg border border-[#D6D6D6]">
                        <label className="block text-xs font-bold text-[#7A7A7A] uppercase mb-2">Documentación Logística (Opcional)</label>
                        <div className="flex space-x-4 mb-3">
                            <label className="inline-flex items-center text-sm font-medium text-[#3D3D3D]">
                                <input type="radio" name="inputTypeLogistica" value="file" checked={formData.inputTypeLogistica === 'file'} onChange={() => setFormData({...formData, inputTypeLogistica: 'file'})} className="mr-2 text-[#007A8A] focus:ring-[#007A8A]" />
                                Subir PDF/Imagen
                            </label>
                            <label className="inline-flex items-center text-sm font-medium text-[#3D3D3D]">
                                <input type="radio" name="inputTypeLogistica" value="url" checked={formData.inputTypeLogistica === 'url'} onChange={() => setFormData({...formData, inputTypeLogistica: 'url'})} className="mr-2 text-[#007A8A] focus:ring-[#007A8A]" />
                                Enlace Externo
                            </label>
                        </div>
                        {formData.inputTypeLogistica === 'file' ? (
                            <input type="file" name="logisticsFile" onChange={handleFileChange} className="block w-full text-sm text-[#7A7A7A] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#E3FAF6] file:text-[#007A8A] hover:file:bg-[#D7EEF0]" accept=".pdf,image/*" />
                        ) : (
                            <input type="url" name="logisticsUrl" value={formData.logisticsUrl || ''} onChange={handleChange} placeholder="https://..." className={commonInputClass} />
                        )}
                    </div>
                </div>
            </fieldset>

            {/* 6. Galería */}
            <fieldset>
                <legend className={fieldsetLegendClass}>6. Galería de Fotos <span className="text-[#B63A3A] text-sm font-normal">*Obligatorio</span></legend>
                <div className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-[#D6D6D6] px-6 pt-5 pb-6 bg-[#FAFBFC]">
                    <div className="space-y-1 text-center">
                        <CameraIcon className="mx-auto h-12 w-12 text-[#D6D6D6]" />
                        <div className="flex text-sm text-[#7A7A7A]">
                            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-bold text-[#007A8A] hover:text-[#005B6A] focus-within:outline-none">
                                <span>Subir un archivo</span>
                                <input id="file-upload" name="photos" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                            </label>
                            <p className="pl-1">o arrastrar y soltar</p>
                        </div>
                        <p className="text-xs text-[#7A7A7A]">PNG, JPG hasta 5MB</p>
                    </div>
                </div>
                {formData.photos && formData.photos.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-4">
                        {formData.photos.map((photo, idx) => (
                            <div key={idx} className="relative group">
                                <img src={photo.content} alt={photo.name} className="h-24 w-24 object-cover rounded-xl shadow-sm border border-[#D6D6D6]" />
                                <button type="button" onClick={() => removePhoto(idx)} className="absolute -top-2 -right-2 bg-[#B63A3A] text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </fieldset>

            {/* 7. Requerimientos Legales y Ambientales */}
            <fieldset>
                <legend className={fieldsetLegendClass}>7. Requerimientos Legales</legend>
                <div className="bg-[#FFF7DA] border border-[#C98B00]/20 rounded-xl p-4">
                    <label className="block text-sm font-bold text-[#3D3D3D] mb-2">¿Necesita que el comprador emita un Certificado de Disposición Final?</label>
                    <p className="text-xs text-[#7A7A7A] mb-3">Si marca "Sí", el sistema preguntará al comprador si está habilitado.</p>
                    <div className="flex space-x-6">
                        <label className="inline-flex items-center">
                            <input 
                                type="radio" 
                                name="requiresCertificateRadio" 
                                checked={formData.requiresCertificate === true} 
                                onChange={() => setFormData({...formData, requiresCertificate: true})} 
                                className="form-radio h-4 w-4 text-[#007A8A] focus:ring-[#007A8A]"
                            />
                            <span className="ml-2 text-sm font-medium text-[#3D3D3D]">Sí, requiero certificado</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input 
                                type="radio" 
                                name="requiresCertificateRadio" 
                                checked={formData.requiresCertificate === false} 
                                onChange={() => setFormData({...formData, requiresCertificate: false})} 
                                className="form-radio h-4 w-4 text-[#7A7A7A] focus:ring-[#007A8A]"
                            />
                            <span className="ml-2 text-sm font-medium text-[#3D3D3D]">No</span>
                        </label>
                    </div>
                </div>
            </fieldset>

            {/* 8. Fee de Gestión Yubarta (Simetría con Módulo 1) */}
            {formData.quantity > 0 && (
                <fieldset>
                    <legend className={fieldsetLegendClass}>8. Costo de Gestión Yubarta</legend>
                    <div className="mt-4 bg-[#E3FAF6] p-6 rounded-lg border border-[#6FD6C2]">
                        <p className="text-sm text-[#005B6A] mb-4">
                            Este valor corresponde a la gestión comercial, verificación de compradores y aseguramiento de pagos.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
                            <div className="bg-white p-3 rounded shadow-sm border border-[#D6D6D6]">
                                <span className="block text-[#7A7A7A] text-xs uppercase tracking-wide">Valor por Kilo (Fórmula)</span>
                                <span className="text-lg font-bold text-[#007A8A]">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(formData.managementFeePerKg || 0)}
                                </span>
                            </div>
                            <div className="bg-white p-3 rounded shadow-sm border border-[#D6D6D6]">
                                <span className="block text-[#7A7A7A] text-xs uppercase tracking-wide">Total Estimado</span>
                                <span className="text-lg font-bold text-[#007A8A]">
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
                                    className="focus:ring-[#007A8A] h-4 w-4 text-[#007A8A] border-[#D6D6D6] rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="managementFeeAccepted" className="font-medium text-[#003F4A]">
                                    Acepto el valor a pagar por kilo ({new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(formData.managementFeePerKg || 0)}) a Yubarta por concepto de gestión comercial.
                                </label>
                                <p className="text-[#005B6A] text-xs mt-1">Al marcar esta casilla, confirma que entiende que este valor se facturará sobre el material efectivamente transado. <strong>La aceptación es obligatoria para publicar.</strong></p>
                            </div>
                        </div>
                    </div>
                </fieldset>
            )}

            <div className="flex justify-end space-x-3 pt-6 border-t border-[#F5F7F8] mt-6 sticky bottom-0 bg-white py-4 z-10">
                <button type="button" onClick={onCancel} className="bg-white py-2.5 px-6 border border-[#D6D6D6] rounded-lg shadow-sm text-sm font-bold text-[#3D3D3D] hover:bg-[#F5F7F8] transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-bold rounded-lg text-white bg-[#007A8A] hover:bg-[#005B6A] disabled:opacity-50 min-w-[160px] transition-all">
                    {isSubmitting ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : (initialData ? 'Guardar Cambios' : 'Publicar Oferta')}
                </button>
            </div>
        </form>
    );
};

export default ListingForm;
