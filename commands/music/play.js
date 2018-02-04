const
	[ Pages, ytdl, youtube, getPlaylistId, getVideoId, { resolveDuration, resolveIsoDate }, images, errorHandler ] = require("../../util/loadModules.js")
	("Pages", "ytdl-core", "youtube", "getPlaylistId", "get-youtube-id", "time", "./images", "error"),

	playTrack = (music, connection) => {
		
		const vid = music.queue.shift();
		if(vid.upcoming)return resolve({ content: `This livestream is still upcoming. It will be live on ${ resolveIsoDate(vid.scheduledStartTime) } UTC.`, delete: 60000 });
		const stream = ytdl(
				"https://www.youtube.com/watch?v=" + vid.id, 
				vid.live ? {} : { filter: "audioonly" }
			);
		music.nowPlaying = vid;

		music.dispatcher = connection.playStream(stream).once("end", () => {
			if(music.repeat)return music.queue.push(vid);
			if(music.queue.length)return setTimeout(() => playTrack(music, connection), 5);

			music.nowPlaying = music.dispatcher = null;
			connection.channel.leave();
			vid.channel.send("End of queue.").then(msg => msg.delete(10000));
		});

		vid.channel.send(`**Now ${ vid.live ? "Streaming" : "Playing" }: \`${ vid.title }\` by** ${ vid.channelTitle }.`).then(msg => msg.delete(10000));
	},

	initQueueAdd = (message, music, resolve) => {
		const vc = message.member.voiceChannel,
			selfVc = message.guild.me.voiceChannel,
			queueAdd = (vid, { m, sent, reply } = {}) => {
				if(m)m.stop();
				if(sent)sent.delete();
				if(reply)reply.delete();
				if(!vid)return resolve({ content: "Music selection cancelled.", delete: 3000 });
				let content = "";
				if(vid !== "play"){
					const queuePush = vid => music.queue.push(Object.assign(vid, { dj: message.member.id, channel: message.channel }));
					if(vid.length === 1)vid = vid[0];
					if(vid instanceof Array){
						for(let i = 0; i < vid.length; i++)queuePush(vid[i]);
						content = `Added **${ vid.length } items** to queue from https://www.youtube.com/playlist?list=${ vid[0].id }`;
					}else{
						queuePush(vid);
						content = `**Added to queue: \`${ vid.title }\` by** ${ vid.channelTitle }.`;
					}
				}
				if(!vc && !selfVc)return resolve({ content: content + "\n\nPlease join a voice channel!", delete: 15000 });
				if(vc && !vc.joinable)return resolve({ content: content + "\n\nNo permission to join this voice channel. Please join another voice channel!", delete: 15000 });
				resolve({ content, delete: 5000 });
				if(!music.nowPlaying)(vc || selfVc).join().then(connection => playTrack(music, connection));
			};
		return queueAdd;
	},

	initSelection = (embed, vids) => {
		const createSelection = page => {
			const i = page * 5,
				cached = typeof vids[i] === "object";
			return Promise.resolve().then(() => {
				const sliced = vids.slice(i, i + 5);
				if(cached)return sliced;
				return youtube.fetchVideoInfo(sliced, 5);
			}).then(info => {
				if(!cached)vids.splice(i, 5, ...info);
				embed.setAuthor("Youtube") 
				.setThumbnail(images.music)	
				.setFooter(`Reply a number to choose or "cancel" to cancel`);
				for(let j = 0; j < 5; j++){
					const vid = info[j];
					if(!vid)return;
					const duration = vid.live ? "Live" : vid.upcoming ? "Upcoming" : resolveDuration({ iso: vid.duration, yt: true });
					embed.addField(`**Option ${ j+1 }**:`, `**[${ vid.title }](https://www.youtube.com/watch?v=${ vid.id }) (${ duration }) by** [${ vid.channelTitle }](https://www.youtube.com/channel/${ vid.channelId })`); 
				}
			});
		};
		return createSelection(0).then(() => createSelection);
	},

	initCollector = (queueAdd, authorMsg, sent, results) => page => {
		const m = sent.channel.createMessageCollector(
			msg => msg.author.id === authorMsg.author.id && (msg.content >= 1 && msg.content <= 5 && !(msg.content % 1) || msg.content === "cancel"),
			{ time: 20000 }
		).once("collect", reply => queueAdd(results[reply.content - 1 + page * 5], { m, sent, reply }));
		return m;
	};

let commands;

module.exports = class {
	constructor(self) {
		this.aliases = ["p"];
		self.once("set", () => commands = self.commands.music.commands);
	}

	run(music, message, query, flags, forcePlaylist = false) {
		return new Promise(resolve => {
			const queueAdd = initQueueAdd(message, music, resolve);
			if(music.queue.length && !query && !music.nowPlaying)return queueAdd("play");
			if(music.dispatcher && music.dispatcher.paused)return resolve(commands.resume.run(music));
			if(!query)return resolve("You must provide a title/link to play a video/playlist!");
			if(flags.includes("playlist") || flags.includes("list"))forcePlaylist = true;
			const selection = ~~flags.find(n => n >= 1 && n <= 50),
				playlist = getPlaylistId(query),
				video = getVideoId(query, { fuzzy: false });
			if(forcePlaylist && !playlist)return resolve("Invalid youtube playlist.");

			Promise.resolve(video || playlist || youtube.search(query, { maxResults: selection || 50 })).then(videoIds => {
				if(!forcePlaylist && video)return [video];
				if(playlist)return youtube.fetchPlaylist(playlist);

				if(!selection)return videoIds;

				if(videoIds.length !== selection){ // results.length should be equal to selection.
					return resolve("Selection out of range."); 
				}
				return [videoIds.pop()];
			}).then(results => {
				if(!results)return;
				if(!results.length){
					if(video)resolve("Invalid video link.");
					if(playlist)resolve("Empty/Invalid playlist.");
					resolve("No results found.");
					return;
				}
				if(playlist || results.length === 1)return youtube.fetchVideoInfo(results).then(info => queueAdd(playlist ? Object.assign(info, { playlistId: playlist }) : info[0]));
				let collector, awaitSelection, createSelection;

				const pages = new Pages(message, {
						change: (page, msg) => { 
							collector.stop();
							collector = awaitSelection(page);
							return createSelection(page);
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
						limit: Math.ceil(results.length / 5);
					});
				initSelection(pages, results).then(fn => {
					createSelection = fn;
					return pages.send(`This selection will timeout in 20 seconds.`);
				}).then(msg => {
					awaitSelection = initCollector(queueAdd, message, msg, results);
					collector = awaitSelection(0);
				});
			});
		});
	} 
};

