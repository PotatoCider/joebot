const Discord = require('discord.js'),
	client = new Discord.Client(),
	fs = require('fs'),
	ytdl = require('ytdl-core'),
	request = require('request'),
	EventEmitter = require('events');
let prefix, readyState = 0;
/*
	TODO: Add more commands like mute, 8ball, rate, remindme, urban, music, currency, slots, lotto, vote, repeat cmd(only certain commands like nick, role)
	Add Check position to mod commands.
	Add guild options.
	Custom prefixes for different guilds.
	Improve help command to further give info on how to use command.
	Create -debug command to debug all commands. 
	Add Salary system(Using your daily energy)
		- Achievements
		- Education
		- Promotion (Done!)
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
			Promise.all([read("players"), read("jobs"), read("config")]).then(resolve);
		}
	})
};
const guilds = {};
const music = {
	play: (message, param) => new Promise(resolve => {
		if(!param)return resolve("You must provide a link/title to play a video!");
		youtube.search(param, 5).then(results => {
			let content = "";
			for(let i = 0; i < 5; i++){
				const result = results[i].snippet;
				content += `**${ i+1 }**: **\`${ result.title }\` by** ${ result.channelTitle }\n` 
			}
			message.channel.send(content).then(msg => {
				const numbers = ["1⃣","2⃣","3⃣","4⃣","5⃣"];
				const setOptions = (i = 0) => msg.react(numbers[i]).then(() => i < 4 ? setOptions(i+1) : null);
				setOptions();
				const collector = msg.createReactionCollector(
					(reaction, user) => numbers.includes(reaction.emoji.name) && user.id === message.author.id,
					{ time: 30000 }
				);
				collector.once("collect", reaction => {
					collector.stop();
					const vc = message.member.voiceChannel,
						selfVc = message.guild.me.voiceChannel,
						music = guilds[msg.guild.id].music,
						vidId = results[reaction.emoji.name.slice(0,1) - 1].id.videoId; // convert emoji to number(trick)
					if(!vc && !selfVc)return resolve("You/I must be in a voice channel first!");
					if(selfVc !== vc && vc)vc.join().then(connection => music.emit("added", connection));
						else music.emit("added", selfVc.connection);
				})
			});
		}); 
	}),
	get p(){ return this.play; }
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
	if(typeof mentions !== "string")for(let i = 0; i < mentions.length; i++)members[i] = guild.members.get(mentions[i].replace(/\D/g, ""));
		else members = guild.members.get(mentions.replace(/\D/g, ""));
	return members;
};
const checkPerms = (perm, msg) => {
	if(perm){
		if(msg.guild.member(client.user).hasPermission(perm))return true;
			else msg.channel.send("I don't have the permission: " + perm);
	}else return true;
};
const hasPerm = (mem, perm) => mem ? mem.hasPermission(perm) : false;
const errorHandler = (err, msg, e) => {
	if(!err)return;
	if(err.code === 50006)return false;
	fs.appendFile("log.txt", `${ err.stack }\nCode: ${ err.code }\nDate: ${ Date() }\n\n`, error => { if(error)throw error; console.log("log updated"); });
	if(err.message.includes("Privilege is too low...")){
		msg.channel.send(`Cannot ${ e } anyone higher than me.`);
		return true;
	}
	if(err.message.includes("nick: Must be 32 or fewer in length.")){
		msg.channel.send("Too long nickname.")
		return true;
	}
	return false;
};
const addPlayer = (id, players) => {
		if(!players[id]){
			players[id] = {balance: 0, energyTimer: Date.now(), workExp: 0, job: cache.jobs.Unemployed, jobName: "Unemployed"};
			cache.players = players;
			return players[id];
		}else return false;
}; 
const accessPlayer = (id, isWorking, difference = 0) => {
	const path = "players.json",
		time = Date.now(),
		players = cache.players,
		player = players[id] ? players[id] : addPlayer(id, players);
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
const youtube = {
	search: (query, maxResults) => new Promise(resolve => {
		request(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${ maxResults }&q=${ encodeURIComponent(query) }&key=${ cache.config.yt_api_key }`, (err, res, body) => {
			if(err)errorHandler(err);
			console.log(res.statusCode);
			resolve(JSON.parse(body).items);
		});
	})
};
const clearMsg = (channel, i, resolve) => channel.bulkDelete((i < 100) ? i : (i === 101) ? i++-2 : 100, true).then(() => (i > 100) ? clearMsg(channel, i-100) : resolve()).catch(errorHandler);
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
					resolve("Log cleared.");
				});
				if(flags.includes("log"))return resolve(eval(`console.log(${ params });`));
				resolve(eval(params));
			}else resolve("You are not Joe >:(");
		}),
		info: "Only for Me :D",
		hide: true
	},
	mod: null,
	// Normal Commands
	music: { // Implement queue + Clean up code
		run: (msg, params) => new Promise(resolve => {
			params = params.split(" ");
			const musicCmd = music[params.shift().toLowerCase()];
			resolve(musicCmd ? musicCmd(msg, params.join(" ")) : "Invalid music command.");
		}),
		info: "Plays music.",
		requiresGuild: true,
		hide: true
	},
	jobs: {
		run: (msg, params) => new Promise(resolve => {
			const player = accessPlayer(msg.author.id);
			if(params){
				const job = cache.jobs[params],
					players = cache.players;
				if(!job)return resolve("No such job.");
				if(player.workExp < job.workRequired)return resolve("You must have more work experience to qualify for this job!");
				cache.players[msg.author.id].job = job;
				cache.players[msg.author.id].jobName = params;
				cache.players = cache.players;
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
	kys: {
		run: () => Promise.resolve("kys coleader"),
		info: "Dicks out for coco"
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
	const cmd = getCommand(message.content).toLowerCase(),
		command = commands[cmd],
		reply = autoRespond[message.content.toLowerCase()];
	if(command){
		if(command.requiresGuild && !message.guild)return;
		const msg = processMsg(message.content, cmd),
			params = msg.content;
			flags = msg.flags;
		if(flags.includes("del")){
			message.delete();
			message.content = message.content.slice(0, -6);
		}
		const hasPermission = command.perms ? hasPerm(message.member, command.perms) : true,
			respond = checkPerms(command.perms, message) ? (hasPermission ? command.run(message, params, flags) : Promise.resolve("You don't have enough permissions >:(")) : Promise.resolve(false);
		respond.then(msg => msg ? message.channel.send(msg) : null).catch(err => errorHandler(err, message, command.e));
	}else if(reply)message.channel.send(reply(message));
});

client.on("guildCreate", newGuild => {
	const guild = guilds[newGuild.id] = { music: new EventEmitter() };
	guild.music.queue = [];
});

client.on("guildDelete", guild => guilds[guild.id] = null);

client.on("error", errorHandler);

cache.update().then(() => {
	readyState++;
	console.log("Bot loaded.");
	prefix = cache.config.prefix;
	client.login(cache.config.token).then(() => {
		const ids = client.guilds.keys();
		for(const id of ids){
			guilds[id] = { music: new EventEmitter() };
			guilds[id].music.queue = [];
		}
		readyState++;
		console.log("The bot is online!");
	});
});

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