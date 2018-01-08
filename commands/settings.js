const [ { MongoClient: mongo }, errorHandler ] = require("../util/loadModules.js")("mongodb", "error");
let self;
module.exports = class {
	constructor(tmpSelf) {
		this.aliases = ["config", "options"];
		this.requiresGuild = true;
		this.info = "Guild settings. (Prefix only for now)";

		self = tmpSelf;

		this.init = mongo.connect(process.env.MONGODB_URI).then(client => {
			const db = self.db = client.db("joebot"),
				collection = db.collection("guilds"),
				prefix = process.env.PREFIX;

			self.cleanups.push(id => collection.deleteOne({ _id: id }));

			self.setups.push(ids => new Promise(resolve => {
				const guilds = self.guilds;
				if(!(ids instanceof Array)){
					guilds[ids].prefix = process.env.PREFIX;
					collection.insertOne({ _id: ids, prefix }, resolve);
					return;
				}
				// Startup check if database is up to date.
				const toDelete = [], toAdd = [], pending = [], available = {};
				let count = 0;
				collection.find().forEach(guild => {
					const id = guild._id;
					if(!guilds[id])toDelete.push(id);
					else Object.assign(guilds[id], guild);
					available[id] = true;
					count++;
				}, err => {
					if(err)errorHandler(err);
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
			}));
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