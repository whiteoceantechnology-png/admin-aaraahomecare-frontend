// Root state key is "taxes" (see rootReducer.js) even though the slice name is "tax".
export const selectTaxState = (state) => state.taxes;
export const selectAllTaxes = (state) => state.taxes.taxes;
export const selectTaxLoading = (state) => state.taxes.loading;
export const selectTaxError = (state) => state.taxes.error;
