import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import AllUsers from "../components/data/AllUsers";
import Product from "../components/data/Product";
import Variant from "../components/data/Variant";
import Order from "../components/data/Order";
import Stock from "../components/data/Stock";
import Customer from "../components/data/Customer";

// Lazy-loaded components
const DashboardPage = lazy(
  () => import("../components/dashboard/DashboardPage"),
);
const Admin = lazy(() => import("../components/data/Admin"));
const Auth = lazy(() => import("../components/auth/AuthPages"));
const UserDetails = lazy(() => import("../components/details/UserDetails"));
const Partner = lazy(() => import("../components/data/partner"));
const PartnerDetails = lazy(
  () => import("../components/details/PartnerDetails"),
);
const StoreServices = lazy(() => import("../components/details/StoreServices"));
const Category = lazy(() => import("../components/data/Category"));
const Notification = lazy(() => import("../components/data/Notification"));
const Banner = lazy(() => import("../components/data/Banner"));
const Coupon = lazy(() => import("../components/data/Coupon"));
const Subscription = lazy(() => import("../components/data/Subscription"));
const Review = lazy(() => import("../components/data/Review"));

const AppRoutes = () => {
  const token = localStorage.getItem("token");

  return (
    <Suspense
      fallback={
        <div className="text-center p-4 min-h-screen flex justify-center items-center">
          Loading...
        </div>
      }
    >
      <Routes>
        {/* LOGIN PAGE */}
        <Route
          path="/auth"
          element={token ? <Navigate to="/" replace /> : <Auth />}
        />

        {/* ALL PROTECTED ROUTES */}
        <Route
          path="/"
          element={
            token ? (
              <DashboardPage title="DashboardPage" />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />

        <Route
          path="/admin"
          element={token ? <Admin title="Admin" /> : <Navigate to="/auth" />}
        />

        <Route
          path="/allusers"
          element={token ? <AllUsers title="Users" /> : <Navigate to="/auth" />}
        />

        <Route
          path="/userdetails/:id"
          element={
            token ? (
              <UserDetails title="UserDetails" />
            ) : (
              <Navigate to="/auth" />
            )
          }
        />

        <Route
          path="/partner"
          element={
            token ? <Partner title="Partner" /> : <Navigate to="/auth" />
          }
        />

        <Route
          path="/partnerdetails/:id"
          element={
            token ? (
              <PartnerDetails title="PartnerDetails" />
            ) : (
              <Navigate to="/auth" />
            )
          }
        />

        <Route
          path="/storeservices/:id"
          element={
            token ? (
              <StoreServices title="StoreServices" />
            ) : (
              <Navigate to="/auth" />
            )
          }
        />

        <Route
          path="/category"
          element={
            token ? <Category title="Category" /> : <Navigate to="/auth" />
          }
        />

        <Route
          path="/notification"
          element={
            token ? (
              <Notification title="Notification" />
            ) : (
              <Navigate to="/auth" />
            )
          }
        />

        <Route
          path="/banner"
          element={token ? <Banner title="Banner" /> : <Navigate to="/auth" />}
        />

        <Route
          path="/coupon"
          element={token ? <Coupon title="Coupon" /> : <Navigate to="/auth" />}
        />

        <Route
          path="/product"
          element={
            token ? <Product title="Products" /> : <Navigate to="/auth" />
          }
        />

        <Route
          path="/variant"
          element={
            token ? <Variant title="Variants" /> : <Navigate to="/auth" />
          }
        />

        <Route
          path="/order"
          element={token ? <Order title="Orders" /> : <Navigate to="/auth" />}
        />

        <Route
          path="/stock"
          element={token ? <Stock title="Stock" /> : <Navigate to="/auth" />}
        />

        <Route
          path="/customer"
          element={
            token ? <Customer title="Customers" /> : <Navigate to="/auth" />
          }
        />

        <Route
          path="/subscription"
          element={
            token ? (
              <Subscription title="Subscription" />
            ) : (
              <Navigate to="/auth" />
            )
          }
        />

        <Route
          path="/review"
          element={token ? <Review title="Review" /> : <Navigate to="/auth" />}
        />

        {/* DEFAULT */}
        <Route path="*" element={<Navigate to={token ? "/" : "/auth"} />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
