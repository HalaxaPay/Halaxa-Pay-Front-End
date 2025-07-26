// ==================== HP SUPPORT BOT - FRONTEND CLIENT ==================== //

// Backend API URL
const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'https://halaxa-backend.onrender.com';

// Chat state management
let chatHistory = [];
let isTyping = false;
let currentSessionId = 'default';

/**
 * Initialize the Support Bot functionality
 */
export function initializeSupportBot() {
    console.log('🤖 Initializing HP Support Bot...');
    
    // Initialize chat elements
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message-btn');
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const exportChatBtn = document.getElementById('export-chat-btn');
    
    if (!chatInput || !sendButton || !chatMessages) {
        console.error('❌ Required chat elements not found');
        return;
    }
    
    // Set up event listeners
    setupChatEventListeners(chatInput, sendButton, chatMessages, typingIndicator);
    setupQuickActionButtons(chatMessages);
    setupFooterButtons(clearChatBtn, exportChatBtn, chatMessages);
    setupAutoResizeTextarea(chatInput);
    
    console.log('✅ HP Support Bot initialized successfully');
}

/**
 * Set up chat event listeners
 */
function setupChatEventListeners(chatInput, sendButton, chatMessages, typingIndicator) {
    // Send message on button click
    sendButton.addEventListener('click', () => {
        sendMessage(chatInput, chatMessages, typingIndicator);
    });
    
    // Send message on Enter key (Shift+Enter for new line)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(chatInput, chatMessages, typingIndicator);
        }
    });
    
    // Auto-focus input when chat is clicked
    chatMessages.addEventListener('click', () => {
        chatInput.focus();
    });
}

/**
 * Set up quick action buttons
 */
function setupQuickActionButtons(chatMessages) {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.quick-action-btn')) {
            const button = e.target.closest('.quick-action-btn');
            const action = button.dataset.action;
            
            // Add user message for the quick action
            addUserMessage(chatMessages, getQuickActionMessage(action));
            
            // Send the quick action message
            setTimeout(() => {
                sendQuickAction(action, chatMessages);
            }, 500);
        }
    });
}

/**
 * Set up footer buttons
 */
function setupFooterButtons(clearChatBtn, exportChatBtn, chatMessages) {
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            clearChat(chatMessages);
        });
    }
    
    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', () => {
            exportChat();
        });
    }
}

/**
 * Set up auto-resize textarea
 */
function setupAutoResizeTextarea(chatInput) {
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
}

/**
 * Send message function
 */
async function sendMessage(chatInput, chatMessages, typingIndicator) {
    const message = chatInput.value.trim();
    
    if (!message || isTyping) return;
    
    // Add user message to chat
    addUserMessage(chatMessages, message);
    
    // Clear input and reset height
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Send to backend API
    await sendMessageToBackend(message, chatMessages, typingIndicator);
}

/**
 * Send message to backend API
 */
async function sendMessageToBackend(message, chatMessages, typingIndicator) {
    if (isTyping) return;
    
    isTyping = true;
    showTypingIndicator(typingIndicator);
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/support/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                sessionId: currentSessionId
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            addBotMessage(chatMessages, data.message);
            currentSessionId = data.sessionId;
        } else {
            throw new Error(data.error || 'Unknown error');
        }
        
    } catch (error) {
        console.error('❌ Error sending message to backend:', error);
        addBotMessage(chatMessages, 'Sorry, I\'m having trouble connecting right now. Please try again in a moment or contact our human support team.');
    } finally {
        isTyping = false;
        hideTypingIndicator(typingIndicator);
    }
}

/**
 * Send quick action to backend API
 */
async function sendQuickAction(action, chatMessages) {
    if (isTyping) return;
    
    isTyping = true;
    showTypingIndicator(document.getElementById('typing-indicator'));
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/support/quick-action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                sessionId: currentSessionId
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            addBotMessage(chatMessages, data.message);
            currentSessionId = data.sessionId;
        } else {
            throw new Error(data.error || 'Unknown error');
        }
        
    } catch (error) {
        console.error('❌ Error sending quick action to backend:', error);
        addBotMessage(chatMessages, 'Sorry, I\'m having trouble connecting right now. Please try again in a moment or contact our human support team.');
    } finally {
        isTyping = false;
        hideTypingIndicator(document.getElementById('typing-indicator'));
    }
}

/**
 * Add user message to chat
 */
function addUserMessage(chatMessages, message) {
    const messageElement = createMessageElement('user', message);
    chatMessages.appendChild(messageElement);
    scrollToBottom(chatMessages);
    
    // Add to chat history
    chatHistory.push({ role: 'user', content: message });
}

/**
 * Add bot message to chat
 */
function addBotMessage(chatMessages, message) {
    const messageElement = createMessageElement('bot', message);
    chatMessages.appendChild(messageElement);
    scrollToBottom(chatMessages);
    
    // Add to chat history
    chatHistory.push({ role: 'assistant', content: message });
}

/**
 * Create message element
 */
function createMessageElement(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (sender === 'user') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">You</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-text">
                    <p>${escapeHtml(content)}</p>
                </div>
            </div>
            <div class="message-avatar">
                <div class="user-avatar-small">
                    <i class="fas fa-user"></i>
                </div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <div class="bot-avatar-small">
                    <i class="fas fa-robot"></i>
                </div>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">HP Support</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-text">
                    <p>${formatBotResponse(content)}</p>
                </div>
            </div>
        `;
    }
    
    return messageDiv;
}

/**
 * Show typing indicator
 */
function showTypingIndicator(typingIndicator) {
    if (typingIndicator) {
        typingIndicator.style.display = 'block';
        scrollToBottom(document.getElementById('chat-messages'));
    }
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator(typingIndicator) {
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
    }
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom(chatMessages) {
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

/**
 * Clear chat
 */
async function clearChat(chatMessages) {
    if (confirm('Are you sure you want to clear the chat history?')) {
        try {
            // Clear on backend
            const response = await fetch(`${BACKEND_URL}/api/support/chat/${currentSessionId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Keep only the welcome message
                const welcomeMessage = chatMessages.querySelector('.bot-message');
                chatMessages.innerHTML = '';
                if (welcomeMessage) {
                    chatMessages.appendChild(welcomeMessage);
                }
                
                // Clear chat history
                chatHistory = [];
                
                console.log('🗑️ Chat cleared');
            }
        } catch (error) {
            console.error('❌ Error clearing chat:', error);
            // Still clear locally even if backend fails
            const welcomeMessage = chatMessages.querySelector('.bot-message');
            chatMessages.innerHTML = '';
            if (welcomeMessage) {
                chatMessages.appendChild(welcomeMessage);
            }
            chatHistory = [];
        }
    }
}

/**
 * Export chat
 */
function exportChat() {
    const chatData = {
        timestamp: new Date().toISOString(),
        messages: chatHistory,
        platform: 'Halaxa Pay Support Chat',
        sessionId: currentSessionId
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `halaxa-support-chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📥 Chat exported');
}

/**
 * Get quick action message
 */
function getQuickActionMessage(action) {
    const actionMessages = {
        'payment-links': 'How do I create and manage payment links?',
        'analytics': 'Can you help me understand my analytics dashboard?',
        'security': 'What security features should I set up?',
        'billing': 'I have questions about my billing and subscription.'
    };
    
    return actionMessages[action] || 'I need help with something else.';
}

/**
 * Format bot response (convert markdown-like formatting)
 */
function formatBotResponse(content) {
    // Convert **bold** to <strong>
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert line breaks to <br>
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== INITIALIZATION ==================== //

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // The initialization will be called from SPA.js
        console.log('📋 HelpF.js loaded and ready for initialization');
    });
} else {
    console.log('📋 HelpF.js loaded and ready for initialization');
} 