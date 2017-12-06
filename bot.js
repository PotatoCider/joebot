const
	[ fs, errorHandler, missingPerms, { processMsg, getCommand }, { loadCommand, loadCommands }, { Client }, { token } ]
		= require("./util/loadModules")("fs", "error", "perms", "commandProcessing", "commandLoading", "discord.js", "./config"),
	client = new Client(),
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
	
	Add comments explaining what each block of code does
	Add client.bot for communicating between command modules?
	Add restarting modules
*/
	guilds = {}, commands = {};

client.on("message", msg => { 
	if(msg.author.bot || !client.set)return;
	const channel = msg.channel,
		name = getCommand(msg.content).toLowerCase(),
		cmd = commands[name];
	if(!cmd)return;
	if(cmd.requiresGuild && !msg.guild)return channel.send("This command can only be used in guilds!");

	const { content, flags } = processMsg(msg.content, name),
		index = flags.indexOf("del");
	if(index !== -1){
		msg.delete();
		flags.splice(index, 1);
	}
	const missing = msg.guild ? missingPerms(channel, cmd.perms, msg.member) : [],
		selfMissing = msg.guild ? missingPerms(channel, cmd.perms, msg.guild.me) : [],
		processOutput = output => {
			if(output)channel.send(output.content || output, output.options).then(m => {
				if(output.delete)m.delete(output.delete);
			});
		};

	let run;
	if(selfMissing.length)run = `I do not have the permission${ selfMissing.length === 1 ? "s" : "" }: \`${ selfMissing.join(", ") }\`.`;
		else if(missing.length)run = "You don't have enough permissions >:(";
		else run = cmd.run(msg, content, flags);
		if(run && run.then)run.then(processOutput).catch(err => errorHandler(err, msg, cmd.e));
			else processOutput(run);
	})

	.on("guildCreate", guild => client.set && commands.music.setup(guild.id))

	.on("guildDelete", guild => client.set && delete guilds[guild.id])

	.on("error", errorHandler)

	.on("voiceStateUpdate", (oldMem, newMem) => client.set && commands.music.vcUpdate(newMem))

	.login(token).then(() => {
		console.log("Login successful!");
		loadCommands(commands, "commands", { client, commands, guilds }).then(() => {
			// Change this to another property
			client.emit("set");
			client.set = true;
			console.log("The bot is online!");
		});
	});

process.on("unhandledRejection", errorHandler)
	.on("uncaughtException", errorHandler);
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