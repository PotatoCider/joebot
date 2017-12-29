const
	[ Embed, react, awaitUserReact ] = require("./loadModules.js")("Embed", "react", "awaitUserReaction"),
	[ s_msg, s_sent, s_watch, s_pending, s_index, s_setIndex, s_collector ] = Array(7).fill().map(Symbol)
	RichEmbedProps = ["author", "color", "description", "fields", "file", "footer", "image", "thumbnail", "timestamp", "title", "url"];
module.exports = class Pages extends Embed {

	constructor(msg, { next, prev, change, options, timeout, onceTimeout, onSelect, limit }) {
		super(msg.author);
		this[s_msg] = msg;
		this[s_index] = 0;
		this[s_setIndex]();
		// this.next = next;
		// this.prev = prev;
		this.change = change;
		this.onceTimeout = onceTimeout;
		this.options = options || Pages.options;
		this.timeout = timeout || 30000;
		this.limit = limit;
		this.onSelect = onSelect;
		if(!msg || !limit)throw new Error("Missing params.");
	}
	
	static get options() { 
		return ["◀", "🔄", "▶", "✅"]; // 0: prev, 1: refresh, 2: next, 3: done
	}

	send(opts) {
		let content, message, contentLoading;

		if(typeof opts === "object")({ content, message, contentLoading } = opts);
			else content = opts || "";

		const pending = message ? message.edit(content, this) : this[s_msg].channel.send(content, this);
			
		pending.then(msg => {
			this[s_sent] = msg;
			react(msg, this.options);
			this[s_watch](content, contentLoading);
		});

		return pending;
	}

	setFooter(text, icon) {
		return super.setFooter(`Page ${ this[s_index] + 1 }${ text ? " | " + text : "" }`, icon);
	}

	stopWatching() {
		if(this[s_collector]){
			this[s_collector].stop();
			this[s_sent].clearReactions();
			return true;
		}else return false;
	}

	[s_setIndex](diff = 0) {
		this[s_index] += diff;
		const i = this[s_index];
		super.setFooter(`Page ${ i + 1 }`);
		return i;
	}

	[s_watch]() { // Private
		const msg = this[s_sent],
			author = this[s_msg].author,
			onceReact = awaitUserReact(msg, author, this.timeout, this.options);

		onceReact.then(reaction => {
			const chosen = reaction.emoji.name;
			if(chosen === "🔄"){ // refresh
				msg.delete();
				this.send({ content: msg.content }).then(m => this[s_sent] = m);
			}else if(chosen === "✅"){ // done 
				this.stopWatching();
				return;
			}else if(chosen === "▶" || chosen === "◀"){ // next or prev
				reaction.remove(author);

				if(this[s_pending])return this[s_watch]();
				this[s_pending] = true;

				for(const key of RichEmbedProps)this[key] = key === "fields" ? [] : null;
				Embed.setup(this, author);

				let content;
				const limit = this.limit - 1,
					i = this[s_index];
				if(chosen === "▶")content = this.change(i < limit ? this[s_setIndex](1) : limit, msg);
					else content = this.change(i ? this[s_setIndex](-1) : 0, msg);

				Promise.resolve(content)
					.then(content => msg.edit(content || msg.content, { embed: this }))
					.then(() => this[s_pending] = false);
			}else this.onSelect(reaction);

			this[s_watch]();
		});

		setImmediate(() => {
			this[s_collector] = onceReact.collector.once("end", () => {
				if(onceReact.resolved)return;
				msg.clearReactions();
				if(this.onceTimeout)this.onceTimeout(msg);
			})
		});
	}
};
