const getMembers = require("../util/getMembers");

module.exports = class {
	constructor() {
		this.perms = "BAN_MEMBERS";
		this.info = "Bans someone.";
		this.e = "ban";
		this.requiresGuild = true;
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			params = params.split(" ");
			const member = getMembers(params.shift(), msg.guild),
				reason = params.join(" ");
			if(!member)return resolve("I cannot ban a nobody.");
			resolve(member.ban(reason).then(() => "Successfully banned " + member + (reason ? " due to `" + reason + "`" : " with no reason") + "."));
		});
	}
}