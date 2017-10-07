const getMembers = require("../util/getMembers.js");

module.exports = class {
	constructor() {
		this.perms = "MANAGE_NICKNAMES";
		this.info = "Changes someone's nick.";
		this.e = "nick";
		this.requiresGuild = true;
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			params = params.split(" ");
			const member = getMembers(params.shift(), msg.guild),
				nick = params.join(" ");
			if(!member)return resolve("Changed nobody's nick.");
			resolve(member.setNickname(nick).then(mem => `${ nick ? "Changed" : "Resetted" } ${ mem.user.tag }'s nickname${ nick ? " to " + nick : "" }.`));
		});
	}
}