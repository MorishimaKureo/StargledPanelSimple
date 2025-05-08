const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SERVERS_DIR = path.join(__dirname, 'servers') // For compatibility if you move this file
    .replace(/[\\/]serverManager\.js$/, '') // Remove filename if run from this file
    .replace(/[\\/]$/, ''); // Remove trailing slash
const SERVERS_ROOT = path.join(__dirname, 'servers');
const CONFIG_FILE = path.join(SERVERS_ROOT, 'servers.json');

let servers = {};
let processes = {};

// Load servers from config file
function loadServers() {
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ servers: [] }, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE));
    servers = {};
    data.servers.forEach(srv => {
        servers[srv.id] = srv;
    });
}

// Save servers to config file
function saveServers() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ servers: Object.values(servers) }, null, 2));
}

// Get all servers as array
function getAllServers() {
    return Object.values(servers);
}

// Get server by id
function getServer(id) {
    return servers[id];
}

// Update server config (partial update)
function updateServer(id, data) {
    servers[id] = { ...servers[id], ...data };
    saveServers();
}

// Start a server process
function startServer(id, onOutput, onExit) {
    const srv = servers[id];
    if (!srv || processes[id]) return false;
    const cwd = path.resolve(SERVERS_ROOT, srv.id);
    const args = srv.startup.split(' ');
    const cmd = args.shift();
    const proc = spawn(cmd, args, { cwd });
    processes[id] = proc;
    servers[id].status = 'running';
    saveServers();

    proc.stdout.on('data', data => onOutput && onOutput(data.toString()));
    proc.stderr.on('data', data => onOutput && onOutput(data.toString()));
    proc.on('exit', code => {
        servers[id].status = 'stopped';
        saveServers();
        delete processes[id];
        if (onExit) onExit(code);
    });
    return true;
}

// Stop a server process
function stopServer(id) {
    if (processes[id]) {
        processes[id].kill();
        return true;
    }
    return false;
}

// Get status of a server
function getStatus(id) {
    return servers[id] ? servers[id].status : 'unknown';
}

// Initial load
loadServers();

function sendCommand(id, command) {
    const proc = processes[id];
    if (proc && proc.stdin.writable) {
        proc.stdin.write(command + '\n');
        return true;
    }
    return false;
}

function createNewServer(id, name, startupCommand) {
    const serverPath = path.join(SERVERS_ROOT, id);

    // Check if the server directory already exists
    if (fs.existsSync(serverPath)) {
        throw new Error(`Server with ID '${id}' already exists.`);
    }

    // Create the server directory
    fs.mkdirSync(serverPath, { recursive: true });

    // Add the new server to the configuration
    servers[id] = {
        id,
        name,
        path: `./servers/${id}`,
        startup: startupCommand,
        status: 'stopped'
    };

    saveServers();
}

function deleteServer(id) {
    const serverPath = path.join(SERVERS_ROOT, id);

    // Check if the server directory exists
    if (!fs.existsSync(serverPath)) {
        throw new Error(`Server with ID '${id}' does not exist.`);
    }

    // Remove the server directory
    fs.rmSync(serverPath, { recursive: true, force: true });

    // Remove the server from the configuration
    delete servers[id];
    saveServers();
}

module.exports = {
    loadServers,
    saveServers,
    getAllServers,
    getServer,
    updateServer,
    startServer,
    stopServer,
    getStatus,
    sendCommand,
    createNewServer,
    deleteServer, // Export the new function
    SERVERS_DIR: SERVERS_ROOT
};