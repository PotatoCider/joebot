const missingPerms = require("../util/perms.js");

let commands;

const 
	list = { reg: [], mod: [] },
	listCmds = list => {
		let msg = "";
		for(let i = 0; i < list.length; i++){
			const name = list[i],
				cmd = commands[name];
			if(cmd.hide)continue;
			msg += `\`${ name }\`: ${ cmd.info }\n\n`;
		}
		return msg;
	},
	setList = () => {
		for(const name in commands){
			list[commands[name].perms ? "mod" : "reg"].push(name); 
		}
	}

module.exports = class { // Add in "Guilds" Section for guild required commmands
	constructor(self) {
		this.info = "Displays this help message.";
		this.aliases = ["halp", "commands"];
		commands = self.commands;
		
		self.set ? setList() : self.once("set", setList);
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			const modCmds = list.mod.filter(cmd => !missingPerms(msg.channel, cmd.perms, msg.member).length);
			resolve(listCmds(list.reg) + (modCmds.length ? "**Moderator Commands:**\n\n" + listCmds(modCmds) : ""));
		});
	}
}