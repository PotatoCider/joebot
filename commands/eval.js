const fs = require("fs");

let client, guilds, commands, cmdList;

module.exports = class {
	constructor({ client: c, guilds: g, commands: cmd, cmdList: list }) {
		this.info = "Only for Me :D";
		this.hide = true;
		client = c;
		guilds = g;
		commands = cmd;
		cmdList = list;
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			if(msg.author.id === "250140362880843776" || msg.author.id === "306031216208117760"){
				if(flags.includes("clear"))return fs.writeFile("log.txt", "", err => {
					if(err)throw err;
					resolve("Error log cleared.");
				});
				if(flags.includes("log"))return eval(`console.log(${ params });`);
				if(flags.includes("send"))return resolve(eval(params));
				eval(params);
			}else resolve("You are not Joe >:(");
		});
	}
}