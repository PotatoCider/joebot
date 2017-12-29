module.exports = class {
	constructor() {
		this.aliases = ["clear", "leave", "reset"];
	}

	run(music, msg) {
		const vc = msg.guild.me.voiceChannel;
		if(!vc && !music.queue.length)return "No voice channel to leave.";
		music.queue = []; 
		if(music.dispatcher)music.dispatcher.end();
		if(music.leaving){
			const { timeout, message } = music.leaving;
			clearTimeout(timeout);
			if(message)message.delete();
		}
		music.nowPlaying = music.repeat = music.textChannel = music.leaving = null;
		music.djs = [];
		if(vc)vc.join().then(connection => connection.channel.leave());
		return { content: "Stopped playing music.", delete: 5000 };
	}
}