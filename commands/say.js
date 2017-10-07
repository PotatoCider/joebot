module.exports = class {
	constructor() {
		this.info = "Says what you said.";
	}

	run(msg, params, flags) {
		return Promise.resolve(params || "I got nothing to say.");
	}
};