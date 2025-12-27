import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styles from '../styles/Home.module.css';
import { getContacts } from '../services/User.js';
import toast from 'react-hot-toast';
import { connectSocket } from '../socket.js';
import { useSocketConnection } from '../hooks/useSocketConnection.js';
import { decryptKeyActions, privateKeyActions } from '../store/index.js';
import { deriveSharedSecret, encryptWithAES, decryptWithAES } from '../services/Encryption.js';
import { uploadImageToCloudinary } from '../services/CloudinaryUpload.js';
import { clearUnread } from '../services/User.js';
import { clearChat, deleteContact, deleteMessage } from '../services/Delete.js';
import { decryptAll, loadConversation } from '../services/Loaders.js';
import { use } from 'react';

const Home = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searched, setSearched] = useState('');
  const [searchedContacts, setSearchedContacts] = useState([]);
  const [socket, setSocket] = useState({});
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const messageBoxRef = useRef();
  const currentContact = useRef();
  const sharedSecretRef = useRef();
  const fileInputRef = useRef(null);
  const typingTimer = useRef();

  const dispatch = useDispatch();
  const myPrivateKey = useSelector(state => state.privateKey.key);

  /*
    Handlers for socket events
  */

  const handleReceive = (data) => {
    const curContactVal = currentContact.current;
    let from = data.fromMail;

    if (curContactVal && from == curContactVal.email && data.message) {
      const decryptedMessage = JSON.parse(decryptWithAES(data.message, sharedSecretRef.current));
      let newMessagePart = {
        text: decryptedMessage.text,
        image: decryptedMessage.image,
        time: decryptedMessage.time,
        id: data.time,
      }
      let newMessage = {
        message: newMessagePart,
        sender: data.fromMail
      }
      setMessages((prev) => [...prev, newMessage]);
    }
  }

  const handleTypingReceive = (from) => {
    if (from === currentContact.current.email) {
      clearTimeout(typingTimer.current);
      setIsTyping(true);
      typingTimer.current = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
  }

  const handleStopTyping = (from) => {
    if (from == currentContact.current.email) {
      setIsTyping(false);
    }
  }

  const loadMessages = async () => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);
    const data = await loadConversation(currentContact.current.email, cursor);
    const decrypted = decryptAll(data.messages, sharedSecretRef.current);
    setMessages(prev => [...decrypted.reverse(), ...prev]);
    setCursor(data.nextCursor);
    setHasMore(!!data.nextCursor);
    setIsLoading(false);
  };

  const handleDeletedMessage = (_id) => {
    try {
      setMessages((prevMessages) => {
        const updated = prevMessages.filter(msg => {
          const currentId = msg.message?.id || msg.id || msg._id;
          return String(currentId) !== String(_id);
        });
        return updated;
      });

      toast("Message deleted by sender");
    } catch (error) {
      console.error("Delete handler error:", error);
    }
  };

  useSocketConnection(handleStopTyping, handleTypingReceive, handleReceive, setSocket, handleDeletedMessage);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []); // for responsive

  useEffect(() => {
    if (messageBoxRef.current) {
      const msgArea = messageBoxRef.current;
      const handleScroll = async () => {
        if (msgArea.scrollTop === 0) {
          await loadMessages();
        }
      };

      msgArea.addEventListener('scroll', handleScroll);
      return () => msgArea.removeEventListener('scroll', handleScroll);
    }
  }, [cursor, hasMore]);

  useEffect(() => {
    async function loadContacts() {
      let res = await getContacts();
      if (res) {
        setContacts(res);
      }
      else {
        toast.error("Error while fetching contacts");
      }
    }
    loadContacts();
  }, [])

  useEffect(() => {
    if (selectedContact) {
      const otherPublicKey = selectedContact.publicKey;
      const sharedSecret = deriveSharedSecret(myPrivateKey, otherPublicKey);
      sharedSecretRef.current = sharedSecret;

      setCursor(null);
      setHasMore(true);

      async function clear() {
        let clearTo = currentContact.current.email;

        let data = await loadConversation(clearTo, null);
        setCursor(data.nextCursor);
        const decrypted = decryptAll(data.messages, sharedSecretRef.current);
        setMessages(decrypted.reverse());

        let res = await clearUnread(clearTo);
        if (res) {
          for (let i = 0; i < contacts.length; i++) {
            if (contacts[i].email === clearTo) {
              contacts[i].unread = 0;
              break;
            }
          }
        }
      }

      clear();
    }
  }, [selectedContact]);


  const handleContactSelect = (contact) => {
    if(currentContact.current !=null && currentContact.current === contact) {
      return ;
    }
    setSelectedContact(contact);
    setMessages([]);
    currentContact.current = contact;
    if (isMobile) {
      setShowConversation(true);
    }
  };

  const handleBackToContacts = () => {
    setShowConversation(false);
    setSelectedContact(null);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("Selected file:", file);
      try {
        console.log("trying upload");
        let url = await uploadImageToCloudinary(file);
        console.log("uploadeed");
        if (url) {
          // set message
          if (selectedContact) {
            const newMessage = {
              id: Date.now(),
              text: null,
              image: url,
              sender: 'me',
              time: new Date().toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true, // optional: for AM/PM
              })
            }

            const encryptedMessage = encryptWithAES(JSON.stringify(newMessage), sharedSecretRef.current);
            socket.emit("send", { message: encryptedMessage, time: newMessage.id, sendTo: selectedContact.email });
            const addMessage = {
              message: newMessage,
              sender: 'me'
            }
            setMessages((prev) => [...prev, addMessage]);
            setMessage('');
          }
        }
      } catch (err) {
        toast.error("Error while sending image");
      }
      // You can upload the file or show preview here
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && selectedContact) {
      const newMessage = {
        id: Date.now(),
        text: message,
        image: null,
        sender: 'me',
        time: new Date().toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      };
      const encryptedMessage = encryptWithAES(JSON.stringify(newMessage), sharedSecretRef.current);
      socket.emit("send", { message: encryptedMessage, time: newMessage.id, sendTo: selectedContact.email });
      const addMessage = {
        mid: newMessage.id,
        message: newMessage,
        sender: 'me'
      }
      setMessages((prev) => [...prev, addMessage]);
      setMessage('');
    }
  };

  const handleIsTyping = (e) => {
    socket.emit("typing", { to: currentContact.current.email });
  }

  const handleContactSearch = (e) => {
    let value = e.target.value;
    setSearched(value);
    const filtered = contacts.filter(contact =>
      contact.fullName.toLowerCase().startsWith(value.toLowerCase())
    );
    setSearchedContacts(filtered);
  }

  const handleContactDelete = async () => {
    const toDelete = currentContact.current.email;
    let cnf = confirm("You both will be no longer friends by Deleting contact!!");
    if (!cnf) {
      return;
    }
    let res = await deleteContact(toDelete);
    if (!res) {
      toast.error("Cannot delete contact");
      return;
    }
    if (currentContact.current.email === toDelete) {
      currentContact.current = null;
      setSelectedContact(null);
      setMessages([]);
    }

    let updatedContacts = contacts.filter(u => u.email != toDelete);
    setContacts(updatedContacts);
    toast.success("Deleted contact successfully");
  }

  const handleClearChat = async () => {
    const toClear = currentContact.current.email;
    let cnf = confirm("Clear chat will delete messages permanently for both users and cannot");
    if (!cnf) {
      return;
    }
    let res = await clearChat(toClear);
    if (!res) {
      toast.error("Cannot clear chat");
      return;
    }
    setMessages([]);
    toast.success("Chat cleared");
  }

  const handleDeleteMessage = async (id) => {
    let cnf = confirm("Delete message for everyone permanently?");
    if (!cnf) return;

    let res = await deleteMessage(id);
    if (res) {
      let updatedMessages = messages.filter(msg => msg.message.id != id);
      socket.emit("deleted", { id: id, to: currentContact.current.email });

      setMessages(updatedMessages);
      toast.success("Message Deleted for everyone");
      return;
    }
    toast.error("Cannot Delete");
  }
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
              value={searched}
              onChange={handleContactSearch}
            />
          </div>

          <div className={styles.contactsList}>
            {searched.length == 0 ? contacts.map(contact => (
              <div
                key={contact.chatId}
                className={`${styles.contactItem} ${selectedContact && selectedContact.chatId === contact.chatId ? styles.active : ''}`}
                onClick={() => handleContactSelect(contact)}
              >
                <div className={styles.contactAvatar}>
                  <span><img src={contact.profilePic} alt="" className={styles.profilePhoto} /></span>
                  {contact.online && <div className={styles.onlineIndicator}></div>}
                </div>
                <div className={styles.contactInfo}>
                  <div className={styles.contactName}>{contact.fullName}</div>
                  <div className={styles.lastMessage}>{contact.lastMessage}</div>
                </div>
                <div className={styles.contactMeta}>
                  <div className={styles.messageTime}>{contact.time}</div>
                  {contact.unread > 0 && (
                    <div className={styles.unreadBadge}>{contact.unread}</div>
                  )}
                </div>
              </div>
            )) :
              searchedContacts.map(contact => (
                <div
                  key={contact.chatId}
                  className={`${styles.contactItem} ${selectedContact && selectedContact.chatId === contact.chatId ? styles.active : ''}`}
                  onClick={() => handleContactSelect(contact)}
                >
                  <div className={styles.contactAvatar}>
                    <span><img src={contact.profilePic} alt="" className={styles.profilePhoto} /></span>
                    {/* to be handled with user profile image  */}
                    {contact.online && <div className={styles.onlineIndicator}></div>}
                  </div>
                  <div className={styles.contactInfo}>
                    <div className={styles.contactName}>{contact.fullName}</div>
                    <div className={styles.lastMessage}>{contact.lastMessage}</div>
                    {/* last message and unread counts will be handled  */}
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
                  {/* <span>{selectedContact.profilePic}</span> this is replaced*/}
                  <span> <img src={selectedContact.profilePic} alt="" className={styles.profilePhoto} /></span>
                  {selectedContact.online && <div className={styles.onlineIndicator}></div>}
                </div>
                <div className={styles.contactDetails}>
                  <h4>{selectedContact.fullName}</h4>
                  <span className={styles.status}>
                    {selectedContact.status === 'online' ? 'Online' : selectedContact.lastSeen}
                  </span>
                </div>
                <div className={styles.conversationActions}>
                  <button
                    className={styles.actionBtn}
                    onClick={handleContactDelete}
                  >Delete Contact
                  </button>

                  <button
                    className={styles.actionBtn}
                    onClick={handleClearChat}
                  >Delete Chat
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div ref={messageBoxRef} className={styles.messagesArea}>
                {isLoading && <p className={styles.loader}>Loading...</p>}
                {messages.map(msg => (
                  <div
                    key={msg._id || msg.message.id}
                    className={`${styles.message} ${msg.sender !== currentContact.current.email ? styles.myMessage : styles.otherMessage}`}
                  >
                    <div className={styles.messageContent}>

                      {msg.message.text && <p>{msg.message.text}</p>}
                      {msg.message.image && <a href={msg.message.image} target="_blank">
                        <img src={msg.message.image} alt='Cannot load image' className={styles.photo} />
                      </a>}
                      <span className={styles.messageTime}>{msg.message.time}</span>
                      <div
                        className={msg.sender === currentContact.current.email && styles.hidden}
                        style={{ cursor: 'pointer', color: 'red' }}
                        onClick={() => { handleDeleteMessage(msg.message.id) }}
                      >🗑️</div>
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
                    <span className={styles.typingText}>{selectedContact.fullName} is typing...</span>
                  </div>
                )}

                {/* {isLoading && <p className={styles.loader}>Loading...</p>} */}
              </div>

              {/* Message Input */}
              <form className={styles.messageInput} onSubmit={handleSendMessage}>
                <button
                  type="button"
                  className={styles.changePhotoBtn}
                  onClick={() => fileInputRef.current.click()}
                >
                  📎
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyUp={handleIsTyping}
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