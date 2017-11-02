const [ missingPerms ] = require("../util/loadModules.js")("perms");

const list = { reg: [], mod: [] };
let cmds;

const listCmds = (list) => {
	let msg = "";
	for(const name of list){
		const cmd = cmds[name];
		if(cmd.hide)continue;
		msg += `\`${ name }\`: ${ cmd.info }\n\n`;
	}
	return msg;
}

module.exports = class { // Add in "Guilds" Section for guild required commmands
	constructor({ client, commands, cmdList }) {
		this.info = "Displays this help message.";
		this.aliases = ["halp"];
		cmds = commands;
		const setList = () => {
			for(const name in cmds){
				list[cmds[name].mod ? "mod" : "reg"].push(name); 
			}
		}
		if(client.set)setList();
			else client.once("set", setList);
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			let modCmds = list.mod.filter(cmd => !missingPerms(msg.channel, cmd.perms, msg.member).length);
			resolve(listCmds(list.reg) + (modCmds.length ? "**Moderator Commands:**\n\n" : "") + listCmds(modCmds));
		});
	}
}