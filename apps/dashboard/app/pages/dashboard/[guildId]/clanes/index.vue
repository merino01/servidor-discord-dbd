<script setup lang="ts">
import type { IClan } from "@org/mongo"

const route = useRoute()

const { data: clans, status } = useFetch<IClan[]>(
	() => `/api/clanes?guildId=${route.params.guildId}`,
	{ lazy: true, server: false }
)

function formatDate (date: Date | string) {
	const format = new Intl.DateTimeFormat("es-ES", {
		year: "numeric",
		month: "long",
		day: "numeric"
	})
	return format.format(new Date(date))
}
</script>

<template>
	<div class="flex flex-col gap-8">
		<h1 class="text-4xl text-primary">Lista de clanes</h1>

		<div v-if="status === 'pending' || status === 'idle'">
			<USkeleton class="w-full h-12" />
		</div>

		<p v-else-if="status === 'error'">{{ $t("dashboard.errorLoadingClans") }}</p>

		<ul v-else class="flex flex-row flex-wrap gap-4 items-center justify-start">
			<li
				v-for="clan in clans" :key="clan._id.toString()"
			>
				<NuxtLink :to="`/dashboard/${route.params.guildId}/clanes/${clan._id.toString()}`">
					<UCard class="border border-primary">
						<template #header>
							<span class="text-secondary">{{clan.icon}} {{ clan.name }} ({{ clan.members.length }})</span>
						</template>

						<div class="flex flex-col gap-2">
							<span>{{ $t("dashboard.maxMembers") }}: {{ clan.maxMembers }}</span>
							<span>{{ $t("dashboard.maxVoiceChannels") }}: {{ clan.maxVoiceChannels }}</span>
							<span class="inline-flex items-center gap-2">
								{{ $t("dashboard.roleColor") }}:
								<div :style="{ backgroundColor: `#${clan.roleColor?.toString(16) ?? '000000'}` }" class="w-6 h-6 rounded-full"/>
							</span>
							<span>{{ $t("dashboard.createdDate") }}: {{ formatDate(clan.createdAt) }}</span>
						</div>
					</UCard>
				</NuxtLink>
			</li>
		</ul>
	</div>
</template>
