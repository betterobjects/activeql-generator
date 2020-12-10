#!/usr/bin/env node

var ejs = require('ejs')
var fs = require('fs')
var minimatch = require('minimatch')
var mkdirp = require('mkdirp')
var path = require('path')
var program = require('commander')
var readline = require('readline')
var sortedObject = require('sorted-object')
var util = require('util')

var MODE_0666 = parseInt('0666', 8)
var MODE_0755 = parseInt('0755', 8)
var VERSION = require('../package').version

var _exit = process.exit

// Re-assign process.exit because of commander
// TODO: Switch to a different command framework
process.exit = exit

// CLI

around(program, 'optionMissingArgument', function (fn, args) {
  program.outputHelp()
  fn.apply(this, args)
  return { args: [], unknown: [] }
})

before(program, 'outputHelp', function () {
  // track if help was shown for unknown option
  this._helpShown = true
})

before(program, 'unknownOption', function () {
  // allow unknown options if help was shown, to prevent trailing error
  this._allowUnknownOption = this._helpShown

  // show help if not yet shown
  if (!this._helpShown) {
    program.outputHelp()
  }
})

program
  .name('activeql')
  .version(VERSION, '    --version')
  .parse(process.argv)

if (!exit.exited) {
  main()
}

/**
 * Install an around function; AOP.
 */

function around (obj, method, fn) {
  var old = obj[method]

  obj[method] = function () {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) args[i] = arguments[i]
    return fn.call(this, old, args)
  }
}

/**
 * Install a before function; AOP.
 */

function before (obj, method, fn) {
  var old = obj[method]

  obj[method] = function () {
    fn.call(this)
    old.apply(this, arguments)
  }
}

/**
 * Prompt for confirmation on STDOUT/STDIN
 */

function confirm (msg, callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question(msg, function (input) {
    rl.close()
    callback(/^y|yes|ok|true$/i.test(input))
  })
}

/**
 * Copy file from template directory.
 */

function copyTemplate (from, to) {
  write(to, fs.readFileSync( from, 'utf-8'))
}

/**
 * Copy multiple files from template directory.
 */

function copyTemplateMulti (fromDir, toDir, nameGlob) {
  fs.readdirSync( fromDir )
    .filter(minimatch.filter(nameGlob, { matchBase: true }))
    .forEach(function (name) {
      copyTemplate(path.join(fromDir, name), path.join(toDir, name))
    })
}

/**
 * Create application at the given directory.
 *
 * @param {string} name
 * @param {string} dir
 */

function createApplication (name, dir) {
  console.log('Build express')
  createExpressApplication( name, dir );
  console.log('Done')
}

function createExpressApplication (name, dir) {
  // Package
  var pkg = {
    name: name,
    version: '0.0.0',
    private: true,
    "scripts": {
      "clean": "rimraf dist",
      "build": "rimraf dist && tsc",
      "watch:build": "tsc --watch",
      "server": "./node_modules/.bin/ts-node-dev -P ./tsconfig.json --watch ./ --no-notify --inspect -- ./app.ts",
      "seed": "./node_modules/.bin/ts-node -P ./tsconfig.json -- ./seed.ts",
      "test": "jest --watch --detectOpenHandles"
    },
      "dependencies": {
      "activeql-server": "^1.0.0",
      "apollo-server-express": "^2.9.3",
      "bcryptjs": "^2.4.3",
      "compression": "^1.7.4",
      "dotenv": "^8.2.0",
      "es6-template-strings": "^2.0.1",
      "express-jwt": "^6.0.0",
      "jsonwebtoken": "^8.5.1",
      "lodash": "^4.17.15",
      "yaml": "^1.7.2"
    },
    "devDependencies": {
      "@types/bcryptjs": "^2.4.2",
      "@types/compression": "^1.7.0",
      "@types/express-jwt": "0.0.42",
      "@types/jest": "^25.2.3",
      "@types/jsonwebtoken": "^8.5.0",
      "@types/lodash": "^4.14.138",
      "@types/node": "^14.0.9",
      "jest": "^26.0.1",
      "nodemon": "^2.0.4",
      "rimraf": "^3.0.2",
      "ts-jest": "^26.1.0",
      "ts-node": "^8.10.2",
      "ts-node-dev": "^1.0.0-pre.43",
      "typescript": "^3.9.3"
    }
  }

  dir = path.join( dir, 'express');
  mkdir(dir, '.')

  mkdir(dir, 'domain-configuration')
  mkdir(dir, 'impl')
  mkdir(dir, 'uploads')
  

  var templateDir = path.join(__dirname, '..', 'express-ts-template')

  copyTemplateMulti( templateDir, dir, '*.ts' );
  copyTemplateMulti( templateDir, dir, '*.json' );
  copyTemplateMulti( templateDir, dir, 'README.md' );
  copyTemplateMulti( templateDir + '/impl', dir + '/impl', '*.ts' );
  copyTemplateMulti( templateDir + '/domain-configuration', dir + '/domain-configuration', '*.yml' );

  write(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

  var prompt = launchedFromCmd() ? '>' : '$'

  console.log()
  console.log('   change directory:')
  console.log('     %s cd %s', prompt, dir)

  console.log()
  console.log('   install dependencies:')
  console.log('     %s npm install', prompt)  

  console.log()
  console.log('   run server:')
  console.log('     %s npm run server', prompt)
  console.log()

}

/**
 * Create an app name from a directory path, fitting npm naming requirements.
 *
 * @param {String} pathName
 */

function createAppName (pathName) {
  return path.basename(pathName)
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/^[-_.]+|-+$/g, '')
    .toLowerCase()
}

/**
 * Check if the given directory `dir` is empty.
 *
 * @param {String} dir
 * @param {Function} fn
 */

function emptyDirectory (dir, fn) {
  fs.readdir(dir, function (err, files) {
    if (err && err.code !== 'ENOENT') throw err
    fn(!files || !files.length)
  })
}

/**
 * Graceful exit for async STDIO
 */

function exit (code) {
  // flush output for Node.js Windows pipe bug
  // https://github.com/joyent/node/issues/6247 is just one bug example
  // https://github.com/visionmedia/mocha/issues/333 has a good discussion
  function done () {
    if (!(draining--)) _exit(code)
  }

  var draining = 0
  var streams = [process.stdout, process.stderr]

  exit.exited = true

  streams.forEach(function (stream) {
    // submit empty write request and wait for completion
    draining += 1
    stream.write('', done)
  })

  done()
}

/**
 * Determine if launched from cmd.exe
 */

function launchedFromCmd () {
  return process.platform === 'win32' &&
    process.env._ === undefined
}

/**
 * Load template file.
 */

function loadTemplate (name) {
  var contents = fs.readFileSync(path.join(__dirname, '..', 'templates', (name + '.ejs')), 'utf-8')
  var locals = Object.create(null)

  function render () {
    return ejs.render(contents, locals, {
      escape: util.inspect
    })
  }

  return {
    locals: locals,
    render: render
  }
}

/**
 * Main program.
 */

function main () {
  // Path
  var destinationPath = program.args.shift() || '.'

  // App name
  var appName = createAppName(path.resolve(destinationPath)) || 'hello-world'

  // Generate application
  emptyDirectory(destinationPath, function (empty) {
    if (empty || program.force) {
      createApplication(appName, destinationPath)
    } else {
      confirm('destination is not empty, continue? [y/N] ', function (ok) {
        if (ok) {
          process.stdin.destroy()
          createApplication(appName, destinationPath)
        } else {
          console.error('aborting')
          exit(1)
        }
      })
    }
  })
}

/**
 * Make the given dir relative to base.
 *
 * @param {string} base
 * @param {string} dir
 */

function mkdir (base, dir) {
  var loc = path.join(base, dir)

  console.log('   \x1b[36mcreate\x1b[0m : ' + loc + path.sep)
  mkdirp.sync(loc, MODE_0755)
}

/**
 * Generate a callback function for commander to warn about renamed option.
 *
 * @param {String} originalName
 * @param {String} newName
 */

function renamedOption (originalName, newName) {
  return function (val) {
    warning(util.format("option `%s' has been renamed to `%s'", originalName, newName))
    return val
  }
}

/**
 * Display a warning similar to how errors are displayed by commander.
 *
 * @param {String} message
 */

function warning (message) {
  console.error()
  message.split('\n').forEach(function (line) {
    console.error('  warning: %s', line)
  })
  console.error()
}

/**
 * echo str > file.
 *
 * @param {String} file
 * @param {String} str
 */

function write (file, str, mode) {
  fs.writeFileSync(file, str, { mode: mode || MODE_0666 })
  console.log('   \x1b[36mcreate\x1b[0m : ' + file)
}