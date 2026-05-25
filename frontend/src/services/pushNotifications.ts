// frontend/src/services/pushNotifications.ts
// Web Push API para PWA (Android + iOS 16.4+)
import { getToken } from '@/src/api/client';
import { storage } from '@/src/utils/storage';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY || '';
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export async function registerPushSubscription(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push não suportado neste browser');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permissão de notificação negada');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;

    // 1. Obter VAPID key
    let vapidKey = VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      try {
        const res = await fetch(`${API_URL}/api/push/vapid-public-key`);
        if (res.ok) {
          const data = await res.json();
          vapidKey = data.public_key;
        }
      } catch (e) {
        console.error('Erro ao obter VAPID Key do backend:', e);
      }
    }

    if (!vapidKey) {
      console.error('VAPID_PUBLIC_KEY não configurada no frontend e não retornada pelo backend');
      return false;
    }

    // 2. Verificar se já tem subscrição
    let subscription = await registration.pushManager.getSubscription();

    // 3. Forçar recriação se a VAPID key gravada for diferente da atual
    const SAVED_VAPID_KEY_KEY = 'saved_vapid_key';
    const savedVapidKey = await storage.getItem<string>(SAVED_VAPID_KEY_KEY, '');

    if (subscription && savedVapidKey !== vapidKey) {
      console.log('🔄 VAPID key mudou ou é nova. A recriar subscrição...');
      await subscription.unsubscribe();
      subscription = null;
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      });
      // Guardar a nova VAPID key localmente
      await storage.setItem(SAVED_VAPID_KEY_KEY, vapidKey);
    }

    // Enviar subscrição ao backend
    const token = await getToken() || '';

    await fetch(`${API_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(subscription.toJSON()),
    });

    console.log('✅ Push subscription registada');
    return true;
  } catch (error) {
    console.error('Erro ao registar push:', error);
    return false;
  }
}

export async function unregisterPushSubscription(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }
  } catch (error) {
    console.error('Erro ao cancelar push:', error);
  }
}
