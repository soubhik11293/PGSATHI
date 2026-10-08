import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Booking, FoodOrder, RecurringService } from '../types';
import { 
  Clock, Calendar, MapPin, CheckCircle2, AlertCircle, 
  Star, Flag, RefreshCw, XCircle, ArrowRight, Loader2, Sparkles 
} from 'lucide-react';

export const BookingsPage: React.FC = () => {
  const { currentUser, openReviewModal, openReportModal, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'bookings' | 'food' | 'recurring'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [recurring, setRecurring] = useState<RecurringService[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [bksRes, ordsRes, recRes] = await Promise.all([
        api.getBookings(currentUser.id),
        api.getFoodOrders(currentUser.id),
        api.getRecurringSubscriptions(currentUser.id)
      ]);
      setBookings(bksRes.bookings || []);
      setOrders(ordsRes.orders || []);
      setRecurring(recRes.subscriptions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

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

  const handleCancelOrder = async (id: string) => {
    if (!currentUser) return;
    try {
      const result = await api.cancelFoodOrder(id, 'Student cancelled before preparation', currentUser.id);
      if (!result.success) throw new Error(result.error || 'Cancellation failed');
      showToast('Food order cancelled', 'info');
      loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not cancel food order', 'error');
    }
  };

  const handleToggleRecurring = async (id: string, currentStatus: string) => {
    if (!currentUser) return;
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await api.updateRecurringStatus(id, newStatus, currentUser.id);
      showToast(`Subscription ${newStatus === 'active' ? 'resumed' : 'paused'}`, 'info');
      loadData();
    } catch (err) {
      showToast('Failed to update subscription', 'error');
    }
  };

  const serviceTimelineSteps = ['REQUESTED', 'ACCEPTED', 'SCHEDULED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'];
  const foodTimelineSteps = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

  return (
    <div className="space-y-6 pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            My Bookings, Meals & Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Track real-time arrival, meal preparations, and manage recurring services
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Updates</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === 'bookings'
              ? 'text-amber-600 border-b-2 border-amber-600'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Service Bookings ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab('food')}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === 'food'
              ? 'text-amber-600 border-b-2 border-amber-600'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Food & Tiffin Orders ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('recurring')}
          className={`pb-3 relative transition-colors cursor-pointer ${
            activeTab === 'recurring'
              ? 'text-amber-600 border-b-2 border-amber-600'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Recurring Subscriptions ({recurring.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-zinc-500">Loading your activity...</p>
        </div>
      ) : activeTab === 'bookings' ? (
        /* Service Bookings Tab */
        bookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 max-w-md mx-auto">
            <span className="text-3xl block mb-2">🔧</span>
            <h3 className="font-bold text-base text-zinc-900">No service bookings yet</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Need a plumber, electrician or room cleaner? Book one on demand.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((bk) => {
              const currentStepIndex = serviceTimelineSteps.indexOf(bk.status);
              const isDone = bk.status === 'COMPLETED';
              const isCancelled = bk.status === 'CANCELLED';

              return (
                <div
                  key={bk.id}
                  className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-500">{bk.bookingCode}</span>
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800">
                          {bk.providerCategory}
                        </span>
                        {isCancelled ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                            CANCELLED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                            ● {bk.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-base text-zinc-900 mt-1">
                        {bk.serviceTitle}
                      </h3>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Assigned: <strong>{bk.providerName}</strong> • Price: <strong>₹{bk.price}</strong> ({bk.paymentStatus})
                      </p>
                    </div>

                    <div className="text-left sm:text-right text-xs text-zinc-500">
                      <div className="flex items-center sm:justify-end gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>{bk.scheduledDate} at {bk.scheduledTime}</span>
                      </div>
                      <div className="flex items-center sm:justify-end gap-1 mt-0.5 truncate max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="truncate">{bk.pgName}, {bk.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Timeline Stepper */}
                  {!isCancelled && (
                    <div className="py-2">
                      <div className="relative flex items-center justify-between">
                        {serviceTimelineSteps.map((step, idx) => {
                          const isPassed = currentStepIndex >= idx;
                          const isCurrent = currentStepIndex === idx;

                          return (
                            <div key={step} className="flex-1 flex flex-col items-center relative text-center">
                              {/* Connector line */}
                              {idx > 0 && (
                                <div
                                  className={`absolute top-3.5 -left-1/2 w-full h-1 z-0 ${
                                    isPassed ? 'bg-emerald-500' : 'bg-zinc-200'
                                  }`}
                                />
                              )}
                              {/* Dot */}
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                                  isPassed
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'bg-zinc-200 text-zinc-500'
                                } ${isCurrent ? 'ring-4 ring-amber-200 scale-110' : ''}`}
                              >
                                {isPassed ? '✓' : idx + 1}
                              </div>
                              <span className="text-[10px] font-bold text-zinc-600 mt-1.5 hidden md:block">
                                {step.replace(/_/g, ' ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions & Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 text-xs">
                    <span className="text-zinc-500 italic">
                      "{bk.description}"
                    </span>

                    <div className="flex items-center gap-2">
                      {isDone ? (
                        <button
                          onClick={() => openReviewModal({
                            bookingId: bk.id,
                            providerId: bk.providerId,
                            providerName: bk.providerName,
                            serviceType: bk.serviceTitle
                          })}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Rate & Review</span>
                        </button>
                      ) : !isCancelled ? (
                        <>
                          <button
                            onClick={() => handleCancelBooking(bk.id)}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                          >
                            Cancel Booking
                          </button>
                        </>
                      ) : null}

                      <button
                        onClick={() => openReportModal(bk.providerId, bk.providerName)}
                        title="Report issue"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'food' ? (
        /* Food Orders Tab */
        orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 max-w-md mx-auto">
            <span className="text-3xl block mb-2">🍲</span>
            <h3 className="font-bold text-base text-zinc-900">No food orders yet</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Order fresh home-cooked meals from local homemakers anytime.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => {
              const currentStepIndex = foodTimelineSteps.indexOf(ord.status);
              const isDelivered = ord.status === 'DELIVERED';
              const isCancelled = ord.status === 'CANCELLED';

              return (
                <div
                  key={ord.id}
                  className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-500">{ord.orderCode}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-orange-100 text-orange-900">
                          {ord.mealType.toUpperCase()}
                        </span>
                        {ord.isRecurring && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                            🔄 {ord.recurringDays}-Day Plan
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                          ● {ord.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-base text-zinc-900 mt-1">
                        {ord.packageTitle || ord.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                      </h3>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Kitchen: <strong>{ord.kitchenName}</strong> • Total: <strong>₹{ord.grandTotal}</strong>
                      </p>
                    </div>

                    <div className="text-left sm:text-right text-xs text-zinc-500">
                      <div className="flex items-center sm:justify-end gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Slot: {ord.deliveryTimeSlot}</span>
                      </div>
                      <div className="flex items-center sm:justify-end gap-1 mt-0.5 truncate max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="truncate">{ord.pgName}, {ord.deliveryAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* Food Stepper */}
                  {!isCancelled && (
                    <div className="py-2">
                      <div className="relative flex items-center justify-between">
                        {foodTimelineSteps.map((step, idx) => {
                          const isPassed = currentStepIndex >= idx;
                          const isCurrent = currentStepIndex === idx;

                          return (
                            <div key={step} className="flex-1 flex flex-col items-center relative text-center">
                              {idx > 0 && (
                                <div
                                  className={`absolute top-3.5 -left-1/2 w-full h-1 z-0 ${
                                    isPassed ? 'bg-orange-500' : 'bg-zinc-200'
                                  }`}
                                />
                              )}
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                                  isPassed
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : 'bg-zinc-200 text-zinc-500'
                                } ${isCurrent ? 'ring-4 ring-amber-200 scale-110' : ''}`}
                              >
                                {isPassed ? '✓' : idx + 1}
                              </div>
                              <span className="text-[10px] font-bold text-zinc-600 mt-1.5 hidden md:block">
                                {step.replace(/_/g, ' ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                    {!isDelivered && !isCancelled && ['PLACED', 'ACCEPTED'].includes(ord.status) && (
                      <button
                        onClick={() => handleCancelOrder(ord.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                      >
                        Cancel Order
                      </button>
                    )}
                    {isDelivered && (
                      <button
                        onClick={() => openReviewModal({
                          orderId: ord.id,
                          providerId: ord.homemakerId,
                          providerName: ord.kitchenName,
                          serviceType: 'Homemade Food'
                        })}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Rate Food Quality</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Recurring Subscriptions Tab */
        recurring.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 max-w-md mx-auto">
            <span className="text-3xl block mb-2">🔄</span>
            <h3 className="font-bold text-base text-zinc-900">No active subscriptions</h3>
            <p className="text-xs text-zinc-500 mt-1">
              You can subscribe to 7-day or monthly dinner dabbas or weekly room cleaning.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recurring.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                      {sub.frequency} {sub.type}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      sub.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {sub.status.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-zinc-900 mt-1">{sub.title}</h3>
                  <p className="text-xs text-zinc-600 mt-0.5">{sub.details}</p>

                  <div className="mt-2 text-xs text-zinc-500 flex items-center gap-4">
                    <span>Provider: <strong>{sub.providerName}</strong></span>
                    <span>Rate: <strong>₹{sub.pricePerCycle} / cycle</strong></span>
                    <span>Next: <strong>{sub.nextDeliveryDate}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleRecurring(sub.id, sub.status)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      sub.status === 'active'
                        ? 'border border-amber-300 text-amber-800 hover:bg-amber-50'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {sub.status === 'active' ? 'Pause Subscription' : 'Resume Subscription'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
