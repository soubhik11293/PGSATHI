import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ServiceCategory, ProviderProfile, HomemakerProfile, Booking, FoodOrder, RecurringService } from '../types';
import { AiSearchHero } from '../components/AiSearchHero';
import { CategoryGrid } from '../components/CategoryGrid';
import { ProviderCard } from '../components/ProviderCard';
import { FoodCard } from '../components/FoodCard';
import { 
  Sparkles, Clock, CheckCircle2, AlertCircle, ArrowRight, 
  ShieldCheck, RefreshCw, Star, Calendar, Utensils 
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { currentUser, currentArea, setActiveTab, openReviewModal, showToast } = useApp();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [homemakers, setHomemakers] = useState<HomemakerProfile[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [activeOrders, setActiveOrders] = useState<FoodOrder[]>([]);
  const [recurringSubs, setRecurringSubs] = useState<RecurringService[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [catsRes, provsRes, hmsRes, bksRes, ordsRes, recRes] = await Promise.all([
        api.getCategories(),
        api.getProviders({ area: currentArea }),
        api.getHomemakers({ area: currentArea }),
        api.getBookings(currentUser.id),
        api.getFoodOrders(currentUser.id),
        api.getRecurringSubscriptions(currentUser.id)
      ]);

      setCategories(catsRes.categories || []);
      setProviders(provsRes.providers || []);
      setHomemakers(hmsRes.homemakers || []);
      setActiveBookings((bksRes.bookings || []).filter(b => !['COMPLETED', 'CANCELLED'].includes(b.status)));
      setActiveOrders((ordsRes.orders || []).filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)));
      setRecurringSubs((recRes.subscriptions || []).filter(r => r.status === 'active'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentArea, currentUser]);

  const handleCancelBooking = async (id: string) => {
    if (!currentUser) return;
    try {
      await api.cancelBooking(id, 'Student cancelled', currentUser.id);
      showToast('Booking cancelled', 'info');
      loadData();
    } catch (err) {
      showToast('Could not cancel booking', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Hero AI Search */}
      <AiSearchHero />

      {/* 2. Active Orders & Bookings Live Tracker (If Any) */}
      {(activeBookings.length > 0 || activeOrders.length > 0) && (
        <div className="bg-amber-50/50 rounded-3xl p-6 border border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-extrabold text-base text-zinc-900">
                Active Live Bookings & Food Orders
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('bookings')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              <span>View History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active Service Bookings */}
            {activeBookings.map((bk) => (
              <div
                key={bk.id}
                className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-500">
                      {bk.bookingCode}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                      ● {bk.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-zinc-900 mt-1">
                    {bk.serviceTitle}
                  </h4>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    with {bk.providerName} • ₹{bk.price}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{bk.scheduledDate} at {bk.scheduledTime}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 truncate max-w-[160px]">
                    📍 {bk.pgName}
                  </span>
                  <button
                    onClick={() => handleCancelBooking(bk.id)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}

            {/* Active Food Orders */}
            {activeOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-500">
                      {ord.orderCode}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                      🍲 {ord.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-zinc-900 mt-1">
                    {ord.packageTitle || ord.items[0]?.name}
                  </h4>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    from {ord.kitchenName} • ₹{ord.grandTotal}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span>ETA: {ord.deliveryTimeSlot}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                    📍 Delivery to {ord.pgName}
                  </span>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800"
                  >
                    Track Live
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Service Categories */}
      <section>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">
              Essential PG Services
            </h3>
            <p className="text-xs text-zinc-500">
              Select category to book on-demand or schedule regular help
            </p>
          </div>
          <button
            onClick={() => setActiveTab('explore')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800"
          >
            All Categories →
          </button>
        </div>

        <CategoryGrid categories={categories} />
      </section>

      {/* 4. Active Recurring Subscriptions Banner (If Any) */}
      {recurringSubs.length > 0 && (
        <section className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-3xl p-5 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              🔄
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                Recurring Subscription Active
              </span>
              <h4 className="font-extrabold text-sm text-zinc-900">
                {recurringSubs[0].title}
              </h4>
              <p className="text-xs text-zinc-600">
                Next delivery: <strong>{recurringSubs[0].nextDeliveryDate}</strong> • with {recurringSubs[0].providerName}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('bookings')}
            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            Manage Subscription
          </button>
        </section>
      )}

      {/* 5. Top Homemakers & Tiffin Providers */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🍱</span>
              <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">
                Fresh Homemade Food in {currentArea}
              </h3>
            </div>
            <p className="text-xs text-zinc-500">
              Cooked by verified local mothers & homemakers. 100% hygiene home kitchens.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('food')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800"
          >
            Explore Menus →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {homemakers.slice(0, 3).map((hm) => (
            <FoodCard key={hm.id} homemaker={hm} />
          ))}
        </div>
      </section>

      {/* 6. Verified Technicians & Handymen */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔧</span>
              <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">
                Nearby Verified PG Handymen & Technicians
              </h3>
            </div>
            <p className="text-xs text-zinc-500">
              Background & Police checked, guaranteed 15-30 min arrival in {currentArea}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('explore')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800"
          >
            View All Providers →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {providers.slice(0, 3).map((prov) => (
            <ProviderCard key={prov.id} provider={prov} />
          ))}
        </div>
      </section>

      {/* 7. Safety & Trust Guarantee Banner */}
      <div className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h4 className="font-black text-lg text-white">The PG Saathi Student Trust Shield</h4>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Every service professional is Aadhaar & Police verified before entering hostel premises. Payments are held in escrow until your service or food delivery is completed to your satisfaction.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-center">
          <div className="bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
            <span className="text-xl font-black text-emerald-400 block">100%</span>
            <span className="text-[10px] text-zinc-400 font-semibold uppercase">Verified Staff</span>
          </div>
          <div className="bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
            <span className="text-xl font-black text-amber-400 block">4.8★</span>
            <span className="text-[10px] text-zinc-400 font-semibold uppercase">Average Rating</span>
          </div>
          <div className="bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
            <span className="text-xl font-black text-blue-400 block">15m</span>
            <span className="text-[10px] text-zinc-400 font-semibold uppercase">Avg Response</span>
          </div>
        </div>
      </div>
    </div>
  );
};
