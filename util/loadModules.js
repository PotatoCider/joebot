const
	isBuiltin = require("is-builtin-module"),
	fs = require("fs"),
	getFile = require("./getFile.js"),
	{ dev } = require("../config.json"),
	{ dependencies } = require("../package.json"),
	coreModules = Object.keys(dependencies),

	isCoreModule = module => isBuiltin(module) || coreModules.includes(module),

	loadModule = (fetched, path) => {
		const 
			file = getFile(path),
			isCore = isCoreModule(path),
			mod = isCore ? path : (path.startsWith("./") ? `.${ path }` : `./${ path }`),
			module = require(mod);
		fetched.push(module);
		return file;
	};

module.exports = (...mods) => {
	const fetched = [],
		filename = module.parent.filename;
	delete require.cache[__filename];
	for(const mod of mods)loadModule(fetched, mod);
	mods = mods.filter(mod => !isCoreModule(mod));
	let fsTimeout = false;
	// TODO: Delete multiple watchers when module is called multiple times due to change in code
	if(mods.length && dev)fs.watch("./", { recursive: true }, (event, path) => {
		const file = getFile(path);
		if(event === "change" && mods.includes(file) && !fsTimeout){
			delete require.cache[require.resolve("../" + path)];
			const mod = loadModule(fetched, `./${ path }`),
				parent = getFile(filename);
			console.log(`module ${ mod }.js reloaded in parent ${ parent }.js`);
			
			fsTimeout = setTimeout(() => fsTimeout = false, 1000);
		}
	});
	return fetched;
};