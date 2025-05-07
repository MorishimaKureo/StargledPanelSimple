const socket = io();
let cpuUsageChart; // Declare a variable to hold the chart instance

socket.on('system-stats', ({ cpuUsage, ramUsage, serverFolderSize }) => {
    document.getElementById('cpu-usage').textContent = `CPU Usage: ${cpuUsage.toFixed(2)}%`;
    document.getElementById('ram-usage').textContent = `RAM Usage: ${ramUsage.toFixed(2)} MB`;
    document.getElementById('server-folder-size').textContent = `Server Folder Size: ${serverFolderSize.toFixed(2)} GB`;

    // Destroy the existing chart instance if it exists
    if (cpuUsageChart) {
        cpuUsageChart.destroy();
    }

    // Update CPU usage graph
    const ctx = document.getElementById('cpu-usage-chart').getContext('2d');
    cpuUsageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: 10 }, (_, i) => i),
            datasets: [
                {
                    label: 'CPU Usage (%)',
                    data: Array(10).fill(cpuUsage),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'RAM Usage (MB)',
                    data: Array(10).fill(ramUsage),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Server Folder Size (GB)',
                    data: Array(10).fill(serverFolderSize),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
});

// Listen for server output
socket.on('server-output', (msg) => {
    const consoleOutput = document.getElementById('console-output');
    consoleOutput.textContent += msg + '\n';
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
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

// Add event listener for Enter key on command input
document.getElementById('command-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        sendCommand();
    }
});