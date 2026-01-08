
import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Role, User } from '../types';
import { SpinnerIcon, LeafIcon, ShieldCheckIcon, ChartBarIcon, TruckIcon } from './icons';
import { authAPI } from '../services/api';

interface AuthProps {
  onAuthSuccess: (user: User, isNewRegistration: boolean) => void;
}

// Define distinct options for the UI dropdown
type RegistrationType = 'SELLER' | 'BUYER_TRANSFORMER' | 'BUYER_AGGREGATOR';

const Auth = ({ onAuthSuccess }: AuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Campos de autenticación
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Campos de registro
  const [name, setName] = useState('');
  const [registrationType, setRegistrationType] = useState<RegistrationType>('SELLER');
  // Only applicable if BUYER_TRANSFORMER
  const [certifiesREP, setCertifiesREP] = useState<string>('no'); 

  const [idType, setIdType] = useState('CC');
  const [idNumber, setIdNumber] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [contactPerson1Name, setContactPerson1Name] = useState('');
  const [contactPerson1Position, setContactPerson1Position] = useState('');
  const [contactPerson2Name, setContactPerson2Name] = useState('');
  const [contactPerson2Position, setContactPerson2Position] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');

  const { users, setUsers, colombianDepartments, colombiaDepartmentsAndMunicipalities } = useData();
  
  const municipalities = useMemo(() => {
    if (department && colombiaDepartmentsAndMunicipalities[department]) {
        return colombiaDepartmentsAndMunicipalities[department];
    }
    return [];
  }, [department, colombiaDepartmentsAndMunicipalities]);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDepartment = e.target.value;
    setDepartment(newDepartment);
    setCity(''); // Reset city when department changes
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.login(email, password);
      const user = response.user as User;

      if (user.role === Role.SELLER && !user.isVerified) {
        setError('Tu cuenta de vendedor aún no ha sido verificada por el administrador.');
        setIsLoading(false);
        return;
      }
      // Pass false for isNewRegistration
      onAuthSuccess(user, false);
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas. Por favor, intente de nuevo.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !idNumber || !phone1 || !address || !city || !department || !contactPerson1Name || !contactPerson1Position) {
        setError('Por favor, complete todos los campos obligatorios.');
        return;
    }
    if (users.some(u => u.email === email)) {
      setError('Este correo electrónico ya está registrado.');
      return;
    }

    setIsLoading(true);

    try {
      // Determine Role and Buyer details based on UI selection
      let finalRole = Role.SELLER;
      let buyerType: 'Transformador' | 'Gran Acopiador' | undefined = undefined;
      let finalCertifiesREP: boolean | undefined = undefined;

      if (registrationType === 'BUYER_TRANSFORMER') {
          finalRole = Role.BUYER;
          buyerType = 'Transformador';
          finalCertifiesREP = certifiesREP === 'yes';
      } else if (registrationType === 'BUYER_AGGREGATOR') {
          finalRole = Role.BUYER;
          buyerType = 'Gran Acopiador';
      } else {
          finalRole = Role.SELLER;
      }

      const isSeller = finalRole === Role.SELLER;
      const userData = {
        name,
        email,
        password,
        role: finalRole,
        buyerType,
        certifiesREP: finalCertifiesREP,
        isVerified: !isSeller,
        needsAdminApproval: isSeller,
        idType,
        idNumber,
        phone1,
        phone2,
        contactPerson1Name,
        contactPerson1Position,
        contactPerson2Name,
        contactPerson2Position,
        address,
        city,
        department,
        status: isSeller ? 'PENDING_VERIFICATION' : 'ACTIVE',
      };

      const response = await authAPI.register(userData);
      const newUser = response.user as User;

      setIsLoading(false);
      if (isSeller) {
          alert('¡Registro exitoso! Tu cuenta ha sido enviada al administrador para su validación. Serás notificado una vez que sea aprobada.');
          setIsLogin(true);
          resetFormFields();
      } else {
          // Pass true for isNewRegistration
          onAuthSuccess(newUser, true);
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar. Por favor, intente de nuevo.');
      setIsLoading(false);
    }
  };
  
  const resetFormFields = () => {
    setEmail('');
    setPassword('');
    setName('');
    setRegistrationType('SELLER');
    setCertifiesREP('no');
    setIdType('CC');
    setIdNumber('');
    setPhone1('');
    setPhone2('');
    setContactPerson1Name('');
    setContactPerson1Position('');
    setContactPerson2Name('');
    setContactPerson2Position('');
    setAddress('');
    setCity('');
    setDepartment('');
    setError('');
  }

  const formTitle = isLogin ? "Bienvenido de nuevo" : "Únete a la Red";
  const submitButtonText = isLogin ? "Iniciar Sesión" : "Crear Cuenta Empresarial";
  const switchModeText = isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia Sesión";
  
  const commonInputClass = "mt-1 block w-full px-4 py-3 border border-[#D6D6D6] rounded-lg shadow-sm placeholder-[#7A7A7A] focus:outline-none focus:ring-2 focus:ring-[#007A8A] focus:border-[#007A8A] transition-all sm:text-sm text-[#0A0A0A] bg-white";
  const commonLabelClass = "block text-sm font-medium text-[#3D3D3D] mb-1";

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* LEFT SIDE: Marketing / Value Prop */}
      <div className="hidden lg:flex w-1/2 bg-[#003F4A] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Abstract shapes or pattern */}
        <div className="absolute top-0 right-0 p-10 opacity-5">
             <TruckIcon className="w-96 h-96" />
        </div>

        <div className="relative z-10 mt-10">
            <div className="flex flex-col items-start space-y-4 mb-8">
                <h1 className="text-4xl font-extrabold text-white tracking-tight">Yubarta SupplyX</h1>
            </div>
            
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6 text-[#E3FAF6]">
                Abastecimiento Inteligente<br/>de Materiales Reciclados
            </h2>
            
            <p className="text-lg text-[#D7EEF0] max-w-lg mb-12 leading-relaxed font-light">
                Conectamos compradores y proveedores en una red confiable y transparente. Gestión simplificada, precios claros y abastecimiento estable.
            </p>

            <div className="space-y-8">
                <div className="flex items-start space-x-4">
                    <div className="bg-[#005B6A] p-2 rounded-lg mt-1">
                        <ShieldCheckIcon className="w-6 h-6 text-[#6FD6C2]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Validación de Proveedores</h3>
                        <p className="text-sm text-[#D7EEF0] mt-1">Aseguramos calidad y confiabilidad.</p>
                    </div>
                </div>
                <div className="flex items-start space-x-4">
                    <div className="bg-[#005B6A] p-2 rounded-lg mt-1">
                        <ChartBarIcon className="w-6 h-6 text-[#ADF1E2]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Mercado Transparente</h3>
                        <p className="text-sm text-[#D7EEF0] mt-1">Visibilidad de oferta y precios reales.</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="relative z-10 text-xs text-[#44AEB8] font-mono mt-12">
            © {new Date().getFullYear()} Yubarta SupplyX Platform. Enterprise Edition.
        </div>
      </div>

      {/* RIGHT SIDE: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-lg space-y-8 bg-white p-10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#D6D6D6]">
            <div className="text-center lg:text-left">
                <h2 className="text-3xl font-bold text-[#0A0A0A] tracking-tight">{formTitle}</h2>
                <p className="mt-2 text-sm text-[#7A7A7A]">
                    {isLogin ? 'Accede a tu panel de control empresarial.' : 'Completa el formulario para unirte a la red.'}
                </p>
            </div>

            {isLogin ? (
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="email" className={commonLabelClass}>Correo Corporativo</label>
                        <input id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required className={commonInputClass} placeholder="nombre@empresa.com" />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="password" className={commonLabelClass}>Contraseña</label>
                            <a href="#" className="text-xs font-medium text-[#007A8A] hover:text-[#005B6A]">¿Olvidaste tu contraseña?</a>
                        </div>
                        <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required className={commonInputClass} placeholder="••••••••" />
                    </div>
                    
                    {error && (
                        <div className="bg-[#FCEAEA] border-l-4 border-[#B63A3A] p-4 rounded-r">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-[#B63A3A] font-medium">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#007A8A] hover:bg-[#005B6A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        {isLoading ? <SpinnerIcon className="w-5 h-5"/> : submitButtonText}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleRegister} className="space-y-6">
                    <div className="bg-[#F5F7F8] p-4 rounded-lg border border-[#D6D6D6] mb-6">
                        <label htmlFor="registrationType" className="block text-sm font-bold text-[#3D3D3D] mb-2">Quiero registrarme como:</label>
                        <select id="registrationType" value={registrationType} onChange={e => setRegistrationType(e.target.value as RegistrationType)} className={commonInputClass}>
                            <option value="SELLER">Vendedor (Proveedor de Material)</option>
                            <option value="BUYER_TRANSFORMER">Comprador (Transformador)</option>
                            <option value="BUYER_AGGREGATOR">Comprador (Gran Acopiador)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label htmlFor="name" className={commonLabelClass}>Razón Social / Nombre</label>
                            <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required className={commonInputClass}/>
                        </div>

                        {registrationType === 'BUYER_TRANSFORMER' && (
                             <div className="sm:col-span-2 bg-[#E6F4EC] p-4 rounded-lg border border-[#2E8B57]/20">
                                <label htmlFor="certifiesREP" className="block text-sm font-medium text-[#2E8B57] mb-1">¿Su empresa puede certificar REP?</label>
                                <select id="certifiesREP" value={certifiesREP} onChange={e => setCertifiesREP(e.target.value)} className="block w-full px-3 py-2 border border-[#2E8B57]/30 rounded-md shadow-sm focus:ring-[#2E8B57] focus:border-[#2E8B57] sm:text-sm text-[#0A0A0A] bg-white">
                                    <option value="no">No</option>
                                    <option value="yes">Sí, certificamos REP</option>
                                </select>
                                <p className="text-xs text-[#2E8B57] mt-1">Responsabilidad Extendida del Productor</p>
                            </div>
                        )}

                        <div className="sm:col-span-2">
                            <label htmlFor="email" className={commonLabelClass}>Correo Electrónico</label>
                            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className={commonInputClass}/>
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="password" className={commonLabelClass}>Contraseña</label>
                            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className={commonInputClass}/>
                        </div>

                        {/* Identification */}
                        <div className="sm:col-span-2 pt-4 border-t border-[#D6D6D6]">
                            <h4 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wide mb-4">Datos Legales</h4>
                        </div>
                        <div>
                            <label htmlFor="idType" className={commonLabelClass}>Tipo ID</label>
                            <select id="idType" value={idType} onChange={e => setIdType(e.target.value)} className={commonInputClass}>
                                <option value="NIT">NIT</option>
                                <option value="CC">Cédula</option>
                                <option value="CE">Cédula Ext.</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="idNumber" className={commonLabelClass}>Número ID</label>
                            <input id="idNumber" type="text" value={idNumber} onChange={e => setIdNumber(e.target.value)} required className={commonInputClass}/>
                        </div>
                         <div>
                            <label htmlFor="phone1" className={commonLabelClass}>Teléfono</label>
                            <input id="phone1" type="tel" value={phone1} onChange={e => setPhone1(e.target.value)} required className={commonInputClass}/>
                        </div>
                         <div>
                            <label htmlFor="city" className={commonLabelClass}>Ciudad</label>
                            <select id="city" value={department} onChange={handleDepartmentChange} required className={commonInputClass}>
                                <option value="">Departamento...</option>
                                {colombianDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                            </select>
                        </div>
                        
                        {department && (
                            <div className="sm:col-span-2">
                                <label htmlFor="municipality" className={commonLabelClass}>Municipio</label>
                                <select id="municipality" value={city} onChange={e => setCity(e.target.value)} required className={commonInputClass}>
                                     <option value="">Seleccione municipio...</option>
                                     {municipalities.map(mun => <option key={mun} value={mun}>{mun}</option>)}
                                </select>
                            </div>
                        )}
                        
                        <div className="sm:col-span-2">
                            <label htmlFor="address" className={commonLabelClass}>Dirección</label>
                            <input id="address" type="text" value={address} onChange={e => setAddress(e.target.value)} required className={commonInputClass}/>
                        </div>

                        {/* Contacts */}
                        <div className="sm:col-span-2 pt-4 border-t border-[#D6D6D6]">
                            <h4 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wide mb-4">Contacto Principal</h4>
                        </div>
                        <div>
                            <label htmlFor="contactPerson1Name" className={commonLabelClass}>Nombre</label>
                            <input id="contactPerson1Name" type="text" value={contactPerson1Name} onChange={e => setContactPerson1Name(e.target.value)} required className={commonInputClass}/>
                        </div>
                        <div>
                            <label htmlFor="contactPerson1Position" className={commonLabelClass}>Cargo</label>
                            <input id="contactPerson1Position" type="text" value={contactPerson1Position} onChange={e => setContactPerson1Position(e.target.value)} required className={commonInputClass}/>
                        </div>
                    </div>

                    {error && <p className="text-[#B63A3A] text-sm text-center font-medium bg-[#FCEAEA] p-2 rounded">{error}</p>}

                    <div className="pt-4">
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#007A8A] hover:bg-[#005B6A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007A8A] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                             {isLoading ? <SpinnerIcon className="w-5 h-5"/> : submitButtonText}
                        </button>
                    </div>
                </form>
            )}
            
            <div className="mt-6 text-center">
                <button onClick={() => { setIsLogin(!isLogin); resetFormFields(); }} className="text-sm font-medium text-[#007A8A] hover:text-[#005B6A] hover:underline transition-colors">
                    {switchModeText}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
