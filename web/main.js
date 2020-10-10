const fileElement = (name) => {
	let div = $(document.createElement('div'))
	$('body').append(div)
	div.addClass('file')
	div.text(name + ': ')
	div.append('<span>0%</span>')
	const span = div.find('span')
	return {
		setProgress: (val) => {
			span.text((val*100).toFixed(2) + '%')
		},
		failed: (err) => {
			console.error(err)
			span.text('Falha')
		},
		end: () => {
			span.text('Ok')
		}
	}
}

$(document).ready(() => {
	
	const countMap = {}
	const add = (name, inc) => {
		let val = (countMap[name] || 0) + inc
		$('#' + name).html(val)
		countMap[name] = val
	}

	$('input').on('change', function() {
		[ ... this.files ].forEach(file => {
			add('sending', 1)
			const e = fileElement(file.name)
			sendFile(file, {
				onprogress: val => {
					e.setProgress(val)
				},
				onend: () => {
					add('sending', -1)
					add('ok', 1)
					e.end()
				},
				onerror: (err) => {
					add('sending', -1)
					add('failed', 1)
					e.failed(err)
				}
			})
		})
		this.value = ''
	})

})