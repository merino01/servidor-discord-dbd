<script setup lang="ts">
useHead({
	meta: [
		{ charset: "utf-8" },
		{ name: "viewport", content: "width=device-width, initial-scale=1" }
	],
	link: [
		{ rel: "icon", href: "/favicon.ico" }
	],
	htmlAttrs: {
		lang: "en"
	},
	script: [
		{
			innerHTML: `
        try {
          const saved = localStorage.getItem('ui-theme');
          if (saved) {
            const { radius } = JSON.parse(saved);
            if (radius) document.documentElement.style.setProperty('--ui-radius', radius);
          }
        } catch {}
      `,
			tagPosition: "head"
		}
	]
})

const title = "Nuxt Dashboard Template"
let description = "A professional dashboard template built with Nuxt UI, "
description += "featuring multiple pages, data visualization, and comprehensive "
description += "management capabilities for creating powerful admin interfaces."

useSeoMeta({
	title,
	description,
	ogTitle: title,
	ogDescription: description,
	ogImage: "https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png",
	twitterCard: "summary_large_image"
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
  </UApp>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.4s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}
</style>
