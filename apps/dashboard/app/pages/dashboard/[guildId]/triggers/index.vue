<script setup lang="ts">
import type { ITrigger } from "@org/mongo"

const route = useRoute()
const guildId = route.params.guildId as string

const { data: triggers, status } = useFetch<ITrigger[]>("/api/triggers", {
	query: {
		guildId
	}
})
</script>

<template>
	<div class="flex flex-col gap-8">
		<h1 class="text-4xl text-primary">Lista de triggers</h1>

		<div v-if="status === 'pending' || status === 'idle'">
			<USkeleton class="w-full h-12" />
		</div>

		<p v-else-if="status === 'error'">{{ $t("dashboard.errorLoadingClans") }}</p>

		<ul v-else class="flex flex-row flex-wrap gap-4 items-center justify-start">
			<li
				v-for="trigger in triggers" :key="trigger._id.toString()"
			>
				<NuxtLink :to="`/dashboard/${guildId}/triggers/${trigger._id.toString()}`">
					<UCard class="border border-primary">
						<template #header>
							<span class="text-secondary">{{trigger.trigger}}</span>
						</template>

						<div class="flex flex-col gap-2"/>
					</UCard>
				</NuxtLink>
			</li>
		</ul>
	</div>
</template>
