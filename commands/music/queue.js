
module.exports = class {
	constructor(music) {
		this.aliases = ["q"];
		this.commands = music.commands;
	}
	
	run(music) {
		const queue = music.queue,
			np = this.commands.nowplaying.run(music);
		let message = (music.nowPlaying ? np : "") + (music.queue.length ? "" : "Queue is empty.");
		for(let i = 0; i < queue.length; i++){
			const vid = queue[i];
			message += `**${ i+1 }**: **\`${ vid.title }\` by** ${ vid.channelTitle }\n`;
		}
		return message;
	}
}