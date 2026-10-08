import { db, ProviderProfile, HomemakerProfile } from './db';

export interface MatchResult<T> {
  item: T;
  type: 'service' | 'food';
  matchScore: number; // 0 - 100
  reasons: string[];
}

export function calculateProviderMatch(
  provider: ProviderProfile,
  criteria: {
    category?: string;
    studentArea?: string;
    maxBudget?: number;
    urgency?: 'low' | 'medium' | 'high' | 'immediate';
  }
): MatchResult<ProviderProfile> {
  const weights = db.matchingWeights;
  let score = 0;
  const reasons: string[] = [];

  // 1. Service relevance (30%)
  const catMatches = !criteria.category || 
    provider.categorySlug.toLowerCase() === criteria.category.toLowerCase() ||
    provider.skills.some(s => s.toLowerCase().includes((criteria.category || '').toLowerCase()));
  if (catMatches) {
    score += weights.serviceRelevance * 100;
    reasons.push(`Exact skill match for ${provider.categorySlug}`);
  } else {
    score += weights.serviceRelevance * 30;
  }

  // 2. Availability (20%)
  if (provider.isOnline) {
    score += weights.availability * 100;
    reasons.push('Available for booking today');
    if (provider.acceptInstantBookings) {
      reasons.push(`Fast response in ~${provider.responseTime}`);
    }
  } else {
    score += weights.availability * 40;
  }

  // 3. Rating (15%)
  const ratingScore = Math.min(100, (provider.rating / 5) * 100);
  score += weights.rating * ratingScore;
  if (provider.rating >= 4.8) {
    reasons.push(`Top-rated (${provider.rating}★ from ${provider.reviewsCount} reviews)`);
  }

  // 4. Distance / Service area (15%)
  const areaMatches = !criteria.studentArea || 
    provider.serviceArea.toLowerCase().includes(criteria.studentArea.toLowerCase());
  if (areaMatches) {
    score += weights.distance * 100;
    reasons.push(`Directly serves ${criteria.studentArea || 'your area'}`);
  } else {
    score += weights.distance * 50;
  }

  // 5. Price (10%)
  if (criteria.maxBudget) {
    if (provider.basePrice <= criteria.maxBudget) {
      score += weights.price * 100;
      reasons.push(`Well within budget at ₹${provider.basePrice}`);
    } else {
      score += weights.price * 30;
    }
  } else {
    score += weights.price * 90;
  }

  // 6. Reliability & Verification (10%)
  if (provider.verifiedStatus === 'VERIFIED') {
    score += weights.reliability * 100;
    reasons.push(`Verified provider with ${provider.completedJobs}+ completed PG jobs`);
  } else {
    score += weights.reliability * 50;
  }

  return {
    item: provider,
    type: 'service',
    matchScore: Math.round(score),
    reasons
  };
}

export function calculateHomemakerMatch(
  homemaker: HomemakerProfile,
  criteria: {
    meal?: 'breakfast' | 'lunch' | 'dinner';
    diet?: 'vegetarian' | 'non-vegetarian';
    studentArea?: string;
    maxBudget?: number;
    recurring?: boolean;
  }
): MatchResult<HomemakerProfile> {
  const weights = db.matchingWeights;
  let score = 0;
  const reasons: string[] = [];

  // 1. Dietary match & meal (30%)
  const isDietMatch = !criteria.diet || 
    (criteria.diet === 'vegetarian' && homemaker.isVegOnly) ||
    criteria.diet === 'non-vegetarian' ||
    homemaker.menu.some(m => criteria.diet === 'vegetarian' ? m.isVeg : !m.isVeg);

  if (isDietMatch) {
    score += weights.serviceRelevance * 100;
    if (criteria.diet === 'vegetarian') reasons.push('100% pure vegetarian home kitchen');
  } else {
    score += weights.serviceRelevance * 20;
  }

  // 2. Availability & Capacity (20%)
  const capacityLeft = homemaker.dailyCapacity - homemaker.currentCapacityUsed;
  if (capacityLeft > 5) {
    score += weights.availability * 100;
    reasons.push(`Accepting orders today (${capacityLeft} slots remaining)`);
  } else if (capacityLeft > 0) {
    score += weights.availability * 60;
    reasons.push(`Limited capacity remaining (${capacityLeft} slots)`);
  } else {
    score += weights.availability * 20;
  }

  // 3. Rating (15%)
  score += weights.rating * ((homemaker.rating / 5) * 100);
  if (homemaker.rating >= 4.8) {
    reasons.push(`Highly praised (${homemaker.rating}★ from ${homemaker.reviewsCount} student reviews)`);
  }

  // 4. Distance / Area (15%)
  const areaMatches = !criteria.studentArea || 
    homemaker.serviceArea.toLowerCase().includes(criteria.studentArea.toLowerCase());
  if (areaMatches) {
    score += weights.distance * 100;
    reasons.push(`Doorstep delivery to ${criteria.studentArea || 'your PG'}`);
  } else {
    score += weights.distance * 60;
  }

  // 5. Price (10%)
  const lowestMealPrice = Math.min(...homemaker.menu.map(m => m.price));
  if (criteria.maxBudget) {
    if (lowestMealPrice <= criteria.maxBudget) {
      score += weights.price * 100;
      reasons.push(`Meals starting from ₹${lowestMealPrice} (under your ₹${criteria.maxBudget} budget)`);
    } else {
      score += weights.price * 40;
    }
  } else {
    score += weights.price * 85;
  }

  // 6. Reliability & Packages (10%)
  if (criteria.recurring && homemaker.packages.length > 0) {
    score += weights.reliability * 100;
    reasons.push(`Offers discounted 7-day & monthly meal subscriptions`);
  } else if (homemaker.verifiedStatus === 'VERIFIED') {
    score += weights.reliability * 90;
    reasons.push(`FSSAI certified home hygiene kitchen (${homemaker.completedOrders}+ orders delivered)`);
  } else {
    score += weights.reliability * 60;
  }

  return {
    item: homemaker,
    type: 'food',
    matchScore: Math.round(score),
    reasons
  };
}
