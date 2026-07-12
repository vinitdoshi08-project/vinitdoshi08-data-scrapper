/**
 * Razorpay Standard Checkout — KEY_SECRET never touches the frontend.
 *
 * Full flow:
 *  1. POST /api/create-order   → get order_id from backend
 *  2. Open Razorpay modal      → user pays
 *  3. POST /api/verify-payment → backend verifies HMAC signature
 *  4. POST /api/save-subscription → backend writes plan to Supabase
 */

const API_URL   = import.meta.env.VITE_API_URL as string;
const RZP_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

export interface PlanConfig {
  id: 'basic' | 'standard';
  name: string;
  amountPaise: number; // e.g. 600 = ₹6, 1000 = ₹10
  currency?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  plan?: string;
  message?: string;
}

/** Dynamically load Razorpay checkout.js — idempotent. */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).Razorpay !== 'undefined') { resolve(); return; }
    const s = document.createElement('script');
    s.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async   = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay script. Check your internet connection.'));
    document.body.appendChild(s);
  });
}

/**
 * Initiate a Razorpay Standard Checkout payment.
 *
 * @param plan      - Plan config (id, name, amountPaise)
 * @param token     - Supabase access_token for the current session
 * @param userEmail - Pre-fill Razorpay modal
 * @param userName  - Pre-fill Razorpay modal
 */
export async function initiatePayment(
  plan: PlanConfig,
  token: string,
  userEmail?: string,
  userName?: string,
): Promise<PaymentResult> {
  if (!RZP_KEY_ID) {
    return { success: false, message: 'Razorpay is not configured. Please contact support.' };
  }

  try {
    await loadRazorpayScript();
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }

  // ── Step 1: Create order on backend ────────────────────────
  let order_id: string;
  let amount: number;
  let currency: string;

  try {
    const orderRes = await fetch(`${API_URL}/api/create-order`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        amount:   plan.amountPaise,
        currency: plan.currency ?? 'INR',
        receipt:  `rcpt_${plan.id}_${Date.now()}`,
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json().catch(() => ({}));
      return { success: false, message: err.detail ?? 'Could not create payment order. Try again.' };
    }

    const orderData = await orderRes.json();
    order_id = orderData.order_id;
    amount   = orderData.amount;
    currency = orderData.currency;
  } catch {
    return { success: false, message: 'Network error while creating order. Check your connection.' };
  }

  // ── Steps 2-4: Open modal, then verify + save ───────────────
  return new Promise((resolve) => {
    const options = {
      key:         RZP_KEY_ID,
      amount,
      currency,
      name:        'Scrapify',
      description: `${plan.name} Plan`,
      image:       '/scrapify.png',
      order_id,
      prefill: {
        email: userEmail ?? '',
        name:  userName  ?? '',
      },
      theme: { color: '#5B4FE8' },
      notes: { plan: plan.id },

      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id:   string;
        razorpay_signature:  string;
      }) => {
        try {
          // ── Step 3: Verify HMAC signature on backend ──────────
          const vRes = await fetch(`${API_URL}/api/verify-payment`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            }),
          });

          if (!vRes.ok) {
            const err = await vRes.json().catch(() => ({}));
            return resolve({
              success: false,
              message: err.detail ?? 'Payment verification failed. Contact support with your payment ID.',
            });
          }

          // ── Step 4: Save subscription on backend ──────────────
          const sRes = await fetch(`${API_URL}/api/save-subscription`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              token,
              plan:                plan.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              amount:              plan.amountPaise,
              currency:            plan.currency ?? 'INR',
            }),
          });

          if (!sRes.ok) {
            const err = await sRes.json().catch(() => ({}));
            return resolve({
              success: false,
              message: err.detail ?? 'Payment received but plan activation failed. Contact support.',
            });
          }

          resolve({
            success:   true,
            paymentId: response.razorpay_payment_id,
            plan:      plan.id,
          });
        } catch {
          resolve({ success: false, message: 'Network error during payment processing. Contact support.' });
        }
      },

      modal: {
        ondismiss: () => resolve({ success: false, message: 'Payment cancelled.' }),
      },
    };

    const rzp = new (window as any).Razorpay(options);

    rzp.on('payment.failed', (resp: { error: { description: string; reason?: string } }) => {
      resolve({
        success: false,
        message: resp.error?.description
          ?? resp.error?.reason
          ?? 'Payment failed. Please try a different payment method.',
      });
    });

    rzp.open();
  });
}
