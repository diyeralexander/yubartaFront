
import React, { useState } from 'react';
import { User, Role } from '../types';
import { useData } from '../hooks/useData';
import { CheckCircleIcon, XCircleIcon, UserCircleIcon, PencilIcon, ArchiveBoxIcon, SpinnerIcon } from './icons';

interface ProfileEditorProps {
    currentUser: User;
    onClose: () => void;
}

const ProfileEditor = ({ currentUser, onClose }: ProfileEditorProps) => {
    const { updateUser } = useData();
    const [profileData, setProfileData] = useState<User>(currentUser);
    const [isSaving, setIsSaving] = useState(false);
    const [changeRequest, setChangeRequest] = useState<{ field: string; label: string; currentValue: any } | null>(null);
    const [newValue, setNewValue] = useState('');
    const [isSubmittingChange, setIsSubmittingChange] = useState(false);

    const getRoleLabel = (role: Role) => {
        switch (role) {
            case Role.BUYER: return 'COMPRADOR';
            case Role.SELLER: return 'VENDEDOR';
            case Role.ADMIN: return 'ADMINISTRADOR';
            default: return role;
        }
    };

    // --- Helpers ---
    const RestrictedField = ({ label, value, fieldName, fullWidth = false }: { label: string, value: string | undefined, fieldName: string, fullWidth?: boolean }) => (
        <div className={`relative ${fullWidth ? 'md:col-span-2' : ''}`}>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1 flex justify-between">
                {label}
                <span className="text-[10px] text-slate-300 font-normal bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">Restringido</span>
            </label>
            <div className="flex items-center gap-2 group">
                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 flex justify-between items-center cursor-not-allowed transition-colors group-hover:border-slate-300">
                    <span className="truncate">{value || 'N/A'}</span>
                </div>
                <button 
                    type="button" 
                    onClick={() => { setChangeRequest({ field: fieldName, label, currentValue: value }); setNewValue(value || ''); }} 
                    className="p-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 rounded-xl transition-all text-xs font-bold whitespace-nowrap shadow-sm border border-indigo-100 active:scale-95 opacity-0 group-hover:opacity-100"
                    title="Solicitar cambio al administrador"
                >
                    <PencilIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const EditableField = ({ label, name, value, type = "text" }: { label: string, name: string, value: string | undefined, type?: string }) => (
        <div>
            <label className="block text-xs font-bold text-teal-700 uppercase tracking-widest mb-1 ml-1 flex items-center">
                {label} <span className="ml-2 bg-teal-100 text-teal-800 text-[10px] px-1.5 py-0.5 rounded font-bold">Editable</span>
            </label>
            <input 
                type={type} 
                name={name} 
                value={value || ''} 
                onChange={(e) => setProfileData({...profileData, [name]: e.target.value})} 
                className="mt-1 block w-full px-4 py-3 bg-white border border-teal-200 rounded-xl text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-900 placeholder-slate-400"
                placeholder={`Ingrese ${label.toLowerCase()}...`}
            />
        </div>
    );

    // --- Handlers ---
    const handleSaveContacts = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateUser(currentUser.id, {
                contactPerson1Name: profileData.contactPerson1Name,
                contactPerson1Position: profileData.contactPerson1Position,
                phone1: profileData.phone1,
                contactPerson2Name: profileData.contactPerson2Name,
                contactPerson2Position: profileData.contactPerson2Position,
                phone2: profileData.phone2
            });
            alert("Información de contacto actualizada correctamente.");
        } catch (error) {
            alert("Error al guardar: " + (error as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRequestChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!changeRequest) return;
        setIsSubmittingChange(true);
        try {
            await updateUser(currentUser.id, {
                pendingChanges: { ...currentUser.pendingChanges, [changeRequest.field]: newValue }
            });
            setChangeRequest(null);
            alert("Solicitud de cambio enviada al administrador.");
        } catch (error) {
            alert("Error al enviar solicitud: " + (error as Error).message);
        } finally {
            setIsSubmittingChange(false);
        }
    };

    return (
        <div className="bg-white">
            {/* Header */}
            <div className="flex flex-col items-center mb-8 pb-6 border-b border-slate-100">
                <div className="h-20 w-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                    <UserCircleIcon className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{currentUser.name}</h2>
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 font-medium">
                    <span className="uppercase">{getRoleLabel(currentUser.role)}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>{currentUser.email}</span>
                </div>
                <div className="mt-4">
                    {currentUser.isVerified ? (
                        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100 flex items-center shadow-sm">
                            <CheckCircleIcon className="w-4 h-4 mr-1.5"/> Cuenta Verificada
                        </span>
                    ) : (
                        <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-100 flex items-center shadow-sm">
                            <XCircleIcon className="w-4 h-4 mr-1.5"/> No Verificado
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-10">
                {/* Section 1: Restricted Data */}
                <section>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                            <ArchiveBoxIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Datos Legales y Ubicación</h3>
                            <p className="text-xs text-slate-500">Estos datos son críticos y requieren autorización para cambiarse.</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <RestrictedField label="Razón Social / Nombre" value={currentUser.name} fieldName="name" />
                        <RestrictedField label="NIT / Documento ID" value={currentUser.idNumber} fieldName="idNumber" />
                        <RestrictedField label="Correo Electrónico" value={currentUser.email} fieldName="email" />
                        <RestrictedField label="Departamento" value={currentUser.department} fieldName="department" />
                        <RestrictedField label="Ciudad" value={currentUser.city} fieldName="city" />
                        <RestrictedField label="Dirección Física" value={currentUser.address} fieldName="address" />
                        {currentUser.buyerType === 'Transformador' && (
                            <RestrictedField label="Certifica REP" value={currentUser.certifiesREP ? 'Sí' : 'No'} fieldName="certifiesREP" fullWidth />
                        )}
                    </div>
                </section>

                {/* Section 2: Editable Data */}
                <section>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
                            <PencilIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Información de Contacto</h3>
                            <p className="text-xs text-slate-500">Mantenga esta información actualizada para facilitar la comunicación.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSaveContacts}>
                        <div className="border border-teal-100 bg-white p-6 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Contacto Principal */}
                            <div className="md:col-span-2 pb-2 border-b border-slate-100">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Contacto Principal</h4>
                            </div>
                            <EditableField label="Nombre Completo" name="contactPerson1Name" value={profileData.contactPerson1Name} />
                            <EditableField label="Cargo" name="contactPerson1Position" value={profileData.contactPerson1Position} />
                            <EditableField label="Teléfono / Celular" name="phone1" value={profileData.phone1} type="tel" />
                            
                            {/* Contacto Secundario */}
                            <div className="md:col-span-2 pb-2 border-b border-slate-100 mt-2">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Contacto Secundario (Opcional)</h4>
                            </div>
                            <EditableField label="Nombre Completo" name="contactPerson2Name" value={profileData.contactPerson2Name} />
                            <EditableField label="Cargo" name="contactPerson2Position" value={profileData.contactPerson2Position} />
                            <EditableField label="Teléfono / Celular" name="phone2" value={profileData.phone2} type="tel" />
                        </div>
                        
                        <div className="flex justify-end mt-6">
                            <button 
                                type="submit" 
                                disabled={isSaving} 
                                className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 hover:shadow-xl transition-all active:scale-95 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <SpinnerIcon className="animate-spin w-5 h-5 mr-2"/> : null}
                                {isSaving ? 'Guardando...' : 'Guardar Cambios de Contacto'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            {/* Change Request Modal */}
            {changeRequest && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[150] p-4">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 animate-fade-in-up">
                        <h3 className="font-black text-xl mb-2 text-slate-900 tracking-tight">Solicitar cambio de {changeRequest.label}</h3>
                        <p className="text-sm text-slate-500 mb-6 font-medium">Por seguridad, este cambio debe ser aprobado por un administrador.</p>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Valor Actual</label>
                            <div className="p-3 bg-slate-50 rounded-xl text-slate-600 font-bold text-sm border border-slate-200">{changeRequest.currentValue || 'N/A'}</div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-indigo-600 uppercase mb-2 tracking-wide">Nuevo Valor Deseado</label>
                            {changeRequest.field === 'certifiesREP' ? (
                                <select className="w-full border-2 border-indigo-100 p-3 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors bg-white" value={newValue} onChange={e => setNewValue(e.target.value)}>
                                    <option value="">Seleccione...</option>
                                    <option value="yes">Sí</option>
                                    <option value="no">No</option>
                                </select>
                            ) : (
                                <input 
                                    className="w-full border-2 border-indigo-100 p-3 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors placeholder-indigo-200" 
                                    value={newValue} 
                                    onChange={e => setNewValue(e.target.value)} 
                                    placeholder="Ingrese el dato correcto..." 
                                />
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setChangeRequest(null)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="button" onClick={handleRequestChange} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center">
                                {isSubmittingChange ? <SpinnerIcon className="w-4 h-4 animate-spin mr-2"/> : null}
                                Enviar Solicitud
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileEditor;
