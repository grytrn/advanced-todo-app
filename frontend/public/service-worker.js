// Service Worker for offline functionality
const CACHE_NAME = 'todo-app-v1';
const API_CACHE_NAME = 'todo-api-v1';

// Assets to cache for offline use
const urlsToCache = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(request).then((response) => {
      // Return cached version or fetch new
      return response || fetch(request).then((fetchResponse) => {
        // Cache successful responses
        if (fetchResponse.status === 200) {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});

// Handle API requests with offline queue
async function handleApiRequest(request) {
  try {
    const response = await fetch(request.clone());
    
    // Cache successful GET requests
    if (request.method === 'GET' && response.status === 200) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // If offline, return cached data for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For non-GET requests, queue them for later
    if (request.method !== 'GET') {
      await queueRequest(request);
      return new Response(
        JSON.stringify({ 
          success: true, 
          offline: true, 
          message: 'Request queued for sync' 
        }),
        { 
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Queue requests for background sync
async function queueRequest(request) {
  const db = await openDB();
  const tx = db.transaction('sync-queue', 'readwrite');
  const store = tx.objectStore('sync-queue');
  
  const requestData = {
    url: request.url,
    method: request.method,
    headers: [...request.headers.entries()],
    body: await request.text(),
    timestamp: Date.now()
  };
  
  await store.add(requestData);
}

// Simple IndexedDB wrapper
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('todo-offline-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Background sync
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(syncQueue());
  }
});

async function syncQueue() {
  const db = await openDB();
  const tx = db.transaction('sync-queue', 'readwrite');
  const store = tx.objectStore('sync-queue');
  const requests = await store.getAll();
  
  for (const requestData of requests) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });
      
      if (response.ok) {
        await store.delete(requestData.id);
      }
    } catch (error) {
      console.error('Sync failed for request:', requestData, error);
    }
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});