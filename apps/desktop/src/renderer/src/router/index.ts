import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    {
      path: '/channel/:type',
      name: 'channel',
      component: () => import('@/views/ChannelView.vue'),
    },
    { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue') },
    {
      path: '/media/:source/:id',
      name: 'detail',
      component: () => import('@/views/DetailView.vue'),
    },
    {
      path: '/play/:source/:id',
      name: 'play',
      component: () => import('@/views/PlayView.vue'),
      meta: { hideChrome: true },
    },
    {
      path: '/pan/:id',
      name: 'pan-detail',
      component: () => import('@/views/PanDetailView.vue'),
    },
    {
      path: '/pan-play/:id',
      name: 'pan-play',
      component: () => import('@/views/PanPlayView.vue'),
      meta: { hideChrome: true },
    },
    { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue') },
    { path: '/favorites', name: 'favorites', component: () => import('@/views/FavoritesView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
  ],
})

export default router
