// store.js
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage"; // Uses localStorage by default

import rootReducer from "./rootReducer";

const persistConfig = {
  key: "root", // key for localStorage
  storage,
  whitelist: ["class", "student"], // only persist these slices
};

// Wrap the rootReducer with persistReducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with persisted reducer
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // required for redux-persist to work with non-serializable actions
    }),
});

// Export store and persistor
export const persistor = persistStore(store);
export default store;
