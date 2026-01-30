import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
interface WaitlistPhoneInputProps {
  source: string;
  onSuccess: (waitlistId: string) => void;
}
const COUNTRIES = [{
  code: "US",
  dial: "+1",
  flag: "🇺🇸",
  name: "United States"
}, {
  code: "CA",
  dial: "+1",
  flag: "🇨🇦",
  name: "Canada"
}, {
  code: "GB",
  dial: "+44",
  flag: "🇬🇧",
  name: "United Kingdom"
}, {
  code: "AU",
  dial: "+61",
  flag: "🇦🇺",
  name: "Australia"
}];

// Format phone for display (US format)
const formatPhoneDisplay = (value: string, countryCode: string): string => {
  const digits = value.replace(/\D/g, "");
  if (countryCode === "US" || countryCode === "CA") {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  return digits;
};

// Convert to E.164 format
const toE164 = (phone: string, dialCode: string): string => {
  const digits = phone.replace(/\D/g, "");
  return `${dialCode}${digits}`;
};

// Validate phone number
const isValidPhone = (phone: string, countryCode: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  if (countryCode === "US" || countryCode === "CA") {
    return digits.length === 10;
  }
  if (countryCode === "GB") {
    return digits.length >= 10 && digits.length <= 11;
  }
  if (countryCode === "AU") {
    return digits.length === 9 || digits.length === 10;
  }
  return digits.length >= 7;
};
const WaitlistPhoneInput = ({
  source,
  onSuccess
}: WaitlistPhoneInputProps) => {
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, "");

    // Limit to max digits for country
    const maxDigits = countryCode === "US" || countryCode === "CA" ? 10 : 11;
    if (digits.length <= maxDigits) {
      setPhone(formatPhoneDisplay(digits, countryCode));
      setError(null);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(phone, countryCode)) {
      setError("Please enter a valid phone number");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const e164Phone = toE164(phone, selectedCountry.dial);
      // Generate the ID client-side so we don't need to read the row back (no SELECT access required)
      const waitlistId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from("waitlist")
        .insert(
          {
            id: waitlistId,
            phone_number: e164Phone,
            country_code: countryCode,
            source,
          },
          // PostgREST supports Prefer: return=minimal; this prevents needing read access
          { returning: "minimal" } as any,
        );
      if (insertError) {
        // Check for unique constraint violation
        if (insertError.code === "23505") {
          setError("You're already on the list! 🎉");
        } else {
          setError("Something went wrong. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }
      onSuccess(waitlistId);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };
  return <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="sm:flex-row items-center justify-center flex flex-col gap-[8px] px-0 py-0">
        {/* Country + Phone Input */}
        <div className="flex-[1.5] min-w-[200px] flex rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all">
          {/* Country Selector */}
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-1 px-3 py-2.5 border-r border-white/10 hover:bg-white/5 transition-colors shrink-0">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm text-muted-foreground">{selectedCountry.dial}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              {COUNTRIES.map(country => <button key={country.code} type="button" onClick={() => {
              setCountryCode(country.code);
              setCountryOpen(false);
              setPhone("");
            }} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded hover:bg-white/10 transition-colors">
                  <span>{country.flag}</span>
                  <span className="flex-1 text-left">{country.name}</span>
                  <span className="text-muted-foreground">{country.dial}</span>
                </button>)}
            </PopoverContent>
          </Popover>

          {/* Phone Input */}
          <Input type="tel" value={phone} onChange={handlePhoneChange} placeholder="(555) 123-4567" className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base" disabled={isSubmitting} />
        </div>

        {/* Submit Button */}
        <Button type="submit" size="lg" disabled={isSubmitting || !phone} className="shadow-glow py-5 hover:scale-105 transition-transform whitespace-nowrap px-6">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Early Access"}
        </Button>
      </div>

      {/* Error Message */}
      {error && <p className={`mt-2 text-sm ${error.includes("already") ? "text-primary" : "text-destructive"}`}>
          {error}
        </p>}
    </form>;
};
export default WaitlistPhoneInput;