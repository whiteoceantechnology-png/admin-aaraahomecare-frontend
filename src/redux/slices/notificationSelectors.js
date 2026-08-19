// Root state key is "allNotification" (see rootReducer.js).
export const selectNotificationState = (state) => state.allNotification;
export const selectAllNotificationList = (state) =>
  state.allNotification.allNotificationList;
export const selectNotificationLoading = (state) => state.allNotification.loading;
export const selectNotificationError = (state) => state.allNotification.error;
