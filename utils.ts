
import { User, Role } from './types';

// --- FORMATTERS ---

export const formatCurrency = (amount: number, currency: string = 'COP') => {
    return new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency, 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
    }).format(amount);
};

// --- PRIVACY & ANONYMITY HELPER ---

/**
 * Retorna la información visualizable de un usuario objetivo basado en quién lo está viendo.
 * Regla Estricta: 
 * 1. Admin ve todo.
 * 2. Usuario se ve a sí mismo.
 * 3. Compradores y Vendedores NO ven identidad ni contacto de la contraparte, solo Ciudad/Depto.
 */
export const getPublicUserDisplay = (targetUser: User | undefined, viewer: User) => {
    if (!targetUser) return { name: 'Usuario Desconocido', subtext: '', contactHidden: true };

    const isAdmin = viewer.role === Role.ADMIN;
    const isSelf = viewer.id === targetUser.id;

    if (isAdmin || isSelf) {
        return {
            name: targetUser.name,
            subtext: `${targetUser.city || ''} ${targetUser.isVerified ? '• Verificado' : ''}`,
            contactHidden: false,
            fullUser: targetUser
        };
    }

    // ANONYMIZED VIEW
    const roleLabel = targetUser.role === Role.BUYER ? 'Comprador' : 'Proveedor';
    // Solo mostramos Municipio/Ciudad si existe
    const location = targetUser.city ? `(${targetUser.city})` : '';
    
    return {
        name: `${roleLabel} ${location}`,
        subtext: 'Identidad protegida por la plataforma',
        contactHidden: true,
        fullUser: undefined // Prevent accidental leak of full object in some contexts
    };
};

// --- DATE HELPERS (UTC) ---

export const parseDate = (dateString: string): Date => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};
  
export const addDays = (date: Date, days: number): Date => {
    const newDate = new Date(date.valueOf());
    newDate.setUTCDate(newDate.getUTCDate() + days);
    return newDate;
};

// --- BUSINESS LOGIC (FORMULAS) ---

/**
 * Calcula la tarifa de gestión de Yubarta basada en el volumen (Kilogramos).
 * Lógica ajustada estrictamente a la tabla de precios escalonada de Yubarta.
 */
export const getManagementFeePerKg = (kg: number): number => {
    const tons = kg / 1000;

    // --- TRAMO 1: Rangos Fijos (< 6,000 Toneladas) ---
    if (tons < 0.5) return 250.0;
    if (tons < 1.0) return 200.0;
    if (tons < 3.0) return 180.0;
    if (tons < 5.0) return 160.0;
    if (tons < 10.0) return 140.0;
    if (tons < 25.0) return 120.0;
    if (tons < 50.0) return 100.0;
    if (tons < 100.0) return 80.0;
    if (tons < 250.0) return 70.0;
    if (tons < 500.0) return 60.0;
    if (tons < 1000.0) return 50.0;
    if (tons < 2000.0) return 45.0;
    if (tons < 3000.0) return 40.0;
    if (tons < 4000.0) return 35.0;
    if (tons < 5000.0) return 30.0;
    if (tons < 6000.0) return 25.0;

    // --- TRAMO 2: Decrecimiento Lineal A (6,000 a < 63,000 Toneladas) ---
    // Inicia en 23.8 y baja 0.2 por cada 1,000 toneladas adicionales.
    if (tons < 63000) {
        const baseTons = 6000;
        const basePrice = 23.8;
        const dropPerStep = 0.2;
        
        // Calcula cuántos pasos completos de 1,000 tons hay desde la base
        const steps = Math.floor(tons - baseTons) / 1000; // Math.floor se aplica implícitamente por lógica de tabla al usar rangos enteros de mil
        const integerSteps = Math.floor(steps);
        
        const calculated = basePrice - (integerSteps * dropPerStep);
        return parseFloat(calculated.toFixed(2));
    }

    // --- TRAMO 3: Decrecimiento Lineal B (>= 63,000 Toneladas) ---
    // Inicia en 12.5 y baja 0.1 por cada 1,000 toneladas adicionales.
    const baseTons = 63000;
    const basePrice = 12.5;
    const dropPerStep = 0.1;

    const steps = Math.floor(tons - baseTons) / 1000;
    const integerSteps = Math.floor(steps);

    const calculated = basePrice - (integerSteps * dropPerStep);
    
    // Aseguramos un piso lógico para volúmenes astronómicos no contemplados en tabla
    return Math.max(parseFloat(calculated.toFixed(2)), 1.0);
};

/**
 * Calcula la penalidad por incumplimiento.
 * Usado en OfferForm y PDFs.
 */
export const getPenaltyFeePerKg = (kg: number): number => {
    // La lógica actual es idéntica a la tarifa de gestión.
    return getManagementFeePerKg(kg);
};

/**
 * Calcula periodos estimados de entrega.
 */
export const calculateDeliveryPeriods = (startStr: string, endStr: string, frequency: string): number => {
    if (!startStr || !endStr || frequency === 'Única Vez') return 1;

    try {
        const start = parseDate(startStr);
        const end = parseDate(endStr);
        
        if (start >= end) return 0;

        let periods = 0;
        let cursorDate = start;

        while (cursorDate <= end) {
            periods++;
            switch (frequency) {
                case 'Diario': cursorDate = addDays(cursorDate, 1); break;
                case 'Semanal': cursorDate = addDays(cursorDate, 7); break;
                case 'Quincenal': cursorDate = addDays(cursorDate, 14); break;
                case 'Mensual': 
                    // Reset to 1st of next month
                    const y = cursorDate.getUTCFullYear();
                    const m = cursorDate.getUTCMonth();
                    cursorDate = new Date(Date.UTC(y, m + 1, 1));
                    break;
                case 'Trimestral': 
                    const yT = cursorDate.getUTCFullYear();
                    const mT = cursorDate.getUTCMonth();
                    cursorDate = new Date(Date.UTC(yT, mT + 3, 1));
                    break;
                case 'Anual':
                    const yA = cursorDate.getUTCFullYear();
                    cursorDate = new Date(Date.UTC(yA + 1, 0, 1));
                    break;
                default: cursorDate = addDays(cursorDate, 365); break;
            }
        }
        return Math.max(1, periods);
    } catch (e) {
        return 1;
    }
};
