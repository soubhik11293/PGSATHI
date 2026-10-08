import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ProviderProfile, Booking } from '../types';
import { 
  Wrench, ShieldCheck, Clock, MapPin, CheckCircle2, 
  RefreshCw, Power, Phone, Loader2 
} from 'lucide-react';

export const ProviderDashboard: React.FC = () => {
  const { currentUser, showToast, refreshNotifications } = useApp();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadProviderData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const provRes = await api.getProvider(currentUser.id);
      if (provRes.provider) {
        setProvider(provRes.provider);
        setIsOnline(provRes.provider.isOnline);
      }

      const bksRes = await api.getBookings(currentUser.id);
      setBookings(bksRes.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviderData();
  }, [currentUser]);

  const handleToggleOnline = async () => {
    if (!provider || !currentUser) return;
    const nextState = !isOnline;
    try {
      await api.updateProviderStatus(provider.id, nextState, provider.acceptInstantBookings, currentUser.id);
      setIsOnline(nextState);
      showToast(`You are now ${nextState ? 'ONLINE (accepting jobs)' : 'OFFLINE'}`, 'info');
    } catch (err) {
      showToast('Error toggling status', 'error');
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    if (!currentUser) return;
    try {
      await api.updateBookingStatus(bookingId, status, `Provider marked ${status}`, currentUser.id);
      showToast(`Status updated to ${status.replace(/_/g, ' ')}`, 'success');
      loadProviderData();
      refreshNotifications();
    } catch (err) {
      showToast('Could not update status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
        <p className="text-xs text-zinc-500">Loading technician portal...</p>
      </div>
    );
  }

  const activeBookings = bookings.filter(b => !['COMPLETED', 'CANCELLED'].includes(b.status));
  const completedJobs = bookings.filter(b => b.status === 'COMPLETED');
  const totalEarnings = bookings.filter(b => b.paymentStatus === 'SUCCESS').reduce((sum, b) => sum + b.price, 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-black/20 text-xs font-bold text-blue-200 uppercase tracking-wider">
              {provider?.categorySlug || 'Technician'} Portal
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> Police & ID Verified
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            {provider?.name || currentUser?.name}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            Specialist in {provider?.categorySlug} • Service Radius: {provider?.radiusKm || 7}km in {provider?.serviceArea}
          </p>
        </div>

        {/* Stats & Online Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleToggleOnline}
            className={`px-4 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>

          <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3 rounded-2xl text-center min-w-[85px]">
            <span className="text-lg font-black text-white block">₹{totalEarnings}</span>
            <span className="text-[10px] uppercase font-bold text-blue-200">Earnings</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3 rounded-2xl text-center min-w-[85px]">
            <span className="text-lg font-black text-white block">{completedJobs.length}</span>
            <span className="text-[10px] uppercase font-bold text-blue-200">Jobs Done</span>
          </div>
        </div>
      </div>

      {/* Active Service Bookings Queue */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-zinc-900">
              Active Service Visits ({activeBookings.length})
            </h3>
            <p className="text-xs text-zinc-500">
              Job progress pipeline: Accepted → Scheduled → On the Way → In Progress → Completed
            </p>
          </div>
          <button
            onClick={loadProviderData}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {activeBookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-zinc-200">
            <span className="text-3xl block mb-2">⚡</span>
            <h4 className="font-bold text-base text-zinc-900">No active visits right now</h4>
            <p className="text-xs text-zinc-500 mt-1">
              Keep your status Online to receive immediate hostel dispatch requests.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeBookings.map((bk) => (
              <div
                key={bk.id}
                className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-500">{bk.bookingCode}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 uppercase">
                      ● {bk.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 uppercase">
                      ⚡ {bk.urgency} urgency
                    </span>
                  </div>

                  <h4 className="font-extrabold text-base text-zinc-900">
                    {bk.serviceTitle}
                  </h4>

                  <div className="text-xs text-zinc-600 flex flex-wrap items-center gap-3">
                    <span>Student: <strong>{bk.studentName}</strong> ({bk.studentPhone})</span>
                    <span>•</span>
                    <span>Schedule: <strong>{bk.scheduledDate} at {bk.scheduledTime}</strong></span>
                    <span>•</span>
                    <span>Price: <strong>₹{bk.price}</strong></span>
                  </div>

                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span><strong>{bk.pgName}</strong>: {bk.address}</span>
                  </p>
                </div>

                {/* Status Advancement Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100">
                  {bk.status === 'REQUESTED' && (
                    <button
                      onClick={() => handleUpdateBookingStatus(bk.id, 'ACCEPTED')}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Accept Request
                    </button>
                  )}

                  {bk.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleUpdateBookingStatus(bk.id, 'SCHEDULED')}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Confirm Schedule
                    </button>
                  )}

                  {bk.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleUpdateBookingStatus(bk.id, 'ON_THE_WAY')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      I Am On The Way
                    </button>
                  )}

                  {bk.status === 'ON_THE_WAY' && (
                    <button
                      onClick={() => handleUpdateBookingStatus(bk.id, 'IN_PROGRESS')}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Start Repair (In Progress)
                    </button>
                  )}

                  {bk.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleUpdateBookingStatus(bk.id, 'COMPLETED')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Mark Job Completed ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Skills & Information */}
      <section className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs space-y-3">
        <h3 className="font-extrabold text-base text-zinc-900">
          Your Registered Skills & Base Charges
        </h3>
        <div className="flex flex-wrap gap-2">
          {provider?.skills.map((s, idx) => (
            <span key={idx} className="px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-semibold">
              🔧 {s}
            </span>
          ))}
        </div>
        <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-100 flex items-center justify-between">
          <span>Inspection Base Price: <strong>₹{provider?.basePrice}</strong></span>
          <span>Response Promise: <strong>~{provider?.responseTime}</strong></span>
        </div>
      </section>
    </div>
  );
};
