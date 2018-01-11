const
	[ _, fs, errorHandler, missingPerms, { processMsg, getCommand }, { loadCommand, loadCommands }, { Client } ]
		= require("./util/loadModules")( "../setup", "fs", "error", "perms", "commandProcessing", "commandLoading", "discord.js"),
	client = new Client(),
/*
	Improve music < In progress (Lesser priority)
	Improve help command to further give info on how to use command. 

	TODO: Add more commands like mute, 8ball, rate, remindme, currency, slots, lotto, vote
	Add Check position to mod commands.
`	Create -debug command to debug all commands. 
	Add ignore channels
	When joined a guild, send message and tell the admins which commands need which permissions
	Add a permissions system where admin can restrict commands from certain roles/players
	User created commands?

	-m view command to view image at current time? 
	Now Playing Channel?
	Support livestreams (Kinda done)
	Fix pages
	Translate
	Weather
	
	Add comments explaining what each block of code does
	Add restarting modules

	Add deleteall command which basically removes and adds the same channel with the same perms
*/

	self = client.self = { client, guilds: {}, commands: {}, set: false, setups: [], cleanups: [] };

client.on("message", msg => {
	if(msg.author.bot || !self.set)return;

	// Xp system? 

	const prefix = self.guilds[msg.guild.id].prefix;
	if(!msg.content.startsWith(prefix))return;
	const channel = msg.channel,
		name = getCommand(msg.content, prefix).toLowerCase(),
		cmd = self.commands[name];
	if(!cmd)return;
	if(cmd.requiresGuild && !msg.guild)return channel.send("This command can only be used in guilds!");

	const { content, flags } = processMsg(msg.content, name, prefix),
		index = flags.indexOf("del");
	if(~index){
		msg.delete();
		flags.splice(index, 1);
	}
	const missing = msg.guild ? missingPerms(channel, cmd.perms, msg.member) : [],
		selfMissing = msg.guild ? missingPerms(channel, cmd.perms, msg.guild.me) : [];

	let run;
	if(missing.length)run = "You don't have enough permissions >:(";
		else if(selfMissing.length)run = `I do not have the permission${ selfMissing.length === 1 ? "s" : "" }: \`${ selfMissing.join(", ") }\`.`;
		else run = cmd.run(msg, content, flags);
	
	Promise.resolve(run).then(output => {
		if(output)channel.send(output.content || output, Object.assign(output.options || {}, { split: true })).then(m => {
			if(output.delete)m.delete(output.delete);
		});
	}).catch(err => errorHandler(err, msg, cmd.e));

	
})

.on("guildCreate", guild => {
	if(!self.set)return;
	const { setups, guilds } = self,
		id = guild.id;
	guilds[id] = { _id: id };
	for(let i = 0; i < setups.length; i++)setups[i](id);
})

.on("guildDelete", guild => {
	if(!self.set)return;
	const cleanups = self.cleanups,
		pending = [], 
		id = guild.id;
	for(let i = 0; i < cleanups.length; i++){
		pending[i] = cleanups[i](id);
	}
	Promise.all(pending).then(() => delete self.guilds[id]);
})

.on("voiceStateUpdate", (oldMem, newMem) => self.set && self.commands.music.vcUpdate(newMem))

.on("error", errorHandler)

.on("warn", console.log)

.login(process.env.TOKEN).then(() => {
	console.log("Login successful!");
	loadCommands(self.commands, "commands", self).then(() => {
		const ids = client.guilds.keyArray(),
			setups = self.setups,
			pending = [];
		for(let i = 0; i < ids.length; i++){
			const id = ids[i];
			self.guilds[id] = { _id: id };
		}
		for(let i = 0; i < setups.length; i++){
			pending[i] = setups[i](ids);
		}
		return Promise.all(pending);
	}).then(() => {
		self.set = true;
		client.emit("set");
		console.log(`The bot is online!`);
	});
});


process.on("unhandledRejection", errorHandler)
	.on("uncaughtException", errorHandler);