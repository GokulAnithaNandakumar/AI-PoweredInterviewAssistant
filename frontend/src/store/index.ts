import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authSlice from './slices/authSlice';
import interviewSlice from './slices/interviewSlice';
import dashboardSlice from './slices/dashboardSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'interview'], // Only persist auth and interview state
};

const rootReducer = {
  auth: persistReducer(persistConfig, authSlice),
  interview: persistReducer(persistConfig, interviewSlice),
  dashboard: dashboardSlice,
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;