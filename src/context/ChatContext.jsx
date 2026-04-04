import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    // Initialize from LocalStorage or Default
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('chat_history');
        return saved ? JSON.parse(saved) : [
            { role: 'model', text: "Hi! I'm your StudentOS AI. Tell me about your upcoming exams or assignments, and I'll plan your schedule." }
        ];
    });

    // Save to LocalStorage on change
    React.useEffect(() => {
        localStorage.setItem('chat_history', JSON.stringify(messages));
    }, [messages]);

    const clearChat = () => {
        const defaultMsg = [{ role: 'model', text: "Hi! I'm your StudentOS AI. Tell me about your upcoming exams or assignments, and I'll plan your schedule." }];
        setMessages(defaultMsg);
        localStorage.removeItem('chat_history');
    };

    const value = {
        messages,
        setMessages,
        clearChat
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};
