const [ request, { yt_api_key } ] = require("./loadModules.js")("request-promise", "./config"),
	
	youtubeRequest = request.defaults({
		method: "GET",
		baseUrl: "https://www.googleapis.com/youtube/v3/",
		qs: { key: yt_api_key, prettyPrint: false },
		json: true
	});

exports.search = (query, { type = "video", maxResults = 50 } = {}) => 
	youtubeRequest({
		url: "search",
		qs: { 
			part: "id",
			type, maxResults,
			q: query,
			fields: "items(id(playlistId,videoId))"
		}
	}).then(({ items }) => {
		for(let i = 0; i < items.length; i++){
			const id = items[i].id;
			items[i] = id.videoId || id.playlistId;
		}
		return items;
	});

exports.fetchPlaylist = (id, pageToken) => 
	youtubeRequest({
		url: "playlistItems",
		qs: {
			part: "snippet",
			playlistId: id,
			maxResults: 50,
			pageToken,
			fields: "items/snippet/resourceId/videoId,nextPageToken"
		}
	}).then(({ items, nextPageToken }) => new Promise(resolve => {
		if(nextPageToken){
			exports.fetchPlaylist(id, nextPageToken)
				.then(fetched => resolve(items.push(...fetched)));
		}else resolve(items); 
	})).then(items => {
		if(pageToken)return items;
		for(let i = 0; i < items.length; i++){
			items[i] = items[i].snippet.resourceId.videoId;
		}
		return items;
	});

exports.fetchVideoInfo = (ids, { pageToken, maxResults = 50 } = {}) =>
	youtubeRequest({
		url: "videos",
		qs: {
			part: "snippet,contentDetails,statistics",
			id: ids.toString(), // Takes care of both Array and Strings.
			maxResults,
			pageToken,
			fields: "items(contentDetails/duration,snippet(categoryId,channelId,channelTitle,publishedAt,tags,thumbnails/maxres/height,title),statistics(commentCount,dislikeCount,likeCount,viewCount)),nextPageToken"
		}
	}).then(({ items, nextPageToken }) => new Promise(resolve => {
		if(nextPageToken){
			exports.fetchVideoInfo(ids, { pageToken: nextPageToken })
				.then(fetched => resolve(items.push(...fetched)));
		}else resolve(items);
	})).then(items => {
		if(pageToken)return items;
		if(!(ids instanceof Array))ids = [ids];
		for(let i = 0; i < items.length; i++){
			const { snippet, contentDetails, statistics } = items[i];
			items[i] = {
				duration: contentDetails.duration,
				...snippet,
				...statistics
			};
			items[i].id = ids[i];
			items[i].thumbnail = `https://i.ytimg.com/vi/${ ids[i] }/${ snippet.thumbnails ? "maxres" : "mq" }default.jpg`;
		}
		return items;
	});