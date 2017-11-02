const
	[ { loadCommand, loadCommands } ] = require("../util/loadModules")("commandLoading");

/* 
	TODO: Implement vote system
	TODO: Add Permissions
	TODO: Add Multiple Page Support for Search query
	TODO: Rich Embed queue command
	TODO: utilise commandLoading.js
*/

	commands = {};
 
let servers;

module.exports = class {
	constructor({ client, guilds }) {
		return new Promise(resolve => {
			servers = guilds;
			const ids = client.guilds.keys();
			if(!Object.keys(guilds).length)for(const id of ids)this.setup(id);
			loadCommands(commands, "commands/music", commands).then(() => resolve(this));
			this.info = "Play music.";
			this.requiresGuild = true;
			this.selfPerms = ["MANAGE_MESSAGES", "ADD_REACTIONS"];
			this.aliases = ["m"];
		});
	}

	setup(id, del) {
		if(del)delete servers[id];
			else servers[id] = { music: { queue: [], djs: [] } };
	}

	vcUpdate(mem) {
		const music = servers[mem.guild.id].music;
		if(mem.voiceChannel && mem.voiceChannel.joinable && music.queue.length && !music.nowPlaying && music.djs.includes(mem.id))
			commands.play.run(music, { member: mem, guild: mem.guild }, "", []);
	}

	run(msg, params, flags) {
		return new Promise(resolve => {	
			params = params.split(" ");
			const cmd = commands[params.shift().toLowerCase()].run;
			msg.delete();
			resolve(cmd ? cmd(servers[msg.guild.id].music, msg, params.join(" "), flags) : "Invalid music commmand.");
		});
		
	}
};