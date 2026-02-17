/// <reference lib="webworker" />
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VAPID_PUBLIC_KEY } from '@/lib/push-constants';

// Extend ServiceWorkerRegistration to include pushManager
declare global {
  interface ServiceWorkerRegistration {
    pushManager: PushManager;
  }
  interface PushManager {
    getSubscription(): Promise<PushSubscription | null>;
    subscribe(options: PushSubscriptionOptionsInit): Promise<PushSubscription>;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushState = 'unsupported' | 'denied' | 'prompt' | 'subscribed' | 'unsubscribed' | 'loading';

export function usePushSubscription() {
  const [state, setState] = useState<PushState>('loading');

  const checkState = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }

    const permission = Notification.permission;
    if (permission === 'denied') {
      setState('denied');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setState(sub ? 'subscribed' : 'unsubscribed');
    } catch {
      setState('unsubscribed');
    }
  }, []);

  useEffect(() => {
    checkState();
  }, [checkState]);

  const subscribe = useCallback(async () => {
    try {
      setState('loading');
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
      });

      const subJson = subscription.toJSON();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upsert subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        }, { onConflict: 'user_id,endpoint' });

      if (error) throw error;
      setState('subscribed');
    } catch (err) {
      console.error('Push subscribe failed:', err);
      await checkState();
    }
  }, [checkState]);

  const unsubscribe = useCallback(async () => {
    try {
      setState('loading');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', endpoint);
        }
      }

      setState('unsubscribed');
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
      await checkState();
    }
  }, [checkState]);

  return { state, subscribe, unsubscribe };
}
