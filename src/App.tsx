import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { StudentLookup } from './components/StudentLookup';
import { getAppLogo } from './lib/db';
import { isSupabaseConfigured } from './lib/supabase';

type View = 'lookup' | 'admin-login' | 'admin';

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
      {view === 'lookup' && <StudentLookup logo={logo} onAdmin={() => setView('admin-login')} />}
      {view === 'admin-login' && (
        <AdminLogin logo={logo} onBack={() => setView('lookup')} onSuccess={() => setView('admin')} />
      )}
      {view === 'admin' && (
        <AdminDashboard
          logo={logo}
          onLogoChange={setLogo}
          onLogout={() => setView('lookup')}
        />
      )}
    </main>
  );
}
