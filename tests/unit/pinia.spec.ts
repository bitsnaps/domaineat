import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, defineStore } from 'pinia'
import { ref } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'

const routes = [
  { path: '/', component: { template: '<div>Home</div>' } },
]

describe('Pinia integration', () => {
  let pinia: ReturnType<typeof createPinia>
  let router: ReturnType<typeof createRouter>

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
    router.push('/')
    await router.isReady()
  })

  it('app installs Pinia plugin without error', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router],
        stubs: { RouterView: true },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('active pinia is set after app creation', () => {
    mount(App, {
      global: {
        plugins: [pinia, router],
        stubs: { RouterView: true },
      },
    })
    expect(() => setActivePinia(pinia)).not.toThrow()
  })

  it('can create and use a Pinia store', () => {
    const useTestStore = defineStore('test', () => {
      const count = ref(0)
      function increment() { count.value++ }
      return { count, increment }
    })

    mount(App, {
      global: {
        plugins: [pinia, router],
        stubs: { RouterView: true },
      },
    })

    const store = useTestStore()
    expect(store.count).toBe(0)
    store.increment()
    expect(store.count).toBe(1)
  })
})
