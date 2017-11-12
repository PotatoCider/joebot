const [ Embed, Pages, ud, images ] = require("../util/loadModules.js")("Embed", "Pages", "urban-dictionary-es6", "./images"),
	indexSuffix = ["st", "nd", "rd"];
	createDefinition = (embed, info, i = 0) => {
		if(info instanceof Array)info = info[i];
		embed.setAuthor("Urban Dictionary")
			.setThumbnail(images.ud)
			.addField("Word", `***${ info.word }***`)
			.addField("Definition", `**${ info.definition }**`)
			.addField("Examples", `*${ info.example }*`)
			.addField("Author", info.author)
			.addField("Thumbs Up", info.thumbs_up, true)
			.addField("Thumbs Down", info.thumbs_down, true);
	},
	urban = term => new Promise(resolve => {
		ud[term ? "term" : "random"](term)
			.then(resolve)
			.catch(err => {
				if(err && err.message.endsWith(" is undefined."))resolve({});
			});
	}),
	contentLoading = ":pause_button: | *Currently fetching definition...*";
module.exports = class {
	constructor() {
		this.info = "Searches Urban Dictionary.";
		this.aliases = ["urbandictionary", "ud", "udict"];
	}

	run(message, params, flags) {
		Promise.all([
			message.channel.send(contentLoading),
			urban(params) // Add support for random
		]).then(([msg, res]) => {
				if(params){	
					let i = 0; // For initialising 
					const { entries, tags, sounds } = res;
					if(!entries)return msg.edit("No results found.");
					const pages = new Pages(message, {
							change: i => createDefinition(pages, entries, i),
							limit: entries.length
						});
					createDefinition(pages, entries);
					pages.send({ content: "Here is your definition:", contentLoading, message: msg });
					return;
				}else{
					const embed = new Embed(message.author);
					createDefinition(embed, res);
					msg.edit("Here is a random definition:", embed);
				}
			});
		
	}
}
