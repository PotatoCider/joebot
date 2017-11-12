const [ getMembers ] = require("../util/loadModules.js")("getMembers");

module.exports = class {
	constructor() {
		this.perms = "MANAGE_NICKNAMES";
		this.info = "Changes someone's nick.";
		this.e = "nick";
		this.requiresGuild = true;
		this.mod = true;
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			params = params.split(" ");
			const mention = params.shift(),
				nick = params.join(" ");
				
			getMembers(mention, msg.guild).then(member => {
				if(!member)return resolve("Changed nobody's nick.");
				resolve(member.setNickname(nick).then(mem => `${ nick ? "Changed" : "Resetted" } ${ mem }'s nickname${ nick ? ` from ${ mem.displayName } to ${ nick }.` + nick : "" }.`));
			});
		});
	}
}