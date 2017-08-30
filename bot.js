const Discord = require('discord.js'),
	client = new Discord.Client(),
	fs = require('fs'),
	ytdl = require('ytdl-core'),
	fetchYoutubeInfo = require('youtube-info'),
	request = require('request'),
	EventEmitter = require('events');
let prefix, readyState = 0;
/*
	GitHub :D
	TODO: Add more commands like mute, 8ball, rate, remindme, urban, music, currency, slots, lotto, vote, repeat cmd(only certain commands like nick, role)
	Add Check position to mod commands.
	Add guild options.
	Custom prefixes for different guilds.
	Improve help command to further give info on how to use command.
	Create -debug command to debug all commands. 
	Use SQL Databases 
	Add Salary system(Using your daily energy)
		- Achievements
		- Education
		- Promotion (Done!)
	Add ignore channels
	When joined a guild, send message and tell the admins which commands need which permissions
*/
const cache = {
	update: key => new Promise(resolve => { 
		if(key){
			fs.writeFile(key + ".json", JSON.stringify(cache[key], null, "\t"), err => {
				if(err)errorHandler(err);
				resolve();
			});
		}else{
			const read = name => new Promise(resolve => {
				fs.readFile(name + ".json", "utf-8", (err, data) => {
					if(err)errorHandler(err);
					if(!data)throw new Error("File is empty or does not exist.");
					cache["__" + name] = JSON.parse(data);
					Object.defineProperty(cache, name, {
						get: function(){ return this["__" + name]; },
						set: function(obj){
							cache["__" + name] = obj;
							this.update(name);
						}
					});
					resolve();
				});
			});
			Promise.all([read("players"), read("jobs"), read("config"), read("images")]).then(resolve);
		}
	})
};
const guilds = {};
const randomColor = () => "#" + (~~(Math.random() * 16777215)).toString(16);
const convertTime = ({ms = 0, s = 0, m = 0, h = 0, d = 0}) => {
	s += ~~(ms / 1000);
	ms %= 1000;
	m += ~~(s / 60);
	s %= 60;
	h += ~~(m / 60);
	m %= 60;
	d += ~~(h / 24);
	h %= 24;
	return {ms:ms, s:s, m:m, h:h, d:d};
}
const musicCmds = { // CHECK PERMISSIONS FOR THIS COMMANDS!!11!!183u129dhe32dy32dg6732d!He2187d329u8
	play: (music, message, query) => new Promise(resolve => { // Add playlist support
		if(!query)return resolve("You must provide a link/title to play a video!");
		const youtubeSearch = (query, maxResults) => new Promise(resolve => {
			const endIndex = query.indexOf("&"),
				isUrl = query.includes("youtube.com/watch?v=");
			query = isUrl ? query.slice(query.indexOf("="), (endIndex + 1 || query.length + 1) - 1) : query;
			request(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${ maxResults }&q=${ encodeURIComponent(query) }&key=${ cache.config.yt_api_key }`, (err, res, body) => {
				if(err)errorHandler(err);
				const items = JSON.parse(body).items;
				if(isUrl || items.length === 1)return resolve(items[0]);
				resolve(items);
			});
		}),
			numbers = ["1⃣","2⃣","3⃣","4⃣","5⃣","❌"],
			queueAdd = (vid, vc, selfVc, r, m, msg, mDelete) => {
				if(r){
					clearTimeout(mDelete);
					r.stop();
					m.stop();
					msg.delete();
				}
				if(!vid)return resolve({ content: "Music selection cancelled.", delete: 3000 });
				if(!vc && !selfVc)return resolve({ content: "You/I must be in a voice channel first!", delete: 3000 });
				music.queue.push(vid);	
				(vc || selfVc).join().then(connection => music.nowPlaying ? null : music.emit("next", connection, message.channel));
				resolve({ content: `**Added to queue: \`${ vid.snippet.title }\` by** ${ vid.snippet.channelTitle }.`, delete: 3000 });
			};
		youtubeSearch(query, 5).then(results => {
			if(!results)return resolve("No results found.");
			if(!Array.isArray(results))return queueAdd(results, message.member.voiceChannel, message.guild.me.voiceChannel);
			const embed = new Discord.RichEmbed()
				.setAuthor("Youtube", cache.images.yt) // Add setAuthor
				.setFooter(`This selection will timeout in 15 seconds. Type "cancel" to cancel | Requested by ${ message.author.tag }`)
				.setThumbnail(cache.images.music)
				.setColor(randomColor());
			for(let i = 0; i < results.length; i++){
				const result = results[i].snippet;
				embed.addField(`**Option ${ numbers[i] }**:`, `**[${ result.title }](https://www.youtube.com/watch?v=${ results[i].id.videoId }) by** [${ result.channelTitle }](https://www.youtube.com/channel/${ result.channelId })`); 
			}
			message.channel.send({ embed: embed }).then(msg => { 
				const	setOptions = (i = 0) => msg.react(numbers[i]).then(() => i < results.length ? setOptions(i+1) : null).catch(e => e.message === "Unknown Message" ? null : errorHandler(e)),
					r = msg.createReactionCollector( 
						(reaction, user) => numbers.includes(reaction.emoji.name) && user.id === message.author.id,
						{ time: 15000 }
					),
					m = msg.channel.createMessageCollector(
						msg => msg.author.id === message.author.id && msg.content >= 1 && msg.content <= 5 && !(msg.content % 1) || msg.content === "cancel",
						{ time: 15000 }
					),
					vc = message.member.voiceChannel,
					selfVc = msg.guild.me.voiceChannel,
					mDelete = setTimeout(() => {
						msg.clearReactions();
						msg.edit("Music selection has timed out.", { embed: {} });
						msg.delete(5000);
					}, 15000);
				setOptions();
				r.once("collect", reaction => queueAdd(results[reaction.emoji.name.slice(0, 1) - 1], vc, selfVc, r, m, msg, mDelete));
				m.once("collect", message => queueAdd(results[message.content - 1], vc, selfVc, r, m, msg, mDelete));
			});
		});
	}),
	skip: music => { // TODO: Add Permissions + Skip at index n of queue
		if(!music.nowPlaying)return "No songs in queue to skip.";
		music.dispatcher.end();
	},
	queue: music => {
		const queue = music.queue;
		let message = musicCmds.nowPlaying(music);
		for(let i = 0; i < queue.length; i++){
			const vid = queue[i].snippet;
			message += `**${ i+1 }**: **\`${ vid.title }\` by** ${ vid.channelTitle }\n`;
		}
		return message;
	},
	nowplaying: (music, msg) => { // TODO: Add more infomation about video
		if(!music.nowPlaying)return "There is nothing playing now.";
		const np = music.nowPlaying.snippet;
		if(!msg)return `**Now playing**: **\`${ np.title }\` by** ${ np.channelTitle }\n\n`;
		fetchYoutubeInfo(music.nowPlaying.id.videoId).then(vid => {
			const { s:s, m:m, h:h, d:d } = convertTime({ s: vid.duration }),
				embed = new Discord.RichEmbed()
				.setAuthor("Youtube", cache.images.yt)
				.setThumbnail(vid.thumbnailUrl)
				.setColor(randomColor())
				.setFooter(`Requested by ${ msg.author.tag }`)
				.addField("Video", `**[${vid.title}](${vid.url})**`)
				.addField("Owner", vid.owner, true)
				.addField("Views", vid.views, true)
				.addField("Genre", vid.genre, true)
				.addField("Time", (d ? `${d}d ` : "") + (h ? `${h}h ` : "") + (m ? `${m}m ` : "") + (s ? `${s}s` : ""), true);
			msg.channel.send({ embed: embed });
		});
	},
	leave: (music, msg) => {
		const vc = msg.guild.me.voiceChannel;
		if(!vc)return "No voice channel to leave.";
		music.queue = [];
		if(music.dispatcher)music.dispatcher.end();
		vc.join().then(connection => connection.channel.leave());
	},
	get p(){ return this.play; },
	get s(){ return this.skip; },
	get q(){ return this.queue; },
	get np(){ return this.nowplaying; }
};
const setupMusic = id => {
	const guild = guilds[id] = { music: new EventEmitter() },
		music = guild.music;
	music.queue = [];
	music.on("next", (connection, channel) => {
		const music = guilds[channel.guild.id].music;
		const vid = music.queue.shift(),
			stream = ytdl("https://www.youtube.com/watch?v=" + vid.id.videoId, { filter: "audioonly" });
		music.nowPlaying = vid;
		music.dispatcher = connection.playStream(stream).once("end", () => {
			music.nowPlaying = music.dispatcher = false;
			if(music.queue.length)return music.emit("next", connection, channel);
			connection.channel.leave();
			channel.send("End of queue.");
		});
		channel.send(`**Now playing: \`${ vid.snippet.title }\` by** ${ vid.snippet.channelTitle }.`);
	});
};
const print = (channel, limit, i = 1) => channel.send(i).then(() => (i < limit) ? print(channel, limit, i+1) : null);
const getCommand = content => content.startsWith(prefix) ? content.slice(prefix.length, (content.indexOf(" ", prefix.length)+1 || content.length+1)-1) : "";
const processMsg = (content, cmd) => {
	const params = content.slice(prefix.length + cmd.length + 1).split(" ");
	const flags = [];
	for(let i = params.length - 1; i >= 0; i--){
		if(params[i].startsWith("--")){
			flags.push(params[i].slice(2));
			params.pop();
		}else break;
	}
	return {
		flags: flags,
		content: params.join(" ")
	};
};
const getMembers = (mentions, guild) => {
	let members = [];
	if(typeof mentions === "string")members = guild.member(mentions.replace(/\D/g, ""));
		else for(let i = 0; i < mentions.length; i++)members[i] = guild.member(mentions[i].replace(/\D/g, ""));
	return members;
};
const checkPerms = (perm, msg) => perm ? msg.guild.me.hasPermission(perm) : true;
const hasPerm = (mem, perm) => mem ? mem.hasPermission(perm) : false;
const errorHandler = (err, msg, e) => {
	if(!err ||
		err.message === "Provided too few or too many messages to delete. Must provide at least 2 and fewer than 100 messages to delete." ||
		err.message === "Cannot send an empty message"
	)return;
	if(err.message === "Privilege is too low..."){
		msg.channel.send(`Cannot ${ e } anyone higher than me.`);
		return true;
	}
	if(err.message === "Invalid Form Body\nnick: Must be 32 or fewer in length."){
		msg.channel.send("Too long nickname.")
		return true;
	}
	fs.appendFile("log.txt", `${ err.stack || err }\nCode: ${ err.code }\nDate: ${ Date() }\n\n`, error => { if(error)throw error; console.log("log updated"); });
	return false;
};
const accessPlayer = (id, isWorking, difference = 0) => {
	const addPlayer = (id, players) => {
		if(!players[id]){
			players[id] = {balance: 0, energyTimer: Date.now(), workExp: 0, job: cache.jobs.Unemployed, jobName: "Unemployed"};
			cache.players = players;
			return players[id];
		}else return false;
	};  
	const path = "players.json",
		time = Date.now(),
		players = cache.players,
		player = players[id] || addPlayer(id, players);
	let timeLeft = (player.energyTimer - time) / 300000;
	const energy = 100 - (~~timeLeft < 0 ? timeLeft = 0 : ~~timeLeft),
		energyRequired = player.job.energyRequired;
	if(difference !== 0 || isWorking){
		if(energy >= energyRequired){
			player.energyTimer = time + (timeLeft + energyRequired) * 300000;
			player.workExp += player.job.workExp;
			player.balance += difference || player.job.salary;
		}
		if(energy >= energyRequired)cache.players = players;
	}
	return {
		bal: player.balance,
		cooldown: energy < energyRequired,
		timeLeft: timeLeft,
		salary: player.job.salary,
		energyNeeded: energyRequired - energy,
		energy: energy - (isWorking ? player.job.energyRequired : 0),
		energyUsed: player.job.energyRequired,
		workExp: player.workExp,
		expGained: player.job.workExp,
		job: player.jobName,
		info: player,
		all: players
	};
};
const clearMsg = (channel, i) => channel.bulkDelete((i < 100) ? i : (i === 101) ? i++-2 : 100, true).then(() => (i > 100) ? clearMsg(channel, i-100) : null).catch(errorHandler);
const forceDelete = (messages, i = 0) => messages[i].delete().then(() => forceDelete(messages, i+1));
const commands = {
	// Mod Commands
	ban: {
		run: (msg, params) => new Promise(resolve => {
			params = params.split(" ");
			const member = getMembers(params.shift(), msg.guild),
				reason = params.join(" ");
			if(!member)return resolve("I cannot ban a nobody.");
			resolve(member.ban(reason).then(() => "Successfully banned " + member + (reason ? " due to `" + reason + "`" : " with no reason") + "."));
		}),
		perms: "BAN_MEMBERS",
		info: "Bans someone.",
		e: "ban"
	},
	kick: {
 		run: (msg, params) => new Promise(resolve => {
			params = params.split(" ");
			const member = getMembers(params.shift(), msg.guild),
				reason = params.join(" ");
			if(!member)return resolve("I kicked air.");
			resolve(member.kick(reason).then(() =>"Successfully kicked " + member + (reason ? " due to `" + reason + "`" : " with no reason") + "."));
		}),
		perms: "KICK_MEMBERS",
		info: "Kicks someone.",
		e: "kick"
	},
	role: {
		run: (msg, params) => new Promise(resolve => {
			params = params.split(" ");
			const member = getMembers(params.shift(), msg.guild),
				role = msg.guild.roles.find("name", params.join(" "));
			if(!member)return resolve("Edited nobody's role.");
			if(!role)return resolve("No such role.");
			const hasRole = member.roles.has(role.id);
			resolve(member[(hasRole ? "remove" : "add") + "Role"](role).then(() => member + " is no" + (hasRole ? " longer" : "w") + " a " + role + (hasRole ? "." : "!")));
		}),
		perms: "MANAGE_ROLES",
		info: "Add/Removes a role from a member.",
		e: "edit role of"
	},
	nick: {
		run: (msg, params) => new Promise(resolve => {
			params = params.split(" ");
			const member = getMembers(params.shift(), msg.guild),
				nick = params.join(" ");
			if(!member)return resolve("Changed nobody's nick.");
			resolve(member.setNickname(nick).then(mem => `${ nick ? "Changed" : "Resetted" } ${ mem.user.tag }'s nickname ${ nick ? "to " + nick : "" }.`));
		}),
		perms: "MANAGE_NICKNAMES",
		info: "Changes someone's nick.",
		e: "nick"
	},
	clear: {
		run: (msg, params, flags) => new Promise(resolve => {
			let param = params.split(" ")[0];
			if(isNaN(param) || param === "" || param.includes("."))return resolve("Pls give me a number ;-;");
			if(~~param > 2000 || param.length >= 10)return resolve("3 much work 5 me.");
			param = ~~param;
			if(flags.includes("force")){
				if(param > 99)return resolve("Cannot force delete less than 99 messages at a time.");
				msg.channel.fetchMessages({ limit: param+1 }).then(messages => forceDelete(Array.from(messages.values())));
			}
			clearMsg(msg.channel, param+1, resolve);
		}),
		perms: "MANAGE_MESSAGES",
		info: "Deletes x messages."
	},
	eval: {
		run: (msg, params, flags) => new Promise(resolve => { // TODO: --log flag for testing output operations.
			if(msg.author.id === "250140362880843776" || msg.author.id === "306031216208117760"){
				if(flags.includes("clear"))return fs.writeFile("log.txt", "", err => {
					if(err)throw err;
					resolve("Error log cleared.");
				});
				if(flags.includes("log"))return resolve(eval(`console.log(${ params });`));
				eval(params);
			}else resolve("You are not Joe >:(");
		}),
		info: "Only for Me :D",
		hide: true
	},
	mod: null,
	// Normal Commands
	music: {
		run: (msg, params) => new Promise(resolve => {
			params = params.split(" ");
			const musicCmd = musicCmds[params.shift().toLowerCase()];
			resolve(musicCmd ? musicCmd(guilds[msg.guild.id].music, msg, params.join(" ")) : "Invalid music command.");
		}),
		info: "Plays music.",
		requiresGuild: true
	},
	jobs: {
		run: (msg, params) => new Promise(resolve => {
			const player = accessPlayer(msg.author.id);
			if(params){
				const job = cache.jobs[params],
					players = cache.players;
				if(!job)return resolve("No such job.");
				if(player.workExp < job.workRequired)return resolve("You must have more work experience to qualify for this job!");
				players[msg.author.id].job = job;
				players[msg.author.id].jobName = params;
				cache.players = players;
				resolve(`You are now a ${ params }!`);
			}else{
				const jobs = cache.jobs;		
				let message = `Your current job is: **${ player.job }**\n\nAvaliable jobs are: \n\n`;
				for(const job in jobs){
					if(player.workExp < jobs[job].workRequired || player.job === job)continue;
					message += `**\`${ job }\`**:\n  **Salary**: ${ jobs[job].salary } pennies,\n  **Description**: ${ jobs[job].desc }\n\n`;
				}
				resolve(message);
			}
		}),
		info: "Job options.",
	},
	work: {
		run: msg => new Promise(resolve => {
			const player = accessPlayer(msg.author.id, true);
			if(player.cooldown){
				const m = ~~(player.energyRequired / 60),
					s = player.energyRequired % 60;
				resolve(`:moneybag: | You have to wait **${ (m ? m + " minute" + (m === 1 ? "" : "s") : "") + (m && s ? " and " : "") + (s ? s + " second" + (s === 1 ? "" : "s") : "") }** to work again.\nYour current energy level is ${ player.energy } and you need " + player.energyNeeded + " more energy to work.`);
			}else resolve(player.salary ? `:moneybag: | You worked hard and earned yourself ${ player.salary } pennies.\nYour current energy level is ${ player.energy }(-${ player.energyUsed } energy)(+${ player.expGained } Work Exp)` : "You are unemployed.");
		}),
		info: "You go work to earn some pennies."
	},
	energy: {
		run: msg => Promise.resolve(`You have ${ accessPlayer(msg.author.id).energy } energy.`),
		info: "Checks your energy(1 energy per 5 minutes)."
	},
	balance: {
		run: msg => Promise.resolve(`You have ${ accessPlayer(msg.author.id).bal } pennies.`),		
		info: "Checks your balance."
	},
	choose: {
		run: (msg, params) => new Promise(resolve => {
			const options = params.split(" | "),
				optionChosen = ~~(Math.random()*options.length);
			resolve(`I choose option ${ optionChosen+1 }: "${ options[optionChosen] }".`);
		}),
		info: "Chooses between options given."
	},
	dice: {
		run: () => Promise.resolve(`:game_die: | Rolled a ${ ~~(Math.random()*6+1) }.`),
		info: "Rolls a dice." 
	},
	reverse: {
		run: (msg, params) => Promise.resolve(params.split("").reverse().join("") || ".esrever ot gnihton evah I"),
		info: "Reverses a message."
	},
	flip: {
		run: (msg, params) => new Promise(resolve => {
			const param = params.split(" ")[0];
			if(param){
				if(isNaN(param))return resolve("Pls give me a number ;-;");
				if(param > 10000)return resolve("3 much flips 5 me.");
				let heads = 0, tails = 0;
				for(let i = 0; i < param; i++)~~(Math.random()*2) ? heads++ : tails++;
				resolve(`Flipped heads ${ heads } times\nFlipped tails ${ tails } times`);
			}else resolve(~~(Math.random()*2) ? "Heads!" : "Tails!");
		}),
		info: "Flips a coin, input a number for x coinflips."
	},
	say: {
		run: (msg, params) => Promise.resolve(params || "I got nothing to say."),
		info: "Says what you said."
	},
	help: { 
		run: msg => new Promise(resolve => {
			let message = "",
				isMod = false;
			for(const key in commands){
				const cmd = commands[key];
				if(key === "mod"){
					if(isMod)message = "**Moderator Commands:**\n\n" + message;
				}else if((cmd.perms ? hasPerm(msg.member, cmd.perms) : true) && !cmd.hide && !Object.getOwnPropertyDescriptor(commands, key).get){
					message = "`" + key + "`: " + cmd.info + "\n\n" + message;
					isMod = true;
				}
			}
			resolve(message);
		}),
		info: "Displays this help message."
	},
	// Aliases
	get halp(){ return this.help; },
	get toss(){ return this.flip; },
	get roll(){ return this.dice; },
	get bal(){ return this.balance; },
	get delete(){ return this.clear; },
	get del(){ return this.clear; },
	get m(){ return this.music; }	
};

const autoRespond = {
	hi: msg => "Hello, <@" + msg.author.id + ">!",
	"prefix?": () => 'My prefix is "-".',
	get hello() { return this.hi; }
};

client.on('message', message => { 
	if(message.author.bot || readyState < 2)return;
	const command = getCommand(message.content).toLowerCase(),
		cmd = commands[command],
		reply = autoRespond[message.content.toLowerCase()];
	if(cmd){
		if(cmd.requiresGuild && !message.guild)return;
		const msg = processMsg(message.content, command),
			params = msg.content;
			flags = msg.flags;
		if(flags.includes("del")){
			message.delete();
			message.content = message.content.slice(0, -6);
		}
		const hasPermission = (cmd.selfPerms || cmd.perms) ? hasPerm(message.member, cmd.selfPerms || cmd.perms) : true,
			respond = checkPerms(cmd.perms, message) ? (hasPermission ? cmd.run(message, params, flags) : Promise.resolve("You don't have enough permissions >:(")) : Promise.resolve(false);
		respond.then(msg => msg ? message.channel.send(msg.content || msg, msg.options).then(m => msg.delete ? m.delete(msg.delete) : null) : null).catch(err => errorHandler(err, message, cmd.e));
	}else if(reply)message.channel.send(reply(message));
});

client.on("guildCreate", guild => setupMusic(guild.id));

client.on("guildDelete", guild => guilds[guild.id] = null);

client.on("error", errorHandler);

cache.update().then(() => {
	readyState++;
	console.log("Bot loaded.");
	prefix = cache.config.prefix;
	client.login(cache.config.token).then(() => {
		const ids = client.guilds.keys();
		for(const id of ids)setupMusic(id);
		readyState++;
		console.log("The bot is online!");
	});
});

process.on("unhandledRejection", console.error);
/*
	Permissions:
	ADMINISTRATOR (implicitly has all permissions, and bypasses all channel overwrites)
	CREATE_INSTANT_INVITE (create invitations to the guild)
	KICK_MEMBERS
	BAN_MEMBERS
	MANAGE_CHANNELS (edit and reorder channels)
	MANAGE_GUILD (edit the guild information, region, etc.)
	ADD_REACTIONS (add new reactions to messages)
	VIEW_AUDIT_LOG
	READ_MESSAGES
	SEND_MESSAGES
	SEND_TTS_MESSAGES
	MANAGE_MESSAGES (delete messages and reactions)
	EMBED_LINKS (links posted will have a preview embedded)
	ATTACH_FILES
	READ_MESSAGE_HISTORY (view messages that were posted prior to opening Discord)
	MENTION_EVERYONE
	USE_EXTERNAL_EMOJIS (use emojis from different guilds)
	EXTERNAL_EMOJIS (deprecated)
	CONNECT (connect to a voice channel)
	SPEAK (speak in a voice channel)
	MUTE_MEMBERS (mute members across all voice channels)
	DEAFEN_MEMBERS (deafen members across all voice channels)
	MOVE_MEMBERS (move members between voice channels)
	USE_VAD (use voice activity detection)
	CHANGE_NICKNAME
	MANAGE_NICKNAMES (change other members' nicknames)
	MANAGE_ROLES
	MANAGE_ROLES_OR_PERMISSIONS (deprecated)
	MANAGE_WEBHOOKS
	MANAGE_EMOJIS
*/
