const 
	fs = require("fs"), 

	loadCommand = exports.loadCommand = (target, path, cmdParams, reload) => new Promise(resolve => {
		const cmd = path.split("/").pop().slice(0, -3),
			assignCmd = command => {
				const aliases = command.aliases || [];
				for(const alias of aliases)if(!target[alias])Object.defineProperty(target, alias, {
					get: function() { return this[cmd]; }
				});
				target[cmd] = command;
				resolve();
			}
		if(reload && target[cmd])delete require.cache[require.resolve(path)];
		const command = new (require(path))(cmdParams);
		if(command instanceof Promise)command.then(assignCmd);
			else assignCmd(command);
	}),

	loadCommands = exports.loadCommands = (target, path, cmdParams, reload) => new Promise(resolve => {
		const cmds = fs.readdirSync(path).filter(cmd => cmd.endsWith(".js")),
			loading = [];
		for(let i = 0; i < cmds.length; i++)loading[i] = loadCommand(target, `../${ path }/${ cmds[i] }`, cmdParams, reload);
		Promise.all(loading).then(() => {
			console.log(`./${ path } loaded.`);
			resolve();
		});
		let fsTimeout = false;
		if(!reload)fs.watch(path, "utf-8", (event, module) => {
			if(event !== "change" || fsTimeout)return;
			fsTimeout = setTimeout(() => fsTimeout = false, 1000); // Prevents multiple event calls within 1 second.
			loadCommand(target, `../${ path }/${ module }`, cmdParams, true);
			console.log(`${ module } reloaded.`);
		});
	});