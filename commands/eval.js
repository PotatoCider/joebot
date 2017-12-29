const fs = require("fs"), Discord = require("discord.js");

let self;
module.exports = class {
	constructor(tmpSelf) {
		this.info = "Only for Me :D";
		this.hide = true;
		self = tmpSelf;
	}

	run(msg, params, flags) {
		if(msg.author.id === "250140362880843776" || msg.author.id === "306031216208117760"){
			if(flags.includes("clear"))return new Promise(resolve => fs.writeFile("log.txt", "", err => {
				if(err)throw err;
				resolve("Error log cleared.");
			}));
			let client = self.client,
				guild = self.guilds[msg.guild.id],
				music = guild.music;
			if(flags.includes("log"))return eval(`console.log(${ params });`);
			if(flags.includes("send"))return eval(params);
			if(flags.includes("restart"))return fs.writeFileSync("bot.js", fs.readFileSync("bot.js"));
			eval(params);
		}else return "You are not Joe >:(";
	}
}