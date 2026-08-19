// Root state key is "allSubscriptions" (see rootReducer.js).
export const selectSubscriptionState = (state) => state.allSubscriptions;
export const selectAllSubscriptionsList = (state) =>
  state.allSubscriptions.allSubscriptionsList;
export const selectSubscriptionLoading = (state) => state.allSubscriptions.loading;
export const selectSubscriptionError = (state) => state.allSubscriptions.error;
