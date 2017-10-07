module.exports = class {
	constructor() {
		this.perms = "MANAGE_MESSAGES";
		this.info = "Deletes x messages.";
		this.requiresGuild = true;
		this.aliases = ["delete", "del", "prune"];
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			const 
				forceDelete = (messages, i = 0) => messages[i].delete().then(() => messages.length === i + 1 || forceDelete(messages, i+1)),
				clearMsg = (channel, i) => channel.bulkDelete((i < 100) ? i : (i === 101) ? i++-2 : 100, true)
					.then(() => (i > 100) ? clearMsg(channel, i-100) : null);

			let param = params.split(" ")[0];
			if(isNaN(param) || param === "" || param.includes("."))return resolve("Pls give me a number ;-;");
			if(~~param > 2000 || param.length >= 10)return resolve("3 much work 5 me.");
			param = ~~param;
			if(flags.includes("force")){
				if(param > 99)return resolve("Cannot force delete less than 99 messages at a time.");
				msg.channel.fetchMessages({ limit: param+1 }).then(messages => forceDelete(Array.from(messages.values())));
			}
			clearMsg(msg.channel, param+1, resolve);
		});
	}
}