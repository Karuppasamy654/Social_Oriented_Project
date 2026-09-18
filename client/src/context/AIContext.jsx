import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AIContext = createContext();

export const AIProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'CodeBuddy AI 🤖',
      isAI: true,
      text: 'Hi there! I am your CodeBuddy AI mentor. Ask me anything about your current problem, code complexity, or study roadmap!'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const toggleAIModal = () => setIsOpen(!isOpen);

  const sendMessageToAI = async (prompt, pageContext = 'general', currentProblemTitle = '', userCode = '') => {
    const userMsg = { sender: 'You', isAI: false, text: prompt };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post('/ai/ask', {
        prompt,
        pageContext,
        currentProblemTitle,
        userCode
      });

      const aiMsg = { sender: 'CodeBuddy AI 🤖', isAI: true, text: res.data.response };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const fallbackMsg = { sender: 'CodeBuddy AI 🤖', isAI: true, text: 'I am right here to help you study! What concept would you like to review?' };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AIContext.Provider value={{
      isOpen,
      toggleAIModal,
      messages,
      sendMessageToAI,
      loading
    }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => useContext(AIContext);
