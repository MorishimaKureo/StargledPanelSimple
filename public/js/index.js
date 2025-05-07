const socket = io();

socket.on('system-stats', ({ cpuUsage, ramUsage, serverFolderSize }) => {
    document.getElementById('cpu-usage').textContent = `CPU Usage: ${cpuUsage.toFixed(2)}%`;
    document.getElementById('ram-usage').textContent = `RAM Usage: ${ramUsage.toFixed(2)} MB`;
    document.getElementById('server-folder-size').textContent = `Server Folder Size: ${serverFolderSize.toFixed(2)} GB`;

    // Update CPU usage graph
    const ctx = document.getElementById('cpu-usage-chart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: 10 }, (_, i) => i),
            datasets: [{
                label: 'CPU Usage (%)',
                data: Array(10).fill(cpuUsage),
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
});

function startServer() {
    socket.emit('start-server');
    console.log('Server start command sent');
}

function stopServer() {
    socket.emit('stop-server');
    console.log('Server stop command sent');
}

function clearLog() {
    const consoleOutput = document.getElementById('console-output');
    consoleOutput.textContent = '';
    console.log('Console log cleared');
}

function sendCommand() {
    const cmd = document.getElementById('command-input').value;
    socket.emit('send-command', cmd);
    document.getElementById('command-input').value = '';
}