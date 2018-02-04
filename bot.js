const
	[ _, fs, { EventEmitter }, errorHandler, missingPerms, { processMsg, getCommand }, { loadCommand, loadCommands }, { Client }, { MongoClient: mongo } ]
		= require("./util/loadModules")( "../setup", "fs", "events", "error", "perms", "commandProcessing", "commandLoading", "discord.js", "mongodb"),
	client = new Client(),
/*
	Playlists!!
	Improve music < In progress (Lesser priority)
	Improve help command to further give info on how to use command. 

	TODO: Add more commands like mute, 8ball, remindme, currency, slots, lotto, vote
	Add Check position to mod commands.	
	Create -debug command to debug all commands. 
	Add ignore channels
	When joined a guild, send message and tell the admins which commands need which permissions
	Add a permissions system where admin can restrict commands from certain roles/players
	User created commands?

	-m view command to view image at current time? 
	Now Playing Channel?
	Support livestreams (Change -m pause to end the livestream and play it back when it resumes)
	Fix pages
	Translate
	Weather
	Improve eval
	Keep one music message at a time?
	
	Add message accumulation system(content += "x\n\n"; return content + " wow";) => (msg.add("x"); return msg.return("wow"))

	Add comments explaining what each block of code does
	Add restarting modules

	Add deleteall command which basically removes and adds the same channel with the same perms
*/

	self = client.self = Object.assign(new EventEmitter(), { client, guilds: {}, users: {}, commands: {}, set: false });

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
	const id = guild.id;
	guilds[id] = { _id: id };
	self.emit("guildCreate", guild);
})

.on("guildDelete", guild => {
	if(!self.set)return;

	self.emit("guildDelete", guild);
	delete self.guilds[guild.id];
})

.on("voiceStateUpdate", (oldMem, newMem) => self.set && self.commands.music.vcUpdate(newMem))

.on("error", errorHandler)

.on("warn", console.log)

.login(process.env.TOKEN).then(() => {
	console.log("Login successful!");
	mongo.connect(process.env.MONGODB_URI)
	.then(mongoClient => {
		self.db = mongoClient.db("joebot");
		const ids = client.guilds.keyArray();
		for(let i = 0; i < ids.length; i++){
			self.guilds[ids[i]] = {};
		}
	})
	.then(() => loadCommands(self.commands, "commands", self))
	.then(() => {
		self.set = true;
		self.emit("set");
		console.log(`The bot is online!`);
	});
});


process.on("unhandledRejection", errorHandler)
	.on("uncaughtException", errorHandler);