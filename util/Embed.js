const { RichEmbed } = require("discord.js"),
	s_user = Symbol("user");

module.exports = class Embed extends RichEmbed {
	constructor(user, data) {
		super(data);
		this[s_user] = user;
		Embed.setup(this, user);
	}
	static setup(embed, user) {
		embed.setAuthor()
			.setFooter()
			.setTimestamp()
			.setColor("RANDOM");
	}
	setAuthor(name = "", avatar, url) { // avatar will not be used.
		return super.setAuthor(name, this[s_user].avatarURL, url);
	}
	setFooter(text, icon) {
		return super.setFooter(`Requested by ${ this[s_user].tag }${ text ? " | " + text : "" }`);
	}
}