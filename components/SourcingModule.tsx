
import React from 'react';
import { User, Role } from '../types';
import BuyerDashboard from './BuyerDashboard';
import SellerDashboard from './SellerDashboard';
import AdminDashboard from './AdminDashboard';
import { AdminIcon, BuyerIcon, TruckIcon } from './icons';

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
        <div className="p-4 mb-6 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center">
            {getRoleIcon(currentUser.role)}
            <p>Bienvenido, <span className="font-semibold">{currentUser.name}</span>. Estás viendo el panel de <span className="font-semibold">{currentUser.role.toLowerCase()}</span> (Abastecimiento).</p>
        </div>
        {renderDashboard()}
    </div>
  );
};

export default SourcingModule;
