'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Users } from 'lucide-react';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { ArcadeCard } from '@/components/themed/ArcadeCard';
import { api } from '@/lib/api';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/forever',
    icon: <Zap size={24} />,
    credits: 10,
    features: [
      '10 scores / month',
      'Single text scoring',
      'Score breakdown',
      'Community leaderboard',
    ],
    cta: 'Get Started',
    variant: 'secondary' as const,
    popular: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/month',
    icon: <Crown size={24} />,
    credits: 200,
    features: [
      '200 scores / month',
      'Single text scoring',
      'Twitter account analysis',
      'Score breakdown + insights',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    variant: 'primary' as const,
    popular: true,
  },
  {
    key: 'team',
    name: 'Team',
    price: '$99',
    period: '/month',
    icon: <Users size={24} />,
    credits: 1000,
    features: [
      '1,000 scores / month',
      'Everything in Pro',
      'API access',
      'Bulk scoring',
      'Dedicated support',
    ],
    cta: 'Upgrade to Team',
    variant: 'secondary' as const,
    popular: false,
  },
];

const CREDIT_PACKS = [
  { key: '50', credits: 50, price: '$9' },
  { key: '200', credits: 200, price: '$29' },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: string) => {
    setLoading(plan);
    try {
      const res = await api.post<{ checkout_url: string }>('/payments/user-checkout/', { plan });
      window.location.href = res.checkout_url;
    } catch {
      setLoading(null);
    }
  };

  const handleCreditPack = async (pack: string) => {
    setLoading(`pack-${pack}`);
    try {
      const res = await api.post<{ checkout_url: string }>('/payments/user-checkout/', { credit_pack: pack });
      window.location.href = res.checkout_url;
    } catch {
      setLoading(null);
    }
  };

  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="font-display text-3xl sm:text-4xl text-primary mb-4">Pricing</h1>
          <p className="font-body text-lg text-muted-foreground max-w-xl mx-auto">
            Score contributions with AI-powered precision. Start free, scale when you&apos;re ready.
          </p>
        </motion.div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <ArcadeCard
                glow={plan.popular}
                className={`h-full flex flex-col ${plan.popular ? 'border-primary ring-1 ring-primary/20' : ''}`}
              >
                {plan.popular && (
                  <span className="inline-block text-[10px] font-display text-primary-foreground bg-primary px-3 py-1 rounded-full mb-4 w-fit">
                    MOST POPULAR
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2 text-primary">
                  {plan.icon}
                  <h2 className="font-heading text-xl font-bold">{plan.name}</h2>
                </div>
                <div className="mb-6">
                  <span className="font-heading text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.credits} scores per month
                </p>
                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check size={16} className="text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.key === 'free' ? (
                  <ArcadeButton
                    variant={plan.variant}
                    className="w-full"
                    onClick={() => (window.location.href = '/login')}
                  >
                    {plan.cta}
                  </ArcadeButton>
                ) : (
                  <ArcadeButton
                    variant={plan.variant}
                    className="w-full"
                    loading={loading === plan.key}
                    onClick={() => handleCheckout(plan.key)}
                  >
                    {plan.cta}
                  </ArcadeButton>
                )}
              </ArcadeCard>
            </motion.div>
          ))}
        </div>

        {/* Credit packs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <h2 className="font-heading text-2xl font-bold mb-2">Need more credits?</h2>
          <p className="text-muted-foreground mb-8 text-sm">
            Buy extra credit packs anytime. They never expire.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {CREDIT_PACKS.map((pack) => (
              <ArcadeCard key={pack.key} className="sm:w-56 text-center">
                <p className="font-heading text-lg font-bold text-foreground mb-1">
                  {pack.credits} credits
                </p>
                <p className="text-2xl font-bold text-primary mb-4">{pack.price}</p>
                <ArcadeButton
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  loading={loading === `pack-${pack.key}`}
                  onClick={() => handleCreditPack(pack.key)}
                >
                  Buy Pack
                </ArcadeButton>
              </ArcadeCard>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
