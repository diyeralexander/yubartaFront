/**
 * Data Hook - API Integration Version
 * All CRUD operations are connected to Firebase via backend API
 */

import React, { useState, createContext, useContext, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { Role, RequirementStatus, OfferStatus, User, Requirement, Offer, Commitment, MarketplaceListing, PurchaseOffer, ListingStatus, PurchaseOfferStatus } from '../types';
import { usersAPI, requirementsAPI, offersAPI, commitmentsAPI, listingsAPI, purchaseOffersAPI } from '../services/api';

// Static data (no need to fetch from backend)
export const materialCategories: Record<string, string[]> = {
  "Plásticos": [
    "PET (Polietileno Tereftatalato)",
    "PEAD (Polietileno de Alta Densidad)",
    "PEBD (Polietileno de Baja Densidad)",
    "PP (Polipropileno)",
    "PS (Poliestireno)",
    "PVC (Policloruro de Vinilo)",
    "Otro"
  ],
  "Cartones y papeles": [
    "Carton Corrugado",
    "Papel Archivo",
    "Papel Periódico",
    "Cartones para bebidas",
    "Otro"
  ],
  "Metales": [
    "Chatarra ferrosa",
    "Aluminio",
    "Cobre",
    "Bronce",
    "Hierro",
    "Otro"
  ],
  "Vidrio": [
    "Vidrio transparente",
    "Vidrio verde",
    "Vidrio ambar",
    "Vidrio plano",
    "Otro"
  ],
  "Otro": []
};

export const buyerTypes: ('Transformador' | 'Gran Acopiador')[] = [
  'Transformador',
  'Gran Acopiador'
];

export const colombiaDepartmentsAndMunicipalities: Record<string, string[]> = {
  "Amazonas": ["Leticia", "Puerto Nariño"],
  "Antioquia": ["Medellín", "Abejorral", "Abriaquí", "Alejandría", "Amagá", "Amalfi", "Andes", "Angelópolis", "Angostura", "Anorí", "Santafé de Antioquia", "Anzá", "Apartadó", "Arboletes", "Argelia", "Armenia", "Barbosa", "Belmira", "Bello", "Betania", "Betulia", "Ciudad Bolívar", "Briceño", "Buriticá", "Cáceres", "Caicedo", "Caldas", "Campamento", "Cañasgordas", "Caracolí", "Caramanta", "Carepa", "El Carmen de Viboral", "Carolina", "Caucasia", "Chigorodó", "Cisneros", "Cocorná", "Concepción", "Concordia", "Copacabana", "Dabeiba", "Donmatías", "Ebéjico", "El Bagre", "Entrerríos", "Envigado", "Fredonia", "Frontino", "Giraldo", "Girardota", "Gómez Plata", "Granada", "Guadalupe", "Guarne", "Guatapé", "Heliconia", "Hispania", "Itagüí", "Ituango", "Jardín", "Jericó", "La Ceja", "La Estrella", "La Pintada", "La Unión", "Liborina", "Maceo", "Marinilla", "Montebello", "Murindó", "Mutatá", "Nariño", "Necoclí", "Nechí", "Olaya", "Peñol", "Peque", "Pueblorrico", "Puerto Berrío", "Puerto Nare", "Puerto Triunfo", "Remedios", "Retiro", "Rionegro", "Sabanalarga", "Sabaneta", "Salgar", "San Andrés de Cuerquia", "San Carlos", "San Francisco", "San Jerónimo", "San José de la Montaña", "San Juan de Urabá", "San Luis", "San Pedro de los Milagros", "San Pedro de Urabá", "San Rafael", "San Roque", "San Vicente", "Santa Bárbara", "Santa Rosa de Osos", "Santo Domingo", "El Santuario", "Segovia", "Sonsón", "Sopetrán", "Támesis", "Tarazá", "Tarso", "Titiribí", "Toledo", "Turbo", "Uramita", "Urrao", "Valdivia", "Valparaíso", "Vegachí", "Venecia", "Vigía del Fuerte", "Yalí", "Yarumal", "Yolombó", "Yondó", "Zaragoza"],
  "Arauca": ["Arauca", "Arauquita", "Cravo Norte", "Fortul", "Puerto Rondón", "Saravena", "Tame"],
  "Atlántico": ["Barranquilla", "Baranoa", "Campo de la Cruz", "Candelaria", "Galapa", "Juan de Acosta", "Luruaco", "Malambo", "Manatí", "Palmar de Varela", "Piojó", "Polonuevo", "Ponedera", "Puerto Colombia", "Repelón", "Sabanagrande", "Sabanalarga", "Santa Lucía", "Santo Tomás", "Soledad", "Suan", "Tubará", "Usiacurí"],
  "Bogotá D.C.": ["Bogotá"],
  "Bolívar": ["Cartagena", "Achí", "Altos del Rosario", "Arenal", "Arjona", "Arroyohondo", "Barranco de Loba", "Calamar", "Cantagallo", "Cicuco", "Córdoba", "Clemencia", "El Carmen de Bolívar", "El Guamo", "El Peñón", "Hatillo de Loba", "Magangué", "Mahates", "Margarita", "María La Baja", "Montecristo", "Mompós", "Morales", "Norosí", "Pinillos", "Regidor", "Río Viejo", "San Cristóbal", "San Estanislao", "San Fernando", "San Jacinto", "San Jacinto del Cauca", "San Juan Nepomuceno", "San Martín de Loba", "San Pablo", "Santa Catalina", "Santa Rosa", "Santa Rosa del Sur", "Simití", "Soplaviento", "Talaigua Nuevo", "Tiquisio", "Turbaco", "Turbaná", "Villanueva", "Zambrano"],
  "Boyacá": ["Tunja", "Almeida", "Aquitania", "Arcabuco", "Belén", "Berbeo", "Betéitiva", "Boavita", "Boyacá", "Briceño", "Buenavista", "Busbanzá", "Caldas", "Campohermoso", "Cerinza", "Chinavita", "Chiquinquirá", "Chiscas", "Chita", "Chitaraque", "Chivatá", "Ciénega", "Cómbita", "Coper", "Corrales", "Covarachía", "Cubará", "Cucaita", "Cuítiva", "Chíquiza", "Chivor", "Duitama", "El Cocuy", "El Espino", "Firavitoba", "Floresta", "Gachantivá", "Gameza", "Garagoa", "Guacamayas", "Guateque", "Guayatá", "Güicán", "Iza", "Jenesano", "Jericó", "Labranzagrande", "La Capilla", "La Victoria", "La Uvita", "Villa de Leyva", "Macanal", "Maripí", "Miraflores", "Mongua", "Monguí", "Moniquirá", "Motavita", "Muzo", "Nobsa", "Nuevo Colón", "Oicatá", "Otanche", "Pachavita", "Páez", "Paipa", "Pajarito", "Panqueba", "Pauna", "Paya", "Paz de Río", "Pesca", "Pisba", "Puerto Boyacá", "Quípama", "Ramiriquí", "Ráquira", "Rondón", "Saboyá", "Sáchica", "Samacá", "San Eduardo", "San José de Pare", "San Luis de Gaceno", "San Mateo", "San Miguel de Sema", "San Pablo de Borbur", "Santana", "Santa María", "Santa Rosa de Viterbo", "Santa Sofía", "Sativanorte", "Sativasur", "Siachoque", "Soatá", "Socotá", "Socha", "Sogamoso", "Somondoco", "Sora", "Sotaquirá", "Soracá", "Susacón", "Sutamarchán", "Sutatenza", "Tasco", "Tenza", "Tibaná", "Tibasosa", "Tinjacá", "Tipacoque", "Toca", "Togüí", "Tópaga", "Tota", "Tununguá", "Turmequé", "Tuta", "Tutazá", "Úmbita", "Ventaquemada", "Viracachá", "Zetaquira"],
  "Caldas": ["Manizales", "Aguadas", "Anserma", "Aranzazu", "Belalcázar", "Chinchiná", "Filadelfia", "La Dorada", "La Merced", "Manzanares", "Marmato", "Marquetalia", "Marulanda", "Neira", "Norcasia", "Pácora", "Palestina", "Pensilvania", "Riosucio", "Risaralda", "Salamina", "Samaná", "San José", "Supía", "Victoria", "Villamaría", "Viterbo"],
  "Caquetá": ["Florencia", "Albania", "Belén de los Andaquies", "Cartagena del Chairá", "Curillo", "El Doncello", "El Paujil", "La Montañita", "Milán", "Morelia", "Puerto Rico", "San José del Fragua", "San Vicente del Caguán", "Solano", "Solita", "Valparaíso"],
  "Casanare": ["Yopal", "Aguazul", "Chámeza", "Hato Corozal", "La Salina", "Maní", "Monterrey", "Nunchía", "Orocué", "Paz de Ariporo", "Pore", "Recetor", "Sabanalarga", "Sácama", "San Luis de Palenque", "Támara", "Tauramena", "Trinidad", "Villanueva"],
  "Cauca": ["Popayán", "Almaguer", "Argelia", "Balboa", "Bolívar", "Buenos Aires", "Cajibío", "Caldono", "Caloto", "Corinto", "El Tambo", "Florencia", "Guachené", "Guapí", "Inzá", "Jambaló", "La Sierra", "La Vega", "López", "Mercaderes", "Miranda", "Morales", "Padilla", "Páez", "Patía", "Piamonte", "Piendamó", "Puerto Tejada", "Puracé", "Rosas", "San Sebastián", "Santander de Quilichao", "Santa Rosa", "Silvia", "Sotará", "Suárez", "Sucre", "Timbío", "Timbiquí", "Toribío", "Totoró", "Villa Rica"],
  "Cesar": ["Valledupar", "Aguachica", "Agustín Codazzi", "Astrea", "Becerril", "Bosconia", "Chimichagua", "Chiriguaná", "Curumaní", "El Copey", "El Paso", "Gamarra", "González", "La Gloria", "La Jagua de Ibirico", "Manaure", "Pailitas", "Pelaya", "Pueblo Bello", "Río de Oro", "La Paz", "San Alberto", "San Diego", "San Martín", "Tamalameque"],
  "Chocó": ["Quibdó", "Acandí", "Alto Baudó", "Atrato", "Bagadó", "Bahía Solano", "Bajo Baudó", "Bojayá", "El Cantón del San Pablo", "Cértegui", "Condoto", "El Carmen de Atrato", "El Litoral del San Juan", "Istmina", "Juradó", "Lloró", "Medio Atrato", "Medio Baudó", "Medio San Juan", "Nóvita", "Nuquí", "Río Iró", "Río Quito", "Riosucio", "San José del Palmar", "Sipí", "Tadó", "Unguía", "Unión Panamericana"],
  "Córdoba": ["Montería", "Ayapel", "Buenavista", "Canalete", "Cereté", "Chimá", "Chinú", "Ciénaga de Oro", "Cotorra", "La Apartada", "Lorica", "Los Córdobas", "Momil", "Montelíbano", "Moñitos", "Planeta Rica", "Pueblo Nuevo", "Puerto Escondido", "Puerto Libertador", "Purísima", "Sahagún", "San Andrés de Sotavento", "San Antero", "San Bernardo del Viento", "San Carlos", "San José de Uré", "San Pelayo", "Tierralta", "Tuchín", "Valencia"],
  "Cundinamarca": ["Agua de Dios", "Albán", "Anapoima", "Anolaima", "Arbeláez", "Beltrán", "Bituima", "Bogotá D.C.", "Bojacá", "Cabrera", "Cachipay", "Cajicá", "Caparrapí", "Cáqueza", "Carmen de Carupa", "Chaguaní", "Chía", "Chipaque", "Choachí", "Chocontá", "Cogua", "Cota", "Cucunubá", "El Colegio", "El Peñón", "El Rosal", "Facatativá", "Fómeque", "Fosca", "Funza", "Fúquene", "Fusagasugá", "Gachalá", "Gachancipá", "Gachetá", "Gama", "Girardot", "Granada", "Guachetá", "Guaduas", "Guasca", "Guataquí", "Guatavita", "Guayabal de Síquima", "Guayabetal", "Gutiérrez", "Jerusalén", "Junín", "La Calera", "La Mesa", "La Palma", "La Peña", "La Vega", "Lenguazaque", "Machetá", "Madrid", "Manta", "Medina", "Mosquera", "Nariño", "Nemocón", "Nilo", "Nimaima", "Nocaima", "Venecia", "Pacho", "Paime", "Pandi", "Paratebueno", "Pasca", "Puerto Salgar", "Pulí", "Quebradanegra", "Quetame", "Quipile", "Apulo", "Ricaurte", "San Antonio del Tequendama", "San Bernardo", "San Cayetano", "San Francisco", "San Juan de Rioseco", "Sasaima", "Sesquilé", "Sibaté", "Silvania", "Simijaca", "Soacha", "Sopó", "Subachoque", "Suesca", "Supatá", "Susa", "Sutatausa", "Tabio", "Tausa", "Tena", "Tenjo", "Tibacuy", "Tibirita", "Tocaima", "Tocancipá", "Topaipí", "Ubalá", "Ubaque", "Villa de San Diego de Ubaté", "Une", "Útica", "Vergara", "Vianí", "Villagómez", "Villapinzón", "Villeta", "Viotá", "Yacopí", "Zipacón", "Zipaquirá"],
  "Guainía": ["Inírida"],
  "Guaviare": ["San José del Guaviare", "Calamar", "El Retorno", "Miraflores"],
  "Huila": ["Neiva", "Acevedo", "Agrado", "Aipe", "Algeciras", "Altamira", "Baraya", "Campoalegre", "Colombia", "Elías", "Garzón", "Gigante", "Guadalupe", "Hobo", "Iquira", "Isnos", "La Argentina", "La Plata", "Nátaga", "Oporapa", "Paicol", "Palermo", "Palestina", "Pital", "Pitalito", "Rivera", "Saladoblanco", "San Agustín", "Santa María", "Suaza", "Tarqui", "Tesalia", "Tello", "Teruel", "Timaná", "Villavieja", "Yaguará"],
  "La Guajira": ["Riohacha", "Albania", "Barrancas", "Dibulla", "Distracción", "El Molino", "Fonseca", "Hatonuevo", "La Jagua del Pilar", "Maicao", "Manaure", "San Juan del Cesar", "Uribia", "Urumita", "Villanueva"],
  "Magdalena": ["Santa Marta", "Algarrobo", "Aracataca", "Ariguaní", "Cerro de San Antonio", "Chibolo", "Ciénaga", "Concordia", "El Banco", "El Piñón", "El Retén", "Fundación", "Guamal", "Nueva Granada", "Pedraza", "Pijiño del Carmen", "Pivijay", "Plato", "Puebloviejo", "Remolino", "Sabanas de San Ángel", "Salamina", "San Sebastián de Buenavista", "San Zenón", "Santa Ana", "Santa Bárbara de Pinto", "Sitionuevo", "Tenerife", "Zapayán", "Zona Bananera"],
  "Meta": ["Villavicencio", "Acacías", "Barranca de Upía", "Cabuyaro", "Castilla la Nueva", "Cubarral", "Cumaral", "El Calvario", "El Castillo", "El Dorado", "Fuente de Oro", "Granada", "Guamal", "La Macarena", "Lejanías", "Mapiripán", "Mesetas", "Puerto Concordia", "Puerto Gaitán", "Puerto Lleras", "Puerto López", "Puerto Rico", "Restrepo", "San Carlos de Guaroa", "San Juan de Arama", "San Juanito", "San Martín", "Uribe", "Vista Hermosa"],
  "Nariño": ["Pasto", "Albán", "Aldana", "Ancuya", "Arboleda", "Barbacoas", "Belén", "Buesaco", "Colón", "Consacá", "Contadero", "Córdoba", "Cuaspud", "Cumbal", "Cumbitara", "Chachagüí", "El Charco", "El Peñol", "El Rosario", "El Tablón de Gómez", "El Tambo", "Funes", "Guachucal", "Guaitarilla", "Gualmatán", "Iles", "Imués", "Ipiales", "La Cruz", "La Florida", "La Llanada", "La Tola", "La Unión", "Leiva", "Linares", "Los Andes", "Magüí", "Mallama", "Mosquera", "Nariño", "Olaya Herrera", "Ospina", "Francisco Pizarro", "Policarpa", "Potosí", "Providencia", "Puerres", "Pupiales", "Ricaurte", "Roberto Payán", "Samaniego", "Sandoná", "San Bernardo", "San Lorenzo", "San Pablo", "San Pedro de Cartago", "Santa Bárbara", "Santacruz", "Sapuyes", "Taminango", "Tangua", "San Andrés de Tumaco", "Túquerres", "Yacuanquer"],
  "Norte de Santander": ["Cúcuta", "Abrego", "Arboledas", "Bochalema", "Bucarasica", "Cácota", "Cáchira", "Chinácota", "Chitagá", "Convención", "Cucutilla", "Durania", "El Carmen", "El Tarra", "El Zulia", "Gramalote", "Hacarí", "Herrán", "Labateca", "La Esperanza", "La Playa", "Los Patios", "Lourdes", "Mutiscua", "Ocaña", "Pamplona", "Pamplonita", "Puerto Santander", "Ragonvalia", "Salazar", "San Calixto", "San Cayetano", "Santiago", "Sardinata", "Silos", "Teorama", "Tibú", "Toledo", "Villa Caro", "Villa del Rosario"],
  "Putumayo": ["Mocoa", "Colón", "Orito", "Puerto Asís", "Puerto Caicedo", "Puerto Guzmán", "Puerto Leguízamo", "Sibundoy", "San Francisco", "San Miguel", "Santiago", "Valle del Guamuez", "Villagarzón"],
  "Quindío": ["Armenia", "Buenavista", "Calarcá", "Circasia", "Córdoba", "Filandia", "Génova", "La Tebaida", "Montenegro", "Pijao", "Quimbaya", "Salento"],
  "Risaralda": ["Pereira", "Apía", "Balboa", "Belén de Umbría", "Dosquebradas", "Guática", "La Celia", "La Virginia", "Marsella", "Mistrató", "Pueblo Rico", "Quinchía", "Santa Rosa de Cabal", "Santuario"],
  "San Andrés y Providencia": ["San Andrés", "Providencia"],
  "Santander": ["Bucaramanga", "Aguada", "Albania", "Aratoca", "Barbosa", "Barichara", "Barrancabermeja", "Betulia", "Bolívar", "Cabrera", "California", "Capitanejo", "Carcasí", "Cepitá", "Cerrito", "Charalá", "Charta", "Chima", "Chipatá", "Cimitarra", "Concepción", "Confines", "Contratación", "Coromoro", "Curití", "El Carmen de Chucurí", "El Guacamayo", "El Peñón", "El Playón", "Encino", "Enciso", "Florián", "Floridablanca", "Galán", "Gámbita", "Girón", "Guaca", "Guadalupe", "Guapotá", "Guavatá", "Güepsa", "Hato", "Jesús María", "Jordán", "La Belleza", "Landázuri", "La Paz", "Lebrija", "Los Santos", "Macaravita", "Málaga", "Matanza", "Mogotes", "Molagavita", "Ocamonte", "Oiba", "Onzaga", "Palmar", "Palmas del Socorro", "Páramo", "Piedecuesta", "Pinchote", "Puente Nacional", "Puerto Parra", "Puerto Wilches", "Rionegro", "Sabana de Torres", "San Andrés", "San Benito", "San Gil", "San Joaquín", "San José de Miranda", "San Miguel", "San Vicente de Chucurí", "Santa Bárbara", "Santa Helena del Opón", "Simacota", "Socorro", "Suaita", "Sucre", "Suratá", "Tona", "Valle de San José", "Vélez", "Vetas", "Villanueva", "Zapatoca"],
  "Sucre": ["Sincelejo", "Buenavista", "Caimito", "Colosó", "Corozal", "Coveñas", "Chalán", "El Roble", "Galeras", "Guaranda", "La Unión", "Los Palmitos", "Majagual", "Morroa", "Ovejas", "Palmito", "Sampués", "San Benito Abad", "San Juan de Betulia", "San Marcos", "San Onofre", "San Pedro", "San Luis de Sincé", "Sucre", "Santiago de Tolú", "Tolú Viejo"],
  "Tolima": ["Ibagué", "Alpujarra", "Alvarado", "Ambalema", "Anzoátegui", "Armero", "Ataco", "Cajamarca", "Carmen de Apicalá", "Casabianca", "Chaparral", "Coello", "Coyaima", "Cunday", "Dolores", "Espinal", "Falan", "Flandes", "Fresno", "Guamo", "Herveo", "Honda", "Icononzo", "Lérida", "Líbano", "Mariquita", "Melgar", "Murillo", "Natagaima", "Ortega", "Palocabildo", "Piedras", "Planadas", "Prado", "Purificación", "Rioblanco", "Roncesvalles", "Rovira", "Saldaña", "San Antonio", "San Luis", "Santa Isabel", "Suárez", "Valle de San Juan", "Venadillo", "Villahermosa", "Villarrica"],
  "Valle del Cauca": ["Cali", "Alcalá", "Andalucía", "Ansermanuevo", "Argelia", "Bolívar", "Buenaventura", "Guadalajara de Buga", "Bugalagrande", "Caicedonia", "Calima", "Candelaria", "Cartago", "Dagua", "El Águila", "El Cairo", "El Cerrito", "El Dovio", "Florida", "Ginebra", "Guacarí", "Jamundí", "La Cumbre", "La Unión", "La Victoria", "Obando", "Palmira", "Pradera", "Restrepo", "Riofrío", "Roldanillo", "San Pedro", "Sevilla", "Toro", "Trujillo", "Tuluá", "Ulloa", "Versalles", "Vijes", "Yotoco", "Yumbo", "Zarzal"],
  "Vaupés": ["Mitú", "Carurú", "Taraira"],
  "Vichada": ["Puerto Carreño", "La Primavera", "Santa Rosalía", "Cumaribo"]
};

export const colombianDepartments: string[] = Object.keys(colombiaDepartmentsAndMunicipalities).sort();

const initialPresentationOptions: string[] = [
  "Globo",
  "Pacas",
  "Molido Sucio",
  "Molido y Lavado",
  "Aglutinado",
  "Pellet",
  "Otro"
];

// Helper to parse dates from API response
const parseDates = (data: any): any => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(parseDates);
  }
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      if (['createdAt', 'timestamp', 'registeredAt', 'lastActivity'].includes(key) && typeof data[key] === 'string') {
        result[key] = new Date(data[key]);
      } else {
        result[key] = data[key];
      }
    }
    return result;
  }
  return data;
};

interface DataContextType {
  users: User[];
  requirements: Requirement[];
  offers: Offer[];
  commitments: Commitment[];
  presentationOptions: string[];
  marketplaceListings: MarketplaceListing[];
  purchaseOffers: PurchaseOffer[];

  materialCategories: Record<string, string[]>;
  buyerTypes: ('Transformador' | 'Gran Acopiador')[];
  colombianDepartments: string[];
  colombiaDepartmentsAndMunicipalities: Record<string, string[]>;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // API CRUD Functions - Users
  createUser: (data: Partial<User>) => Promise<User>;
  updateUser: (id: string, data: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;

  // API CRUD Functions - Requirements
  createRequirement: (data: Partial<Requirement>) => Promise<Requirement>;
  updateRequirement: (id: string, data: Partial<Requirement>) => Promise<Requirement>;
  deleteRequirement: (id: string) => Promise<void>;

  // API CRUD Functions - Offers
  createOffer: (data: Partial<Offer>) => Promise<Offer>;
  updateOffer: (id: string, data: Partial<Offer>) => Promise<Offer>;
  deleteOffer: (id: string) => Promise<void>;

  // API CRUD Functions - Commitments
  createCommitment: (data: Partial<Commitment>) => Promise<Commitment>;
  updateCommitment: (id: string, data: Partial<Commitment>) => Promise<Commitment>;
  deleteCommitment: (id: string) => Promise<void>;

  // API CRUD Functions - Listings
  createListing: (data: Partial<MarketplaceListing>) => Promise<MarketplaceListing>;
  updateListing: (id: string, data: Partial<MarketplaceListing>) => Promise<MarketplaceListing>;
  deleteListing: (id: string) => Promise<void>;

  // API CRUD Functions - Purchase Offers
  createPurchaseOffer: (data: Partial<PurchaseOffer>) => Promise<PurchaseOffer>;
  updatePurchaseOffer: (id: string, data: Partial<PurchaseOffer>) => Promise<PurchaseOffer>;
  deletePurchaseOffer: (id: string) => Promise<void>;

  // Legacy setters (for backward compatibility during migration)
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setRequirements: React.Dispatch<React.SetStateAction<Requirement[]>>;
  setOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  setCommitments: React.Dispatch<React.SetStateAction<Commitment[]>>;
  setPresentationOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setMarketplaceListings: React.Dispatch<React.SetStateAction<MarketplaceListing[]>>;
  setPurchaseOffers: React.Dispatch<React.SetStateAction<PurchaseOffer[]>>;

  // Refresh functions
  refreshData: () => Promise<void>;

  generateNewRequirementId: () => string;
  generateNewOfferId: () => string;
  generateNewListingId: () => string;
  generateNewPurchaseOfferId: () => string;
  validateId: (id: string, module: 'M1' | 'M2', type: string) => boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [presentationOptions, setPresentationOptions] = useState<string[]>(initialPresentationOptions);
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
  const [purchaseOffers, setPurchaseOffers] = useState<PurchaseOffer[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data from API
  const fetchAllData = useCallback(async () => {
    try {
      const [
        usersData,
        requirementsData,
        offersData,
        commitmentsData,
        listingsData,
        purchaseOffersData
      ] = await Promise.all([
        usersAPI.getAll(),
        requirementsAPI.getAll(),
        offersAPI.getAll(),
        commitmentsAPI.getAll(),
        listingsAPI.getAll(),
        purchaseOffersAPI.getAll()
      ]);

      setUsers(parseDates(usersData));
      setRequirements(parseDates(requirementsData));
      setOffers(parseDates(offersData));
      setCommitments(parseDates(commitmentsData));
      setMarketplaceListings(parseDates(listingsData));
      setPurchaseOffers(parseDates(purchaseOffersData));
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Polling for real-time sync (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllData();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchAllData]);

  // ============ API CRUD Functions ============

  // --- Users ---
  const createUser = useCallback(async (data: Partial<User>): Promise<User> => {
    const result = await usersAPI.getAll(); // Use register API instead if needed
    const newUser = parseDates(result);
    await fetchAllData();
    return newUser;
  }, [fetchAllData]);

  const updateUser = useCallback(async (id: string, data: Partial<User>): Promise<User> => {
    const result = await usersAPI.update(id, data);
    const updatedUser = parseDates(result);
    setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
    return updatedUser;
  }, []);

  const deleteUser = useCallback(async (id: string): Promise<void> => {
    await usersAPI.delete(id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  // --- Requirements ---
  const createRequirement = useCallback(async (data: Partial<Requirement>): Promise<Requirement> => {
    const result = await requirementsAPI.create(data);
    const newReq = parseDates(result);
    setRequirements(prev => [newReq, ...prev]);
    return newReq;
  }, []);

  const updateRequirement = useCallback(async (id: string, data: Partial<Requirement>): Promise<Requirement> => {
    const result = await requirementsAPI.update(id, data);
    const updatedReq = parseDates(result);
    setRequirements(prev => prev.map(r => r.id === id ? updatedReq : r));
    return updatedReq;
  }, []);

  const deleteRequirement = useCallback(async (id: string): Promise<void> => {
    await requirementsAPI.delete(id);
    setRequirements(prev => prev.filter(r => r.id !== id));
  }, []);

  // --- Offers ---
  const createOffer = useCallback(async (data: Partial<Offer>): Promise<Offer> => {
    const result = await offersAPI.create(data);
    const newOffer = parseDates(result);
    setOffers(prev => [newOffer, ...prev]);
    return newOffer;
  }, []);

  const updateOffer = useCallback(async (id: string, data: Partial<Offer>): Promise<Offer> => {
    const result = await offersAPI.update(id, data);
    const updatedOffer = parseDates(result);
    setOffers(prev => prev.map(o => o.id === id ? updatedOffer : o));
    return updatedOffer;
  }, []);

  const deleteOffer = useCallback(async (id: string): Promise<void> => {
    await offersAPI.delete(id);
    setOffers(prev => prev.filter(o => o.id !== id));
  }, []);

  // --- Commitments ---
  const createCommitment = useCallback(async (data: Partial<Commitment>): Promise<Commitment> => {
    const result = await commitmentsAPI.create(data);
    const newCommitment = parseDates(result);
    setCommitments(prev => [newCommitment, ...prev]);
    return newCommitment;
  }, []);

  const updateCommitment = useCallback(async (id: string, data: Partial<Commitment>): Promise<Commitment> => {
    const result = await commitmentsAPI.update(id, data);
    const updatedCommitment = parseDates(result);
    setCommitments(prev => prev.map(c => c.id === id ? updatedCommitment : c));
    return updatedCommitment;
  }, []);

  const deleteCommitment = useCallback(async (id: string): Promise<void> => {
    await commitmentsAPI.delete(id);
    setCommitments(prev => prev.filter(c => c.id !== id));
  }, []);

  // --- Listings ---
  const createListing = useCallback(async (data: Partial<MarketplaceListing>): Promise<MarketplaceListing> => {
    const result = await listingsAPI.create(data);
    const newListing = parseDates(result);
    setMarketplaceListings(prev => [newListing, ...prev]);
    return newListing;
  }, []);

  const updateListing = useCallback(async (id: string, data: Partial<MarketplaceListing>): Promise<MarketplaceListing> => {
    const result = await listingsAPI.update(id, data);
    const updatedListing = parseDates(result);
    setMarketplaceListings(prev => prev.map(l => l.id === id ? updatedListing : l));
    return updatedListing;
  }, []);

  const deleteListing = useCallback(async (id: string): Promise<void> => {
    await listingsAPI.delete(id);
    setMarketplaceListings(prev => prev.filter(l => l.id !== id));
  }, []);

  // --- Purchase Offers ---
  const createPurchaseOffer = useCallback(async (data: Partial<PurchaseOffer>): Promise<PurchaseOffer> => {
    const result = await purchaseOffersAPI.create(data);
    const newPO = parseDates(result);
    setPurchaseOffers(prev => [newPO, ...prev]);
    return newPO;
  }, []);

  const updatePurchaseOffer = useCallback(async (id: string, data: Partial<PurchaseOffer>): Promise<PurchaseOffer> => {
    const result = await purchaseOffersAPI.update(id, data);
    const updatedPO = parseDates(result);
    setPurchaseOffers(prev => prev.map(po => po.id === id ? updatedPO : po));
    return updatedPO;
  }, []);

  const deletePurchaseOffer = useCallback(async (id: string): Promise<void> => {
    await purchaseOffersAPI.delete(id);
    setPurchaseOffers(prev => prev.filter(po => po.id !== id));
  }, []);

  // ID Generation
  const generateId = (module: 'M1' | 'M2', type: string) => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${module}-${type}-${date}-${random}`;
  };

  const generateNewRequirementId = useCallback(() => generateId('M1', 'REQ'), []);
  const generateNewOfferId = useCallback(() => generateId('M1', 'OFF'), []);
  const generateNewListingId = useCallback(() => generateId('M2', 'LST'), []);
  const generateNewPurchaseOfferId = useCallback(() => generateId('M2', 'BID'), []);

  const validateId = useCallback((id: string, module: 'M1' | 'M2', type: string) => {
    return id.startsWith(`${module}-${type}-`);
  }, []);

  const value = useMemo(() => ({
    users,
    requirements,
    offers,
    commitments,
    presentationOptions,
    marketplaceListings,
    purchaseOffers,
    materialCategories,
    buyerTypes,
    colombianDepartments,
    colombiaDepartmentsAndMunicipalities,
    isLoading,
    error,
    // API CRUD functions
    createUser,
    updateUser,
    deleteUser,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    createOffer,
    updateOffer,
    deleteOffer,
    createCommitment,
    updateCommitment,
    deleteCommitment,
    createListing,
    updateListing,
    deleteListing,
    createPurchaseOffer,
    updatePurchaseOffer,
    deletePurchaseOffer,
    // Legacy setters
    setUsers,
    setRequirements,
    setOffers,
    setCommitments,
    setPresentationOptions,
    setMarketplaceListings,
    setPurchaseOffers,
    refreshData: fetchAllData,
    generateNewRequirementId,
    generateNewOfferId,
    generateNewListingId,
    generateNewPurchaseOfferId,
    validateId
  }), [
    users,
    requirements,
    offers,
    commitments,
    presentationOptions,
    marketplaceListings,
    purchaseOffers,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    createOffer,
    updateOffer,
    deleteOffer,
    createCommitment,
    updateCommitment,
    deleteCommitment,
    createListing,
    updateListing,
    deleteListing,
    createPurchaseOffer,
    updatePurchaseOffer,
    deletePurchaseOffer,
    fetchAllData,
    generateNewRequirementId,
    generateNewOfferId,
    generateNewListingId,
    generateNewPurchaseOfferId,
    validateId
  ]);

  return React.createElement(DataContext.Provider, { value }, children);
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// --- CUSTOM HOOK: Notification Stats (Actionable Items) ---
export const useNotificationStats = (currentUser: User | null) => {
  const { requirements, offers, marketplaceListings, purchaseOffers, users } = useData();

  return useMemo(() => {
    if (!currentUser) return { sourcing: 0, marketplace: 0, adminUsers: 0, total: 0 };

    let sourcingCount = 0;
    let marketplaceCount = 0;
    let adminUserCount = 0;

    if (currentUser.role === Role.ADMIN) {
      sourcingCount += requirements.filter(r => r.status === RequirementStatus.PENDING_ADMIN).length;
      sourcingCount += offers.filter(o => o.status === OfferStatus.PENDING_ADMIN).length;
      sourcingCount += requirements.filter(r => r.status === RequirementStatus.PENDING_QUANTITY_INCREASE).length;
      sourcingCount += offers.filter(o => o.status === OfferStatus.PENDING_SELLER_ACTION && o.communicationLog?.slice(-1)[0]?.eventType === 'SELLER_RESPONSE').length;

      marketplaceCount += marketplaceListings.filter(l => l.status === ListingStatus.PENDING_ADMIN).length;
      marketplaceCount += purchaseOffers.filter(o => o.status === PurchaseOfferStatus.PENDING_ADMIN).length;

      adminUserCount += users.filter(u => u.needsAdminApproval && !u.isVerified).length;
      adminUserCount += users.filter(u => u.pendingChanges && Object.keys(u.pendingChanges).length > 0).length;

    } else if (currentUser.role === Role.BUYER) {
      const myReqIds = requirements.filter(r => r.buyerId === currentUser.id).map(r => r.id);
      sourcingCount += offers.filter(o => myReqIds.includes(o.requirementId) && o.status === OfferStatus.PENDING_BUYER).length;
      sourcingCount += requirements.filter(r => r.buyerId === currentUser.id && r.status === RequirementStatus.PENDING_BUYER_APPROVAL).length;

      marketplaceCount += purchaseOffers.filter(o => o.buyerId === currentUser.id && o.status === PurchaseOfferStatus.PENDING_BUYER_APPROVAL).length;

    } else if (currentUser.role === Role.SELLER) {
      sourcingCount += offers.filter(o => o.sellerId === currentUser.id && (o.status === OfferStatus.PENDING_SELLER_ACTION || o.status === OfferStatus.PENDING_SELLER_APPROVAL || o.status === OfferStatus.WAITING_FOR_OWNER_EDIT_APPROVAL)).length;

      const myListings = marketplaceListings.filter(l => l.sellerId === currentUser.id).map(l => l.id);
      marketplaceCount += purchaseOffers.filter(o => myListings.includes(o.listingId) && o.status === PurchaseOfferStatus.PENDING_SELLER).length;
      marketplaceCount += marketplaceListings.filter(l => l.sellerId === currentUser.id && l.status === ListingStatus.PENDING_SELLER_APPROVAL).length;
    }

    return {
      sourcing: sourcingCount,
      marketplace: marketplaceCount,
      adminUsers: adminUserCount,
      total: sourcingCount + marketplaceCount + adminUserCount
    };
  }, [currentUser, requirements, offers, marketplaceListings, purchaseOffers, users]);
};

export const useSourcing = () => {
  const context = useData();
  return {
    requirements: context.requirements,
    offers: context.offers,
    commitments: context.commitments,
    createRequirement: context.createRequirement,
    updateRequirement: context.updateRequirement,
    deleteRequirement: context.deleteRequirement,
    createOffer: context.createOffer,
    updateOffer: context.updateOffer,
    deleteOffer: context.deleteOffer,
    createCommitment: context.createCommitment,
    updateCommitment: context.updateCommitment,
    // Legacy setters
    setRequirements: context.setRequirements,
    setOffers: context.setOffers,
    setCommitments: context.setCommitments,
    generateNewRequirementId: context.generateNewRequirementId,
    generateNewOfferId: context.generateNewOfferId
  };
};

export const useMarketplace = () => {
  const context = useData();
  return {
    marketplaceListings: context.marketplaceListings,
    purchaseOffers: context.purchaseOffers,
    commitments: context.commitments,
    createListing: context.createListing,
    updateListing: context.updateListing,
    deleteListing: context.deleteListing,
    createPurchaseOffer: context.createPurchaseOffer,
    updatePurchaseOffer: context.updatePurchaseOffer,
    deletePurchaseOffer: context.deletePurchaseOffer,
    createCommitment: context.createCommitment,
    // Legacy setters
    setMarketplaceListings: context.setMarketplaceListings,
    setPurchaseOffers: context.setPurchaseOffers,
    setCommitments: context.setCommitments,
    generateNewListingId: context.generateNewListingId,
    generateNewPurchaseOfferId: context.generateNewPurchaseOfferId
  };
};

export const useAuth = () => {
  const context = useData();
  return {
    users: context.users,
    updateUser: context.updateUser,
    deleteUser: context.deleteUser,
    setUsers: context.setUsers
  };
};

export const useCommonData = () => {
  const context = useData();
  return {
    materialCategories: context.materialCategories,
    buyerTypes: context.buyerTypes,
    colombianDepartments: context.colombianDepartments,
    colombiaDepartmentsAndMunicipalities: context.colombiaDepartmentsAndMunicipalities,
    presentationOptions: context.presentationOptions
  };
};
