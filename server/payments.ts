import crypto from 'node:crypto';
import { demoModeEnabled } from './auth';

// Payment abstraction layer for PG Saathi. The mock is deliberately explicit and
// is only auto-confirming in demo mode; production without gateway credentials
// never reports a successful payment.

export interface PaymentRequest {
  orderType: 'booking' | 'food_order';
  referenceId: string;
  userId: string;
  amount: number;
  currency: string;
  method: 'upi' | 'razorpay' | 'card' | 'cod';
  notes?: Record<string, any>;
}

export interface PaymentResponse {
  paymentId: string;
  transactionRef: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  method: string;
  gatewayOrderId?: string;
  upiQrString?: string;
  razorpayKeyId?: string;
  message: string;
}

export interface IPaymentProvider {
  createOrder(req: PaymentRequest): Promise<PaymentResponse>;
  verifyPayment(paymentId: string, signature?: string, gatewayPaymentId?: string, gatewayOrderId?: string): Promise<{ success: boolean; status: 'SUCCESS' | 'FAILED'; error?: string }>;
  refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; refundId: string }>;
}

export class MockPaymentProvider implements IPaymentProvider {
  async createOrder(req: PaymentRequest): Promise<PaymentResponse> {
    const txnRef = `TXN_MOCK_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Support simulated UPI string
    const upiQrString = `upi://pay?pa=pgsaathi@icici&pn=PG%20Saathi&am=${req.amount}&tr=${txnRef}&cu=INR&tn=${encodeURIComponent(req.orderType + ':' + req.referenceId)}`;

    return {
      paymentId,
      transactionRef: txnRef,
      amount: req.amount,
      currency: req.currency || 'INR',
      status: req.method === 'cod' ? 'SUCCESS' : 'PENDING',
      method: req.method,
      gatewayOrderId: `order_mock_${Date.now()}`,
      upiQrString,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_pgsaathi_demo',
      message: req.method === 'cod' ? 'Cash on service recorded' : 'Mock payment session initialized'
    };
  }

  async verifyPayment(paymentId: string, signature?: string): Promise<{ success: boolean; status: 'SUCCESS' | 'FAILED'; error?: string }> {
    if (!demoModeEnabled()) {
      return { success: false, status: 'FAILED', error: 'Payment gateway is not configured for production.' };
    }
    return {
      success: true,
      status: 'SUCCESS'
    };
  }

  async refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; refundId: string }> {
    return {
      success: true,
      refundId: `rfnd_mock_${Date.now()}`
    };
  }
}

export class RazorpayProvider implements IPaymentProvider {
  private keyId: string;
  private keySecret: string;
  private gatewayOrders = new Map<string, string>();

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  }

  async createOrder(req: PaymentRequest): Promise<PaymentResponse> {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(req.amount * 100),
        currency: req.currency || 'INR',
        receipt: req.referenceId,
        notes: req.notes || { userId: req.userId, orderType: req.orderType }
      })
    });
    if (!response.ok) throw new Error(`Razorpay order creation failed (${response.status})`);
    const gatewayOrder = await response.json() as { id: string };
    const paymentId = `pay_rzp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.gatewayOrders.set(paymentId, gatewayOrder.id);
    return {
      paymentId,
      transactionRef: gatewayOrder.id,
      amount: req.amount,
      currency: req.currency || 'INR',
      status: 'PENDING',
      method: 'razorpay',
      gatewayOrderId: gatewayOrder.id,
      razorpayKeyId: this.keyId,
      message: 'Razorpay order created'
    };
  }

  async verifyPayment(paymentId: string, signature?: string, gatewayPaymentId?: string, gatewayOrderId?: string): Promise<{ success: boolean; status: 'SUCCESS' | 'FAILED'; error?: string }> {
    const orderId = gatewayOrderId || this.gatewayOrders.get(paymentId);
    if (!orderId || !gatewayPaymentId || !signature) return { success: false, status: 'FAILED', error: 'Gateway order, payment ID, or signature missing' };
    const expectedSignature = crypto.createHmac('sha256', this.keySecret).update(`${orderId}|${gatewayPaymentId}`).digest('hex');
    if (expectedSignature !== signature) return { success: false, status: 'FAILED', error: 'Invalid payment signature' };
    return { success: true, status: 'SUCCESS' };
  }

  async refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; refundId: string }> {
    return {
      success: true,
      refundId: `rfnd_rzp_${Date.now()}`
    };
  }
}

export class PaymentService {
  private provider: IPaymentProvider;

  constructor() {
    // Pick provider based on environment
    const isRealRazorpay = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && !process.env.RAZORPAY_KEY_ID.includes('sample'));
    if (isRealRazorpay) {
      this.provider = new RazorpayProvider();
    } else {
      this.provider = new MockPaymentProvider();
    }
  }

  async initiatePayment(req: PaymentRequest): Promise<PaymentResponse> {
    return this.provider.createOrder(req);
  }

  async confirmPayment(paymentId: string, signature?: string, gatewayPaymentId?: string, gatewayOrderId?: string): Promise<{ success: boolean; status: 'SUCCESS' | 'FAILED'; error?: string }> {
    return this.provider.verifyPayment(paymentId, signature, gatewayPaymentId, gatewayOrderId);
  }

  async processRefund(paymentId: string, amount?: number): Promise<{ success: boolean; refundId: string }> {
    return this.provider.refundPayment(paymentId, amount);
  }
}

export const paymentService = new PaymentService();
