
import React from 'react';
import { User, Role } from '../../types';
import BuyerMarketplaceDashboard from './BuyerMarketplaceDashboard';
import SellerMarketplaceDashboard from './SellerMarketplaceDashboard';
import AdminMarketplaceDashboard from './AdminMarketplaceDashboard';
import { AdminIcon, BuyerIcon, TruckIcon } from '../icons';

interface MarketplaceModuleProps {
  currentUser: User;
}

const MarketplaceModule: React.FC<MarketplaceModuleProps> = ({ currentUser }) => {
  
  const getRoleIcon = (role: Role) => {
    switch (role) {
      case Role.ADMIN: return <AdminIcon className="w-5 h-5 text-[#007A8A]" />;
      case Role.BUYER: return <BuyerIcon className="w-5 h-5 text-[#6B21A8]" />; // Purple for Buyer
      case Role.SELLER: return <TruckIcon className="w-5 h-5 text-[#2E8B57]" />; // Green for Seller
      default: return null;
    }
  }

  const renderDashboard = () => {
    switch (currentUser.role) {
      case Role.BUYER:
        return <BuyerMarketplaceDashboard currentUser={currentUser} />;
      case Role.SELLER:
        return <SellerMarketplaceDashboard currentUser={currentUser} />;
      case Role.ADMIN:
        return <AdminMarketplaceDashboard currentUser={currentUser} />;
      default:
        return <div className="p-4 text-red-600">Rol no reconocido para el Mercado</div>;
    }
  };

  return (
    <div className="animate-fade-in">
        {/* Module Header consistent with Sourcing Module but with the requested Welcome text */}
        <div className="p-6 mb-8 bg-white border border-[#D6D6D6] rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-xl font-bold text-[#0A0A0A]">Bodega Virtual de Reciclados</h2>
                <p className="text-sm text-[#7A7A7A] mt-1">
                    Bienvenido, <span className="font-semibold text-[#007A8A]">{currentUser.name}</span>. Estás en la Bodega Virtual de Reciclados.
                </p>
            </div>
            <div className="flex items-center bg-[#F5F7F8] px-4 py-2 rounded-lg border border-[#D6D6D6]">
                {getRoleIcon(currentUser.role)}
                <p className="text-sm text-[#7A7A7A] ml-2">Vista de <span className="font-semibold text-[#0A0A0A]">{currentUser.role === 'BUYER' ? 'COMPRADOR' : currentUser.role === 'SELLER' ? 'VENDEDOR' : 'ADMIN'}</span></p>
            </div>
        </div>
        {renderDashboard()}
    </div>
  );
};

export default MarketplaceModule;
