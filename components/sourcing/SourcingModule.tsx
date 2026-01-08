
import React from 'react';
import { User, Role } from '../../types';
import BuyerDashboard from './BuyerDashboard';
import SellerDashboard from './SellerDashboard';
import AdminDashboard from './AdminDashboard';
import { AdminIcon, BuyerIcon, TruckIcon } from '../icons';

interface SourcingModuleProps {
  currentUser: User;
}

const SourcingModule: React.FC<SourcingModuleProps> = ({ currentUser }) => {
  
  const getRoleIcon = (role: Role) => {
    switch (role) {
      case Role.ADMIN: return <AdminIcon className="w-5 h-5 mr-2 text-blue-600" />;
      case Role.BUYER: return <BuyerIcon className="w-5 h-5 mr-2 text-purple-600" />;
      case Role.SELLER: return <TruckIcon className="w-5 h-5 mr-2 text-green-600" />;
      default: return null;
    }
  }

  const renderDashboard = () => {
    switch (currentUser.role) {
      case Role.BUYER:
        return <BuyerDashboard currentUser={currentUser} />;
      case Role.SELLER:
        return <SellerDashboard currentUser={currentUser} />;
      case Role.ADMIN:
        return <AdminDashboard currentUser={currentUser} />;
      default:
        return <div className="p-4 text-red-600">Rol no reconocido para el Módulo de Abastecimiento</div>;
    }
  };

  return (
    <div className="animate-fade-in">
        <div className="p-6 mb-8 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-xl font-bold text-slate-900">Demanda y Suministro Planificado de Reciclados</h2>
                <p className="text-sm text-slate-500">Gestiona solicitudes y ofertas planificadas para acuerdos de suministro estables y confiables.</p>
            </div>
            <div className="flex items-center bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                {getRoleIcon(currentUser.role)}
                <p className="text-sm text-slate-600">Vista de <span className="font-semibold text-slate-900">{currentUser.role.toLowerCase()}</span></p>
            </div>
        </div>
        {renderDashboard()}
    </div>
  );
};

export default SourcingModule;
