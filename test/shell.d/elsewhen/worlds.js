// Elsewhere.js keeps QML's .pragma/.import headers, so node strips those
// lines and evaluates the rest with its imports in scope.
const fs = require('fs')
const path = require('path')
const { Solar } = require('./solar.js')

const dir = path.join(__dirname, '../../../shell/plugins/panels/elsewhen')
const Model = require(path.join(dir, 'Model.js'))
const Worlds = require(path.join(dir, 'Worlds.js'))

const source = fs.readFileSync(path.join(dir, 'Elsewhere.js'), 'utf8').replace(/^\.(pragma|import) .*$/gm, '')
const module_ = { exports: {} }
new Function('module', 'Worlds', 'Model', 'Solar', source)(module_, Worlds, Model, Solar)

module.exports = { Elsewhere: module_.exports, Worlds, Model, Solar }
