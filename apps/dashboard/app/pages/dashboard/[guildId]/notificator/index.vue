<script setup lang="ts">
import type { IUserNotification } from "@org/mongo"

const route = useRoute()
const guildId = route.params.guildId as string

const { data: userNotifications, status } = useFetch<IUserNotification[]>("/api/notificator", {
	query: {
		guildId
	}
})
</script>

<template>
	<div class="flex flex-col gap-8">
		<h1 class="text-4xl text-primary">Lista de notificaciones de usuario</h1>

		<div v-if="status === 'pending' || status === 'idle'">
			<USkeleton class="w-full h-12" />
		</div>

		<p v-else-if="status === 'error'">{{ $t("dashboard.errorLoadingClans") }}</p>

		<ul v-else class="flex flex-row flex-wrap gap-4 items-center justify-start">
			<li
				v-for="notification in userNotifications" :key="notification._id.toString()"
			>
				<NuxtLink :to="`/dashboard/${guildId}/notificator/${notification._id.toString()}`">
					<UCard class="border border-primary">
						<template #header>
							<span class="text-secondary">{{notification.regexPattern}}</span>
						</template>

						<div class="flex flex-col gap-2"/>
					</UCard>
				</NuxtLink>
			</li>
		</ul>
	</div>
</template>
