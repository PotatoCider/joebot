const getMembers = require("../util/getMembers.js");

module.exports = class {
	constructor() {
		this.perms = "MANAGE_ROLES";
		this.info = "Add/Removes a role from a member.";
		this.e = "edit role of";
		this.requiresGuild = true;
	}

	run(msg, params, flags) {
		return new Promise(resolve => {
			params = params.split(" ");
			const member = getMembers(params.shift(), msg.guild),
				role = msg.guild.roles.find("name", params.join(" "));
			if(!member)return resolve("Edited nobody's role.");
			if(!role)return resolve("No such role.");
			const hasRole = member.roles.has(role.id);
			resolve(member[(hasRole ? "remove" : "add") + "Role"](role).then(() => member + " is no" + (hasRole ? " longer" : "w") + " a " + role + (hasRole ? "." : "!")));
		});
	}
}