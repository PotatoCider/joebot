const [ Embed, { resolveDuration, resolveDate }, images, ytTopics ]
	= require("../../util/loadModules.js")("Embed", "time", "./images.json", "./ytTopics.json");

module.exports = class {
	constructor() {
		this.aliases = ["np"];
	}

	run(music, msg) {
		const np = music.nowPlaying;
		if(!np)return "There is nothing playing now.";
		if(!msg)return `**Now playing**: **\`${ np.title }\` by** ${ np.channelTitle }\n\n`;
		const embed = new Embed(msg.author)
			.setAuthor("Youtube")
			.setImage(np.thumbnail)
			.addField("Video ", `**[${ np.title }](https://www.youtube.com/watch?v=${ np.id })**`)
			.addField("Channel", `[${ np.channelTitle }](https://www.youtube.com/channel/${ np.channelId })`, true)
			.addField("Views", (+np.viewCount).toLocaleString(), true)
			.addField("Comments", (+np.commentCount).toLocaleString(), true)
			.addField("Current Time", resolveDuration({ ms: music.dispatcher.time, format: { s:1, m: 1, h:1, d:1 } }) || "0s", true)
			.addField("Total Time", resolveDuration({ iso: np.duration, format: { s:1, m:1, h:1, d:1 }}) || "0s", true)
			.addField("Date Published", resolveDate(np.publishedAt), true)
			.addField("Category", ytTopics[np.categoryId], true)
			.addField("Likes", (+np.likeCount).toLocaleString(), true)
			.addField("Dislikes", (+np.dislikeCount).toLocaleString(), true);
		msg.channel.send(embed);
	}
}