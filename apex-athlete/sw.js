// Apex service worker — lets the installed app open offline.
// App files: network first, so a new deploy shows up on the next launch; the
// cached copy is used only when the network fails. Pinned CDN files (fonts,
// icons, supabase-js): cache first. Supabase API calls are never cached.
// Bump VERSION when the list of SHELL files changes.

const VERSION = 'apex-v3'
const SHELL = [
  './',
  './index.html',
  './app.js',
  './config.js',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './lib/motion.js',
  './lib/nutrition.js',
  './lib/plan.js',
  './lib/store.js',
  './lib/supabase.js',
  './lib/util.js',
  './components/DaySession.js',
  './components/FuelPlan.js',
  './components/FuelToday.js',
  './components/GroceryView.js',
  './components/Header.js',
  './components/JournalForm.js',
  './components/JournalView.js',
  './components/JourneyView.js',
  './components/LoginView.js',
  './components/NutritionUpload.js',
  './components/PlanUpload.js',
  './components/PlanView.js',
  './components/ProfileView.js',
  './components/SeasonProfile.js',
  './components/Sidebar.js',
  './components/TodayView.js'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.hostname.endsWith('.supabase.co')) return

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request))
  } else {
    event.respondWith(cacheFirst(request))
  }
})

async function networkFirst(request) {
  const cache = await caches.open(VERSION)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    // Navigations carry the magic-link hash or a query string; serve the shell.
    const cached = await cache.match(request, { ignoreSearch: true })
      || (request.mode === 'navigate' && await cache.match('./index.html'))
    if (cached) return cached
    throw err
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
  return response
}
