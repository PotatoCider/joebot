const [ { RichEmbed }, fetchYoutubeInfo, randomColor, resolveTime, images ]
	= require("../../util/loadModules.js")("discord.js", "youtube-info", "randomColor", "resolveTime", "./images.json");

module.exports = class {
	constructor() {
		this.aliases = ["np"];
	}

	run(music, msg) {
		const np = music.nowPlaying;
		if(!np)return "There is nothing playing now.";
		const snippet = np.snippet;
		if(!msg)return `**Now playing**: **\`${ snippet.title }\` by** ${ snippet.channelTitle }\n\n`;
		fetchYoutubeInfo((np.id || snippet.resourceId).videoId).then(vid => {
			const embed = new RichEmbed()
				.setAuthor("Youtube", images.yt)
				.setThumbnail(vid.thumbnailUrl)
				.setColor(randomColor())
				.setFooter(`Requested by ${ msg.author.tag }`)
				.addField("Video", `**[${vid.title}](${vid.url})**`)
				.addField("Owner", vid.owner, true)
				.addField("Views", vid.views, true)
				.addField("Genre", vid.genre, true)
				.addField("Total Time", resolveTime({ s: vid.duration, format: { s:1, m:1, h:1, d:1 }}), true)
				.addField("Current Time", resolveTime({ ms: music.dispatcher.time, format: { s:1, m: 1, h:1, d:1 } }) || "0s", true);
			msg.channel.send({ embed });
		});
	}
}