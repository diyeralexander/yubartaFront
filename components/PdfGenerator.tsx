
import { Offer, Requirement, User, Role, MarketplaceListing, PurchaseOffer } from '../types';
import { getPublicUserDisplay } from '../utils';

// --- ESTILOS CSS REPLICADOS DE LA UI (TAILWIND SIMULADO) ---
const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    body { font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #0F172A; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #FFFFFF; }
    
    /* Header */
    .header { margin-bottom: 30px; border-bottom: 1px solid #E2E8F0; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .logo { font-size: 24px; font-weight: 800; color: #007A8A; letter-spacing: -0.5px; margin: 0; }
    .doc-type { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; background: #F1F5F9; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 5px; }
    .doc-title { font-size: 20px; font-weight: 900; color: #0F172A; margin: 5px 0 0 0; line-height: 1.2; }
    .meta { font-size: 12px; color: #64748B; margin-top: 5px; }

    /* Layout Utility */
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .col-span-2 { grid-column: span 2; }
    
    /* Summary Cards (The top gray box) */
    .summary-card { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; margin-bottom: 30px; }
    .summary-header { background-color: #F1F5F9; padding: 12px 20px; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 10px; }
    .summary-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin: 0; }
    .summary-body { padding: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
    
    /* Section Styles matching UI Colors */
    .section-container { border-radius: 12px; overflow: hidden; margin-bottom: 25px; break-inside: avoid; }
    
    /* Azul (Técnica) */
    .sec-blue { background-color: #EFF6FF; border: 1px solid #DBEAFE; }
    .sec-blue .sec-header { background-color: #EFF6FF; border-bottom: 1px solid #DBEAFE; color: #1E40AF; }
    .sec-blue .label { color: #60A5FA; }
    
    /* Teal (Logística) */
    .sec-teal { background-color: #F0FDFA; border: 1px solid #CCFBF1; }
    .sec-teal .sec-header { background-color: #F0FDFA; border-bottom: 1px solid #CCFBF1; color: #115E59; }
    .sec-teal .label { color: #14B8A6; }
    
    /* Indigo (Comercial) */
    .sec-indigo { background-color: #EEF2FF; border: 1px solid #E0E7FF; }
    .sec-indigo .sec-header { background-color: #EEF2FF; border-bottom: 1px solid #E0E7FF; color: #3730A3; }
    .sec-indigo .label { color: #818CF8; }

    .sec-header { padding: 10px 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }
    .sec-body { padding: 20px; }

    /* Typography */
    .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }
    .value { font-size: 14px; font-weight: 500; color: #0F172A; }
    .value-large { font-size: 24px; font-weight: 900; color: #0F172A; }
    .unit { font-size: 14px; font-weight: 700; color: #64748B; margin-left: 2px; }
    
    /* Tables */
    .price-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #E0E7FF; margin-top: 10px; }
    .price-table th { background: #EEF2FF; color: #312E81; font-size: 10px; text-transform: uppercase; padding: 8px 12px; text-align: left; font-weight: 700; }
    .price-table td { padding: 8px 12px; font-size: 12px; color: #334155; border-bottom: 1px solid #F1F5F9; }
    .price-table tr:last-child td { border-bottom: none; }
    .price-table tfoot td { background: #EEF2FF; font-weight: 800; color: #312E81; font-size: 14px; }
    .text-right { text-align: right; }

    /* Footer */
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 10px; color: #94A3B8; }
    
    /* Badge mimic */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; border: 1px solid transparent; }
    .badge-gray { background: #F1F5F9; color: #475569; border-color: #E2E8F0; }
    .badge-green { background: #DCFCE7; color: #166534; border-color: #BBF7D0; }
    .badge-yellow { background: #FEF9C3; color: #854D0E; border-color: #FEF08A; }

    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(0,0,0,0.03); font-weight: 900; z-index: -1; pointer-events: none; }
`;

const formatCurrency = (amount: number, currency: string = 'COP') => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
};

const printWindow = (htmlContent: string) => {
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(`<html><head><title>Yubarta SupplyX Document</title><style>${styles}</style></head><body>${htmlContent}</body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
    }
};

// --- HELPER: DOM GENERATORS ---

const renderDetailBlock = (label: string, value: any, colorClass: string = 'text-slate-500') => `
    <div style="margin-bottom: 15px;">
        <span class="label" style="${colorClass ? '' : ''}">${label}</span>
        <div class="value">${value || '<span style="color:#CBD5E1; font-style:italic;">N/A</span>'}</div>
    </div>
`;

const renderPriceTable = (jsonString: string, currency: string, total: number) => {
    let rows = '';
    try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
            rows = parsed.map(p => `
                <tr>
                    <td>${p.name}</td>
                    <td class="text-right">${formatCurrency(Number(p.value), currency)}</td>
                </tr>
            `).join('');
        }
    } catch(e) {
        rows = `<tr><td colspan="2">Precio Base</td></tr>`;
    }

    return `
        <table class="price-table">
            <thead>
                <tr>
                    <th>Concepto</th>
                    <th class="text-right">Valor (COP/kg)</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
                <tr>
                    <td>TOTAL POR KILO</td>
                    <td class="text-right">${formatCurrency(total, currency)}</td>
                </tr>
            </tfoot>
        </table>
    `;
};

// Helper for Complex Counter Proposal JSON
const renderCounterPriceTable = (jsonString: string, currency: string) => {
    try {
        const parsed = JSON.parse(jsonString);
        if (parsed.variables && Array.isArray(parsed.variables)) {
             const rows = parsed.variables.map((v: any) => `
                <tr>
                    <td>${v.name} ${v.isNew ? '<span style="font-size:8px; background:#FFEDD5; color:#C2410C; padding:1px 3px; border-radius:2px;">NUEVO</span>' : ''}</td>
                    <td class="text-right">${formatCurrency(Number(v.value), currency)}</td>
                </tr>
            `).join('');

            return `
                <table class="price-table" style="border:1px solid #FED7AA;">
                    <thead>
                        <tr style="background:#FFF7ED;">
                            <th style="color:#9A3412;">Concepto (Contrapropuesta)</th>
                            <th class="text-right" style="color:#9A3412;">Valor Propuesto</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr style="background:#FFF7ED;">
                            <td style="color:#9A3412;">TOTAL PROPUESTO</td>
                            <td class="text-right" style="color:#9A3412;">${formatCurrency(Number(parsed.total), currency)}</td>
                        </tr>
                    </tfoot>
                </table>
                ${parsed.observation ? `<div style="margin-top:10px; padding:10px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:4px; font-size:10px; color:#475569;"><strong>Observación:</strong> ${parsed.observation}</div>` : ''}
            `;
        }
        return jsonString; // Fallback
    } catch (e) {
        return jsonString;
    }
}

// --- PDF GENERATORS ---

// 1. SOURCING: OFFER PDF (Espejo de OfferDetailView.tsx)
export const downloadSourcingOfferPdf = (offer: Offer, requirement: Requirement, seller: User, buyer: User, currentUser: User) => {
    const sellerDisplay = getPublicUserDisplay(seller, currentUser);
    const buyerDisplay = getPublicUserDisplay(buyer, currentUser);
    
    // Privacy Check: Only Seller (Owner) or Admin can see the penalty agreement
    const showPenalty = currentUser.id === seller.id || currentUser.role === Role.ADMIN;
    
    // Prioritize the fee from the requirement as stored, fallback to 0 if not present
    const penaltyValue = requirement.managementFeePerKg || 0;

    const html = `
        <div class="watermark">YUBARTA</div>
        
        <!-- Header -->
        <div class="header">
            <div>
                <span class="doc-type">Documento Oficial</span>
                <h1 class="doc-title">Oferta de Suministro</h1>
                <div class="meta">ID Oferta: ${offer.id} • Fecha: ${new Date().toLocaleDateString()}</div>
            </div>
            <div style="text-align: right;">
                <div class="logo">Yubarta SupplyX</div>
                <div class="meta">Para Solicitud: ${requirement.title}</div>
            </div>
        </div>

        <!-- Participants -->
        <div class="grid-2">
            <div>
                <span class="label" style="color:#94A3B8;">Vendedor (Oferente)</span>
                <div class="value" style="font-weight:700;">${sellerDisplay.name}</div>
                <div class="meta">${sellerDisplay.subtext}</div>
            </div>
            <div>
                <span class="label" style="color:#94A3B8;">Comprador (Solicitante)</span>
                <div class="value" style="font-weight:700;">${buyerDisplay.name}</div>
                <div class="meta">${buyerDisplay.subtext}</div>
            </div>
        </div>

        <!-- Summary Card (Like UI) -->
        <div class="summary-card">
            <div class="summary-header">
                <span class="summary-title">Plan de Suministro Propuesto</span>
            </div>
            <div class="summary-body">
                <div>
                    <span class="label" style="color:#94A3B8;">Cantidad Total</span>
                    <div class="value-large" style="color:#007A8A;">${offer.cantidadOfertada}<span class="unit">${offer.unidadMedida}</span></div>
                </div>
                <div style="text-align:center; border-left:1px solid #E2E8F0; border-right:1px solid #E2E8F0;">
                    <span class="label" style="color:#94A3B8;">Frecuencia</span>
                    <div class="badge badge-gray" style="font-size:14px; margin-bottom:5px;">${offer.frecuenciaSuministro}</div>
                    <div style="font-size:11px; font-weight:600; color:#64748B;">${offer.fechaInicioVigencia} ➜ ${offer.fechaFinVigencia}</div>
                </div>
                <div style="text-align:right;">
                    <span class="label" style="color:#94A3B8;">Estado</span>
                    <div class="badge ${offer.status === 'Aprobada' ? 'badge-green' : 'badge-yellow'}">${offer.status}</div>
                </div>
            </div>
        </div>

        <div class="grid-2">
            
            <!-- Column 1: Tech & Logistics -->
            <div>
                <!-- Section: Technical (Blue) -->
                <div class="section-container sec-blue">
                    <div class="sec-header">1. Especificaciones del Material</div>
                    <div class="sec-body">
                        ${renderDetailBlock('Calidad del Material', offer.aceptaEspecificacionesCalidad ? 'Acepta especificaciones del cliente' : offer.contrapropuestaCalidad, 'color:#60A5FA;')}
                        ${offer.fotosMaterial ? renderDetailBlock('Evidencia', 'Fotos adjuntas en plataforma', 'color:#60A5FA;') : ''}
                    </div>
                </div>

                <!-- Section: Logistics (Teal) -->
                <div class="section-container sec-teal">
                    <div class="sec-header">2. Logística y Entrega</div>
                    <div class="sec-body">
                        ${renderDetailBlock('Tipo de Vehículo', offer.tipoVehiculo, 'color:#14B8A6;')}
                        ${renderDetailBlock('Condiciones Logísticas', offer.aceptaCondicionesLogisticas ? 'Acepta condiciones' : offer.contrapropuestaLogistica, 'color:#14B8A6;')}
                        ${renderDetailBlock('Lugar de Entrega', offer.aceptaLugarEntrega ? `Acepta entregar en ${requirement.ciudadRecepcion}` : 'Propone otro lugar (ver detalle)', 'color:#14B8A6;')}
                    </div>
                </div>
            </div>

            <!-- Column 2: Commercial -->
            <div>
                <!-- Section: Commercial (Indigo) -->
                <div class="section-container sec-indigo">
                    <div class="sec-header">3. Condiciones Comerciales</div>
                    <div class="sec-body">
                        <div style="margin-bottom: 20px;">
                            <div style="display:flex; justify-content:space-between; align-items:end; margin-bottom:5px;">
                                <span class="label" style="color:#818CF8;">Estructura de Precio</span>
                                <span class="badge badge-gray">Moneda: ${requirement.moneda}</span>
                            </div>
                            ${offer.aceptaFormulaPrecio 
                                ? renderPriceTable(requirement.condicionesPrecio, requirement.moneda, 0) // Approximation if accepted
                                : renderCounterPriceTable(offer.contrapropuestaFormulaPrecio || '', requirement.moneda)
                            }
                        </div>

                        ${renderDetailBlock('Condiciones de Pago', offer.aceptaCondicionesPago ? requirement.tipoPago : offer.contrapropuestaCondicionesPago, 'color:#818CF8;')}
                        ${renderDetailBlock('Método de Pago', offer.aceptaMetodoPago ? requirement.metodoPago : offer.contrapropuestaMetodoPago, 'color:#818CF8;')}
                    </div>
                </div>

                <!-- Penalty (Red) - PRIVACY PROTECTED -->
                ${showPenalty && offer.penaltyFeeAccepted ? `
                <div class="section-container" style="background:#FEF2F2; border:1px solid #FECACA;">
                    <div class="sec-header" style="background:#FEF2F2; color:#991B1B; border-bottom:1px solid #FECACA;">Garantía de Cumplimiento (Privado)</div>
                    <div class="sec-body">
                        <p style="font-size:12px; color:#7F1D1D; margin:0;">
                            El vendedor ha aceptado la penalidad de <strong>${formatCurrency(penaltyValue)} por Kilo</strong> no entregado.<br/>
                            <strong>Estado:</strong> Aceptado y Vinculante.
                        </p>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="footer">
            Este documento digital es un comprobante de la oferta registrada en la plataforma Yubarta SupplyX.
        </div>
    `;
    printWindow(html);
};

// 2. MARKETPLACE: LISTING PDF (Espejo de ListingDetailView.tsx)
export const downloadListingPdf = (listing: MarketplaceListing, seller: User, currentUser: User) => {
    const sellerDisplay = getPublicUserDisplay(seller, currentUser);
    
    // Privacy Check: Only Seller (Owner) or Admin can see the management fee
    const showFee = currentUser.id === seller.id || currentUser.role === Role.ADMIN;

    const html = `
        <div class="watermark">BODEGA</div>
        
        <div class="header">
            <div>
                <span class="doc-type">Bodega Virtual</span>
                <h1 class="doc-title">Oferta de Venta (Spot)</h1>
                <div class="meta">ID Publicación: ${listing.id} • Fecha: ${new Date().toLocaleDateString()}</div>
            </div>
            <div style="text-align: right;">
                <div class="logo">Yubarta SupplyX</div>
                <div class="meta">${listing.locationCity}, ${listing.locationDepartment}</div>
            </div>
        </div>

        <div style="margin-bottom:30px;">
            <span class="label">Título de la Publicación</span>
            <div style="font-size:24px; font-weight:800; color:#0F172A;">${listing.title}</div>
            <div style="font-size:14px; color:#475569;">Vendedor: <strong>${sellerDisplay.name}</strong></div>
        </div>

        <!-- Summary Card (Resumen de Disponibilidad) -->
        <div class="summary-card">
            <div class="summary-header">
                <span class="summary-title">Resumen de Oferta</span>
            </div>
            <div class="summary-body">
                <div>
                    <span class="label" style="color:#94A3B8;">Cantidad Disponible</span>
                    <div class="value-large" style="color:#0F172A;">${listing.quantity}<span class="unit">${listing.unit}</span></div>
                    <div class="meta">${listing.frequency}</div>
                </div>
                <div style="text-align:center; border-left:1px solid #E2E8F0; border-right:1px solid #E2E8F0;">
                    <span class="label" style="color:#94A3B8;">Vigencia</span>
                    <div style="font-size:12px; font-weight:600; color:#475569; margin-top:5px; background:white; padding:5px; border-radius:6px; border:1px solid #E2E8F0; display:inline-block;">
                        ${listing.validFrom}<br/>▼<br/>${listing.validUntil}
                    </div>
                </div>
                <div style="text-align:right;">
                    <span class="label" style="color:#94A3B8;">Precio Total por Unidad</span>
                    <div class="value-large" style="color:#3730A3;">${formatCurrency(listing.pricePerUnit, listing.currency)}</div>
                    <div class="badge badge-gray">${listing.currency}</div>
                </div>
            </div>
        </div>

        <div class="grid-3">
            
            <!-- Column 1 & 2: Tech & Logistics (Span 2) -->
            <div class="col-span-2">
                <!-- Tech (Blue) -->
                <div class="section-container sec-blue">
                    <div class="sec-header">1. Ficha Técnica</div>
                    <div class="sec-body">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                            ${renderDetailBlock('Categoría', listing.category, 'color:#60A5FA;')}
                            ${renderDetailBlock('Subcategoría', listing.subcategory, 'color:#60A5FA;')}
                            ${renderDetailBlock('Presentación', listing.presentation, 'color:#60A5FA;')}
                        </div>
                        <div style="background:white; padding:15px; border-radius:8px; border:1px solid #DBEAFE;">
                            <span class="label" style="color:#60A5FA;">Descripción</span>
                            <p style="font-size:12px; margin:0; color:#334155;">${listing.description}</p>
                        </div>
                        <div style="margin-top:15px;">
                            ${renderDetailBlock('Detalles Calidad', listing.qualityDescription || 'Ver adjuntos', 'color:#60A5FA;')}
                        </div>
                    </div>
                </div>

                <!-- Logistics (Teal) -->
                <div class="section-container sec-teal">
                    <div class="sec-header">2. Ubicación y Logística</div>
                    <div class="sec-body">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                            ${renderDetailBlock('Departamento', listing.locationDepartment, 'color:#14B8A6;')}
                            ${renderDetailBlock('Ciudad', listing.locationCity, 'color:#14B8A6;')}
                        </div>
                        ${renderDetailBlock('Condiciones Carga', listing.logisticsDescription, 'color:#14B8A6;')}
                    </div>
                </div>
            </div>

            <!-- Column 3: Commercial -->
            <div>
                <!-- Commercial (Indigo) -->
                <div class="section-container sec-indigo">
                    <div class="sec-header">3. Desglose Precio</div>
                    <div class="sec-body">
                        ${renderPriceTable(listing.priceStructure, listing.currency, listing.pricePerUnit)}
                        
                        <div style="margin-top:15px; background:#EEF2FF; padding:10px; border-radius:6px; border:1px solid #C7D2FE; font-size:10px; color:#4338CA;">
                            <strong>Nota:</strong> El comprador puede proponer un método de pago diferente en su oferta.
                        </div>
                    </div>
                </div>

                <!-- Management Fee (Privado) - PRIVACY PROTECTED -->
                ${showFee && listing.managementFeePerKg ? `
                <div class="section-container" style="background:#F0FDF4; border:1px solid #BBF7D0;">
                    <div class="sec-header" style="background:#F0FDF4; color:#15803D; border-bottom:1px solid #BBF7D0;">Gestión Yubarta (Privado)</div>
                    <div class="sec-body">
                        <p style="font-size:12px; color:#14532D; margin:0;">
                            Fee por Kg: <strong>${formatCurrency(listing.managementFeePerKg)}</strong><br/>
                            <span style="font-size:10px;">(Solo visible para vendedor/admin)</span>
                        </p>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="footer">
            Este documento detalla una oferta de venta en la bodega virtual de Yubarta SupplyX.
        </div>
    `;
    printWindow(html);
};

// 3. MARKETPLACE: PURCHASE OFFER PDF
export const downloadPurchaseOfferPdf = (offer: PurchaseOffer, listing: MarketplaceListing, buyer: User, seller: User, currentUser: User) => {
    const buyerDisplay = getPublicUserDisplay(buyer, currentUser);
    const sellerDisplay = getPublicUserDisplay(seller, currentUser);
    
    // Privacy Check: Only Buyer (Owner) or Admin can see the penalty agreement they accepted
    // NOTE: This ensures the buyer sees their OWN signed penalty in the PDF.
    const showPenalty = currentUser.id === buyer.id || currentUser.role === Role.ADMIN;

    const html = `
        <div class="watermark">OFERTA</div>
        
        <div class="header">
            <div>
                <span class="doc-type">Bodega Virtual</span>
                <h1 class="doc-title">Oferta de Compra</h1>
                <div class="meta">ID Oferta: ${offer.id} • Fecha: ${new Date().toLocaleDateString()}</div>
            </div>
            <div style="text-align: right;">
                <div class="logo">Yubarta SupplyX</div>
                <div class="meta">Sobre Publicación: ${listing.title}</div>
            </div>
        </div>

        <!-- Participants -->
        <div class="grid-2">
            <div>
                <span class="label" style="color:#94A3B8;">Comprador (Oferente)</span>
                <div class="value" style="font-weight:700;">${buyerDisplay.name}</div>
            </div>
            <div>
                <span class="label" style="color:#94A3B8;">Vendedor (Destinatario)</span>
                <div class="value" style="font-weight:700;">${sellerDisplay.name}</div>
            </div>
        </div>

        <!-- Summary Card -->
        <div class="summary-card">
            <div class="summary-header">
                <span class="summary-title">Resumen de la Transacción Propuesta</span>
            </div>
            <div class="summary-body">
                <div>
                    <span class="label" style="color:#94A3B8;">Cantidad Solicitada</span>
                    <div class="value-large" style="color:#0F172A;">${offer.quantityRequested}<span class="unit">${listing.unit}</span></div>
                </div>
                <div style="text-align:center; border-left:1px solid #E2E8F0; border-right:1px solid #E2E8F0;">
                    <span class="label" style="color:#94A3B8;">Fecha Recogida</span>
                    <div class="value" style="font-weight:700; margin-top:5px;">${offer.fechaRecogida}</div>
                </div>
                <div style="text-align:right;">
                    <span class="label" style="color:#94A3B8;">Valor Total Ofertado</span>
                    <div class="value-large" style="color:#007A8A;">${formatCurrency(offer.totalPriceOffered)}</div>
                </div>
            </div>
        </div>

        <div class="grid-2">
            <!-- Col 1 -->
            <div class="section-container sec-teal">
                <div class="sec-header">Logística Propuesta</div>
                <div class="sec-body">
                    ${renderDetailBlock('Vehículo', offer.tipoVehiculo, 'color:#14B8A6;')}
                    ${renderDetailBlock('Ubicación', offer.aceptaUbicacion ? 'Recoge en punto del vendedor' : `Propuesta: ${offer.contrapropuestaLogistica}`, 'color:#14B8A6;')}
                </div>
            </div>

            <!-- Col 2 -->
            <div class="section-container sec-indigo">
                <div class="sec-header">Condiciones Comerciales</div>
                <div class="sec-body">
                    ${renderDetailBlock('Método de Pago', offer.metodoPagoPropuesto, 'color:#818CF8;')}
                    ${renderDetailBlock('Plazo de Pago', offer.condicionesPagoPropuestas, 'color:#818CF8;')}
                    
                    <div style="margin-top:15px; border-top:1px solid #E0E7FF; padding-top:10px;">
                        <span class="label" style="color:#818CF8;">Detalle Precio</span>
                        ${offer.aceptaPrecio 
                            ? `<p style="font-size:12px; color:#475569;">Acepta precio de lista: ${formatCurrency(listing.pricePerUnit)} / unidad</p>`
                            : `<div style="font-size:12px; color:#475569;">
                                <strong>Contrapropuesta:</strong><br/>
                                <p style="margin-top:4px;">${offer.priceExplanation || 'Sin explicación detallada.'}</p>
                                ${offer.offerPriceStructure ? '<p style="font-size:10px; color:#64748B; margin-top:4px;">(Ver desglose en sistema)</p>' : ''}
                               </div>`
                        }
                    </div>
                </div>
            </div>
        </div>

        ${showPenalty && offer.penaltyFeeAccepted ? `
        <div class="section-container" style="background:#FEF2F2; border:1px solid #FECACA;">
            <div class="sec-header" style="background:#FEF2F2; color:#991B1B; border-bottom:1px solid #FECACA;">Garantía de Cumplimiento (Privado)</div>
            <div class="sec-body">
                <p style="font-size:12px; color:#7F1D1D; margin:0;">
                    El comprador ha aceptado la penalidad por incumplimiento en el retiro del material.<br/>
                    <strong>Estado:</strong> Aceptado y Vinculante.
                </p>
            </div>
        </div>
        ` : ''}

        <div class="footer">
            Oferta de compra generada en Yubarta SupplyX.
        </div>
    `;
    printWindow(html);
};

// 4. SOURCING: REQUIREMENT PDF (Espejo de RequirementDetailView.tsx)
export const downloadRequirementPdf = (requirement: Requirement, buyer: User, currentUser: User) => {
    const buyerDisplay = getPublicUserDisplay(buyer, currentUser);
    
    // Privacy Check: Only Buyer (Owner) or Admin can see the management fee
    // Ensuring the Buyer can see their own fee as requested.
    const showFee = currentUser.id === buyer.id || currentUser.role === Role.ADMIN;

    const html = `
        <div class="watermark">SOLICITUD</div>
        
        <div class="header">
            <div>
                <span class="doc-type">Suministro Planificado</span>
                <h1 class="doc-title">Solicitud de Material</h1>
                <div class="meta">ID Solicitud: ${requirement.id} • Fecha: ${new Date().toLocaleDateString()}</div>
            </div>
            <div style="text-align: right;">
                <div class="logo">Yubarta SupplyX</div>
                <div class="meta">${requirement.ciudadRecepcion}, ${requirement.departamentoRecepcion}</div>
            </div>
        </div>

        <div style="margin-bottom:30px;">
            <span class="label">Comprador Solicitante</span>
            <div style="font-size:18px; font-weight:700; color:#0F172A;">${buyerDisplay.name}</div>
        </div>

        <!-- Summary Card -->
        <div class="summary-card">
            <div class="summary-header">
                <span class="summary-title">Plan de Ejecución</span>
            </div>
            <div class="summary-body">
                <div>
                    <span class="label" style="color:#94A3B8;">Volumen Total</span>
                    <div class="value-large" style="color:#0F172A;">${requirement.totalVolume}<span class="unit">${requirement.unidad}</span></div>
                </div>
                <div style="text-align:center; border-left:1px solid #E2E8F0; border-right:1px solid #E2E8F0;">
                    <span class="label" style="color:#94A3B8;">Periodicidad</span>
                    <div class="badge badge-gray" style="font-size:14px; margin-bottom:5px;">${requirement.frecuencia}</div>
                    <div style="font-size:11px; font-weight:600; color:#64748B;">${requirement.vigenciaInicio} ➜ ${requirement.vigenciaFin}</div>
                </div>
                <div style="text-align:right;">
                    <span class="label" style="color:#94A3B8;">Estado</span>
                    <div class="badge badge-green">${requirement.status}</div>
                </div>
            </div>
        </div>

        <div class="grid-2">
            <!-- Tech & Logistics -->
            <div>
                <div class="section-container sec-blue">
                    <div class="sec-header">1. Especificaciones Técnicas</div>
                    <div class="sec-body">
                        ${renderDetailBlock('Categoría', requirement.categoriaMaterial, 'color:#60A5FA;')}
                        ${renderDetailBlock('Presentación', requirement.presentacionMaterial, 'color:#60A5FA;')}
                        ${renderDetailBlock('Detalle Calidad', requirement.especificacionesCalidad, 'color:#60A5FA;')}
                    </div>
                </div>

                <div class="section-container sec-teal">
                    <div class="sec-header">2. Logística y Ubicación</div>
                    <div class="sec-body">
                        ${renderDetailBlock('Ubicación', `${requirement.ciudadRecepcion}, ${requirement.departamentoRecepcion}`, 'color:#14B8A6;')}
                        ${renderDetailBlock('Condiciones Recepción', requirement.especificacionesLogisticas, 'color:#14B8A6;')}
                        ${requirement.terminosCalculoFletes ? renderDetailBlock('Términos Fletes', requirement.terminosCalculoFletes, 'color:#14B8A6;') : ''}
                    </div>
                </div>
            </div>

            <!-- Commercial -->
            <div>
                <div class="section-container sec-indigo">
                    <div class="sec-header">3. Condiciones Comerciales</div>
                    <div class="sec-body">
                        <div style="margin-bottom: 20px;">
                            <span class="label" style="color:#818CF8;">Estructura de Precio</span>
                            ${renderPriceTable(requirement.condicionesPrecio, requirement.moneda, 0)}
                        </div>
                        ${renderDetailBlock('Tipo de Pago', requirement.tipoPago, 'color:#818CF8;')}
                        ${renderDetailBlock('Método', requirement.metodoPago, 'color:#818CF8;')}
                        ${renderDetailBlock('Anticipo', `${requirement.porcentajeAnticipo}%`, 'color:#818CF8;')}
                    </div>
                </div>
                
                <!-- Management Fee (Privado) - PRIVACY PROTECTED -->
                ${showFee && requirement.managementFeePerKg ? `
                <div class="section-container" style="background:#F0FDF4; border:1px solid #BBF7D0;">
                    <div class="sec-header" style="background:#F0FDF4; color:#15803D; border-bottom:1px solid #BBF7D0;">Gestión Yubarta (Privado)</div>
                    <div class="sec-body">
                        <p style="font-size:12px; color:#14532D; margin:0;">
                            Fee por Kg: <strong>${formatCurrency(requirement.managementFeePerKg)}</strong><br/>
                            <span style="font-size:10px;">(Información confidencial del creador)</span>
                        </p>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="footer">
            Documento de solicitud de suministro planificado.
        </div>
    `;
    printWindow(html);
};

// Compatibilidad (Legacy)
export const generateOfferPdf = downloadSourcingOfferPdf;
export const generateRequirementSummaryPdf = (req: Requirement, offers: Offer[], users: User[]) => { printWindow('<h1>Resumen no implementado en visualizador 100%</h1>'); };
