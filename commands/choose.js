module.exports = class {
	constructor() {
		this.info = "Chooses between options given.";
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			const 
				options = params.split(" | "),
				optionChosen = ~~(Math.random() * options.length);
			resolve(`I choose option ${ optionChosen + 1 }: "${ options[optionChosen] }".`);
		});
	}
}