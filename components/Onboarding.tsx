
import React, { useState } from 'react';
import { TruckIcon, ArchiveBoxIcon, ShieldCheckIcon, CheckCircleIcon, ArrowLeftIcon } from './icons';

interface OnboardingProps {
    onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Demanda y Suministro Planificado",
            subtitle: "Módulo de Contratos Estables",
            description: "Gestiona solicitudes recurrentes y ofertas planificadas. Ideal para asegurar el abastecimiento de tu planta o vender tu producción futura con acuerdos confiables.",
            icon: TruckIcon,
            color: "bg-[#D7EEF0] text-[#005B6A]", // Teal theme
            bullets: ["Publica necesidades recurrentes", "Cierra contratos a mediano plazo", "Proveedores verificados"]
        },
        {
            title: "Bodega Virtual de Reciclados",
            subtitle: "Módulo de Oportunidades Spot",
            description: "Visualiza materiales disponibles en stock real para compra inmediata. Publica lotes únicos o excedentes para una venta rápida y eficiente.",
            icon: ArchiveBoxIcon,
            color: "bg-[#E3FAF6] text-[#007A8A]", // Cyan theme
            bullets: ["Compra/Venta de stock actual", "Operaciones rápidas", "Sin compromisos a largo plazo"]
        },
        {
            title: "Confianza y Privacidad",
            subtitle: "Tu seguridad es nuestra prioridad",
            description: "Navega con tranquilidad. Tu identidad y datos de contacto están protegidos hasta que decides cerrar un negocio o verificar tu contraparte.",
            icon: ShieldCheckIcon,
            color: "bg-[#E6F4EC] text-[#2E8B57]", // Green theme
            bullets: ["Identidad protegida", "Usuarios validados", "Gestión documental integrada"]
        }
    ];

    const currentStep = steps[step];
    const isLastStep = step === steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            onComplete();
        } else {
            setStep(prev => prev + 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#003F4A]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[500px] animate-fade-in-up">
                
                {/* Visual Header */}
                <div className={`h-40 ${currentStep.color} flex items-center justify-center transition-colors duration-500 relative`}>
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md shadow-inner">
                        <currentStep.icon className="w-10 h-10 text-current" />
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 flex flex-col items-center text-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#7A7A7A] mb-2">{currentStep.subtitle}</span>
                    <h2 className="text-2xl font-black text-[#0A0A0A] mb-4 leading-tight">{currentStep.title}</h2>
                    <p className="text-[#7A7A7A] text-sm leading-relaxed mb-8 max-w-sm">
                        {currentStep.description}
                    </p>

                    <div className="grid gap-3 w-full max-w-xs mb-8">
                        {currentStep.bullets.map((bullet, idx) => (
                            <div key={idx} className="flex items-center text-sm text-[#3D3D3D] font-medium bg-[#FAFBFC] p-3 rounded-xl border border-[#F5F7F8]">
                                <CheckCircleIcon className="w-4 h-4 mr-3 text-[#007A8A] flex-shrink-0" />
                                {bullet}
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto w-full flex flex-col gap-4 items-center">
                        <div className="flex gap-2 mb-2">
                            {steps.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`h-2 rounded-full transition-all duration-300 ${idx === step ? 'w-8 bg-[#007A8A]' : 'w-2 bg-[#D6D6D6]'}`}
                                />
                            ))}
                        </div>
                        
                        <button 
                            onClick={handleNext}
                            className="w-full py-3.5 bg-[#007A8A] hover:bg-[#005B6A] text-white rounded-xl font-bold shadow-lg shadow-[#007A8A]/20 transition-all active:scale-95 flex items-center justify-center"
                        >
                            {isLastStep ? 'Comenzar a Operar' : 'Siguiente'}
                        </button>
                        
                        {!isLastStep && (
                            <button onClick={onComplete} className="text-xs font-bold text-[#7A7A7A] hover:text-[#0A0A0A] transition-colors">
                                Saltar Introducción
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
