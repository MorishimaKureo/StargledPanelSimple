const socket = io();
let logBuffer = '';

function subscribeLog() {
    socket.emit('subscribe-log', serverId);
}
function unsubscribeLog() {
    socket.emit('unsubscribe-log', serverId);
}

const logDiv = document.getElementById('console-log');
socket.on('server-log', ({ serverId: sid, log }) => {
    if (sid !== serverId) return;
    logDiv.textContent += log;
    if (logDiv.textContent.length > 100000) {
        logDiv.textContent = logDiv.textContent.slice(-80000);
    }
    logDiv.scrollTop = logDiv.scrollHeight;
});

document.getElementById('console-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const input = document.getElementById('console-input');
    const cmd = input.value.trim();
    if (!cmd) return;
    fetch(`/api/server/${serverId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
    })
    .then(res => {
        if (res.ok) {
            document.getElementById('console-status').textContent = '';
        } else {
            res.text().then(msg => document.getElementById('console-status').textContent = msg);
        }
    });
    input.value = '';
});

window.addEventListener('DOMContentLoaded', subscribeLog);
window.addEventListener('beforeunload', unsubscribeLog);