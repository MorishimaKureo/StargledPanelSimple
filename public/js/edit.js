document.getElementById('edit-form').addEventListener('submit', function(e) {
    e.preventDefault();
    fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            file: "<%= file.replace(/\"/g, '\\\"') %>",
            content: document.getElementById('file-content').value
        })
    })
    .then(res => {
        if (res.ok) {
            document.getElementById('status').textContent = 'Saved!';
        } else {
            res.text().then(msg => document.getElementById('status').textContent = msg);
        }
    });
});