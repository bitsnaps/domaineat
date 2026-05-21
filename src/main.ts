import { createApp } from 'vue'
import './style.css'
// Bootswatch Quartz theme (replaces plain bootstrap CSS)
import 'bootswatch/dist/quartz/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
