import React from 'react';
import { useApp } from '../context/AppContext';
import { ProviderProfile } from '../types';
import { ShieldCheck, Star, Clock, MapPin, CheckCircle2, ChevronRight, Flag } from 'lucide-react';

interface Props {
  provider: ProviderProfile;
  matchScore?: number;
  matchReasons?: string[];
}

export const ProviderCard: React.FC<Props> = ({ provider, matchScore, matchReasons }) => {
  const { openBookingModal, openReportModal } = useApp();

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-5 hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between">
      <div>
        {/* Top Header: Avatar + Name + Rating */}
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            <img
              src={provider.avatar}
              alt={provider.name}
              className="w-14 h-14 rounded-2xl object-cover ring-1 ring-zinc-200"
            />
            {provider.isOnline && (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Online now" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="font-extrabold text-base text-zinc-900 truncate">
                {provider.name}
              </h4>
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-extrabold text-xs text-amber-900">{provider.rating}</span>
                <span className="text-[10px] text-zinc-500">({provider.reviewsCount})</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                {provider.categorySlug}
              </span>
              {provider.verifiedStatus === 'VERIFIED' && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                </span>
              )}
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" /> ~{provider.responseTime}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-zinc-600 mt-3 line-clamp-2 leading-relaxed">
          {provider.bio}
        </p>

        {/* Service area & experience */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-100 pt-2.5">
          <span className="flex items-center gap-1 truncate max-w-[180px]">
            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="truncate">{provider.serviceArea}</span>
          </span>
          <span className="font-semibold text-zinc-700">
            {provider.completedJobs}+ jobs done
          </span>
        </div>

        {/* Skills chips */}
        <div className="mt-2.5 flex flex-wrap gap-1">
          {provider.skills.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium bg-zinc-50 text-zinc-600 px-2 py-0.5 rounded-md border border-zinc-200/60"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Match Reasons if provided */}
        {matchReasons && matchReasons.length > 0 && (
          <div className="mt-3 p-2 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-1">
            {matchReasons.slice(0, 2).map((reason, i) => (
              <div key={i} className="text-[10px] text-amber-900 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Price + Book Button */}
      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">
            Visit & Inspection
          </span>
          <span className="font-extrabold text-base text-zinc-900">
            ₹{provider.basePrice}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openReportModal(provider.id, provider.name)}
            title="Report concern to admin"
            className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => openBookingModal(provider)}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>Book Now</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
