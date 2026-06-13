<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'

const admin = useAdminStore()

onMounted(() => {
	admin.fetchStats()
})

// function formatLimit(val: number) {
// 	return val < 0 ? '∞' : val.toLocaleString()
// }
</script>

<template>
	<div>
		<h5 class="fw-semibold mb-3">Platform Stats</h5>

		<div v-if="admin.loading" class="text-center py-5">
			<div class="spinner-border text-primary" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>

		<div v-else-if="admin.stats">
			<div class="row g-4 mb-4">
				<div class="col-md-3">
					<div class="card text-center p-3">
						<div class="fs-2 fw-bold text-primary">{{ admin.stats.totalUsers }}</div>
						<div class="text-muted small">Total Users</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="card text-center p-3">
						<div class="fs-2 fw-bold text-success">{{ admin.stats.totalDomains }}</div>
						<div class="text-muted small">Total Domains</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="card text-center p-3">
						<div class="fs-2 fw-bold text-warning">{{ admin.stats.adminCount }}</div>
						<div class="text-muted small">Admins</div>
					</div>
				</div>
				<div class="col-md-3">
					<div class="card text-center p-3">
						<div class="fs-2 fw-bold text-info">
							{{ admin.stats.totalUsers > 0 ? Math.round((admin.stats.totalDomains / admin.stats.totalUsers) * 10) / 10 : 0 }}
						</div>
						<div class="text-muted small">Avg Domains/User</div>
					</div>
				</div>
			</div>

			<div class="card">
				<div class="card-header fw-semibold">Tier Distribution</div>
				<div class="card-body">
					<div v-for="(count, tier) in admin.stats.tierDistribution" :key="tier" class="d-flex align-items-center mb-3">
						<span class="text-capitalize fw-medium" style="width: 120px;">{{ tier }}</span>
						<div class="flex-grow-1 mx-3">
							<div class="progress" style="height: 24px;">
								<div
									class="progress-bar"
									:class="{
										'bg-secondary': tier === 'free',
										'bg-warning': tier === 'premium',
										'bg-success': tier === 'enterprise'
									}"
									:style="{
										width: admin.stats.totalUsers > 0
											? `${(count / admin.stats.totalUsers) * 100}%`
											: '0%',
										minWidth: count > 0 ? '2rem' : '0'
									}"
								>
									{{ count }}
								</div>
							</div>
						</div>
						<span class="text-muted small" style="width: 50px;">
							{{ admin.stats.totalUsers > 0 ? Math.round((count / admin.stats.totalUsers) * 100) : 0 }}%
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
