import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { HomemakerProfile, FoodOrder, MenuItem } from '../types';
import { 
  Utensils, CheckCircle2, Clock, MapPin, Plus, 
  RefreshCw, Star, ShieldCheck, ToggleLeft, ToggleRight, Loader2 
} from 'lucide-react';

export const HomemakerDashboard: React.FC = () => {
  const { currentUser, showToast, refreshNotifications } = useApp();
  const [homemaker, setHomemaker] = useState<HomemakerProfile | null>(null);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Add menu item state
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishMeal, setNewDishMeal] = useState<'lunch' | 'dinner' | 'breakfast'>('dinner');
  const [newDishPrice, setNewDishPrice] = useState(90);
  const [newDishVeg, setNewDishVeg] = useState(true);
  const [newDishContents, setNewDishContents] = useState('4 Phulkas, Dal, Subzi, Rice');

  const loadHomemakerData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const hmRes = await api.getHomemaker(currentUser.id);
      setHomemaker(hmRes.homemaker || null);

      const ordsRes = await api.getFoodOrders(currentUser.id);
      setOrders(ordsRes.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomemakerData();
  }, [currentUser]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!currentUser) return;
    try {
      await api.updateFoodOrderStatus(orderId, newStatus, `Updated by kitchen to ${newStatus}`, currentUser.id);
      showToast(`Order status updated to ${newStatus}`, 'success');
      loadHomemakerData();
      refreshNotifications();
    } catch (err) {
      showToast('Could not update status', 'error');
    }
  };

  const handleUpdateCapacity = async (delta: number) => {
    if (!homemaker || !currentUser) return;
    const newCap = Math.max(5, homemaker.dailyCapacity + delta);
    try {
      await api.updateCapacity(homemaker.id, newCap, currentUser.id);
      setHomemaker(prev => prev ? { ...prev, dailyCapacity: newCap } : null);
      showToast(`Kitchen daily capacity set to ${newCap} meals`, 'info');
    } catch (err) {
      showToast('Error updating capacity', 'error');
    }
  };

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homemaker || !currentUser) return;

    try {
      await api.addMenuItem(homemaker.id, {
        name: newDishName,
        mealType: newDishMeal,
        isVeg: newDishVeg,
        price: newDishPrice,
        contents: newDishContents.split(',').map(s => s.trim())
      }, currentUser.id);

      showToast(`Added "${newDishName}" to menu!`, 'success');
      setShowAddMenu(false);
      setNewDishName('');
      loadHomemakerData();
    } catch (err) {
      showToast('Failed to add dish', 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
        <p className="text-xs text-zinc-500">Loading your kitchen console...</p>
      </div>
    );
  }

  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');
  const totalRevenue = orders.filter(o => o.paymentStatus === 'SUCCESS').reduce((sum, o) => sum + o.grandTotal, 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-black/20 text-xs font-bold text-amber-200">
              Kitchen Partner Portal
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> FSSAI Certified Kitchen
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            {homemaker?.kitchenName || "Sunita's Ghar Ka Khana"}
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 mt-1">
            Chef & Homemaker: <strong>{homemaker?.ownerName || currentUser?.name}</strong> • Serving {homemaker?.serviceArea}
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3.5 rounded-2xl text-center min-w-[90px]">
            <span className="text-xl font-black text-white block">₹{totalRevenue}</span>
            <span className="text-[10px] uppercase font-bold text-amber-200">Earnings</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3.5 rounded-2xl text-center min-w-[90px]">
            <span className="text-xl font-black text-white block">{completedOrders.length}</span>
            <span className="text-[10px] uppercase font-bold text-amber-200">Delivered</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3.5 rounded-2xl text-center min-w-[90px]">
            <span className="text-xl font-black text-white block">{homemaker?.rating || 4.9}★</span>
            <span className="text-[10px] uppercase font-bold text-amber-200">Rating</span>
          </div>
        </div>
      </div>

      {/* Daily Capacity Control Card */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-zinc-900 flex items-center gap-2">
            <span>Daily Kitchen Cooking Capacity</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              {homemaker?.currentCapacityUsed} / {homemaker?.dailyCapacity} Meals Booked Today
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Limit how many meal orders you can prepare each day to maintain fresh home taste and quality.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleUpdateCapacity(-5)}
            className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 font-black text-zinc-700 cursor-pointer"
          >
            -5
          </button>
          <span className="font-black text-base text-zinc-900 px-3">
            {homemaker?.dailyCapacity} max
          </span>
          <button
            onClick={() => handleUpdateCapacity(5)}
            className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 font-black text-white cursor-pointer"
          >
            +5
          </button>
        </div>
      </div>

      {/* Live Orders Queue */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-zinc-900">
              Live Orders Queue ({activeOrders.length})
            </h3>
            <p className="text-xs text-zinc-500">
              Progress meals from Accepted → Preparing → Ready → Delivered
            </p>
          </div>
          <button
            onClick={loadHomemakerData}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-zinc-200">
            <span className="text-3xl block mb-2">✨</span>
            <h4 className="font-bold text-base text-zinc-900">All current orders fulfilled!</h4>
            <p className="text-xs text-zinc-500 mt-1">
              New orders from hostel students will pop up here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-500">{ord.orderCode}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 uppercase">
                      ● {ord.status.replace(/_/g, ' ')}
                    </span>
                    {ord.isRecurring && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                        🔄 7-Day Subscriber
                      </span>
                    )}
                  </div>

                  <h4 className="font-extrabold text-base text-zinc-900">
                    {ord.packageTitle || ord.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                  </h4>

                  <div className="text-xs text-zinc-600 flex flex-wrap items-center gap-3">
                    <span>Student: <strong>{ord.studentName}</strong> ({ord.studentPhone})</span>
                    <span>•</span>
                    <span>Slot: <strong>{ord.deliveryTimeSlot}</strong></span>
                    <span>•</span>
                    <span>Total: <strong>₹{ord.grandTotal}</strong></span>
                  </div>

                  <p className="text-xs text-zinc-500">
                    📍 Delivery Address: <strong>{ord.pgName}</strong>, {ord.deliveryAddress}
                  </p>
                </div>

                {/* Status Advancement Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100">
                  {ord.status === 'PLACED' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'ACCEPTED')}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Accept Order
                    </button>
                  )}

                  {ord.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                      className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Start Cooking (Preparing)
                    </button>
                  )}

                  {ord.status === 'PREPARING' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'READY')}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Food Packed & Ready
                    </button>
                  )}

                  {ord.status === 'READY' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'OUT_FOR_DELIVERY')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Out for Delivery
                    </button>
                  )}

                  {ord.status === 'OUT_FOR_DELIVERY' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'DELIVERED')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Mark as Delivered ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Menu Manager Section */}
      <section className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-zinc-900">
              Kitchen Menu & Packages
            </h3>
            <p className="text-xs text-zinc-500">
              Dishes displayed to hostel students in the marketplace
            </p>
          </div>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Dish</span>
          </button>
        </div>

        {/* Add Dish Form */}
        {showAddMenu && (
          <form onSubmit={handleAddDish} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
            <h4 className="font-bold text-xs text-zinc-800">Add Item to Daily Menu</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Dish Name</label>
                <input
                  type="text"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="e.g. Aloo Paratha with Dahi"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Meal Type</label>
                <select
                  value={newDishMeal}
                  onChange={(e) => setNewDishMeal(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white"
                >
                  <option value="dinner">Dinner</option>
                  <option value="lunch">Lunch</option>
                  <option value="breakfast">Breakfast</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={newDishPrice}
                  onChange={(e) => setNewDishPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 block mb-1">Contents / Thali Items (comma separated)</label>
              <input
                type="text"
                value={newDishContents}
                onChange={(e) => setNewDishContents(e.target.value)}
                placeholder="e.g. 2 Parathas, Pickle, Fresh Dahi"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMenu(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
              >
                Save to Menu
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {homemaker?.menu.map((item) => (
            <div key={item.id} className="p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="font-bold text-xs text-zinc-900">{item.name}</span>
                  <span className="text-[10px] font-semibold text-zinc-400 capitalize">({item.mealType})</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                  {item.contents.join(', ')}
                </p>
              </div>
              <span className="font-black text-xs text-amber-900 shrink-0">₹{item.price}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
