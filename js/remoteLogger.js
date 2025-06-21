// Remote Logger for Mobile Debugging
export class RemoteLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 200;
        this.serverUrl = null; // Set this to your logging server URL if you have one
        
        // Create a simple in-memory log storage that persists across page reloads
        this.storageKey = 'poesArkanoid_debug_logs';
        this.loadLogs();
        
        // Store original console methods
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        
        // Override console methods to capture logs
        this.overrideConsole();
        
        // Auto-save logs every 10 seconds
        setInterval(() => {
            this.saveLogs();
        }, 10000);
    }
    
    overrideConsole() {
        const self = this;
        
        console.log = function(...args) {
            self.originalConsole.log.apply(console, args);
            self.log(args.join(' '), 'log');
        };
        
        console.error = function(...args) {
            self.originalConsole.error.apply(console, args);
            self.log(args.join(' '), 'error');
        };
        
        console.warn = function(...args) {
            self.originalConsole.warn.apply(console, args);
            self.log(args.join(' '), 'warn');
        };
        
        console.info = function(...args) {
            self.originalConsole.info.apply(console, args);
            self.log(args.join(' '), 'info');
        };
    }
    
    log(message, type = 'log') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            message: String(message),
            type,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.logs.push(logEntry);
        
        // Keep only the last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        // Send to server if configured
        if (this.serverUrl) {
            this.sendToServer(logEntry);
        }
        
        // Update debug display if visible
        this.updateLogDisplay();
        
        // Also update the HTML debug console
        this.updateHtmlDebugConsole(message, type);
    }
    
    updateHtmlDebugConsole(message, type) {
        // Update the HTML debug console if it exists
        const debugDiv = document.getElementById('mobileDebug');
        if (debugDiv && debugDiv.style.display !== 'none') {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[${timestamp}] ${message}`;
            
            const logElement = document.createElement('div');
            logElement.className = `debug-${type}`;
            logElement.textContent = logEntry;
            debugDiv.appendChild(logElement);
            debugDiv.scrollTop = debugDiv.scrollHeight;
            
            // Keep only last 50 entries in HTML console
            while (debugDiv.children.length > 50) {
                debugDiv.removeChild(debugDiv.firstChild);
            }
        }
    }
    
    saveLogs() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
        } catch (error) {
            console.error('Failed to save logs to localStorage:', error);
        }
    }
    
    loadLogs() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.logs = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load logs from localStorage:', error);
        }
    }
    
    clearLogs() {
        this.logs = [];
        localStorage.removeItem(this.storageKey);
        
        // Also clear HTML debug console
        const debugDiv = document.getElementById('mobileDebug');
        if (debugDiv) {
            debugDiv.innerHTML = '';
        }
        
        // Update debug panel if visible
        this.updateLogDisplay();
    }
    
    getLogs() {
        return [...this.logs];
    }
    
    exportLogs() {
        const dataStr = JSON.stringify(this.logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `poesArkanoid_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();
    }
    
    async sendToServer(logEntry) {
        if (!this.serverUrl) return;
        
        try {
            await fetch(this.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(logEntry)
            });
        } catch (error) {
            console.error('Failed to send log to server:', error);
        }
    }
    
    // Create a debug panel that can be accessed on mobile
    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'remoteDebugPanel';
        panel.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            padding: 20px;
            overflow-y: auto;
            z-index: 10002;
            display: none;
        `;
        
        const header = document.createElement('div');
        header.innerHTML = `
            <h3>Debug Logs</h3>
            <button onclick="window.remoteLogger.clearLogs()">Clear Logs</button>
            <button onclick="window.remoteLogger.exportLogs()">Export Logs</button>
            <button onclick="document.getElementById('remoteDebugPanel').style.display='none'">Close</button>
        `;
        header.style.marginBottom = '20px';
        
        const logContainer = document.createElement('div');
        logContainer.id = 'remoteLogContainer';
        
        panel.appendChild(header);
        panel.appendChild(logContainer);
        document.body.appendChild(panel);
        
        // Update logs display
        this.updateLogDisplay();
        
        return panel;
    }
    
    updateLogDisplay() {
        const container = document.getElementById('remoteLogContainer');
        if (!container) return;
        
        container.innerHTML = this.logs.map(log => `
            <div style="margin-bottom: 5px; border-bottom: 1px solid #333;">
                <span style="color: #888;">${log.timestamp}</span>
                <span style="color: ${this.getTypeColor(log.type)};">[${log.type.toUpperCase()}]</span>
                <span>${log.message}</span>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    }
    
    getTypeColor(type) {
        switch (type) {
            case 'error': return '#ff0000';
            case 'warn': return '#ffff00';
            case 'info': return '#00ffff';
            default: return '#00ff00';
        }
    }
    
    showDebugPanel() {
        const panel = document.getElementById('remoteDebugPanel') || this.createDebugPanel();
        panel.style.display = 'block';
        this.updateLogDisplay();
    }
    
    showHtmlDebugConsole() {
        const debugDiv = document.getElementById('mobileDebug');
        if (debugDiv) {
            debugDiv.style.display = 'block';
            const toggleBtn = document.getElementById('debugToggle');
            if (toggleBtn) {
                toggleBtn.textContent = 'Hide Debug';
            }
        }
    }
    
    hideHtmlDebugConsole() {
        const debugDiv = document.getElementById('mobileDebug');
        if (debugDiv) {
            debugDiv.style.display = 'none';
            const toggleBtn = document.getElementById('debugToggle');
            if (toggleBtn) {
                toggleBtn.textContent = 'Debug';
            }
        }
    }
}

// Create global instance
window.remoteLogger = new RemoteLogger();

// Add keyboard shortcut to show debug panel (Ctrl+Shift+D)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        window.remoteLogger.showDebugPanel();
    }
});

// Auto-show debug panel on mobile after 5 seconds
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    setTimeout(() => {
        window.remoteLogger.showDebugPanel();
    }, 5000);
    
    // Add tap gesture to show debug panel (tap top-right corner 3 times quickly)
    let tapCount = 0;
    let lastTapTime = 0;
    
    document.addEventListener('click', (e) => {
        const now = Date.now();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Check if tap is in top-right corner (last 100px of width, first 100px of height)
        if (e.clientX > screenWidth - 100 && e.clientY < 100) {
            if (now - lastTapTime < 1000) { // Within 1 second
                tapCount++;
                if (tapCount >= 3) {
                    window.remoteLogger.showDebugPanel();
                    tapCount = 0;
                }
            } else {
                tapCount = 1;
            }
            lastTapTime = now;
        } else {
            tapCount = 0;
        }
    });
} 