import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { FarmerProfile, ProduceListing } from '../types';
import { Loader2, Plus, RefreshCw, ShieldCheck, Sprout } from 'lucide-react';

export const FarmerDashboard: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [listings, setListings] = useState<ProduceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'vegetable', unit: '500 g', price: '35', quantityAvailable: '10', description: '' });

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const result = await api.getFarmer(currentUser.id);
      setFarmer(result.farmer || null);
      setListings(result.listings || []);
    } catch {
      showToast('Could not load your farm profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [currentUser]);

  const submitListing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!farmer || !currentUser) return;
    const result = await api.addProduceListing(farmer.id, {
      ...form,
      price: Number(form.price),
      quantityAvailable: Number(form.quantityAvailable),
      category: form.category as ProduceListing['category']
    }, currentUser.id);
    if (!result.success) {
      showToast(result.error || 'Could not add produce', 'error');
      return;
    }
    showToast('Produce listing published for nearby students', 'success');
    setForm({ name: '', category: 'vegetable', unit: '500 g', price: '35', quantityAvailable: '10', description: '' });
    setShowForm(false);
    void loadData();
  };

  if (loading) return <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" /><p className="text-xs text-zinc-500">Loading farmer workspace...</p></div>;

  return (
    <div className="space-y-6 pb-16">
      <section className="bg-gradient-to-r from-emerald-700 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold bg-white/15 px-2.5 py-1 rounded-full"><ShieldCheck className="w-3.5 h-3.5" /> Farmer partner workspace</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">{farmer?.farmName || currentUser?.name}</h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1">Reach nearby PG students with fresh, fairly priced produce in {farmer?.serviceArea}.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center"><span className="block text-xl font-black">{listings.length}</span><span className="text-[10px] uppercase font-bold text-emerald-100">Listings</span></div>
          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center"><span className="block text-xl font-black">{farmer?.rating || 0}★</span><span className="text-[10px] uppercase font-bold text-emerald-100">Rating</span></div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-extrabold text-lg text-zinc-900">Your produce listings</h2><p className="text-xs text-zinc-500">Keep quantity and availability accurate for student customers.</p></div>
        <div className="flex gap-2"><button onClick={() => void loadData()} className="p-2 rounded-xl bg-zinc-100 text-zinc-600"><RefreshCw className="w-4 h-4" /></button><button onClick={() => setShowForm(value => !value)} className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add produce</button></div>
      </div>

      {showForm && <form onSubmit={submitListing} className="bg-white rounded-3xl border border-zinc-200 p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Produce name" className="px-3 py-2.5 rounded-xl border border-zinc-200 text-xs" />
          <select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className="px-3 py-2.5 rounded-xl border border-zinc-200 text-xs"><option value="vegetable">Vegetable</option><option value="fruit">Fruit</option><option value="egg">Eggs</option><option value="other">Other</option></select>
          <input required value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} placeholder="Unit e.g. 500 g" className="px-3 py-2.5 rounded-xl border border-zinc-200 text-xs" />
          <input required min="1" type="number" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} placeholder="Price ₹" className="px-3 py-2.5 rounded-xl border border-zinc-200 text-xs" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input required min="0" type="number" value={form.quantityAvailable} onChange={event => setForm({ ...form, quantityAvailable: event.target.value })} placeholder="Quantity available" className="px-3 py-2.5 rounded-xl border border-zinc-200 text-xs" /><input value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Short description (optional)" className="px-3 py-2.5 rounded-xl border border-zinc-200 text-xs" /></div>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600">Cancel</button><button className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold">Publish listing</button></div>
      </form>}

      {listings.length === 0 ? <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center"><Sprout className="w-9 h-9 text-emerald-600 mx-auto mb-2" /><p className="font-bold text-zinc-900">No produce listed yet</p><p className="text-xs text-zinc-500 mt-1">Add your first seasonal item to reach nearby students.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{listings.map(listing => <div key={listing.id} className="bg-white rounded-3xl border border-zinc-200 p-5 flex items-center justify-between gap-4"><div><div className="flex items-center gap-2"><span className="font-extrabold text-sm text-zinc-900">{listing.name}</span><span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">{listing.status}</span></div><p className="text-xs text-zinc-500 mt-1">{listing.description || 'Fresh local produce'} • {listing.unit}</p><p className="text-xs text-zinc-600 mt-2"><strong>₹{listing.price}</strong> · {listing.quantityAvailable} available</p></div><Sprout className="w-6 h-6 text-emerald-600 shrink-0" /></div>)}</div>}
    </div>
  );
};
