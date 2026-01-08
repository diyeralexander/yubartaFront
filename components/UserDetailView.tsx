
import React from 'react';
import { User, Role } from '../types';
import { CheckCircleIcon, XCircleIcon, UserCircleIcon, LinkIcon } from './icons';

// Helper component for consistent row display
const DetailRow = ({ label, value, fullWidth = false }: { label: string; value?: string | React.ReactNode; fullWidth?: boolean }) => (
    <div className={`py-3 px-1 ${fullWidth ? 'col-span-full' : ''}`}>
        <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</dt>
        <dd className="text-sm font-medium text-gray-900 break-words">{value || <span className="text-gray-400 italic">No registrado</span>}</dd>
    </div>
);

const UserDetailView = ({ user }: { user: User }) => {
    const getRoleLabel = (role: Role) => {
        switch (role) {
            case Role.BUYER: return 'COMPRADOR';
            case Role.SELLER: return 'VENDEDOR';
            case Role.ADMIN: return 'ADMINISTRADOR';
            default: return role;
        }
    };

    return (
        <div className="bg-white rounded-lg">
            {/* Header Section */}
            <div className="flex items-center space-x-4 mb-8 border-b border-gray-100 pb-6">
                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <UserCircleIcon className="h-10 w-10" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            user.role === Role.ADMIN ? 'bg-slate-100 text-slate-700 border-slate-200' :
                            user.role === Role.BUYER ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            'bg-teal-50 text-teal-700 border-teal-200'
                        }`}>
                            {getRoleLabel(user.role)}
                        </span>
                        {user.role === Role.BUYER && user.buyerType && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                {user.buyerType}
                            </span>
                        )}
                        {user.isVerified ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                <CheckCircleIcon className="h-3 w-3 mr-1" /> Verificado
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                <XCircleIcon className="h-3 w-3 mr-1" /> No Verificado
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* 1. Datos Legales y Corporativos */}
                <section>
                    <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4 uppercase tracking-wide">
                        Información Legal y Corporativa
                    </h4>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        <DetailRow label="Razón Social / Nombre" value={user.name} />
                        <DetailRow label="Correo Electrónico (Acceso)" value={user.email} />
                        <DetailRow label="Tipo de Identificación" value={user.idType} />
                        <DetailRow label="Número de Identificación" value={user.idNumber} />
                        {user.role === Role.BUYER && user.buyerType === 'Transformador' && (
                            <DetailRow 
                                label="Certificación REP" 
                                value={user.certifiesREP ? 
                                    <span className="text-green-600 font-bold">Sí, certifica Responsabilidad Extendida</span> : 
                                    <span className="text-gray-500">No certifica</span>
                                } 
                                fullWidth
                            />
                        )}
                    </div>
                </section>

                {/* 2. Ubicación */}
                <section>
                    <h4 className="text-sm font-bold text-gray-900 border-l-4 border-teal-500 pl-3 mb-4 uppercase tracking-wide">
                        Ubicación Principal
                    </h4>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        <DetailRow label="Departamento" value={user.department} />
                        <DetailRow label="Ciudad / Municipio" value={user.city} />
                        <DetailRow label="Dirección Física" value={user.address} fullWidth />
                    </div>
                </section>

                {/* 3. Contactos */}
                <section>
                    <h4 className="text-sm font-bold text-gray-900 border-l-4 border-blue-500 pl-3 mb-4 uppercase tracking-wide">
                        Información de Contacto
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contacto 1 */}
                        <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                            <h5 className="text-xs font-bold text-blue-800 uppercase mb-3">Contacto Principal</h5>
                            <div className="space-y-2">
                                <DetailRow label="Nombre Completo" value={user.contactPerson1Name} />
                                <DetailRow label="Cargo" value={user.contactPerson1Position} />
                                <DetailRow label="Teléfono / Celular" value={user.phone1} />
                            </div>
                        </div>

                        {/* Contacto 2 (Opcional) */}
                        <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-200">
                            <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">Contacto Secundario</h5>
                            <div className="space-y-2">
                                <DetailRow label="Nombre Completo" value={user.contactPerson2Name} />
                                <DetailRow label="Cargo" value={user.contactPerson2Position} />
                                <DetailRow label="Teléfono / Celular" value={user.phone2} />
                            </div>
                        </div>
                    </div>
                </section>
                
                {user.pendingChanges && Object.keys(user.pendingChanges).length > 0 && (
                    <section className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mt-4">
                        <h4 className="text-sm font-bold text-yellow-800 uppercase mb-2">Solicitudes de Cambio Pendientes</h4>
                        <ul className="list-disc list-inside text-sm text-yellow-700">
                            {Object.entries(user.pendingChanges).map(([key, val]) => (
                                <li key={key}>
                                    <strong>{key}:</strong> {String(val)}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
};

export default UserDetailView;
