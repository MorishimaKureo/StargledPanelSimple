const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const http = require('http');
const serverManager = require('./serverManager');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/servers', express.static(path.join(__dirname, 'servers')));

// Body parser for JSON
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 500 * 1024 * 1024 } // Set limit to 500MB
});

// ===== Logger Utility =====
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}
function logEvent(message) {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${message}\n`;
    // Tulis ke file log harian
    const logFile = path.join(LOG_DIR, `${new Date().toISOString().slice(0,10)}.log`);
    fs.appendFileSync(logFile, logMsg);
    // Tampilkan juga di terminal
    console.log(logMsg.trim());
}

// ========== ROUTES ==========

// Home: List all servers
app.get('/', (req, res) => {
    logEvent('Home page accessed');
    res.render('index', { page: 'console' });
});

// API: List all servers
app.get('/api/servers', (req, res) => {
    logEvent('API: List all servers');
    res.json({ servers: serverManager.getAllServers() });
});

// API: Get server detail
app.get('/api/server/:id', (req, res) => {
    const srv = serverManager.getServer(req.params.id);
    logEvent(`API: Get server detail for ${req.params.id}`);
    if (!srv) return res.status(404).send('Not found');
    res.json(srv);
});

// API: Start server
app.post('/api/server/:id/start', (req, res) => {
    const id = req.params.id;
    logEvent(`API: Start server ${req.params.id}`);
    const ok = serverManager.startServer(id);
    logEvent(`Server ${id} ${ok ? 'started' : 'failed to start'}`);
    if (!ok) return res.status(400).send('Already running or not found');
    res.json({ status: 'started' });
});

// API: Stop server
app.post('/api/server/:id/stop', (req, res) => {
    const id = req.params.id;
    logEvent(`API: Stop server ${req.params.id}`);
    const ok = serverManager.stopServer(id);
    logEvent(`Server ${id} ${ok?'stopped' : 'failed to stop'}`);
    if (!ok) return res.status(400).send('Not running or not found');
    res.json({ status: 'stopped' });
});

// API: Update server config (startup command, name, etc)
app.post('/api/server/:id/config', (req, res) => {
    const id = req.params.id;
    logEvent(`API: Update server config for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    logEvent(`Server ${id} ${srv?'found' : 'not found'}`);
    if (!srv) return res.status(404).send('Not found');
    serverManager.updateServer(id, req.body);
    res.json({ status: 'updated' });
});

// File manager page per server
app.get('/filemanager/:id', (req, res) => {
    const id = req.params.id;
    logEvent(`File manager page accessed for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    logEvent(`File manager page accessed for ${req.params.id}`);
    if (!srv) return res.status(404).send('Not found');
    res.render('filemanager', { serverId: id, serverName: srv.name });
});

// Settings page per server
app.get('/settings/:serverId', (req, res) => {
    const serverId = req.params.serverId;
    logEvent(`Settings page accessed for ${req.params.serverId}`);
    const server = serverManager.getServer(serverId);
    logEvent(`Settings page accessed for ${req.params.serverId}`);
    if (!server) return res.status(404).send('Server not found');
    res.render('settings', {
        page: 'settings',
        serverId,
        startupScript: server.startup
    });
});

app.post('/settings/:serverId', (req, res) => {
    const serverId = req.params.serverId;
    logEvent(`Settings page submitted for ${req.params.serverId}`);
    const { startupScript } = req.body;
    const server = serverManager.getServer(serverId);
    if (!server) return res.status(404).send('Server not found');
    serverManager.updateServer(serverId, { startup: startupScript });
    res.json({ success: true });
});

// ========== FILE MANAGER API ==========

// List files/folders for a specific server
app.get('/files/:id', (req, res) => {
    const id = req.params.id;
    logEvent(`API: List files/folders for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    if (!srv) return res.status(404).send('Not found');
    const relPath = req.query.path || '';
    const absPath = path.join(serverManager.SERVERS_DIR, id, relPath);
    if (!absPath.startsWith(path.join(serverManager.SERVERS_DIR, id))) {
        return res.status(400).send('Invalid path');
    }
    fs.readdir(absPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).send('Failed to read directory');
        res.json({
            files: files.map(f => ({
                name: f.name,
                isDirectory: f.isDirectory()
            })),
            currentPath: relPath
        });
    });
});

// Download file
app.get('/download/:id', (req, res) => {
    const id = req.params.id;
    logEvent(`API: Download file for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    if (!srv) return res.status(404).send('Not found');
    const relPath = req.query.file;
    if (!relPath) return res.status(400).send('No file specified');
    const absPath = path.join(serverManager.SERVERS_DIR, id, relPath);
    if (!absPath.startsWith(path.join(serverManager.SERVERS_DIR, id))) {
        return res.status(400).send('Invalid path');
    }
    res.download(absPath);
});

// Create file
app.post('/create-file/:id', (req, res) => {
    const id = req.params.id;
    logEvent(`API: Create file for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    if (!srv) return res.status(404).send('Not found');
    const fileName = req.body.fileName;
    if (!fileName) return res.status(400).send('No file name');
    const absPath = path.join(serverManager.SERVERS_DIR, id, fileName);
    if (!absPath.startsWith(path.join(serverManager.SERVERS_DIR, id))) {
        return res.status(400).send('Invalid path');
    }
    fs.writeFile(absPath, '', err => {
        if (err) return res.status(500).send('Failed to create file');
        res.json({ status: 'created' });
    });
});

// Create folder
app.post('/create-folder/:id', (req, res) => {
    const id = req.params.id;
    logEvent(`API: Create folder for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    if (!srv) return res.status(404).send('Not found');
    const folderName = req.body.folderName;
    if (!folderName) return res.status(400).send('No folder name');
    const absPath = path.join(serverManager.SERVERS_DIR, id, folderName);
    if (!absPath.startsWith(path.join(serverManager.SERVERS_DIR, id))) {
        return res.status(400).send('Invalid path');
    }
    fs.mkdir(absPath, { recursive: true }, err => {
        if (err) return res.status(500).send('Failed to create folder');
        res.json({ status: 'created' });
    });
});

// Delete file/folder
app.delete('/delete/:id', (req, res) => {
    const id = req.params.id;
    logEvent(`API: Delete file/folder for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    if (!srv) return res.status(404).send('Not found');
    const relPath = req.query.file;
    if (!relPath) return res.status(400).send('No file specified');
    const absPath = path.join(serverManager.SERVERS_DIR, id, relPath);
    if (!absPath.startsWith(path.join(serverManager.SERVERS_DIR, id))) {
        return res.status(400).send('Invalid path');
    }
    fs.stat(absPath, (err, stats) => {
        if (err) return res.status(500).send('Not found');
        if (stats.isDirectory()) {
            fs.rm(absPath, { recursive: true, force: true }, err => {
                if (err) return res.status(500).send('Failed to delete folder');
                res.json({ status: 'deleted' });
            });
        } else {
            fs.unlink(absPath, err => {
                if (err) return res.status(500).send('Failed to delete file');
                res.json({ status: 'deleted' });
            });
        }
    });
});

// Rename file/folder
app.post('/rename/:id', (req, res) => {
    const id = req.params.id;
    logEvent(`API: Rename file/folder for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    if (!srv) return res.status(404).send('Not found');
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).send('Missing names');
    const oldPath = path.join(serverManager.SERVERS_DIR, id, oldName);
    const newPath = path.join(serverManager.SERVERS_DIR, id, newName);
    if (!oldPath.startsWith(path.join(serverManager.SERVERS_DIR, id)) ||
        !newPath.startsWith(path.join(serverManager.SERVERS_DIR, id))) {
        return res.status(400).send('Invalid path');
    }
    fs.rename(oldPath, newPath, err => {
        if (err) return res.status(500).send('Failed to rename');
        res.json({ status: 'renamed' });
    });
});

// Upload file
app.post('/upload/:id', upload.single('file'), (req, res) => {
    const id = req.params.id;
    logEvent(`API: Upload file for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    if (!srv) return res.status(404).send('Not found');
    if (!req.file) return res.status(400).send('No file uploaded');
    const relPath = req.body.path || '';
    const destPath = path.join(serverManager.SERVERS_DIR, id, relPath, req.file.originalname);
    if (!destPath.startsWith(path.join(serverManager.SERVERS_DIR, id))) {
        fs.unlinkSync(req.file.path);
        return res.status(400).send('Invalid path');
    }
    fs.rename(req.file.path, destPath, err => {
        if (err) return res.status(500).send('Failed to move file');
        res.json({ status: 'uploaded' });
    });
});

// ========== EDIT FILE ==========

// Edit file page (simple text editor)
app.get('/edit/:id', (req, res) => {
    const id = req.params.id;
    logEvent(`Edit file page accessed for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    if (!srv) return res.status(404).send('Not found');
    const relPath = req.query.file;
    if (!relPath) return res.status(400).send('No file specified');
    const absPath = path.join(serverManager.SERVERS_DIR, id, relPath);
    if (!absPath.startsWith(path.join(serverManager.SERVERS_DIR, id))) {
        return res.status(400).send('Invalid path');
    }
    fs.readFile(absPath, 'utf8', (err, content) => {
        if (err) return res.status(500).send('Failed to read file');
        res.render('edit', { serverId: id, filePath: relPath, content });
    });
});

// Save edited file
app.post('/edit/:id', (req, res) => {
    const id = req.params.id;
    logEvent(`API: Save edited file for ${req.params.id}`);
    const srv = serverManager.getServer(id);
    if (!srv) return res.status(404).send('Not found');
    const { filePath, content } = req.body;
    if (!filePath) return res.status(400).send('No file specified');
    const absPath = path.join(serverManager.SERVERS_DIR, id, filePath);
    if (!absPath.startsWith(path.join(serverManager.SERVERS_DIR, id))) {
        return res.status(400).send('Invalid path');
    }
    fs.writeFile(absPath, content, err => {
        if (err) return res.status(500).send('Failed to save file');
        res.json({ status: 'saved' });
    });
});

// ========== REALTIME LOG STREAMING PER SERVER ==========

const logWatchers = {}; // { [serverId]: { watcher, lastSize, clients: Set<socket> } }

function sendInitialLog(socket, serverId) {
    // Tidak ada initial log dari proses, bisa kirim pesan info
    socket.emit('server-log', { serverId, log: '[INFO] Log akan muncul di sini jika server sedang berjalan.\n' });
}

function watchProcessLog(serverId) {
    if (logWatchers[serverId]) return;
    let clients = new Set();

    function attachListeners(proc) {
        const onStdout = data => {
            for (const sock of clients) {
                sock.emit('server-log', { serverId, log: data.toString() });
            }
        };
        const onStderr = data => {
            for (const sock of clients) {
                sock.emit('server-log', { serverId, log: data.toString() });
            }
        };
        const onExit = code => {
            for (const sock of clients) {
                sock.emit('server-log', { serverId, log: `[INFO] Server process exited with code ${code}\n` });
            }
        };
        proc.stdout.on('data', onStdout);
        proc.stderr.on('data', onStderr);
        proc.on('exit', onExit);

        return { onStdout, onStderr, onExit };
    }

    let listeners = null;
    const proc = serverManager.processes[serverId];
    if (proc) {
        listeners = attachListeners(proc);
    }

    logWatchers[serverId] = {
        clients,
        listeners,
        close: () => {
            if (proc && listeners) {
                proc.stdout.off('data', listeners.onStdout);
                proc.stderr.off('data', listeners.onStderr);
                proc.off('exit', listeners.onExit);
            }
        }
    };
}

function unwatchProcessLog(serverId) {
    if (logWatchers[serverId]) {
        logWatchers[serverId].close();
        delete logWatchers[serverId];
    }
}

// Socket.IO for real-time log per server
io.on('connection', (socket) => {
    socket.on('subscribe-log', (serverId) => {
        // Tambahkan pada bagian Socket.IO
        io.on('connection', (socket) => {
            socket.on('subscribe-log', (serverId) => {
                // Simpan socket ke dalam map jika perlu
                // Pastikan saat server dijalankan, output dikirim ke socket ini
                // Misal:
                if (!serverManager.getStatus(serverId) === 'running') return;
                // Kirim log dari proses yang sedang berjalan
                // Implementasi detail tergantung pada arsitektur kamu
            });
            if (!serverManager.getServer(serverId)) return;
            watchProcessLog(serverId);
            logWatchers[serverId].clients.add(socket);
            sendInitialLog(socket, serverId);
        });

        socket.on('unsubscribe-log', (serverId) => {
            if (logWatchers[serverId]) {
                logWatchers[serverId].clients.delete(socket);
                if (logWatchers[serverId].clients.size === 0) {
                    unwatchProcessLog(serverId);
                }
            }
        });

        socket.on('disconnect', () => {
            for (const [serverId, watcher] of Object.entries(logWatchers)) {
                watcher.clients.delete(socket);
                if (watcher.clients.size === 0) {
                    unwatchLogFile(serverId);
                }
            }
        });
    });

    // Console page per server
    app.get('/console/:id', (req, res) => {
        const serverId = req.params.id;
        const server = serverManager.getServer(serverId);
        if (!server) return res.status(404).send('Server not found');
        res.render('console', { 
            serverId: serverId,
            serverName: server.name,
            serverStatus: server.status
        });
    });

    // API to send command to server process
    app.post('/api/server/:id/command', express.json(), (req, res) => {
        const id = req.params.id;
        const command = req.body.command;
        if (!command) return res.status(400).send('No command');
        const ok = serverManager.sendCommand(id, command);
        if (!ok) return res.status(400).send('Server not running');
        res.json({ status: 'sent' });
    });

    app.post('/api/create-server', (req, res) => {
        const { id, name, startup } = req.body;
        try {
            serverManager.createNewServer(id, name, startup);
            res.json({ success: true });
        } catch (error) {
            res.json({ success: false, message: error.message });
        }
    });

    app.delete('/api/delete-server/:id', (req, res) => {
        const serverId = req.params.id;
        try {
            serverManager.deleteServer(serverId);
            res.json({ success: true });
        } catch (error) {
            res.json({ success: false, message: error.message });
        }
    });
});

    // ========== START SERVER ==========

    server.listen(PORT, () => {
        console.log(`StargledPanelSimple multi-server running at http://localhost:${PORT}`);
    });