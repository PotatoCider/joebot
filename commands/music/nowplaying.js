const [ Embed, { resolveDuration, resolveIsoDate }, images, ytTopics ]
	= require("../../util/loadModules.js")("Embed", "time", "./images.json", "./ytTopics.json");

module.exports = class {
	constructor() {
		this.aliases = ["np"];
	}

	run(music, msg) {
		const np = music.nowPlaying;
		if(!np)return "There is nothing playing now.";
		const embed = new Embed(msg.author)
			.setAuthor("Youtube")
			.setImage(np.thumbnail)
			.addField(np.live ? "Stream" : "Video", `**[${ np.title }](https://www.youtube.com/watch?v=${ np.id })**`)
			.addField("Channel", `[${ np.channelTitle }](https://www.youtube.com/channel/${ np.channelId })`, true)
			.addField(
				np.live ? "Started Streaming on" : np.actualEndTime ? "Streamed on" : "Date Published",
				resolveIsoDate(np.live ? np.actualStartTime : np.actualEndTime || np.publishedAt), 
				true
			)
			.addField(np.live ? "Watching" : "Views", (+np[np.live ? "concurrentViewers" : "viewCount"]).toLocaleString(), true)
			.addField("Comments", !np.live && (+np.commentCount).toLocaleString(), true)
			.addField("Current Time", np.live ? "Live" : resolveDuration({ ms: music.dispatcher.time, format: { s:1, m: 1, h:1, d:1 } }) || "0s", true)
			.addField("Total Time", !np.live && (resolveDuration({ iso: np.duration, format: { s:1, m:1, h:1, d:1 }}) || "0s"), true)
			.addField("Category", ytTopics[np.categoryId], true)
			.addField("Likes", (+np.likeCount).toLocaleString(), true)
			.addField("Dislikes", (+np.dislikeCount).toLocaleString(), true);
		msg.channel.send(embed);
	}
}