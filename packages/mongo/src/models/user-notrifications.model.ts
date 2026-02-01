import { Document, model, Schema } from "mongoose"

interface IUserNotification extends Document {
	guildId: string
	mentionTo: string
	createdBy: string
	createdAt: Date
	updatedAt: Date
	usageCount: number
	isActive: boolean
	deletedBy: string
	deletedAt: Date
	channels: string[]
	excludeChannels: boolean
	regexPattern: string
	regexFlags: string
	regex: RegExp
}

const UserNotificationSchema = new Schema<IUserNotification>({
	guildId: { type: String, required: true, index: true },
	mentionTo: { type: String, required: true },
	createdBy: { type: String, required: true },
	usageCount: { type: Number, default: 0 },
	isActive: { type: Boolean, default: true },
	deletedBy: { type: String },
	deletedAt: { type: Date	},
	channels: { type: [String], default: [] },
	excludeChannels: { type: Boolean, default: false },
	regexPattern: { type: String, required: false },
	regexFlags: { type: String, required: false }
}, { timestamps: true })

// Virtual para obtener el patrón como RegExp
UserNotificationSchema.virtual("regex").get(function (this: any) {
	if (this.regexPattern) {
		try {
			return new RegExp(this.regexPattern, this.regexFlags || undefined)
		} catch {
			return null
		}
	}
	return null
})

UserNotificationSchema.pre("save", function () {
	if (this.isModified()) {
		this.updatedAt = new Date()
	}
})

export const UserNotificationModel = model<IUserNotification>("user_notification", UserNotificationSchema)
