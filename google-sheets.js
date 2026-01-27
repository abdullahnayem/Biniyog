// Google Sheets Integration Class
class GoogleSheetsManager {
    constructor() {
        this.sheetUrl = localStorage.getItem('googleSheetUrl') || 'https://docs.google.com/spreadsheets/d/1zsprpdRGY2eMW5ZQEw5y7B1qoYx3tv5cFFIrwAJAP5w/edit?gid=0#gid=0';
        this.sheetId = this.extractSheetId(this.sheetUrl);
        this.initialize();
    }

    initialize() {
        if (this.sheetUrl) {
            // Auto-save the URL without showing modal
            localStorage.setItem('googleSheetUrl', this.sheetUrl);
            // Load data from Google Sheets on startup
            this.loadFromGoogleSheets();
        }
        this.checkGoogleSheetsSetup();
    }

    checkGoogleSheetsSetup() {
        // Don't show modal - use the pre-configured URL automatically
        if (!this.sheetId) {
            this.showError('গুগল শীট সেট করা নেই - ডেটা লোড হবে না');
            return;
        }
    }

    extractSheetId(url) {
        if (!url) return null;
        
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    }

    // Removed UI related methods: saveSheetUrl, testConnection, syncAllData, etc.

    async syncContribution(contribution) {
        if (!this.sheetId) {
            this.showError('গুগল শীট সেট করা নেই - ডেটা সেভ হবে না');
            return;
        }

        const scriptUrl = localStorage.getItem('googleScriptUrl') || 'https://script.google.com/macros/s/AKfycbw03cqvyyuKAH_2NyfUiaqHQV_aoN2-H4qIuyJ8_5o9YAB8IgiE5w6ib70k22fuLN3MPg/exec';
        if (!scriptUrl) {
            this.showError('Apps Script URL সেট করা নেই - ডেটা শীটে সেভ হবে না');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(contribution));
            
            const response = await fetch(scriptUrl, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.result === 'success') {
                this.showSuccess('গুগল শীটে ডেটা সেভ হয়েছে!');
            }
        } catch (error) {
            this.showError('সেভ ব্যর্থ: ' + error.message);
        }
    }



    async loadFromGoogleSheets() {
        try {
            if (!this.sheetId) {
                return;
            }

            // Load data from Google Sheets
            // IMPORTANT: For local file usage (file://), the sheet MUST be "Published to the web" as CSV
            // File > Share > Publish to web > Select "Comma-separated values (.csv)" > Publish
            
            // Try the published URL format first (most reliable for CORS)
            // Replace this ID part with the one from your published link if it's different
            const publishedUrl = `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv`;
            
            console.log('Fetching data from:', publishedUrl);
            
            let response;
            try {
                response = await fetch(publishedUrl);
            } catch (error) {
                console.warn('Direct fetch failed. Please ensure the sheet is "Published to web" as CSV.', error);
                
                // Fallback: Try gviz with no-cors mode (limited, might not get data body but avoids error)
                // Note: Fetching cross-origin data from file:// is strictly blocked by modern browsers.
                // The only true fix for file:// is using a browser extension like "Allow CORS" or running a local server.
                this.showError('ডেটা লোড ব্যর্থ: অনুগ্রহ করে "Live Server" ব্যবহার করুন অথবা শীটটি "Publish to web" করুন।');
                return;
            }

            if (!response.ok) {
                console.error('Failed to fetch from Google Sheets:', response.status, response.statusText);
                return;
            }

            const csvData = await response.text();
            
            // Check if response is HTML (login page) instead of CSV
            if (csvData.trim().startsWith('<!DOCTYPE html>') || csvData.includes('google-site-verification')) {
                console.error('Error: Received HTML instead of CSV. Please make sure the sheet is visible to "Anyone with the link".');
                this.showError('ডেটা লোড ব্যর্থ: গুগল শীটের পারমিশন "Anyone with the link" - "Viewer" সেট করুন।');
                return;
            }
            
            // Check if sheet only contains headers or is empty
            if (csvData.trim().split('\n').length <= 1) {
                console.log('Sheet is empty or has only headers');
                return;
            }

            const contributions = this.parseCSVToContributions(csvData);
            
            if (contributions.length > 0) {
                // Update app data directly
                if (window.app && typeof window.app.setContributions === 'function') {
                    window.app.setContributions(contributions);
                    console.log(`Loaded ${contributions.length} contributions from Google Sheets`);
                    this.showSuccess('গুগল শীট থেকে ডেটা লোড হয়েছে');
                }
            }
            
        } catch (error) {
            console.error('Error loading from Google Sheets:', error);
            this.showError('ডেটা লোড করতে সমস্যা হয়েছে। কনসোল চেক করুন।');
        }
    }

    parseCSVToContributions(csvData) {
        const contributions = [];
        const lines = csvData.split('\n').filter(line => line.trim());
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            // Robust CSV parsing: handles commas inside quotes
            // Regex matches: comma not inside quotes
            const columns = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            
            // Cleanup quotes from matched columns if using match, 
            // BUT simpler approach for CSV lines:
            // Let's use a dedicated splitter function or better regex split
            
            // Alternative: split by comma but respect quotes
            const rowData = [];
            let current = '';
            let inQuotes = false;
            
            for (let char of lines[i]) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    rowData.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            rowData.push(current); // push last column
            
            // Clean up quotes
            const cleanColumns = rowData.map(col => col.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

            if (cleanColumns.length >= 6) {
                contributions.push({
                    member: cleanColumns[0],
                    amount: parseInt(cleanColumns[1]) || 0,
                    date: cleanColumns[2],
                    notes: cleanColumns[3],
                    receiptId: cleanColumns[4],
                    timestamp: cleanColumns[5]
                });
            }
        }
        
        return contributions;
    }

    showSuccess(message) {
        this.showMessage(message, 'status-success');
    }

    showError(message) {
        this.showMessage(message, 'status-error');
    }

    showMessage(message, type, duration = 3000) {
        const alert = document.createElement('div');
        alert.className = `status-message ${type}`;
        alert.innerHTML = message;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, duration);
    }
}

// Initialize Google Sheets integration
document.addEventListener('DOMContentLoaded', () => {
    window.googleSheets = new GoogleSheetsManager();
});

