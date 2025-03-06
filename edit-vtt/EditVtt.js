import {EditVttCue} from '../edit-vtt-cue/EditVttCue.js'

class EditVTT extends HTMLElement {
    constructor() {
        super();
        console.log(this)
        // Do not use Shadow DOM as requested
        this.innerHTML = `
                <header class="controls">
                    <div>
                        <label for="media-file">Load Media: </label>
                        <input type="file" id="media-file" accept="video/*,audio/*">
                    </div>
                    <div>
                        <label for="vtt-file">Load VTT: </label>
                        <input type="file" id="vtt-file" accept=".vtt">
                    </div>
                    <button id="export-btn">Export VTT</button>
                    <button id="add-cue-btn">Add Cue</button>
                    <button id="clear-storage-btn" class="danger">Clear Storage</button>
                </header>
                
                <section class="media-container">
                    <video controls></video>
                </section>
                
                
                <footer class="storage-info" id="storage-info"></footer>
                
                <main class="cue-list" id="cue-list">
                    <!-- Cues will be inserted here -->
                </main>
        `;
        
        // Initialize properties
        this.cues = [];
        this.currentVttFile = null;
        this.storageKey = 'edit-vtt-data';
        this.db = null;
        
        // Initialize IndexedDB
        this.initDB();
    }
    
    connectedCallback() {
        // Setup element references
        this.videoElement = this.querySelector('video');
        this.mediaInput = this.querySelector('#media-file');
        this.vttInput = this.querySelector('#vtt-file');
        this.exportBtn = this.querySelector('#export-btn');
        this.addCueBtn = this.querySelector('#add-cue-btn');
        this.clearStorageBtn = this.querySelector('#clear-storage-btn');
        this.cueListElement = this.querySelector('#cue-list');
        this.storageInfoElement = this.querySelector('#storage-info');
        
        // Add event listeners
        this.mediaInput.addEventListener('change', this.handleMediaLoad.bind(this));
        this.vttInput.addEventListener('change', this.handleVTTLoad.bind(this));
        this.exportBtn.addEventListener('click', this.exportVTT.bind(this));
        this.addCueBtn.addEventListener('click', this.addNewCue.bind(this));
        this.clearStorageBtn.addEventListener('click', this.clearStorage.bind(this));
        
        // Add video time update listener for showing active cues
        this.videoElement.addEventListener('timeupdate', this.handleTimeUpdate.bind(this));
    }
    
    // Initialize IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('EditVTTDatabase', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('vttFiles')) {
                    db.createObjectStore('vttFiles', { keyPath: 'filename' });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.updateStorageInfo();
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                // Fallback to localStorage if IndexedDB fails
                this.db = null;
                this.updateStorageInfo();
                resolve(null);
            };
        });
    }
    
    // Save the current state to storage
    async saveToStorage() {
        if (!this.currentVttFile) return;
        
        const data = {
            filename: this.currentVttFile,
            cues: this.cues,
            lastModified: new Date().toISOString()
        };
        
        if (this.db) {
            const transaction = this.db.transaction(['vttFiles'], 'readwrite');
            const store = transaction.objectStore('vttFiles');
            try {
                await store.put(data);
                this.updateStorageInfo();
            } catch (error) {
                console.error('Error saving to IndexedDB:', error);
                this.saveToLocalStorage(data);
            }
        } else {
            this.saveToLocalStorage(data);
        }
    }
    
    // Fallback to localStorage
    saveToLocalStorage(data) {
        try {
            const storageData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            storageData[this.currentVttFile] = data;
            localStorage.setItem(this.storageKey, JSON.stringify(storageData));
            this.updateStorageInfo();
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    // Load from storage
    async loadFromStorage(filename) {
        if (this.db) {
            const transaction = this.db.transaction(['vttFiles'], 'readonly');
            const store = transaction.objectStore('vttFiles');
            try {
                const request = store.get(filename);
                return new Promise((resolve, reject) => {
                    request.onsuccess = () => {
                        if (request.result) {
                            resolve(request.result);
                        } else {
                            resolve(this.loadFromLocalStorage(filename));
                        }
                    };
                    request.onerror = (e) => {
                        console.error('Error loading from IndexedDB:', e);
                        resolve(this.loadFromLocalStorage(filename));
                    };
                });
            } catch (error) {
                console.error('Error accessing IndexedDB:', error);
                return this.loadFromLocalStorage(filename);
            }
        } else {
            return this.loadFromLocalStorage(filename);
        }
    }
    
    // Fallback to load from localStorage
    loadFromLocalStorage(filename) {
        try {
            const storageData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            return storageData[filename] || null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }
    
    // Update storage info display
    async updateStorageInfo() {
        if (this.currentVttFile) {
            let lastSaved = 'Never';
            
            if (this.db) {
                const transaction = this.db.transaction(['vttFiles'], 'readonly');
                const store = transaction.objectStore('vttFiles');
                const request = store.get(this.currentVttFile);
                
                await new Promise(resolve => {
                    request.onsuccess = () => {
                        if (request.result && request.result.lastModified) {
                            lastSaved = new Date(request.result.lastModified).toLocaleString();
                        }
                        resolve();
                    };
                    request.onerror = () => resolve();
                });
            } else {
                try {
                    const storageData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
                    if (storageData[this.currentVttFile] && storageData[this.currentVttFile].lastModified) {
                        lastSaved = new Date(storageData[this.currentVttFile].lastModified).toLocaleString();
                    }
                } catch (e) {
                    console.error('Error reading localStorage:', e);
                }
            }
            
            this.storageInfoElement.textContent = `Editing: ${this.currentVttFile} (Last saved: ${lastSaved})`;
        } else {
            this.storageInfoElement.textContent = 'No VTT file loaded';
        }
    }
    
    // Clear storage
    async clearStorage() {
        if (!confirm('Are you sure you want to clear all saved VTT data?')) return;
        
        if (this.db) {
            const transaction = this.db.transaction(['vttFiles'], 'readwrite');
            const store = transaction.objectStore('vttFiles');
            
            if (this.currentVttFile) {
                await store.delete(this.currentVttFile);
            } else {
                await store.clear();
            }
        }
        
        // Also clear localStorage for fallback
        if (this.currentVttFile) {
            try {
                const storageData = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
                delete storageData[this.currentVttFile];
                localStorage.setItem(this.storageKey, JSON.stringify(storageData));
            } catch (e) {
                console.error('Error clearing localStorage:', e);
            }
        } else {
            localStorage.removeItem(this.storageKey);
        }
        
        this.cues = [];
        this.renderCues();
        this.updateStorageInfo();
        alert('Storage cleared');
    }
    
    // Handle media file loading
    handleMediaLoad(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const url = URL.createObjectURL(file);
        this.videoElement.src = url;
    }
    
    // Handle VTT file loading
    async handleVTTLoad(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.currentVttFile = file.name;
        
        // Check if we have this file in storage
        const storedData = await this.loadFromStorage(this.currentVttFile);
        
        if (storedData && storedData.cues) {
            // Load from storage
            this.cues = storedData.cues;
            this.renderCues();
            this.updateStorageInfo();
            
            alert(`Loaded saved version of "${file.name}" from storage`);
        } else {
            // Parse the new file
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                this.parseVTT(content);
                this.saveToStorage();
            };
            reader.readAsText(file);
        }
    }
    
    // Parse VTT content
    parseVTT(content) {
        this.cues = [];
        const lines = content.split(/\r?\n/);
        
        let i = 0;
        
        // Skip WebVTT header
        if (lines[0].includes('WEBVTT')) {
            i = 1;
            
            // Skip any header metadata
            while (i < lines.length && lines[i].trim() !== '') {
                i++;
            }
            
            // Skip the blank line after the header
            i++;
        }
        
        let currentCue = null;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            if (line === '') {
                // Empty line finishes the current cue
                if (currentCue && currentCue.text) {
                    this.cues.push(currentCue);
                    currentCue = null;
                }
            } else if (!currentCue) {
                // Start a new cue
                currentCue = { id: '', startTime: '', endTime: '', text: '' };
                
                // Check if this line is an ID or a timestamp
                if (line.includes('-->')) {
                    // This is a timestamp line
                    const [startTime, endTime] = line.split('-->').map(t => t.trim());
                    currentCue.startTime = startTime;
                    currentCue.endTime = endTime;
                } else {
                    // This is an ID line
                    currentCue.id = line;
                    i++;
                    
                    // The next line should be the timestamp
                    if (i < lines.length && lines[i].includes('-->')) {
                        const [startTime, endTime] = lines[i].split('-->').map(t => t.trim());
                        currentCue.startTime = startTime;
                        currentCue.endTime = endTime;
                    }
                }
            } else {
                // Add text to the current cue
                currentCue.text = currentCue.text ? currentCue.text + '\n' + line : line;
            }
            
            i++;
        }
        
        // Add the last cue if it exists
        if (currentCue && currentCue.text) {
            this.cues.push(currentCue);
        }
        
        this.renderCues();
    }
    
    // Render all cues
    renderCues() {
        this.cueListElement.innerHTML = '';
        
        if (this.cues.length === 0) {
            this.cueListElement.innerHTML = '<p>No cues found. Add a cue or load a VTT file.</p>';
            return;
        }
        
        this.cues.forEach((cue, index) => {
            const cueElement = document.createElement('div');
            cueElement.className = 'cue-item';
            cueElement.dataset.index = index;
            
            const inputId = `cue-id-${index}`;
            const startId = `cue-start-${index}`;
            const endId = `cue-end-${index}`;
            const textId = `cue-text-${index}`;
            
            cueElement.innerHTML = `
                <div>
                    <label for="${inputId}">ID: </label>
                    <input type="text" id="${inputId}" value="${cue.id}" style="width: 50px;">
                </div>
                <div class="cue-time">
                    <div>
                        <label for="${startId}">Start: </label>
                        <input type="text" class="time-input" id="${startId}" value="${cue.startTime}" placeholder="00:00:00.000">
                    </div>
                    <div>
                        <label for="${endId}">End: </label>
                        <input type="text" class="time-input" id="${endId}" value="${cue.endTime}" placeholder="00:00:00.000">
                    </div>
                </div>
                <textarea id="${textId}" class="cue-text">${cue.text}</textarea>
                <div class="cue-actions">
                    <button class="play-cue">Play</button>
                    <button class="set-start">Set Start to Current Time</button>
                    <button class="set-end">Set End to Current Time</button>
                    <button class="delete-cue danger">Delete</button>
                </div>
            `;
            
            // Add event listeners for the cue controls
            cueElement.querySelector(`#${inputId}`).addEventListener('change', (e) => {
                this.cues[index].id = e.target.value;
                this.saveToStorage();
            });
            
            cueElement.querySelector(`#${startId}`).addEventListener('change', (e) => {
                this.cues[index].startTime = e.target.value;
                this.saveToStorage();
            });
            
            cueElement.querySelector(`#${endId}`).addEventListener('change', (e) => {
                this.cues[index].endTime = e.target.value;
                this.saveToStorage();
            });
            
            cueElement.querySelector(`#${textId}`).addEventListener('change', (e) => {
                this.cues[index].text = e.target.value;
                this.saveToStorage();
            });
            
            cueElement.querySelector('.play-cue').addEventListener('click', () => {
                this.playCue(index);
            });
            
            cueElement.querySelector('.set-start').addEventListener('click', () => {
                this.setStartTime(index);
            });
            
            cueElement.querySelector('.set-end').addEventListener('click', () => {
                this.setEndTime(index);
            });
            
            cueElement.querySelector('.delete-cue').addEventListener('click', () => {
                this.deleteCue(index);
            });
            
            this.cueListElement.appendChild(cueElement);
        });
    }
    
    // Play a specific cue
    playCue(index) {
        const cue = this.cues[index];
        if (!cue) return;
        
        // Parse the start time
        const startSeconds = this.timeToSeconds(cue.startTime);
        if (startSeconds === null) return;
        
        this.videoElement.currentTime = startSeconds;
        this.videoElement.play();
    }
    
    // Set the start time of a cue to the current video time
    setStartTime(index) {
        const cue = this.cues[index];
        if (!cue) return;
        
        const currentTime = this.videoElement.currentTime;
        const formattedTime = this.formatTime(currentTime);
        
        cue.startTime = formattedTime;
        
        const startInput = this.querySelector(`#cue-start-${index}`);
        if (startInput) startInput.value = formattedTime;
        
        this.saveToStorage();
    }
    
    // Set the end time of a cue to the current video time
    setEndTime(index) {
        const cue = this.cues[index];
        if (!cue) return;
        
        const currentTime = this.videoElement.currentTime;
        const formattedTime = this.formatTime(currentTime);
        
        cue.endTime = formattedTime;
        
        const endInput = this.querySelector(`#cue-end-${index}`);
        if (endInput) endInput.value = formattedTime;
        
        this.saveToStorage();
    }
    
    // Delete a cue
    deleteCue(index) {
        if (!confirm(`Are you sure you want to delete cue #${index + 1}?`)) return;
        
        this.cues.splice(index, 1);
        this.renderCues();
        this.saveToStorage();
    }
    
    // Add a new cue
    addNewCue() {
        const currentTime = this.videoElement.currentTime;
        const startTime = this.formatTime(currentTime);
        const endTime = this.formatTime(currentTime + 3); // Default 3 seconds duration
        
        this.cues.push({
            id: `${this.cues.length + 1}`,
            startTime,
            endTime,
            text: 'New cue'
        });
        
        this.renderCues();
        this.saveToStorage();
        
        // Scroll to the new cue
        this.cueListElement.lastElementChild.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Handle video time update to highlight active cues
    handleTimeUpdate() {
        const currentTime = this.videoElement.currentTime;
        
        this.cues.forEach((cue, index) => {
            const cueElement = this.querySelector(`.cue-item[data-index="${index}"]`);
            if (!cueElement) return;
            
            const startTime = this.timeToSeconds(cue.startTime);
            const endTime = this.timeToSeconds(cue.endTime);
            
            if (startTime !== null && endTime !== null && currentTime >= startTime && currentTime <= endTime) {
                cueElement.style.border = '2px solid #0078d7';
            } else {
                cueElement.style.border = '1px solid #ddd';
            }
        });
    }
    
    // Export the VTT file
    exportVTT() {
        if (this.cues.length === 0) {
            alert('No cues to export');
            return;
        }
        
        let vttContent = 'WEBVTT\n\n';
        
        this.cues.forEach(cue => {
            if (cue.id) {
                vttContent += cue.id + '\n';
            }
            vttContent += cue.startTime + ' --> ' + cue.endTime + '\n';
            vttContent += cue.text + '\n\n';
        });
        
        const blob = new Blob([vttContent], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = this.currentVttFile || 'subtitles.vtt';
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    // Helper: Convert timestamp to seconds
    timeToSeconds(timeStr) {
        if (!timeStr) return null;
        
        const pattern = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;
        const match = timeStr.match(pattern);
        
        if (!match) return null;
        
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        const milliseconds = parseInt(match[4]);
        
        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
    
    // Helper: Format seconds to timestamp
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds %= 60;
        
        const wholeSecs = Math.floor(seconds);
        const ms = Math.floor((seconds - wholeSecs) * 1000);
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSecs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }
}

// Register the custom element
customElements.define('edit-vtt', EditVTT);
export {
    EditVTT
}