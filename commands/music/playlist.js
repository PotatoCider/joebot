const [ youtube, getPlaylistId, errorHandler, { resolveDuration } ] = require("../../util/loadModules.js")("youtube", "getPlaylistId", "error", "time");
module.exports = class {
	constructor(self) {
		if(self.set)return;
		this.init = self.db.collection("users").find({}, { playlists: 1 }).toArray().then(users => {
			for(let i = 0; i < users.length; i++){
				const user = users[i],
					lists = user.playlists,
					listKeys = Object.keys(lists);
				self.users[user._id] = { hasList: {} };

				for(let j = 0; j < listKeys.length; j++){
					const key = listKeys[j];
					self.users[user._id].hasList[key] = true;
				}
			}
		});
	}

	run(music, msg, params, flags) {
		params = params.split(" ");
		const chosen = params.shift(),
			name = params.shift(),
			self = msg.client.self,
			collection = self.db.collection("users"),
			userId = msg.author.id,
			{ hasList, noList } = self.users[userId] = self.users[userId] || { hasList: {}, noList: true };

		switch(chosen) {
			case "new":
				if(!name)return { content: "Playlist name not specified.", delete: 10000 };
				if(hasList[name])return { content: `Playlist "${ name }" is already created!`, delete: 10000 };

				hasList[name] = true;
				self.users[userId].noList = false;

				return collection.updateOne(
					{ _id: userId },
					{ $set: { ["playlists." + name]: [] } }, 
					{ upsert: true }
				).then(() => `Created new playlist "${ name }".`);
				break;
			case "add":
				if(!name)return { content: "Please specify the playlist name!", delete: 10000 };
				if(!hasList[name])return { content: `You don't have a playlist named "${ name }"!\n\nPlease create a new playlist with \`-m new <playlist name>\`.`, delete: 10000 };

				params = params.join(" ");
				return Promise.resolve().then(() => {
					if(params){
						const id = getPlaylistId(params);
						if(!id)throw "Invalid playlist link.";
						return youtube.fetchPlaylist(id);
					}else{
						const ids = [],
							np = music.nowPlaying,
							queue = music.queue;
						let content = "";
						if(np)ids[0] = np.id;
						for(let i = 0; i < queue.length; i++) {
							ids.push(queue[i].id);
						}
						if(ids.length === 0)throw "Please add songs to music queue or specify a youtube playlist!";
						return ids;
					}
				}).then(ids => {
					return collection.updateOne({ _id: userId }, {
						$push: { ["playlists." + name]: { $each: ids } }
					}).then(() => `Added ${ ids.length } items to ${ name }.`)
				}).catch(err => {
					if(typeof err === "string")return err;
					throw err;
				});
				break;
			case "del":
			case "delete":
			case "remove":
				if(!name)return { content: "Please specify the playlist name!", delete: 10000 };
				if(!hasList[name])return { content: `You don't have a playlist named "${ name }" to delete!`, delete: 10000 }

				hasList[name] = false;
				return collection.updateOne({ _id: userId }, {
					$unset: { ["playlists." + name]: "" }
				}).then(() => `Removed playlist "${ name }".`)
				break;
			case "list":
			case "all":
				if(noList)return "You don't have any playlists!";
				
				const listNames = Object.keys(hasList);
				let content = "Playlists: ";
				for(let i = 0; i < listNames.length; i++){
					content += `${ listNames[i] }, `;
				}
				return content.slice(0, -2) + ".";

				break;
			case "view":
				if(!name)return { content: "Please specify the playlist name!", delete: 10000 };
				if(!hasList[name])return { content: `You don't have a playlist named "${ name }"!`, delete: 10000 };

				return collection.find({ _id: userId }, { ["playlists." + name]: 1 }).toArray()
				.then(users => youtube.fetchVideoInfo(users[0].playlists[name]))
				.then(vids => {
					let content = `Playlist **${ name }**: \n\n`;
					for(let i = 0; i < vids.length; i++){
						const vid = vids[i];
						content += `**${ i+1 }**: **${ vid.title } (${ resolveDuration({ iso: vid.duration, yt: true }) }) by** ${ vid.channelTitle }\n\n`
					}
					return content;
				});
				break;
			case "play":
				if(!name)return { content: "Please specify the playlist name!", delete: 10000 };
				if(!hasList[name])return { content: `You don't have a playlist named "${ name }" to play!`, delete: 10000 };

				return collection.find({ _id: userId }, { ["playlists." + name]: 1 }).toArray()
				.then(users => youtube.fetchVideoInfo(users[0].playlists[name]))
				.then(vids => {
					for(let i = 0; i < vids.length; i++){
						music.queue.push(Object.assign(vids[i], { dj: userId, channel: msg.channel }))
					}
				})
				.then(() => self.commands.music.commands.play.run(music, msg))
				.then(content => `Added **${ music.queue.length } songs** to queue from **${ name }**.`);
				break;
			default:
				return "Invalid playlist command. Try '-m list new' or '-m list add'!";
		}
	}
}