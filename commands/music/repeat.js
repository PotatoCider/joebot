module.exports = class {
	run(music) {
		return { content: `:notes: | Music is no${ (music.repeat ^= true) ? "w" : " longer" } on repeat!`, delete: 5000 };
	}
}