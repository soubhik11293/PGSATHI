import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { StudentDashboard } from './pages/StudentDashboard';
import { ExploreProviders } from './pages/ExploreProviders';
import { FoodMarketplace } from './pages/FoodMarketplace';
import { BookingsPage } from './pages/BookingsPage';
import { HomemakerDashboard } from './pages/HomemakerDashboard';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AuthPage } from './pages/AuthPage';
import { BookingModal } from './components/BookingModal';
import { FoodOrderModal } from './components/FoodOrderModal';
import { ReviewModal } from './components/ReviewModal';
import { ReportModal } from './components/ReportModal';
import { AiChatDrawer } from './components/AiChatDrawer';
import { Sparkles, ShieldCheck, Heart, Coffee } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab, toast, currentUser, setAiChatOpen } = useApp();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans selection:bg-amber-200">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-zinc-700 flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <span className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-400'}`} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'home' && <StudentDashboard />}
        {activeTab === 'explore' && <ExploreProviders />}
        {activeTab === 'food' && <FoodMarketplace />}
        {activeTab === 'bookings' && <BookingsPage />}
        {activeTab === 'homemaker-dash' && <HomemakerDashboard />}
        {activeTab === 'provider-dash' && <ProviderDashboard />}
        {activeTab === 'admin' && <AdminDashboard />}
        {activeTab === 'auth' && <AuthPage onComplete={() => setActiveTab('home')} />}
      </main>

      {/* Floating AI Action Button on Mobile/Desktop */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setAiChatOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
          <span>Ask Saathi AI</span>
        </button>
      </div>

      {/* Modals & Drawers */}
      <BookingModal />
      <FoodOrderModal />
      <ReviewModal />
      <ReportModal />
      <AiChatDrawer />

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 mt-auto py-10 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">
              PG
            </div>
            <span className="font-extrabold text-zinc-900 text-sm">PG Saathi</span>
            <span>— Everything your PG life needs, in one place.</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <span>🛡️ Escrow Protected</span>
            <span>•</span>
            <span>🇮🇳 Built for Indian PG Hostels</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">100% Verified Partners</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
