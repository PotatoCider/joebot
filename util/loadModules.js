const
	isBuiltin = require("is-builtin-module"),
	{ dependencies } = require("../package.json"),
	coreModules = Object.keys(dependencies);
	
module.exports = (reload, ...mods) => {
	const fetched = [];
	if(typeof reload !== "boolean")mods.unshift(reload);
	for(const mod of mods){
		const 
			isCore = isBuiltin(mod) || coreModules.includes(mod),
			name = isCore ? mod : require.resolve(mod.startsWith("./") ? `.${ mod }` : `./${ mod }`);
		if(reload && require.cache[name])delete require.cache[name];
		fetched.push(require(name));
	}
	return fetched;
};