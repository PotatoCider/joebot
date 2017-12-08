const
	[ Pages, ytdl, youtube, { resolveDuration }, images ] = require("../../util/loadModules.js")
	("Pages", "ytdl-core", "youtube", "time", "./images"),

	playTrack = (music, connection) => {
		const vid = music.queue.shift(),
			stream = ytdl("https://www.youtube.com/watch?v=" + vid.id, { filter: "audioonly" });
		console.log("Youtube stream started: " + vid.title);
		music.nowPlaying = vid;

		music.dispatcher = connection.playStream(stream).once("end", () => {
			console.log("Stream ended: " + vid.title);
			if(music.repeat)music.queue.push(vid);
			music.nowPlaying = music.dispatcher = null;
			if(music.queue.length)return playTrack(music, connection);
			connection.channel.leave();
			
			vid.channel.send("End of queue.").then(msg => msg.delete(10000));
		}).on("debug", info => console.log("Dispatcher DEBUG: " + info)).on("error", err => console.log("Dispatcher ERROR: " + err));
		connection.on("debug", info => console.log("Connection DEBUG: " + info))
		.on("warn", info => console.log("Connection WARN: " + info))
		.on("error", err => console.log("Connection ERROR: " + err));

		vid.channel.send(`**Now playing: \`${ vid.title }\` by** ${ vid.channelTitle }.`).then(msg => msg.delete(10000));
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
					if(vid instanceof Array){
						for(const v of vid)queuePush(v);
						content = `Added **${ vid.length } items** to queue from https://www.youtube.com/playlist?list=${ vid[0].playlistId }`;
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
			const i = page * 5;
			return (() => {
				const sliced = vids.slice(i, i + 5);
				if(typeof vids[i] !== "string")return Promise.resolve(sliced);
				return youtube.fetchVideoInfo(sliced, { maxResults: 5 });
			})().then(info => {

				vids.splice(i, i + 5, ...info);
				embed.setAuthor("Youtube") 
				.setThumbnail(images.music)
				.setFooter(`Reply a number to choose or "cancel" to cancel`);
				for(let i = 0; i < 5; i++){
					const vid = info[i];
					embed.addField(`**Option ${ i+1 }**:`, `**[${ vid.title }](https://www.youtube.com/watch?v=${ vid.id }) (${ resolveDuration({ iso: vid.duration, yt: true }) }) by** [${ vid.channelTitle }](https://www.youtube.com/channel/${ vid.channelId })`); 
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
	}

let commands;

module.exports = class {
	constructor(cmds) {
		commands = cmds;
		this.aliases = ["p"];
	}

	run(music, message, query, flags) {
		return new Promise(resolve => {
			const queueAdd = initQueueAdd(message, music, resolve);
			if(music.queue.length && !query && !music.nowPlaying)return queueAdd("play");
			if(music.dispatcher && music.dispatcher.paused)return resolve(commands.resume.run(music));
			if(!query)return resolve("You must provide a title/link to play a video!");
			const selection = ~~flags.find(n => n >= 1 && n <= 50);
			youtube.search(
				query, 
				selection ? { maxResults: selection } : undefined
			).then(videoIds => {

				if(!selection)return videoIds;

				if(videoIds.length !== selection){ // results.length should be equal to selection.
					resolve("Selection out of range."); 
					return []; // Following .then will return immediately due to empty array. Note: Promises only resolve once.
				}
				return [videoIds.pop()];
			}).then(results => {
				if(!results.length)return resolve("Sorry, no results found."); 
				if(results.length === 1)return youtube.fetchVideoInfo(results).then(info => queueAdd(info[0]));

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
						limit: 10
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

