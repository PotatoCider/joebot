module.exports = class {
	constructor() {
		this.info = "Rolls a dice.";
		this.aliases = ["roll"];
	}

	run(msg, params, flags) {
		return Promise.resolve(`:game_die: | Rolled a ${ ~~(Math.random()*6+1) }.`);
	}
}