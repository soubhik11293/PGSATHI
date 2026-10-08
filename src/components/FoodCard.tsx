import React from 'react';
import { useApp } from '../context/AppContext';
import { HomemakerProfile } from '../types';
import { ShieldCheck, Star, MapPin, Utensils, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  homemaker: HomemakerProfile;
  matchScore?: number;
  matchReasons?: string[];
}

export const FoodCard: React.FC<Props> = ({ homemaker, matchScore, matchReasons }) => {
  const { openFoodModal } = useApp();

  const lowestMealPrice = Math.min(...homemaker.menu.map(m => m.price));
  const capacityLeft = homemaker.dailyCapacity - homemaker.currentCapacityUsed;

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-5 hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <img
            src={homemaker.avatar}
            alt={homemaker.kitchenName}
            className="w-14 h-14 rounded-2xl object-cover ring-1 ring-zinc-200 shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="font-extrabold text-base text-zinc-900 truncate">
                {homemaker.kitchenName}
              </h4>
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-extrabold text-xs text-amber-900">{homemaker.rating}</span>
                <span className="text-[10px] text-zinc-500">({homemaker.reviewsCount})</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] font-semibold text-zinc-500">
                by {homemaker.ownerName}
              </span>
              {homemaker.isVegOnly ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  🌱 100% Pure Veg
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Veg & Non-Veg
                </span>
              )}
              {homemaker.verifiedStatus === 'VERIFIED' && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> FSSAI
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-zinc-600 mt-3 line-clamp-2 leading-relaxed">
          {homemaker.bio}
        </p>

        {/* Daily Capacity Progress Bar */}
        <div className="mt-3 bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-zinc-500 font-medium">Today's Kitchen Capacity:</span>
            <span className="font-extrabold text-zinc-800">
              {homemaker.currentCapacityUsed} / {homemaker.dailyCapacity} slots
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                capacityLeft < 5 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (homemaker.currentCapacityUsed / homemaker.dailyCapacity) * 100)}%` }}
            />
          </div>
          {capacityLeft > 0 ? (
            <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
              ✓ Accepting orders for today ({capacityLeft} remaining)
            </span>
          ) : (
            <span className="text-[10px] text-rose-600 font-semibold mt-1 block">
              ⚠ Kitchen full for today, booking for tomorrow
            </span>
          )}
        </div>

        {/* Popular Dishes Preview */}
        <div className="mt-3">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
            Featured Daily Dishes:
          </span>
          <div className="space-y-1">
            {homemaker.menu.slice(0, 2).map((dish) => (
              <div key={dish.id} className="flex items-center justify-between text-xs text-zinc-700 bg-zinc-50/70 px-2 py-1 rounded-lg">
                <span className="truncate max-w-[200px] flex items-center gap-1.5 font-medium">
                  <span className={`w-2 h-2 rounded-full ${dish.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {dish.name}
                </span>
                <span className="font-bold text-amber-900 shrink-0">₹{dish.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription banner if weekly available */}
        {homemaker.packages.length > 0 && (
          <div className="mt-2.5 p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-900 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              {homemaker.packages[0].title}
            </span>
            <span className="font-extrabold text-emerald-700">
              ₹{homemaker.packages[0].pricePerMeal}/meal
            </span>
          </div>
        )}

        {/* Match Reasons if provided */}
        {matchReasons && matchReasons.length > 0 && (
          <div className="mt-2.5 p-2 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
            {matchReasons.slice(0, 2).map((reason, i) => (
              <div key={i} className="text-[10px] text-amber-900 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">
            Meals Starting From
          </span>
          <span className="font-extrabold text-base text-zinc-900">
            ₹{lowestMealPrice} <span className="text-xs font-normal text-zinc-500">/ meal</span>
          </span>
        </div>

        <button
          onClick={() => openFoodModal(homemaker)}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center gap-1 cursor-pointer"
        >
          <span>Order / Subscribe</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
