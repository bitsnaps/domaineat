import { createApp } from 'vue'
// Plain Bootstrap 5 CSS (no Bootswatch)
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
// Custom design system overrides (must come after Bootstrap)
import './style.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
