const fs = require("fs");

const cache = {
	update: key => new Promise(resolve => { 
		if(key){
			fs.writeFile(key + ".json", JSON.stringify(cache[key], null, "\t"), err => {
				if(err)errorHandler(err);
				resolve();
			});
		}else{
			const read = name => new Promise(resolve => {
				fs.readFile(name + ".json", "utf-8", (err, data) => {
					if(err)errorHandler(err);
					if(!data)throw new Error("File is empty or does not exist.");
					cache["__" + name] = JSON.parse(data);
					Object.defineProperty(cache, name, {
						get: function(){ return this["__" + name]; },
						set: function(obj){
							this["__" + name] = obj;
							this.update(name);
						}
					});
					resolve();
				});
			});
			Promise.all([read("config"), read("images")]).then(resolve);
		}
	})
};

module.exports = cache;