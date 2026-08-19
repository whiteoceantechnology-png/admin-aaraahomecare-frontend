// Root state key is "allRefunds" (see rootReducer.js).
export const selectRefundState = (state) => state.allRefunds;
export const selectAllRefundsList = (state) => state.allRefunds.allRefundsList;
export const selectRefundLoading = (state) => state.allRefunds.loading;
export const selectRefundError = (state) => state.allRefunds.error;
