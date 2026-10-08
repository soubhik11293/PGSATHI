import { GoogleGenAI } from '@google/genai';
import { db } from './db';
import { calculateProviderMatch, calculateHomemakerMatch } from './matching';

export interface ParsedRequest {
  category: 'food' | 'plumber' | 'electrician' | 'cleaner' | 'laundry' | 'repairs' | 'errands' | 'moving';
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
  matchedProviders: any[];
  bookingDraft?: any;
}

// Resilient fallback rule engine for instant zero-latency or offline response
function heuristicParser(query: string, studentArea: string = 'Koramangala'): ParsedRequest {
  const text = query.toLowerCase();
  
  // 1. Food detection
  if (
    text.includes('food') || text.includes('dinner') || text.includes('lunch') || 
    text.includes('breakfast') || text.includes('tiffin') || text.includes('dabba') ||
    text.includes('meal') || text.includes('roti') || text.includes('khana') || text.includes('eat')
  ) {
    const isDinner = text.includes('dinner') || text.includes('night');
    const isLunch = text.includes('lunch') || text.includes('afternoon');
    const isBreakfast = text.includes('breakfast') || text.includes('morning');
    const meal = isDinner ? 'dinner' : isLunch ? 'lunch' : isBreakfast ? 'breakfast' : 'dinner';

    const isVeg = text.includes('veg') && !text.includes('non-veg');
    const isNonVeg = text.includes('non-veg') || text.includes('chicken') || text.includes('fish') || text.includes('egg');
    const diet = isVeg ? 'vegetarian' : isNonVeg ? 'non-vegetarian' : 'vegetarian';

    const isRecurring = text.includes('day') || text.includes('week') || text.includes('month') || text.includes('every day') || text.includes('daily');
    let durationDays = 1;
    const daysMatch = text.match(/(\d+)\s*(day|days)/);
    if (daysMatch) {
      durationDays = parseInt(daysMatch[1], 10);
    } else if (text.includes('weekly') || text.includes('week')) {
      durationDays = 7;
    } else if (text.includes('month')) {
      durationDays = 30;
    } else if (isRecurring) {
      durationDays = 7;
    }

    let budgetMax: number | undefined;
    const budgetMatch = text.match(/(under|below|max|within|₹|rs\.?)\s*(\d+)/i) || text.match(/(\d+)\s*(rs|inr|rupees|\/meal|per meal)/i);
    if (budgetMatch) {
      budgetMax = parseInt(budgetMatch[2] || budgetMatch[1], 10);
    }

    // Match real homemakers from DB
    const matchingHomemakers = db.homemakers
      .filter(h => h.verifiedStatus === 'VERIFIED')
      .map(h => calculateHomemakerMatch(h, { meal, diet, studentArea, maxBudget: budgetMax, recurring: isRecurring }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const bestHomemaker = matchingHomemakers[0]?.item;
    let selectedPackage = null;
    let selectedMenuItem = null;

    if (bestHomemaker) {
      if (isRecurring && durationDays >= 7) {
        selectedPackage = bestHomemaker.packages.find(p => p.planType === 'weekly' && (p.mealType === meal || p.mealType === 'both')) || bestHomemaker.packages[0];
      }
      selectedMenuItem = bestHomemaker.menu.find(m => m.mealType === meal && (diet === 'vegetarian' ? m.isVeg : true)) || bestHomemaker.menu[0];
    }

    const pricePerMeal = selectedPackage ? selectedPackage.pricePerMeal : (selectedMenuItem?.price || 100);
    const estimatedTotal = isRecurring ? pricePerMeal * durationDays : pricePerMeal;

    return {
      category: 'food',
      problem: `Student requested ${diet} ${meal} ${isRecurring ? `recurring for ${durationDays} days` : 'tonight'}`,
      urgency: 'medium',
      meal,
      diet,
      recurring: isRecurring,
      durationDays: isRecurring ? durationDays : 1,
      budgetMax,
      recommendedServiceTitle: isRecurring ? `${durationDays}-Day Homemade ${diet === 'vegetarian' ? 'Veg ' : ''}${meal.toUpperCase()} Subscription` : `Homemade ${diet === 'vegetarian' ? 'Veg ' : ''}${meal.toUpperCase()} Tiffin`,
      estimatedDuration: isRecurring ? `${durationDays} Days` : '30-45 mins delivery',
      matchedProviders: matchingHomemakers,
      bookingDraft: bestHomemaker ? {
        homemakerId: bestHomemaker.id,
        kitchenName: bestHomemaker.kitchenName,
        mealType: meal,
        mealPackageId: selectedPackage?.id,
        packageTitle: selectedPackage?.title,
        menuItemId: selectedMenuItem?.id,
        menuItemName: selectedMenuItem?.name,
        pricePerUnit: pricePerMeal,
        durationDays: isRecurring ? durationDays : 1,
        isRecurring,
        estimatedTotal,
        deliveryFee: bestHomemaker.deliveryFee
      } : undefined
    };
  }

  // 2. Plumber detection
  if (
    text.includes('tap') || text.includes('plumber') || text.includes('leak') || 
    text.includes('flush') || text.includes('drain') || text.includes('sink') || 
    text.includes('pipe') || text.includes('geyser') || text.includes('water leak')
  ) {
    const isUrgent = text.includes('urgent') || text.includes('emergency') || text.includes('flooding') || text.includes('asap');
    const urgency = isUrgent ? 'high' : 'medium';

    const matchingProviders = db.providers
      .filter(p => p.categorySlug === 'plumber' && p.verifiedStatus === 'VERIFIED')
      .map(p => calculateProviderMatch(p, { category: 'plumber', studentArea, urgency }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const bestProvider = matchingProviders[0]?.item;

    return {
      category: 'plumber',
      problem: text.includes('tap') ? 'Bathroom/sink tap leaking water' : text.includes('drain') ? 'Clogged drain issue' : 'Plumbing fixture malfunction',
      urgency,
      recurring: false,
      recommendedServiceTitle: 'Bathroom Tap Leakage & Plumbing Repair',
      estimatedDuration: '30-45 minutes',
      matchedProviders: matchingProviders,
      bookingDraft: bestProvider ? {
        providerId: bestProvider.id,
        providerName: bestProvider.name,
        categorySlug: 'plumber',
        serviceTitle: 'Tap & Plumbing Fixture Repair',
        basePrice: bestProvider.basePrice,
        responseTime: bestProvider.responseTime
      } : undefined
    };
  }

  // 3. Electrician detection
  if (
    text.includes('fan') || text.includes('light') || text.includes('electric') || 
    text.includes('switch') || text.includes('socket') || text.includes('shock') ||
    text.includes('bulb') || text.includes('mcb') || text.includes('kettle')
  ) {
    const isUrgent = text.includes('urgent') || text.includes('spark') || text.includes('smoke');
    const urgency = isUrgent ? 'immediate' : 'medium';

    const matchingProviders = db.providers
      .filter(p => p.categorySlug === 'electrician' && p.verifiedStatus === 'VERIFIED')
      .map(p => calculateProviderMatch(p, { category: 'electrician', studentArea, urgency }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const bestProvider = matchingProviders[0]?.item;

    return {
      category: 'electrician',
      problem: text.includes('fan') ? 'Ceiling fan stopped working / slow speed' : 'Switchboard or electrical fitting issue',
      urgency,
      recurring: false,
      recommendedServiceTitle: 'Ceiling Fan & Electrical Repair',
      estimatedDuration: '30-60 minutes',
      matchedProviders: matchingProviders,
      bookingDraft: bestProvider ? {
        providerId: bestProvider.id,
        providerName: bestProvider.name,
        categorySlug: 'electrician',
        serviceTitle: 'Ceiling Fan & Appliance Repair',
        basePrice: bestProvider.basePrice,
        responseTime: bestProvider.responseTime
      } : undefined
    };
  }

  // 4. Cleaner detection
  if (
    text.includes('clean') || text.includes('sweep') || text.includes('mop') || 
    text.includes('dust') || text.includes('bathroom clean') || text.includes('maid')
  ) {
    const isRecurring = text.includes('weekly') || text.includes('every week') || text.includes('daily');
    const matchingProviders = db.providers
      .filter(p => p.categorySlug === 'cleaner' && p.verifiedStatus === 'VERIFIED')
      .map(p => calculateProviderMatch(p, { category: 'cleaner', studentArea, urgency: 'low' }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const bestProvider = matchingProviders[0]?.item;

    return {
      category: 'cleaner',
      problem: 'PG room and bathroom deep dusting & sanitization',
      urgency: 'low',
      recurring: isRecurring,
      recommendedServiceTitle: 'PG Room & Bathroom Deep Cleaning',
      estimatedDuration: '1-1.5 hours',
      matchedProviders: matchingProviders,
      bookingDraft: bestProvider ? {
        providerId: bestProvider.id,
        providerName: bestProvider.name,
        categorySlug: 'cleaner',
        serviceTitle: 'PG Room & Bathroom Deep Cleaning',
        basePrice: bestProvider.basePrice,
        responseTime: bestProvider.responseTime
      } : undefined
    };
  }

  // 5. Laundry detection
  if (text.includes('laundry') || text.includes('wash') || text.includes('iron') || text.includes('press') || text.includes('clothes')) {
    const matchingProviders = db.providers
      .filter(p => p.categorySlug === 'laundry' && p.verifiedStatus === 'VERIFIED')
      .map(p => calculateProviderMatch(p, { category: 'laundry', studentArea, urgency: 'low' }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const bestProvider = matchingProviders[0]?.item;

    return {
      category: 'laundry',
      problem: 'Clothes doorstep wash, fold and steam pressing',
      urgency: 'low',
      recurring: text.includes('week') || text.includes('every'),
      recommendedServiceTitle: 'Doorstep PG Laundry & Ironing Pickup',
      estimatedDuration: '24-hour turnaround',
      matchedProviders: matchingProviders,
      bookingDraft: bestProvider ? {
        providerId: bestProvider.id,
        providerName: bestProvider.name,
        categorySlug: 'laundry',
        serviceTitle: 'Doorstep PG Laundry & Ironing',
        basePrice: bestProvider.basePrice,
        responseTime: bestProvider.responseTime
      } : undefined
    };
  }

  // 6. Generic handyman/repairs or errands
  const isErrands = text.includes('errand') || text.includes('water') || text.includes('medicine') || text.includes('parcel');
  const catSlug = isErrands ? 'errands' : 'repairs';
  const matchingProviders = db.providers
    .filter(p => p.categorySlug === catSlug && p.verifiedStatus === 'VERIFIED')
    .map(p => calculateProviderMatch(p, { category: catSlug, studentArea, urgency: 'medium' }))
    .sort((a, b) => b.matchScore - a.matchScore);

  const bestProvider = matchingProviders[0]?.item;

  return {
    category: isErrands ? 'errands' : 'repairs',
    problem: query,
    urgency: 'medium',
    recurring: false,
    recommendedServiceTitle: isErrands ? 'PG Quick Errand & Water Delivery' : 'Handyman & Room Fixture Repair',
    estimatedDuration: '30-45 minutes',
    matchedProviders: matchingProviders,
    bookingDraft: bestProvider ? {
      providerId: bestProvider.id,
      providerName: bestProvider.name,
      categorySlug: catSlug,
      serviceTitle: isErrands ? 'PG Quick Errand Run' : 'Handyman Repair',
      basePrice: bestProvider.basePrice,
      responseTime: bestProvider.responseTime
    } : undefined
  };
}

export async function parseNaturalLanguageRequest(query: string, studentArea: string = 'Koramangala'): Promise<ParsedRequest> {
  const fallback = heuristicParser(query, studentArea);

  // If Gemini API Key exists, try enhanced LLM structured extraction
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI();
    const systemPrompt = `You are the AI Service Assistant for PG Saathi, a platform for Indian PG hostel students.
Given the student's natural language request, analyze and return strict JSON with:
{
  "category": "food" | "plumber" | "electrician" | "cleaner" | "laundry" | "repairs" | "errands" | "moving",
  "problem": string (short description of issue),
  "urgency": "low" | "medium" | "high" | "immediate",
  "meal": "breakfast" | "lunch" | "dinner" | "both" | null,
  "diet": "vegetarian" | "non-vegetarian" | "any",
  "recurring": boolean,
  "durationDays": number,
  "budgetMax": number or null,
  "recommendedServiceTitle": string,
  "estimatedDuration": string,
  "clarificationNeeded": string or null
}
Return only valid JSON.`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timeout')), 3500)
    );

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nStudent Request: "${query}"` }] }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      }),
      timeoutPromise
    ]) as any;

    const parsedJson = JSON.parse(response.text || '{}');
    
    // Merge AI extracted parameters with real database items
    const mergedCategory = parsedJson.category || fallback.category;
    const isFood = mergedCategory === 'food';

    if (isFood) {
      const meal = parsedJson.meal || fallback.meal || 'dinner';
      const diet = parsedJson.diet || fallback.diet || 'vegetarian';
      const budgetMax = parsedJson.budgetMax || fallback.budgetMax;
      const isRecurring = parsedJson.recurring ?? fallback.recurring;

      const matchingHomemakers = db.homemakers
        .filter(h => h.verifiedStatus === 'VERIFIED')
        .map(h => calculateHomemakerMatch(h, { meal, diet, studentArea, maxBudget: budgetMax, recurring: isRecurring }))
        .sort((a, b) => b.matchScore - a.matchScore);

      const best = matchingHomemakers[0]?.item;
      let selectedPackage = null;
      let selectedMenuItem = null;
      if (best) {
        if (isRecurring) {
          selectedPackage = best.packages.find(p => p.planType === 'weekly' && (p.mealType === meal || p.mealType === 'both')) || best.packages[0];
        }
        selectedMenuItem = best.menu.find(m => m.mealType === meal && (diet === 'vegetarian' ? m.isVeg : true)) || best.menu[0];
      }

      const pricePerMeal = selectedPackage ? selectedPackage.pricePerMeal : (selectedMenuItem?.price || 100);
      const days = parsedJson.durationDays || fallback.durationDays || (isRecurring ? 7 : 1);

      return {
        category: 'food',
        problem: parsedJson.problem || fallback.problem,
        urgency: parsedJson.urgency || fallback.urgency,
        meal,
        diet,
        recurring: isRecurring,
        durationDays: days,
        budgetMax,
        recommendedServiceTitle: parsedJson.recommendedServiceTitle || fallback.recommendedServiceTitle,
        estimatedDuration: parsedJson.estimatedDuration || fallback.estimatedDuration,
        clarificationNeeded: parsedJson.clarificationNeeded || null,
        matchedProviders: matchingHomemakers,
        bookingDraft: best ? {
          homemakerId: best.id,
          kitchenName: best.kitchenName,
          mealType: meal,
          mealPackageId: selectedPackage?.id,
          packageTitle: selectedPackage?.title,
          menuItemId: selectedMenuItem?.id,
          menuItemName: selectedMenuItem?.name,
          pricePerUnit: pricePerMeal,
          durationDays: days,
          isRecurring,
          estimatedTotal: isRecurring ? pricePerMeal * days : pricePerMeal,
          deliveryFee: best.deliveryFee
        } : undefined
      };
    } else {
      const matchingProviders = db.providers
        .filter(p => p.categorySlug === mergedCategory && p.verifiedStatus === 'VERIFIED')
        .map(p => calculateProviderMatch(p, { category: mergedCategory, studentArea, urgency: parsedJson.urgency || fallback.urgency }))
        .sort((a, b) => b.matchScore - a.matchScore);

      const bestProvider = matchingProviders[0]?.item;

      return {
        category: mergedCategory,
        problem: parsedJson.problem || fallback.problem,
        urgency: parsedJson.urgency || fallback.urgency,
        recurring: parsedJson.recurring ?? fallback.recurring,
        durationDays: 1,
        budgetMax: parsedJson.budgetMax || fallback.budgetMax,
        recommendedServiceTitle: parsedJson.recommendedServiceTitle || fallback.recommendedServiceTitle,
        estimatedDuration: parsedJson.estimatedDuration || fallback.estimatedDuration,
        clarificationNeeded: parsedJson.clarificationNeeded || null,
        matchedProviders: matchingProviders,
        bookingDraft: bestProvider ? {
          providerId: bestProvider.id,
          providerName: bestProvider.name,
          categorySlug: mergedCategory,
          serviceTitle: parsedJson.recommendedServiceTitle || fallback.recommendedServiceTitle,
          basePrice: bestProvider.basePrice,
          responseTime: bestProvider.responseTime
        } : undefined
      };
    }
  } catch (err) {
    console.warn('Gemini structured extraction failed, using fallback:', err);
    return fallback;
  }
}

export async function generateSupportChatReply(message: string, history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>, user: any): Promise<string> {
  const activeBookings = db.bookings.filter(b => b.studentId === user.id && !['COMPLETED', 'CANCELLED'].includes(b.status));
  const activeOrders = db.foodOrders.filter(o => o.studentId === user.id && !['DELIVERED', 'CANCELLED'].includes(o.status));

  const contextData = `
User: ${user.name} (${user.role}), PG: ${user.pgName || 'Koramangala PG'}
Active Service Bookings: ${JSON.stringify(activeBookings.map(b => ({ code: b.bookingCode, title: b.serviceTitle, status: b.status, date: b.scheduledDate, time: b.scheduledTime, provider: b.providerName })))}
Active Food Orders: ${JSON.stringify(activeOrders.map(o => ({ code: o.orderCode, kitchen: o.kitchenName, status: o.status, items: o.items.map(i => `${i.name} x${i.quantity}`), eta: o.deliveryTimeSlot })))}
Platform Policies:
- Free cancellation available up to 30 minutes before scheduled service time.
- Food orders can be cancelled before the kitchen begins "PREPARING".
- Provider verification badges reflect the documents reviewed by PG Saathi operations; do not make additional safety or hygiene claims.
- In-app payment supports UPI and Razorpay, plus Cash on Service.
- For emergency water leakage or sparks, immediate dispatch is available via verified nearby providers.
`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Helpful grounded fallback
    const msg = message.toLowerCase();
    if (msg.includes('cancel')) {
      return `To cancel a booking or order: Go to your "Bookings" or "Orders" tab. If the status is still REQUESTED or SCHEDULED (for services) or PLACED (for food), tap the red "Cancel" button. Services cancelled at least 30 mins prior incur zero charge.`;
    }
    if (msg.includes('order') || msg.includes('food') || msg.includes('status')) {
      if (activeOrders.length > 0) {
        const ord = activeOrders[0];
        return `Your food order ${ord.orderCode} from ${ord.kitchenName} is currently: **${ord.status}**. Delivery slot: ${ord.deliveryTimeSlot}. You can view live updates in the Orders tab!`;
      }
      return `You don't have any active food orders right now. You can order fresh homemade meals from top homemakers like Sunita's Ghar Ka Khana anytime!`;
    }
    if (msg.includes('electrician') || msg.includes('plumber') || msg.includes('fan') || msg.includes('tap')) {
      return `I can help you book a verified technician right away. You can use our AI search bar on the home screen to find instant available specialists in your area with guaranteed response times within 15-20 minutes.`;
    }
    return `Hello ${user.name}! I'm PG Saathi's AI Assistant. I can help you find homemade meals, track your active orders, book reliable room repairs, or answer questions about payments and cancellation policies. How can I assist you right now?`;
  }

  try {
    const ai = new GoogleGenAI();
    const systemPrompt = `You are SaathiBot, the friendly, empathetic AI personal assistant for PG Saathi.
Students in PGs and hostels rely on you for homemade food, room repairs, cleaning, and urgent help.
Always answer concisely and accurately based ONLY on the provided verified context:
${contextData}

Rules:
- NEVER invent bookings or fake prices.
- If they ask about their active booking/order, cite the actual code and status from context.
- Be friendly, polite, and helpful like a caring elder sibling or local resident.`;

    const chatResponse = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }
        ]
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Chat timeout')), 3500))
    ]) as any;

    return chatResponse.text || "I'm here to help with your PG life! What do you need assistance with?";
  } catch (err) {
    console.warn('AI chat error, returning fallback:', err);
    return `I can help with your PG needs! Feel free to ask about your active bookings, food orders, or request a technician.`;
  }
}
