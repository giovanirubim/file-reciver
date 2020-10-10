const fs = require('fs')
const child_process = require('child_process')
const obj = {}
fs.readdirSync('./web').forEach(name => {
	const buf = fs.readFileSync(`./web/${name}`)
	obj[name] = buf.toString('utf8').replace(/\r/g, '')
})

/*<target-1>*/
const zip = /*<target-2>*/obj/*<target-3>*/
const exists = (path) => !!zip[path]
const readFile = (path, callback) => {
	const buf = Buffer.from(zip[path], 'utf8')
	callback(null, buf)
}
/*<target-4>*/

const cache = fs.readFileSync(__filename).toString('utf8')
	.replace(/\r/g, '')
	.split('/*<target-1>*/')[1]
	.split('/*<target-4>*/')[0]
	.trim()
	.replace(/\/\*<target-2>\*\/.*\/\*<target-3>\*\//, JSON.stringify(zip, null, '\t'))

const app = fs.readFileSync('app.js').toString('utf8')
	.replace(/\r/g, '')
	.replace(/\/\*<target-1>\*\/(.|\n)*\/\*<target-2>\*\//g, cache)

if (!fs.existsSync('./building')) {
	fs.mkdirSync('./building')
}
fs.writeFileSync('./building/receive.js', app)
child_process.execSync('cd building && pkg receive.js -t node12-win-x64', {
	stdio: 'inherit'
})