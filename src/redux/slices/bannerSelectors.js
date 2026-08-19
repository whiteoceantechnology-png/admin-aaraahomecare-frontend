// Root state key is "allBanners" (see rootReducer.js) even though the slice name is "allActiveBanners".
export const selectBannerState = (state) => state.allBanners;
export const selectAllActiveBanners = (state) => state.allBanners.allActiveBanners;
export const selectBannerLoading = (state) => state.allBanners.loading;
export const selectBannerError = (state) => state.allBanners.error;
