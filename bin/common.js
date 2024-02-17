const { spawn } = require("child_process");
const { promises: fs } = require("fs");
const colors = require("colors");

const runningProcesses = {};

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
      if (err.code !== "ENOENT") {
        throw err;
      }

      await sleep(50);
    }
  }
}

async function removeIfExists(file) {
  try {
    await fs.rm(file, { recursive: true });
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}

function getTaskName(command, args) {
  if (command === "npx") {
    return args[0];
  }

  if (command === "npm" && args[0] === "run") {
    return args[1];
  }

  return command;
}

function logTask(task, content, from) {
  if (Buffer.isBuffer(content)) {
    content = content.toString();
  }

  const taskFrontmatter = `[${task}]`.blue;
  const lowerContent = content.toLowerCase();

  let contentColor = colors.gray;
  if (from === "stderr" || lowerContent.includes("error")) {
    contentColor = colors.red;
  } else if (lowerContent.includes("warning")) {
    contentColor = colors.yellow;
  } else if (lowerContent.includes("finished in")) {
    contentColor = colors.green;
  } else if (lowerContent.includes("total")) {
    contentColor = colors.cyan;
  }

  for (let line of content.split("\n")) {
    // if the line is blank or is just swa prefix, skip it
    if (!line || line.trim() === "[swa]") {
      continue;
    }

    // If it is a successful GET request from SWA, skip it
    if (line.includes("GET") && line.includes("- 200")) {
      continue;
    }

    // Color SWA prefixes
    if (line.startsWith("[")) {
      line = line.replace(/\[([a-z]{1,4})\]/, "[$1]".cyan);
    }

    console.log(`${taskFrontmatter} ${contentColor(line)}`);
  }
}

function runCommand(
  command,
  args,
  { throwOnNonZeroExit, onStdout, onStderr, ...options } = {}
) {
  const name = getTaskName(command, args);
  const proc = spawn(command, args, options);

  proc.stdout.on("data", onStdout || ((data) => logTask(name, data, "stdout")));
  proc.stderr.on("data", onStderr || ((data) => logTask(name, data, "stderr")));

  return new Promise((resolve, reject) =>
    proc.on("exit", (code) => {
      if (throwOnNonZeroExit && proc.exitCode !== 0) {
        reject(new Error(`Process ${name} exited with code ${code}`));
      }

      resolve(code);
    })
  );
}

function runProcess(command, args, options = {}) {
  const name = getTaskName(command, args);
  logTask(name, `Starting task...`, "stdout");

  const procData = {};

  options.postCreate = (proc) => {
    procData.kill = () => proc.kill("SIGINT");
  };
  procData.exitPromise = runCommand(command, args, options);

  runningProcesses[name] = procData;
  return [name, procData];
}

async function waitForProcess(name, options) {
  const { exitPromise } = runningProcesses[name];
  await exitPromise;

  if (options?.throw) {
    throw new Error(`Process ${name} exited`);
  }
}

function removeProcess(name) {
  delete runningProcesses[name];
}

async function waitForAnyProcess() {
  // Get the exit promises from the running processes
  const promises = Object.values(runningProcesses).reduce(
    (prev, { exitPromise }) => {
      return [...prev, exitPromise];
    },
    []
  );

  await Promise.race(promises);
}

function killAllProcesses() {
  Object.values(runningProcesses).forEach(({ kill }) => kill("SIGINT"));
}

module.exports = {
  // Utilities
  sleep,
  waitForFile,
  removeIfExists,

  // Generic process runner
  runCommand,
  runProcess,
  removeProcess,

  // Process synchronization
  waitForProcess,
  waitForAnyProcess,
  killAllProcesses,
};
