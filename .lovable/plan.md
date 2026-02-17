

# Step 1: Generate VAPID Keys and Store as Secrets

This is the foundation step -- without VAPID keys, nothing else works.

## What happens

1. Generate a VAPID key pair (public key + private key) using a small edge function
2. Store the private key as a backend secret (`VAPID_PRIVATE_KEY`)
3. Store the subject identifier as a backend secret (`VAPID_SUBJECT` -- your email, e.g. `mailto:hello@myscene.app`)
4. Hard-code the public key in the frontend (this is safe -- it's meant to be public)

## What you'll need to do

- Provide an email address to use as the VAPID subject (e.g. `mailto:you@myscene.app`)
- Enter the generated private key when prompted

## Technical details

- Create a temporary edge function `generate-vapid-keys` that generates the key pair and returns both keys
- Call it once to get the keys
- Save `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` as backend secrets
- Create a constants file `src/lib/push-constants.ts` with the public key
- Delete the temporary edge function after use

