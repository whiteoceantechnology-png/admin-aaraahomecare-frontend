// rootReducer.js
import { combineReducers } from "redux";

import adminReducer from "./slices/adminSlice";
import profileReducer from "./slices/profileSlice";
import dashboardReducer from "./slices/dashboardSlice";
import allUsersReducer from "./slices/allUsersSlice";
import partnerReducer from "./slices/partnersSlice";
import categoryReducer from "./slices/categorySlice";
import brandReducer from "./slices/brandSlice";
import notificationReducer from "./slices/notificationSlice";
import bannerReducer from "./slices/bannerSlice";
import couponReducer from "./slices/couponSlice";
import refundReducer from "./slices/refundSlice";
import subscriptionReducer from "./slices/subscriptionSlice";
import reviewReducer from "./slices/reviewSlice";
import imageReducer from "./slices/imageSlice";
import taxReducer from "./slices/taxSlice";
import productReducer from "./slices/productSlice";
import variantReducer from "./slices/variantSlice";
import authReducer from "./slices/authSlice";
import customerReducer from "./slices/customerSlice";
import orderReducer from "./slices/orderSlice";
import inventoryReducer from "./slices/inventorySlice";
import paymentReducer from "./slices/paymentSlice";
import logisticsReducer from "./slices/logisticsSlice";

const rootReducer = combineReducers({
  admin: adminReducer,
  profile: profileReducer,
  dashboard: dashboardReducer,
  allUsers: allUsersReducer,
  allPartners: partnerReducer,
  category: categoryReducer,
  brand: brandReducer,
  allNotification: notificationReducer,
  allBanners: bannerReducer,
  allCoupons: couponReducer,
  allRefunds: refundReducer,
  allSubscriptions: subscriptionReducer,
  allReviews: reviewReducer,
  image: imageReducer,
  taxes: taxReducer,
  product: productReducer,
  variant: variantReducer,
  auth: authReducer,
  customer: customerReducer,
  order: orderReducer,
  inventory: inventoryReducer,
  payment: paymentReducer,
  logistics: logisticsReducer,
});

export default rootReducer;
