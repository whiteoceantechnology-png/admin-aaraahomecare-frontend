// Root state key is "allCoupons" (see rootReducer.js).
export const selectCouponState = (state) => state.allCoupons;
export const selectAllCouponsList = (state) => state.allCoupons.allCouponsList;
export const selectCouponLoading = (state) => state.allCoupons.loading;
export const selectCouponError = (state) => state.allCoupons.error;
