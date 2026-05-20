import { IClan } from "@org/mongo"

export interface MembersExtraData {
	clan?: IClan,
	chunks?: string[][]
}

