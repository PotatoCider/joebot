module.exports = (mentions, guild) => {
	let members = [];
	if(typeof mentions === "string")members = guild.member(mentions.replace(/\D/g, ""));
		else for(let i = 0; i < mentions.length; i++)members[i] = guild.member(mentions[i].replace(/\D/g, ""));
	return members;
};