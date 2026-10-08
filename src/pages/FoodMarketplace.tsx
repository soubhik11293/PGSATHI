import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { HomemakerProfile } from '../types';
import { FoodCard } from '../components/FoodCard';
import { Search, Utensils, Sparkles, ShieldCheck, Heart, Loader2 } from 'lucide-react';

export const FoodMarketplace: React.FC = () => {
  const { currentArea, openFoodModal } = useApp();
  const [homemakers, setHomemakers] = useState<HomemakerProfile[]>([]);
  const [isVegOnly, setIsVegOnly] = useState<boolean>(false);
  const [mealType, setMealType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchHomemakers = async () => {
    setLoading(true);
    try {
      const res = await api.getHomemakers({
        isVeg: isVegOnly || undefined,
        mealType: mealType === 'all' ? undefined : mealType,
        area: currentArea,
        search: searchQuery || undefined
      });
      setHomemakers(res.homemakers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomemakers();
  }, [isVegOnly, mealType, searchQuery, currentArea]);

  return (
    <div className="space-y-6 pb-16">
      {/* Food Marketplace Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-2xl">
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider inline-block mb-2">
            Ghar Ka Khana • Pure Home Cooking
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2">
            Mother's Kitchen Tiffins & Dabba Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 font-medium leading-relaxed">
            Hate messy hostel mess food? Order authentic, healthy home-cooked meals prepared with pure ghee, fresh vegetables, and love by neighborhood homemakers in {currentArea}.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes (e.g. 'Phulka Thali', 'Rajma Rice', 'Poha', 'Khichdi')..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs font-medium placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Meal Filter */}
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="px-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Meals (Breakfast, Lunch & Dinner)</option>
              <option value="dinner">Dinner Tiffins Only</option>
              <option value="lunch">Lunch Dabbas Only</option>
              <option value="breakfast">Morning Breakfast</option>
            </select>
          </div>
        </div>

        {/* Veg Only Toggle + Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsVegOnly(!isVegOnly)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isVegOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
              <span>100% Pure Vegetarian Only</span>
            </button>
          </div>

          <span className="text-zinc-500 font-semibold">
            {homemakers.length} home kitchens serving {currentArea}
          </span>
        </div>
      </div>

      {/* Homemakers Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-zinc-500 font-medium">Fetching today's kitchens...</p>
        </div>
      ) : homemakers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center text-3xl mb-3">
            🍲
          </div>
          <h3 className="font-bold text-base text-zinc-900">No home kitchens matched</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Try resetting the vegetarian toggle or search keywords.
          </p>
          <button
            onClick={() => { setIsVegOnly(false); setMealType('all'); setSearchQuery(''); }}
            className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {homemakers.map((hm) => (
            <FoodCard key={hm.id} homemaker={hm} />
          ))}
        </div>
      )}
    </div>
  );
};
