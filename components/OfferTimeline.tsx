
import React, { useMemo } from 'react';
import { Requirement, Offer, User } from '../types';
import { useData } from '../hooks/useData';
import { getPublicUserDisplay } from '../utils';

interface OfferTimelineProps {
  requirement: Requirement;
  approvedOffers: Offer[];
  currentUser?: User; // Added for privacy
}

// --- Date Helper Functions (UTC to avoid timezone issues) ---
const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const addDays = (date: Date, days: number): Date => {
  const newDate = new Date(date.valueOf());
  newDate.setUTCDate(newDate.getUTCDate() + days);
  return newDate;
};

// --- Interfaces ---
interface DeliveryPeriod {
  offerId: string;
  sellerId: string;
  sellerName: string;
  startDate: Date;
  endDate: Date;
  quantity: number;
}

interface PositionedPeriod extends DeliveryPeriod {
    lane: number;
}

const OfferTimeline: React.FC<OfferTimelineProps> = ({ requirement, approvedOffers, currentUser }) => {
  const { users } = useData();

  const reqStartDate = parseDate(requirement.vigenciaInicio);
  const totalDuration = (parseDate(requirement.vigenciaFin).getTime() - reqStartDate.getTime()) / (1000 * 60 * 60 * 24) + 1;

  const { positionedPeriods, laneCount, legend } = useMemo(() => {
    const reqEndDate = parseDate(requirement.vigenciaFin);
    
    if (reqStartDate >= reqEndDate) {
      return { positionedPeriods: [], laneCount: 0, legend: [] };
    }

    const allPeriods: DeliveryPeriod[] = [];
    const sellerColors: Record<string, string> = {};
    const colors = ['bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'];
    let colorIndex = 0;

    approvedOffers.forEach(offer => {
      const seller = users.find(u => u.id === offer.sellerId);
      if (!seller) return;

      // Privacy check for name
      const sellerDisplay = currentUser ? getPublicUserDisplay(seller, currentUser) : { name: 'Vendedor' };

      if (!sellerColors[seller.id]) {
          sellerColors[seller.id] = colors[colorIndex % colors.length];
          colorIndex++;
      }

      const offerStartDate = parseDate(offer.fechaInicioVigencia);
      const offerEndDate = parseDate(offer.fechaFinVigencia);
      
      const generatedPeriods: { startDate: Date; endDate: Date }[] = [];
      let cursorDate = offerStartDate;

      switch (requirement.frecuencia) {
        case 'Semanal':
          while (cursorDate <= offerEndDate) {
            const periodStart = cursorDate;
            const periodEnd = addDays(cursorDate, 6);
            generatedPeriods.push({ startDate: periodStart, endDate: periodEnd > offerEndDate ? offerEndDate : periodEnd });
            cursorDate = addDays(cursorDate, 7);
          }
          break;
        case 'Mensual':
          while (cursorDate <= offerEndDate) {
            const year = cursorDate.getUTCFullYear();
            const month = cursorDate.getUTCMonth();
            const periodStart = cursorDate;
            const periodEnd = new Date(Date.UTC(year, month + 1, 0));
            generatedPeriods.push({ startDate: periodStart, endDate: periodEnd > offerEndDate ? offerEndDate : periodEnd });
            cursorDate = new Date(Date.UTC(year, month + 1, 1));
          }
          break;
        case 'Anual':
             while (cursorDate <= offerEndDate) {
                const year = cursorDate.getUTCFullYear();
                const periodStart = cursorDate;
                const periodEnd = new Date(Date.UTC(year, 11, 31));
                generatedPeriods.push({ startDate: periodStart, endDate: periodEnd > offerEndDate ? offerEndDate : periodEnd });
                cursorDate = new Date(Date.UTC(year + 1, 0, 1));
             }
             break;
        case 'Única Vez':
        default:
          generatedPeriods.push({ startDate: offerStartDate, endDate: offerEndDate });
          break;
      }
      
      const quantityPerPeriod = generatedPeriods.length > 0 ? offer.cantidadOfertada / generatedPeriods.length : 0;

      generatedPeriods.forEach(period => {
        const clippedStartDate = new Date(Math.max(period.startDate.getTime(), reqStartDate.getTime()));
        const clippedEndDate = new Date(Math.min(period.endDate.getTime(), reqEndDate.getTime()));

        if (clippedStartDate <= clippedEndDate) {
          allPeriods.push({
            offerId: offer.id,
            sellerId: seller.id,
            sellerName: sellerDisplay.name,
            startDate: clippedStartDate,
            endDate: clippedEndDate,
            quantity: quantityPerPeriod,
          });
        }
      });
    });
    
    allPeriods.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const positioned: PositionedPeriod[] = [];
    const laneEndDates: Date[] = []; 

    allPeriods.forEach(period => {
        let assignedLane = -1;
        for (let i = 0; i < laneEndDates.length; i++) {
            if (period.startDate > laneEndDates[i]) { 
                laneEndDates[i] = period.endDate;
                assignedLane = i;
                break;
            }
        }
        
        if (assignedLane === -1) {
            assignedLane = laneEndDates.length;
            laneEndDates.push(period.endDate);
        }

        positioned.push({ ...period, lane: assignedLane });
    });
    
    const legendData = Object.keys(sellerColors).map(sellerId => {
        const s = users.find(u => u.id === sellerId);
        const display = currentUser ? getPublicUserDisplay(s, currentUser) : { name: 'Vendedor' };
        return {
            sellerId,
            name: display.name,
            color: sellerColors[sellerId],
        };
    });

    return { positionedPeriods: positioned, laneCount: laneEndDates.length, legend: legendData };
  }, [requirement, approvedOffers, users, reqStartDate, currentUser]);
  
  const isLongDuration = totalDuration > 90;

  const timeMarkers = useMemo(() => {
    const markers: {label: string; left: number; width: number}[] = [];
    const reqEndDate = parseDate(requirement.vigenciaFin);
    const endDateForCalc = addDays(reqEndDate, 1);

    if (totalDuration <= 1) return [];

    if (isLongDuration) { // Monthly markers
        let cursor = new Date(Date.UTC(reqStartDate.getUTCFullYear(), reqStartDate.getUTCMonth(), 1));
        while (cursor < reqEndDate) {
            const nextMonth = new Date(cursor.valueOf());
            nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
            
            const blockStart = cursor > reqStartDate ? cursor : reqStartDate;
            const blockEnd = nextMonth < endDateForCalc ? nextMonth : endDateForCalc;

            const offsetDays = (blockStart.getTime() - reqStartDate.getTime()) / (1000 * 60 * 60 * 24);
            const durationDays = (blockEnd.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24);

            if (durationDays > 0) {
                 markers.push({
                    label: blockStart.toLocaleString('es-CO', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
                    left: (offsetDays / totalDuration) * 100,
                    width: (durationDays / totalDuration) * 100,
                });
            }
            cursor = nextMonth;
        }
    } else { // Weekly markers
        let cursor = new Date(reqStartDate.valueOf());
        let weekNum = 1;
        while(cursor < reqEndDate) {
            const nextWeek = addDays(cursor, 7);
            
            const blockStart = cursor;
            const blockEnd = nextWeek < endDateForCalc ? nextWeek : endDateForCalc;
            
            const offsetDays = (blockStart.getTime() - reqStartDate.getTime()) / (1000 * 60 * 60 * 24);
            const durationDays = (blockEnd.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24);

            if (durationDays > 0) {
                 markers.push({
                    label: `Sem ${weekNum}`,
                    left: (offsetDays / totalDuration) * 100,
                    width: (durationDays / totalDuration) * 100,
                });
            }
            cursor = nextWeek;
            weekNum++;
        }
    }
    return markers;
  }, [reqStartDate, requirement.vigenciaFin, totalDuration, isLongDuration]);

  const yearMarkers = useMemo(() => {
    const startYear = reqStartDate.getUTCFullYear();
    const reqEndDate = parseDate(requirement.vigenciaFin);
    const endYear = reqEndDate.getUTCFullYear();
    const markers = [];
    
    for (let year = startYear + 1; year <= endYear; year++) {
        const yearStartDate = new Date(Date.UTC(year, 0, 1));
        if (yearStartDate < reqEndDate) {
            const offsetDays = (yearStartDate.getTime() - reqStartDate.getTime()) / (1000 * 60 * 60 * 24);
            markers.push({ year, left: (offsetDays / totalDuration) * 100 });
        }
    }
    return markers;
  }, [reqStartDate, requirement.vigenciaFin, totalDuration]);

  if (totalDuration <= 0) {
    return (
        <div className="bg-white p-6 rounded-lg shadow mt-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Línea de Tiempo de Entregas</h2>
            <p className="text-sm text-red-500">Las fechas de la solicitud no son válidas para generar la línea de tiempo.</p>
        </div>
    );
  }

  const barHeight = 24;
  const barMargin = 4;
  const totalHeight = laneCount > 0 ? laneCount * (barHeight + barMargin) : barHeight;

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Línea de Tiempo de Entregas</h2>
        <div className="relative pb-4">
            <div className="flex justify-between text-xs text-gray-500 font-medium mb-2">
                <span>{requirement.vigenciaInicio}</span>
                <span>{requirement.vigenciaFin}</span>
            </div>
            
            <div className="relative w-full h-8 mb-4 rounded-lg flex items-end overflow-hidden border border-gray-200 bg-gray-50">
              {timeMarkers.map((marker, index) => (
                <div 
                    key={index}
                    className={`h-full flex items-center justify-center border-r border-gray-300/50 ${index % 2 === 0 ? 'bg-gray-100' : 'bg-gray-50'}`}
                    style={{
                        position: 'absolute',
                        left: `${marker.left}%`,
                        width: `${marker.width}%`,
                    }}
                    title={marker.label}
                >
                    <span className="text-xs font-semibold text-gray-500 capitalize">{marker.label}</span>
                </div>
              ))}
              {yearMarkers.map(marker => (
                <div key={marker.year} className="absolute top-0 h-full border-l-2 border-red-300" style={{ left: `${marker.left}%` }}>
                    <span className="absolute left-1 -top-0.5 text-xs font-bold text-red-500 bg-white/80 px-1 rounded-b-md">{marker.year}</span>
                </div>
              ))}
            </div>
            
            <div className="relative" style={{ height: `${totalHeight}px` }}>
                {positionedPeriods.map((period, index) => {
                    const offsetDays = (period.startDate.getTime() - reqStartDate.getTime()) / (1000 * 60 * 60 * 24);
                    const durationDays = (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
                    
                    const leftPercentage = (offsetDays / totalDuration) * 100;
                    const widthPercentage = (durationDays / totalDuration) * 100;

                    const periodColor = legend.find(l => l.sellerId === period.sellerId)?.color || 'bg-gray-400';
                    const tooltipText = `Vendedor: ${period.sellerName}\nPeríodo: ${period.startDate.toISOString().split('T')[0]} a ${period.endDate.toISOString().split('T')[0]}\nCantidad: ${period.quantity.toFixed(1)} ${requirement.unidad}`;

                    return (
                        <div
                            key={`${period.offerId}-${index}`}
                            className={`absolute rounded group cursor-pointer transition-all duration-150 ease-out hover:z-10 hover:ring-2 hover:ring-offset-2 hover:ring-blue-500 ${periodColor}`}
                            style={{
                                left: `${Math.max(0, leftPercentage)}%`,
                                width: `${Math.min(100 - leftPercentage, widthPercentage)}%`,
                                height: `${barHeight}px`,
                                top: `${period.lane * (barHeight + barMargin)}px`,
                            }}
                            title={tooltipText}
                        >
                            <div className="flex items-center justify-center h-full px-2 text-white text-xs font-bold truncate">
                                {`${period.quantity.toFixed(1)} ${requirement.unidad === 'Toneladas (Ton)' ? 'T' : 'Kg'}`}
                            </div>
                        </div>
                    );
                })}
            </div>
            {legend.length > 0 && (
                <div className="mt-8 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Vendedores</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {legend.map(item => (
                            <div key={item.sellerId} className="flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-2 ${item.color}`}></span>
                                <span className="text-xs text-gray-700">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default OfferTimeline;
