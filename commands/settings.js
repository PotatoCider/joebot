const { MongoClient: mongo } = require("mongodb");
let self;
module.exports = class {
	constructor(tmpSelf) {
		this.aliases = ["config", "options"];
		this.requiresGuild = true;
		this.info = "Guild settings. (Prefix only for now)";

		self = tmpSelf;
		if(self.set)return;
		const collection = self.db.collection("guilds"),
			guilds = self.guilds,
			prefix = process.env.PREFIX;

		this.init = new Promise(resolve => {
			const ids = self.client.guilds.keyArray(),
				toDelete = [], toAdd = [], pending = [], available = {};
			let count = 0;
			collection.find().forEach(guild => {
				const id = guild._id;
				if(!guilds[id])toDelete.push(id);
				else Object.assign(guilds[id], guild);

				available[id] = true;
				count++;
			}, err => {
				if(err)throw err;
				if(toDelete.length){
					pending[0] = collection.deleteMany({ _id: { $in: toDelete } });
					console.log(`Deleted ${ toDelete.length } guilds in db.`);
				}

				if(count - toDelete.length === ids.length)return resolve(pending[0]);
				for(let i = 0; i < ids.length; i++){
					const id = ids[i];
					if(available[id])continue;

					toAdd.push({ _id: id, prefix });
					guilds[id].prefix = prefix;
				}
				if(!toAdd.length)throw new Error("length doesn't equate");
				pending[1] = collection.insertMany(toAdd);

				console.log(`Inserted ${ toAdd.length } guilds in db.`);
				Promise.all(pending).then(resolve);
			});
		});
		
		self.on("guildDelete", guild => collection.deleteOne({ _id: guild.id }));

		self.on("guildCreate", guild => {
			const id = guild.id;
			self.guilds[id].prefix = prefix;
			return collection.insertOne({ _id: id, prefix });
		});
	}

	run(msg, params, flags) { 
		params = params.split(" ");
		const option = params.shift();
		params = params.join(" ");
		if(option === "prefix"){
			self.guilds[msg.guild.id].prefix = params;
			
			return self.db.collection("guilds").updateOne(
				{ _id: msg.guild.id },
				{ $set: { prefix: params } },
				{ upsert: true }
			).then(() => `Guild prefix changed to "**${ params }**"!`);

		}else return { content: "Invalid setting.", delete: 5000 };
	}
}