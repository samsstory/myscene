import { useState } from "react";
import WaitlistPhoneInput from "./WaitlistPhoneInput";
import WaitlistSuccess from "./WaitlistSuccess";

interface WaitlistSignupProps {
  source: "hero" | "cta";
}

const WaitlistSignup = ({ source }: WaitlistSignupProps) => {
  const [waitlistId, setWaitlistId] = useState<string | null>(null);

  if (waitlistId) {
    return <WaitlistSuccess waitlistId={waitlistId} />;
  }

  return (
    <WaitlistPhoneInput
      source={source}
      onSuccess={(id) => setWaitlistId(id)}
    />
  );
};

export default WaitlistSignup;
