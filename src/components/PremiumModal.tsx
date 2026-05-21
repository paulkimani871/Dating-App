import React, { useState } from 'react';
import { X, Sparkles, ShieldCheck, CreditCard, Wallet, Smartphone, Loader2 } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

interface PremiumModalProps {
  onClose: () => void;
  onUpgrade: (planId: string, gateway: string, amount: number) => void;
}

export default function PremiumModal({ onClose, onUpgrade }: PremiumModalProps) {
  const plans: Plan[] = [
    {
      id: 'silver',
      name: 'Silver Match',
      price: 9.99,
      features: ['50 swipes daily', 'Advanced compatibility math (+15%)', 'Send photos and audio', '1 profile spotlight weekly']
    },
    {
      id: 'gold',
      name: 'Gold Premium',
      price: 19.99,
      features: ['Unlimited swipes', 'Dynamic age + location boost', 'Voice/video call access', '5 profile spotlights weekly', 'Profile verification badge']
    },
    {
      id: 'platinum',
      name: 'Platinum VIP',
      price: 39.99,
      features: ['All Gold Features', 'See who liked you immediately', 'Priority matching queues', 'Dedicated AI compatibility agent', 'No ads']
    }
  ];

  const [step, setStep] = useState<'plans' | 'checkout' | 'success'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [gateway, setGateway] = useState<'stripe' | 'paypal' | 'mpesa'>('stripe');
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep('checkout');
  };

  const handlePay = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (selectedPlan) {
        onUpgrade(selectedPlan.id, gateway, selectedPlan.price);
        setStep('success');
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="w-[680px] max-w-full rounded-3xl glass-card border border-slate-800/80 overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all hover:scale-105 z-30"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-pink-950/40 border-b border-slate-850 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">Dream Match Premium VIP</h2>
            <p className="text-xs text-slate-400">Unlock compatible dating upgrades instantly.</p>
          </div>
        </div>

        {/* Modal Body / Scroll Content */}
        <div className="p-8 overflow-y-auto flex-1">
          {/* STEP 1: PLANS SELECT */}
          {step === 'plans' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPlan(p)}
                    className="p-5 rounded-2xl bg-slate-900/60 hover:bg-indigo-950/20 border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:scale-[1.02]"
                  >
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-gradient">{p.name}</h3>
                      <div className="mt-2 flex items-baseline">
                        <span className="text-2xl font-black text-white">${p.price}</span>
                        <span className="text-[10px] text-slate-400 ml-1">/mo</span>
                      </div>
                      <ul className="mt-4 space-y-2 text-[10px] text-slate-400">
                        {p.features.slice(0, 3).map((f) => (
                          <li key={f} className="flex items-start gap-1">
                            <span className="text-indigo-400 shrink-0">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button className="w-full mt-6 py-2 rounded-xl bg-slate-850 hover:bg-gradient-brand hover:text-white text-slate-300 text-xs font-semibold border border-slate-850 transition-all">
                      Select Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: CHECKOUT PIECE */}
          {step === 'checkout' && selectedPlan && (
            <div className="space-y-6">
              {/* Order summary panel */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400">Selected Membership</h4>
                  <span className="text-sm font-bold text-white">{selectedPlan.name} Tier</span>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-semibold text-slate-400">Monthly Price</h4>
                  <span className="text-sm font-extrabold text-gradient">${selectedPlan.price}</span>
                </div>
              </div>

              {/* Gateway selector row */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase text-slate-400 font-bold tracking-wider">Choose Payment Method</h4>
                <div className="grid grid-cols-3 gap-3">
                  {/* Stripe Credit Card */}
                  <button
                    onClick={() => setGateway('stripe')}
                    className={`py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      gateway === 'stripe'
                        ? 'bg-indigo-950/30 border-indigo-500 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">Stripe / Cards</span>
                  </button>

                  {/* PayPal */}
                  <button
                    onClick={() => setGateway('paypal')}
                    className={`py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      gateway === 'paypal'
                        ? 'bg-indigo-950/30 border-indigo-500 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">PayPal Wallet</span>
                  </button>

                  {/* M-Pesa */}
                  <button
                    onClick={() => setGateway('mpesa')}
                    className={`py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      gateway === 'mpesa'
                        ? 'bg-indigo-950/30 border-indigo-500 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">M-Pesa Mobile</span>
                  </button>
                </div>
              </div>

              {/* Input details based on gateway */}
              <div className="space-y-4 pt-2">
                {gateway === 'stripe' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Card Number</label>
                      <input
                        type="text"
                        placeholder="4242 •••• •••• 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">Expiry Date</label>
                        <input type="text" placeholder="MM/YY" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">CVV Code</label>
                        <input type="password" placeholder="•••" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                  </div>
                )}

                {gateway === 'paypal' && (
                  <div className="p-6 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                    <p className="text-xs text-slate-400">
                      You will be redirected to PayPal's one-click modal overlay to complete your invoice billing securely.
                    </p>
                  </div>
                )}

                {gateway === 'mpesa' && (
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1.5">M-Pesa Mobile Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +254 700 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      A secure STK Push pop-up will trigger on your mobile handset immediately to complete PIN entry.
                    </p>
                  </div>
                )}
              </div>

              {/* Pay Button Action */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => setStep('plans')}
                  disabled={isLoading}
                  className="px-6 py-3 rounded-xl bg-transparent border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handlePay}
                  disabled={isLoading || (gateway === 'stripe' && !cardNumber) || (gateway === 'mpesa' && !phone)}
                  className="flex-1 py-3 rounded-xl bg-gradient-brand text-white text-xs font-bold shadow-lg hover:shadow-[0_8px_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Securing Transaction...</span>
                    </>
                  ) : (
                    <span>Purchase Subscription</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONGRATULATIONS SUCCESS */}
          {step === 'success' && selectedPlan && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-green-950 border border-green-800 text-green-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,197,94,0.2)] animate-bounce">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">Payment Received! 🎉</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your billing has been verified successfully. Your {selectedPlan.name} features are now unlocked.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 inline-block font-semibold text-xs text-gradient">
                ✨ PREMIUM MEMBER ACTIVE
              </div>

              <div>
                <button
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl bg-gradient-brand text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
