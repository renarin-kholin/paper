"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Wallet } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
    };
  }, []);

  const handleConnectWallet = () => {
    setIsConnecting(true);
    // Simulate BitGo wallet connection
    connectTimeoutRef.current = setTimeout(() => {
      setIsConnecting(false);
      setStep(2);
      // In a real app, we'd create a new user or update the existing one with the wallet address
      // For this mock, we'll just assume the current user is now connected
    }, 2000);
  };

  const handleComplete = () => {
    router.push("/dashboard");
  };

  return (
    <div className="max-w-md mx-auto py-16 sm:py-24 page-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif font-bold text-stone-900 mb-4">Become a Creator</h1>
        <p className="text-stone-500 text-lg">Monetize your writing directly with decentralized ad spaces.</p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-2" aria-label="Signup progress">
        <span className={`h-1.5 w-10 rounded-full ${step >= 1 ? "bg-stone-900" : "bg-stone-200"}`}></span>
        <span className={`h-1.5 w-10 rounded-full ${step >= 2 ? "bg-emerald-600" : "bg-stone-200"}`}></span>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden">
        {step === 1 ? (
          <div className="space-y-8">
            <div className="flex items-center justify-center w-16 h-16 bg-stone-100 rounded-full mx-auto mb-6">
              <Wallet className="w-8 h-8 text-stone-900" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-stone-900 mb-2 font-serif">Connect your wallet</h2>
              <p className="text-stone-500 mb-8">
                We use BitGo to securely manage your earnings. Connect your wallet to start receiving payments for your
                ad spaces.
              </p>
            </div>
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="w-full bg-stone-900 text-white py-4 rounded-xl font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              type="button"
            >
              {isConnecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting to BitGo...
                </>
              ) : (
                <>
                  Connect BitGo Wallet
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-xs text-center text-stone-400 mt-4">
              By connecting, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        ) : (
          <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-900 mb-2 font-serif">You&apos;re all set!</h2>
              <p className="text-stone-500 mb-8">
                Your wallet is connected. You can now start writing and monetizing your content.
              </p>
            </div>
            <button
              onClick={handleComplete}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              type="button"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
