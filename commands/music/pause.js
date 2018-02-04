module.exports = class {

	run(music) {
		if(!music.nowPlaying)return "No songs currently playing.";
		const dispatcher = music.dispatcher,
			paused = dispatcher.paused;
		if(paused)dispatcher.resume();
			else dispatcher.pause();
		return `${ paused ? "Resumed" : "Paused" } playing music.`;
	}
}