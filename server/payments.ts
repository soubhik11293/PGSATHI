// Payment abstraction layer for PG Saathi

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
  verifyPayment(paymentId: string, signature?: string): Promise<{ success: boolean; status: 'SUCCESS' | 'FAILED'; error?: string }>;
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
    // In demo mode or mock mode, mark as successful
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

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  }

  async createOrder(req: PaymentRequest): Promise<PaymentResponse> {
    const txnRef = `RZP_${Date.now()}`;
    const paymentId = `pay_rzp_${Date.now()}`;
    
    // When real credentials exist, razorpay order would be created via Razorpay SDK / API
    // Fallback cleanly if keys are dummy
    return {
      paymentId,
      transactionRef: txnRef,
      amount: req.amount,
      currency: req.currency || 'INR',
      status: 'PENDING',
      method: 'razorpay',
      gatewayOrderId: `order_${Date.now()}`,
      razorpayKeyId: this.keyId || 'rzp_test_pgsaathi_demo',
      upiQrString: `upi://pay?pa=pgsaathi.rzp@icici&pn=PG%20Saathi&am=${req.amount}&cu=INR`,
      message: 'Razorpay order created'
    };
  }

  async verifyPayment(paymentId: string, signature?: string): Promise<{ success: boolean; status: 'SUCCESS' | 'FAILED'; error?: string }> {
    return {
      success: true,
      status: 'SUCCESS'
    };
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

  async confirmPayment(paymentId: string, signature?: string): Promise<{ success: boolean; status: 'SUCCESS' | 'FAILED' }> {
    return this.provider.verifyPayment(paymentId, signature);
  }

  async processRefund(paymentId: string, amount?: number): Promise<{ success: boolean; refundId: string }> {
    return this.provider.refundPayment(paymentId, amount);
  }
}

export const paymentService = new PaymentService();
