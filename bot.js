const
	[ fs, errorHandler, missingPerms, { processMsg, getCommand }, Discord, { token } ]
		= require("./util/loadModules.js")("fs", "error", "perms", "commandProcessing", "discord.js", "./config");
	client = new Discord.Client();
let readyState = 0;
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
	Add a permissions system where admin can restrict commands from certain roles/players
	User created commands?
	
	Add comment explain what each block of code does
*/
const guilds = {}, commands = {}, cmdList = { mod: [], reg: [] };

const loadCommand = (target, module, reload) => new Promise(resolve => {
	const cmd = module.slice(0, -3),
		path = "./commands/" + module;
	if(reload && target[cmd]){
		delete require.cache[require.resolve(path)];
		const cmdType = target[cmd].mod ? "mod" : "reg",
			cmdIndex = cmdList[cmdType].indexOf(cmd);
		if(cmdIndex !== -1)cmdList[cmdType].splice(cmdIndex, 1);
	}
	const command = target[cmd] = new (require(path))({ client, commands, guilds, cmdList });
	if(command.mod)cmdList.mod.push(cmd);
		else cmdList.reg.push(cmd);
	const aliases = command.aliases || [];
	for(const alias of aliases)if(!target[alias])Object.defineProperty(target, alias, {
		get: function() { return this[cmd]; }
	});
	resolve();
});

const loadCommands = (target, reload) => {
	const cmds = fs.readdirSync("./commands");
	const loading = [];
	for(let i = 0; i < cmds.length; i++)loading[i] = loadCommand(target, cmds[i], reload);
	Promise.all(loading).then(() => {
		console.log("Commands loaded.");
		readyState++;
		cmdList.mod.sort();
		cmdList.reg.sort();
	});
	let fsTimeout = false;
	if(!reload)fs.watch("./commands", "utf-8", (event, module) => {
		if(event !== "change" || fsTimeout)return;
		fsTimeout = setTimeout(() => fsTimeout = false, 1000); // Prevents multiple event calls within 1 second.
		loadCommand(commands, module, true);
		console.log(module + " reloaded.");
	});
}

// Implement loadUtility

client.on("message", msg => { 
	if(msg.author.bot)return;
	const channel = msg.channel,
		cmdName = getCommand(msg.content).toLowerCase(),
		cmd = commands[cmdName];
	if(!cmd)return;
	if(cmd.requiresGuild && !msg.guild)return msg.channel.send("This command can only be used in guilds!");

	const { content, flags } = processMsg(msg.content, cmdName);
	if(flags.includes("del"))msg.delete();
	const missing = msg.guild ? missingPerms(channel, cmd.perms, msg.member) : [],
		selfMissing = msg.guild ? missingPerms(channel, cmd.perms, msg.guild.me) : [];
	let run;

	if(selfMissing.length)run = Promise.resolve(`I do not have the permission${ selfMissing.length === 1 ? "s" : "" }: \`${ selfMissing.join(", ") }\`.`);
		else if(missing.length)run = Promise.resolve("You don't have enough permissions >:(");
		else run = cmd.run(msg, content, flags);

	run.then(output => output ? channel.send(output.content || output, output.options).then(m => output.delete ? m.delete(output.delete) : null) : null).catch(err => errorHandler(err, msg, cmd.e));
	})

	.on("guildCreate", guild => commands.music.setup(guild.id))

	.on("guildDelete", guild => delete guilds[guild.id])

	.on("error", errorHandler)

	.on("voiceStateUpdate", (oldMem, newMem) => commands.music.vcUpdate(newMem))

	.login(token).then(() => {
	readyState++;
	loadCommands(commands);
	console.log("The bot is online!");
	});


process.on("unhandledRejection", errorHandler);
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
