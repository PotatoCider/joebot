const
	[ { RichEmbed }, ytdl, getYoutubeId, request, resolveTime, randomColor, { yt_api_key }, images ]
		= require("../../util/loadModules.js")("discord.js", "ytdl-core", "get-youtube-id", "request-promise", "resolveTime", "randomColor", "./config", "./images"),


	youtubeSearch = query => new Promise(resolve => {
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
					url: `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${ encodeURIComponent(id || query) }&key=${ yt_api_key }`,
					json: true
				};

			request(options).then(body => {
				const items = body.items;
				resolve(id || items.length === 1 ? items[0] : items)
			});
		}
	});

module.exports = class {
	constructor() {
		this.aliases = ["p"];
	}

	run(music, message, query, flags) {
		return new Promise(resolve => {
			const 
				playTrack = connection => {
					const vid = music.queue.shift(),
						stream = ytdl("https://www.youtube.com/watch?v=" + (vid.id || vid.snippet.resourceId).videoId, { filter: "audioonly" });
					music.nowPlaying = vid;
					music.dispatcher = connection.playStream(stream).once("end", () => {
						if(music.repeat && music.nowPlaying)music.queue.push(music.nowPlaying);
							else music.djs.shift();
						music.nowPlaying = music.dispatcher = null;
						if(music.queue.length)return playTrack(connection);
						connection.channel.leave();
						music.textChannel.send("End of queue.").then(msg => msg.delete(7500));
					});
					music.textChannel.send(`**Now playing: \`${ vid.snippet.title }\` by** ${ vid.snippet.channelTitle }.`).then(msg => msg.delete(10000));
				},
				queueAdd = (vid, { r, m, msg, mDelete, reply, list } = {}) => {
					if(r){
						r.stop();
						m.stop();
						msg.delete();
						message.delete();
						clearTimeout(mDelete);
						if(reply)reply.delete();
					}
					if(!vid)return resolve({ content: "Music selection cancelled.", delete: 3000 });
					let content = "";
					if(vid !== "play"){
						const 
							mem = message.member.id,
							queuePush = vid => { 
								music.queue.push({ ...vid, dj: mem });
								music.djs.push(mem);
							};
						music.textChannel = message.channel;
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
					if(!music.nowPlaying)(vc || selfVc).join().then(connection => playTrack(connection, message.channel));
				},
				vc = message.member.voiceChannel,
				selfVc = message.guild.me.voiceChannel,
				options = ["1⃣","2⃣","3⃣","4⃣","5⃣","❌"];
			if(music.queue.length && !query && !music.nowPlaying)return queueAdd("play");
			if(!query)return resolve("You must provide a link/title to play a video!");
			youtubeSearch(query, 5).then(results => {

				if(typeof results === "string")return resolve({ content: results, delete: 7500 });
				if(results.playlist)return queueAdd(results.items, { list: true });
				if(!(results instanceof Array))return queueAdd(results);
				if(!results.length)return resolve("No results found.");
				flags = flags.filter(n => n >= 1 && n <= 5);
				if(flags.length)return queueAdd(results[flags[0] - 1]);

				const embed = new RichEmbed()
					.setAuthor("Youtube", images.yt) 
					.setFooter(`This selection will timeout in 15 seconds. Type "cancel" to cancel | Requested by ${ message.author.tag }`)
					.setThumbnail(images.music)
					.setColor(randomColor());
				for(let i = 0; i < results.length; i++){
					const result = results[i].snippet;
					embed.addField(`**Option ${ options[i] }**:`, `**[${ result.title }](https://www.youtube.com/watch?v=${ results[i].id.videoId }) by** [${ result.channelTitle }](https://www.youtube.com/channel/${ result.channelId })`); 
				}
				message.channel.send({ embed: embed }).then(msg => { 
					const 
						setOptions = (i = 0) => msg.react(options[i]).then(() => i < results.length ? setOptions(i+1) : null),
						r = msg.createReactionCollector( 
							(reaction, user) => options.includes(reaction.emoji.name) && user.id === message.author.id,
							{ time: 15000 }
						),
						m = msg.channel.createMessageCollector(
							msg => msg.author.id === message.author.id && msg.content >= 1 && msg.content <= 5 && !(msg.content % 1) || msg.content === "cancel",
							{ time: 15000 }
						),
						mDelete = setTimeout(() => {
							msg.clearReactions();
							msg.edit("Music selection has timed out.", { embed: {} });
							msg.delete(7500);
						}, 15000);
					setOptions();
					r.once("collect", reaction => queueAdd(results[reaction.emoji.name.slice(0, 1) - 1], { r, m, msg, mDelete }));
					m.once("collect", reply => queueAdd(results[reply.content - 1], { r, m, msg, mDelete, reply }));
				});
			});
		});
	} 
};

