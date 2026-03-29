/**
 * Paddle.js integration for CrowByte
 * Handles checkout, subscriptions, and pricing
 */
import { initializePaddle, type Paddle, type CheckoutOpenOptions } from '@paddle/paddle-js';

let paddleInstance: Paddle | null = null;

// Client-side token from Paddle Dashboard → Developer Tools → Authentication
// TODO: Move to env var once confirmed
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || 'live_REPLACE_WITH_CLIENT_TOKEN';
const PADDLE_ENV = (import.meta.env.VITE_PADDLE_ENV || 'production') as 'production' | 'sandbox';

// Paddle Price IDs — create these in Paddle Dashboard → Catalog → Prices
// Each maps to a CrowByte tier + billing interval
export const PADDLE_PRICES = {
  pro_monthly:        import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY || '',
  pro_annual:         import.meta.env.VITE_PADDLE_PRICE_PRO_ANNUAL || '',
  team_monthly:       import.meta.env.VITE_PADDLE_PRICE_TEAM_MONTHLY || '',
  team_annual:        import.meta.env.VITE_PADDLE_PRICE_TEAM_ANNUAL || '',
  enterprise_monthly: import.meta.env.VITE_PADDLE_PRICE_ENTERPRISE_MONTHLY || '',
  enterprise_annual:  import.meta.env.VITE_PADDLE_PRICE_ENTERPRISE_ANNUAL || '',
} as const;

export type PaddleTier = 'pro' | 'team' | 'enterprise';
export type BillingInterval = 'monthly' | 'annual';

/**
 * Initialize Paddle.js — call once on app load
 */
export async function getPaddle(): Promise<Paddle | null> {
  if (paddleInstance) return paddleInstance;

  try {
    paddleInstance = await initializePaddle({
      environment: PADDLE_ENV,
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (event) => {
        switch (event.name) {
          case 'checkout.completed':
            console.log('[+] Paddle checkout completed:', event.data);
            // Webhook handles tier upgrade — this is just for UI feedback
            window.dispatchEvent(new CustomEvent('paddle:checkout-complete', { detail: event.data }));
            break;
          case 'checkout.closed':
            console.log('[i] Paddle checkout closed');
            break;
          case 'checkout.error':
            console.error('[-] Paddle checkout error:', event.data);
            break;
        }
      },
    });
    console.log('[+] Paddle initialized:', PADDLE_ENV);
    return paddleInstance;
  } catch (err) {
    console.error('[-] Paddle init failed:', err);
    return null;
  }
}

/**
 * Open Paddle checkout for a specific tier
 */
export async function openCheckout(opts: {
  tier: PaddleTier;
  interval: BillingInterval;
  email?: string;
  userId?: string;
}) {
  const paddle = await getPaddle();
  if (!paddle) {
    console.error('[-] Paddle not initialized');
    return;
  }

  const priceKey = `${opts.tier}_${opts.interval}` as keyof typeof PADDLE_PRICES;
  const priceId = PADDLE_PRICES[priceKey];

  if (!priceId) {
    console.error(`[-] No Paddle price ID for ${priceKey}. Set VITE_PADDLE_PRICE_${priceKey.toUpperCase()} in .env`);
    return;
  }

  const checkoutOpts: CheckoutOpenOptions = {
    items: [{ priceId, quantity: 1 }],
    settings: {
      displayMode: 'overlay',
      theme: 'dark',
      locale: 'en',
      successUrl: `${window.location.origin}/#/settings?checkout=success`,
    },
  };

  // Pre-fill email if user is logged in
  if (opts.email) {
    checkoutOpts.customer = { email: opts.email };
  }

  // Pass user ID as custom data for webhook → Supabase tier update
  if (opts.userId) {
    checkoutOpts.customData = {
      supabase_user_id: opts.userId,
      tier: opts.tier,
    };
  }

  paddle.Checkout.open(checkoutOpts);
}

/**
 * Get price preview for display (handles currency localization)
 */
export async function getPricePreview(priceIds: string[]) {
  const paddle = await getPaddle();
  if (!paddle) return null;

  try {
    const preview = await paddle.PricePreview({
      items: priceIds.map(id => ({ priceId: id, quantity: 1 })),
    });
    return preview;
  } catch (err) {
    console.error('[-] Price preview failed:', err);
    return null;
  }
}
