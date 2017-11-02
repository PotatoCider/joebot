let missingPerms;
module.exports = missingPerms = (channel, perms, mem) => {
	if(!perms)return [];
	const totalPerms = channel.permissionsFor(mem);
	return totalPerms ? totalPerms.missing(perms instanceof Array ? perms : [perms]) : []; 
};

