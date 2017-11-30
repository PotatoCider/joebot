const [ getMembers ] = require("../util/loadModules.js")("getMembers");

module.exports = class {
	constructor() {
		this.perms = "BAN_MEMBERS";
		this.info = "Bans someone.";
		this.e = "ban";
		this.requiresGuild = true;
		this.mod = true;
	}

	run(msg, params, flags) { // Use <Guild> Object method .ban
		return new Promise(resolve => {
			params = params.split(" ");
			const mention = params.shift(),
				reason = params.join(" ");
			
			getMembers(mention, msg.guild).then(member => {
				if(!member)return resolve("I cannot ban a nobody.");
				resolve(member.ban(reason).then(() => "Successfully banned " + member + (reason ? " due to `" + reason + "`" : " with no reason") + "."));
			});
		});
	}
}