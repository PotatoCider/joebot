module.exports = class {
	constructor() {
		this.info = "Shows amount of members in a guild."
		this.aliases = ["size", "motd", "total"];
		this.requiresGuild = true;
	}

	run(msg, params, flags) {
		return `The amount of members in the guild is ${ msg.guild.memberCount }`;
	}
}