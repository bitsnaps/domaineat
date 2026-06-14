<script setup lang="ts">
import { computed } from 'vue'
import type { DomainPricing, PricingResponse } from '@/types'

const props = defineProps<{
	pricing: PricingResponse
}>()

/** Sorted prices by registration price (lowest first) — already sorted by API */
const sortedPrices = computed(() => {
	return [...props.pricing.prices].sort((a, b) => {
		if (a.register === null && b.register === null) return 0
		if (a.register === null) return 1
		if (b.register === null) return -1
		return a.register - b.register
	})
})

const bestPrice = computed(() => {
	const withPrice = sortedPrices.value.filter(p => p.register !== null)
	return withPrice.length > 0 ? withPrice[0] : null
})

function providerIcon(provider: string): string {
	const icons: Record<string, string> = {
		Porkbun: 'bi-globe',
		Cloudflare: 'bi-cloud',
		GoDaddy: 'bi-building',
	}
	return icons[provider] || 'bi-shop'
}

function formatPrice(price: number | null): string {
	if (price === null) return '—'
	return `$${price.toFixed(2)}`
}

function registerUrl(price: DomainPricing): string {
	if (price.buyUrl) return price.buyUrl
	const q = encodeURIComponent(price.domain)
	const providerUrls: Record<string, string> = {
		Porkbun: `https://porkbun.com/checkout/buying/${q}`,
		Cloudflare: `https://dash.cloudflare.com/?to=/:account/registrar/domains/register/${q}`,
		GoDaddy: `https://www.godaddy.com/domainsearch/find?checkAvail=1&tmskey=&domainToCheck=${q}`,
	}
	return providerUrls[price.provider] || `https://www.namecheap.com/domains/registration/results/?domain=${q}`
}
</script>

<template>
	<div class="card border-0 shadow-sm pricing-card">
		<div class="card-body p-3">
			<!-- Header -->
			<div class="d-flex justify-content-between align-items-center mb-2">
				<h6 class="mb-0 fw-semibold">
					<i class="bi bi-tag me-2" style="color: var(--primary);"></i>Domain Pricing
				</h6>
				<span
					class="badge fs-6"
					:class="pricing.available === true ? 'bg-success' : pricing.available === false ? 'bg-secondary' : 'bg-warning text-dark'"
				>
					{{ pricing.available === true ? 'Available' : pricing.available === false ? 'Taken' : 'Unknown' }}
				</span>
			</div>

			<!-- Best price highlight -->
			<div v-if="bestPrice && pricing.available === true" class="best-price-banner mb-3 p-2 rounded">
				<div class="d-flex align-items-center gap-2">
					<i class="bi bi-star-fill text-warning"></i>
					<span class="fw-semibold">
						Best Price: {{ formatPrice(bestPrice.register) }}/yr
					</span>
					<span class="text-muted small">({{ bestPrice.provider }})</span>
				</div>
			</div>

			<!-- Taken domain message -->
			<div v-if="pricing.available === false" class="mb-3 p-2 rounded bg-light">
				<div class="small text-muted">
					<i class="bi bi-info-circle me-1"></i>
					This domain is registered. Registration pricing is not available.
				</div>
			</div>

			<!-- No prices available -->
			<div v-if="sortedPrices.length === 0" class="text-center py-3 text-muted small">
				<i class="bi bi-exclamation-circle me-1"></i>
				No pricing data available from configured providers.
			</div>

			<!-- Price table -->
			<div v-else class="table-responsive">
				<table class="table table-sm align-middle mb-0 pricing-table">
					<thead>
						<tr class="text-muted small">
							<th>Provider</th>
							<th class="text-end">Register</th>
							<th class="text-end">Renew</th>
							<th class="text-end">Action</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(price, idx) in sortedPrices"
							:key="price.provider"
							:class="{ 'best-row': idx === 0 && price.register !== null && pricing.available === true }"
						>
							<td>
								<div class="d-flex align-items-center gap-2">
									<i class="bi" :class="providerIcon(price.provider)"></i>
									<span class="fw-semibold">{{ price.provider }}</span>
									<span v-if="idx === 0 && price.register !== null && pricing.available === true" class="badge bg-success text-white" style="font-size: 0.65rem;">
										Best
									</span>
								</div>
							</td>
							<td class="text-end">
								<span v-if="price.register !== null" class="fw-semibold">
									{{ formatPrice(price.register) }}
								</span>
								<span v-else class="text-muted">—</span>
							</td>
							<td class="text-end">
								<span v-if="price.renew !== null" :class="{ 'text-danger': price.renew > (price.register ?? 0) * 1.5 }">
									{{ formatPrice(price.renew) }}
								</span>
								<span v-else class="text-muted">—</span>
							</td>
							<td class="text-end">
								<a
									v-if="pricing.available === true"
									:href="registerUrl(price)"
									target="_blank"
									rel="noopener"
									class="btn btn-sm btn-outline-primary py-0"
								>
									Register <i class="bi bi-box-arrow-up-right ms-1"></i>
								</a>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<style scoped>
.pricing-card {
	transition: transform 0.15s;
}
.best-price-banner {
	background: linear-gradient(135deg, #eef2ff, #e0e7ff);
	border: 1px solid #c7d2fe;
}
.best-row {
	background: rgba(34, 197, 94, 0.05);
}
.pricing-table th,
.pricing-table td {
	padding: 0.5rem 0.75rem;
}
</style>
