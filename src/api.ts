import { User, ProviderProfile, HomemakerProfile, ServiceCategory, Booking, FoodOrder, RecurringService, Review, Notification, Complaint, ParsedAiResponse } from './types';

function getHeaders(userId?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
}

export const api = {
  // Auth
  async getDemoUsers(): Promise<{ users: User[] }> {
    const res = await fetch('/api/auth/demo-users');
    return res.json();
  },

  async login(payload: { email?: string; userId?: string }): Promise<{ success: boolean; user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async register(data: any): Promise<{ success: boolean; user: User; token: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Categories
  async getCategories(): Promise<{ categories: ServiceCategory[] }> {
    const res = await fetch('/api/categories');
    return res.json();
  },

  // Providers
  async getProviders(params: { category?: string; search?: string; area?: string; minRating?: number; verifiedOnly?: boolean } = {}): Promise<{ providers: ProviderProfile[] }> {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.area) query.set('area', params.area);
    if (params.minRating) query.set('minRating', params.minRating.toString());
    if (params.verifiedOnly) query.set('verifiedOnly', 'true');
    const res = await fetch(`/api/providers?${query.toString()}`);
    return res.json();
  },

  async getProvider(id: string): Promise<{ provider: ProviderProfile; reviews: Review[] }> {
    const res = await fetch(`/api/providers/${id}`);
    return res.json();
  },

  async updateProviderStatus(id: string, isOnline: boolean, acceptInstant: boolean, userId: string) {
    const res = await fetch(`/api/providers/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(userId),
      body: JSON.stringify({ isOnline, acceptInstantBookings: acceptInstant })
    });
    return res.json();
  },

  // Food / Homemakers
  async getHomemakers(params: { isVeg?: boolean; mealType?: string; area?: string; search?: string } = {}): Promise<{ homemakers: HomemakerProfile[] }> {
    const query = new URLSearchParams();
    if (params.isVeg) query.set('isVeg', 'true');
    if (params.mealType) query.set('mealType', params.mealType);
    if (params.area) query.set('area', params.area);
    if (params.search) query.set('search', params.search);
    const res = await fetch(`/api/food/homemakers?${query.toString()}`);
    return res.json();
  },

  async getHomemaker(id: string): Promise<{ homemaker: HomemakerProfile; reviews: Review[] }> {
    const res = await fetch(`/api/food/homemakers/${id}`);
    return res.json();
  },

  async addMenuItem(homemakerId: string, itemData: any, userId: string) {
    const res = await fetch(`/api/food/homemakers/${homemakerId}/menu`, {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify(itemData)
    });
    return res.json();
  },

  async updateCapacity(homemakerId: string, capacity: number, userId: string) {
    const res = await fetch(`/api/food/homemakers/${homemakerId}/capacity`, {
      method: 'PUT',
      headers: getHeaders(userId),
      body: JSON.stringify({ dailyCapacity: capacity })
    });
    return res.json();
  },

  // Bookings
  async createBooking(bookingData: any, userId: string): Promise<{ success: boolean; booking: Booking; payment: any }> {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify(bookingData)
    });
    return res.json();
  },

  async getBookings(userId: string): Promise<{ bookings: Booking[] }> {
    const res = await fetch('/api/bookings', {
      headers: getHeaders(userId)
    });
    return res.json();
  },

  async updateBookingStatus(id: string, status: string, note: string | undefined, userId: string): Promise<{ success: boolean; booking: Booking }> {
    const res = await fetch(`/api/bookings/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(userId),
      body: JSON.stringify({ status, note })
    });
    return res.json();
  },

  async cancelBooking(id: string, reason: string, userId: string): Promise<{ success: boolean; booking: Booking }> {
    const res = await fetch(`/api/bookings/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  // Food Orders
  async createFoodOrder(orderData: any, userId: string): Promise<{ success: boolean; order: FoodOrder; payment: any }> {
    const res = await fetch('/api/food/orders', {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify(orderData)
    });
    return res.json();
  },

  async getFoodOrders(userId: string): Promise<{ orders: FoodOrder[] }> {
    const res = await fetch('/api/food/orders', {
      headers: getHeaders(userId)
    });
    return res.json();
  },

  async updateFoodOrderStatus(id: string, status: string, note: string | undefined, userId: string): Promise<{ success: boolean; order: FoodOrder }> {
    const res = await fetch(`/api/food/orders/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(userId),
      body: JSON.stringify({ status, note })
    });
    return res.json();
  },

  // Recurring Subscriptions
  async getRecurringSubscriptions(userId: string): Promise<{ subscriptions: RecurringService[] }> {
    const res = await fetch('/api/recurring', {
      headers: getHeaders(userId)
    });
    return res.json();
  },

  async updateRecurringStatus(id: string, status: 'active' | 'paused' | 'cancelled', userId: string) {
    const res = await fetch(`/api/recurring/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(userId),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // Reviews
  async submitReview(reviewData: any, userId: string): Promise<{ success: boolean; review: Review }> {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify(reviewData)
    });
    return res.json();
  },

  // Notifications
  async getNotifications(userId: string): Promise<{ notifications: Notification[] }> {
    const res = await fetch('/api/notifications', {
      headers: getHeaders(userId)
    });
    return res.json();
  },

  async markNotificationRead(id: string, userId: string) {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(userId)
    });
    return res.json();
  },

  async markAllNotificationsRead(userId: string) {
    const res = await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: getHeaders(userId)
    });
    return res.json();
  },

  // Complaints
  async submitComplaint(data: any, userId: string): Promise<{ success: boolean; complaint: Complaint }> {
    const res = await fetch('/api/complaints', {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // AI Assistant
  async understandRequest(query: string, studentArea: string, userId: string): Promise<ParsedAiResponse> {
    const res = await fetch('/api/ai/understand-request', {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify({ query, studentArea })
    });
    return res.json();
  },

  async askSupportChat(message: string, history: any[], userId: string): Promise<{ reply: string }> {
    const res = await fetch('/api/ai/support-chat', {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify({ message, history })
    });
    return res.json();
  },

  // Admin
  async getAdminDashboard(userId: string) {
    const res = await fetch('/api/admin/dashboard', {
      headers: getHeaders(userId)
    });
    return res.json();
  },

  async getAdminUsers(userId: string) {
    const res = await fetch('/api/admin/users', {
      headers: getHeaders(userId)
    });
    return res.json();
  },

  async getAdminProviders(userId: string) {
    const res = await fetch('/api/admin/providers', {
      headers: getHeaders(userId)
    });
    return res.json();
  },

  async verifyProvider(providerId: string, status: string, userId: string) {
    const res = await fetch(`/api/admin/providers/${providerId}/verify`, {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async updateMatchingWeights(weights: any, userId: string) {
    const res = await fetch('/api/admin/weights', {
      method: 'POST',
      headers: getHeaders(userId),
      body: JSON.stringify(weights)
    });
    return res.json();
  },

  async resolveComplaint(complaintId: string, status: string, resolution: string, userId: string) {
    const res = await fetch(`/api/admin/complaints/${complaintId}`, {
      method: 'PUT',
      headers: getHeaders(userId),
      body: JSON.stringify({ status, resolution })
    });
    return res.json();
  }
};
