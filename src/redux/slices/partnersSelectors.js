// Root state key is "allPartners" (see rootReducer.js).
export const selectPartnersState = (state) => state.allPartners;
export const selectAllPartnersList = (state) => state.allPartners.allPartnersList;
export const selectPartnerDetail = (state) => state.allPartners.partnerDetail;
export const selectStoreServices = (state) => state.allPartners.storeServices;
export const selectAllPayoutLogs = (state) => state.allPartners.allPayoutLogs;
export const selectPartnersLoading = (state) => state.allPartners.loading;
export const selectPartnersError = (state) => state.allPartners.error;
export const selectPartnersSuccess = (state) => state.allPartners.success;
