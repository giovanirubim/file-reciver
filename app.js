const http = require('http')
const fs = require('fs')
const os = require('os')

const port = Math.floor(Math.random()*10000 + 9000)

const newKey = (n = 6) => {
	let code = ''
	for (let i=0; i<n; ++i) {
		code += Math.floor(Math.random()*16).toString(16)
	}
	return code
}
const transfers = {
	array: [],
	map: {}
}
class Transfer {
	constructor({ name, size }) {
		const key = newKey(16)
		this.key = key
		this.name = name
		this.size = size
		this.written = 0
		this.next_id = 1
		this.last_access = new Date()
		this.stream = fs.createWriteStream(`./${name}`)
		transfers.map[key] = this
		transfers.array.push(this)
		this.waiting = {}
		this.completed = false
		if (!size) {
			this.finish()
		}
	}
	write(chunk, id) {
		const { waiting, stream } = this
		this.last_access = new Date()
		if (id !== this.next_id) {
			waiting[id] = chunk
			return this
		}
		stream.write(chunk)
		this.written += chunk.length
		for (;;) {
			++ id;
			const chunk = waiting[id]
			if (!chunk) break
			stream.write(chunk)
			this.written += chunk.length
		}
		this.next_id = id
		if (this.written >= this.size) {
			this.completed = true
			this.finish()
		}
		return this
	}
	idleTime(now = new Date()) {
		return now - this.last_access
	}
	finish() {
		const {array, map} = transfers
		const index = array.indexOf(this)
		array.splice(index, 1)
		delete map[this.key]
		this.stream.end()
	}
}

setInterval(() => {
	const trash = []
	const now = new Date()
	transfers.array.forEach(transfer => {
		if (transfer.idleTime(now) >= 10*1000) {
			trash.push(transfer)
		}
	})
	trash.forEach(transfer => transfer.finish())
}, 2000)

const awaitJson = (req, res, callback) => {
	const chunks = []
	req.on('data', chunk => chunks.push(chunk))
	req.on('end', () => {
		const str = Buffer.concat(chunks).toString('utf8')
		try {
			req.body = JSON.parse(str)
		} catch(err) {
			return res.send(400)
		}
		callback()
	})
}

const receiveFile = (req, res) => {
	awaitJson(req, res, () => {
		const { body } = req
		if (body.action == 'create') {
			const { name, size } = body;
			if (!name || typeof size !== 'number' || isNaN(size)) {
				return res.send(400)
			}
			const transfer = new Transfer({ name, size })
			return res.send(201, { key: transfer.key })
		}
		if (body.action == 'append') {
			let { key, id, chunk } = body
			const transfer = transfers.map[key]
			if (!transfer) {
				return res.send(422)
			}
			chunk = Buffer.from(chunk, 'hex')
			transfer.write(chunk, id)
			return res.send(204)
		}
	})
}

/*<target-1>*/
const exists = (path) => {
	if (path.includes('..')) return false
	return fs.existsSync(`./web/${path}`)
}
const readFile = (path, callback) => {
	fs.readFile(`./web/${path}`, callback)
}
/*<target-2>*/

const loadFile = (req, res) => {
	let path = req.url
		.replace(/^(.*)(\?[^#]*)?(#.*)?$/, '$1')
		.replace(/^\//, '') || 'index.html'
	if (!path) {
		path = 'index.html'
	}
	if (!exists(path)) {
		return res.send(404)
	}
	readFile(path, (err, buf) => {
		if (err) {
			res.send(500)
		} else {
			res.writeHead(200)
			res.end(buf)
		}
	})
}

const showLinks = () => {
	const nets = os.networkInterfaces();
	for (let name in nets) {
		const obj = nets[name]
		for (let attr in obj) {
			const net = obj[attr]
			const { family, address, netmask } = net
			if (family === 'IPv6') {
				console.log(`http://[${address}]:${port}`)
			} else {
				console.log(`http://${address}:${port}`)
			}
		}
	}
}

const requestHandler = (req, res) => {
	let { url, method } = req
	res.send = (code, data) => {
		if (data) {
			res.writeHead(code, {
				'Content-Type': 'application/json'
			})
			res.write(JSON.stringify(data))
		} else {
			res.writeHead(code)
		}
		res.end()
	}
	res.status = (code) => {
		res.writeHead(code)
		return res
	}
	if (method === 'GET') {
		return loadFile(req, res)
	}
	if (method === 'POST' && url === '/send') {
		return receiveFile(req, res)
	}
	res.send(404)
}

const app = http.createServer((req, res) => {
	try {
		requestHandler(req, res)
		return
	} catch(err) {
		console.error(err)
	}
	try {
		res.send(500)
	} catch(err) {
		console.error(err)
	}
})

app.listen(port, showLinks)
