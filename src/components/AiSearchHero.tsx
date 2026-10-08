import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ParsedAiResponse } from '../types';
import { 
  Sparkles, Search, ArrowRight, CheckCircle2, AlertCircle, 
  Clock, ShieldCheck, Flame, Loader2, Calendar, Tag, ChevronRight 
} from 'lucide-react';

export const AiSearchHero: React.FC = () => {
  const { currentArea, currentUser, openBookingModal, openFoodModal, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<ParsedAiResponse | null>(null);

  const samplePrompts = [
    "I need homemade vegetarian dinner every day for the next 7 days, preferably under ₹120 per meal.",
    "My bathroom tap is leaking.",
    "My room fan stopped working.",
    "I need someone to clean my room this Sunday."
  ];

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setAiResult(null);

    try {
      const res = await api.understandRequest(q, currentArea, currentUser?.id || 'usr-student-aarav');
      setAiResult(res);
      showToast('AI analyzed your request and matched nearby providers!', 'success');
    } catch (err) {
      console.error('AI request failed:', err);
      showToast('Could not process request with AI', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-6 sm:p-10 text-white shadow-xl">
      {/* Decorative background glows */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-orange-700/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Top Tagline */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-semibold mb-4 text-white shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          <span>AI-Powered PG Services Engine</span>
          <span className="text-white/60">•</span>
          <span className="text-amber-100">{currentArea} PG Zone</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
          What does your PG life need today?
        </h1>
        <p className="text-sm sm:text-base text-amber-100 font-medium mb-8 max-w-xl mx-auto">
          From motherly homemade tiffins to emergency plumbing & fan fixes—tell us naturally in plain words.
        </p>

        {/* AI Natural Language Search Box */}
        <div className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-2xl flex flex-col sm:flex-row items-center gap-2 border border-white/20">
          <div className="flex items-center gap-2.5 px-3 w-full text-zinc-900">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Tell us what you need (e.g. 'Homemade veg dinner for next 7 days under ₹120' or 'Tap leaking')..."
              className="w-full py-2 bg-transparent text-sm sm:text-base font-medium placeholder-zinc-400 focus:outline-none"
            />
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>Saathi AI Search</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Quick Example Prompt Chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-amber-100/80 font-medium">Try asking:</span>
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(prompt);
                handleSearch(prompt);
              }}
              className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xs border border-white/20 text-white transition-all text-[11px] sm:text-xs text-left"
            >
              "{prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt}"
            </button>
          ))}
        </div>
      </div>

      {/* AI Structured Decomposition & Live Provider Match Results */}
      {aiResult && (
        <div className="mt-8 pt-8 border-t border-white/20 max-w-4xl mx-auto text-left text-zinc-900">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-100">
            {/* Header: AI Understanding Breakdown */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  ✨
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-zinc-900">
                    Saathi AI Structured Understanding
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Classified service category, urgency & matched against database in {currentArea}
                  </p>
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200">
                  📁 {aiResult.category}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getUrgencyBadge(aiResult.urgency)}`}>
                  ⚡ {aiResult.urgency} urgency
                </span>
                {aiResult.recurring && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    🔄 Recurring ({aiResult.durationDays || 7} Days)
                  </span>
                )}
                {aiResult.diet && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🌱 {aiResult.diet}
                  </span>
                )}
              </div>
            </div>

            {/* Extracted Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 bg-zinc-50 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-zinc-500 block font-medium">Diagnosed Need:</span>
                <span className="font-bold text-zinc-800">{aiResult.problem}</span>
              </div>
              <div>
                <span className="text-zinc-500 block font-medium">Recommended Service:</span>
                <span className="font-bold text-zinc-800">{aiResult.recommendedServiceTitle}</span>
              </div>
              <div>
                <span className="text-zinc-500 block font-medium">Budget Target & Turnaround:</span>
                <span className="font-bold text-zinc-800">
                  {aiResult.budgetMax ? `Max ₹${aiResult.budgetMax}` : 'Standard rates'} • {aiResult.estimatedDuration || 'Fast arrival'}
                </span>
              </div>
            </div>

            {/* Top Matched Providers from DB */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                  <span>🎯 Top Matched Providers</span>
                  <span className="text-xs font-normal text-zinc-500">
                    (Scored using 6-point weighted engine)
                  </span>
                </h4>
              </div>

              {aiResult.matchedProviders.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-2xl text-xs text-amber-800 text-center">
                  No verified providers found in this exact category right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {aiResult.matchedProviders.slice(0, 2).map((match, idx) => {
                    const isFood = match.type === 'food';
                    const prov = match.item;

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-zinc-200 bg-white hover:border-amber-400 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5">
                          <img
                            src={prov.avatar}
                            alt={isFood ? prov.kitchenName : prov.name}
                            className="w-14 h-14 rounded-2xl object-cover ring-1 ring-zinc-200 shrink-0"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="font-extrabold text-base text-zinc-900">
                                {isFood ? prov.kitchenName : prov.name}
                              </h5>
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                Verified
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
                                ★ {prov.rating} ({prov.reviewsCount})
                              </span>
                            </div>

                            <p className="text-xs text-zinc-600 mt-1 line-clamp-2 max-w-xl">
                              {prov.bio}
                            </p>

                            {/* Transparent Match Reasons */}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {match.reasons.map((r, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" />
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Match Score & 1-Click Action */}
                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                              Match Score
                            </span>
                            <span className="text-xl font-black text-emerald-600">
                              {match.matchScore}%
                            </span>
                          </div>

                          {isFood ? (
                            <button
                              onClick={() => {
                                const packageId = aiResult.bookingDraft?.mealPackageId;
                                openFoodModal(prov, packageId, aiResult.meal || 'dinner');
                              }}
                              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{aiResult.recurring ? `Book ${aiResult.durationDays}-Day Subscription` : 'Order Food Now'}</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => openBookingModal(prov)}
                              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Book from ₹{prov.basePrice}</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
