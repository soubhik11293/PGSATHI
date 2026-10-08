import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { 
  X, Calendar, Clock, MapPin, ShieldCheck, CheckCircle2, 
  CreditCard, QrCode, Banknote, Loader2, Sparkles, AlertCircle 
} from 'lucide-react';

export const BookingModal: React.FC = () => {
  const { bookingModal, closeBookingModal, currentUser, currentArea, showToast, refreshNotifications, setActiveTab } = useApp();
  const { isOpen, provider } = bookingModal;

  const [serviceTitle, setServiceTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('11:00 AM');
  const [address, setAddress] = useState(currentUser?.address || 'Room 304, Stanza Living PG, 4th Block');
  const [pgName, setPgName] = useState(currentUser?.pgName || 'Stanza Living Poznan');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'immediate'>('medium');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'razorpay' | 'cod'>('upi');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any>(null);

  if (!isOpen || !provider) return null;

  const timeSlots = [
    '09:00 AM', '10:30 AM', '11:00 AM', '01:00 PM', 
    '02:30 PM', '04:00 PM', '05:30 PM', '07:00 PM'
  ];

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please login as student first', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createBooking({
        providerId: provider.id,
        serviceTitle: serviceTitle || `${provider.categorySlug.toUpperCase()} Service & Repair`,
        description: description || 'PG Service Visit',
        scheduledDate,
        scheduledTime,
        address,
        pgName,
        urgency,
        paymentMethod,
        isRecurring,
        frequency
      }, currentUser.id);

      if (res.success) {
        setSuccessBooking(res.booking);
        showToast(`Booking ${res.booking.bookingCode} confirmed successfully!`, 'success');
        refreshNotifications();
      } else {
        showToast('Booking failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to create booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={provider.avatar}
              alt={provider.name}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">{provider.name}</h3>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                {provider.categorySlug.toUpperCase()} • {provider.rating}★ ({provider.reviewsCount} reviews) • Fast {provider.responseTime} response
              </p>
            </div>
          </div>
          <button
            onClick={closeBookingModal}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successBooking ? (
          /* Confirmation Success Screen */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl animate-bounce">
              ✓
            </div>
            <h4 className="text-2xl font-black text-zinc-900">Booking Confirmed!</h4>
            <p className="text-sm text-zinc-600 max-w-md mx-auto">
              Your service visit is booked. <strong>{provider.name}</strong> has received your request and will arrive at your PG on schedule.
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-zinc-500">Booking Code:</span>
                <span className="font-mono font-bold text-zinc-900">{successBooking.bookingCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Scheduled Time:</span>
                <span className="font-semibold text-zinc-900">{successBooking.scheduledDate} at {successBooking.scheduledTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Location:</span>
                <span className="font-semibold text-zinc-900">{successBooking.pgName}, {successBooking.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Amount:</span>
                <span className="font-bold text-emerald-600">₹{successBooking.price} ({paymentMethod.toUpperCase()})</span>
              </div>
            </div>

            <div className="pt-4 flex gap-3 justify-center">
              <button
                onClick={() => {
                  closeBookingModal();
                  setActiveTab('bookings');
                }}
                className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs"
              >
                Track in My Bookings
              </button>
              <button
                onClick={closeBookingModal}
                className="px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleConfirmBooking} className="p-6 space-y-5">
            {/* Service & Problem Description */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                What needs to be fixed / done?
              </label>
              <input
                type="text"
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                placeholder={`e.g. Tap leaking / Fan repair / Room cleaning`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Preferred Slot
                </label>
                <select
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none"
                >
                  {timeSlots.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address & PG Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  PG / Hostel Name
                </label>
                <input
                  type="text"
                  value={pgName}
                  onChange={(e) => setPgName(e.target.value)}
                  placeholder="e.g. Stanza Living Poznan House"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Room No. & Detailed Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Room 304, 3rd Floor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Recurring toggle */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-900 block">Make this a Recurring Service</span>
                <span className="text-[11px] text-amber-700">Great for weekly cleaning or regular maintenance</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring-check"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                {isRecurring && (
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="text-xs bg-white border border-amber-300 rounded-lg px-2 py-1 font-semibold text-amber-900"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'upi'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs'
                      : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-amber-600" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'razorpay'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs'
                      : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Card / NetBanking</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs'
                      : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span>Cash on Visit</span>
                </button>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 text-xs space-y-1.5">
              <div className="flex justify-between text-zinc-600">
                <span>Base Inspection & Service Visit</span>
                <span>₹{provider.basePrice}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>PG Convenience & Safety Guarantee</span>
                <span className="text-emerald-600 font-semibold">FREE</span>
              </div>
              <div className="pt-2 border-t border-zinc-200 flex justify-between font-extrabold text-sm text-zinc-900">
                <span>Total Payable</span>
                <span className="text-amber-600">₹{provider.basePrice}</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Confirming Booking...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Book for ₹{provider.basePrice}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
