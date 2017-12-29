module.exports = class {
	constructor() {
		this.info = "Reverses a message.";
	}

	run(msg, params, flags) {
		return params.split("").reverse().join("") || ".esrever ot gnihton evah I";
	}
}