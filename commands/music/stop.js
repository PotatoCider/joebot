module.exports = class {
	constructor() {
		this.aliases = ["clear", "leave", "reset"];
	}

	run(music, msg) {
		const vc = msg.guild.me.voiceChannel;
		if(!vc)return "No voice channel to leave.";
		music.queue = []; 
		if(music.dispatcher)music.dispatcher.end();
		music.nowPlaying = music.repeat = music.textChannel = false;
		music.djs = [];
		vc.join().then(connection => connection.channel.leave());
		return { content: "Stopped playing music.", delete: 5000 };
	}
}