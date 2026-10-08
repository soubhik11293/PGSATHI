import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  MapPin, Bell, Sparkles, User, LogOut, CheckCircle, 
  Shield, Utensils, Wrench, GraduationCap, ChevronDown, 
  Menu, X
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    currentUser, 
    allDemoUsers, 
    switchUser, 
    currentArea, 
    setCurrentArea, 
    notifications, 
    unreadNotifCount, 
    markNotificationRead,
    markAllNotificationsRead,
    activeTab, 
    setActiveTab,
    setAiChatOpen
  } = useApp();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const areas = ['Koramangala', 'HSR Layout', 'Indiranagar', 'BTM Layout', 'Bellandur'];

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'student': return <GraduationCap className="w-4 h-4 text-emerald-600" />;
      case 'homemaker': return <Utensils className="w-4 h-4 text-amber-600" />;
      case 'provider': return <Wrench className="w-4 h-4 text-blue-600" />;
      case 'admin': return <Shield className="w-4 h-4 text-purple-600" />;
      default: return <User className="w-4 h-4 text-zinc-600" />;
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'student': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'homemaker': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'provider': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-xs">
      {/* Top Demo Bar for Easy Evaluation */}
      <div className="bg-zinc-900 text-zinc-300 text-xs py-1.5 px-4 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-white">PG SAATHI PROTOTYPE</span>
          <span className="text-zinc-500 hidden sm:inline">|</span>
          <span className="text-zinc-400 hidden sm:inline">Switch instant personas to test all 4 role dashboards:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {allDemoUsers.map(user => (
            <button
              key={user.id}
              onClick={() => switchUser(user)}
              className={`px-2 py-0.5 rounded text-xs transition-colors flex items-center gap-1 ${
                currentUser?.id === user.id
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              {getRoleIcon(user.role)}
              <span className="capitalize">{user.role}</span>
              <span className="hidden md:inline text-[11px] opacity-75">({user.name.split(' ')[0]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (currentUser?.role === 'admin') setActiveTab('admin');
                else if (currentUser?.role === 'homemaker') setActiveTab('homemaker-dash');
                else if (currentUser?.role === 'provider') setActiveTab('provider-dash');
                else setActiveTab('home');
              }}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 font-black text-xl tracking-tight">
                PG
              </div>
              <div>
                <span className="font-extrabold text-lg text-zinc-900 tracking-tight flex items-center gap-1">
                  PG Saathi
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Hostel Hub
                  </span>
                </span>
                <p className="text-[11px] text-zinc-500 font-medium hidden sm:block">
                  Everything your PG life needs, in one place.
                </p>
              </div>
            </button>
          </div>

          {/* Area Selector (Location) */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200/80 transition-colors border border-zinc-200 text-xs text-zinc-800">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-zinc-500">PG Zone:</span>
            <select
              value={currentArea}
              onChange={(e) => setCurrentArea(e.target.value)}
              className="bg-transparent font-semibold text-zinc-900 focus:outline-none cursor-pointer"
            >
              {areas.map(a => (
                <option key={a} value={a}>{a}, Bengaluru</option>
              ))}
            </select>
          </div>

          {/* Navigation Links (Role Sensitive) */}
          <nav className="hidden lg:flex items-center gap-1">
            {currentUser?.role === 'student' && (
              <>
                <button
                  onClick={() => setActiveTab('home')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'home' ? 'text-amber-700 bg-amber-50 font-semibold' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => setActiveTab('explore')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'explore' ? 'text-amber-700 bg-amber-50 font-semibold' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Explore Services
                </button>
                <button
                  onClick={() => setActiveTab('food')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'food' ? 'text-amber-700 bg-amber-50 font-semibold' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <span>🍱</span> Homemade Food
                </button>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'bookings' ? 'text-amber-700 bg-amber-50 font-semibold' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  My Bookings & Food
                </button>
              </>
            )}

            {currentUser?.role === 'homemaker' && (
              <>
                <button
                  onClick={() => setActiveTab('homemaker-dash')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'homemaker-dash' ? 'text-amber-700 bg-amber-50 font-semibold' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Kitchen Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('food')}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                >
                  Marketplace Preview
                </button>
              </>
            )}

            {currentUser?.role === 'provider' && (
              <>
                <button
                  onClick={() => setActiveTab('provider-dash')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'provider-dash' ? 'text-blue-700 bg-blue-50 font-semibold' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Service Jobs Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('explore')}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                >
                  Marketplace Preview
                </button>
              </>
            )}

            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'admin' ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Admin Operations Console
                </button>
              </>
            )}
          </nav>

          {/* Right Action Icons: AI Button, Notifications, User */}
          <div className="flex items-center gap-2">
            {/* AI Assistant Button */}
            <button
              onClick={() => setAiChatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-xs shadow-sm hover:shadow transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Saathi</span>
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-zinc-200 py-3 z-50">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-zinc-100">
                    <span className="font-bold text-sm text-zinc-900">Notifications</span>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={() => markAllNotificationsRead()}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 8).map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            if (n.link === '/bookings') setActiveTab('bookings');
                            if (n.link === '/orders') setActiveTab('bookings');
                            if (n.link === '/provider/orders') setActiveTab('homemaker-dash');
                            if (n.link === '/provider/bookings') setActiveTab('provider-dash');
                            setShowNotifs(false);
                          }}
                          className={`p-3 text-left hover:bg-zinc-50 cursor-pointer transition-colors ${
                            !n.isRead ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-xs text-zinc-900">{n.title}</span>
                            <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Persona Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 p-1.5 sm:px-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={currentUser?.name}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-300"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-zinc-900 truncate max-w-[120px]">
                    {currentUser?.name}
                  </div>
                  <div className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full border inline-block ${getRoleBadge(currentUser?.role)}`}>
                    {currentUser?.role?.toUpperCase()}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-zinc-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-zinc-100">
                    <p className="text-xs font-bold text-zinc-900">{currentUser?.name}</p>
                    <p className="text-[11px] text-zinc-500">{currentUser?.email}</p>
                    {currentUser?.pgName && (
                      <p className="text-[10px] text-amber-700 font-medium mt-1">
                        📍 {currentUser.pgName}
                      </p>
                    )}
                  </div>

                  <div className="px-2 py-1.5">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Switch Role Persona
                    </p>
                    {allDemoUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchUser(user);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          currentUser?.id === user.id ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role)}
                          <div>
                            <div className="capitalize">{user.name}</div>
                            <div className="text-[10px] text-zinc-500">{user.role}</div>
                          </div>
                        </div>
                        {currentUser?.id === user.id && <CheckCircle className="w-3.5 h-3.5 text-amber-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="lg:hidden p-2 rounded-xl text-zinc-600 hover:bg-zinc-100"
            >
              {showMobileNav ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {showMobileNav && (
          <div className="lg:hidden py-3 border-t border-zinc-200 flex flex-col gap-1 pb-4">
            <div className="px-3 py-2 mb-2 bg-zinc-50 rounded-xl text-xs flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-600" /> Zone:
              </span>
              <select
                value={currentArea}
                onChange={(e) => setCurrentArea(e.target.value)}
                className="bg-transparent font-bold text-zinc-900"
              >
                {areas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {currentUser?.role === 'student' && (
              <>
                <button
                  onClick={() => { setActiveTab('home'); setShowMobileNav(false); }}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium ${
                    activeTab === 'home' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-zinc-700'
                  }`}
                >
                  Home Dashboard
                </button>
                <button
                  onClick={() => { setActiveTab('explore'); setShowMobileNav(false); }}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium ${
                    activeTab === 'explore' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-zinc-700'
                  }`}
                >
                  Explore Services
                </button>
                <button
                  onClick={() => { setActiveTab('food'); setShowMobileNav(false); }}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium ${
                    activeTab === 'food' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-zinc-700'
                  }`}
                >
                  🍱 Homemade Food & Dabba
                </button>
                <button
                  onClick={() => { setActiveTab('bookings'); setShowMobileNav(false); }}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium ${
                    activeTab === 'bookings' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-zinc-700'
                  }`}
                >
                  My Bookings & Orders
                </button>
              </>
            )}

            {currentUser?.role === 'homemaker' && (
              <button
                onClick={() => { setActiveTab('homemaker-dash'); setShowMobileNav(false); }}
                className="text-left px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-50 text-amber-700"
              >
                Kitchen Dashboard
              </button>
            )}

            {currentUser?.role === 'provider' && (
              <button
                onClick={() => { setActiveTab('provider-dash'); setShowMobileNav(false); }}
                className="text-left px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-blue-700"
              >
                Service Jobs Dashboard
              </button>
            )}

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => { setActiveTab('admin'); setShowMobileNav(false); }}
                className="text-left px-4 py-2.5 rounded-xl text-sm font-bold bg-purple-50 text-purple-700"
              >
                Admin Operations Console
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
