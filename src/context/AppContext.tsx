import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Notification, ProviderProfile, HomemakerProfile } from '../types';
import { api } from '../api';

interface AppContextType {
  currentUser: User | null;
  allDemoUsers: User[];
  switchUser: (user: User) => Promise<void>;
  setAuthenticatedUser: (user: User, token?: string) => void;
  logout: () => Promise<void>;
  currentArea: string;
  setCurrentArea: (area: string) => void;
  notifications: Notification[];
  unreadNotifCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  bookingModal: { isOpen: boolean; provider?: ProviderProfile };
  openBookingModal: (provider: ProviderProfile) => void;
  closeBookingModal: () => void;
  foodModal: { isOpen: boolean; homemaker?: HomemakerProfile; initialPackageId?: string; initialMealType?: string };
  openFoodModal: (homemaker: HomemakerProfile, initialPackageId?: string, initialMealType?: string) => void;
  closeFoodModal: () => void;
  reviewModal: { isOpen: boolean; bookingId?: string; orderId?: string; providerId?: string; providerName?: string; serviceType?: string };
  openReviewModal: (data: { bookingId?: string; orderId?: string; providerId: string; providerName: string; serviceType: string }) => void;
  closeReviewModal: () => void;
  reportModal: { isOpen: boolean; targetId?: string; targetName?: string };
  openReportModal: (targetId: string, targetName: string) => void;
  closeReportModal: () => void;
  aiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allDemoUsers, setAllDemoUsers] = useState<User[]>([]);
  const [currentArea, setCurrentArea] = useState<string>('Koramangala');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const [bookingModal, setBookingModal] = useState<{ isOpen: boolean; provider?: ProviderProfile }>({ isOpen: false });
  const [foodModal, setFoodModal] = useState<{ isOpen: boolean; homemaker?: HomemakerProfile; initialPackageId?: string; initialMealType?: string }>({ isOpen: false });
  const [reviewModal, setReviewModal] = useState<{ isOpen: boolean; bookingId?: string; orderId?: string; providerId?: string; providerName?: string; serviceType?: string }>({ isOpen: false });
  const [reportModal, setReportModal] = useState<{ isOpen: boolean; targetId?: string; targetName?: string }>({ isOpen: false });
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);

  // Restore an existing signed session. In development, establish a demo student
  // session only after the server explicitly permits demo persona login.
  useEffect(() => {
    api.getDemoUsers().then(res => {
      if (res && res.users) {
        setAllDemoUsers(res.users);
        const student = res.users.find(u => u.role === 'student') || res.users[0];
        if (res.demoMode === false || !student) {
          setActiveTab('auth');
          return;
        }
        api.getMe()
          .then(me => {
            setCurrentUser(me.user);
            if (me.user?.area) setCurrentArea(me.user.area);
          })
          .catch(async () => {
            if (!student) return;
            try {
              const demoSession = await api.login({ userId: student.id });
              if (demoSession.success) {
                setCurrentUser(demoSession.user);
                if (demoSession.user.area) setCurrentArea(demoSession.user.area);
              } else {
                setActiveTab('auth');
              }
            } catch {
              setActiveTab('auth');
            }
          });
      }
    }).catch(err => {
      console.error('Failed to load demo users:', err);
      setActiveTab('auth');
    });
  }, []);

  // Refresh notifications whenever user changes
  const refreshNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await api.getNotifications(currentUser.id);
      if (res && res.notifications) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.warn('Could not fetch notifications:', err);
    }
  };

  useEffect(() => {
    refreshNotifications();
  }, [currentUser]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const setAuthenticatedUser = (user: User, _token?: string) => {
    setCurrentUser(user);
    if (user.area) setCurrentArea(user.area);
    if (user.role === 'admin') setActiveTab('admin');
    else if (user.role === 'homemaker') setActiveTab('homemaker-dash');
    else if (user.role === 'provider') setActiveTab('provider-dash');
    else if (user.role === 'farmer') setActiveTab('farmer-dash');
    else setActiveTab('home');
  };

  const switchUser = async (user: User) => {
    try {
      const session = await api.login({ userId: user.id });
      if (!session.success) throw new Error('Demo login unavailable');
      setAuthenticatedUser(session.user);
      showToast(`Switched profile to ${session.user.name} (${session.user.role.toUpperCase()})`, 'info');
    } catch {
      showToast('Persona switching is available only in demo mode', 'error');
    }
  };

  const logout = async () => {
    await api.logout();
    setCurrentUser(null);
    setNotifications([]);
    setActiveTab('auth');
    showToast('You have been securely logged out', 'info');
  };

  const markNotificationRead = async (id: string) => {
    if (!currentUser) return;
    await api.markNotificationRead(id, currentUser.id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsRead = async () => {
    if (!currentUser) return;
    await api.markAllNotificationsRead(currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allDemoUsers,
        switchUser,
        setAuthenticatedUser,
        logout,
        currentArea,
        setCurrentArea,
        notifications,
        unreadNotifCount,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        activeTab,
        setActiveTab,
        toast,
        showToast,
        bookingModal,
        openBookingModal: (provider) => setBookingModal({ isOpen: true, provider }),
        closeBookingModal: () => setBookingModal({ isOpen: false }),
        foodModal,
        openFoodModal: (homemaker, initialPackageId, initialMealType) => setFoodModal({ isOpen: true, homemaker, initialPackageId, initialMealType }),
        closeFoodModal: () => setFoodModal({ isOpen: false }),
        reviewModal,
        openReviewModal: (data) => setReviewModal({ isOpen: true, ...data }),
        closeReviewModal: () => setReviewModal({ isOpen: false }),
        reportModal,
        openReportModal: (targetId, targetName) => setReportModal({ isOpen: true, targetId, targetName }),
        closeReportModal: () => setReportModal({ isOpen: false }),
        aiChatOpen,
        setAiChatOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
