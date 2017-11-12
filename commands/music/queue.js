let commands;

module.exports = class {
	constructor(cmds) {
		this.aliases = ["q"];
		commands = cmds;
	}
	
	run(music) {
		const queue = music.queue,
			np = commands.nowplaying.run(music);
		let message = (music.nowPlaying ? np : "") + (music.queue.length ? "" : "Queue is empty.");
		for(let i = 0; i < queue.length; i++){
			const vid = queue[i].snippet;
			message += `**${ i+1 }**: **\`${ vid.title }\` by** ${ vid.channelTitle }\n`;
		}
		return message;
	}
}