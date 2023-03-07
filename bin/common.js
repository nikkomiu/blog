const { spawn } = require('child_process')
const { promises: fs } = require('fs')

const runningProcesses = {}

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForFile(file) {
  while (true) {
    try {
      await fs.access(file);
      return;
    } catch (err) {
      // console.log(err)
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

function runProcess(command, args, options) {
  const name = getTaskName(command, args)
  console.log(`[${name}] Starting task...`)

  const proc = spawn(command, args, options)
  proc.stdout.on('data', data => data.toString().split('\n').forEach(line => line && console.log(`[${name}] ${line}`)))
  proc.stderr.on('data', data => data.toString().split('\n').forEach(line => line && console.log(`[${name}] ${line}`)))

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
}
