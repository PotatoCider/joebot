const
	[ Discord, ytdl, fetchYoutubeInfo, getYoutubeId, request, resolveTime, randomColor, { yt_api_key }, images ]
		= require("../util/loadModules")("discord.js", "ytdl-core", "youtube-info", "get-youtube-id", "request-promise", "resolveTime", "randomColor", "./config", "./images");

	musicCmds = { // Add Perms
		play: (music, message, query, flags) => new Promise(resolve => { 
			const 
				vc = message.member.voiceChannel,
				selfVc = message.guild.me.voiceChannel,
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
				}),
				playTrack = (connection) => {
					const vid = music.queue.shift(),
						stream = ytdl("https://www.youtube.com/watch?v=" + (vid.id || vid.snippet.resourceId).videoId, { filter: "audioonly" });
					music.nowPlaying = vid;
					music.dispatcher = connection.playStream(stream).once("end", () => {
						if(music.repeat && music.nowPlaying)music.queue.push(music.nowPlaying);
						music.nowPlaying = music.dispatcher = null;
						if(music.queue.length)return playTrack(connection);
						connection.channel.leave();
						music.textChannel.send("End of queue.").then(msg => msg.delete(7500));
					});
					music.textChannel.send(`**Now playing: \`${ vid.snippet.title }\` by** ${ vid.snippet.channelTitle }.`).then(msg => msg.delete(10000));
				}
				queueAdd = (vid, r, m, msg, mDelete, reply) => {
					if(r){
						clearTimeout(mDelete);
						r.stop();
						m.stop();
						msg.delete();
						reply.delete();
						message.delete();
					}
					if(!vid)return resolve({ content: "Music selection cancelled.", delete: 3000 });
					let content = "";
					if(vid !== "play"){
						const len = music.queue.length;
						music.queue.push({ ...vid, dj: message.member });
						music.textChannel = message.channel;
						content = `**Added to queue: \`${ vid.snippet.title }\` by** ${ vid.snippet.channelTitle }.`;
					}
					if(!vc && !selfVc)return resolve({ content: content + "\n\nYou/I must be in a voice channel first!", delete: 15000 });
					if(!vc.joinable)return resolve({ content: content + "\n\nNo permission to join your current voice channel.", delete: 15000 });
					resolve({ content: content, delete: 5000 });
					(vc || selfVc).join().then(connection => music.nowPlaying ? null : playTrack(connection, message.channel));
				},
				playlistAdd = (videos) => {
					music.queue.push(...videos);
					const content = queueAdd("play");
					resolve({ content: `Added **${ videos.length } items** to queue from https://www.youtube.com/playlist?list=${ videos[0].snippet.playlistId }\n${ content }`});
				},	
				options = ["1⃣","2⃣","3⃣","4⃣","5⃣","❌"];
			if(music.queue.length && !query && !music.nowPlaying)return queueAdd("play");
			if(!query)return resolve("You must provide a link/title to play a video!");
			youtubeSearch(query, 5).then(results => { // Add multiple pages
				if(typeof results === "string")return resolve({ content: results, delete: 7500 });
				if(results.playlist)return playlistAdd(results.items);
				if(!(results instanceof Array))return queueAdd(results);
				if(!results.length)return resolve("No results found.");
				flags = flags.filter(n => n >= 1 && n <= 5);
				if(flags.length)return queueAdd(results[flags[0] - 1]);
				const embed = new Discord.RichEmbed()
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
					r.once("collect", reaction => queueAdd(results[reaction.emoji.name.slice(0, 1) - 1], r, m, msg, mDelete));
					m.once("collect", reply => queueAdd(results[reply.content - 1], r, m, msg, mDelete, reply));
				});
			});
		}),
		skip: (music, msg, i, flags) => { // TODO: Add Permissions
			if(i && i !== "0"){
				if(isNaN(i) || i < 1 || i > music.queue.length)return "Please choose a valid index.";
				music.queue.splice(i - 1, 1);
				return `Removed **\`${ music.queue[i - 1].snippet.title }\`** from queue.`;
			}
			if(!music.nowPlaying)return "No songs currently playing";
			let content = `Skipped **\`${ music.nowPlaying.snippet.title }\`**.`;
			music.nowPlaying = false;
			music.dispatcher.end();
			if(music.repeat)music.queue.pop();
			return {content: content, delete: 5000};
		},
		queue: music => { // TODO: RICH EMBED THIS
			const queue = music.queue,
				np = musicCmds.nowplaying(music);
			let message = (music.nowPlaying ? np : "") + (music.queue.length ? "" : "Queue is empty.");
			for(let i = 0; i < queue.length; i++){
				const vid = queue[i].snippet;
				message += `**${ i+1 }**: **\`${ vid.title }\` by** ${ vid.channelTitle }\n`;
			}
			return message;
		},
		nowplaying: (music, msg) => {
			const np = music.nowPlaying;
			if(!np)return "There is nothing playing now.";
			const snippet = np.snippet;
			if(!msg)return `**Now playing**: **\`${ snippet.title }\` by** ${ snippet.channelTitle }\n\n`;
			fetchYoutubeInfo((np.id || snippet.resourceId).videoId).then(vid => {
				const embed = new Discord.RichEmbed()
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
				msg.channel.send({ embed: embed });
			});
		},
		repeat: music => ({ content: `:notes: | Music is no${ (music.repeat ^= true) ? "w" : " longer" } on repeat!`, delete: 5000 }),
		leave: (music, msg) => {
			const vc = msg.guild.me.voiceChannel
			if(!vc)return "No voice channel to leave.";
			let content;
			music.queue = [];
			music.nowPlaying = false;
			if(music.dispatcher)music.dispatcher.end();
			vc.join().then(connection => connection.channel.leave());
			return content;
		},
		pause: music => music.dispatcher.pause(),
		resume: music => music.dispatcher.resume(),
		get p(){ return this.play; },
		get s(){ return this.skip; },
		get q(){ return this.queue; },
		get np(){ return this.nowplaying; },
		get clear(){ return this.leave; },
		get stop(){ return this.leave; },
		get continue(){ return this.resume; }
	};
 
let servers;

module.exports = class {
	constructor({ client, guilds }) {
		servers = guilds;
		const ids = client.guilds.keys();
		if(!Object.keys(guilds).length)for(const id of ids)this.setup(id);
		this.info = "Play music.";
		this.requiresGuild = true;
		this.selfPerms = ["MANAGE_MESSAGES", "ADD_REACTIONS"];
		this.aliases = ["m"];
	}

	setup(id, del) {
		if(del)delete servers[id];
			else servers[id] = { music: { queue: [] } };
	}

	vcUpdate(mem) {
		const music = servers[mem.guild.id].music;
		if(!mem.voiceChannel || !music.queue.length || music.queue[0].dj !== mem)return;
		musicCmds.play(music, { member: mem, guild: mem.guild }, "", [])
	}

	run(msg, params, flags) {
		return new Promise(resolve => {	
			params = params.split(" ");
			const musicCmd = musicCmds[params.shift().toLowerCase()];
			msg.delete();
			resolve(musicCmd ? musicCmd(servers[msg.guild.id].music, msg, params.join(" "), flags) : "Invalid music commmand.");
		});
		
	}
};