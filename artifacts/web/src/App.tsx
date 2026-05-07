import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LockScreen from "@/pages/LockScreen";
import type { WearableSource, VerifyPayload } from "@/pages/LockScreen";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";
import PrivyProviderWrapper from "@/providers/PrivyProviderWrapper";
import OnchainKitProviderWrapper from "@/providers/OnchainKitProviderWrapper";
import SolanaProviderWrapper from "@/providers/SolanaProviderWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePrivySafe } from "@/hooks/use-privy-safe";
import "@coinbase/onchainkit/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRouter() {
  const [location, setLocation] = useLocation();
  const privy = usePrivySafe();

  // 'genosync_nullifier' is a persistent identity (World ID public key — never deleted).
  // 'genosync_session' is cleared on logout so a page refresh after locking requires re-verification.
  const [nullifierHash, setNullifierHash] = useState<string | null>(() => {
    const hasSession = sessionStorage.getItem('genosync_session') === '1';
    return hasSession ? localStorage.getItem('genosync_nullifier') : null;
  });
  const [bioSourceConnected, setBioSourceConnected] = useState<boolean>(() => {
    return localStorage.getItem('genosync_bio_source') === 'connected';
  });
  const [wearableSource, setWearableSource] = useState<WearableSource>(() => {
    return (localStorage.getItem('genosync_wearable') as WearableSource) || 'demo';
  });
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    const hasSession = sessionStorage.getItem('genosync_session') === '1';
    return hasSession ? localStorage.getItem('genosync_wallet_address') : null;
  });

  const handleVerify = (payload: VerifyPayload) => {
    setNullifierHash(payload.nullifierHash);
    setBioSourceConnected(payload.bioSourceConnected);
    setWearableSource(payload.wearableSource);
    setWalletAddress(payload.walletAddress);
    localStorage.setItem('genosync_nullifier', payload.nullifierHash);
    localStorage.setItem('genosync_bio_source', payload.bioSourceConnected ? 'connected' : 'demo');
    localStorage.setItem('genosync_wearable', payload.wearableSource);
    if (payload.walletAddress) {
      localStorage.setItem('genosync_wallet_address', payload.walletAddress);
    }
    sessionStorage.setItem('genosync_session', '1');
    setLocation("/dashboard");
  };

  const handleLogout = async () => {
    // Logout from Privy wallet if connected
    if (privy.privyAvailable && privy.authenticated) {
      try { await privy.logout(); } catch { /* ignore */ }
    }
    setNullifierHash(null);
    setBioSourceConnected(false);
    setWearableSource('demo');
    setWalletAddress(null);
    sessionStorage.removeItem('genosync_session');
    localStorage.removeItem('genosync_bio_source');
    localStorage.removeItem('genosync_wearable');
    localStorage.removeItem('genosync_wallet_address');
    setLocation("/");
  };

  useEffect(() => {
    if (nullifierHash && location === "/") {
      setLocation("/dashboard");
    } else if (!nullifierHash && location !== "/") {
      setLocation("/");
    }
  }, [nullifierHash, location, setLocation]);

  return (
    <Switch>
      <Route path="/">
        <LockScreen onVerify={handleVerify} />
      </Route>
      <Route path="/dashboard">
        {nullifierHash ? (
          <Dashboard
            nullifierHash={nullifierHash}
            bioSourceConnected={bioSourceConnected}
            wearableSource={wearableSource}
            walletAddress={walletAddress}
            onLogout={handleLogout}
          />
        ) : (
          <LockScreen onVerify={handleVerify} />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProviderWrapper>
          <SolanaProviderWrapper>
            <PrivyProviderWrapper>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <AppRouter />
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </PrivyProviderWrapper>
          </SolanaProviderWrapper>
        </OnchainKitProviderWrapper>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
