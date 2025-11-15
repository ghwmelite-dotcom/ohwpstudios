// Consolidated initialization scripts for OhWP Studios
// This file consolidates all inline scripts for better performance

// ============================================
// THEME TOGGLE
// ============================================
function initTheme() {
  const themeToggle = document.querySelector('[data-theme-toggle]');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  document.querySelectorAll('[data-animate]').forEach((el) => {
    observer.observe(el);
  });
}

// ============================================
// DYNAMIC FAVICON
// ============================================
// NOTE: Favicon is now loaded via consolidated /api/page-init in BaseLayout
// This function is kept for backwards compatibility but is a no-op
function loadFavicon() {
  // Favicon now loaded via BaseLayout.astro consolidated endpoint
  // Data available in window.pageInitData if needed
}

// ============================================
// PWA SERVICE WORKER
// ============================================
function initPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 3600000);

          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Show elegant update toast
                const updateToast = document.getElementById('pwa-update-toast');
                const reloadBtn = document.getElementById('pwa-reload');

                if (updateToast) {
                  updateToast.classList.remove('hidden');
                }

                if (reloadBtn) {
                  reloadBtn.addEventListener('click', () => {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  });
                }
              }
            });
          });
        })
        .catch((error) => {
          console.log('[PWA] Service Worker registration failed:', error);
        });

      // Handle service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });
  }

  // PWA Install Prompt - Modern Modal
  let deferredPrompt;
  const installModal = document.getElementById('pwa-install-modal');
  const installBtn = document.getElementById('pwa-install');
  const laterBtn = document.getElementById('pwa-later');
  const closeBtn = document.getElementById('pwa-close');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install modal after a delay if not dismissed
    if (!localStorage.getItem('pwa-install-dismissed')) {
      setTimeout(() => {
        if (installModal) {
          installModal.classList.remove('hidden');
        }
      }, 3000); // Show after 3 seconds
    }
  });

  // Handle install button
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }

      deferredPrompt = null;
      if (installModal) {
        installModal.classList.add('hidden');
      }
    });
  }

  // Handle later/close buttons
  const dismissModal = () => {
    if (installModal) {
      installModal.classList.add('hidden');
    }
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (laterBtn) laterBtn.addEventListener('click', dismissModal);
  if (closeBtn) closeBtn.addEventListener('click', dismissModal);

  // Close modal on backdrop click
  if (installModal) {
    installModal.addEventListener('click', (e) => {
      if (e.target === installModal || e.target.classList.contains('pwa-modal-backdrop')) {
        dismissModal();
      }
    });
  }

  // Track PWA install
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App successfully installed');
    if (installModal) {
      installModal.classList.add('hidden');
    }
    localStorage.setItem('pwa-installed', 'true');

    // Optional: Send analytics event
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_install', {
        event_category: 'engagement',
        event_label: 'PWA Installed'
      });
    }
  });

  // Detect if running as PWA
  window.addEventListener('DOMContentLoaded', () => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true;

    if (isPWA) {
      document.documentElement.classList.add('pwa-mode');
      console.log('[PWA] Running as installed app');
    }
  });

  // Background sync for offline forms
  async function syncFormData(formData, url, method = 'POST') {
    if (!navigator.onLine) {
      // Store in IndexedDB for background sync
      try {
        const db = await openDB();
        const tx = db.transaction(['pending-forms'], 'readwrite');
        const store = tx.objectStore('pending-forms');

        await store.add({
          url,
          method,
          headers: { 'Content-Type': 'application/json' },
          data: formData,
          timestamp: Date.now()
        });

        // Register sync
        if ('sync' in registration) {
          await registration.sync.register('sync-form-data');
        }

        alert('You are offline. Form will be submitted when connection is restored.');
        return false;
      } catch (error) {
        console.error('[PWA] Failed to queue form:', error);
      }
    }
    return true;
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('pwa-sync', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('pending-forms')) {
          db.createObjectStore('pending-forms', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  // Make syncFormData globally available
  window.syncFormData = syncFormData;

  // Connection Status Monitoring
  const connectionStatus = document.getElementById('pwa-connection-status');
  const statusText = connectionStatus?.querySelector('.pwa-status-text');
  let statusTimeout;

  function showConnectionStatus(isOnline) {
    if (!connectionStatus || !statusText) return;

    // Clear existing timeout
    if (statusTimeout) clearTimeout(statusTimeout);

    // Update status
    connectionStatus.classList.remove('hidden', 'online', 'offline');
    connectionStatus.classList.add(isOnline ? 'online' : 'offline');

    if (statusText) {
      statusText.textContent = isOnline ? 'Back Online' : 'You are Offline';
    }

    // Auto-hide after 3 seconds
    statusTimeout = setTimeout(() => {
      connectionStatus.classList.add('hidden');
    }, 3000);
  }

  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('[PWA] Connection restored');
    showConnectionStatus(true);
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] Connection lost');
    showConnectionStatus(false);
  });

  // Initial connection check
  if (!navigator.onLine) {
    showConnectionStatus(false);
  }

  // Push Notification Subscription Management
  async function setupPushNotifications() {
    // Check if push notifications are supported
    if (!('Notification' in window) || !('PushManager' in window)) {
      console.log('[Push] Push notifications not supported');
      return;
    }

    // Check if service worker is ready
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      console.log('[Push] Service worker not ready');
      return;
    }

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();

    // Determine user type based on current path
    const userType = window.location.pathname.startsWith('/admin/') ? 'admin' :
                    window.location.pathname.startsWith('/client/') ? 'client' : null;

    // Auto-subscribe admin users and logged-in client users
    const adminToken = localStorage.getItem('admin_token');
    const clientToken = localStorage.getItem('client_token');

    if (!existingSubscription && (adminToken || clientToken)) {
      // Request permission if not already granted
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('[Push] Notification permission denied');
          return;
        }
      }

      if (Notification.permission === 'granted') {
        try {
          await subscribeToPush(registration, userType || 'client');
        } catch (error) {
          console.error('[Push] Failed to subscribe:', error);
        }
      }
    } else if (existingSubscription) {
      console.log('[Push] Already subscribed to push notifications');
    }
  }

  async function subscribeToPush(registration, userType) {
    try {
      // Application server key (VAPID public key)
      // In production, this should come from environment variables
      // For now, using a placeholder - this needs to be generated
      const applicationServerKey = urlBase64ToUint8Array(
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SaCH' +
        'goeJfaLHTU4kJP3H-FOcpfBEa-wGZtMh2wAQ' +
        '4BpQkJqFzZ8QiTM'
      );

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('[Push] Push subscription created:', subscription);

      // Send subscription to server
      const userId = userType === 'admin' ? 1 : null; // Get actual user ID from session

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userType: userType,
          userId: userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }

      const result = await response.json();
      console.log('[Push] Subscription saved to server:', result);

      // Store subscription ID locally
      localStorage.setItem('push_subscription_id', result.subscriptionId);

      return subscription;
    } catch (error) {
      console.error('[Push] Failed to subscribe:', error);
      throw error;
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Function to unsubscribe from push notifications
  async function unsubscribeFromPush() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;

        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Unsubscribe from server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ endpoint })
        });

        localStorage.removeItem('push_subscription_id');
        console.log('[Push] Unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('[Push] Failed to unsubscribe:', error);
    }
  }

  // Make functions globally available
  window.subscribeToPush = setupPushNotifications;
  window.unsubscribeFromPush = unsubscribeFromPush;

  // Setup push notifications after service worker is registered
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(() => {
      // Delay to avoid disrupting initial page load
      setTimeout(setupPushNotifications, 2000);
    });
  }
}

// ============================================
// INITIALIZATION
// ============================================
function initAll() {
  initTheme();
  initScrollAnimations();
  // loadFavicon() - now handled by BaseLayout consolidated endpoint
  initPWA();
}

// Run on initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}

// Re-run after Astro view transitions
document.addEventListener('astro:page-load', () => {
  initTheme();
  initScrollAnimations();
  // loadFavicon() - now handled by BaseLayout consolidated endpoint
  // PWA only needs to init once
});
