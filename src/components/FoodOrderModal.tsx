import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { 
  X, ShieldCheck, CheckCircle2, Clock, Calendar, 
  MapPin, Utensils, QrCode, CreditCard, Banknote, Loader2, Sparkles 
} from 'lucide-react';

export const FoodOrderModal: React.FC = () => {
  const { foodModal, closeFoodModal, currentUser, currentArea, showToast, refreshNotifications, setActiveTab } = useApp();
  const { isOpen, homemaker, initialPackageId, initialMealType } = foodModal;

  const [selectedPackageId, setSelectedPackageId] = useState<string>(initialPackageId || '');
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [mealType, setMealType] = useState<string>(initialMealType || 'dinner');
  const [deliverySlot, setDeliverySlot] = useState('8:00 PM - 8:30 PM');
  const [deliveryAddress, setDeliveryAddress] = useState(currentUser?.address || 'Room 304, Stanza Living PG, 4th Block');
  const [pgName, setPgName] = useState(currentUser?.pgName || 'Stanza Living PG');
  const [isRecurring, setIsRecurring] = useState(Boolean(initialPackageId));
  const [recurringDays, setRecurringDays] = useState(7);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'razorpay' | 'cod'>('upi');
  const [loading, setLoading] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);

  if (!isOpen || !homemaker) return null;

  // Sync when initialPackageId changes
  React.useEffect(() => {
    if (initialPackageId) {
      setSelectedPackageId(initialPackageId);
      setIsRecurring(true);
    } else if (homemaker.packages.length > 0) {
      setSelectedPackageId(homemaker.packages[0].id);
      setIsRecurring(true);
    } else if (homemaker.menu.length > 0) {
      setSelectedMenuItemId(homemaker.menu[0].id);
    }
  }, [initialPackageId, homemaker]);

  const selectedPackage = homemaker.packages.find(p => p.id === selectedPackageId);
  const selectedMenuItem = homemaker.menu.find(m => m.id === selectedMenuItemId);

  // Price calculations
  let itemTotal = 0;
  if (selectedPackage) {
    itemTotal = selectedPackage.totalPrice;
  } else if (selectedMenuItem) {
    itemTotal = selectedMenuItem.price * quantity * (isRecurring ? recurringDays : 1);
  } else {
    itemTotal = 100;
  }

  const deliveryFee = homemaker.deliveryFee || 15;
  const grandTotal = itemTotal + deliveryFee;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please login as a student', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        homemakerId: homemaker.id,
        mealType,
        deliveryTimeSlot: deliverySlot,
        deliveryAddress,
        pgName,
        paymentMethod,
        isRecurring: isRecurring || Boolean(selectedPackage),
        recurringDays: selectedPackage ? selectedPackage.durationDays : recurringDays
      };

      if (selectedPackage) {
        payload.mealPackageId = selectedPackage.id;
      } else if (selectedMenuItem) {
        payload.items = [{ menuItemId: selectedMenuItem.id, quantity }];
      }

      const res = await api.createFoodOrder(payload, currentUser.id);

      if (res.success) {
        setConfirmedOrder(res.order);
        showToast(`Order ${res.order.orderCode} placed successfully!`, 'success');
        refreshNotifications();
      } else {
        showToast('Could not place order', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error placing food order', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={homemaker.avatar}
              alt={homemaker.kitchenName}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">{homemaker.kitchenName}</h3>
                <span className="flex items-center gap-1 text-[11px] font-bold text-white bg-black/20 px-2 py-0.5 rounded-full border border-white/20">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" /> FSSAI Verified
                </span>
              </div>
              <p className="text-xs text-amber-100">
                by {homemaker.ownerName} • {homemaker.rating}★ ({homemaker.reviewsCount} reviews) • {homemaker.isVegOnly ? '🌱 100% Pure Veg' : 'Veg & Non-Veg'}
              </p>
            </div>
          </div>
          <button
            onClick={closeFoodModal}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedOrder ? (
          /* Order Confirmed Screen */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl animate-bounce">
              🍲
            </div>
            <h4 className="text-2xl font-black text-zinc-900">Food Order Placed!</h4>
            <p className="text-sm text-zinc-600 max-w-md mx-auto">
              <strong>{homemaker.ownerName}</strong> has received your order and will start cooking fresh. Delivery will be made to your PG room.
            </p>

            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-zinc-500">Order ID:</span>
                <span className="font-mono font-bold text-zinc-900">{confirmedOrder.orderCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Plan / Item:</span>
                <span className="font-semibold text-zinc-900">
                  {confirmedOrder.packageTitle || confirmedOrder.items[0]?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Delivery Slot:</span>
                <span className="font-semibold text-zinc-900">{confirmedOrder.deliveryTimeSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Delivery Address:</span>
                <span className="font-semibold text-zinc-900">{confirmedOrder.pgName}, {confirmedOrder.deliveryAddress}</span>
              </div>
              {confirmedOrder.isRecurring && (
                <div className="flex justify-between text-purple-700 font-bold">
                  <span>Recurring Duration:</span>
                  <span>{confirmedOrder.recurringDays} Days Subscription</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-amber-200">
                <span className="text-zinc-500">Grand Total:</span>
                <span className="font-black text-amber-800 text-sm">₹{confirmedOrder.grandTotal}</span>
              </div>
            </div>

            <div className="pt-4 flex gap-3 justify-center">
              <button
                onClick={() => {
                  closeFoodModal();
                  setActiveTab('bookings');
                }}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              >
                Track in Orders Tab
              </button>
              <button
                onClick={closeFoodModal}
                className="px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Food Selection Form */
          <form onSubmit={handleSubmitOrder} className="p-6 space-y-5">
            {/* Meal Packages (Recurring Subscriptions) */}
            {homemaker.packages.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Popular Meal Packages & Subscriptions</span>
                  <span className="text-amber-600 font-bold normal-case text-[11px]">Save up to 20%</span>
                </label>
                <div className="space-y-2">
                  {homemaker.packages.map(pkg => (
                    <label
                      key={pkg.id}
                      onClick={() => {
                        setSelectedPackageId(pkg.id);
                        setSelectedMenuItemId('');
                        setIsRecurring(true);
                      }}
                      className={`block p-3 rounded-2xl border cursor-pointer transition-all ${
                        selectedPackageId === pkg.id
                          ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                          : 'border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="meal-choice"
                            checked={selectedPackageId === pkg.id}
                            onChange={() => {}}
                            className="text-amber-600"
                          />
                          <span className="font-bold text-xs text-zinc-900">{pkg.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            ₹{pkg.pricePerMeal}/meal
                          </span>
                        </div>
                        <span className="font-extrabold text-xs text-amber-900">
                          ₹{pkg.totalPrice} ({pkg.durationDays}d)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 mt-1 pl-5">
                        {pkg.description}
                      </p>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Menu Items */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Or Choose Individual Daily Meals
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {homemaker.menu.map(item => (
                  <label
                    key={item.id}
                    onClick={() => {
                      setSelectedMenuItemId(item.id);
                      setSelectedPackageId('');
                    }}
                    className={`block p-3 rounded-2xl border cursor-pointer transition-all ${
                      selectedMenuItemId === item.id
                        ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                        : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="meal-choice"
                          checked={selectedMenuItemId === item.id}
                          onChange={() => {}}
                          className="text-amber-600"
                        />
                        <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[8px] ${
                          item.isVeg ? 'border-emerald-600 text-emerald-600' : 'border-rose-600 text-rose-600'
                        }`}>
                          ●
                        </span>
                        <span className="font-bold text-xs text-zinc-900">{item.name}</span>
                      </div>
                      <span className="font-extrabold text-xs text-amber-900">₹{item.price}</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-1 pl-5 line-clamp-1">
                      {item.contents.join(' • ')}
                    </p>
                  </label>
                ))}
              </div>
            </div>

            {/* If Individual item selected: Recurring Days Option */}
            {selectedMenuItemId && (
              <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900 block">Deliver daily for 7 days?</span>
                  <span className="text-[11px] text-amber-700">Creates a recurring 7-day dinner subscription</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span className="text-xs font-bold text-amber-900">7 Days Plan</span>
                </div>
              </div>
            )}

            {/* Delivery Time Slot & PG Room */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Delivery Slot
                </label>
                <select
                  value={deliverySlot}
                  onChange={(e) => setDeliverySlot(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none"
                >
                  <option value="12:30 PM - 1:15 PM">Lunch: 12:30 PM - 1:15 PM</option>
                  <option value="1:15 PM - 2:00 PM">Lunch: 1:15 PM - 2:00 PM</option>
                  <option value="7:30 PM - 8:15 PM">Dinner: 7:30 PM - 8:15 PM</option>
                  <option value="8:15 PM - 9:00 PM">Dinner: 8:15 PM - 9:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  PG Name & Room
                </label>
                <input
                  type="text"
                  value={pgName}
                  onChange={(e) => setPgName(e.target.value)}
                  placeholder="e.g. Stanza Living Poznan, Room 304"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Payment Option
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'upi'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                      : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'razorpay'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                      : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Cards / NetBanking</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                      : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Cash on Delivery</span>
                </button>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 text-xs space-y-1.5">
              <div className="flex justify-between text-zinc-600">
                <span>Meal Subtotal ({selectedPackage?.title || selectedMenuItem?.name || 'Meal'})</span>
                <span>₹{itemTotal}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Doorstep PG Delivery Fee</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div className="pt-2 border-t border-zinc-200 flex justify-between font-extrabold text-sm text-zinc-900">
                <span>Grand Total</span>
                <span className="text-amber-600">₹{grandTotal}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Placing Order with Kitchen...</span>
                </>
              ) : (
                <>
                  <span>Confirm Order for ₹{grandTotal}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
