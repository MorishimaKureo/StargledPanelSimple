const socket = io();
let currentLogServerId = null;
let logBuffer = '';
let logSubscribed = false;

// Render server list
function renderServers() {
    fetch('/api/servers')
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('server-list');
            list.innerHTML = '';
            data.servers.forEach(srv => {
                const div = document.createElement('div');
                div.className = 'server-item';
                div.innerHTML = `
                    <strong class="server-link" style="cursor:pointer;color:#007bff;text-decoration:underline;" data-id="${srv.id}">${srv.name}</strong> (${srv.id})<br>
                    Status: <span style="color:${srv.status === 'running' ? 'green' : 'red'}">${srv.status}</span>
                    <div class="server-actions" style="margin-top:8px;">
                        <button onclick="startServer('${srv.id}')" ${srv.status === 'running' ? 'disabled' : ''}>Start</button>
                        <button onclick="stopServer('${srv.id}')" ${srv.status !== 'running' ? 'disabled' : ''}>Stop</button>
                        <button onclick="deleteServer('${srv.id}')">Delete</button> <!-- Added Delete Button -->
                    </div>
                `;
                list.appendChild(div);
                
                // Add click event to server name to go to console page
                div.querySelector('.server-link').onclick = function() {
                    window.location = `/console/${srv.id}`;
                };
            });
        });
}

function startServer(id) {
    fetch(`/api/server/${id}/start`, { method: 'POST' })
        .then(renderServers);
}

function stopServer(id) {
    fetch(`/api/server/${id}/stop`, { method: 'POST' })
        .then(renderServers);
}

// Log Modal Logic
function openLogModal(serverId, serverName) {
    currentLogServerId = serverId;
    logBuffer = '';
    document.getElementById('log-modal-title').textContent = `Console: ${serverName}`;
    document.getElementById('log-output').textContent = 'Loading...';
    document.getElementById('log-modal').style.display = 'flex';
    subscribeLog(serverId);
}

function closeLogModal() {
    document.getElementById('log-modal').style.display = 'none';
    unsubscribeLog();
}

document.getElementById('close-log-btn').onclick = closeLogModal;

// Socket.IO log streaming
function subscribeLog(serverId) {
    if (logSubscribed && currentLogServerId) {
        socket.emit('unsubscribe-log', currentLogServerId);
    }
    socket.emit('subscribe-log', serverId);
    logSubscribed = true;
}

function unsubscribeLog() {
    if (logSubscribed && currentLogServerId) {
        socket.emit('unsubscribe-log', currentLogServerId);
        logSubscribed = false;
        currentLogServerId = null;
    }
}

// Listen for log updates
socket.on('server-log', ({ serverId, log }) => {
    if (serverId !== currentLogServerId) return;
    if (logBuffer.length > 100000) logBuffer = logBuffer.slice(-80000); // Prevent memory bloat
    logBuffer += log;
    const logOutput = document.getElementById('log-output');
    logOutput.textContent += log;
    if (logOutput.textContent.length > 100000) {
        logOutput.textContent = logOutput.textContent.slice(-80000);
    }
    logOutput.scrollTop = logOutput.scrollHeight;
});

// When modal opens, clear previous log
document.getElementById('log-modal').addEventListener('show', function() {
    document.getElementById('log-output').textContent = '';
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('log-modal').style.display === 'flex') {
        closeLogModal();
    }
});

// Initial render
renderServers();