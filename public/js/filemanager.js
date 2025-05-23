let currentPath = '';

function fetchFiles() {
    fetch(`/files/${serverId}?path=${encodeURIComponent(currentPath)}`)
        .then(res => res.json())
        .then(data => {
            const files = data.files;
            const list = document.getElementById('file-list');
            list.innerHTML = '';
            document.getElementById('current-path').textContent = '/' + (data.currentPath || '');
            document.getElementById('back-btn').style.display = data.currentPath ? '' : 'none';

            if (files.length === 0) {
                list.textContent = 'No files found.';
            } else {
                files.forEach(file => {
                    const div = document.createElement('div');
                    div.className = 'file-item';
                    div.style.position = 'relative';

                    // Icon for file/folder
                    const iconSpan = document.createElement('span');
                    iconSpan.style.marginRight = '8px';
                    iconSpan.textContent = file.isDirectory ? '📁' : '📄';
                    div.appendChild(iconSpan);

                    // File/folder name
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'file-name';
                    nameSpan.textContent = file.name;
                    if (file.isDirectory) {
                        nameSpan.style.fontWeight = 'bold';
                        nameSpan.onclick = () => {
                            currentPath = currentPath ? currentPath + '/' + file.name : file.name;
                            fetchFiles();
                        };
                    } else {
                        nameSpan.onclick = () => {
                            window.location.href = `/edit/${serverId}?file=${encodeURIComponent((currentPath ? currentPath + '/' : '') + file.name)}`;
                        };
                    }
                    div.appendChild(nameSpan);

                    // Triple dot button
                    const menuBtn = document.createElement('button');
                    menuBtn.className = 'action-menu-btn';
                    menuBtn.innerHTML = '&#8942;';
                    div.appendChild(menuBtn);

                    // Action menu (create but do not append to file item)
                    const menu = document.createElement('div');
                    menu.className = 'action-menu';

                    // Rename
                    const renameBtn = document.createElement('button');
                    renameBtn.textContent = 'Rename';
                    renameBtn.onclick = (e) => {
                        e.stopPropagation();
                        hideAllMenus();
                        showModal(`Rename "${file.name}" to:`, function(newName) {
                            if (!newName || newName === file.name) return;
                            fetch(`/rename/${serverId}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ oldName: (currentPath ? currentPath + '/' : '') + file.name, newName })
                            })
                            .then(res => {
                                if (res.ok) fetchFiles();
                                else res.text().then(msg => alert(msg));
                            });
                        });
                    };
                    menu.appendChild(renameBtn);

                    // Only show Download for files (not folders)
                    if (!file.isDirectory) {
                        const downloadBtn = document.createElement('button');
                        downloadBtn.textContent = 'Download';
                        downloadBtn.onclick = (e) => {
                            e.stopPropagation();
                            hideAllMenus();
                            window.open(`/download/${serverId}?file=${encodeURIComponent((currentPath ? currentPath + '/' : '') + file.name)}`);
                        };
                        menu.appendChild(downloadBtn);
                    }

                    // Delete
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        hideAllMenus();
                        if (confirm(`Delete ${file.name}?`)) {
                            fetch(`/delete/${serverId}?file=${encodeURIComponent((currentPath ? currentPath + '/' : '') + file.name)}`, { method: 'DELETE' })
                                .then(res => {
                                    if (res.ok) fetchFiles();
                                    else alert('Failed to delete file');
                                });
                        }
                    };
                    menu.appendChild(deleteBtn);

                    div.appendChild(menu);

                    // Show/hide menu logic
                    menuBtn.onclick = function(e) {
                        e.stopPropagation();
                        hideAllMenus();
                        // Position menu as popup
                        const rect = menuBtn.getBoundingClientRect();
                        menu.style.left = rect.left + 'px';
                        menu.style.top = (rect.bottom + 4) + 'px';
                        menu.classList.add('show');
                        document.body.appendChild(menu);

                        // Hide menu when clicking outside
                        setTimeout(() => {
                            document.addEventListener('mousedown', onBodyClick);
                        }, 0);

                        function onBodyClick(ev) {
                            if (!menu.contains(ev.target)) {
                                hideAllMenus();
                            }
                        }

                        menu._onBodyClick = onBodyClick;
                    };

                    // Hide menu when clicking outside
                    document.addEventListener('click', hideAllMenus);
                    function hideAllMenus() {
                        document.querySelectorAll('.action-menu.show').forEach(m => m.classList.remove('show'));
                    }

                    list.appendChild(div);
                });
            }
        });
}

document.getElementById('back-btn').onclick = function() {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    currentPath = parts.join('/');
    fetchFiles();
};

// Modal logic
let modalCallback = null;
function showModal(title, callback) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-input').value = '';
    document.getElementById('name-modal').style.display = 'flex';
    modalCallback = callback;
    setTimeout(() => document.getElementById('modal-input').focus(), 100);
}
function hideModal() {
    document.getElementById('name-modal').style.display = 'none';
    modalCallback = null;
}
document.getElementById('modal-cancel').onclick = hideModal;
document.getElementById('modal-ok').onclick = function() {
    if (modalCallback) {
        modalCallback(document.getElementById('modal-input').value.trim());
    }
    hideModal();
};
document.getElementById('modal-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('modal-ok').click();
    }
});

// New File button
document.getElementById('new-file-btn').onclick = function() {
    showModal('New File Name:', function(fileName) {
        if (!fileName) return;
        fetch(`/create-file/${serverId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: (currentPath ? currentPath + '/' : '') + fileName })
        })
        .then(res => {
            if (res.ok) fetchFiles();
            else res.text().then(msg => alert(msg));
        });
    });
};

// New Folder button
document.getElementById('new-folder-btn').onclick = function() {
    showModal('New Folder Name:', function(folderName) {
        if (!folderName) return;
        fetch(`/create-folder/${serverId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderName: (currentPath ? currentPath + '/' : '') + folderName })
        })
        .then(res => {
            if (res.ok) fetchFiles();
            else res.text().then(msg => alert(msg));
        });
    });
};

// Upload button
document.getElementById('upload-btn').onclick = function() {
    document.getElementById('hidden-file-input').click();
};

document.getElementById('hidden-file-input').onchange = function() {
    const formData = new FormData(document.getElementById('upload-form'));
    formData.set('path', currentPath);
    fetch(`/upload/${serverId}`, {
        method: 'POST',
        body: formData
    })
    .then(res => {
        if (res.ok) fetchFiles();
        else res.text().then(msg => alert(msg));
    });
};

fetchFiles();