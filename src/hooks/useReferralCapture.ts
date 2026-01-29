import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const REFERRAL_STORAGE_KEY = "scene_referral_code";

/**
 * Captures referral code from URL query params and stores it in localStorage.
 * Should be called on landing pages before user signs up.
 */
export const useReferralCapture = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      // Store the referral code for later use during signup
      localStorage.setItem(REFERRAL_STORAGE_KEY, refCode);
    }
  }, [searchParams]);
};

/**
 * Gets the stored referral code from localStorage.
 */
export const getStoredReferralCode = (): string | null => {
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
};

/**
 * Clears the stored referral code after successful signup.
 */
export const clearStoredReferralCode = () => {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
};
