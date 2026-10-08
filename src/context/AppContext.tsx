import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Notification, ProviderProfile, HomemakerProfile } from '../types';
import { api } from '../api';

interface AppContextType {
  currentUser: User | null;
  allDemoUsers: User[];
  switchUser: (user: User) => void;
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

  // Load demo users on mount
  useEffect(() => {
    api.getDemoUsers().then(res => {
      if (res && res.users) {
        setAllDemoUsers(res.users);
        // Default to student Aarav Patel
        const student = res.users.find(u => u.role === 'student') || res.users[0];
        setCurrentUser(student);
        if (student?.area) {
          setCurrentArea(student.area);
        }
      }
    }).catch(err => {
      console.error('Failed to load demo users:', err);
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

  const switchUser = (user: User) => {
    setCurrentUser(user);
    if (user.area) setCurrentArea(user.area);

    // Auto-route to respective role dashboard
    if (user.role === 'admin') {
      setActiveTab('admin');
    } else if (user.role === 'homemaker') {
      setActiveTab('homemaker-dash');
    } else if (user.role === 'provider') {
      setActiveTab('provider-dash');
    } else {
      setActiveTab('home');
    }

    showToast(`Switched profile to ${user.name} (${user.role.toUpperCase()})`, 'info');
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
