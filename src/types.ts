export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'student' | 'homemaker' | 'provider' | 'farmer' | 'institution' | 'admin';
  avatar: string;
  pgName?: string;
  address?: string;
  area: string;
  city: string;
  pincode: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  baseEstimatedPrice: number;
  keywords: string[];
  popular: boolean;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  name: string;
  categorySlug: string;
  bio: string;
  experienceYears: number;
  rating: number;
  reviewsCount: number;
  completedJobs: number;
  responseTime: string;
  serviceArea: string;
  lat: number;
  lng: number;
  radiusKm: number;
  basePrice: number;
  hourlyPrice: number;
  verifiedStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  skills: string[];
  documents: { type: string; title: string; verified: boolean }[];
  isOnline: boolean;
  acceptInstantBookings: boolean;
  avatar: string;
  phone: string;
}

export interface MenuItem {
  id: string;
  homemakerId: string;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  isVeg: boolean;
  price: number;
  calories?: number;
  contents: string[];
  availableDays: string[];
  isAvailableToday: boolean;
  imageUrl?: string;
}

export interface MealPackage {
  id: string;
  homemakerId: string;
  title: string;
  description: string;
  planType: 'daily' | 'weekly' | 'monthly';
  mealType: 'lunch' | 'dinner' | 'both';
  pricePerMeal: number;
  totalPrice: number;
  durationDays: number;
  isVeg: boolean;
  savingsPercent: number;
}

export interface HomemakerProfile {
  id: string;
  userId: string;
  kitchenName: string;
  ownerName: string;
  bio: string;
  rating: number;
  reviewsCount: number;
  completedOrders: number;
  dailyCapacity: number;
  currentCapacityUsed: number;
  serviceArea: string;
  lat: number;
  lng: number;
  radiusKm: number;
  isVegOnly: boolean;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  fssaiNumber: string;
  verifiedStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  deliveryFee: number;
  avatar: string;
  menu: MenuItem[];
  packages: MealPackage[];
  phone: string;
}

export interface Booking {
  id: string;
  bookingCode: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  serviceTitle: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  pgName: string;
  price: number;
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  status: 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'SCHEDULED' | 'ON_THE_WAY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  timeline: { status: string; timestamp: string; note: string }[];
  notes?: string;
  paymentId?: string;
  paymentStatus: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  recurringId?: string;
  recurringRequested?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  cancellationReason?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export interface FoodOrderItem {
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface FoodOrder {
  id: string;
  orderCode: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  homemakerId: string;
  kitchenName: string;
  items: FoodOrderItem[];
  mealPackageId?: string;
  packageTitle?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'both';
  scheduledDate: string;
  deliveryTimeSlot: string;
  deliveryAddress: string;
  pgName: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  grandTotal: number;
  status: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  timeline: { status: string; timestamp: string; note: string }[];
  paymentId?: string;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  isRecurring: boolean;
  recurringDays?: number;
  recurringStartDate?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export interface RecurringService {
  id: string;
  studentId: string;
  studentName: string;
  providerId: string;
  providerName: string;
  type: 'food' | 'service';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  title: string;
  details: string;
  startDate: string;
  endDate: string;
  pricePerCycle: number;
  totalCycles: number;
  completedCycles: number;
  status: 'active' | 'paused' | 'cancelled';
  nextDeliveryDate: string;
  notes?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId?: string;
  orderId?: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  providerId: string;
  rating: number;
  comment: string;
  serviceType: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'order' | 'payment' | 'system' | 'reminder';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Complaint {
  id: string;
  ticketId: string;
  reporterId: string;
  reporterName: string;
  reportedId: string;
  reportedName: string;
  bookingId?: string;
  orderId?: string;
  category: 'poor_service' | 'no_show' | 'harassment' | 'payment_issue' | 'food_quality' | 'other';
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  resolution?: string;
  createdAt: string;
}

export interface FarmerProfile {
  id: string;
  userId: string;
  farmName: string;
  ownerName: string;
  bio: string;
  serviceArea: string;
  lat: number;
  lng: number;
  radiusKm: number;
  verifiedStatus: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  rating: number;
  reviewsCount: number;
  avatar: string;
}

export interface ProduceListing {
  id: string;
  farmerId: string;
  name: string;
  category: 'vegetable' | 'fruit' | 'egg' | 'other';
  description: string;
  unit: string;
  price: number;
  quantityAvailable: number;
  availableFrom: string;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  status: 'ACTIVE' | 'PAUSED' | 'SOLD_OUT';
  createdAt: string;
}

export interface Institution {
  id: string;
  userId: string;
  name: string;
  domain?: string;
  city: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
}

export interface ParsedAiResponse {
  category: string;
  problem: string;
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  meal?: 'breakfast' | 'lunch' | 'dinner' | 'both' | null;
  diet?: 'vegetarian' | 'non-vegetarian' | 'any';
  recurring: boolean;
  durationDays?: number;
  budgetMax?: number;
  recommendedServiceTitle: string;
  estimatedDuration?: string;
  clarificationNeeded?: string | null;
  matchedProviders: Array<{
    item: any;
    type: 'service' | 'food';
    matchScore: number;
    reasons: string[];
  }>;
  bookingDraft?: any;
}
