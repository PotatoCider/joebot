const [ getMembers ] = require("../util/loadModules.js")("getMembers");

module.exports = class {
	constructor() {
		this.perms = "KICK_MEMBERS";
		this.info = "Kicks someone.";
		this.e = "kick";
		this.requiresGuild = true;
		this.mod = true;
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			params = params.split(" ");
			const mention = params.shift(),
				reason = params.join(" ");
				
			getMembers(mention, msg.guild).then(member => {
				if(!member)return resolve("I kicked air.");
				resolve(member.kick(reason).then(() =>"Successfully kicked " + member + (reason ? " due to `" + reason + "`" : " with no reason") + "."));
			});
		});
	}
}