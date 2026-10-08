import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { X, Star, Loader2 } from 'lucide-react';

export const ReviewModal: React.FC = () => {
  const { reviewModal, closeReviewModal, currentUser, showToast } = useApp();
  const { isOpen, bookingId, orderId, providerId, providerName, serviceType } = reviewModal;

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !providerId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    try {
      const res = await api.submitReview({
        bookingId,
        orderId,
        providerId,
        rating,
        comment,
        serviceType: serviceType || 'Service'
      }, currentUser.id);

      if (res.success) {
        showToast('Thank you for rating your Saathi! Your review helps other students.', 'success');
        closeReviewModal();
      } else {
        showToast('Could not submit review', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error submitting review', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="font-extrabold text-base text-zinc-900">Rate & Review</h3>
            <p className="text-xs text-zinc-500">{providerName} • {serviceType}</p>
          </div>
          <button onClick={closeReviewModal} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="text-center py-2">
            <span className="text-xs font-bold text-zinc-500 block mb-2">How was your experience?</span>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-extrabold text-amber-600 mt-1 block">
              {rating === 5 ? 'Exceptional! ★★★★★' : rating === 4 ? 'Very Good! ★★★★' : rating === 3 ? 'Average ★★★' : 'Needs Improvement'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Share details for fellow PG hostellers
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Arrived on time, fixed the leak in 10 mins, polite and clean..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Honest Review</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
