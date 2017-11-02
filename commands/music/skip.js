module.exports = class {
	constructor() {
		this.aliases = ["s"];
	}

	run(music, msg, i, flags) {
		if(i && i-- !== 0){
			if(isNaN(i) || i < 1 || i > music.queue.length)return "Please choose a valid index.";
			if(msg.member.id !== music.queue[i].dj)return "You are not a DJ of that song in queue!";
			music.djs.splice(i, 1);
			music.queue.splice(i, 1);
			return `Removed **\`${ music.queue[i - 1].snippet.title }\`** from queue.`;
		}
		if(!music.nowPlaying)return "No songs currently playing";
		const content = `Skipped **\`${ music.nowPlaying.snippet.title }\`**.`;
		music.nowPlaying = false;
		music.dispatcher.end();
		if(music.repeat)music.queue.pop();
		return { content, delete: 5000 };
	}
}