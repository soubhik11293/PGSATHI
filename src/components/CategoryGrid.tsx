import React from 'react';
import { useApp } from '../context/AppContext';
import { ServiceCategory } from '../types';

interface Props {
  categories: ServiceCategory[];
  onSelectCategory?: (slug: string) => void;
}

export const CategoryGrid: React.FC<Props> = ({ categories, onSelectCategory }) => {
  const { setActiveTab } = useApp();

  const handleCategoryClick = (slug: string) => {
    if (slug === 'food') {
      setActiveTab('food');
    } else {
      if (onSelectCategory) {
        onSelectCategory(slug);
      }
      setActiveTab('explore');
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => handleCategoryClick(cat.slug)}
          className="group relative flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-amber-400 hover:shadow-md transition-all text-center focus:outline-none cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-2xl mb-2 transition-transform group-hover:scale-110 shadow-xs">
            {cat.icon}
          </div>
          <span className="font-extrabold text-xs text-zinc-800 group-hover:text-amber-800 leading-tight">
            {cat.name.split(' ')[0]}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
            from ₹{cat.baseEstimatedPrice}
          </span>
          {cat.popular && (
            <span className="absolute -top-1.5 -right-1 bg-amber-500 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-xs">
              Hot
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
