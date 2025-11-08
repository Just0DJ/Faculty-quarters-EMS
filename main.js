// Combined JavaScript for FqEMS

// --- Globals ---
let currentFiles = [];
let fqems_users = [];
let fqems_uploaded_data = [];
const chartInstances = {};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initApp();
});

function initApp() {
    initAuth();
    initUI();
    initPage(getActivePage());
}

function initPage(page) {
    switch (page) {
        case 'dashboard':
            initDashboard();
            break;
        case 'bills':
            initBills();
            break;
        case 'analytics':
            initAnalytics();
            break;
        case 'profile':
            initProfile();
            break;
        case 'upload':
            initUpload();
            break;
    }
}

// --- LocalStorage Persistence ---
function loadFromLocalStorage() {
    fqems_users = JSON.parse(localStorage.getItem('fqems_users')) || [
        { username: 'admin', password: 'admin123', name: 'Admin User', role: 'Admin', floors: [], flats: [] },
        { username: 'faculty1', password: 'faculty123', name: 'Dr. Sharma', role: 'Faculty', floors: ['1'], flats: ['101'] }
    ];
    fqems_uploaded_data = JSON.parse(localStorage.getItem('fqems_uploaded_data')) || [];
}

function saveUsersToLocalStorage() {
    localStorage.setItem('fqems_users', JSON.stringify(fqems_users));
}

function saveUploadedDataToLocalStorage() {
    localStorage.setItem('fqems_uploaded_data', JSON.stringify(fqems_uploaded_data));
}

// --- Authentication ---
function initAuth() {
    const user = getCurrentUser();
    updateUIForAuthStatus(user);

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const logoutNavItem = document.querySelector('.nav-item[data-page="logout"]');
    if (logoutNavItem) {
        logoutNavItem.addEventListener('click', handleLogout);
    }
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const user = fqems_users.find(u => u.username === username && u.password === password);

    if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        updateUIForAuthStatus(user);
        navigateTo('dashboard');
        showNotification('Login successful', 'success');
    } else {
        showNotification('Invalid username or password', 'error');
    }
}

function handleLogout() {
    sessionStorage.removeItem('currentUser');
    document.body.classList.remove('admin-mode', 'faculty-mode');
    updateUIForAuthStatus(null);
    navigateTo('login');
    showNotification('Logged out successfully', 'success');
}

function getCurrentUser() {
    const userJson = sessionStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

function updateUIForAuthStatus(user) {
    const loginSection = document.getElementById('login');
    const navItems = document.querySelectorAll('.nav-item');
    const userNameElement = document.querySelector('.user-name');
    const userRoleElement = document.querySelector('.user-role');

    document.body.classList.remove('admin-mode', 'faculty-mode');

    if (user) {
        if (user.role === 'Admin') document.body.classList.add('admin-mode');
        if (user.role === 'Faculty') document.body.classList.add('faculty-mode');

        if (loginSection) loginSection.classList.remove('active');

        navItems.forEach(item => {
            const page = item.dataset.page;
            if (page === 'login') {
                item.classList.add('hidden');
            } else if (user.role === 'Admin' || !item.classList.contains('admin-only')) {
                item.classList.remove('hidden');
            }
        });

        userNameElement.textContent = user.name;
        userRoleElement.textContent = user.role;
    } else {
        if (loginSection) loginSection.classList.add('active');
        document.querySelectorAll('.page').forEach(p => {
            if (p.id !== 'login') p.classList.remove('active');
        });

        navItems.forEach(item => {
            const page = item.dataset.page;
            if (page === 'login') {
                item.classList.remove('hidden');
                item.classList.add('active');
            } else {
                item.classList.add('hidden');
            }
        });

        userNameElement.textContent = 'Guest User';
        userRoleElement.textContent = 'Not logged in';
    }
}

// --- UI & Navigation ---
function initUI() {
    setupNavigation();
    setupThemeToggle();
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            if (page === 'logout') return;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const selectedPage = document.getElementById(page);
    if (selectedPage) selectedPage.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) item.classList.add('active');
    });
    initPage(page);
}

function getActivePage() {
    const activePage = document.querySelector('.page.active');
    return activePage ? activePage.id : 'login';
}

function setupThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDarkMode = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        updateChartsTheme(isDarkMode);
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// --- Page Initializers ---
function initDashboard() {
    updateDashboardWithNewData(fqems_uploaded_data);
    createDashboardCharts();
}

function initBills() {
    const user = getCurrentUser();
    if (!user) return;

    const billsContainer = document.getElementById('bills-container');
    const monthFilter = document.getElementById('month-filter');
    const floorFilter = document.getElementById('floor-filter');
    const flatFilter = document.getElementById('flat-filter');

    function renderBills() {
        let filteredData = fqems_uploaded_data;
        const selectedMonth = monthFilter.value;
        const selectedFloor = floorFilter.value;
        const selectedFlat = flatFilter.value;

        if (selectedMonth) {
            filteredData = filteredData.filter(row => {
                const month = getField(row, ['Month', 'Period']);
                return month === selectedMonth;
            });
        }
        if (user.role === 'Admin') {
            if (selectedFloor) {
                filteredData = filteredData.filter(row => String(getField(row, ['Floor Number', 'Floor'])) === selectedFloor);
            }
            if (selectedFlat) {
                filteredData = filteredData.filter(row => String(getField(row, ['Flat Number', 'Flat'])) === selectedFlat);
            }
        } else if (user.role === 'Faculty') {
            filteredData = filteredData.filter(row => user.flats.includes(String(getField(row, ['Flat Number', 'Flat']))));
        }

        billsContainer.innerHTML = '';
        if (filteredData.length === 0) {
            billsContainer.innerHTML = '<p>No bills found for the selected criteria.</p>';
            return;
        }

        filteredData.forEach(row => {
            const billCard = document.createElement('div');
            billCard.className = 'bill-card';
            const flat = String(getField(row, ['Flat Number', 'Flat']));
            const floor = String(getField(row, ['Floor Number', 'Floor']));
            billCard.innerHTML = `
                <h4>${getField(row, ['Month', 'Period']) || 'Bill'}</h4>
                <p><strong>Flat:</strong> <a href="#" class="link-flat" data-flat="${flat}" data-floor="${floor}">${flat}</a></p>
                <div class="bill-details">
                    <p><span>Units:</span> ${toNumber(getField(row, ['Total Units', 'Consumption']))}</p>
                    <p><span>Total Cost:</span> ₹${toNumber(getField(row, ['Total Cost', 'Amount']))}</p>
                </div>
            `;
            billsContainer.appendChild(billCard);

            if (user.role === 'Admin') {
                const link = billCard.querySelector('.link-flat');
                if (link) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        openAssignModal(flat, floor);
                    });
                }
            }
        });
    }

    // Populate filters
    const months = [...new Set(fqems_uploaded_data.map(row => getField(row, ['Month', 'Period'])))];
    monthFilter.innerHTML = '<option value="">All Months</option>' + months.map(m => `<option value="${m}">${m}</option>`).join('');

    if (user.role === 'Admin') {
        const floors = [...new Set(fqems_uploaded_data.map(row => getField(row, ['Floor Number', 'Floor'])))];
        floorFilter.innerHTML = '<option value="">All Floors</option>' + floors.map(f => `<option value="${f}">${f}</option>`).join('');
        const flats = [...new Set(fqems_uploaded_data.map(row => getField(row, ['Flat Number', 'Flat'])))];
        flatFilter.innerHTML = '<option value="">All Flats</option>' + flats.map(f => `<option value="${f}">${f}</option>`).join('');
    } else {
        floorFilter.style.display = 'none';
        flatFilter.style.display = 'none';
    }

    monthFilter.addEventListener('change', renderBills);
    floorFilter.addEventListener('change', renderBills);
    flatFilter.addEventListener('change', renderBills);

    renderBills();
}

function initAnalytics() {
    populateAnalyticsFilters();
    renderAnalytics();

    const exportCsvBtn = document.getElementById('export-csv');
    const exportPdfBtn = document.getElementById('export-pdf');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => exportCSV(fqems_uploaded_data));
    }
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => exportPDF(fqems_uploaded_data));
    }

    const applyBtn = document.getElementById('analytics-apply');
    const chartTypeSel = document.getElementById('analytics-chart-type');
    const periodSel = document.getElementById('analytics-period');
    const metricSel = document.getElementById('analytics-metric');
    const monthsSel = document.getElementById('analytics-months');
    const floorsSel = document.getElementById('analytics-floors');
    const flatsSel = document.getElementById('analytics-flats');
    const rerender = () => renderAnalytics();
    [chartTypeSel, periodSel, metricSel, monthsSel, floorsSel, flatsSel].forEach(el => {
        if (el) el.addEventListener('change', rerender);
    });
    if (applyBtn) applyBtn.addEventListener('click', rerender);
}

function initProfile() {
    const user = getCurrentUser();
    if (!user) return;

    const profileInfo = document.getElementById('profile-info');
    const profileControls = document.getElementById('profile-controls');

    profileInfo.innerHTML = `
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>Role:</strong> ${user.role}</p>
        <p><strong>Username:</strong> ${user.username}</p>
        <p><strong>Floors:</strong> ${user.floors.join(', ')}</p>
        <p><strong>Flats:</strong> ${user.flats.join(', ')}</p>
    `;

    profileControls.innerHTML = '';
    if (user.role === 'Admin') {
        profileControls.innerHTML = `
            <h4>Add Faculty User</h4>
            <form id="add-faculty-form">
                <input type="text" id="faculty-name" placeholder="Full Name" required>
                <input type="text" id="faculty-username" placeholder="Username" required>
                <input type="password" id="faculty-password" placeholder="Password" required>
                <input type="text" id="faculty-floors" placeholder="Floors (comma-separated)">
                <input type="text" id="faculty-flats" placeholder="Flats (comma-separated)">
                <button type="submit">Add User</button>
            </form>
            <h4>Add Admin User</h4>
            <form id="add-admin-form">
                <input type="text" id="admin-name" placeholder="Full Name" required>
                <input type="text" id="admin-username" placeholder="Username" required>
                <input type="password" id="admin-password" placeholder="Password" required>
                <button type="submit">Add Admin</button>
            </form>
        `;
        document.getElementById('add-faculty-form').addEventListener('submit', e => {
            e.preventDefault();
            const name = document.getElementById('faculty-name').value;
            const username = document.getElementById('faculty-username').value;
            const password = document.getElementById('faculty-password').value;
            const floors = document.getElementById('faculty-floors').value.split(',').map(s => s.trim()).filter(Boolean);
            const flats = document.getElementById('faculty-flats').value.split(',').map(s => s.trim()).filter(Boolean);

            fqems_users.push({ username, password, name, role: 'Faculty', floors, flats });
            saveUsersToLocalStorage();
            showNotification('Faculty user added', 'success');
            e.target.reset();
            initProfile();
        });
        document.getElementById('add-admin-form').addEventListener('submit', e => {
            e.preventDefault();
            const name = document.getElementById('admin-name').value;
            const username = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            fqems_users.push({ username, password, name, role: 'Admin', floors: [], flats: [] });
            saveUsersToLocalStorage();
            showNotification('Admin user added', 'success');
            e.target.reset();
            initProfile();
        });
        renderUserManagement();
    } else if (user.role === 'Faculty') {
        profileControls.innerHTML = `
            <h4>Update Your Assignments</h4>
            <form id="update-faculty-form">
                <input type="text" id="faculty-update-floors" value="${user.floors.join(', ')}">
                <input type="text" id="faculty-update-flats" value="${user.flats.join(', ')}">
                <button type="submit">Update</button>
            </form>
        `;
        document.getElementById('update-faculty-form').addEventListener('submit', e => {
            e.preventDefault();
            const floors = document.getElementById('faculty-update-floors').value.split(',').map(s => s.trim()).filter(Boolean);
            const flats = document.getElementById('faculty-update-flats').value.split(',').map(s => s.trim()).filter(Boolean);

            const currentUserInDb = fqems_users.find(u => u.username === user.username);
            if (currentUserInDb) {
                currentUserInDb.floors = floors;
                currentUserInDb.flats = flats;
                saveUsersToLocalStorage();
                // Update session storage as well
                user.floors = floors;
                user.flats = flats;
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                initProfile(); // Re-render profile
                showNotification('Assignments updated', 'success');
            }
        });
    }
}

// Admin-only user management table and actions
function renderUserManagement() {
    const user = getCurrentUser();
    if (!user || user.role !== 'Admin') return;
    const profileControls = document.getElementById('profile-controls');
    const container = document.createElement('div');
    container.className = 'user-management';
    container.innerHTML = `
        <h4>Manage Users</h4>
        <table class="preview-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Floors</th>
                    <th>Flats</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="users-tbody"></tbody>
        </table>
    `;
    profileControls.appendChild(container);
    const tbody = container.querySelector('#users-tbody');
    tbody.innerHTML = '';
    fqems_users.forEach((u, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.name}</td>
            <td>${u.username}</td>
            <td>${u.role}</td>
            <td>${(u.floors || []).join(', ')}</td>
            <td>${(u.flats || []).join(', ')}</td>
            <td>
                <button class="btn btn-outline" data-action="edit" data-idx="${idx}">Edit</button>
                <button class="btn btn-outline" data-action="assign" data-idx="${idx}">Assign</button>
                <button class="btn btn-outline" data-action="toggle" data-idx="${idx}">Promote/Demote</button>
                <button class="btn btn-secondary" data-action="delete" data-idx="${idx}">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const idx = parseInt(btn.dataset.idx, 10);
        const action = btn.dataset.action;
        if (isNaN(idx)) return;
        const target = fqems_users[idx];
        if (!target) return;
        if (action === 'delete') {
            const current = getCurrentUser();
            if (current && current.username === target.username && target.role === 'Admin') {
                showNotification('Cannot delete the current admin', 'error');
                return;
            }
            fqems_users.splice(idx, 1);
            saveUsersToLocalStorage();
            showNotification('User deleted', 'success');
            initProfile();
        } else if (action === 'toggle') {
            target.role = target.role === 'Admin' ? 'Faculty' : 'Admin';
            saveUsersToLocalStorage();
            showNotification('User role updated', 'success');
            initProfile();
        } else if (action === 'assign') {
            const floors = prompt('Enter floors (comma-separated):', (target.floors || []).join(', ')) || '';
            const flats = prompt('Enter flats (comma-separated):', (target.flats || []).join(', ')) || '';
            target.floors = floors.split(',').map(s => s.trim()).filter(Boolean);
            target.flats = flats.split(',').map(s => s.trim()).filter(Boolean);
            saveUsersToLocalStorage();
            showNotification('Assignments updated', 'success');
            initProfile();
        } else if (action === 'edit') {
            const name = prompt('Full Name:', target.name) || target.name;
            const username = prompt('Username:', target.username) || target.username;
            const password = prompt('Password:', target.password) || target.password;
            target.name = name;
            target.username = username;
            target.password = password;
            saveUsersToLocalStorage();
            showNotification('User details updated', 'success');
            initProfile();
        }
    });
}

function initUpload() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const processBtn = document.getElementById('process-btn');
    const validateBtn = document.getElementById('validate-btn');
    const saveBtn = document.getElementById('save-btn');

    if (!dropArea || !fileInput) return;

    fileInput.addEventListener('change', () => handleFileUpload(fileInput.files));

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    dropArea.addEventListener('drop', e => {
        handleFileUpload(e.dataTransfer.files);
    }, false);

    if (processBtn) {
        processBtn.addEventListener('click', processFile);
    }

    if (validateBtn) {
        validateBtn.addEventListener('click', () => {
            const ok = validateDataPreview();
            showNotification(ok ? 'Data validation passed' : 'Data validation found issues', ok ? 'success' : 'error');
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (!fqems_uploaded_data || fqems_uploaded_data.length === 0) {
                showNotification('Nothing to save. Please process a file first.', 'error');
                return;
            }
            saveUploadedDataToLocalStorage();
            showNotification('Data saved to local storage', 'success');
        });
    }
}

// --- Data Processing ---
function handleFileUpload(files) {
    if (files.length === 0) return;
    currentFiles = Array.from(files);

    const fileInfo = document.getElementById('upload-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');

    if (files.length === 1) {
        fileName.textContent = files[0].name;
        fileSize.textContent = `(${formatFileSize(files[0].size)})`;
    } else {
        fileName.textContent = `${files.length} files selected`;
        const totalSize = currentFiles.reduce((acc, file) => acc + file.size, 0);
        fileSize.textContent = `(${formatFileSize(totalSize)})`;
    }
    fileInfo.classList.remove('hidden');
    showNotification(`${files.length} file(s) ready for processing`, 'info');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function processFile() {
    if (currentFiles.length === 0) {
        showNotification('Please upload files first', 'error');
        return;
    }

    let allData = [];
    let processedCount = 0;

    currentFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            if (rows.length > 1) {
                const headers = rows[0].map(h => String(h).trim());
                for (let i = 1; i < rows.length; i++) {
                    if (rows[i].every(val => val === '' || val == null)) continue;
                    const rowObj = {};
                    headers.forEach((h, idx) => {
                        rowObj[h || `Column${idx + 1}`] = rows[i][idx];
                    });
                    allData.push(rowObj);
                }
            }

            processedCount++;
            if (processedCount === currentFiles.length) {
                fqems_uploaded_data = allData;
                saveUploadedDataToLocalStorage();
                processData(allData);
                showNotification(`Processed ${currentFiles.length} file(s) successfully`, 'success');
            }
        };
        reader.onerror = () => {
            showNotification(`Error reading file: ${file.name}`, 'error');
            processedCount++;
        };
        reader.readAsBinaryString(file);
    });
}

function processData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        showNotification('No data found in file', 'error');
        return;
    }
    renderPreviewTable(data);
    updateDashboardWithNewData(data);
    renderAnalytics(); // Re-create charts with new data
    navigateTo('dashboard');
}

function renderPreviewTable(data) {
    const table = document.getElementById('preview-table');
    const head = table.querySelector('thead');
    const body = table.querySelector('tbody');
    head.innerHTML = '';
    body.innerHTML = '';

    const columns = Object.keys(data[0]);
    const headRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headRow.appendChild(th);
    });
    head.appendChild(headRow);

    data.slice(0, 10).forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = columns.map(col => `<td>${row[col] != null ? row[col] : '-'}</td>`).join('');
        body.appendChild(tr);
    });

    document.getElementById('preview-card').classList.remove('hidden');
}

function validateDataPreview() {
    const table = document.getElementById('preview-table');
    const headCells = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const required = ['Date', 'Faculty', 'Consumption (kWh)', 'Cost (₹)'];
    const hasRequired = required.every(r => headCells.map(h => h.toLowerCase()).includes(r.toLowerCase()));
    return hasRequired;
}

function updateDashboardWithNewData(data) {
    let totalConsumption = 0;
    let totalCost = 0;

    data.forEach(row => {
        totalConsumption += toNumber(getField(row, ['Total Units', 'Consumption']));
        totalCost += toNumber(getField(row, ['Total Cost', 'Amount']));
    });

    document.getElementById('current-usage').textContent = `${totalConsumption.toFixed(2)} kWh`;
    document.getElementById('current-bill').textContent = `₹${totalCost.toFixed(2)}`;
    document.getElementById('last-updated').textContent = new Date().toLocaleString();
}

// --- Charting ---
function createDashboardCharts() {
    const data = fqems_uploaded_data;
    if (!data || data.length === 0) return;

    const unitsPerFlat = {};
    const unitsPerFloor = {};
    const monthlyData = {};
    const dailyData = {};

    data.forEach(row => {
        const flat = getField(row, ['Flat Number', 'Flat']);
        const floor = getField(row, ['Floor Number', 'Floor']);
        const units = toNumber(getField(row, ['Total Units', 'Consumption']));
        const month = getField(row, ['Month', 'Period']);
        const date = getField(row, ['Date']);

        if (flat) unitsPerFlat[flat] = (unitsPerFlat[flat] || 0) + units;
        if (floor) unitsPerFloor[floor] = (unitsPerFloor[floor] || 0) + units;
        if (month) monthlyData[month] = (monthlyData[month] || 0) + units;
        if (date) dailyData[date] = (dailyData[date] || 0) + units;
    });

    // Monthly Usage Trend
    const hasMonthly = Object.keys(monthlyData).length > 0;
    createChart('usage-chart', 'line', {
        labels: hasMonthly ? Object.keys(monthlyData) : Object.keys(unitsPerFlat),
        datasets: [{
            label: hasMonthly ? 'Units per Month' : 'Units per Flat',
            data: hasMonthly ? Object.values(monthlyData) : Object.values(unitsPerFlat),
            borderColor: '#4cc9f0',
            backgroundColor: 'rgba(76, 201, 240, 0.2)',
            tension: 0.2
        }]
    }, hasMonthly ? 'Monthly Usage Trend' : 'Units per Flat');

    // Daily Consumption or fallback
    const hasDaily = Object.keys(dailyData).length > 0;
    createChart('daily-chart', 'bar', {
        labels: hasDaily ? Object.keys(dailyData) : Object.keys(unitsPerFloor),
        datasets: [{
            label: hasDaily ? 'Units per Day' : 'Units per Floor',
            data: hasDaily ? Object.values(dailyData) : Object.values(unitsPerFloor),
            backgroundColor: '#4361ee'
        }]
    }, hasDaily ? 'Daily Consumption' : 'Units per Floor');

    // Units per Flat summary
    createChart('flat-summary-chart', 'bar', {
        labels: Object.keys(unitsPerFlat),
        datasets: [{
            label: 'Units per Flat',
            data: Object.values(unitsPerFlat),
            backgroundColor: '#3a0ca3'
        }]
    }, 'Units per Flat');

    // Floor Distribution summary
    createChart('floor-summary-chart', 'pie', {
        labels: Object.keys(unitsPerFloor),
        datasets: [{
            data: Object.values(unitsPerFloor),
            backgroundColor: ['#4361ee', '#3a0ca3', '#4cc9f0', '#7209b7', '#f72585']
        }]
    }, 'Units per Floor');
}

function populateAnalyticsFilters() {
    const monthsSel = document.getElementById('analytics-months');
    const floorsSel = document.getElementById('analytics-floors');
    const flatsSel = document.getElementById('analytics-flats');
    if (!monthsSel || !floorsSel || !flatsSel) return;

    const months = [...new Set(fqems_uploaded_data.map(row => getField(row, ['Month', 'Period'])).filter(Boolean))];
    const floors = [...new Set(fqems_uploaded_data.map(row => getField(row, ['Floor Number', 'Floor'])).filter(Boolean))];
    const flats = [...new Set(fqems_uploaded_data.map(row => getField(row, ['Flat Number', 'Flat'])).filter(Boolean))];

    monthsSel.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');
    floorsSel.innerHTML = floors.map(f => `<option value="${f}">${f}</option>`).join('');
    flatsSel.innerHTML = flats.map(f => `<option value="${f}">${f}</option>`).join('');
}

function renderAnalytics() {
    const chartTypeSel = document.getElementById('analytics-chart-type');
    const periodSel = document.getElementById('analytics-period');
    const metricSel = document.getElementById('analytics-metric');
    const monthsSel = document.getElementById('analytics-months');
    const floorsSel = document.getElementById('analytics-floors');
    const flatsSel = document.getElementById('analytics-flats');

    const chartType = chartTypeSel ? chartTypeSel.value : 'bar';
    const metric = metricSel ? metricSel.value : 'units';
    const selectedMonths = monthsSel ? Array.from(monthsSel.selectedOptions).map(o => o.value) : [];
    const selectedFloors = floorsSel ? Array.from(floorsSel.selectedOptions).map(o => o.value) : [];
    const selectedFlats = flatsSel ? Array.from(flatsSel.selectedOptions).map(o => o.value) : [];

    let rows = fqems_uploaded_data.slice();
    if (selectedMonths.length) rows = rows.filter(r => selectedMonths.includes(getField(r, ['Month', 'Period'])));
    if (selectedFloors.length) rows = rows.filter(r => selectedFloors.includes(String(getField(r, ['Floor', 'Floor Number']))));
    if (selectedFlats.length) rows = rows.filter(r => selectedFlats.includes(String(getField(r, ['Flat', 'Flat Number']))));

    const valueField = metric === 'cost' ? 'Cost (₹)' : 'Consumption (kWh)';

    // Overview: per Flat
    const perFlat = {};
    rows.forEach(r => {
        const flat = getField(r, ['Flat', 'Flat Number']);
        const val = toNumber(r[valueField]);
        if (flat) perFlat[flat] = (perFlat[flat] || 0) + val;
    });
    createChart('overview-chart', chartType, {
        labels: Object.keys(perFlat),
        datasets: [{ label: `${metric === 'cost' ? 'Cost' : 'Units'} per Flat`, data: Object.values(perFlat), backgroundColor: '#4361ee', borderColor: '#4361ee' }]
    }, 'Consumption Overview');

    // Floor-wise
    const perFloor = {};
    rows.forEach(r => {
        const floor = getField(r, ['Floor', 'Floor Number']);
        const val = toNumber(r[valueField]);
        if (floor) perFloor[floor] = (perFloor[floor] || 0) + val;
    });
    createChart('floor-chart', chartType === 'line' ? 'bar' : chartType, {
        labels: Object.keys(perFloor),
        datasets: [{ data: Object.values(perFloor), backgroundColor: ['#4361ee', '#3a0ca3', '#4cc9f0', '#7209b7', '#f72585'] }]
    }, 'Floor-wise Distribution');

    // Time series per month
    const perMonth = {};
    rows.forEach(r => {
        const month = getField(r, ['Month', 'Period']);
        const val = toNumber(r[valueField]);
        if (month) perMonth[month] = (perMonth[month] || 0) + val;
    });
    createChart('flat-chart', chartType === 'pie' || chartType === 'doughnut' ? 'line' : chartType, {
        labels: Object.keys(perMonth),
        datasets: [{ label: `${metric === 'cost' ? 'Cost' : 'Units'} Over Time`, data: Object.values(perMonth), borderColor: '#4cc9f0', backgroundColor: 'rgba(76, 201, 240, 0.2)', tension: 0.1 }]
    }, 'Flat-wise Over Time');
}

// --- Bills: Assign Flat to Faculty ---
function openAssignModal(flat, floor) {
    const modal = document.getElementById('assign-modal');
    const label = document.getElementById('assign-flat-label');
    const select = document.getElementById('assign-faculty-select');
    const saveBtn = document.getElementById('assign-save');
    if (!modal || !label || !select || !saveBtn) return;

    label.textContent = `Flat: ${flat}${floor ? ` (Floor ${floor})` : ''}`;
    const facultyUsers = fqems_users.filter(u => u.role === 'Faculty');
    const currentOwner = facultyUsers.find(u => (u.flats || []).includes(String(flat)));
    select.innerHTML = facultyUsers.map(u => `<option value="${u.username}" ${currentOwner && currentOwner.username === u.username ? 'selected' : ''}>${u.name} (${u.username})</option>`).join('');

    modal.style.display = 'flex';

    const closeEls = modal.querySelectorAll('.close-modal, .close-btn');
    closeEls.forEach(el => {
        el.onclick = () => { modal.style.display = 'none'; };
    });
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    saveBtn.onclick = () => {
        const username = select.value;
        if (!username) { showNotification('Please select a faculty user', 'error'); return; }
        // Remove flat from all faculty users first
        facultyUsers.forEach(u => {
            u.flats = (u.flats || []).filter(f => String(f) !== String(flat));
        });
        // Assign to selected user
        const target = facultyUsers.find(u => u.username === username);
        if (target) {
            target.flats = Array.from(new Set([...(target.flats || []), String(flat)]));
            saveUsersToLocalStorage();
            showNotification(`Assigned flat ${flat} to ${target.name}`, 'success');
            modal.style.display = 'none';
        } else {
            showNotification('Selected user not found', 'error');
        }
    };
}
function createAnalyticsCharts() {
    const data = fqems_uploaded_data;
    if (!data || data.length === 0) return;

    const unitsPerFlat = {};
    const unitsPerFloor = {};

    data.forEach(row => {
        const flat = getField(row, ['Flat Number', 'Flat']);
        const floor = getField(row, ['Floor Number', 'Floor']);
        const units = toNumber(getField(row, ['Total Units', 'Consumption']));

        if (flat) {
            unitsPerFlat[flat] = (unitsPerFlat[flat] || 0) + units;
        }
        if (floor) {
            unitsPerFloor[floor] = (unitsPerFloor[floor] || 0) + units;
        }
    });

    createChart('overview-chart', 'bar', {
        labels: Object.keys(unitsPerFlat),
        datasets: [{
            label: 'Units per Flat',
            data: Object.values(unitsPerFlat),
            backgroundColor: '#4361ee'
        }]
    }, 'Units per Flat');

    createChart('floor-chart', 'pie', {
        labels: Object.keys(unitsPerFloor),
        datasets: [{
            data: Object.values(unitsPerFloor),
            backgroundColor: ['#4361ee', '#3a0ca3', '#4cc9f0', '#7209b7', '#f72585']
        }]
    }, 'Units per Floor');

    // For flat-chart, let's show a line chart of units over time, aggregated by month
    const monthlyData = {};
    data.forEach(row => {
        const month = getField(row, ['Month', 'Period']);
        const units = toNumber(getField(row, ['Total Units', 'Consumption']));
        if (month) {
            monthlyData[month] = (monthlyData[month] || 0) + units;
        }
    });

    createChart('flat-chart', 'line', {
        labels: Object.keys(monthlyData),
        datasets: [{
            label: 'Total Units Over Time',
            data: Object.values(monthlyData),
            borderColor: '#4cc9f0',
            tension: 0.1
        }]
    }, 'Unit Trend');
}

function exportCSV(rows) {
    if (!rows || rows.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    const columns = Object.keys(rows[0]);
    const csv = [columns.join(',')]
        .concat(rows.map(r => columns.map(c => JSON.stringify(r[c] ?? '')).join(',')))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fqems_report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportPDF(rows) {
    if (!rows || rows.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    try {
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF || !window.jspdf) {
            showNotification('jsPDF not available', 'error');
            return;
        }
        const doc = new jsPDF('l', 'pt', 'a4');
        const columns = Object.keys(rows[0]);
        const head = [columns];
        const body = rows.map(r => columns.map(c => r[c] ?? ''));
        doc.text('FqEMS Report', 40, 40);
        if (doc.autoTable) {
            doc.autoTable({ head, body, startY: 60 });
        } else if (window.jspdf && window.jspdf.autotable) {
            doc.autoTable({ head, body, startY: 60 });
        } else {
            showNotification('AutoTable plugin not available', 'error');
        }
        doc.save('fqems_report.pdf');
    } catch (e) {
        console.error(e);
        showNotification('Failed to generate PDF', 'error');
    }
}

function createChart(canvasId, type, data, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const isDarkMode = document.body.classList.contains('dark-theme');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';

    chartInstances[canvasId] = new Chart(canvas, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    color: textColor
                },
                legend: {
                    labels: { color: textColor }
                }
            },
            scales: (type === 'bar' || type === 'line') ? {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                }
            } : {}
        }
    });
}

function updateChartsTheme(isDarkMode) {
    Object.values(chartInstances).forEach(chart => {
        if (chart) {
            const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const textColor = isDarkMode ? '#e0e0e0' : '#333';

            chart.options.plugins.title.color = textColor;
            chart.options.plugins.legend.labels.color = textColor;

            if (chart.options.scales) {
                if (chart.options.scales.y) {
                    chart.options.scales.y.grid.color = gridColor;
                    chart.options.scales.y.ticks.color = textColor;
                }
                if (chart.options.scales.x) {
                    chart.options.scales.x.grid.color = gridColor;
                    chart.options.scales.x.ticks.color = textColor;
                }
            }
            chart.update();
        }
    });
}

// --- Utility Functions ---
function getField(row, candidates) {
    const keys = Object.keys(row);
    const normalized = keys.map(k => ({ key: k, nk: k.toLowerCase().trim() }));
    for (const c of candidates) {
        const target = c.toLowerCase();
        const found = normalized.find(k => k.nk === target);
        if (found) return row[found.key];
    }
    // Fallback for partial match
    for (const c of candidates) {
        const target = c.toLowerCase();
        const found = normalized.find(k => k.nk.includes(target));
        if (found) return row[found.key];
    }
    return undefined;
}

function toNumber(val) {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[₹,]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}