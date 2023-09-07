const { spawn } = require('child_process')
const { promises: fs } = require('fs')
const glob = require('fast-glob')
const colors = require('colors')
const package = require('../package.json')

const runningProcesses = {}

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForFile(file, options = {}) {
  while (true) {
    try {
      await fs.access(file);
      if (options.postTimeout) {
        await sleep(options.postTimeout);
      }

      return;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }

      await sleep(50);
    }
  }
}

function getTaskName(command, args) {
  if (command === 'npx') {
    return args[0]
  }

  if (command === 'npm' && args[0] === 'run') {
    return args[1]
  }

  return command;
}

function logTask(task, content, from) {
  if (Buffer.isBuffer(content)) {
    content = content.toString()
  }

  const taskFrontmatter = `[${task}]`.blue
  const lowerContent = content.toLowerCase()

  let contentColor = colors.gray
  if (from === 'stderr' || lowerContent.includes('error')) {
    contentColor = colors.red
  } else if (lowerContent.includes('warning')) {
    contentColor = colors.yellow
  } else if (lowerContent.includes('finished in')) {
    contentColor = colors.green
  } else if (lowerContent.includes('total')) {
    contentColor = colors.cyan
  }

  for (let line of content.split('\n')) {
    // if the line is blank or is just swa prefix, skip it
    if (!line || line.trim() === '[swa]') {
      continue
    }

    // If it is a successful GET request from SWA, skip it
    if (line.includes('GET') && line.includes('- 200')) {
      continue
    }

    // Color SWA prefixes
    if (line.startsWith('[')) {
      line = line.replace(/\[([a-z]{1,4})\]/, "[$1]".cyan)
    }

    console.log(`${taskFrontmatter} ${contentColor(line)}`)
  }
}

function runProcess(command, args, options) {
  const name = getTaskName(command, args)
  logTask(name, `Starting task...`, 'stdout')

  const proc = spawn(command, args, options)
  proc.stdout.on('data', data => logTask(name, data, 'stdout'))
  proc.stderr.on('data', data => logTask(name, data, 'stderr'))

  const procData = {
    exitPromise: new Promise(resolve => proc.on('exit', (code) => resolve(code))),
    kill: () => proc.kill('SIGINT'),
    process,
  }

  runningProcesses[name] = procData;
  return [name, procData];
}

async function waitForProcess(name, options) {
  const { exitPromise } = runningProcesses[name]
  await exitPromise

  if (options?.throw) {
    throw new Error(`Process ${name} exited`)
  }
}

async function waitForAnyProcess() {
  // Get the exit promises from the running processes
  const promises = Object.values(runningProcesses).reduce((prev, { exitPromise }) => {
    return [...prev, exitPromise]
  }, [])

  await Promise.race(promises)
}

function killAllProcesses() {
  // console.log(Object.values(runningProcesses))
  Object.values(runningProcesses).forEach(({ kill }) => kill('SIGINT'))
}

async function runTailwind(opts = {}) {
  const { input, output } = package?.config?.tailwind || {};

  if (!input || !output) {
    return;
  }

  let cmdArgs = ['run', 'tailwind', '--', '-i', input, '-o', output]
  if (opts.watch) {
    cmdArgs.push('--watch')
  }

  // Delete tailwind css generated file (ignore not found errors)
  await fs.rm(output).catch(err => {
    if (err !== 'ENOENT') {
      throw err;
    }
  })

  const [procName] = runProcess('npm', cmdArgs)

  const procArgs = opts.watch ? { throw: true } : null;

  await Promise.race([
    waitForProcess(procName, procArgs),
    waitForFile(output)
  ])
}

async function loadManualCSS() {
  // copy katex css from node modules to public
  await fs.copyFile('node_modules/katex/dist/katex.min.css', 'public/katex.min.css');

  const fontFiles = await glob('node_modules/katex/dist/fonts/*');
  await Promise.all(fontFiles.map(async (fontFile) => {
    await fs.copyFile(fontFile, `public/fonts/${fontFile.split('/').pop()}`)
  }));
}

module.exports = {
  // Utilities
  sleep,
  waitForFile,

  // Generic process runner
  runProcess,

  // Process synchronization
  waitForProcess,
  waitForAnyProcess,
  killAllProcesses,

  // CSS
  loadManualCSS,
  runTailwind,
}
