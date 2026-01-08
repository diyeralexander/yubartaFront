
import React, { useState } from 'react';
import { TruckIcon, ArchiveBoxIcon, CheckCircleIcon, ChartBarIcon } from './icons';

interface ModuleHelpModalProps {
    module: 'SOURCING' | 'MARKETPLACE';
    onClose: () => void;
}

const ModuleHelpModal = ({ module, onClose }: ModuleHelpModalProps) => {
    const isSourcing = module === 'SOURCING';

    const content = {
        title: isSourcing ? "Demanda y Suministro Planificado" : "Bodega Virtual de Reciclados",
        subtitle: isSourcing ? "Módulo de Abastecimiento Estratégico" : "Módulo de Oportunidades Spot",
        color: isSourcing ? "text-[#005B6A] bg-[#D7EEF0]" : "text-[#007A8A] bg-[#E3FAF6]",
        icon: isSourcing ? TruckIcon : ArchiveBoxIcon,
        description: isSourcing 
            ? "Diseñado para asegurar volúmenes constantes y cerrar contratos a mediano plazo. Aquí planificas tu producción o compra futura."
            : "Diseñado para operaciones inmediatas. Aquí encuentras o vendes material que ya está en stock y listo para despachar.",
        
        whenToUse: isSourcing 
            ? "Úsalo cuando necesites asegurar una cantidad mensual fija, o cuando tengas capacidad de producción constante y busques un cliente fijo."
            : "Úsalo cuando tengas un lote de material listo para vender ya, o cuando necesites comprar material urgentemente para cubrir un faltante.",
        
        fields: isSourcing 
            ? [
                { label: "Cantidad Total Global", text: "La suma total que necesitas durante todo el contrato (ej. 120 Toneladas en 1 año)." },
                { label: "Frecuencia", text: "Cada cuánto se debe entregar el material (Semanal, Mensual, etc.)." },
                { label: "Vigencia", text: "Fechas de inicio y fin del contrato de suministro." },
                { label: "Fórmula de Precio", text: "Cómo se calculará el precio a futuro (fijo o variable según mercado)." }
              ]
            : [
                { label: "Cantidad Disponible", text: "El stock real que tienes en bodega listo para cargar." },
                { label: "Precio Unitario", text: "El valor por unidad (Kg/Ton) para venta inmediata." },
                { label: "Ubicación", text: "Dónde está el material físicamente para ser recogido." },
                { label: "Fotos Reales", text: "Imágenes del lote específico que se está vendiendo." }
              ],
        
        process: isSourcing 
            ? ["Creas la Solicitud", "Proveedores envían Ofertas Planificadas", "Negocias condiciones", "Cierras el Acuerdo Marco", "Inician las entregas periódicas"]
            : ["Publicas el Material", "Compradores ven tu stock", "Recibes Oferta de Compra", "Aceptas la Oferta", "Se coordina la logística inmediata"]
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#003F4A]/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
                
                {/* Header */}
                <div className={`p-8 ${content.color} flex items-center gap-5`}>
                    <div className="w-16 h-16 bg-white/40 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-sm">
                        <content.icon className="w-8 h-8 text-current" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{content.subtitle}</p>
                        <h2 className="text-2xl font-black leading-none">{content.title}</h2>
                    </div>
                    <button onClick={onClose} className="ml-auto p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                        <span className="text-2xl leading-none opacity-60 hover:opacity-100">&times;</span>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-8 overflow-y-auto space-y-8">
                    
                    {/* Intro */}
                    <div>
                        <p className="text-lg text-[#3D3D3D] font-medium leading-relaxed">
                            {content.description}
                        </p>
                        <div className="mt-4 p-4 bg-[#FAFBFC] border border-[#F5F7F8] rounded-xl flex gap-3">
                            <div className="mt-1"><ChartBarIcon className="w-5 h-5 text-[#007A8A]" /></div>
                            <div>
                                <h4 className="font-bold text-[#0A0A0A] text-sm uppercase">¿Cuándo usar este módulo?</h4>
                                <p className="text-sm text-[#7A7A7A] mt-1">{content.whenToUse}</p>
                            </div>
                        </div>
                    </div>

                    {/* Fields Explain */}
                    <div>
                        <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wide border-b border-[#F5F7F8] pb-2 mb-4">
                            Conceptos Clave
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {content.fields.map((field, idx) => (
                                <div key={idx} className="bg-white border border-[#D6D6D6] p-4 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                                    <p className="font-bold text-[#007A8A] text-sm mb-1">{field.label}</p>
                                    <p className="text-xs text-[#7A7A7A] leading-relaxed">{field.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Process */}
                    <div>
                        <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wide border-b border-[#F5F7F8] pb-2 mb-4">
                            Flujo de Trabajo
                        </h3>
                        <div className="flex flex-col gap-3">
                            {content.process.map((step, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#F5F7F8] border border-[#D6D6D6] flex items-center justify-center text-xs font-bold text-[#7A7A7A]">
                                        {idx + 1}
                                    </div>
                                    <p className="text-sm font-medium text-[#3D3D3D]">{step}</p>
                                    {idx < content.process.length - 1 && (
                                        <div className="h-4 w-px bg-[#D6D6D6] mx-auto hidden"></div> 
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#F5F7F8] bg-[#FAFBFC] flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-[#007A8A] hover:bg-[#005B6A] text-white font-bold rounded-xl shadow-lg shadow-[#007A8A]/20 transition-all active:scale-95"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModuleHelpModal;
