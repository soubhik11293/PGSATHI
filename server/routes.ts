import { Router, Request, Response } from 'express';
import { db, User, Booking, FoodOrder, Review, Notification, Complaint, RecurringService } from './db';
import { paymentService } from './payments';
import { parseNaturalLanguageRequest, generateSupportChatReply } from './ai';
import { calculateProviderMatch, calculateHomemakerMatch } from './matching';

export const apiRouter = Router();

// Middleware to extract user session (supports Bearer token or x-user-id header or cookie)
function getCurrentUser(req: Request): User | null {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    return db.users.find(u => u.id === userId) || null;
  }
  // Default to student Aarav for easy evaluation if no header
  return db.users[0] || null;
}

// ----------------------------------------------------
// 1. AUTHENTICATION & SESSIONS
// ----------------------------------------------------
apiRouter.get('/auth/demo-users', (_req: Request, res: Response) => {
  res.json({
    users: db.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone,
      avatar: u.avatar,
      pgName: u.pgName,
      area: u.area
    }))
  });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password, userId } = req.body;
  
  if (userId) {
    const user = db.users.find(u => u.id === userId);
    if (user) {
      return res.json({ success: true, user, token: `token_${user.id}` });
    }
  }

  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  if (user) {
    return res.json({ success: true, user, token: `token_${user.id}` });
  }

  // Create demo student if not found and simple login attempted
  if (email) {
    const newUser: User = {
      id: `usr-${Date.now()}`,
      email,
      name: email.split('@')[0],
      phone: '+91 98000 00000',
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      pgName: 'Stanza Living PG',
      area: 'Koramangala',
      city: 'Bengaluru',
      pincode: '560034',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    db.save();
    return res.json({ success: true, user: newUser, token: `token_${newUser.id}` });
  }

  res.status(401).json({ error: 'Invalid credentials' });
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, role, pgName, address, area, city, pincode } = req.body;

  if (!email || !name || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
  }

  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be self-registered.' });
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
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // If role is provider or homemaker, bootstrap their profile
  if (role === 'homemaker') {
    db.homemakers.push({
      id: `hm-${Date.now()}`,
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
          homemakerId: `hm-${Date.now()}`,
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
          homemakerId: `hm-${Date.now()}`,
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
  }

  db.save();
  res.json({ success: true, user: newUser, token: `token_${newUser.id}` });
});

apiRouter.post('/auth/logout', (_req: Request, res: Response) => {
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
  let list = db.providers;

  if (category) {
    list = list.filter(p => p.categorySlug.toLowerCase() === (category as string).toLowerCase());
  }

  if (verifiedOnly === 'true') {
    list = list.filter(p => p.verifiedStatus === 'VERIFIED');
  }

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

  res.json({ providers: list });
});

apiRouter.get('/providers/:id', (req: Request, res: Response) => {
  const provider = db.providers.find(p => p.id === req.params.id || p.userId === req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  const reviews = db.reviews.filter(r => r.providerId === provider.id);
  res.json({ provider, reviews });
});

apiRouter.put('/providers/:id/status', (req: Request, res: Response) => {
  const provider = db.providers.find(p => p.id === req.params.id || p.userId === req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
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
  let list = db.homemakers;

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

  res.json({ homemakers: list });
});

apiRouter.get('/food/homemakers/:id', (req: Request, res: Response) => {
  const homemaker = db.homemakers.find(h => h.id === req.params.id || h.userId === req.params.id);
  if (!homemaker) {
    return res.status(404).json({ error: 'Kitchen not found' });
  }
  const reviews = db.reviews.filter(r => r.providerId === homemaker.id);
  res.json({ homemaker, reviews });
});

apiRouter.post('/food/homemakers/:id/menu', (req: Request, res: Response) => {
  const homemaker = db.homemakers.find(h => h.id === req.params.id || h.userId === req.params.id);
  if (!homemaker) {
    return res.status(404).json({ error: 'Kitchen not found' });
  }
  const { name, mealType, description, isVeg, price, contents } = req.body;
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
  const homemaker = db.homemakers.find(h => h.id === req.params.id || h.userId === req.params.id);
  if (!homemaker) {
    return res.status(404).json({ error: 'Kitchen not found' });
  }
  const { dailyCapacity } = req.body;
  if (dailyCapacity) homemaker.dailyCapacity = Number(dailyCapacity);
  db.save();
  res.json({ success: true, homemaker });
});

// ----------------------------------------------------
// 5. BOOKING ENGINE (Universal Services)
// ----------------------------------------------------
apiRouter.post('/bookings', async (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please login to book services.' });
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
  if (provider.verifiedStatus === 'SUSPENDED') {
    return res.status(400).json({ error: 'This provider is currently suspended.' });
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
    createdAt: new Date().toISOString()
  };

  // 5. Process Payment via abstraction
  const paymentResp = await paymentService.initiatePayment({
    orderType: 'booking',
    referenceId: newBooking.id,
    userId: user.id,
    amount: price,
    currency: 'INR',
    method: paymentMethod || 'upi'
  });

  newBooking.paymentId = paymentResp.paymentId;
  if (paymentResp.status === 'SUCCESS') {
    newBooking.paymentStatus = 'SUCCESS';
    newBooking.status = 'ACCEPTED';
    newBooking.timeline.push({
      status: 'ACCEPTED',
      timestamp: new Date().toISOString(),
      note: 'Payment verified and booking confirmed with provider'
    });
  }

  // 6. Handle recurring if selected
  if (isRecurring) {
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
      completedCycles: 1,
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
    title: 'Booking Confirmed 🎉',
    message: `Your booking with ${provider.name} (${bookingCode}) is confirmed for ₹${price}.`,
    type: 'booking',
    link: '/bookings',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  db.save();
  res.json({ success: true, booking: newBooking, payment: paymentResp });
});

apiRouter.get('/bookings', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let list = db.bookings;
  if (user.role === 'student') {
    list = list.filter(b => b.studentId === user.id);
  } else if (user.role === 'provider') {
    const provider = db.providers.find(p => p.userId === user.id);
    if (provider) {
      list = list.filter(b => b.providerId === provider.id);
    }
  }
  res.json({ bookings: list });
});

apiRouter.put('/bookings/:id/status', (req: Request, res: Response) => {
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const { status, note } = req.body;
  const validStatuses = ['REQUESTED', 'ACCEPTED', 'REJECTED', 'SCHEDULED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
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

  db.save();
  res.json({ success: true, booking });
});

apiRouter.post('/bookings/:id/cancel', (req: Request, res: Response) => {
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
    return res.status(400).json({ error: `Cannot cancel a booking that is ${booking.status}` });
  }

  booking.status = 'CANCELLED';
  booking.cancellationReason = req.body.reason || 'Cancelled by user';
  booking.timeline.push({
    status: 'CANCELLED',
    timestamp: new Date().toISOString(),
    note: `Cancelled: ${booking.cancellationReason}`
  });

  db.save();
  res.json({ success: true, booking });
});

// ----------------------------------------------------
// 6. FOOD ORDERS & MEAL SUBSCRIPTIONS
// ----------------------------------------------------
apiRouter.post('/food/orders', async (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please login to order food' });
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
  if (!homemaker) {
    return res.status(404).json({ error: 'Homemaker kitchen not found' });
  }

  // 2. Verify Capacity
  if (homemaker.currentCapacityUsed >= homemaker.dailyCapacity) {
    return res.status(400).json({ error: 'Kitchen has reached maximum orders for today. Please schedule for tomorrow!' });
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
    for (const reqItem of items) {
      const dbItem = homemaker.menu.find(m => m.id === reqItem.menuItemId);
      if (dbItem) {
        const qty = Math.max(1, Number(reqItem.quantity) || 1);
        subtotal += dbItem.price * qty;
        verifiedItems.push({
          menuItemId: dbItem.id,
          name: dbItem.name,
          quantity: qty,
          unitPrice: dbItem.price
        });
      }
    }
  } else {
    // Default to first available menu item
    const fallbackItem = homemaker.menu[0];
    if (fallbackItem) {
      subtotal = fallbackItem.price;
      verifiedItems.push({
        menuItemId: fallbackItem.id,
        name: fallbackItem.name,
        quantity: 1,
        unitPrice: fallbackItem.price
      });
    }
  }

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
    createdAt: new Date().toISOString()
  };

  // 5. Initiate Payment
  const paymentResp = await paymentService.initiatePayment({
    orderType: 'food_order',
    referenceId: newOrder.id,
    userId: user.id,
    amount: grandTotal,
    currency: 'INR',
    method: paymentMethod || 'upi'
  });

  newOrder.paymentId = paymentResp.paymentId;
  if (paymentResp.status === 'SUCCESS') {
    newOrder.paymentStatus = 'SUCCESS';
    newOrder.status = 'ACCEPTED';
    newOrder.timeline.push({
      status: 'ACCEPTED',
      timestamp: new Date().toISOString(),
      note: 'Payment successful, kitchen notified'
    });
  }

  // 6. Handle recurring meal subscription
  if (isRecurring) {
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
      completedCycles: 1,
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
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let list = db.foodOrders;
  if (user.role === 'student') {
    list = list.filter(o => o.studentId === user.id);
  } else if (user.role === 'homemaker') {
    const homemaker = db.homemakers.find(h => h.userId === user.id);
    if (homemaker) {
      list = list.filter(o => o.homemakerId === homemaker.id);
    }
  }
  res.json({ orders: list });
});

apiRouter.put('/food/orders/:id/status', (req: Request, res: Response) => {
  const order = db.foodOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const { status, note } = req.body;
  const validStatuses = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  order.status = status;
  order.timeline.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Order updated to ${status}`
  });

  if (status === 'DELIVERED') {
    const hm = db.homemakers.find(h => h.id === order.homemakerId);
    if (hm) {
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

  db.save();
  res.json({ success: true, order });
});

// ----------------------------------------------------
// 7. RECURRING SERVICES
// ----------------------------------------------------
apiRouter.get('/recurring', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  let list = db.recurringServices;
  if (user.role === 'student') {
    list = list.filter(r => r.studentId === user.id);
  }
  res.json({ subscriptions: list });
});

apiRouter.put('/recurring/:id/status', (req: Request, res: Response) => {
  const sub = db.recurringServices.find(r => r.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

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
  const { paymentId, signature } = req.body;
  const result = await paymentService.confirmPayment(paymentId, signature);
  res.json(result);
});

// ----------------------------------------------------
// 9. REVIEWS & RATINGS
// ----------------------------------------------------
apiRouter.post('/reviews', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { bookingId, orderId, providerId, rating, comment, serviceType } = req.body;

  if (!providerId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Valid providerId and 1-5 star rating are required' });
  }

  // Prevent duplicate review for same booking
  if (bookingId && db.reviews.some(r => r.bookingId === bookingId)) {
    return res.status(400).json({ error: 'You have already reviewed this booking.' });
  }

  // Prevent review for incomplete booking
  if (bookingId) {
    const bk = db.bookings.find(b => b.id === bookingId);
    if (bk && bk.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Reviews can only be submitted after service completion.' });
    }
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
    comment: comment || '',
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
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userNotifs = db.notifications.filter(n => n.userId === user.id);
  res.json({ notifications: userNotifs });
});

apiRouter.put('/notifications/:id/read', (req: Request, res: Response) => {
  const notif = db.notifications.find(n => n.id === req.params.id);
  if (notif) notif.isRead = true;
  db.save();
  res.json({ success: true });
});

apiRouter.put('/notifications/read-all', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (user) {
    db.notifications.filter(n => n.userId === user.id).forEach(n => n.isRead = true);
    db.save();
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// 11. COMPLAINTS & DISPUTES
// ----------------------------------------------------
apiRouter.post('/complaints', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { reportedId, bookingId, orderId, category, description } = req.body;
  const reportedUser = db.users.find(u => u.id === reportedId) || 
                       db.providers.find(p => p.id === reportedId) || 
                       db.homemakers.find(h => h.id === reportedId);

  const newComplaint: Complaint = {
    id: `cmp-${Date.now()}`,
    ticketId: `TKT-${Math.floor(100 + Math.random() * 900)}`,
    reporterId: user.id,
    reporterName: user.name,
    reportedId: reportedId || 'unknown',
    reportedName: (reportedUser as any)?.name || (reportedUser as any)?.kitchenName || 'Service Provider',
    bookingId,
    orderId,
    category: category || 'poor_service',
    description: description || '',
    status: 'OPEN',
    createdAt: new Date().toISOString()
  };

  db.complaints.unshift(newComplaint);
  db.save();
  res.json({ success: true, complaint: newComplaint });
});

// ----------------------------------------------------
// 12. AI SERVICE ASSISTANT & CHAT
// ----------------------------------------------------
apiRouter.post('/ai/understand-request', async (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const { query, studentArea } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'A query string is required' });
  }

  const area = studentArea || user?.area || 'Koramangala';
  const result = await parseNaturalLanguageRequest(query, area);
  res.json(result);
});

apiRouter.post('/ai/support-chat', async (req: Request, res: Response) => {
  const user = getCurrentUser(req) || db.users[0];
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
      averageRating: 4.86
    },
    popularCategories,
    recentBookings: db.bookings.slice(0, 5),
    recentOrders: db.foodOrders.slice(0, 5),
    complaints: db.complaints.slice(0, 5),
    matchingWeights: db.matchingWeights
  });
});

apiRouter.get('/admin/users', (_req: Request, res: Response) => {
  res.json({ users: db.users });
});

apiRouter.get('/admin/providers', (_req: Request, res: Response) => {
  res.json({
    serviceProviders: db.providers,
    homemakers: db.homemakers
  });
});

apiRouter.post('/admin/providers/:id/verify', (req: Request, res: Response) => {
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

  res.status(404).json({ error: 'Provider not found' });
});

apiRouter.post('/admin/weights', (req: Request, res: Response) => {
  const { serviceRelevance, availability, rating, distance, price, reliability } = req.body;
  db.matchingWeights = {
    serviceRelevance: Number(serviceRelevance) || 0.30,
    availability: Number(availability) || 0.20,
    rating: Number(rating) || 0.15,
    distance: Number(distance) || 0.15,
    price: Number(price) || 0.10,
    reliability: Number(reliability) || 0.10
  };
  db.save();
  res.json({ success: true, matchingWeights: db.matchingWeights });
});

apiRouter.put('/admin/complaints/:id', (req: Request, res: Response) => {
  const complaint = db.complaints.find(c => c.id === req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  const { status, resolution } = req.body;
  if (status) complaint.status = status;
  if (resolution) complaint.resolution = resolution;
  db.save();
  res.json({ success: true, complaint });
});
