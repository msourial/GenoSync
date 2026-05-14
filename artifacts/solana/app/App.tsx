// Solana RN polyfills — must come before any @solana/web3.js import.
// `get-random-values` shims crypto.getRandomValues (web3.js needs it for keypair gen);
// `url-polyfill` shims URL/URLSearchParams (web3.js parses RPC URLs at module load).
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Solana Mobile Stack
import { MobileWalletAdapterProvider } from './src/solana/MobileWalletAdapter';
import { ConnectionProvider } from './src/solana/ConnectionProvider';

// Navigation
import { BottomTabNavigator } from './src/navigation/BottomTabs';

// Screens
import { LockScreen } from './src/screens/LockScreen';

// Stores
import { useAuthStore } from './src/stores/authStore';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

const RootNavigator = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Lock" component={LockScreen} />
      ) : (
        <Stack.Screen name="Main" component={BottomTabNavigator} />
      )}
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ConnectionProvider>
            <MobileWalletAdapterProvider>
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
            </MobileWalletAdapterProvider>
          </ConnectionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
