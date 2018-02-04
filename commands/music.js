const { loadCommand, loadCommands } = require("../util/commandLoading.js");

/* 
	TODO: Implement vote system
	TODO: Add Permissions
	TODO: Rich Embed queue command
*/
 
let guilds;

module.exports = class {
	constructor(self) {
		this.info = "Play music.";
		this.requiresGuild = true;
		this.selfPerms = ["MANAGE_MESSAGES", "ADD_REACTIONS"];
		this.aliases = ["m"];
		this.commands = {};
		this.init = loadCommands(this.commands, "commands/music", self);
		guilds = self.guilds;
		if(self.set)return;

		const assign = id => Object.assign(guilds[id], { music: { queue: [] } }),
			ids = self.client.guilds.keyArray();	

		for(let i = 0; i < ids.length; i++){
			assign(ids[i]);
		}

		self.on("guildCreate", guild => assign(guild.id));
	}

	vcUpdate(mem) {
		const music = guilds[mem.guild.id].music;
		if(mem.voiceChannel && music.queue.length && !music.nowPlaying && mem.voiceChannel.joinable && music.queue.some(vid => vid.dj === mem.id))
			this.commands.play.run(music, { member: mem, guild: mem.guild }, "", []);
		const me = mem.guild.me,
			channel = music.nowPlaying ? music.nowPlaying.channel : null;
		if(me.voiceChannel && !music.leaving && me.voiceChannel.members.size === 1){
			music.dispatcher.pause();
			music.leaving = {
				timeout: setTimeout(() => {
					if(!me.voiceChannel)return;
					music.leaving.message.edit("Left voice channel because I was left alone for 2 minutes!");
					music.queue = [];
					music.nowPlaying = music.repeat = music.textChannel = music.leaving = null;
					
					music.dispatcher.end();
				}, 10000)
			};
			channel.send("Pausing current song and leaving voice channel in 2 minutes because I was left alone!")
			.then(msg => music.leaving.message = msg);
		}else if(music.leaving && me.voiceChannel && me.voiceChannel.members.size > 1){
			const { timeout, message } = music.leaving;
			clearTimeout(timeout);
			if(message)message.delete();
			music.leaving = null;
			music.dispatcher.resume();
		}
	}

	run(msg, params, flags) {
		return new Promise(resolve => {	
			params = params.split(" ");
			const cmd = this.commands[params.shift().toLowerCase()];
			msg.delete();
			resolve(cmd ? cmd.run(guilds[msg.guild.id].music, msg, params.join(" "), flags) : "Invalid music commmand.");
		});
		
	}
};