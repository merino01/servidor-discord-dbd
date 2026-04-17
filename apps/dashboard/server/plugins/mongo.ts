import { connectMongo } from "@org/mongo"

export default defineNitroPlugin(async () => {
	await connectMongo()
})
