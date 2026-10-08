import { Router, Request, Response } from 'express';
import { db, User, Booking, FoodOrder, Review, Notification, Complaint, RecurringService, FarmerProfile, ProduceListing, Institution, InstitutionAnnouncement } from './db';
import { paymentService } from './payments';
import { parseNaturalLanguageRequest, generateSupportChatReply } from './ai';
import { calculateProviderMatch, calculateHomemakerMatch } from './matching';
import { createAccessToken, demoModeEnabled, getBearerToken, hashPassword, publicUser, revokeAccessToken, verifyAccessToken, verifyPassword } from './auth';

export const apiRouter = Router();

// Authentication is server-side and token-based. Client-supplied user IDs are never
// trusted for authorization; the ID is read from a signed access token only.
function getCurrentUser(req: Request): User | null {
  const claims = verifyAccessToken(getBearerToken(req));
  if (!claims) return null;
  const user = db.users.find(u => u.id === claims.sub);
  return user?.status === 'active' ? user : null;
}

function requireUser(req: Request, res: Response): User | null {
  const user = getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return user;
}

function requireRole(req: Request, res: Response, roles: User['role'][]): User | null {
  const user = requireUser(req, res);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: 'You do not have permission to perform this action' });
    return null;
  }
  return user;
}

function parsePage(query: Request['query']): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(query.limit || '24'), 10) || 24));
  return { page, limit, offset: (page - 1) * limit };
}

// ----------------------------------------------------
// 1. AUTHENTICATION & SESSIONS
// ----------------------------------------------------
apiRouter.get('/auth/demo-users', (_req: Request, res: Response) => {
  const demoEnabled = demoModeEnabled();
  res.json({
    demoMode: demoEnabled,
    users: demoEnabled ? db.users.filter(u => u.role !== 'institution').map(publicUser) : []
  });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: publicUser(user) });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password, userId } = req.body;

  // Persona switching exists only for local/demo evaluation and still returns a
  // signed token used by every subsequent protected request.
  if (userId && demoModeEnabled()) {
    const user = db.users.find(u => u.id === userId);
    if (user?.status === 'active') {
      return res.json({ success: true, user: publicUser(user), token: createAccessToken(user.id) });
    }
  }

  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  if (!user || user.status !== 'active' || !verifyPassword(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.json({ success: true, user: publicUser(user), token: createAccessToken(user.id) });
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, password, phone, role, pgName, address, area, city, pincode } = req.body;

  if (!email || !name || !role || !password) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be self-registered.' });
  }

  const supportedRoles: User['role'][] = ['student', 'homemaker', 'provider', 'farmer', 'institution'];
  if (!supportedRoles.includes(role)) {
    return res.status(400).json({ error: 'Unsupported account role' });
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    email,
    name,
    phone: phone || '+91 98000 00000',
    role,
    avatar: role === 'homemaker' 
      ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80'
      : role === 'provider'
      ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    pgName: pgName || undefined,
    address: address || 'Koramangala 4th Block',
    area: area || 'Koramangala',
    city: city || 'Bengaluru',
    pincode: pincode || '560034',
    status: 'active',
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(String(password))
  };

  db.users.push(newUser);

  // If role is provider or homemaker, bootstrap their profile
  if (role === 'homemaker') {
    const homemakerId = `hm-${Date.now()}`;
    db.homemakers.push({
      id: homemakerId,
      userId: newUser.id,
      kitchenName: `${name}'s Home Kitchen`,
      ownerName: name,
      bio: 'Home cook serving wholesome, hygienic meals to hostel students.',
      rating: 5.0,
      reviewsCount: 0,
      completedOrders: 0,
      dailyCapacity: 25,
      currentCapacityUsed: 0,
      serviceArea: `${newUser.area}, Bengaluru`,
      lat: 12.935,
      lng: 77.625,
      radiusKm: 5.0,
      isVegOnly: true,
      deliveryAvailable: true,
      pickupAvailable: true,
      fssaiNumber: '21223990001234',
      verifiedStatus: 'PENDING',
      deliveryFee: 15,
      avatar: newUser.avatar,
      phone: newUser.phone,
      menu: [
        {
          id: `m-${Date.now()}-1`,
           homemakerId,
          name: 'Homestyle Daily Thali',
          mealType: 'dinner',
          description: '4 Phulkas with ghee, Dal Tadka, Subzi, Jeera Rice & Salad.',
          isVeg: true,
          price: 90,
          contents: ['4 Phulkas', 'Dal', 'Sabzi', 'Rice'],
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          isAvailableToday: true,
          imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&auto=format&fit=crop&q=80'
        }
      ],
      packages: [
        {
          id: `pkg-${Date.now()}`,
           homemakerId,
          title: '7-Day Dinner Dabba Plan',
          description: 'Daily fresh dinner delivered directly to your PG room.',
          planType: 'weekly',
          mealType: 'dinner',
          pricePerMeal: 85,
          totalPrice: 595,
          durationDays: 7,
          isVeg: true,
          savingsPercent: 10
        }
      ]
    });
  } else if (role === 'provider') {
    db.providers.push({
      id: `sp-${Date.now()}`,
      userId: newUser.id,
      name,
      categorySlug: req.body.categorySlug || 'plumber',
      bio: 'Experienced local technician offering guaranteed and prompt service to PG residents.',
      experienceYears: req.body.experienceYears || 4,
      rating: 5.0,
      reviewsCount: 0,
      completedJobs: 0,
      responseTime: '20 mins',
      serviceArea: `${newUser.area}, Bengaluru`,
      lat: 12.935,
      lng: 77.625,
      radiusKm: 6.0,
      basePrice: 149,
      hourlyPrice: 199,
      verifiedStatus: 'PENDING',
      skills: ['General Repair', 'Quick Diagnostic'],
      documents: [{ type: 'aadhaar', title: 'Aadhaar Card Submitted', verified: false }],
      isOnline: true,
      acceptInstantBookings: true,
      avatar: newUser.avatar,
      phone: newUser.phone
    });
  } else if (role === 'farmer') {
    db.farmers.push({
      id: `farmer-${Date.now()}`,
      userId: newUser.id,
      farmName: `${name}'s Farm Collective`,
      ownerName: name,
      bio: 'Local farmer listing fresh produce for nearby student communities.',
      serviceArea: `${newUser.area}, ${newUser.city}`,
      lat: 12.935,
      lng: 77.625,
      radiusKm: 10,
      verifiedStatus: 'PENDING',
      deliveryAvailable: true,
      pickupAvailable: true,
      rating: 5,
      reviewsCount: 0,
      avatar: newUser.avatar
    });
  } else if (role === 'institution') {
    db.institutions.push({
      id: `inst-${Date.now()}`,
      userId: newUser.id,
      name,
      domain: email.split('@')[1],
      city: newUser.city,
      verificationStatus: 'PENDING',
      createdAt: newUser.createdAt
    });
  }

  db.save();
  res.json({ success: true, user: publicUser(newUser), token: createAccessToken(newUser.id) });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  revokeAccessToken(getBearerToken(req));
  res.json({ success: true, message: 'Logged out successfully' });
});

// ----------------------------------------------------
// 2. CATEGORIES
// ----------------------------------------------------
apiRouter.get('/categories', (_req: Request, res: Response) => {
  res.json({ categories: db.categories });
});

// ----------------------------------------------------
// 3. SERVICE PROVIDERS (Plumber, Electrician, Cleaner, etc.)
// ----------------------------------------------------
apiRouter.get('/providers', (req: Request, res: Response) => {
  const { category, search, area, minRating, verifiedOnly } = req.query;
  const { page, limit, offset } = parsePage(req.query);
  let list = db.providers.filter(p => p.verifiedStatus === 'VERIFIED');

  if (category) {
    list = list.filter(p => p.categorySlug.toLowerCase() === (category as string).toLowerCase());
  }

  if (verifiedOnly === 'true') list = list.filter(p => p.verifiedStatus === 'VERIFIED');

  if (minRating) {
    const r = parseFloat(minRating as string);
    list = list.filter(p => p.rating >= r);
  }

  if (area) {
    const areaQuery = (area as string).toLowerCase();
    list = list.filter(p => p.serviceArea.toLowerCase().includes(areaQuery));
  }

  if (search) {
    const s = (search as string).toLowerCase();
    list = list.filter(p => 
      p.name.toLowerCase().includes(s) ||
      p.bio.toLowerCase().includes(s) ||
      p.skills.some(skill => skill.toLowerCase().includes(s)) ||
      p.categorySlug.toLowerCase().includes(s)
    );
  }

  res.json({ providers: list.slice(offset, offset + limit), pagination: { page, limit, total: list.length } });
});

apiRouter.get('/providers/:id', (req: Request, res: Response) => {
  const provider = db.providers.find(p => p.id === req.params.id || p.userId === req.params.id);
  const viewer = getCurrentUser(req);
  if (!provider || (provider.verifiedStatus !== 'VERIFIED' && viewer?.id !== provider.userId)) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  const reviews = db.reviews.filter(r => r.providerId === provider.id);
  res.json({ provider, reviews });
});

apiRouter.put('/providers/:id/status', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['provider']);
  if (!user) return;
  const provider = db.providers.find(p => p.id === req.params.id || p.userId === req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  if (provider.userId !== user.id) return res.status(403).json({ error: 'You can only update your own provider profile' });
  const { isOnline, acceptInstantBookings } = req.body;
  if (typeof isOnline === 'boolean') provider.isOnline = isOnline;
  if (typeof acceptInstantBookings === 'boolean') provider.acceptInstantBookings = acceptInstantBookings;
  db.save();
  res.json({ success: true, provider });
});

// ----------------------------------------------------
// 4. FOOD MARKETPLACE & HOMEMAKERS
// ----------------------------------------------------
apiRouter.get('/food/homemakers', (req: Request, res: Response) => {
  const { isVeg, mealType, area, maxPrice, search } = req.query;
  const { page, limit, offset } = parsePage(req.query);
  let list = db.homemakers.filter(h => h.verifiedStatus === 'VERIFIED');

  if (isVeg === 'true') {
    list = list.filter(h => h.isVegOnly || h.menu.some(m => m.isVeg));
  }

  if (area) {
    const a = (area as string).toLowerCase();
    list = list.filter(h => h.serviceArea.toLowerCase().includes(a));
  }

  if (mealType) {
    const mt = mealType as string;
    list = list.filter(h => h.menu.some(m => m.mealType === mt));
  }

  if (search) {
    const s = (search as string).toLowerCase();
    list = list.filter(h => 
      h.kitchenName.toLowerCase().includes(s) ||
      h.ownerName.toLowerCase().includes(s) ||
      h.bio.toLowerCase().includes(s) ||
      h.menu.some(m => m.name.toLowerCase().includes(s))
    );
  }

  res.json({ homemakers: list.slice(offset, offset + limit), pagination: { page, limit, total: list.length } });
});

apiRouter.get('/food/homemakers/:id', (req: Request, res: Response) => {
  const homemaker = db.homemakers.find(h => h.id === req.params.id || h.userId === req.params.id);
  const viewer = getCurrentUser(req);
  if (!homemaker || (homemaker.verifiedStatus !== 'VERIFIED' && viewer?.id !== homemaker.userId)) {
    return res.status(404).json({ error: 'Kitchen not found' });
  }
  const reviews = db.reviews.filter(r => r.providerId === homemaker.id);
  res.json({ homemaker, reviews });
});

apiRouter.post('/food/homemakers/:id/menu', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['homemaker']);
  if (!user) return;
  const homemaker = db.homemakers.find(h => h.id === req.params.id || h.userId === req.params.id);
  if (!homemaker) {
    return res.status(404).json({ error: 'Kitchen not found' });
  }
  if (homemaker.userId !== user.id) return res.status(403).json({ error: 'You can only manage your own menu' });
  const { name, mealType, description, isVeg, price, contents } = req.body;
  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (typeof name !== 'string' || name.trim().length < 2 || !validMealTypes.includes(mealType) || !Number.isFinite(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ error: 'A valid name, meal type, and positive price are required' });
  }
  const newItem = {
    id: `m-${Date.now()}`,
    homemakerId: homemaker.id,
    name,
    mealType,
    description: description || '',
    isVeg: Boolean(isVeg),
    price: Number(price) || 80,
    contents: Array.isArray(contents) ? contents : [name],
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    isAvailableToday: true
  };
  homemaker.menu.push(newItem);
  db.save();
  res.json({ success: true, item: newItem });
});

apiRouter.put('/food/homemakers/:id/capacity', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['homemaker']);
  if (!user) return;
  const homemaker = db.homemakers.find(h => h.id === req.params.id || h.userId === req.params.id);
  if (!homemaker) {
    return res.status(404).json({ error: 'Kitchen not found' });
  }
  if (homemaker.userId !== user.id) return res.status(403).json({ error: 'You can only update your own kitchen' });
  const { dailyCapacity } = req.body;
  if (!Number.isInteger(Number(dailyCapacity)) || Number(dailyCapacity) < homemaker.currentCapacityUsed || Number(dailyCapacity) > 500) {
    return res.status(400).json({ error: 'Capacity must be an integer between current usage and 500' });
  }
  homemaker.dailyCapacity = Number(dailyCapacity);
  db.save();
  res.json({ success: true, homemaker });
});

// ----------------------------------------------------
// 5. BOOKING ENGINE (Universal Services)
// ----------------------------------------------------
apiRouter.post('/bookings', async (req: Request, res: Response) => {
  const user = requireRole(req, res, ['student']);
  if (!user) return;

  const idempotencyKey = req.get('Idempotency-Key');
  if (idempotencyKey) {
    const existing = db.bookings.find(b => b.studentId === user.id && b.idempotencyKey === idempotencyKey);
    if (existing) return res.json({ success: true, booking: existing, payment: db.payments.find(p => p.referenceId === existing.id) });
  }

  const {
    providerId,
    serviceTitle,
    description,
    scheduledDate,
    scheduledTime,
    address,
    pgName,
    urgency,
    paymentMethod,
    isRecurring,
    frequency
  } = req.body;

  // 1. Verify provider exists
  const provider = db.providers.find(p => p.id === providerId);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  // 2. Verify provider active
  if (provider.verifiedStatus !== 'VERIFIED') {
    return res.status(400).json({ error: 'This provider is not currently available for booking.' });
  }
  if (!provider.isOnline) {
    return res.status(409).json({ error: 'This provider is offline. Please choose another available provider.' });
  }

  const allowedPaymentMethods = ['upi', 'razorpay', 'cod'];
  if (paymentMethod && !allowedPaymentMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Unsupported payment method' });
  }
  if (typeof serviceTitle !== 'string' || serviceTitle.trim().length < 2 || serviceTitle.length > 120) {
    return res.status(400).json({ error: 'Please provide a valid service title' });
  }

  // 3. Server-side price calculation
  const price = provider.basePrice;
  const bookingCode = `PGS-BK-${Math.floor(1000 + Math.random() * 9000)}`;

  // 4. Create booking entity
  const newBooking: Booking = {
    id: `bk-${Date.now()}`,
    bookingCode,
    studentId: user.id,
    studentName: user.name,
    studentPhone: user.phone,
    providerId: provider.id,
    providerName: provider.name,
    providerCategory: provider.categorySlug,
    serviceTitle: serviceTitle || `${provider.categorySlug.toUpperCase()} Service`,
    description: description || 'PG Service Visit',
    scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
    scheduledTime: scheduledTime || '11:00 AM',
    address: address || user.address || 'Koramangala PG',
    pgName: pgName || user.pgName || 'Hostel',
    price,
    urgency: urgency || 'medium',
    status: 'REQUESTED',
    timeline: [
      { status: 'REQUESTED', timestamp: new Date().toISOString(), note: 'Booking submitted by student' }
    ],
    paymentStatus: paymentMethod === 'cod' ? 'SUCCESS' : 'PENDING',
    recurringRequested: Boolean(isRecurring),
    recurringFrequency: frequency || 'weekly',
    idempotencyKey,
    createdAt: new Date().toISOString()
  };

  // 5. Process Payment via abstraction
  let paymentResp;
  try {
    paymentResp = await paymentService.initiatePayment({
      orderType: 'booking',
      referenceId: newBooking.id,
      userId: user.id,
      amount: price,
      currency: 'INR',
      method: paymentMethod || 'upi'
    });
  } catch (error) {
    console.error('Booking payment initialization failed:', error);
    return res.status(502).json({ error: 'Payment provider is temporarily unavailable. Please try again.' });
  }

  newBooking.paymentId = paymentResp.paymentId;
  db.payments.push({
    id: paymentResp.paymentId,
    transactionRef: paymentResp.transactionRef,
    orderType: 'booking',
    referenceId: newBooking.id,
    userId: user.id,
    amount: price,
    currency: 'INR',
    method: (paymentMethod || 'upi') as 'upi' | 'razorpay' | 'card' | 'cod',
    status: paymentResp.status,
    gatewayOrderId: paymentResp.gatewayOrderId,
    createdAt: new Date().toISOString()
  });
  if (paymentResp.status === 'SUCCESS') {
    newBooking.paymentStatus = 'SUCCESS';
    newBooking.timeline.push({
      status: 'REQUESTED',
      timestamp: new Date().toISOString(),
      note: 'Payment recorded; provider acceptance is pending'
    });
  }

  // 6. Handle recurring if selected
  if (isRecurring && paymentResp.status === 'SUCCESS') {
    const recurringSub: RecurringService = {
      id: `rec-${Date.now()}`,
      studentId: user.id,
      studentName: user.name,
      providerId: provider.id,
      providerName: provider.name,
      type: 'service',
      frequency: frequency || 'weekly',
      title: `Recurring ${provider.categorySlug} (${frequency || 'weekly'})`,
      details: `${serviceTitle} scheduled at ${newBooking.scheduledTime}`,
      startDate: newBooking.scheduledDate,
      endDate: '2026-11-30',
      pricePerCycle: price,
      totalCycles: frequency === 'daily' ? 30 : 4,
      completedCycles: 0,
      status: 'active',
      nextDeliveryDate: newBooking.scheduledDate,
      createdAt: new Date().toISOString()
    };
    db.recurringServices.push(recurringSub);
    newBooking.recurringId = recurringSub.id;
  }

  db.bookings.unshift(newBooking);

  // 7. Dispatch Notifications
  db.notifications.push({
    id: `notif-${Date.now()}-1`,
    userId: provider.userId,
    title: 'New Service Booking! 📍',
    message: `${user.name} booked "${newBooking.serviceTitle}" for ${newBooking.scheduledDate} at ${newBooking.scheduledTime}.`,
    type: 'booking',
    link: '/provider/bookings',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.notifications.push({
    id: `notif-${Date.now()}-2`,
    userId: user.id,
    title: 'Booking Request Sent 🎉',
    message: `Your request with ${provider.name} (${bookingCode}) was sent for ₹${price}.`,
    type: 'booking',
    link: '/bookings',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.save();
  res.json({ success: true, booking: newBooking, payment: paymentResp });
});

apiRouter.get('/bookings', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;

  let list = db.bookings;
  if (user.role === 'student') {
    list = list.filter(b => b.studentId === user.id);
  } else if (user.role === 'provider') {
    const provider = db.providers.find(p => p.userId === user.id);
    if (provider) {
      list = list.filter(b => b.providerId === provider.id);
    }
  }
  if (user.role !== 'student' && user.role !== 'provider' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Bookings are not available for this role' });
  }
  res.json({ bookings: list });
});

// ----------------------------------------------------
// 4b. LOCAL PRODUCE MARKETPLACE
// ----------------------------------------------------
apiRouter.get('/farmers', (req: Request, res: Response) => {
  const { area, search } = req.query;
  let farmers = db.farmers.filter(farmer => farmer.verifiedStatus === 'VERIFIED');
  if (area) {
    const areaText = String(area).toLowerCase();
    farmers = farmers.filter(farmer => farmer.serviceArea.toLowerCase().includes(areaText));
  }
  if (search) {
    const searchText = String(search).toLowerCase();
    farmers = farmers.filter(farmer => `${farmer.farmName} ${farmer.ownerName} ${farmer.bio}`.toLowerCase().includes(searchText));
  }
  res.json({ farmers });
});

apiRouter.get('/farmers/:id', (req: Request, res: Response) => {
  const farmer = db.farmers.find(item => item.id === req.params.id || item.userId === req.params.id);
  const viewer = getCurrentUser(req);
  if (!farmer || (farmer.verifiedStatus !== 'VERIFIED' && viewer?.id !== farmer.userId)) return res.status(404).json({ error: 'Farmer not found' });
  res.json({ farmer, listings: db.produceListings.filter(listing => listing.farmerId === farmer.id && (listing.status === 'ACTIVE' || viewer?.id === farmer.userId)) });
});

apiRouter.post('/farmers/:id/listings', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['farmer']);
  if (!user) return;
  const farmer = db.farmers.find(item => item.id === req.params.id || item.userId === req.params.id);
  if (!farmer) return res.status(404).json({ error: 'Farmer profile not found' });
  if (farmer.userId !== user.id) return res.status(403).json({ error: 'You can only manage your own produce listings' });
  const { name, category, description, unit, price, quantityAvailable, availableFrom, deliveryAvailable, pickupAvailable } = req.body;
  if (typeof name !== 'string' || name.trim().length < 2 || !['vegetable', 'fruit', 'egg', 'other'].includes(category) || !unit || !Number.isFinite(Number(price)) || Number(price) <= 0 || !Number.isFinite(Number(quantityAvailable)) || Number(quantityAvailable) < 0) {
    return res.status(400).json({ error: 'Valid produce name, category, unit, price, and quantity are required' });
  }
  const listing: ProduceListing = {
    id: `produce-${Date.now()}`,
    farmerId: farmer.id,
    name: name.trim(),
    category,
    description: typeof description === 'string' ? description.trim() : '',
    unit: String(unit).trim(),
    price: Number(price),
    quantityAvailable: Number(quantityAvailable),
    availableFrom: availableFrom || new Date().toISOString().split('T')[0],
    deliveryAvailable: deliveryAvailable !== false,
    pickupAvailable: pickupAvailable !== false,
    status: Number(quantityAvailable) > 0 ? 'ACTIVE' : 'SOLD_OUT',
    createdAt: new Date().toISOString()
  };
  db.produceListings.unshift(listing);
  db.save();
  res.status(201).json({ success: true, listing });
});

apiRouter.put('/farmers/listings/:id', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['farmer']);
  if (!user) return;
  const listing = db.produceListings.find(item => item.id === req.params.id);
  const farmer = listing && db.farmers.find(item => item.id === listing.farmerId);
  if (!listing || !farmer) return res.status(404).json({ error: 'Produce listing not found' });
  if (farmer.userId !== user.id) return res.status(403).json({ error: 'You can only update your own produce listings' });
  if (req.body.price !== undefined && (!Number.isFinite(Number(req.body.price)) || Number(req.body.price) <= 0)) return res.status(400).json({ error: 'Price must be positive' });
  if (req.body.quantityAvailable !== undefined && (!Number.isFinite(Number(req.body.quantityAvailable)) || Number(req.body.quantityAvailable) < 0)) return res.status(400).json({ error: 'Quantity cannot be negative' });
  if (req.body.price !== undefined) listing.price = Number(req.body.price);
  if (req.body.quantityAvailable !== undefined) listing.quantityAvailable = Number(req.body.quantityAvailable);
  if (req.body.description !== undefined) listing.description = String(req.body.description).trim();
  listing.status = listing.quantityAvailable > 0 ? 'ACTIVE' : 'SOLD_OUT';
  db.save();
  res.json({ success: true, listing });
});

// ----------------------------------------------------
// 4c. INSTITUTION COMMUNITY LAYER
// ----------------------------------------------------
apiRouter.get('/institutions/:id', (req: Request, res: Response) => {
  const institution = db.institutions.find(item => item.id === req.params.id || item.userId === req.params.id);
  const viewer = getCurrentUser(req);
  if (!institution || (institution.verificationStatus !== 'VERIFIED' && viewer?.id !== institution.userId && viewer?.role !== 'admin')) return res.status(404).json({ error: 'Institution not found' });
  res.json({ institution, announcements: db.institutionAnnouncements.filter(item => item.institutionId === institution.id && (item.status === 'PUBLISHED' || viewer?.id === institution.userId || viewer?.role === 'admin')) });
});

apiRouter.get('/announcements', (req: Request, res: Response) => {
  const city = typeof req.query.city === 'string' ? req.query.city.toLowerCase() : undefined;
  const verifiedInstitutionIds = new Set(db.institutions.filter(institution => institution.verificationStatus === 'VERIFIED' && (!city || institution.city.toLowerCase() === city)).map(institution => institution.id));
  res.json({ announcements: db.institutionAnnouncements.filter(item => item.status === 'PUBLISHED' && verifiedInstitutionIds.has(item.institutionId)) });
});

apiRouter.post('/institutions/:id/announcements', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['institution']);
  if (!user) return;
  const institution = db.institutions.find(item => item.id === req.params.id || item.userId === req.params.id);
  if (!institution) return res.status(404).json({ error: 'Institution not found' });
  if (institution.userId !== user.id) return res.status(403).json({ error: 'You can only publish for your institution' });
  if (institution.verificationStatus !== 'VERIFIED') return res.status(403).json({ error: 'Institution verification is required before publishing' });
  const { title, body } = req.body;
  if (typeof title !== 'string' || title.trim().length < 3 || title.length > 120 || typeof body !== 'string' || body.trim().length < 10 || body.length > 2000) return res.status(400).json({ error: 'Provide a valid announcement title and body' });
  const announcement: InstitutionAnnouncement = { id: `announcement-${Date.now()}`, institutionId: institution.id, title: title.trim(), body: body.trim(), publishedAt: new Date().toISOString(), status: 'PUBLISHED' };
  db.institutionAnnouncements.unshift(announcement);
  db.save();
  res.status(201).json({ success: true, announcement });
});

apiRouter.put('/bookings/:id/status', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const { status, note } = req.body;
  const transitions: Record<string, string[]> = {
    REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    ACCEPTED: ['SCHEDULED', 'CANCELLED'],
    SCHEDULED: ['ON_THE_WAY', 'CANCELLED'],
    ON_THE_WAY: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED', 'DISPUTED']
  };
  const provider = db.providers.find(p => p.id === booking.providerId);
  const isOwner = provider?.userId === user.id;
  if (user.role !== 'admin' && !isOwner) {
    return res.status(403).json({ error: 'Only the assigned provider or an admin can update this booking' });
  }
  if (!transitions[booking.status]?.includes(status)) {
    return res.status(409).json({ error: `Cannot change booking from ${booking.status} to ${status}` });
  }

  booking.status = status;
  booking.timeline.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Status updated to ${status}`
  });

  if (status === 'COMPLETED') {
    const provider = db.providers.find(p => p.id === booking.providerId);
    if (provider) {
      provider.completedJobs += 1;
    }
  }

  // Notify student of status change
  db.notifications.push({
    id: `notif-${Date.now()}`,
    userId: booking.studentId,
    title: `Booking Update: ${status}`,
    message: `Your ${booking.serviceTitle} with ${booking.providerName} is now ${status.replace(/_/g, ' ')}.`,
    type: 'booking',
    link: '/bookings',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  if (provider) {
    db.notifications.push({
      id: `notif-${Date.now()}-provider`,
      userId: provider.userId,
      title: `Booking ${status.replace(/_/g, ' ')}`,
      message: `${booking.bookingCode} for ${booking.serviceTitle} is now ${status.replace(/_/g, ' ')}.`,
      type: 'booking',
      link: '/provider/bookings',
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  db.save();
  res.json({ success: true, booking });
});

apiRouter.post('/bookings/:id/cancel', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
    return res.status(400).json({ error: `Cannot cancel a booking that is ${booking.status}` });
  }

  const provider = db.providers.find(p => p.id === booking.providerId);
  if (user.role !== 'admin' && user.id !== booking.studentId && user.id !== provider?.userId) {
    return res.status(403).json({ error: 'You can only cancel your own booking' });
  }
  if (booking.status === 'IN_PROGRESS' || booking.status === 'ON_THE_WAY') {
    return res.status(409).json({ error: 'This booking is already in progress and cannot be cancelled online' });
  }

  booking.status = 'CANCELLED';
  booking.cancellationReason = req.body.reason || 'Cancelled by user';
  booking.timeline.push({
    status: 'CANCELLED',
    timestamp: new Date().toISOString(),
    note: `Cancelled: ${booking.cancellationReason}`
  });

  db.notifications.push({
    id: `notif-${Date.now()}`,
    userId: booking.studentId,
    title: 'Booking Cancelled',
    message: `${booking.bookingCode} was cancelled.`,
    type: 'booking',
    link: '/bookings',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.save();
  res.json({ success: true, booking });
});

// ----------------------------------------------------
// 6. FOOD ORDERS & MEAL SUBSCRIPTIONS
// ----------------------------------------------------
apiRouter.post('/food/orders', async (req: Request, res: Response) => {
  const user = requireRole(req, res, ['student']);
  if (!user) return;

  const idempotencyKey = req.get('Idempotency-Key');
  if (idempotencyKey) {
    const existing = db.foodOrders.find(o => o.studentId === user.id && o.idempotencyKey === idempotencyKey);
    if (existing) return res.json({ success: true, order: existing, payment: db.payments.find(p => p.referenceId === existing.id) });
  }

  const {
    homemakerId,
    items, // Array of { menuItemId, quantity }
    mealPackageId,
    mealType,
    deliveryTimeSlot,
    deliveryAddress,
    pgName,
    isRecurring,
    recurringDays,
    paymentMethod
  } = req.body;

  // 1. Verify Homemaker exists
  const homemaker = db.homemakers.find(h => h.id === homemakerId);
  if (!homemaker || homemaker.verifiedStatus !== 'VERIFIED') {
    return res.status(404).json({ error: 'Homemaker kitchen not found' });
  }

  // 2. Verify Capacity
  if (homemaker.currentCapacityUsed >= homemaker.dailyCapacity) {
    return res.status(400).json({ error: 'Kitchen has reached maximum orders for today. Please schedule for tomorrow!' });
  }

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'both'];
  if (mealType && !validMealTypes.includes(mealType)) {
    return res.status(400).json({ error: 'Invalid meal type' });
  }
  if (paymentMethod && !['upi', 'razorpay', 'cod'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Unsupported payment method' });
  }

  // 3. Server-side price calculation
  let subtotal = 0;
  const verifiedItems: any[] = [];
  let packageTitle: string | undefined;

  if (mealPackageId) {
    const pkg = homemaker.packages.find(p => p.id === mealPackageId);
    if (!pkg) {
      return res.status(400).json({ error: 'Selected meal package not found' });
    }
    packageTitle = pkg.title;
    subtotal = pkg.totalPrice;
    verifiedItems.push({
      menuItemId: pkg.id,
      name: pkg.title,
      quantity: 1,
      unitPrice: pkg.totalPrice
    });
  } else if (Array.isArray(items) && items.length > 0) {
    if (items.length > 20) return res.status(400).json({ error: 'Too many items in one order' });
    for (const reqItem of items) {
      const dbItem = homemaker.menu.find(m => m.id === reqItem.menuItemId);
      if (!dbItem || !dbItem.isAvailableToday) return res.status(400).json({ error: 'One or more selected meals are unavailable' });
      const qty = Number(reqItem.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) return res.status(400).json({ error: 'Each item quantity must be between 1 and 20' });
      subtotal += dbItem.price * qty;
      verifiedItems.push({
        menuItemId: dbItem.id,
        name: dbItem.name,
        quantity: qty,
        unitPrice: dbItem.price
      });
    }
  } else {
    return res.status(400).json({ error: 'Select at least one available meal or a meal package' });
  }

  if (verifiedItems.length === 0 || subtotal <= 0) return res.status(400).json({ error: 'Your order is empty' });

  const deliveryFee = homemaker.deliveryFee || 15;
  const grandTotal = subtotal + deliveryFee;
  const orderCode = `PGS-FD-${Math.floor(5000 + Math.random() * 4999)}`;

  // 4. Create Food Order
  const newOrder: FoodOrder = {
    id: `ord-${Date.now()}`,
    orderCode,
    studentId: user.id,
    studentName: user.name,
    studentPhone: user.phone,
    homemakerId: homemaker.id,
    kitchenName: homemaker.kitchenName,
    items: verifiedItems,
    mealPackageId,
    packageTitle,
    mealType: mealType || 'dinner',
    scheduledDate: new Date().toISOString().split('T')[0],
    deliveryTimeSlot: deliveryTimeSlot || '8:00 PM - 8:30 PM',
    deliveryAddress: deliveryAddress || user.address || 'Koramangala PG Room',
    pgName: pgName || user.pgName || 'PG Hostel',
    subtotal,
    deliveryFee,
    discount: 0,
    grandTotal,
    status: 'PLACED',
    timeline: [
      { status: 'PLACED', timestamp: new Date().toISOString(), note: 'Order placed by student' }
    ],
    paymentStatus: paymentMethod === 'cod' ? 'SUCCESS' : 'PENDING',
    isRecurring: Boolean(isRecurring),
    recurringDays: isRecurring ? (recurringDays || 7) : undefined,
    recurringStartDate: isRecurring ? new Date().toISOString().split('T')[0] : undefined,
    idempotencyKey,
    createdAt: new Date().toISOString()
  };

  // 5. Initiate Payment
  let paymentResp;
  try {
    paymentResp = await paymentService.initiatePayment({
      orderType: 'food_order',
      referenceId: newOrder.id,
      userId: user.id,
      amount: grandTotal,
      currency: 'INR',
      method: paymentMethod || 'upi'
    });
  } catch (error) {
    console.error('Food payment initialization failed:', error);
    return res.status(502).json({ error: 'Payment provider is temporarily unavailable. Please try again.' });
  }

  newOrder.paymentId = paymentResp.paymentId;
  db.payments.push({
    id: paymentResp.paymentId,
    transactionRef: paymentResp.transactionRef,
    orderType: 'food_order',
    referenceId: newOrder.id,
    userId: user.id,
    amount: grandTotal,
    currency: 'INR',
    method: (paymentMethod || 'upi') as 'upi' | 'razorpay' | 'card' | 'cod',
    status: paymentResp.status,
    gatewayOrderId: paymentResp.gatewayOrderId,
    createdAt: new Date().toISOString()
  });
  if (paymentResp.status === 'SUCCESS') {
    newOrder.paymentStatus = 'SUCCESS';
    newOrder.timeline.push({
      status: 'PLACED',
      timestamp: new Date().toISOString(),
      note: 'Payment recorded; kitchen acceptance is pending'
    });
  }

  // 6. Handle recurring meal subscription
  if (isRecurring && paymentResp.status === 'SUCCESS') {
    const days = recurringDays || 7;
    const recurringSub: RecurringService = {
      id: `rec-food-${Date.now()}`,
      studentId: user.id,
      studentName: user.name,
      providerId: homemaker.id,
      providerName: homemaker.kitchenName,
      type: 'food',
      frequency: 'daily',
      title: `${days}-Day Homemade ${mealType || 'Dinner'} Subscription`,
      details: `${packageTitle || verifiedItems[0]?.name} delivered daily at ${newOrder.deliveryTimeSlot}`,
      startDate: newOrder.scheduledDate,
      endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pricePerCycle: Math.round(grandTotal / days),
      totalCycles: days,
       completedCycles: 0,
      status: 'active',
      nextDeliveryDate: `${newOrder.scheduledDate} (${newOrder.deliveryTimeSlot})`,
      createdAt: new Date().toISOString()
    };
    db.recurringServices.push(recurringSub);
  }

  // 7. Update homemaker capacity
  homemaker.currentCapacityUsed += 1;
  db.foodOrders.unshift(newOrder);

  // 8. Notifications
  db.notifications.push({
    id: `notif-${Date.now()}-1`,
    userId: homemaker.userId,
    title: 'New Food Order Received! 🍲',
    message: `${user.name} ordered ${verifiedItems.map(i => `${i.name} (x${i.quantity})`).join(', ')} (${orderCode}).`,
    type: 'order',
    link: '/provider/orders',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.notifications.push({
    id: `notif-${Date.now()}-2`,
    userId: user.id,
    title: 'Order Placed with Kitchen 🎉',
    message: `Your food order ${orderCode} with ${homemaker.kitchenName} was placed for ₹${grandTotal}.`,
    type: 'order',
    link: '/orders',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.save();
  res.json({ success: true, order: newOrder, payment: paymentResp });
});

apiRouter.get('/food/orders', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;

  let list = db.foodOrders;
  if (user.role === 'student') {
    list = list.filter(o => o.studentId === user.id);
  } else if (user.role === 'homemaker') {
    const homemaker = db.homemakers.find(h => h.userId === user.id);
    if (homemaker) {
      list = list.filter(o => o.homemakerId === homemaker.id);
    }
  }
  else if (user.role !== 'admin') return res.status(403).json({ error: 'Orders are not available for this role' });
  res.json({ orders: list });
});

apiRouter.put('/food/orders/:id/status', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const order = db.foodOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const { status, note } = req.body;
  const transitions: Record<string, string[]> = {
    PLACED: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY'],
    READY: ['OUT_FOR_DELIVERY'],
    OUT_FOR_DELIVERY: ['DELIVERED']
  };
  const homemaker = db.homemakers.find(h => h.id === order.homemakerId);
  if (user.role !== 'admin' && homemaker?.userId !== user.id) {
    return res.status(403).json({ error: 'Only the assigned kitchen or an admin can update this order' });
  }
  if (!transitions[order.status]?.includes(status)) {
    return res.status(409).json({ error: `Cannot change order from ${order.status} to ${status}` });
  }

  const previousStatus = order.status;
  order.status = status;
  order.timeline.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Order updated to ${status}`
  });

  if (status === 'DELIVERED') {
    const hm = db.homemakers.find(h => h.id === order.homemakerId);
    if (hm && previousStatus !== 'DELIVERED') {
      hm.completedOrders += 1;
    }
  }

  // Notify student
  db.notifications.push({
    id: `notif-${Date.now()}`,
    userId: order.studentId,
    title: `Food Update: ${status.replace(/_/g, ' ')}`,
    message: `Your order from ${order.kitchenName} is now ${status.replace(/_/g, ' ')}.`,
    type: 'order',
    link: '/orders',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  if (homemaker) {
    db.notifications.push({
      id: `notif-${Date.now()}-kitchen`,
      userId: homemaker.userId,
      title: `Order ${status.replace(/_/g, ' ')}`,
      message: `${order.orderCode} for ${order.studentName} is now ${status.replace(/_/g, ' ')}.`,
      type: 'order',
      link: '/provider/orders',
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  db.save();
  res.json({ success: true, order });
});

apiRouter.post('/food/orders/:id/cancel', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const order = db.foodOrders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (user.role !== 'admin' && order.studentId !== user.id) return res.status(403).json({ error: 'You can only cancel your own order' });
  if (!['PLACED', 'ACCEPTED'].includes(order.status)) {
    return res.status(409).json({ error: 'Food orders can only be cancelled before preparation begins' });
  }

  order.status = 'CANCELLED';
  order.timeline.push({
    status: 'CANCELLED',
    timestamp: new Date().toISOString(),
    note: req.body.reason || 'Cancelled by student'
  });
  const homemaker = db.homemakers.find(h => h.id === order.homemakerId);
  if (homemaker) homemaker.currentCapacityUsed = Math.max(0, homemaker.currentCapacityUsed - 1);
  db.notifications.push({
    id: `notif-${Date.now()}`,
    userId: homemaker?.userId || order.studentId,
    title: 'Food Order Cancelled',
    message: `${order.orderCode} was cancelled before preparation began.`,
    type: 'order',
    link: '/provider/orders',
    isRead: false,
    createdAt: new Date().toISOString()
  });
  db.save();
  res.json({ success: true, order });
});

// ----------------------------------------------------
// 7. RECURRING SERVICES
// ----------------------------------------------------
apiRouter.get('/recurring', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;

  let list = db.recurringServices;
  if (user.role === 'student') {
    list = list.filter(r => r.studentId === user.id);
  } else if (user.role === 'homemaker') {
    const homemaker = db.homemakers.find(h => h.userId === user.id);
    list = list.filter(r => r.providerId === homemaker?.id);
  } else if (user.role === 'provider') {
    const provider = db.providers.find(p => p.userId === user.id);
    list = list.filter(r => r.providerId === provider?.id);
  } else if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Subscriptions are not available for this role' });
  }
  res.json({ subscriptions: list });
});

apiRouter.put('/recurring/:id/status', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const sub = db.recurringServices.find(r => r.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  const homemaker = db.homemakers.find(h => h.id === sub.providerId);
  const provider = db.providers.find(p => p.id === sub.providerId);
  if (user.role !== 'admin' && user.id !== sub.studentId && user.id !== homemaker?.userId && user.id !== provider?.userId) {
    return res.status(403).json({ error: 'You can only manage subscriptions connected to your account' });
  }

  const { status } = req.body;
  if (!['active', 'paused', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  sub.status = status;
  db.save();
  res.json({ success: true, subscription: sub });
});

// ----------------------------------------------------
// 8. PAYMENTS
// ----------------------------------------------------
apiRouter.post('/payments/verify', async (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const { paymentId, signature, gatewayPaymentId } = req.body;
  const payment = db.payments.find(p => p.id === paymentId || p.transactionRef === paymentId);
  if (!payment) return res.status(404).json({ error: 'Payment session not found' });
  if (user.role !== 'admin' && payment.userId !== user.id) return res.status(403).json({ error: 'You cannot verify this payment' });
  let result;
  try {
    result = await paymentService.confirmPayment(paymentId, signature, gatewayPaymentId, payment.gatewayOrderId);
  } catch {
    return res.status(502).json({ error: 'Payment verification provider is unavailable' });
  }
  payment.status = result.status;
  const booking = payment.orderType === 'booking' ? db.bookings.find(b => b.id === payment.referenceId) : undefined;
  const order = payment.orderType === 'food_order' ? db.foodOrders.find(o => o.id === payment.referenceId) : undefined;
  if (booking) {
    booking.paymentStatus = result.status;
    if (result.status === 'SUCCESS' && booking.recurringRequested && !booking.recurringId) {
      const recurringSub: RecurringService = {
        id: `rec-${Date.now()}`,
        studentId: booking.studentId,
        studentName: booking.studentName,
        providerId: booking.providerId,
        providerName: booking.providerName,
        type: 'service',
        frequency: booking.recurringFrequency || 'weekly',
        title: `Recurring ${booking.providerCategory} (${booking.recurringFrequency || 'weekly'})`,
        details: `${booking.serviceTitle} scheduled at ${booking.scheduledTime}`,
        startDate: booking.scheduledDate,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        pricePerCycle: booking.price,
        totalCycles: booking.recurringFrequency === 'daily' ? 30 : 4,
        completedCycles: 0,
        status: 'active',
        nextDeliveryDate: booking.scheduledDate,
        createdAt: new Date().toISOString()
      };
      db.recurringServices.push(recurringSub);
      booking.recurringId = recurringSub.id;
    }
  }
  if (order) {
    order.paymentStatus = result.status;
    if (result.status === 'SUCCESS' && order.isRecurring && !db.recurringServices.some(subscription => subscription.studentId === order.studentId && subscription.providerId === order.homemakerId && subscription.startDate === order.scheduledDate && subscription.status !== 'cancelled')) {
      const days = order.recurringDays || 7;
      db.recurringServices.push({
        id: `rec-food-${Date.now()}`,
        studentId: order.studentId,
        studentName: order.studentName,
        providerId: order.homemakerId,
        providerName: order.kitchenName,
        type: 'food',
        frequency: 'daily',
        title: `${days}-Day Homemade ${order.mealType} Subscription`,
        details: `${order.packageTitle || order.items[0]?.name} delivered daily at ${order.deliveryTimeSlot}`,
        startDate: order.scheduledDate,
        endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        pricePerCycle: Math.round(order.grandTotal / days),
        totalCycles: days,
        completedCycles: 0,
        status: 'active',
        nextDeliveryDate: `${order.scheduledDate} (${order.deliveryTimeSlot})`,
        createdAt: new Date().toISOString()
      });
    }
  }
  db.save();
  res.json(result);
});

// ----------------------------------------------------
// 9. REVIEWS & RATINGS
// ----------------------------------------------------
apiRouter.post('/reviews', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['student']);
  if (!user) return;

  const { bookingId, orderId, providerId, rating, comment, serviceType } = req.body;

  if (!providerId || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 || typeof comment !== 'string' || comment.trim().length < 3 || comment.length > 1000) {
    return res.status(400).json({ error: 'Valid providerId and 1-5 star rating are required' });
  }

  if ((!bookingId && !orderId) || (bookingId && orderId)) {
    return res.status(400).json({ error: 'Review exactly one completed booking or delivered order' });
  }

  // Prevent duplicate review for same booking
  if (bookingId && db.reviews.some(r => r.bookingId === bookingId)) {
    return res.status(400).json({ error: 'You have already reviewed this booking.' });
  }

  // Prevent review for incomplete booking
  if (bookingId) {
    const bk = db.bookings.find(b => b.id === bookingId);
    if (!bk || bk.studentId !== user.id || bk.providerId !== providerId) {
      return res.status(403).json({ error: 'This booking does not belong to your account' });
    }
    if (bk.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Reviews can only be submitted after service completion.' });
    }
  }

  if (orderId) {
    const order = db.foodOrders.find(o => o.id === orderId);
    if (!order || order.studentId !== user.id || order.homemakerId !== providerId) {
      return res.status(403).json({ error: 'This food order does not belong to your account' });
    }
    if (order.status !== 'DELIVERED') return res.status(400).json({ error: 'Reviews can only be submitted after delivery.' });
    if (db.reviews.some(r => r.orderId === orderId)) return res.status(400).json({ error: 'You have already reviewed this order.' });
  }

  const newReview: Review = {
    id: `rev-${Date.now()}`,
    bookingId,
    orderId,
    studentId: user.id,
    studentName: user.name,
    studentAvatar: user.avatar,
    providerId,
    rating: Number(rating),
    comment: comment.trim(),
    serviceType: serviceType || 'Service',
    createdAt: new Date().toISOString()
  };

  db.reviews.push(newReview);

  // Recalculate provider or homemaker rating
  const provider = db.providers.find(p => p.id === providerId);
  if (provider) {
    const provReviews = db.reviews.filter(r => r.providerId === providerId);
    const avg = provReviews.reduce((sum, r) => sum + r.rating, 0) / provReviews.length;
    provider.rating = Math.round(avg * 10) / 10;
    provider.reviewsCount = provReviews.length;
  }

  const homemaker = db.homemakers.find(h => h.id === providerId);
  if (homemaker) {
    const hmReviews = db.reviews.filter(r => r.providerId === providerId);
    const avg = hmReviews.reduce((sum, r) => sum + r.rating, 0) / hmReviews.length;
    homemaker.rating = Math.round(avg * 10) / 10;
    homemaker.reviewsCount = hmReviews.length;
  }

  db.save();
  res.json({ success: true, review: newReview });
});

apiRouter.get('/reviews/provider/:id', (req: Request, res: Response) => {
  const reviews = db.reviews.filter(r => r.providerId === req.params.id);
  res.json({ reviews });
});

// ----------------------------------------------------
// 10. NOTIFICATIONS
// ----------------------------------------------------
apiRouter.get('/notifications', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;

  const userNotifs = db.notifications.filter(n => n.userId === user.id);
  res.json({ notifications: userNotifs });
});

apiRouter.put('/notifications/:id/read', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const notif = db.notifications.find(n => n.id === req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  if (notif.userId !== user.id) return res.status(403).json({ error: 'You cannot update this notification' });
  notif.isRead = true;
  db.save();
  res.json({ success: true });
});

apiRouter.put('/notifications/read-all', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  db.notifications.filter(n => n.userId === user.id).forEach(n => n.isRead = true);
  db.save();
  res.json({ success: true });
});

// ----------------------------------------------------
// 11. COMPLAINTS & DISPUTES
// ----------------------------------------------------
apiRouter.post('/complaints', (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;

  const { reportedId, bookingId, orderId, category, description } = req.body;
  const reportedUser = db.users.find(u => u.id === reportedId) || 
                       db.providers.find(p => p.id === reportedId) || 
                       db.homemakers.find(h => h.id === reportedId);
  const allowedCategories = ['poor_service', 'no_show', 'harassment', 'payment_issue', 'food_quality', 'other'];
  if (!reportedId || !reportedUser || !allowedCategories.includes(category) || typeof description !== 'string' || description.trim().length < 10 || description.length > 2000) {
    return res.status(400).json({ error: 'A valid provider, category, and detailed description are required' });
  }
  if (bookingId) {
    const booking = db.bookings.find(b => b.id === bookingId);
    if (!booking || (user.role !== 'admin' && booking.studentId !== user.id)) return res.status(403).json({ error: 'Invalid booking reference' });
  }
  if (orderId) {
    const order = db.foodOrders.find(o => o.id === orderId);
    if (!order || (user.role !== 'admin' && order.studentId !== user.id)) return res.status(403).json({ error: 'Invalid order reference' });
  }

  const newComplaint: Complaint = {
    id: `cmp-${Date.now()}`,
    ticketId: `TKT-${Math.floor(100 + Math.random() * 900)}`,
    reporterId: user.id,
    reporterName: user.name,
    reportedId: reportedId || 'unknown',
    reportedName: (reportedUser as any)?.name || (reportedUser as any)?.kitchenName || 'Service Provider',
    bookingId,
    orderId,
    category,
    description: description.trim(),
    status: 'OPEN',
    createdAt: new Date().toISOString()
  };

  db.complaints.unshift(newComplaint);
  for (const admin of db.users.filter(account => account.role === 'admin' && account.status === 'active')) {
    db.notifications.push({
      id: `notif-${Date.now()}-${admin.id}`,
      userId: admin.id,
      title: `New Trust & Safety ticket ${newComplaint.ticketId}`,
      message: `${user.name} submitted a ${category.replace(/_/g, ' ')} complaint.`,
      type: 'system',
      link: '/admin',
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }
  db.save();
  res.json({ success: true, complaint: newComplaint });
});

// ----------------------------------------------------
// 12. AI SERVICE ASSISTANT & CHAT
// ----------------------------------------------------
apiRouter.post('/ai/understand-request', async (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const { query, studentArea } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'A query string is required' });
  }

  const area = typeof studentArea === 'string' && studentArea.length <= 100 ? studentArea : user.area;
  const result = await parseNaturalLanguageRequest(query, area);
  res.json(result);
});

apiRouter.post('/ai/support-chat', async (req: Request, res: Response) => {
  const user = requireUser(req, res);
  if (!user) return;
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const reply = await generateSupportChatReply(message, history || [], user);
  res.json({ reply });
});

// ----------------------------------------------------
// 13. ADMIN DASHBOARD & CONTROLS
// ----------------------------------------------------
apiRouter.get('/admin/dashboard', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['admin']);
  if (!user) return;
  const totalUsers = db.users.length;
  const activeStudents = db.users.filter(u => u.role === 'student' && u.status === 'active').length;
  const activeProviders = db.providers.filter(p => p.verifiedStatus === 'VERIFIED').length;
  const activeHomemakers = db.homemakers.filter(h => h.verifiedStatus === 'VERIFIED').length;
  const totalBookings = db.bookings.length;
  const completedBookings = db.bookings.filter(b => b.status === 'COMPLETED').length;
  const totalFoodOrders = db.foodOrders.length;
  const deliveredFoodOrders = db.foodOrders.filter(o => o.status === 'DELIVERED').length;

  const bookingRevenue = db.bookings.filter(b => b.paymentStatus === 'SUCCESS').reduce((sum, b) => sum + b.price, 0);
  const foodRevenue = db.foodOrders.filter(o => o.paymentStatus === 'SUCCESS').reduce((sum, o) => sum + o.grandTotal, 0);
  const totalRevenue = bookingRevenue + foodRevenue;

  const popularCategories = [
    { name: 'Homemade Food', count: totalFoodOrders, share: 45 },
    { name: 'Plumbing', count: db.bookings.filter(b => b.providerCategory === 'plumber').length, share: 22 },
    { name: 'Electrical', count: db.bookings.filter(b => b.providerCategory === 'electrician').length, share: 18 },
    { name: 'Cleaning', count: db.bookings.filter(b => b.providerCategory === 'cleaner').length, share: 15 }
  ];

  res.json({
    metrics: {
      totalUsers,
      activeStudents,
      activeProviders: activeProviders + activeHomemakers,
      totalBookings: totalBookings + totalFoodOrders,
      completedBookings: completedBookings + deliveredFoodOrders,
      totalRevenue,
      platformCommission: Math.round(totalRevenue * 0.10), // 10% platform fee
      openComplaints: db.complaints.filter(c => c.status === 'OPEN').length,
       averageRating: db.reviews.length > 0
         ? Math.round((db.reviews.reduce((sum, review) => sum + review.rating, 0) / db.reviews.length) * 100) / 100
         : 0
    },
    popularCategories,
    recentBookings: db.bookings.slice(0, 5),
    recentOrders: db.foodOrders.slice(0, 5),
    complaints: db.complaints.slice(0, 5),
    matchingWeights: db.matchingWeights
  });
});

apiRouter.get('/admin/users', (_req: Request, res: Response) => {
  const user = requireRole(_req, res, ['admin']);
  if (!user) return;
  res.json({ users: db.users.map(publicUser) });
});

apiRouter.get('/admin/providers', (_req: Request, res: Response) => {
  const user = requireRole(_req, res, ['admin']);
  if (!user) return;
  res.json({
    serviceProviders: db.providers,
    homemakers: db.homemakers,
    farmers: db.farmers,
    institutions: db.institutions
  });
});

apiRouter.post('/admin/providers/:id/verify', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['admin']);
  if (!user) return;
  const { status } = req.body; // 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
  if (!['VERIFIED', 'REJECTED', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid verification status' });
  }

  const prov = db.providers.find(p => p.id === req.params.id);
  if (prov) {
    prov.verifiedStatus = status;
    db.save();
    return res.json({ success: true, provider: prov });
  }

  const hm = db.homemakers.find(h => h.id === req.params.id);
  if (hm) {
    hm.verifiedStatus = status;
    db.save();
    return res.json({ success: true, homemaker: hm });
  }

  const farmer = db.farmers.find(f => f.id === req.params.id);
  if (farmer) {
    farmer.verifiedStatus = status;
    db.save();
    return res.json({ success: true, farmer });
  }

  res.status(404).json({ error: 'Provider not found' });
});

apiRouter.post('/admin/institutions/:id/verify', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['admin']);
  if (!user) return;
  const institution = db.institutions.find(item => item.id === req.params.id);
  if (!institution) return res.status(404).json({ error: 'Institution not found' });
  if (!['VERIFIED', 'REJECTED'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid institution verification status' });
  institution.verificationStatus = req.body.status;
  db.save();
  res.json({ success: true, institution });
});

apiRouter.post('/admin/weights', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['admin']);
  if (!user) return;
  const { serviceRelevance, availability, rating, distance, price, reliability } = req.body;
  const nextWeights = {
    serviceRelevance: Number(serviceRelevance) || 0.30,
    availability: Number(availability) || 0.20,
    rating: Number(rating) || 0.15,
    distance: Number(distance) || 0.15,
    price: Number(price) || 0.10,
    reliability: Number(reliability) || 0.10
  };
  const total = Object.values(nextWeights).reduce((sum, value) => sum + value, 0);
  if (Object.values(nextWeights).some(value => value < 0 || value > 1) || Math.abs(total - 1) > 0.02) {
    return res.status(400).json({ error: 'Matching weights must be between 0 and 1 and add up to approximately 1' });
  }
  db.matchingWeights = nextWeights;
  db.save();
  res.json({ success: true, matchingWeights: db.matchingWeights });
});

apiRouter.put('/admin/complaints/:id', (req: Request, res: Response) => {
  const user = requireRole(req, res, ['admin']);
  if (!user) return;
  const complaint = db.complaints.find(c => c.id === req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  const { status, resolution } = req.body;
  if (status && !['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid complaint status' });
  }
  if (status) complaint.status = status;
  if (resolution) complaint.resolution = resolution;
  db.save();
  res.json({ success: true, complaint });
});
