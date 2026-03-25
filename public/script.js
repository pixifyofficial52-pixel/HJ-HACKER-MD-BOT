const API_BASE_URL = window.location.origin;

// Check bot status on load
document.addEventListener('DOMContentLoaded', () => {
    checkBotStatus();
    
    // Enter key press
    document.getElementById('phoneNumber').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            getPairingCode();
        }
    });
});

async function checkBotStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        const statusElement = document.getElementById('botStatus');
        if (data.status === 'ok') {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Online';
            statusElement.className = 'status-value online';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Offline';
            statusElement.className = 'status-value offline';
        }
    } catch (error) {
        document.getElementById('botStatus').innerHTML = '<i class="fas fa-circle"></i> Offline';
        document.getElementById('botStatus').className = 'status-value offline';
    }
}

async function getPairingCode() {
    const phoneInput = document.getElementById('phoneNumber');
    let phoneNumber = phoneInput.value.trim();
    
    // Validate number
    if (!phoneNumber) {
        showError('Please enter your WhatsApp number');
        return;
    }
    
    // Remove any non-digits
    phoneNumber = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (!phoneNumber.startsWith('92')) {
        phoneNumber = '92' + phoneNumber;
    }
    
    if (phoneNumber.length < 10 || phoneNumber.length > 12) {
        showError('Please enter a valid WhatsApp number');
        return;
    }
    
    // Show loading
    document.getElementById('pairBtn').disabled = true;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/pair?number=${phoneNumber}`);
        const data = await response.json();
        
        if (data.code) {
            // Show pairing code
            document.getElementById('pairingCode').textContent = data.code;
            document.getElementById('result').style.display = 'block';
            
            // Auto copy to clipboard
            await copyToClipboard(data.code);
            
            // Hide loading
            document.getElementById('loading').style.display = 'none';
            
            // Clear input
            phoneInput.value = '';
        } else if (data.error) {
            showError(data.error);
        } else {
            showError('Failed to get pairing code. Please try again.');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showError('Network error. Please check if the bot is running.');
    } finally {
        document.getElementById('pairBtn').disabled = false;
        document.getElementById('loading').style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorDiv.style.display = 'flex';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

async function copyCode() {
    const code = document.getElementById('pairingCode').textContent;
    await copyToClipboard(code);
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Show temporary success message
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
        
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Press Ctrl+C to copy: ' + text);
    }
}

// Auto-check bot status every 30 seconds
setInterval(checkBotStatus, 30000);
