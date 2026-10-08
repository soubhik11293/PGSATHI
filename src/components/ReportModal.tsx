import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

export const ReportModal: React.FC = () => {
  const { reportModal, closeReportModal, currentUser, showToast } = useApp();
  const { isOpen, targetId, targetName } = reportModal;

  const [category, setCategory] = useState<'poor_service' | 'no_show' | 'harassment' | 'payment_issue' | 'food_quality' | 'other'>('poor_service');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    try {
      const res = await api.submitComplaint({
        reportedId: targetId,
        category,
        description
      }, currentUser.id);

      if (res.success) {
        showToast(`Dispute ticket ${res.complaint.ticketId} logged. PG Saathi Trust & Safety team is reviewing.`, 'info');
        closeReportModal();
      } else {
        showToast('Failed to submit report', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error lodging dispute', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-extrabold text-base text-zinc-900">Safety & Trust Report</h3>
          </div>
          <button onClick={closeReportModal} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-zinc-600">
            Reporting: <strong>{targetName || 'Provider'}</strong>. Your report is confidential and investigated directly by PG Saathi admins.
          </p>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Issue Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none"
            >
              <option value="poor_service">Poor Service Quality / Incomplete Job</option>
              <option value="no_show">Provider No-Show / Late without notice</option>
              <option value="payment_issue">Overcharging / Payment Dispute</option>
              <option value="food_quality">Food Hygiene / Taste Issue</option>
              <option value="harassment">Unprofessional Conduct / Harassment</option>
              <option value="other">Other Concern</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Detailed Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe what occurred..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium focus:outline-none"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit to Trust & Safety Team</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
