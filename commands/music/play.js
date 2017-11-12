const
	[ Pages, ytdl, getYoutubeId, request, awaitUserReaction, resolveTime, { yt_api_key }, images ]
		= require("../../util/loadModules.js")("Pages", "ytdl-core", "get-youtube-id", "request-promise", "awaitUserReaction", "resolveTime", "./config", "./images"),


	youtubeSearch = (query, page) => new Promise(resolve => {
		const isPlaylist = query.includes("youtube.com/playlist?");
		if(isPlaylist){
			const
				index = query.indexOf("list=") + 5,
				id = query.slice(index, index + 34);

			if(id.length !== 34 || id.includes("&"))return resolve("Invalid playlist.");
			const options = { 
					url: `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${ encodeURIComponent(id) }&key=${ yt_api_key }&fields=items(snippet(channelId%2CchannelTitle%2CplaylistId%2CresourceId%2FvideoId%2Ctitle))`, 
					json: true 
				};
				
			request(options).then(body => {
				resolve({ items: body.items, playlist: true });
			});
		}else{
			const 
				id = getYoutubeId(query, { fuzzy: false }),
				options = {
					url: `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=50${ page ? `&pageToken=${ page }` : "" }&q=${ encodeURIComponent(id || query) }&key=${ yt_api_key }`,
					json: true
				};

			request(options).then(body => {
				const items = body.items;
				resolve(id || items.length === 1 ? items[0] : items);
			});
		}
	}),

	playTrack = (music, connection) => {
		const vid = music.queue.shift(),
			stream = ytdl("https://www.youtube.com/watch?v=" + (vid.id || vid.snippet.resourceId).videoId, { filter: "audioonly" });
		music.nowPlaying = vid;

		music.dispatcher = connection.playStream(stream).once("end", () => {
			if(music.repeat && music.nowPlaying)music.queue.push(music.nowPlaying);
			music.nowPlaying = music.dispatcher = null;

			if(music.queue.length)return playTrack(music, connection);
			connection.channel.leave();

			vid.channel.send("End of queue.").then(msg => msg.delete(7500));
		});
		vid.channel.send(`**Now playing: \`${ vid.snippet.title }\` by** ${ vid.snippet.channelTitle }.`).then(msg => msg.delete(10000));
	},

	createSelection = (embed, vids, page = 0) => {
		embed.setAuthor("Youtube") 
		.setThumbnail(images.music)
		.setFooter(`Reply a number to choose or "cancel" to cancel`);
		const lastStop =  page * 5 + 5;
		for(let i = page*5, c = 1; i < lastStop; i++, c++){
			const vid = vids[i].snippet;
			embed.addField(`**Option ${ c }**:`, `**[${ vid.title }](https://www.youtube.com/watch?v=${ vids[i].id.videoId }) by** [${ vid.channelTitle }](https://www.youtube.com/channel/${ vid.channelId })`); 
		}
	};

module.exports = class {
	constructor() {
		this.aliases = ["p"];
	}

	run(music, message, query, flags) {
		return new Promise(resolve => {
			const 
				queueAdd = (vid, { m, msg, reply, list } = {}) => {
					if(msg){
						m.stop();
						msg.delete();
						reply.delete();
					}
					if(!vid)return resolve({ content: "Music selection cancelled.", delete: 3000 });
					let content = "";
					if(vid !== "play"){
						const 
							mem = message.member.id,
							queuePush = vid => music.queue.push({ ...vid, dj: mem, channel: message.channel });
						if(list){
							for(const v of vid)queuePush(v);
							content = `Added **${ vid.length } items** to queue from https://www.youtube.com/playlist?list=${ vid[0].snippet.playlistId }`;
						}else{
							queuePush(vid);
							content = `**Added to queue: \`${ vid.snippet.title }\` by** ${ vid.snippet.channelTitle }.`;
						}
					}
					if(!vc && !selfVc)return resolve({ content: content + "\n\nPlease join a voice channel!", delete: 15000 });
					if(vc && !vc.joinable)return resolve({ content: content + "\n\nNo permission to join this voice channel. Please join another voice channel!", delete: 15000 });
					resolve({ content, delete: 5000 });
					if(!music.nowPlaying)(vc || selfVc).join().then(connection => playTrack(music, connection));
				},
				awaitSelection = (msg, results, page) => {
					const m = msg.channel.createMessageCollector(
						msg => msg.author.id === message.author.id && msg.content >= 1 && msg.content <= 5 && !(msg.content % 1) || msg.content === "cancel",
						{ time: 20000 }
					).once("collect", reply => queueAdd(results[reply.content - 1 + page * 5], { m, msg, reply }));
					return m;
				},
				vc = message.member.voiceChannel,
				selfVc = message.guild.me.voiceChannel,
				options = ["1⃣","2⃣","3⃣","4⃣","5⃣","❌"];
			if(music.queue.length && !query && !music.nowPlaying)return queueAdd("play");
			if(!query)return resolve("You must provide a link/title to play a video!");
			youtubeSearch(query).then(results => {
				if(typeof results === "string")return resolve({ content: results, delete: 7500 });
				if(results.playlist)return queueAdd(results.items, { list: true });

				if(!(results instanceof Array))return queueAdd(results);
				if(!results.length)return resolve("Sorry, no results found.");

				flags = flags.filter(n => n >= 1 && n <= 5);
				if(flags.length)return queueAdd(results[flags[0] - 1]);

				let collector;
				const pages = new Pages(message, {
					change: (page, msg) => {
						createSelection(pages, results, page);
						collector.stop();
						collector = awaitSelection(msg, results, page);
					},
					onceTimeout: msg => {
						msg.edit("Music selection timed out.", { embed: {} })
							.then(msg => msg.delete(5000));
					},
					onSelect: reaction => {
						if(reaction.emoji.name !== "❌")return;
						pages.stopWatching();
						collector.stop();
						reaction.message.edit("Music selection cancelled.", { embed: {} }).then(msg => msg.delete(5000));
					},
					timeout: 20000,
					options: [...Pages.options.slice(0, -1), "❌"],
					limit: 10
				});
				createSelection(pages, results);
				pages.send(`This selection will timeout in 20 seconds.`).then(msg => {
					collector = awaitSelection(msg, results, 0);
				});
			});
		});
	} 
};

