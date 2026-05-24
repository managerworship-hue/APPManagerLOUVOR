// frontend/src/services/pushNotifications.ts
// Web Push API para PWA (Android + iOS 16.4+)

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

    // Verificar se já tem subscrição
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        console.error('VAPID_PUBLIC_KEY não configurada');
        return false;
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Enviar subscrição ao backend
    const token = localStorage.getItem('auth_token') ||
      document.cookie.match(/token=([^;]+)/)?.[1] || '';

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
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  } catch (error) {
    console.error('Erro ao cancelar push:', error);
  }
}
