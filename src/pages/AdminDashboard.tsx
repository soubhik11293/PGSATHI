import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { 
  Shield, Users, DollarSign, CheckCircle2, AlertTriangle, 
  Settings, Sliders, RefreshCw, Star, ArrowUpRight, Loader2 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [providersList, setProvidersList] = useState<{ serviceProviders: any[]; homemakers: any[] }>({ serviceProviders: [], homemakers: [] });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [weights, setWeights] = useState({
    serviceRelevance: 0.30,
    availability: 0.20,
    rating: 0.15,
    distance: 0.15,
    price: 0.10,
    reliability: 0.10
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'disputes' | 'weights'>('overview');

  const loadAdminData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [dashRes, provRes, usersRes] = await Promise.all([
        api.getAdminDashboard(currentUser.id),
        api.getAdminProviders(currentUser.id),
        api.getAdminUsers(currentUser.id)
      ]);
      setDashboardData(dashRes);
      setProvidersList(provRes);
      setUsersList(usersRes.users || []);
      if (dashRes.matchingWeights) {
        setWeights(dashRes.matchingWeights);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [currentUser]);

  const handleVerifyProvider = async (providerId: string, status: string) => {
    if (!currentUser) return;
    try {
      await api.verifyProvider(providerId, status, currentUser.id);
      showToast(`Provider status set to ${status}`, 'success');
      loadAdminData();
    } catch (err) {
      showToast('Error changing provider status', 'error');
    }
  };

  const handleSaveWeights = async () => {
    if (!currentUser) return;
    try {
      await api.updateMatchingWeights(weights, currentUser.id);
      showToast('Matching algorithm weights updated in real time!', 'success');
    } catch (err) {
      showToast('Error updating weights', 'error');
    }
  };

  const handleResolveComplaint = async (complaintId: string, status: string) => {
    if (!currentUser) return;
    try {
      await api.resolveComplaint(complaintId, status, 'Resolved by Platform Ops Lead', currentUser.id);
      showToast(`Dispute marked ${status}`, 'info');
      loadAdminData();
    } catch (err) {
      showToast('Failed to resolve dispute', 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
        <p className="text-xs text-zinc-500">Loading platform admin telemetry...</p>
      </div>
    );
  }

  const m = dashboardData?.metrics || {};

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-zinc-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-xs font-bold uppercase tracking-wider border border-purple-400/30">
              Operations & Trust Lead Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            PG Saathi Platform Admin
          </h1>
          <p className="text-xs text-purple-200 mt-1">
            Bangalore Regional Network • Monitoring students, homemakers, service partners & safety
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 text-xs font-bold self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Realtime</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
            Total GMV Revenue
          </span>
          <span className="text-2xl font-black text-zinc-900 block mt-1">
            ₹{m.totalRevenue?.toLocaleString('en-IN') || 0}
          </span>
          <span className="text-xs font-bold text-emerald-600 mt-1 block">
            ₹{m.platformCommission?.toLocaleString('en-IN') || 0} Platform Take (10%)
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
            Active Students
          </span>
          <span className="text-2xl font-black text-zinc-900 block mt-1">
            {m.activeStudents || 0}
          </span>
          <span className="text-xs text-zinc-500 mt-1 block">
            Across 24 Hostels & PGs
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
            Total Bookings & Meals
          </span>
          <span className="text-2xl font-black text-zinc-900 block mt-1">
            {m.totalBookings || 0}
          </span>
          <span className="text-xs font-bold text-blue-600 mt-1 block">
            {m.completedBookings || 0} Completed ({Math.round(((m.completedBookings || 1) / (m.totalBookings || 1)) * 100)}%)
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">
            Trust & Quality Rating
          </span>
          <span className="text-2xl font-black text-amber-500 block mt-1">
            {m.averageRating || 4.86}★
          </span>
          <span className={`text-xs font-bold mt-1 block ${m.openComplaints > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {m.openComplaints || 0} Open Student Dispute(s)
          </span>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-zinc-200 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'text-purple-700 border-b-2 border-purple-700'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Service Demographics
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === 'providers'
              ? 'text-purple-700 border-b-2 border-purple-700'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Provider Verification Queue ({providersList.serviceProviders.length + providersList.homemakers.length})
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === 'disputes'
              ? 'text-purple-700 border-b-2 border-purple-700'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Complaints & Safety ({dashboardData?.complaints?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('weights')}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === 'weights'
              ? 'text-purple-700 border-b-2 border-purple-700'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Configurable AI Matching Engine
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Most requested categories */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-zinc-900">
              Popular Service Distribution
            </h3>
            <div className="space-y-3">
              {(dashboardData?.popularCategories || []).map((cat: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-zinc-700">
                    <span>{cat.name}</span>
                    <span>{cat.count} requests ({cat.share}%)</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${cat.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User registry preview */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-base text-zinc-900">
              Registered Accounts Registry
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {usersList.map((u: any) => (
                <div key={u.id} className="p-3 bg-zinc-50 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-900 block">{u.name}</span>
                    <span className="text-[11px] text-zinc-500">{u.email} • {u.area}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                    u.role === 'student' ? 'bg-emerald-100 text-emerald-800' :
                    u.role === 'homemaker' ? 'bg-amber-100 text-amber-800' :
                    u.role === 'provider' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-zinc-900">
            Provider Identity & Background Check Console
          </h3>
          <p className="text-xs text-zinc-500">
            Only Verified providers appear in student search results. Suspend bad actors instantly.
          </p>

          <div className="space-y-3">
            {/* Service Providers */}
            {providersList.serviceProviders.map((p: any) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900">{p.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                      {p.categorySlug}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      p.verifiedStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                      p.verifiedStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {p.verifiedStatus}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {p.experienceYears} yrs exp • {p.completedJobs} jobs done • Rating: {p.rating}★
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerifyProvider(p.id, 'VERIFIED')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Approve / Verify
                  </button>
                  <button
                    onClick={() => handleVerifyProvider(p.id, 'SUSPENDED')}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Suspend Partner
                  </button>
                </div>
              </div>
            ))}

            {/* Homemakers */}
            {providersList.homemakers.map((h: any) => (
              <div
                key={h.id}
                className="p-4 rounded-2xl border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900">{h.kitchenName}</span>
                    <span className="text-[10px] font-semibold text-zinc-500">by {h.ownerName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      h.verifiedStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {h.verifiedStatus}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    FSSAI: {h.fssaiNumber} • {h.completedOrders} orders • Rating: {h.rating}★
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerifyProvider(h.id, 'VERIFIED')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Approve / Verify
                  </button>
                  <button
                    onClick={() => handleVerifyProvider(h.id, 'SUSPENDED')}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Suspend Kitchen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'disputes' && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-zinc-900">
            Student Dispute & Complaint Tickets
          </h3>
          <p className="text-xs text-zinc-500">
            Investigate complaints and resolve escrow payments.
          </p>

          <div className="space-y-3">
            {(dashboardData?.complaints || []).length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">Zero disputes logged.</p>
            ) : (
              (dashboardData?.complaints || []).map((c: any) => (
                <div key={c.id} className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-600">{c.ticketId}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 uppercase">
                        {c.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        {c.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      Reported by {c.reporterName} against {c.reportedName}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-700 font-medium">"{c.description}"</p>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
                    <button
                      onClick={() => handleResolveComplaint(c.id, 'RESOLVED')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Mark Resolved (Refund / Warning)
                    </button>
                    <button
                      onClick={() => handleResolveComplaint(c.id, 'DISMISSED')}
                      className="px-3 py-1.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-bold cursor-pointer"
                    >
                      Dismiss Ticket
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'weights' && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs space-y-5">
          <div>
            <h3 className="font-extrabold text-base text-zinc-900">
              Provider Matching Engine Weight Tuning
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Adjust how the recommendation algorithm scores candidates in the AI Assistant search box.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
              <div className="flex justify-between font-bold text-zinc-800">
                <span>Service Relevance</span>
                <span>{Math.round(weights.serviceRelevance * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.60"
                step="0.05"
                value={weights.serviceRelevance}
                onChange={(e) => setWeights({ ...weights, serviceRelevance: parseFloat(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
              <div className="flex justify-between font-bold text-zinc-800">
                <span>Availability & Capacity</span>
                <span>{Math.round(weights.availability * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={weights.availability}
                onChange={(e) => setWeights({ ...weights, availability: parseFloat(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
              <div className="flex justify-between font-bold text-zinc-800">
                <span>Rating & Reviews</span>
                <span>{Math.round(weights.rating * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.40"
                step="0.05"
                value={weights.rating}
                onChange={(e) => setWeights({ ...weights, rating: parseFloat(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
              <div className="flex justify-between font-bold text-zinc-800">
                <span>Distance / Hostel Zone Proximity</span>
                <span>{Math.round(weights.distance * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.40"
                step="0.05"
                value={weights.distance}
                onChange={(e) => setWeights({ ...weights, distance: parseFloat(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
              <div className="flex justify-between font-bold text-zinc-800">
                <span>Price Competitiveness</span>
                <span>{Math.round(weights.price * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.05"
                value={weights.price}
                onChange={(e) => setWeights({ ...weights, price: parseFloat(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
              <div className="flex justify-between font-bold text-zinc-800">
                <span>Reliability & Police Clearance</span>
                <span>{Math.round(weights.reliability * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.05"
                value={weights.reliability}
                onChange={(e) => setWeights({ ...weights, reliability: parseFloat(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>
          </div>

          <button
            onClick={handleSaveWeights}
            className="px-6 py-3 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            Apply Algorithmic Weights
          </button>
        </div>
      )}
    </div>
  );
};
