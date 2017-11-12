const [ getMembers ] = require("../util/loadModules.js")("getMembers");

module.exports = class {
	constructor() {
		this.perms = "MANAGE_ROLES";
		this.info = "Add/Removes a role from a member.";
		this.e = "edit role of";
		this.requiresGuild = true;
		this.mod = true;
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			params = params.split(" ");
			const mention = params.shift(),
				role = msg.guild.roles.find("name", params.join(" "));
			getMembers(mention, msg.guild).then(member => {
				if(!member)return resolve("Edited nobody's role.");
				if(!role)return resolve("No such role.");
				const hasRole = member.roles.has(role.id);
				resolve(member[(hasRole ? "remove" : "add") + "Role"](role)
					.then(() => 
						hasRole ? 
							`${ member } is no longer a ${ role }.` :
							`${ member } is now a ${ role }!`
					));
			});
		});
	}
}