import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ProviderProfile, ServiceCategory } from '../types';
import { ProviderCard } from '../components/ProviderCard';
import { Search, Filter, ShieldCheck, Star, SlidersHorizontal, Loader2 } from 'lucide-react';

export const ExploreProviders: React.FC = () => {
  const { currentArea } = useApp();
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'experience'>('rating');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCategories().then(res => setCategories(res.categories || []));
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await api.getProviders({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery || undefined,
        area: currentArea,
        verifiedOnly: verifiedOnly || undefined,
        minRating: minRating > 0 ? minRating : undefined
      });
      let list = res.providers || [];

      // Sort
      if (sortBy === 'rating') {
        list.sort((a, b) => b.rating - a.rating);
      } else if (sortBy === 'price') {
        list.sort((a, b) => a.basePrice - b.basePrice);
      } else if (sortBy === 'experience') {
        list.sort((a, b) => b.experienceYears - a.experienceYears);
      }

      setProviders(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [selectedCategory, searchQuery, verifiedOnly, minRating, sortBy, currentArea]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
          Explore Verified Service Specialists
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Showing background-verified technicians and helpers serving <strong>{currentArea}</strong> and nearby PG hostels.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by skill, service or name (e.g. 'tap leak', 'fan', 'deep clean')..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs font-medium placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto px-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none cursor-pointer"
            >
              <option value="rating">Top Rated First ★</option>
              <option value="price">Lowest Price First ₹</option>
              <option value="experience">Most Experienced (Years)</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            All Services
          </button>
          {categories.filter(c => c.slug !== 'food').map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === cat.slug
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Quick Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Providers Only
              </span>
            </label>

            <div className="flex items-center gap-1 text-zinc-600">
              <span>Rating:</span>
              <button
                onClick={() => setMinRating(minRating === 4.8 ? 0 : 4.8)}
                className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                  minRating === 4.8 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                4.8★+
              </button>
              <button
                onClick={() => setMinRating(minRating === 4.5 ? 0 : 4.5)}
                className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                  minRating === 4.5 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                4.5★+
              </button>
            </div>
          </div>

          <span className="text-zinc-500 font-semibold">
            {providers.length} service providers available
          </span>
        </div>
      </div>

      {/* Provider Cards Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-zinc-500 font-medium">Loading providers in {currentArea}...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center text-2xl mb-3">
            🔍
          </div>
          <h3 className="font-bold text-base text-zinc-900">No providers matched</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Try adjusting your search keywords, rating filters, or switch your PG Zone in the top header.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
              setVerifiedOnly(false);
              setMinRating(0);
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {providers.map((prov) => (
            <ProviderCard key={prov.id} provider={prov} />
          ))}
        </div>
      )}
    </div>
  );
};
