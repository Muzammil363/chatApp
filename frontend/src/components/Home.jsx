import React, { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';


const Home = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState({});

  // Mock contacts data
  const contacts = [
    {
      id: 1,
      name: 'Sarah Johnson',
      avatar: '👩‍💼',
      lastMessage: 'Hey! How are you doing?',
      time: '2:30 PM',
      unread: 2,
      online: true
    },
    {
      id: 2,
      name: 'Mike Chen',
      avatar: '👨‍💻',
      lastMessage: 'The project looks great!',
      time: '1:45 PM',
      unread: 0,
      online: true
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      avatar: '👩‍🎓',
      lastMessage: 'Thanks for your help',
      time: '12:20 PM',
      unread: 1,
      online: false
    },
    {
      id: 4,
      name: 'David Wilson',
      avatar: '👨‍🎨',
      lastMessage: 'Let\'s catch up soon',
      time: '11:30 AM',
      unread: 0,
      online: false
    },
    {
      id: 5,
      name: 'Lisa Park',
      avatar: '👩‍⚕️',
      lastMessage: 'Meeting at 3 PM?',
      time: '10:15 AM',
      unread: 3,
      online: true
    }
  ];

  // Mock messages data
  const mockMessages = {
    1: [
      { id: 1, text: 'Hey! How are you doing?', sender: 'other', time: '2:25 PM' },
      { id: 2, text: 'I\'m doing great! Just finished a big project.', sender: 'me', time: '2:27 PM' },
      { id: 3, text: 'That\'s awesome! What was it about?', sender: 'other', time: '2:28 PM' },
      { id: 4, text: 'It was a new chat application with real-time messaging', sender: 'me', time: '2:30 PM' }
    ],
    2: [
      { id: 1, text: 'The project looks great!', sender: 'other', time: '1:40 PM' },
      { id: 2, text: 'Thank you! I put a lot of effort into it.', sender: 'me', time: '1:42 PM' },
      { id: 3, text: 'It really shows. The UI is very clean.', sender: 'other', time: '1:45 PM' }
    ],
    3: [
      { id: 1, text: 'Thanks for your help', sender: 'other', time: '12:15 PM' },
      { id: 2, text: 'You\'re welcome! Happy to help anytime.', sender: 'me', time: '12:18 PM' },
      { id: 3, text: 'I really appreciate it!', sender: 'other', time: '12:20 PM' }
    ]
  };

  // useEffect(() => {
  //   setMessages(mockMessages);
  //   if (socket.connected) {
  //     console.log("Already connected with socket id:", socket.id);
  //     setConnected(true);
  //   }

  //   const onConnect = () => {
  //     console.log("Connected with socket id:", socket.id);
  //     setConnected(true);
  //   };

  //   const onDisconnect = () => {
  //     console.log("Disconnected from socket.");
  //     setConnected(false);
  //   };

  //   socket.on("connect", onConnect);
  //   socket.on("disconnect", onDisconnect);

  //   // Cleanup
  //   return () => {
  //     socket.off("connect", onConnect);
  //     socket.off("disconnect", onDisconnect);
  //   };
  // }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (selectedContact) {
      // Simulate typing indicator
      const typingTimer = setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000);
      }, 1000);
      
      return () => clearTimeout(typingTimer);
    }
  }, [selectedContact]);

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    if (isMobile) {
      setShowConversation(true);
    }
  };

  const handleBackToContacts = () => {
    setShowConversation(false);
    setSelectedContact(null);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && selectedContact) {
      const newMessage = {
        id: Date.now(),
        text: message,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), newMessage]
      }));
      
      setMessage('');
    }
  };

  return (
    <div className={styles.homeContainer}>
      {/* Navigation Bar */}
      

      {/* Main Chat Interface */}
      <div className={styles.chatContainer}>
        {/* Contacts Sidebar */}
        <div className={`${styles.contactsSidebar} ${isMobile && showConversation ? styles.hidden : ''}`}>
          <div className={styles.contactsHeader}>
            <h3>Messages</h3>
            <button className={styles.newChatBtn}>+</button>
          </div>
          
          <div className={styles.searchBar}>
            <input 
              type="text" 
              placeholder="Search conversations..."
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.contactsList}>
            {contacts.map(contact => (
              <div 
                key={contact.id}
                className={`${styles.contactItem} ${selectedContact?.id === contact.id ? styles.active : ''}`}
                onClick={() => handleContactSelect(contact)}
              >
                <div className={styles.contactAvatar}>
                  <span>{contact.avatar}</span>
                  {contact.online && <div className={styles.onlineIndicator}></div>}
                </div>
                <div className={styles.contactInfo}>
                  <div className={styles.contactName}>{contact.name}</div>
                  <div className={styles.lastMessage}>{contact.lastMessage}</div>
                </div>
                <div className={styles.contactMeta}>
                  <div className={styles.messageTime}>{contact.time}</div>
                  {contact.unread > 0 && (
                    <div className={styles.unreadBadge}>{contact.unread}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation Area */}
        <div className={`${styles.conversationArea} ${isMobile && !showConversation ? styles.hidden : ''}`}>
          {selectedContact ? (
            <>
              {/* Conversation Header */}
              <div className={styles.conversationHeader}>
                {isMobile && (
                  <button 
                    className={styles.backBtn}
                    onClick={handleBackToContacts}
                  >
                    ←
                  </button>
                )}
                <div className={styles.contactAvatar}>
                  <span>{selectedContact.avatar}</span>
                  {selectedContact.online && <div className={styles.onlineIndicator}></div>}
                </div>
                <div className={styles.contactDetails}>
                  <h4>{selectedContact.name}</h4>
                  <span className={styles.status}>
                    {selectedContact.online ? 'Online' : 'Last seen recently'}
                  </span>
                </div>
                <div className={styles.conversationActions}>
                  <button className={styles.actionBtn}>📞</button>
                  <button className={styles.actionBtn}>📹</button>
                  <button className={styles.actionBtn}>ℹ️</button>
                </div>
              </div>

              {/* Messages Area */}
              <div className={styles.messagesArea}>
                {messages[selectedContact.id]?.map(msg => (
                  <div 
                    key={msg.id}
                    className={`${styles.message} ${msg.sender === 'me' ? styles.myMessage : styles.otherMessage}`}
                  >
                    <div className={styles.messageContent}>
                      <p>{msg.text}</p>
                      <span className={styles.messageTime}>{msg.time}</span>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className={styles.typingIndicator}>
                    <div className={styles.typingDots}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className={styles.typingText}>{selectedContact.name} is typing...</span>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form className={styles.messageInput} onSubmit={handleSendMessage}>
                <button type="button" className={styles.attachBtn}>📎</button>
                <input 
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className={styles.messageField}
                />
                <button type="button" className={styles.emojiBtn}>😊</button>
                <button type="submit" className={styles.sendBtn}>➤</button>
              </form>
            </>
          ) : (
            <div className={styles.noConversation}>
              <div className={styles.noConversationIcon}>💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a contact from the sidebar to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;