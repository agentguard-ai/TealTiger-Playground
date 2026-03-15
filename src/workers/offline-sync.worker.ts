// Service Worker for offline support
// Requirements: 27.1-27.10

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'tealtiger-playground-v1';
const OFFLINE_QUEUE_KEY = 'tealtiger_offline_queue';

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Supabase API requests (handle separately)
  if (request.url.includes('supabase.co')) {
    event.respondWith(handleSupabaseRequest(request));
    return;
  }
  
  // Network-first strategy for HTML
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Cache-first strategy for static assets
  event.respondWith(cacheFirst(request));
});

// Message event - handle commands from main thread
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'QUEUE_CHANGE':
      queueOfflineChange(data);
      break;
    case 'SYNC_QUEUE':
      syncOfflineQueue();
      break;
    case 'CLEAR_CACHE':
      clearCache();
      break;
    default:
      console.warn('[Service Worker] Unknown message type:', type);
  }
});

// Sync event - background sync when connection restored
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-offline-changes') {
    console.log('[Service Worker] Background sync triggered');
    event.waitUntil(syncOfflineQueue());
  }
});

// Helper functions

async function networkFirst(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function handleSupabaseRequest(request: Request): Promise<Response> {
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    // Cache GET requests for policies and comments
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Supabase request failed, checking cache');
    
    // For GET requests, try cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For POST/PUT/DELETE, queue for later
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      await queueSupabaseRequest(request);
      
      // Return optimistic response
      return new Response(
        JSON.stringify({ queued: true, message: 'Request queued for sync' }),
        {
          status: 202,
          statusText: 'Accepted',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return new Response('Offline - Request failed', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function queueOfflineChange(data: any): Promise<void> {
  try {
    // Get existing queue from IndexedDB or localStorage
    const queue = await getOfflineQueue();
    
    // Add new change
    queue.push({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data,
    });
    
    // Save queue
    await saveOfflineQueue(queue);
    
    console.log('[Service Worker] Change queued for sync:', data);
  } catch (error) {
    console.error('[Service Worker] Failed to queue change:', error);
  }
}

async function queueSupabaseRequest(request: Request): Promise<void> {
  try {
    const body = await request.text();
    
    const queuedRequest = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
    };
    
    const queue = await getOfflineQueue();
    queue.push(queuedRequest);
    await saveOfflineQueue(queue);
    
    console.log('[Service Worker] Request queued:', request.method, request.url);
  } catch (error) {
    console.error('[Service Worker] Failed to queue request:', error);
  }
}

async function syncOfflineQueue(): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    
    if (queue.length === 0) {
      console.log('[Service Worker] No changes to sync');
      return;
    }
    
    console.log(`[Service Worker] Syncing ${queue.length} queued changes...`);
    
    const synced: string[] = [];
    const failed: string[] = [];
    
    for (const item of queue) {
      try {
        // Reconstruct request
        const request = new Request(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
        
        const response = await fetch(request);
        
        if (response.ok) {
          synced.push(item.id);
          console.log('[Service Worker] Synced:', item.id);
        } else {
          failed.push(item.id);
          console.error('[Service Worker] Sync failed:', item.id, response.status);
        }
      } catch (error) {
        failed.push(item.id);
        console.error('[Service Worker] Sync error:', item.id, error);
      }
    }
    
    // Remove synced items from queue
    const remainingQueue = queue.filter((item) => !synced.includes(item.id));
    await saveOfflineQueue(remainingQueue);
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { synced, failed },
      });
    });
    
    console.log(`[Service Worker] Sync complete: ${synced.length} synced, ${failed.length} failed`);
  } catch (error) {
    console.error('[Service Worker] Sync queue failed:', error);
  }
}

async function getOfflineQueue(): Promise<any[]> {
  try {
    // Try IndexedDB first (better for larger data)
    const db = await openDatabase();
    const transaction = db.transaction(['offline_queue'], 'readonly');
    const store = transaction.objectStore('offline_queue');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[Service Worker] IndexedDB failed, using localStorage');
    
    // Fallback to localStorage
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
}

async function saveOfflineQueue(queue: any[]): Promise<void> {
  try {
    // Try IndexedDB first
    const db = await openDatabase();
    const transaction = db.transaction(['offline_queue'], 'readwrite');
    const store = transaction.objectStore('offline_queue');
    
    // Clear existing
    await store.clear();
    
    // Add all items
    for (const item of queue) {
      await store.add(item);
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('[Service Worker] IndexedDB failed, using localStorage');
    
    // Fallback to localStorage
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }
}

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tealtiger_offline', 1);
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearCache(): Promise<void> {
  try {
    await caches.delete(CACHE_NAME);
    console.log('[Service Worker] Cache cleared');
  } catch (error) {
    console.error('[Service Worker] Failed to clear cache:', error);
  }
}

export {};
