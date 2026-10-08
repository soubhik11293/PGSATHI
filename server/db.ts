import fs from 'fs';
import path from 'path';
import { hashPassword } from './auth';
import { SqliteStorage } from './storage';

// Core entities for PG Saathi

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
  /** Stored server-side only. Never include this field in an API response. */
  passwordHash?: string;
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

export interface InstitutionAnnouncement {
  id: string;
  institutionId: string;
  title: string;
  body: string;
  publishedAt: string;
  status: 'PUBLISHED' | 'ARCHIVED';
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
  responseTime: string; // e.g. "15 mins"
  serviceArea: string; // e.g. "Koramangala, HSR, BTM"
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

export interface PaymentRecord {
  id: string;
  transactionRef: string;
  orderType: 'booking' | 'food_order';
  referenceId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'upi' | 'razorpay' | 'card' | 'cod';
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  gatewayResponse?: any;
  gatewayOrderId?: string;
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
  rating: number; // 1-5
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

// Memory + Persistence Engine
class Database {
  private dataDir = path.resolve(process.cwd(), 'data');
  private dbFile = path.resolve(this.dataDir, 'pgsaathi.json');
  private sqliteStorage?: SqliteStorage;

  public users: User[] = [];
  public categories: ServiceCategory[] = [];
  public providers: ProviderProfile[] = [];
  public homemakers: HomemakerProfile[] = [];
  public bookings: Booking[] = [];
  public foodOrders: FoodOrder[] = [];
  public recurringServices: RecurringService[] = [];
  public payments: PaymentRecord[] = [];
  public reviews: Review[] = [];
  public notifications: Notification[] = [];
  public complaints: Complaint[] = [];
  public farmers: FarmerProfile[] = [];
  public produceListings: ProduceListing[] = [];
  public institutions: Institution[] = [];
  public institutionAnnouncements: InstitutionAnnouncement[] = [];
  public matchingWeights = {
    serviceRelevance: 0.30,
    availability: 0.20,
    rating: 0.15,
    distance: 0.15,
    price: 0.10,
    reliability: 0.10
  };

  constructor() {
    if (process.env.STORAGE_DRIVER === 'sqlite') this.sqliteStorage = new SqliteStorage();
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (this.sqliteStorage?.initialized()) {
        const parsed = this.sqliteStorage.load();
        this.users = parsed.users || [];
        this.categories = parsed.categories || [];
        this.providers = parsed.providers || [];
        this.homemakers = parsed.homemakers || [];
        this.bookings = parsed.bookings || [];
        this.foodOrders = parsed.foodOrders || [];
        this.recurringServices = parsed.recurringServices || [];
        this.payments = parsed.payments || [];
        this.reviews = parsed.reviews || [];
        this.notifications = parsed.notifications || [];
        this.complaints = parsed.complaints || [];
        this.farmers = parsed.farmers || [];
        this.produceListings = parsed.produceListings || [];
        this.institutions = parsed.institutions || [];
        this.institutionAnnouncements = parsed.institutionAnnouncements || [];
        if (parsed.matchingWeights) this.matchingWeights = parsed.matchingWeights;
      } else if (fs.existsSync(this.dbFile)) {
        const raw = fs.readFileSync(this.dbFile, 'utf-8');
        const parsed = JSON.parse(raw);
        this.users = parsed.users || [];
        this.categories = parsed.categories || [];
        this.providers = parsed.providers || [];
        this.homemakers = parsed.homemakers || [];
        this.bookings = parsed.bookings || [];
        this.foodOrders = parsed.foodOrders || [];
        this.recurringServices = parsed.recurringServices || [];
        this.payments = parsed.payments || [];
        this.reviews = parsed.reviews || [];
        this.notifications = parsed.notifications || [];
        this.complaints = parsed.complaints || [];
        this.farmers = parsed.farmers || [];
        this.produceListings = parsed.produceListings || [];
        this.institutions = parsed.institutions || [];
        this.institutionAnnouncements = parsed.institutionAnnouncements || [];
        if (parsed.matchingWeights) this.matchingWeights = parsed.matchingWeights;
      }
    } catch (err) {
      console.warn('Could not read persistent DB, will seed fresh:', err);
    }

    if (this.users.length === 0 || this.providers.length === 0 || this.homemakers.length === 0) {
      this.seedInitialData();
      this.save();
    }

    let migrated = false;
    const demoPassword = process.env.DEMO_PASSWORD || 'demo1234';
    for (const user of this.users) {
      if (!user.passwordHash) {
        user.passwordHash = hashPassword(demoPassword);
        migrated = true;
      }
    }

    if (this.farmers.length === 0) {
      this.seedMarketplaceExtensions();
      migrated = true;
    }

    if (migrated) this.save();
  }

  public save() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const payload = {
        users: this.users,
        categories: this.categories,
        providers: this.providers,
        homemakers: this.homemakers,
        bookings: this.bookings,
        foodOrders: this.foodOrders,
        recurringServices: this.recurringServices,
        payments: this.payments,
        reviews: this.reviews,
        notifications: this.notifications,
        complaints: this.complaints,
        farmers: this.farmers,
        produceListings: this.produceListings,
        institutions: this.institutions,
        institutionAnnouncements: this.institutionAnnouncements,
        matchingWeights: this.matchingWeights
      };
      if (this.sqliteStorage) this.sqliteStorage.save(payload);
      else fs.writeFileSync(this.dbFile, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving DB:', err);
    }
  }

  private seedInitialData() {
    // 1. Service Categories
    this.categories = [
      {
        id: 'cat-food',
        slug: 'food',
        name: 'Homemade Food & Tiffin',
        icon: '🍱',
        description: 'Warm, nutritious home-cooked meals, daily dabbas & weekly subscriptions from trusted local homemakers.',
        baseEstimatedPrice: 90,
        keywords: ['food', 'tiffin', 'dinner', 'lunch', 'breakfast', 'meal', 'veg', 'dabba', 'chapati', 'roti', 'homemaker'],
        popular: true
      },
      {
        id: 'cat-cleaning',
        slug: 'cleaner',
        name: 'Room & Bathroom Cleaning',
        icon: '🧹',
        description: 'Deep room dusting, floor mopping, bathroom sanitization, and balcony wash tailored for PG rooms.',
        baseEstimatedPrice: 199,
        keywords: ['cleaning', 'cleaner', 'dusting', 'mopping', 'bathroom', 'room clean', 'maid', 'deep clean'],
        popular: true
      },
      {
        id: 'cat-plumbing',
        slug: 'plumber',
        name: 'Plumbing & Tap Repair',
        icon: '🔧',
        description: 'Fix leaking taps, clogged drains, geyser pipe connections, and flush tank valves quickly.',
        baseEstimatedPrice: 149,
        keywords: ['plumber', 'plumbing', 'tap', 'leak', 'drain', 'pipe', 'sink', 'geyser', 'flush', 'water'],
        popular: true
      },
      {
        id: 'cat-electrical',
        slug: 'electrician',
        name: 'Electrical & Appliance Fix',
        icon: '💡',
        description: 'Ceiling fan repairs, tubelight/LED fixes, switchboard replacements, and kettle/iron troubleshooting.',
        baseEstimatedPrice: 149,
        keywords: ['electrician', 'electrical', 'fan', 'light', 'switch', 'socket', 'wiring', 'fuse', 'kettle', 'cooler'],
        popular: true
      },
      {
        id: 'cat-laundry',
        slug: 'laundry',
        name: 'Laundry & Ironing',
        icon: '👕',
        description: 'Wash, dry, and crisp iron clothes with same-day or 24-hr doorstep pickup and drop for PG residents.',
        baseEstimatedPrice: 120,
        keywords: ['laundry', 'wash', 'iron', 'press', 'dry clean', 'clothes', 'linen', 'bedsheet'],
        popular: true
      },
      {
        id: 'cat-repairs',
        slug: 'repairs',
        name: 'Handyman & Furniture Repairs',
        icon: '🛠️',
        description: 'Cupboard latch fix, bed frame tightening, desk repair, door hinges, and wall drilling for curtains.',
        baseEstimatedPrice: 180,
        keywords: ['repairs', 'handyman', 'carpenter', 'furniture', 'door', 'bed', 'desk', 'latch', 'drill', 'curtain'],
        popular: false
      },
      {
        id: 'cat-errands',
        slug: 'errands',
        name: 'PG Errands & Grocery Help',
        icon: '🛒',
        description: 'Water can delivery, medicine pickup, local stationary xerox, parcel drops, and room essentials runs.',
        baseEstimatedPrice: 79,
        keywords: ['errands', 'grocery', 'medicine', 'parcel', 'water can', 'stationery', 'xerox', 'delivery'],
        popular: false
      },
      {
        id: 'cat-moving',
        slug: 'moving',
        name: 'PG Shift & Luggage Moving',
        icon: '📦',
        description: 'Hassle-free luggage shifting between hostels, room shifting assistance, and storage luggage handling.',
        baseEstimatedPrice: 399,
        keywords: ['moving', 'shifting', 'luggage', 'relocation', 'boxes', 'room change'],
        popular: false
      }
    ];

    // 2. Demo Users (Pre-populated for instant testing)
    this.users = [
      {
        id: 'usr-student-aarav',
        email: 'student@pgsaathi.com',
        name: 'Aarav Patel',
        phone: '+91 98451 23456',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
        pgName: 'Stanza Living - Poznan House',
        address: 'Room 304, 5th Main, 4th Block, Koramangala',
        area: 'Koramangala',
        city: 'Bengaluru',
        pincode: '560034',
        status: 'active',
        createdAt: '2026-09-01T10:00:00Z'
      },
      {
        id: 'usr-homemaker-sunita',
        email: 'sunita@pgsaathi.com',
        name: 'Sunita Sharma',
        phone: '+91 97112 34567',
        role: 'homemaker',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
        address: '142, 17th Cross, HSR Sector 2',
        area: 'HSR Layout',
        city: 'Bengaluru',
        pincode: '560102',
        status: 'active',
        createdAt: '2026-08-15T09:30:00Z'
      },
      {
        id: 'usr-provider-ramesh',
        email: 'ramesh@pgsaathi.com',
        name: 'Ramesh Kumar',
        phone: '+91 99887 65432',
        role: 'provider',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        address: 'Plot 28, Near Sony Signal, Koramangala',
        area: 'Koramangala',
        city: 'Bengaluru',
        pincode: '560034',
        status: 'active',
        createdAt: '2026-08-10T11:00:00Z'
      },
      {
        id: 'usr-admin-pgsaathi',
        email: 'admin@pgsaathi.com',
        name: 'Pooja Verma (Operations Lead)',
        phone: '+91 88776 54321',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        address: 'HQ Tower, Indiranagar 100ft Road',
        area: 'Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
        status: 'active',
        createdAt: '2026-08-01T08:00:00Z'
      }
    ];

    // 3. Homemakers (Food Providers)
    this.homemakers = [
      {
        id: 'hm-1',
        userId: 'usr-homemaker-sunita',
        kitchenName: "Sunita's Ghar Ka Khana",
        ownerName: 'Sunita Sharma',
        bio: 'Mother of two making authentic, homestyle North & Central Indian thalis with cold-pressed oil, minimal spices, and pure desi ghee chapatis. Vegetarian home kitchen.',
        rating: 4.88,
        reviewsCount: 142,
        completedOrders: 530,
        dailyCapacity: 35,
        currentCapacityUsed: 14,
        serviceArea: 'Koramangala, HSR Layout, BTM Layout',
        lat: 12.9352,
        lng: 77.6245,
        radiusKm: 6.5,
        isVegOnly: true,
        deliveryAvailable: true,
        pickupAvailable: true,
        fssaiNumber: '21223180004512',
        verifiedStatus: 'VERIFIED',
        deliveryFee: 15,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
        phone: '+91 97112 34567',
        menu: [
          {
            id: 'm-101',
            homemakerId: 'hm-1',
            name: 'Homestyle Veg Thali (Daily Special)',
            mealType: 'dinner',
            description: '4 Phulkas with desi ghee, Dal Tadka, Paneer Bhurji / Seasonal Sabzi, steamed Jeera Rice, salad and homemade pickle.',
            isVeg: true,
            price: 110,
            calories: 520,
            contents: ['4 Phulkas', 'Dal Tadka', 'Paneer Sabzi', 'Jeera Rice', 'Kachumber Salad', 'Achar'],
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&auto=format&fit=crop&q=80'
          },
          {
            id: 'm-102',
            homemakerId: 'hm-1',
            name: 'Comfort Khichdi & Curd Dabba',
            mealType: 'dinner',
            description: 'Light Moong Dal Khichdi prepared with cumin tempering, served with fresh curd, papad, and mint chutney. Perfect when feeling under the weather.',
            isVeg: true,
            price: 85,
            calories: 380,
            contents: ['Moong Dal Khichdi', 'Fresh Curd', 'Roasted Papad', 'Pudina Chutney'],
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80'
          },
          {
            id: 'm-103',
            homemakerId: 'hm-1',
            name: 'Student Power Lunch Box',
            mealType: 'lunch',
            description: 'Rajma Masala or Chole with fragrant Basmati Rice, 2 soft rotis, cucumber raita and gulab jamun.',
            isVeg: true,
            price: 105,
            calories: 580,
            contents: ['Punjabi Rajma/Chole', 'Basmati Rice', '2 Rotis', 'Boondi Raita', 'Sweet'],
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop&q=80'
          },
          {
            id: 'm-104',
            homemakerId: 'hm-1',
            name: 'Poha & Chai Morning Booster',
            mealType: 'breakfast',
            description: 'Indori steamed poha topped with ratlami sev, roasted peanuts, pomegranate, with hot ginger tea.',
            isVeg: true,
            price: 60,
            calories: 310,
            contents: ['Indori Poha', 'Sev & Peanuts', 'Lemon slice', 'Cutting Adrak Chai'],
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80'
          }
        ],
        packages: [
          {
            id: 'pkg-1',
            homemakerId: 'hm-1',
            title: '7-Day Dinner Dabba Subscription',
            description: 'Healthy dinner delivered to your PG door every evening (7:30 PM - 8:30 PM). Rotating daily menu.',
            planType: 'weekly',
            mealType: 'dinner',
            pricePerMeal: 99,
            totalPrice: 693,
            durationDays: 7,
            isVeg: true,
            savingsPercent: 12
          },
          {
            id: 'pkg-2',
            homemakerId: 'hm-1',
            title: 'Monthly Dual Meal Plan (Lunch + Dinner)',
            description: 'Full 30-day hassle-free meal coverage. Pause anytime when traveling back home.',
            planType: 'monthly',
            mealType: 'both',
            pricePerMeal: 90,
            totalPrice: 5400,
            durationDays: 30,
            isVeg: true,
            savingsPercent: 20
          }
        ]
      },
      {
        id: 'hm-2',
        kitchenName: "Aunty's South Kitchen",
        ownerName: 'Lakshmi Narayanan',
        bio: 'Authentic Tamil Nadu & Kerala style meals cooked with coconut oil, freshly grated spices, and aromatic rasam. Serving PG students across Koramangala & Indiranagar.',
        rating: 4.92,
        reviewsCount: 198,
        completedOrders: 780,
        dailyCapacity: 40,
        currentCapacityUsed: 22,
        serviceArea: 'Koramangala, Indiranagar, Domlur, Ejipura',
        lat: 12.9344,
        lng: 77.6200,
        radiusKm: 7.0,
        isVegOnly: false,
        deliveryAvailable: true,
        pickupAvailable: true,
        fssaiNumber: '21221190008821',
        verifiedStatus: 'VERIFIED',
        deliveryFee: 15,
        avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&auto=format&fit=crop&q=80',
        phone: '+91 98452 77112',
        userId: 'usr-hm-lakshmi',
        menu: [
          {
            id: 'm-201',
            homemakerId: 'hm-2',
            name: 'Traditional South Indian Meals Thali',
            mealType: 'lunch',
            description: 'Steamed Sona Masoori Rice, piping hot Drumstick Sambar, Pepper Rasam, Cabbage Poriyal, Appalam, Curd and Pickle.',
            isVeg: true,
            price: 95,
            calories: 490,
            contents: ['Steamed Rice', 'Murungakkai Sambar', 'Milagu Rasam', 'Veg Poriyal', 'Curd', 'Appalam'],
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=400&auto=format&fit=crop&q=80'
          },
          {
            id: 'm-202',
            homemakerId: 'hm-2',
            name: 'Malabar Chicken Curry & 3 Parottas',
            mealType: 'dinner',
            description: 'Slow-cooked chicken in coconut roasted spice gravy served with flaky handmade Kerala parottas.',
            isVeg: false,
            price: 145,
            calories: 670,
            contents: ['Malabar Chicken Curry (3 pcs)', '3 Malabar Parottas', 'Onion Salad', 'Lime'],
            availableDays: ['Wednesday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=80'
          },
          {
            id: 'm-203',
            homemakerId: 'hm-2',
            name: 'Soft Idli (3) & Vada Combo with 2 Chutneys',
            mealType: 'breakfast',
            description: 'Steaming fluffy idlis, 1 crispy medu vada, accompanied by coconut chutney, tomato onion chutney, and drumstick sambar.',
            isVeg: true,
            price: 65,
            calories: 340,
            contents: ['3 Ghee Podi Idlis', '1 Medu Vada', 'Sambar', 'Coconut Chutney', 'Tomato Chutney'],
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80'
          }
        ],
        packages: [
          {
            id: 'pkg-201',
            homemakerId: 'hm-2',
            title: '7-Day Pure South Dinner Plan',
            description: 'Light, healthy dinners including dosas, chapati kurma, and idli platters delivered nightly.',
            planType: 'weekly',
            mealType: 'dinner',
            pricePerMeal: 90,
            totalPrice: 630,
            durationDays: 7,
            isVeg: true,
            savingsPercent: 10
          }
        ]
      },
      {
        id: 'hm-3',
        kitchenName: 'Maa Ki Rasoi (Gujarati & Jain Specials)',
        ownerName: 'Geeta Ben Shah',
        bio: 'Gentle, gut-friendly pure Gujarati food with no onion & no garlic options. Sweet dal, rotlis rolled paper-thin, and seasonal khichdi.',
        rating: 4.85,
        reviewsCount: 88,
        completedOrders: 310,
        dailyCapacity: 25,
        currentCapacityUsed: 9,
        serviceArea: 'Koramangala, BTM Layout, Tavarekere',
        lat: 12.9280,
        lng: 77.6180,
        radiusKm: 5.0,
        isVegOnly: true,
        deliveryAvailable: true,
        pickupAvailable: true,
        fssaiNumber: '21222170003319',
        verifiedStatus: 'VERIFIED',
        deliveryFee: 15,
        avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&auto=format&fit=crop&q=80',
        phone: '+91 99163 44552',
        userId: 'usr-hm-geeta',
        menu: [
          {
            id: 'm-301',
            homemakerId: 'hm-3',
            name: 'Kathiyawadi Thali (Rotla + Sev Tameta)',
            mealType: 'dinner',
            description: '2 Bajra Rotla with white butter (makhan), Sev Tameta Shaak, Lasaniya Bateta, and Chaas.',
            isVeg: true,
            price: 115,
            calories: 480,
            contents: ['2 Bajra Rotla', 'Sev Tameta Shaak', 'Lasaniya Bateta', 'Desi Makhan', 'Spiced Buttermilk'],
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80'
          },
          {
            id: 'm-302',
            homemakerId: 'hm-3',
            name: 'Gujarati Simple Lunch (5 Rotlis + Dal Bhaat)',
            mealType: 'lunch',
            description: '5 soft Phulkas, sweet-sour Tuvar Dal, seasonal subzi, Steamed Rice, Kachumber salad and sweet Chhundo.',
            isVeg: true,
            price: 95,
            calories: 450,
            contents: ['5 Phulkas', 'Gujarati Dal', 'Sukhi Bhaji', 'Rice', 'Chhundo'],
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&auto=format&fit=crop&q=80'
          }
        ],
        packages: [
          {
            id: 'pkg-301',
            homemakerId: 'hm-3',
            title: '7-Day Jain/Gujarati Dinner Subscription',
            description: 'Light home dinner cooked fresh at 6:30 PM. Delivered hot to your room by 8:00 PM.',
            planType: 'weekly',
            mealType: 'dinner',
            pricePerMeal: 95,
            totalPrice: 665,
            durationDays: 7,
            isVeg: true,
            savingsPercent: 10
          }
        ]
      },
      {
        id: 'hm-4',
        kitchenName: 'Bong Tiffin & Curries',
        ownerName: 'Mousumi Banerjee',
        bio: 'Calcutta style home cooking! Posto, Machher Jhol, Kosha Mangsho, and light everyday Dal-Bhat-Bhaja for homesick Bengali students in Bangalore.',
        rating: 4.79,
        reviewsCount: 112,
        completedOrders: 420,
        dailyCapacity: 30,
        currentCapacityUsed: 18,
        serviceArea: 'Koramangala, Indiranagar, HSR Layout',
        lat: 12.9360,
        lng: 77.6290,
        radiusKm: 6.0,
        isVegOnly: false,
        deliveryAvailable: true,
        pickupAvailable: true,
        fssaiNumber: '21223190004481',
        verifiedStatus: 'VERIFIED',
        deliveryFee: 15,
        avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format&fit=crop&q=80',
        phone: '+91 98301 22998',
        userId: 'usr-hm-mousumi',
        menu: [
          {
            id: 'm-401',
            homemakerId: 'hm-4',
            name: 'Bengali Everyday Thali (Rui Machher Jhol)',
            mealType: 'lunch',
            description: 'Fluffy Rice, Sonamug Dal, Jhuri Aloo Bhaja, Fresh Rui Fish Kalia (1 pc) and Tomato-Khejur Chutney.',
            isVeg: false,
            price: 135,
            calories: 590,
            contents: ['Basmati Rice', 'Bhaja Muger Dal', 'Aloo Bhaja', 'Rui Macher Jhol', 'Chutney'],
            availableDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80'
          },
          {
            id: 'm-402',
            homemakerId: 'hm-4',
            name: 'Niramish (Veg) Khichuri & Beguni Combo',
            mealType: 'dinner',
            description: 'Bhuna Khichuri cooked with gobhindobhog rice, served with crispy Beguni (eggplant fritter), aloo dum, and papad.',
            isVeg: true,
            price: 99,
            calories: 460,
            contents: ['Gobindobhog Khichuri', '2 Beguni', 'Aloo Dum', 'Roasted Papad'],
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80'
          }
        ],
        packages: [
          {
            id: 'pkg-401',
            homemakerId: 'hm-4',
            title: '7-Day Dinner Plan (Veg & Non-Veg Mixed)',
            description: 'Enjoy 4 days egg/chicken/fish curry and 3 days rich veg dinner delivered hot.',
            planType: 'weekly',
            mealType: 'dinner',
            pricePerMeal: 119,
            totalPrice: 833,
            durationDays: 7,
            isVeg: false,
            savingsPercent: 15
          }
        ]
      },
      {
        id: 'hm-5',
        kitchenName: 'NutriFit PG Meals & Salads',
        ownerName: 'Priya Nambiar',
        bio: 'High-protein, calorie-counted balanced meals for gym-goers and fitness-conscious hostelites. Soya bowls, grilled paneer, sprouts & brown rice.',
        rating: 4.81,
        reviewsCount: 76,
        completedOrders: 260,
        dailyCapacity: 20,
        currentCapacityUsed: 11,
        serviceArea: 'Koramangala, HSR Layout',
        lat: 12.9299,
        lng: 77.6250,
        radiusKm: 5.5,
        isVegOnly: true,
        deliveryAvailable: true,
        pickupAvailable: true,
        fssaiNumber: '21224190001192',
        verifiedStatus: 'VERIFIED',
        deliveryFee: 15,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        phone: '+91 97410 88231',
        userId: 'usr-hm-priya',
        menu: [
          {
            id: 'm-501',
            homemakerId: 'hm-5',
            name: 'High Protein Soya & Paneer Bowl',
            mealType: 'dinner',
            description: '150g grilled cottage cheese & nutria soya chunks, sautéed bell peppers, sweet corn, brown rice and mint yoghurt dressing. 32g Protein.',
            isVeg: true,
            price: 130,
            calories: 420,
            contents: ['Grilled Paneer', 'Soya Chunks', 'Brown Rice', 'Steamed Veggies', 'Yoghurt Dip'],
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            isAvailableToday: true,
            imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=80'
          }
        ],
        packages: [
          {
            id: 'pkg-501',
            homemakerId: 'hm-5',
            title: '7-Day Fit Dinner Subscription',
            description: 'Clean, macro-balanced dinner delivered 8 PM sharp.',
            planType: 'weekly',
            mealType: 'dinner',
            pricePerMeal: 115,
            totalPrice: 805,
            durationDays: 7,
            isVeg: true,
            savingsPercent: 12
          }
        ]
      }
    ];

    // 4. Service Providers (Plumbers, Electricians, Cleaners, Laundry, etc.)
    this.providers = [
      {
        id: 'sp-1',
        userId: 'usr-provider-ramesh',
        name: 'Ramesh Kumar',
        categorySlug: 'plumber',
        bio: '12+ years master plumbing technician. Specializes in PG bathroom tap leakages, shower head pressure issues, flush repair, and drain block clearing. Fast 20-min arrival in Koramangala.',
        experienceYears: 12,
        rating: 4.89,
        reviewsCount: 230,
        completedJobs: 640,
        responseTime: '15 mins',
        serviceArea: 'Koramangala, BTM Layout, Tavarekere, Ejipura',
        lat: 12.9340,
        lng: 77.6230,
        radiusKm: 7.0,
        basePrice: 149,
        hourlyPrice: 199,
        verifiedStatus: 'VERIFIED',
        skills: ['Tap Leakage Repair', 'Clogged Drain Clearing', 'Flush Tank Mechanism', 'Geyser Pipe Fitting', 'Shower Repair'],
        documents: [
          { type: 'aadhaar', title: 'Aadhaar Verification', verified: true },
          { type: 'police_clearance', title: 'Police Clearance Certificate', verified: true }
        ],
        isOnline: true,
        acceptInstantBookings: true,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        phone: '+91 99887 65432'
      },
      {
        id: 'sp-2',
        userId: 'usr-sp-manjunath',
        name: 'Manjunath Gowda',
        categorySlug: 'plumber',
        bio: 'Certified plumber providing reliable sanitary and water pipeline maintenance for student hostellers and PGs. Carry all standard spares and washers.',
        experienceYears: 8,
        rating: 4.75,
        reviewsCount: 145,
        completedJobs: 390,
        responseTime: '25 mins',
        serviceArea: 'HSR Layout, Bellandur, Sarjapur Road',
        lat: 12.9121,
        lng: 77.6446,
        radiusKm: 6.0,
        basePrice: 129,
        hourlyPrice: 179,
        verifiedStatus: 'VERIFIED',
        skills: ['Bathroom Leaks', 'Sink Traps', 'Water Filter Connection', 'Water Heater Valves'],
        documents: [
          { type: 'aadhaar', title: 'Aadhaar ID', verified: true },
          { type: 'trade_cert', title: 'ITI Plumbing Diploma', verified: true }
        ],
        isOnline: true,
        acceptInstantBookings: true,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
        phone: '+91 98860 11223'
      },
      {
        id: 'sp-3',
        userId: 'usr-sp-suresh',
        name: 'Suresh Babu',
        categorySlug: 'electrician',
        bio: 'Licensed wireman and appliance expert. Quick resolution for ceiling fans, switch sparkings, trip MCBs, laptop charger wall plugs, and room lighting.',
        experienceYears: 10,
        rating: 4.91,
        reviewsCount: 310,
        completedJobs: 820,
        responseTime: '15 mins',
        serviceArea: 'Koramangala, Indiranagar, Domlur, Austin Town',
        lat: 12.9370,
        lng: 77.6280,
        radiusKm: 8.0,
        basePrice: 149,
        hourlyPrice: 199,
        verifiedStatus: 'VERIFIED',
        skills: ['Ceiling Fan Regulator & Capacitor', 'Switchboard Repair', 'Short Circuit Check', 'Tubelight / LED Fitting', 'Electric Kettle Repair'],
        documents: [
          { type: 'wireman_license', title: 'Karnataka Electrical Inspectorate License', verified: true },
          { type: 'aadhaar', title: 'Aadhaar Verified', verified: true }
        ],
        isOnline: true,
        acceptInstantBookings: true,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
        phone: '+91 97400 99881'
      },
      {
        id: 'sp-4',
        userId: 'usr-sp-arun',
        name: 'Arun V.',
        categorySlug: 'electrician',
        bio: 'Fast electrician on motorcycle equipped with multimeters and wiring components. Very polite and student-friendly pricing.',
        experienceYears: 6,
        rating: 4.78,
        reviewsCount: 160,
        completedJobs: 410,
        responseTime: '20 mins',
        serviceArea: 'HSR Layout, BTM Layout, Koramangala',
        lat: 12.9150,
        lng: 77.6380,
        radiusKm: 6.5,
        basePrice: 139,
        hourlyPrice: 180,
        verifiedStatus: 'VERIFIED',
        skills: ['Fan Repair', 'Socket Replacement', 'Inverter Wiring', 'Iron / Heater Cord Fix'],
        documents: [{ type: 'aadhaar', title: 'Aadhaar Verified', verified: true }],
        isOnline: true,
        acceptInstantBookings: true,
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
        phone: '+91 96112 33445'
      },
      {
        id: 'sp-5',
        userId: 'usr-sp-anita',
        name: 'Anita Devi (Sparkle Cleaners)',
        categorySlug: 'cleaner',
        bio: 'Thorough PG room cleaning specialist. Does floor scrubbing, bathroom tile descaling, dust cobweb removal, mirror cleaning, and balcony tidy-up.',
        experienceYears: 7,
        rating: 4.94,
        reviewsCount: 280,
        completedJobs: 710,
        responseTime: '30 mins',
        serviceArea: 'Koramangala, HSR Layout, Ejipura',
        lat: 12.9320,
        lng: 77.6210,
        radiusKm: 5.5,
        basePrice: 199,
        hourlyPrice: 150,
        verifiedStatus: 'VERIFIED',
        skills: ['Room Deep Cleaning', 'Bathroom Descaling & Sanitizing', 'Balcony Wash', 'Bed linen replacement', 'Cupboard organization'],
        documents: [
          { type: 'aadhaar', title: 'Aadhaar Verified', verified: true },
          { type: 'bg_check', title: 'Background Verified', verified: true }
        ],
        isOnline: true,
        acceptInstantBookings: true,
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
        phone: '+91 98801 66778'
      },
      {
        id: 'sp-6',
        userId: 'usr-sp-lakshmamma',
        name: 'Lakshmamma Cleaning Care',
        categorySlug: 'cleaner',
        bio: 'Gentle, trusted cleaning helper for weekly and fortnightly PG room upkeep. Brings her own eco-friendly floor disinfectants.',
        experienceYears: 9,
        rating: 4.82,
        reviewsCount: 195,
        completedJobs: 530,
        responseTime: '45 mins',
        serviceArea: 'BTM Layout, Koramangala 1st-8th Block',
        lat: 12.9180,
        lng: 77.6150,
        radiusKm: 6.0,
        basePrice: 179,
        hourlyPrice: 140,
        verifiedStatus: 'VERIFIED',
        skills: ['Floor Mopping', 'Bathroom Cleaning', 'Fan blade dusting', 'Window glass polish'],
        documents: [{ type: 'aadhaar', title: 'Aadhaar Verified', verified: true }],
        isOnline: true,
        acceptInstantBookings: true,
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        phone: '+91 97311 44556'
      },
      {
        id: 'sp-7',
        userId: 'usr-sp-speedy-laundry',
        name: 'SpeedyWash PG Laundry (Vijay)',
        categorySlug: 'laundry',
        bio: 'Doorstep PG clothes pickup and delivery within 24 hours. Wash, tumble dry, and steam pressing on hangers or crisp folded pack.',
        experienceYears: 5,
        rating: 4.79,
        reviewsCount: 340,
        completedJobs: 980,
        responseTime: '30 mins',
        serviceArea: 'Koramangala, HSR Layout, Indiranagar',
        lat: 12.9350,
        lng: 77.6250,
        radiusKm: 7.0,
        basePrice: 99,
        hourlyPrice: 0,
        verifiedStatus: 'VERIFIED',
        skills: ['Wash & Fold (₹60/kg)', 'Wash & Steam Iron (₹90/kg)', 'Blanket / Quilt Deep Clean', 'Formal Shirt Pressing'],
        documents: [{ type: 'trade_license', title: 'Commercial Laundry License', verified: true }],
        isOnline: true,
        acceptInstantBookings: true,
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
        phone: '+91 99001 22334'
      },
      {
        id: 'sp-8',
        userId: 'usr-sp-carpenter-imran',
        name: 'Imran Carpentry & Handyman',
        categorySlug: 'repairs',
        bio: 'Fix squeaky beds, stuck study desk drawers, wardrobe locks, curtain rods, and loose door hinges. Comes with power drill and hardware kit.',
        experienceYears: 11,
        rating: 4.86,
        reviewsCount: 110,
        completedJobs: 340,
        responseTime: '40 mins',
        serviceArea: 'Koramangala, BTM, HSR Layout, Bellandur',
        lat: 12.9300,
        lng: 77.6200,
        radiusKm: 8.0,
        basePrice: 180,
        hourlyPrice: 220,
        verifiedStatus: 'VERIFIED',
        skills: ['Cupboard Lock Fix', 'Curtain Rod Wall Drilling', 'Bed Frame Tightening', 'Chair Wheel Replacement', 'Door Stopper Installation'],
        documents: [{ type: 'aadhaar', title: 'Aadhaar Verified', verified: true }],
        isOnline: true,
        acceptInstantBookings: false,
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
        phone: '+91 98440 55667'
      },
      {
        id: 'sp-9',
        userId: 'usr-sp-errands-deepak',
        name: 'Deepak Quick Runner (PG Errands)',
        categorySlug: 'errands',
        bio: '20-liter Bisleri water can delivery right to your 3rd/4th floor room, medicine pickup from Apollo, parcel courier drops, printouts.',
        experienceYears: 3,
        rating: 4.90,
        reviewsCount: 215,
        completedJobs: 620,
        responseTime: '20 mins',
        serviceArea: 'Koramangala 1st-7th Block, Tavarekere',
        lat: 12.9330,
        lng: 77.6220,
        radiusKm: 4.5,
        basePrice: 69,
        hourlyPrice: 99,
        verifiedStatus: 'VERIFIED',
        skills: ['Water Can Delivery to Floor', 'Emergency Medicine Run', 'Parcel Drop / Courier', 'Xerox & Assignment Printouts'],
        documents: [{ type: 'aadhaar', title: 'Aadhaar Verified', verified: true }],
        isOnline: true,
        acceptInstantBookings: true,
        avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80',
        phone: '+91 97422 11335'
      }
    ];

    // 5. Initial Sample Bookings for Aarav Patel
    this.bookings = [
      {
        id: 'bk-1001',
        bookingCode: 'PGS-BK-1001',
        studentId: 'usr-student-aarav',
        studentName: 'Aarav Patel',
        studentPhone: '+91 98451 23456',
        providerId: 'sp-1',
        providerName: 'Ramesh Kumar',
        providerCategory: 'plumber',
        serviceTitle: 'Bathroom Tap Leakage Repair',
        description: 'Sink tap in Room 304 bathroom is continuously dripping water, making noise and wasting water.',
        scheduledDate: '2026-10-08',
        scheduledTime: '11:00 AM',
        address: 'Room 304, Stanza Living Poznan House, 4th Block, Koramangala',
        pgName: 'Stanza Living Poznan House',
        price: 149,
        urgency: 'medium',
        status: 'SCHEDULED',
        timeline: [
          { status: 'REQUESTED', timestamp: '2026-10-08T08:15:00Z', note: 'Booking requested by student' },
          { status: 'ACCEPTED', timestamp: '2026-10-08T08:25:00Z', note: 'Accepted by Ramesh Kumar (15m response)' },
          { status: 'SCHEDULED', timestamp: '2026-10-08T08:26:00Z', note: 'Scheduled for 11:00 AM today' }
        ],
        paymentId: 'pay-bk-1001',
        paymentStatus: 'SUCCESS',
        createdAt: '2026-10-08T08:15:00Z'
      },
      {
        id: 'bk-1002',
        bookingCode: 'PGS-BK-1002',
        studentId: 'usr-student-aarav',
        studentName: 'Aarav Patel',
        studentPhone: '+91 98451 23456',
        providerId: 'sp-5',
        providerName: 'Anita Devi (Sparkle Cleaners)',
        providerCategory: 'cleaner',
        serviceTitle: 'PG Room & Bathroom Deep Clean',
        description: 'Sunday deep scrub, dusting ceiling fan, cleaning bathroom tiles.',
        scheduledDate: '2026-10-05',
        scheduledTime: '02:00 PM',
        address: 'Room 304, Stanza Living Poznan House, 4th Block, Koramangala',
        pgName: 'Stanza Living Poznan House',
        price: 199,
        urgency: 'low',
        status: 'COMPLETED',
        timeline: [
          { status: 'REQUESTED', timestamp: '2026-10-04T18:00:00Z', note: 'Requested' },
          { status: 'ACCEPTED', timestamp: '2026-10-04T18:10:00Z', note: 'Accepted' },
          { status: 'ON_THE_WAY', timestamp: '2026-10-05T13:40:00Z', note: 'Anita is on the way' },
          { status: 'IN_PROGRESS', timestamp: '2026-10-05T14:05:00Z', note: 'Cleaning in progress' },
          { status: 'COMPLETED', timestamp: '2026-10-05T15:15:00Z', note: 'Room and bathroom shining clean' }
        ],
        paymentId: 'pay-bk-1002',
        paymentStatus: 'SUCCESS',
        createdAt: '2026-10-04T18:00:00Z'
      }
    ];

    // 6. Initial Food Orders
    this.foodOrders = [
      {
        id: 'ord-5001',
        orderCode: 'PGS-FD-5001',
        studentId: 'usr-student-aarav',
        studentName: 'Aarav Patel',
        studentPhone: '+91 98451 23456',
        homemakerId: 'hm-1',
        kitchenName: "Sunita's Ghar Ka Khana",
        items: [
          { menuItemId: 'm-101', name: 'Homestyle Veg Thali (Daily Special)', quantity: 1, unitPrice: 110 }
        ],
        mealType: 'dinner',
        scheduledDate: '2026-10-08',
        deliveryTimeSlot: '8:00 PM - 8:30 PM',
        deliveryAddress: 'Room 304, Stanza Living Poznan House, 4th Block, Koramangala',
        pgName: 'Stanza Living Poznan House',
        subtotal: 110,
        deliveryFee: 15,
        discount: 0,
        grandTotal: 125,
        status: 'PREPARING',
        timeline: [
          { status: 'PLACED', timestamp: '2026-10-08T07:10:00Z', note: 'Order placed by Aarav' },
          { status: 'ACCEPTED', timestamp: '2026-10-08T07:15:00Z', note: 'Sunita accepted the order' },
          { status: 'PREPARING', timestamp: '2026-10-08T07:30:00Z', note: 'Fresh phulkas & dal tadka being prepared' }
        ],
        paymentId: 'pay-ord-5001',
        paymentStatus: 'SUCCESS',
        isRecurring: false,
        createdAt: '2026-10-08T07:10:00Z'
      }
    ];

    // 7. Initial Recurring Subscriptions
    this.recurringServices = [
      {
        id: 'rec-801',
        studentId: 'usr-student-aarav',
        studentName: 'Aarav Patel',
        providerId: 'hm-1',
        providerName: "Sunita's Ghar Ka Khana",
        type: 'food',
        frequency: 'daily',
        title: '7-Day Homemade Dinner Dabba',
        details: 'Homestyle pure veg dinner with 4 Phulkas, Dal, Subzi, Rice & Salad every evening at 8:00 PM.',
        startDate: '2026-10-08',
        endDate: '2026-10-14',
        pricePerCycle: 99,
        totalCycles: 7,
        completedCycles: 1,
        status: 'active',
        nextDeliveryDate: '2026-10-08 (Tonight 8 PM)',
        createdAt: '2026-10-07T12:00:00Z'
      }
    ];

    // 8. Sample Reviews
    this.reviews = [
      {
        id: 'rev-1',
        bookingId: 'bk-1002',
        studentId: 'usr-student-aarav',
        studentName: 'Aarav Patel',
        studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
        providerId: 'sp-5',
        rating: 5,
        comment: 'Anita did an incredible job! The bathroom floor tiles were stained from hard water and she made them look completely new. Very punctual and polite.',
        serviceType: 'Room Cleaning',
        createdAt: '2026-10-05T16:00:00Z'
      },
      {
        id: 'rev-2',
        studentId: 'usr-std-rohan',
        studentName: 'Rohan Sharma',
        studentAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
        providerId: 'hm-1',
        rating: 5,
        comment: "Sunita aunty's food literally saved me from horrible PG mess food. Tastes exactly like home, not too oily, and always reaches hot.",
        serviceType: 'Homestyle Dinner',
        createdAt: '2026-10-04T21:00:00Z'
      },
      {
        id: 'rev-3',
        studentId: 'usr-std-sneha',
        studentName: 'Sneha Reddy',
        studentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
        providerId: 'sp-1',
        rating: 5,
        comment: 'Ramesh came within 15 minutes when our geyser pipe burst. Replaced the gasket and stopped the flooding immediately. True lifesaver!',
        serviceType: 'Plumbing',
        createdAt: '2026-10-02T19:30:00Z'
      }
    ];

    // 9. Initial Notifications
    this.notifications = [
      {
        id: 'notif-1',
        userId: 'usr-student-aarav',
        title: 'Dinner Order Preparing 🍲',
        message: "Sunita's Ghar Ka Khana has started cooking your fresh Homestyle Veg Thali. ETA: 8:15 PM.",
        type: 'order',
        link: '/orders',
        isRead: false,
        createdAt: '2026-10-08T07:30:00Z'
      },
      {
        id: 'notif-2',
        userId: 'usr-student-aarav',
        title: 'Plumber Scheduled 🔧',
        message: 'Ramesh Kumar confirmed your tap repair booking for today at 11:00 AM.',
        type: 'booking',
        link: '/bookings',
        isRead: false,
        createdAt: '2026-10-08T08:26:00Z'
      },
      {
        id: 'notif-3',
        userId: 'usr-homemaker-sunita',
        title: 'New Dinner Order Received! 🎉',
        message: 'Aarav Patel from Stanza Living PG ordered 1 Homestyle Veg Thali.',
        type: 'order',
        link: '/provider/orders',
        isRead: false,
        createdAt: '2026-10-08T07:10:00Z'
      },
      {
        id: 'notif-4',
        userId: 'usr-provider-ramesh',
        title: 'New Service Booking 📍',
        message: 'Tap Leakage repair in Koramangala 4th Block scheduled for 11:00 AM.',
        type: 'booking',
        link: '/provider/bookings',
        isRead: false,
        createdAt: '2026-10-08T08:15:00Z'
      }
    ];

    // 10. Sample Complaints / Disputes for Admin
    this.complaints = [
      {
        id: 'cmp-1',
        ticketId: 'TKT-991',
        reporterId: 'usr-std-rohan',
        reporterName: 'Rohan Sharma',
        reportedId: 'sp-2',
        reportedName: 'Manjunath Gowda',
        bookingId: 'bk-999',
        category: 'poor_service',
        description: 'Worker arrived 40 mins late without prior call. Issue was resolved but communication was poor.',
        status: 'OPEN',
        createdAt: '2026-10-06T14:20:00Z'
      }
    ];
  }

  private seedMarketplaceExtensions() {
    const farmerUserId = 'usr-farmer-anil';
    if (!this.users.some(user => user.id === farmerUserId)) {
      this.users.push({
        id: farmerUserId,
        email: 'anil@pgsaathi.com',
        name: 'Anil Gowda',
        phone: '+91 98450 77881',
        role: 'farmer',
        avatar: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200&auto=format&fit=crop&q=80',
        address: 'Anekal Road Farm Cluster',
        area: 'HSR Layout',
        city: 'Bengaluru',
        pincode: '560102',
        status: 'active',
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword(process.env.DEMO_PASSWORD || 'demo1234')
      });
    }

    this.farmers = [{
      id: 'farmer-1',
      userId: farmerUserId,
      farmName: 'Anil Fresh Farm Collective',
      ownerName: 'Anil Gowda',
      bio: 'Seasonal vegetables and fruits sourced from a nearby grower collective and packed for local PG communities.',
      serviceArea: 'HSR Layout, Koramangala, BTM Layout',
      lat: 12.9121,
      lng: 77.6446,
      radiusKm: 12,
      verifiedStatus: 'VERIFIED',
      deliveryAvailable: true,
      pickupAvailable: true,
      rating: 4.7,
      reviewsCount: 24,
      avatar: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200&auto=format&fit=crop&q=80'
    }];

    this.produceListings = [
      {
        id: 'produce-1',
        farmerId: 'farmer-1',
        name: 'Farm Fresh Tomato',
        category: 'vegetable',
        description: 'Locally harvested tomatoes, packed in 500 g portions.',
        unit: '500 g',
        price: 35,
        quantityAvailable: 40,
        availableFrom: new Date().toISOString().split('T')[0],
        deliveryAvailable: true,
        pickupAvailable: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      },
      {
        id: 'produce-2',
        farmerId: 'farmer-1',
        name: 'Seasonal Banana',
        category: 'fruit',
        description: 'Fresh seasonal bananas for breakfast and everyday snacks.',
        unit: '6 pieces',
        price: 45,
        quantityAvailable: 25,
        availableFrom: new Date().toISOString().split('T')[0],
        deliveryAvailable: true,
        pickupAvailable: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      }
    ];
  }
}

export const db = new Database();
