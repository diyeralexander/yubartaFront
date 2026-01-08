
import React, { useState, useEffect } from 'react';
import { DataProvider, useNotificationStats } from './hooks/useData';
import { User, Role } from './types';
import Auth from './components/Auth';
import SourcingModule from './components/sourcing/SourcingModule';
import MarketplaceModule from './components/marketplace/MarketplaceModule';
import AdminDashboard from './components/sourcing/AdminDashboard'; // Import directly
import Onboarding from './components/Onboarding';
import ModuleHelpModal from './components/ModuleHelpModal';
import { LogoutIcon, TruckIcon, ArchiveBoxIcon, CheckCircleIcon, UserCircleIcon, ArrowLeftIcon } from './components/icons';
import ProfileEditor from './components/ProfileEditor';

const App = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

const AppContent = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Updated state type to include ADMIN_DASHBOARD
  const [activeModule, setActiveModule] = useState<'SELECTION' | 'SOURCING' | 'MARKETPLACE' | 'ADMIN_DASHBOARD'>('SELECTION');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // New State for Contextual Help
  const [helpModule, setHelpModule] = useState<'SOURCING' | 'MARKETPLACE' | null>(null);

  // Notifications Hook
  const stats = useNotificationStats(currentUser);

  // Authentication Handler
  const handleAuthSuccess = (user: User, isNewRegistration: boolean) => {
      setCurrentUser(user);
      
      if (user.role === Role.ADMIN) {
          setActiveModule('ADMIN_DASHBOARD');
      } else {
          setActiveModule('SELECTION');
          // Logic: Only show onboarding if it's a fresh registration
          if (isNewRegistration) {
              setShowOnboarding(true);
              localStorage.setItem('yubarta_onboarding_seen', 'true');
          }
      }
  };

  const handleOnboardingComplete = () => {
      setShowOnboarding(false);
  };

  if (!currentUser) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Traducción de Roles para la UI
  const getRoleLabel = (role: Role) => {
      switch (role) {
          case Role.BUYER: return 'COMPRADOR';
          case Role.SELLER: return 'VENDEDOR';
          case Role.ADMIN: return 'ADMINISTRADOR';
          default: return role;
      }
  };

  // Enterprise Dashboard Selection Screen
  const renderSelectionScreen = () => (
      <div className="flex flex-col items-center justify-center min-h-[82vh] animate-fade-in px-4">
          <div className="w-full max-w-5xl">
              {/* Header Section */}
              <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6 text-center md:text-left">
                  <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-[#003F4A] tracking-tight mb-2">
                          Hola, {currentUser.name.split(' ')[0]}
                      </h1>
                      <p className="text-lg text-[#7A7A7A] font-medium">
                          Selecciona tu espacio de trabajo para comenzar.
                      </p>
                  </div>
              </div>

              {/* Modules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Module 1: Demanda y Suministro Planificado */}
                  <div 
                      onClick={() => setActiveModule('SOURCING')}
                      className="group bg-white p-10 rounded-3xl border border-[#D6D6D6] shadow-[0_4px_6px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,63,74,0.08)] hover:border-[#007A8A] transition-all duration-300 flex flex-col relative overflow-hidden cursor-pointer"
                  >
                      {/* Notification Badge */}
                      {stats.sourcing > 0 && (
                          <div className="absolute top-6 left-6 z-20 animate-bounce">
                              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md border-2 border-white">
                                  {stats.sourcing} {stats.sourcing === 1 ? 'Acción pendiente' : 'Acciones pendientes'}
                              </span>
                          </div>
                      )}

                      {/* Abstract Background Decoration */}
                      <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none transform group-hover:scale-110 duration-500">
                          <TruckIcon className="w-64 h-64 text-[#003F4A]" />
                      </div>
                      
                      <div className="relative z-10 flex flex-col h-full pointer-events-none">
                          <div className="w-16 h-16 bg-[#D7EEF0] rounded-2xl flex items-center justify-center text-[#005B6A] mb-8 group-hover:scale-110 group-hover:bg-[#007A8A] group-hover:text-white transition-all duration-300 shadow-sm pointer-events-auto">
                              <TruckIcon className="w-8 h-8" />
                          </div>
                          
                          <h2 className="text-2xl font-bold text-[#0A0A0A] mb-3 group-hover:text-[#007A8A] transition-colors leading-tight pointer-events-auto">
                              Demanda y Suministro Planificado de Reciclados
                          </h2>
                          
                          <p className="text-[#7A7A7A] leading-relaxed mb-4 text-sm font-medium pointer-events-auto">
                              Gestiona solicitudes y ofertas planificadas para acuerdos de suministro estables y confiables.
                          </p>

                          <button 
                              onClick={(e) => { e.stopPropagation(); setHelpModule('SOURCING'); }}
                              className="text-xs font-bold text-[#007A8A] hover:underline mb-8 flex items-center pointer-events-auto w-fit z-20 relative"
                          >
                              ¿Cómo funciona este módulo?
                          </button>
                          
                          <div className="mt-auto pt-6 border-t border-[#F5F7F8] group-hover:border-[#E3FAF6] transition-colors pointer-events-auto">
                              <div 
                                className="flex items-center text-sm font-bold text-[#007A8A] group-hover:text-[#005B6A] transition-colors w-full text-left"
                              >
                                  <span>Ingresar al módulo</span>
                                  <div className="ml-2 w-6 h-6 rounded-full bg-[#E3FAF6] flex items-center justify-center group-hover:bg-[#007A8A] group-hover:text-white transition-all">
                                      <svg className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                      </svg>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Module 2: Bodega Virtual */}
                  <div 
                      onClick={() => setActiveModule('MARKETPLACE')}
                      className="group bg-white p-10 rounded-3xl border border-[#D6D6D6] shadow-[0_4px_6px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,63,74,0.08)] hover:border-[#007A8A] transition-all duration-300 flex flex-col relative overflow-hidden cursor-pointer"
                  >
                      {/* Notification Badge */}
                      {stats.marketplace > 0 && (
                          <div className="absolute top-6 left-6 z-20 animate-bounce">
                              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md border-2 border-white">
                                  {stats.marketplace} {stats.marketplace === 1 ? 'Acción pendiente' : 'Acciones pendientes'}
                              </span>
                          </div>
                      )}

                      <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none transform group-hover:scale-110 duration-500">
                          <ArchiveBoxIcon className="w-64 h-64 text-[#003F4A]" />
                      </div>

                      <div className="relative z-10 flex flex-col h-full pointer-events-none">
                          <div className="w-16 h-16 bg-[#E3FAF6] rounded-2xl flex items-center justify-center text-[#007A8A] mb-8 group-hover:scale-110 group-hover:bg-[#007A8A] group-hover:text-white transition-all duration-300 shadow-sm pointer-events-auto">
                              <ArchiveBoxIcon className="w-8 h-8" />
                          </div>
                          
                          <h2 className="text-2xl font-bold text-[#0A0A0A] mb-3 group-hover:text-[#007A8A] transition-colors leading-tight pointer-events-auto">
                              Bodega Virtual de Reciclados
                          </h2>
                          
                          <p className="text-[#7A7A7A] leading-relaxed mb-4 text-sm font-medium pointer-events-auto">
                              Accede a materiales disponibles para entrega inmediata y cierra operaciones rápidas.
                          </p>

                          <button 
                              onClick={(e) => { e.stopPropagation(); setHelpModule('MARKETPLACE'); }}
                              className="text-xs font-bold text-[#007A8A] hover:underline mb-8 flex items-center pointer-events-auto w-fit z-20 relative"
                          >
                              ¿Cómo funciona este módulo?
                          </button>
                          
                          <div className="mt-auto pt-6 border-t border-[#F5F7F8] group-hover:border-[#E3FAF6] transition-colors pointer-events-auto">
                              <div 
                                className="flex items-center text-sm font-bold text-[#007A8A] group-hover:text-[#005B6A] transition-colors w-full text-left"
                              >
                                  <span>Ingresar a la bodega</span>
                                  <div className="ml-2 w-6 h-6 rounded-full bg-[#E3FAF6] flex items-center justify-center group-hover:bg-[#007A8A] group-hover:text-white transition-all">
                                      <svg className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                      </svg>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-[#0A0A0A] font-sans selection:bg-[#D7EEF0] selection:text-[#005B6A]">
      
      {/* Enterprise Unified Header */}
      <header className="bg-white border-b border-[#D6D6D6] sticky top-0 z-[110] h-16 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
            <div className="flex justify-between items-center h-full relative">
                
                {/* Left: Back Button */}
                <div className="flex-1 flex justify-start">
                    {activeModule !== 'SELECTION' && activeModule !== 'ADMIN_DASHBOARD' && (
                        <button 
                            onClick={() => setActiveModule('SELECTION')}
                            className="group flex items-center gap-2 pl-2 pr-4 py-2 rounded-lg hover:bg-[#F5F7F8] text-[#7A7A7A] hover:text-[#0A0A0A] transition-all"
                            title="Volver al inicio"
                        >
                            <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="font-semibold text-sm">Volver</span>
                        </button>
                    )}
                </div>

                {/* Center: Brand */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
                    <span className="text-xl font-bold text-[#003F4A] tracking-tight">Yubarta SupplyX</span>
                </div>

                {/* Right: User & Actions */}
                <div className="flex-1 flex justify-end items-center gap-6">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-semibold text-[#0A0A0A] truncate max-w-[150px]">{currentUser.name}</p>
                        <div className="flex items-center justify-end text-[10px] text-[#7A7A7A] font-bold tracking-wider mt-0.5">
                            <span className="uppercase">{getRoleLabel(currentUser.role)}</span>
                            {currentUser.isVerified && <CheckCircleIcon className="w-3 h-3 ml-1 text-[#2E8B57]" title="Verificado" />}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsProfileModalOpen(true)}
                            className="p-2.5 rounded-full text-[#7A7A7A] hover:bg-[#F5F7F8] hover:text-[#007A8A] transition-colors relative"
                            title="Ver Perfil Completo"
                        >
                            <UserCircleIcon className="w-6 h-6" />
                            {/* Profile Alert Badge */}
                            {(currentUser.role === Role.ADMIN && stats.total > 0) && (
                                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                        </button>
                        
                        <div className="h-6 w-px bg-[#D6D6D6] mx-1"></div>
                        
                        <button
                            onClick={() => setCurrentUser(null)}
                            className="p-2.5 rounded-full text-[#7A7A7A] hover:bg-[#FCEAEA] hover:text-[#B63A3A] transition-colors"
                            title="Cerrar Sesión"
                        >
                            <LogoutIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {activeModule === 'SELECTION' && renderSelectionScreen()}
          
          <div className={activeModule === 'SELECTION' ? 'hidden' : 'block animate-fade-in'}>
              {activeModule === 'SOURCING' ? (
                  <SourcingModule currentUser={currentUser} />
              ) : activeModule === 'MARKETPLACE' ? (
                  <MarketplaceModule currentUser={currentUser} />
              ) : activeModule === 'ADMIN_DASHBOARD' ? (
                  <AdminDashboard currentUser={currentUser} />
              ) : null}
          </div>
      </main>

      {/* Global Profile Modal */}
      {isProfileModalOpen && (
          <div className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[#D6D6D6] flex flex-col relative">
                  <div className="p-6 border-b border-[#F5F7F8] flex justify-between items-center bg-[#FAFBFC] sticky top-0 z-10 rounded-t-2xl">
                      <div className="flex items-center gap-3">
                          <div className="bg-[#D7EEF0] p-2 rounded-lg text-[#005B6A]">
                              <UserCircleIcon className="w-6 h-6" />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-[#0A0A0A]">Perfil de Usuario</h2>
                              <p className="text-xs text-[#7A7A7A]">Detalles de la cuenta y configuración</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setIsProfileModalOpen(false)}
                          className="p-2 rounded-full hover:bg-[#F5F7F8] text-[#7A7A7A] transition-colors"
                      >
                          <span className="text-2xl leading-none">&times;</span>
                      </button>
                  </div>
                  <div className="p-8">
                      <ProfileEditor currentUser={currentUser} onClose={() => setIsProfileModalOpen(false)} />
                  </div>
                  <div className="p-6 border-t border-[#F5F7F8] bg-[#FAFBFC] rounded-b-2xl flex justify-end">
                      <button 
                          onClick={() => setIsProfileModalOpen(false)}
                          className="px-6 py-2.5 bg-white border border-[#D6D6D6] text-[#3D3D3D] font-medium rounded-lg hover:bg-[#F5F7F8] transition-all shadow-sm"
                      >
                          Cerrar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Post-Registration Onboarding Overlay */}
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

      {/* Contextual Help Modal */}
      {helpModule && (
          <ModuleHelpModal 
              module={helpModule} 
              onClose={() => setHelpModule(null)} 
          />
      )}
    </div>
  );
};

export default App;
