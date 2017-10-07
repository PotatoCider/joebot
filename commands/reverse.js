module.exports = class {
	constructor() {
		this.info = "Reverses a message.";
	}

	run(msg, params, flags) {
		return Promise.resolve(params.split("").reverse().join("") || ".esrever ot gnihton evah I");
	}
}