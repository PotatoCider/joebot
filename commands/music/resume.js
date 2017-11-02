module.exports = class {
	constructor() {
		this.aliases = ["continue"];
	}

	run(music) {
		if(!music.nowPlaying)return "No songs currently playing";
		music.dispatcher.resume();
		return "Resumed playing music.";
	}
}