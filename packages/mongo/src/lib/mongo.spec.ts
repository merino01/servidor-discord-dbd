import { mongo } from "./mongo.js"

describe("mongo", () => {
	it("should work", () => {
		expect(mongo()).toEqual("mongo")
	})
})
