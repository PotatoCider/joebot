const 
	fs = require("fs"), 

	loadCommand = exports.loadCommand = (target, path, cmdParams, reload) => {
		const cmd = path.split("/").pop().slice(0, -3);
		if(reload && target[cmd])delete require.cache[require.resolve(path)];
		const command = new (require(path))(cmdParams);

		if(command.ignore)return;
		const aliases = command.aliases || [];
		for(const alias of aliases)if(!target[alias])Object.defineProperty(target, alias, {
			get: function() { return this[cmd]; }
		});

		target[cmd] = command;
		return command.init;
	},

	loadCommands = exports.loadCommands = (target, path, cmdParams, reload) => {
		const cmds = fs.readdirSync(path).filter(cmd => cmd.endsWith(".js")),
			loading = [];
		for(let i = 0; i < cmds.length; i++)loading[i] = loadCommand(target, `../${ path }/${ cmds[i] }`, cmdParams, reload);

		if(process.env.PRODUCTION !== "TRUE" && !reload){
			let fsTimeout = false;
			fs.watch(path, "utf-8", (event, module) => {
				if(event !== "change" || fsTimeout)return;
				const reload = !!target[module.slice(0, -3)];
				loadCommand(target, `../${ path }/${ module }`, cmdParams, reload);
				console.log(`${ module } ${ reload ? "re" : "" }loaded.`);
				fsTimeout = setTimeout(() => fsTimeout = false, 1000); // Prevents multiple event calls within 1 second.
			});
		}

		return Promise.all(loading).then(() => console.log(`./${ path } loaded.`));
	};