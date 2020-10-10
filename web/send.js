const calls = new Resource(20)
const chunkSize = 128*1024

const sendBody = async (body) => {
	await calls.use()
	const promise = new Promise((done, fail) => {
		$.post({
			url: '/send',
			data: JSON.stringify(body),
			dataType: 'json',
		})
		.then(res => {
			calls.free()
			done(res)
		})
		.catch(err => {
			calls.free()
			fail(err)
		})
	})
	return { promise }
}

const createTransfer = async (name, size) => {
	let { promise } = await sendBody({
		action: 'create',
		name, size,
	})
	let { key } = await promise
	return key
}

const sendChunk = (key, id, chunk) => sendBody({
	action: 'append',
	key, id, chunk
})

const getChunk = (file, index, size) => new Promise((done, fail) => {
	const reader = new FileReader()
	const end = index + size
	const blob = file.slice(index, end)
	reader.onload = function(e) {
		if (e.target.error) {
			fail(e.target.error)
			return
		}
		const buffer = e.target.result
		const bytes = new Uint8Array(buffer)
		const { length } = bytes
		let chunk = ''
		for (let i=0; i<length; ++i) {
			const byte = bytes[i]
			chunk += hexMap[byte]
		}
		done(chunk)
	}
	reader.readAsArrayBuffer(blob)
})

const sendFile = async (file, { onprogress, onend, onerror } = {}) => {
	let error
	try {
		const {size} = file
		const key = await createTransfer(file.name, size)
		let id = 0
		for (let i=0; i<size && !error;) {
			const chunk = await getChunk(file, i, chunkSize)
			if (error) break
			const call = await sendChunk(key, ++id, chunk)
			if (error) break
			call.promise.catch(err => error = err)
			i += chunkSize
			onprogress && onprogress(Math.min(i, size)/size)
		}
		onend && onend()
	} catch(err) {
		error = err
	}
	if (error) {
		onerror && onerror(error)
	}
}
