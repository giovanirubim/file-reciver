class Resource {
	constructor(size) {
		this.size = size
		this.queue = []
	}
	use() {
		if (this.size) {
			-- this.size
			return Promise.resolve()
		}
		return new Promise(done => {
			this.queue.push(() => {
				-- this.size
				done()
			})
		})
	}
	free() {
		++ this.size
		const {queue} = this
		while (this.size && queue.length) {
			const handler = queue.splice(0, 1)[0]
			handler()
		}
	}
}