import { useEffect, useState } from 'react';
import { AdminDashboardWithExports } from './components/AdminDashboardWithExports';
import { AdminLogin } from './components/AdminLogin';
import { FinalistConfirmation } from './components/FinalistConfirmation';
import { StudentLookup } from './components/StudentLookup';
import { getAppLogo } from './lib/db';
import { isSupabaseConfigured } from './lib/supabase';
import './finalists.css';

type View = 'lookup' | 'finalists' | 'admin-login' | 'admin';

export default function App() {
  const [view, setView] = useState<View>('lookup');
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getAppLogo().then((savedLogo) => {
      if (savedLogo) setLogo(savedLogo);
    }).catch(() => {
      // Keep the default public logo if settings table is not ready yet.
    });
  }, []);

  return (
    <main className="app-shell">
      {view === 'lookup' && (
        <>
          <StudentLookup logo={logo} onAdmin={() => setView('admin-login')} />
          <button type="button" className="finalist-floating-button" onClick={() => setView('finalists')}>
            Live Finalists — Confirm Details
          </button>
        </>
      )}
      {view === 'finalists' && (
        <FinalistConfirmation
          logo={logo}
          onBack={() => setView('lookup')}
          onAdmin={() => setView('admin-login')}
        />
      )}
      {view === 'admin-login' && (
        <AdminLogin logo={logo} onBack={() => setView('lookup')} onSuccess={() => setView('admin')} />
      )}
      {view === 'admin' && (
        <AdminDashboardWithExports
          logo={logo}
          onLogoChange={setLogo}
          onLogout={() => setView('lookup')}
        />
      )}
    </main>
  );
}
