const request = require("request-promise"),
	
	yt_api_key = process.env.YT_API_KEY,
	
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
	}).then(({ items, nextPageToken }) => {
		if(!nextPageToken)return items;
		return exports.fetchPlaylist(id, nextPageToken)
			.then(fetched => {
				items.push(...fetched);
				return items;
			});
	}).then(items => {
		if(pageToken)return items;
		for(let i = 0; i < items.length; i++){
			items[i] = items[i].snippet.resourceId.videoId;
		}
		return items;
	});

exports.fetchVideoInfo = (ids, maxResults = 50, big = false) => // pageToken + id parameter not supported.
	youtubeRequest({
		url: "videos",
		qs: {
			part: "snippet,contentDetails,statistics,liveStreamingDetails",
			id: ids.slice(0, 50).toString(), // Takes care of both Array and Strings.
			maxResults,
			fields: "items(contentDetails/duration,liveStreamingDetails(actualEndTime,actualStartTime,concurrentViewers,scheduledStartTime),snippet(categoryId,channelId,channelTitle,publishedAt,thumbnails/maxres/height,title,liveBroadcastContent),statistics(commentCount,dislikeCount,likeCount,viewCount))"
		}
	}).then(({ items }) => {
		if(ids.length <= 50)return items;
		return exports.fetchVideoInfo(ids.slice(50), 50, true).then(fetched => {
			items.push(...fetched);
			return items;
		}); 
	}).then(items => {
		if(big)return items;
		if(!(ids instanceof Array))ids = [ids];
		for(let i = 0; i < items.length; i++){
			const { snippet, contentDetails, statistics, liveStreamingDetails } = items[i];
			items[i] = Object.assign(snippet, contentDetails, statistics, liveStreamingDetails, {
				id: ids[i],
				live: snippet.liveBroadcastContent === "live",
				upcoming: snippet.liveBroadcastContent === "upcoming",
				thumbnail: `https://i.ytimg.com/vi/${ ids[i] }/${ snippet.thumbnails ? "maxres" : "mq" }default.jpg`
			});
		}
		return items;
	});