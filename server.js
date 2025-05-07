const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'server') });

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const logFilePath = path.join(__dirname, 'logs', 'console.log');

if (!fs.existsSync(path.dirname(logFilePath))) {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
}

function appendLog(message) {
    fs.appendFileSync(logFilePath, message + '\n');
}

let mcProcess = null;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Function to calculate folder size
function getFolderSize(folderPath) {
    const files = fs.readdirSync(folderPath);
    let totalSize = 0;
    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.isDirectory() ? getFolderSize(filePath) : stats.size;
    });
    return totalSize;
}

// Emit system stats periodically
setInterval(() => {
    if (mcProcess) {
        const cpuUsage = os.loadavg()[0] / os.cpus().length * 100; // CPU usage as percentage
        const ramUsage = process.memoryUsage().rss / (1024 * 1024); // RAM usage in MB
        const serverFolderSize = getFolderSize(path.join(__dirname, 'server')) / (1024 * 1024 * 1024); // Folder size in GB

        io.emit('system-stats', {
            cpuUsage,
            ramUsage,
            serverFolderSize
        });
    }
}, 5000); // Emit every 5 seconds

// Render the main page
app.get('/', (req, res) => {
    res.render('index', { page: 'console' });
});

app.get('/logs', (req, res) => {
    if (fs.existsSync(logFilePath)) {
        res.send(fs.readFileSync(logFilePath, 'utf8'));
    } else {
        res.send('');
    }
});

// Render the file manager page
app.get('/filemanager', (req, res) => {
    res.render('filemanager', { page: 'filemanager' });
});

// File manager route
app.get('/files', (req, res) => {
    const relPath = req.query.path || '';
    const serverDir = path.join(__dirname, 'server');
    const targetDir = path.join(serverDir, relPath);

    // Prevent directory traversal
    if (!targetDir.startsWith(serverDir)) {
        return res.status(400).json([]);
    }

    fs.readdir(targetDir, (err, files) => {
        if (err) return res.status(500).json([]);
        const result = files.map(name => {
            const stat = fs.statSync(path.join(targetDir, name));
            return { name, isDirectory: stat.isDirectory() };
        });
        res.json({
            files: result,
            currentPath: relPath
        });
    });
});

// Download file route
app.get('/download', (req, res) => {
    const file = req.query.file;
    if (!file) return res.status(400).send('No file specified');
    const filePath = path.join(__dirname, 'server', file);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    console.log(`Downloading file: ${file}`);
    res.download(filePath);
});

// Delete file route
app.delete('/delete', (req, res) => {
    const file = req.query.file;
    if (!file) return res.status(400).send('No file specified');
    const filePath = path.join(__dirname, 'server', file);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    fs.unlink(filePath, err => {
        if (err) return res.status(500).send('Failed to delete');
        console.log(`Deleted file: ${file}`);
        res.sendStatus(200);
    });
});

// Create new file route
app.post('/create-file', express.json(), (req, res) => {
    const { fileName } = req.body;
    if (!fileName || /[\\/:*?"<>|]/.test(fileName)) {
        return res.status(400).send('Invalid file name');
    }
    const filePath = path.join(__dirname, 'server', fileName);
    if (fs.existsSync(filePath)) {
        return res.status(400).send('File already exists');
    }
    fs.writeFile(filePath, '', err => {
        if (err) return res.status(500).send('Failed to create file');
        console.log(`Created file: ${fileName}`);
        res.sendStatus(200);
    });
});

// Create new folder route
app.post('/create-folder', express.json(), (req, res) => {
    const { folderName } = req.body;
    if (!folderName || /[\\/:*?"<>|]/.test(folderName)) {
        return res.status(400).send('Invalid folder name');
    }
    const folderPath = path.join(__dirname, 'server', folderName);
    if (fs.existsSync(folderPath)) {
        return res.status(400).send('Folder already exists');
    }
    fs.mkdir(folderPath, err => {
        if (err) return res.status(500).send('Failed to create folder');
        console.log(`Created folder: ${folderName}`);
        res.sendStatus(200);
    });
});

// Upload file route
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    // Optionally, you can rename the file to its original name
    const destPath = path.join(req.file.destination, req.file.originalname);
    if (fs.existsSync(destPath)) {
        // Remove the uploaded file if a file with the same name exists
        fs.unlinkSync(req.file.path);
        return res.status(400).send('File already exists');
    }
    fs.rename(req.file.path, destPath, err => {
        if (err) return res.status(500).send('Failed to save file');
        console.log(`Uploaded file: ${req.file.originalname}`);
        res.sendStatus(200);
    });
});

const settingsPath = path.join(__dirname, 'settings.json');

// Helper to get settings
function getSettings() {
    if (fs.existsSync(settingsPath)) {
        try {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

// Helper to save settings
function saveSettings(settings) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

// Settings page
app.get('/settings', (req, res) => {
    const settings = getSettings();
    res.render('settings', {
        page: 'settings',
        startupScript: settings.startupScript || 'java -Xmx1024M -Xms1024M -jar server.jar nogui'
    });
});

// Update settings
app.post('/settings', express.json(), (req, res) => {
    const { startupScript } = req.body;
    const settings = getSettings();
    if (startupScript && typeof startupScript === 'string') {
        settings.startupScript = startupScript;
        saveSettings(settings);
        console.log(`Updated startup script: ${startupScript}`);
        res.sendStatus(200);
    } else {
        res.send('');
    }
});

io.on('connection', (socket) => {
    // Emit stored logs to the client
    socket.emit('stored-logs', fs.existsSync(logFilePath) ? fs.readFileSync(logFilePath, 'utf8') : '');

    socket.on('server-output', (msg) => {
        appendLog(msg);
        io.emit('server-output', msg);
    });

    socket.on('start-server', () => {
        if (!mcProcess) {
            // Use custom or default startup script
            const settings = getSettings();
            const script = settings.startupScript || 'java -Xmx1024M -Xms1024M -jar server.jar nogui';
            // Split script into command and args
            const [cmd, ...args] = script.split(' ');
            mcProcess = spawn(cmd, args, {
                cwd: path.join(__dirname, 'server')
            });

            mcProcess.stdout.on('data', (data) => {
                io.emit('server-output', data.toString());
                console.log(`Server output: ${data.toString().trim()}`);
            });

            mcProcess.stderr.on('data', (data) => {
                io.emit('server-output', data.toString());
                console.error(`Server error: ${data.toString().trim()}`);
            });

            mcProcess.on('close', (code) => {
                io.emit('server-output', `Server stopped with code ${code}`);
                console.log(`Server stopped with code ${code}`);
                mcProcess = null;
            });

            console.log('Server started');
        }
    });

    socket.on('stop-server', () => {
        if (mcProcess) {
            mcProcess.stdin.write('stop\n');
            console.log('Server stop command sent');
        }
    });

    socket.on('send-command', (cmd) => {
        if (mcProcess) {
            mcProcess.stdin.write(cmd + '\n');
            console.log(`Command sent: ${cmd}`);
        }
    });

    socket.on('kill-server', () => {
        if (mcProcess) {
            mcProcess.kill('SIGKILL');
            mcProcess = null;
            io.emit('server-output', 'Server process killed!');
            console.log('Server process killed');
        }
    });
});

// Get file content for editing
app.get('/edit', (req, res) => {
    const file = req.query.file;
    if (!file) return res.status(400).send('No file specified');
    const filePath = path.join(__dirname, 'server', file);
    if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
        return res.status(404).send('File not found');
    }
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Failed to read file');
        res.render('edit', { file, content: data, page: 'filemanager' });
    });
});

// Save file content
app.post('/save', express.json(), (req, res) => {
    const { file, content } = req.body;
    if (!file) return res.status(400).send('No file specified');
    const filePath = path.join(__dirname, 'server', file);
    if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
        return res.status(404).send('File not found');
    }
    fs.writeFile(filePath, content, err => {
        if (err) return res.status(500).send('Failed to save file');
        console.log(`File saved: ${file}`);
        res.sendStatus(200);
    });
});

// Rename file or folder route
app.post('/rename', express.json(), (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName || /[\\/:*?"<>|]/.test(newName)) {
        return res.status(400).send('Invalid name');
    }
    const serverDir = path.join(__dirname, 'server');
    const oldPath = path.join(serverDir, oldName);
    const newPath = path.join(serverDir, newName);
    if (!fs.existsSync(oldPath)) {
        return res.status(404).send('Original file/folder not found');
    }
    if (fs.existsSync(newPath)) {
        return res.status(400).send('A file or folder with the new name already exists');
    }
    fs.rename(oldPath, newPath, err => {
        if (err) return res.status(500).send('Failed to rename');
        console.log(`Renamed from ${oldName} to ${newName}`);
        res.sendStatus(200);
    });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});