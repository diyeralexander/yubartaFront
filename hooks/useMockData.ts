/**
 * useMockData.ts - Legacy Compatibility Layer
 *
 * This file now re-exports from useData.ts which connects to the backend API.
 * Kept for backward compatibility with existing imports.
 */

export {
  // Data Provider
  DataProvider,
  useData,

  // Specialized hooks
  useNotificationStats,
  useSourcing,
  useMarketplace,
  useAuth,
  useCommonData,

  // Static data exports
  materialCategories,
  buyerTypes,
  colombiaDepartmentsAndMunicipalities,
  colombianDepartments
} from './useData';
