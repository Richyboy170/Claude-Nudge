// ===== Claude Nudge Scheduler App =====

class NudgeScheduler {
    constructor() {
        // DOM Elements
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.hoursDisplay = document.getElementById('hours');
        this.minutesDisplay = document.getElementById('minutes');
        this.secondsDisplay = document.getElementById('seconds');
        this.progressRing = document.getElementById('progress-ring');
        this.progressPercentage = document.getElementById('progress-percentage');
        this.nextNudgeTime = document.getElementById('next-nudge-time');
        this.intervalHours = document.getElementById('interval-hours');
        this.intervalMinutes = document.getElementById('interval-minutes');
        this.nudgeMessage = document.getElementById('nudge-message');
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.notificationsToggle = document.getElementById('notifications-toggle');
        this.soundToggle = document.getElementById('sound-toggle');
        this.testNotificationBtn = document.getElementById('test-notification');
        this.clearHistoryBtn = document.getElementById('clear-history');
        this.historyList = document.getElementById('history-list');
        this.presetButtons = document.querySelectorAll('.preset-btn');
        this.notificationSound = document.getElementById('notification-sound');
        this.timerCard = document.querySelector('.timer-card');
        
        // State
        this.isRunning = false;
        this.countdown = null;
        this.targetTime = null;
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.history = [];
        
        // Progress ring circumference
        this.circumference = 2 * Math.PI * 90;
        this.progressRing.style.strokeDasharray = this.circumference;
        this.progressRing.style.strokeDashoffset = this.circumference;
        
        // Initialize
        this.loadFromStorage();
        this.bindEvents();
        this.updateUI();
        this.requestNotificationPermission();
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.testNotificationBtn.addEventListener('click', () => this.testNotification());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        
        // Preset buttons
        this.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const hours = parseInt(btn.dataset.hours);
                const minutes = parseInt(btn.dataset.minutes);
                this.intervalHours.value = hours;
                this.intervalMinutes.value = minutes;
                this.updatePresetButtonStates(btn);
            });
        });
        
        // Input changes
        this.intervalHours.addEventListener('change', () => this.updatePresetButtonStates());
        this.intervalMinutes.addEventListener('change', () => this.updatePresetButtonStates());
        
        // Save settings on change
        this.nudgeMessage.addEventListener('change', () => this.saveToStorage());
        this.notificationsToggle.addEventListener('change', () => this.saveToStorage());
        this.soundToggle.addEventListener('change', () => this.saveToStorage());
        
        // Visibility change - continue countdown when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isRunning) {
                this.syncWithTargetTime();
            }
        });
    }
    
    updatePresetButtonStates(activeBtn = null) {
        const hours = parseInt(this.intervalHours.value) || 0;
        const minutes = parseInt(this.intervalMinutes.value) || 0;
        
        this.presetButtons.forEach(btn => {
            const btnHours = parseInt(btn.dataset.hours);
            const btnMinutes = parseInt(btn.dataset.minutes);
            
            if (activeBtn === btn || (btnHours === hours && btnMinutes === minutes)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        this.saveToStorage();
    }
    
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    start() {
        const hours = parseInt(this.intervalHours.value) || 0;
        const minutes = parseInt(this.intervalMinutes.value) || 0;
        
        if (hours === 0 && minutes === 0) {
            alert('Please set an interval of at least 1 minute.');
            return;
        }
        
        this.totalSeconds = (hours * 3600) + (minutes * 60);
        this.remainingSeconds = this.totalSeconds;
        this.targetTime = Date.now() + (this.totalSeconds * 1000);
        this.isRunning = true;
        
        this.updateUI();
        this.saveToStorage();
        this.startCountdown();
    }
    
    stop() {
        this.isRunning = false;
        if (this.countdown) {
            clearInterval(this.countdown);
            this.countdown = null;
        }
        
        this.remainingSeconds = 0;
        this.targetTime = null;
        this.timerCard.classList.remove('nudge-active');
        
        this.updateUI();
        this.saveToStorage();
    }
    
    startCountdown() {
        if (this.countdown) {
            clearInterval(this.countdown);
        }
        
        this.countdown = setInterval(() => {
            this.syncWithTargetTime();
            
            if (this.remainingSeconds <= 0) {
                this.triggerNudge();
            }
        }, 1000);
        
        // Initial sync
        this.syncWithTargetTime();
    }
    
    syncWithTargetTime() {
        if (!this.targetTime) return;
        
        const now = Date.now();
        this.remainingSeconds = Math.max(0, Math.ceil((this.targetTime - now) / 1000));
        this.updateCountdownDisplay();
    }
    
    updateCountdownDisplay() {
        const hours = Math.floor(this.remainingSeconds / 3600);
        const minutes = Math.floor((this.remainingSeconds % 3600) / 60);
        const seconds = this.remainingSeconds % 60;
        
        this.hoursDisplay.textContent = hours.toString().padStart(2, '0');
        this.minutesDisplay.textContent = minutes.toString().padStart(2, '0');
        this.secondsDisplay.textContent = seconds.toString().padStart(2, '0');
        
        // Update progress ring
        const progress = this.totalSeconds > 0 
            ? (this.totalSeconds - this.remainingSeconds) / this.totalSeconds 
            : 0;
        const offset = this.circumference - (progress * this.circumference);
        this.progressRing.style.strokeDashoffset = offset;
        this.progressPercentage.textContent = Math.round(progress * 100) + '%';
        
        // Update next nudge time
        if (this.targetTime) {
            const date = new Date(this.targetTime);
            this.nextNudgeTime.textContent = date.toLocaleTimeString();
        }
        
        // Add glow effect when close to nudge time
        if (this.remainingSeconds <= 60 && this.remainingSeconds > 0) {
            this.timerCard.classList.add('nudge-active');
        } else {
            this.timerCard.classList.remove('nudge-active');
        }
    }
    
    triggerNudge() {
        // Copy message to clipboard
        const message = this.nudgeMessage.value || 'hi';
        navigator.clipboard.writeText(message).then(() => {
            console.log('Message copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy message:', err);
        });
        
        // Show notification
        if (this.notificationsToggle.checked) {
            this.showNotification();
        }
        
        // Play sound
        if (this.soundToggle.checked) {
            this.playSound();
        }
        
        // Add to history
        this.addToHistory();
        
        // Reset for next cycle
        this.targetTime = Date.now() + (this.totalSeconds * 1000);
        this.remainingSeconds = this.totalSeconds;
        this.saveToStorage();
    }
    
    showNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Claude Nudge Time! ⏰', {
                body: 'Your nudge message has been copied. Switch to Claude Code and paste!',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23d97706"/><text x="50" y="65" font-size="40" text-anchor="middle" fill="white">⏰</text></svg>',
                requireInteraction: true
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }
    
    playSound() {
        // Create a simple beep sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            
            // Play a second beep
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                
                osc2.frequency.value = 1000;
                osc2.type = 'sine';
                
                gain2.gain.setValueAtTime(0.5, audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                osc2.start(audioContext.currentTime);
                osc2.stop(audioContext.currentTime + 0.5);
            }, 200);
        } catch (e) {
            console.log('Audio not supported:', e);
        }
    }
    
    testNotification() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('Test Notification ✅', {
                    body: 'Notifications are working! You will be alerted when it\'s nudge time.',
                });
                
                if (this.soundToggle.checked) {
                    this.playSound();
                }
            } else if (Notification.permission === 'denied') {
                alert('Notifications are blocked. Please enable them in your browser settings.');
            } else {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.testNotification();
                    }
                });
            }
        } else {
            alert('Your browser does not support notifications.');
        }
    }
    
    addToHistory() {
        const now = new Date();
        const entry = {
            time: now.toLocaleTimeString(),
            date: now.toLocaleDateString(),
            message: this.nudgeMessage.value || 'hi'
        };
        
        this.history.unshift(entry);
        
        // Keep only last 50 entries
        if (this.history.length > 50) {
            this.history.pop();
        }
        
        this.renderHistory();
        this.saveToStorage();
    }
    
    renderHistory() {
        if (this.history.length === 0) {
            this.historyList.innerHTML = `
                <div class="empty-history">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>No nudges yet. Start the scheduler to begin!</p>
                </div>
            `;
            return;
        }
        
        this.historyList.innerHTML = this.history.map(entry => `
            <div class="history-item">
                <div class="icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22,4 12,14.01 9,11.01"/>
                    </svg>
                </div>
                <div class="details">
                    <div class="time">${entry.time} - ${entry.date}</div>
                    <div class="message">Sent: "${entry.message}"</div>
                </div>
            </div>
        `).join('');
    }
    
    clearHistory() {
        this.history = [];
        this.renderHistory();
        this.saveToStorage();
    }
    
    updateUI() {
        // Update status
        if (this.isRunning) {
            this.statusIndicator.classList.add('active');
            this.statusText.textContent = 'Running';
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.intervalHours.disabled = true;
            this.intervalMinutes.disabled = true;
        } else {
            this.statusIndicator.classList.remove('active');
            this.statusText.textContent = 'Inactive';
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.intervalHours.disabled = false;
            this.intervalMinutes.disabled = false;
            
            // Reset displays
            this.hoursDisplay.textContent = '00';
            this.minutesDisplay.textContent = '00';
            this.secondsDisplay.textContent = '00';
            this.progressRing.style.strokeDashoffset = this.circumference;
            this.progressPercentage.textContent = '0%';
            this.nextNudgeTime.textContent = '--:--:--';
        }
    }
    
    saveToStorage() {
        const data = {
            isRunning: this.isRunning,
            targetTime: this.targetTime,
            totalSeconds: this.totalSeconds,
            intervalHours: this.intervalHours.value,
            intervalMinutes: this.intervalMinutes.value,
            nudgeMessage: this.nudgeMessage.value,
            notificationsEnabled: this.notificationsToggle.checked,
            soundEnabled: this.soundToggle.checked,
            history: this.history
        };
        
        localStorage.setItem('claudeNudgeScheduler', JSON.stringify(data));
    }
    
    loadFromStorage() {
        const data = localStorage.getItem('claudeNudgeScheduler');
        
        if (data) {
            try {
                const parsed = JSON.parse(data);
                
                this.intervalHours.value = parsed.intervalHours || 5;
                this.intervalMinutes.value = parsed.intervalMinutes || 0;
                this.nudgeMessage.value = parsed.nudgeMessage || 'hi';
                this.notificationsToggle.checked = parsed.notificationsEnabled !== false;
                this.soundToggle.checked = parsed.soundEnabled !== false;
                this.history = parsed.history || [];
                
                // Restore running state if applicable
                if (parsed.isRunning && parsed.targetTime) {
                    const now = Date.now();
                    if (parsed.targetTime > now) {
                        this.totalSeconds = parsed.totalSeconds;
                        this.targetTime = parsed.targetTime;
                        this.remainingSeconds = Math.ceil((parsed.targetTime - now) / 1000);
                        this.isRunning = true;
                        this.startCountdown();
                    }
                }
                
                this.renderHistory();
                this.updatePresetButtonStates();
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.nudgeScheduler = new NudgeScheduler();
});

// Service Worker registration for better background support
if ('serviceWorker' in navigator) {
    // Future enhancement: register service worker for background notifications
}
