/**
 * Currency conversion composable.
 * Uses exchange rate API (exchangerate.host or similar).
 * Falls back gracefully when offline or rate-limited.
 */
import { ref, computed, watch } from 'vue'

// Supported currencies
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR'

export const CURRENCIES: Record<CurrencyCode, { symbol: string; name: string }> = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
}

const API_BASE = '/api'

// Shared reactive state (singleton across components)
const preferredCurrency = ref<CurrencyCode>(
  (localStorage.getItem('preferredCurrency') as CurrencyCode) || 'USD'
)
const rates = ref<Record<string, number>>({ USD: 1 })
const ratesLoaded = ref(false)
const ratesError = ref<string | null>(null)

// Persist currency choice
watch(preferredCurrency, (code) => {
  localStorage.setItem('preferredCurrency', code)
})

export function useCurrency() {
  async function fetchRates() {
    ratesError.value = null
    try {
      const res = await fetch(`${API_BASE}/exchange-rates`)
      if (!res.ok) throw new Error('Failed to fetch exchange rates')
      const data = await res.json()
      rates.value = data.rates || { USD: 1 }
      ratesLoaded.value = true
    } catch (err: any) {
      ratesError.value = err.message
      // Fallback: use hardcoded approximate rates
      rates.value = {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        CAD: 1.36,
        AUD: 1.53,
        JPY: 149.5,
        CNY: 7.24,
        INR: 83.1,
      }
      ratesLoaded.value = true
    }
  }

  /** Convert an amount from USD to the preferred currency */
  function convertFromUsd(usdAmount: number, target?: CurrencyCode): number {
    const code = target || preferredCurrency.value
    const rate = rates.value[code] ?? 1
    return usdAmount * rate
  }

  /** Format an amount in the preferred currency */
  function formatCurrency(usdAmount: number, target?: CurrencyCode): string {
    const code = target || preferredCurrency.value
    const converted = convertFromUsd(usdAmount, code)
    const symbol = CURRENCIES[code]?.symbol || '$'
    return `${symbol}${converted.toFixed(2)}`
  }

  /** Get the current exchange rate for the preferred currency */
  const currentRate = computed(() => rates.value[preferredCurrency.value] ?? 1)

  return {
    preferredCurrency,
    rates,
    ratesLoaded,
    ratesError,
    currentRate,
    fetchRates,
    convertFromUsd,
    formatCurrency,
    CURRENCIES,
  }
}
