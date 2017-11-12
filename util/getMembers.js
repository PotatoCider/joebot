const fetchMember = (mention, guild) => guild.fetchMember(mention.replace(/<@!?([0-9]+)>/, "$1"));

module.exports = (mentions, guild) => {
	if(mentions instanceof Array){
		mentions.map(mention => fetchMember(mention, guild));
		return Promise.all(mentions);
	}else return fetchMember(mentions, guild);
};