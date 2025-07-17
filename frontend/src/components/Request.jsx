import React, { useState, useEffect } from 'react';
import styles from '../styles/Request.module.css';
import { findUser,findRequests, sendRequest, declineRequest ,acceptUser, cancelRequest} from '../services/Request';
import toast from 'react-hot-toast';

const Request = () => {
    const [activeTab, setActiveTab] = useState('received');
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState(searchQuery);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);

    useEffect(() => {
        // This use effect is to fetch user requests
        async function loadRequests() {
            let data=await findRequests();
            console.log("data: ",data);
            setReceivedRequests(data.requests); 
            setSentRequests(data.sentReq);
        }
        loadRequests();
    }, [activeTab]);

    useEffect(() => {
        // This use effect is for debounce implementation
        let timer=setTimeout(()=>{
            setDebouncedTerm(searchQuery);
        },500)

        return () => clearTimeout(timer);
    }, [searchQuery])

    useEffect(()=>{
        // This use effect is to search with debounced term 
        if(debouncedTerm.trim()=='') {
            setSearchResults([]);
            return ;
        }

        async function loadData() {
            let data=await findUser(debouncedTerm);  
            setSearchResults(data.result);
        }
        loadData();
    },[debouncedTerm])

    const handleShowSearch = () => {
        setShowSearch(true);
        setSearchResults(searchResults);
    };

    const handleBackToRequests = () => {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleAcceptRequest = async (requestId) => {
        let res=await acceptUser(requestId);
        if(res) {
            setReceivedRequests(prev => prev.filter(req => req.email!== requestId));
            console.log('Accepted request:', requestId);
            toast.success("Accedped "+requestId+"'s request");
            return ;
        }
        toast.error("Something went wrong");
    };

    const handleDeclineRequest = async(requestId) => {
        let res=await declineRequest(requestId);
        if(res) {
            toast.success("Declined "+requestId+" request");
            setReceivedRequests(prev => prev.filter(req => req.email !== requestId));
        }
        else toast.error("Error while Declining request");
    };

    const handleCancelRequest = async (requestId) => {
        let res=await cancelRequest(requestId);
        if(res) {
            setSentRequests(prev => prev.filter(req => req.email !== requestId));
            console.log('Cancelled request:', requestId);
            toast.success("Canceled Request successfully");
            return ;
        }
        toast.error("Something went wrong");

    };

    const handleSendRequest = async (userId) => {
        console.log('Sent request to user:', userId);
        await sendRequest(userId);
    };

    return (
        <div className={styles.requestContainer}>
            {/* Main Content */}
            <div className={styles.requestContent}>
                <div className={styles.requestCard}>
                    {!showSearch ? (
                        <>
                            {/* Requests Header */}
                            <div className={styles.requestHeader}>
                                <h1>Friend Requests</h1>
                                <p>Manage your connection requests</p>
                                <button
                                    className={styles.searchPeopleBtn}
                                    onClick={handleShowSearch}
                                >
                                    <span className={styles.searchIcon}>🔍</span>
                                    Search for People
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className={styles.tabsContainer}>
                                <button
                                    className={`${styles.tab} ${activeTab === 'received' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('received')}
                                >
                                    <span className={styles.tabIcon}>📥</span>
                                    Received ({receivedRequests.length})
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === 'sent' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('sent')}
                                >
                                    <span className={styles.tabIcon}>📤</span>
                                    Sent ({sentRequests.length})
                                </button>
                            </div>

                            {/* Request Lists */}
                            <div className={styles.requestsList}>
                                {activeTab === 'received' && (
                                    <div className={styles.receivedRequests}>
                                        {receivedRequests.length > 0 ? (
                                            receivedRequests.map(request => (
                                                <div key={request._id} className={styles.reqCard}>
                                                    <div className={styles.requestAvatar}>
                                                        <span>{request.profilePic}</span> 
                                                        {/* to be handled for user image */}
                                                    </div>
                                                    <div className={styles.requestInfo}>
                                                        <h4>{request.fullName}</h4>
                                                        <p className={styles.requestBio}>{request.bio}</p>
                                                        <div className={styles.requestMeta}>
                                                            <span className={styles.mutualFriends}>
                                                                {request.email}
                                                            </span>
                                                            <span className={styles.requestTime}>{request.time}</span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.requestActions}>
                                                        <button
                                                            className={styles.acceptBtn}
                                                            onClick={() => handleAcceptRequest(request.email)}
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            className={styles.declineBtn}
                                                            onClick={() => handleDeclineRequest(request.email)}
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className={styles.emptyState}>
                                                <span className={styles.emptyIcon}>📭</span>
                                                <h3>No pending requests</h3>
                                                <p>You don't have any friend requests at the moment</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'sent' && (
                                    <div className={styles.sentRequests}>
                                        {sentRequests.length > 0 ? (
                                            sentRequests.map(request => (
                                                <div key={request.email} className={styles.reqCard}>
                                                    <div className={styles.requestAvatar}>
                                                        <span>{request.avatar}</span>
                                                        {/* to be handled with profilePic and img */}
                                                    </div>
                                                    <div className={styles.requestInfo}>
                                                        <h4>{request.fullName}</h4>
                                                        <p className={styles.requestBio}>{request.email}</p>
                                                        <div className={styles.requestMeta}>
                                                            <span className={styles.requestStatus}>Pending</span>
                                                            <span className={styles.requestTime}>{request.time}</span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.requestActions}>
                                                        <button
                                                            className={styles.cancelBtn}
                                                            onClick={() => handleCancelRequest(request.email)}
                                                        >
                                                            Cancel Request
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className={styles.emptyState}>
                                                <span className={styles.emptyIcon}>📤</span>
                                                <h3>No sent requests</h3>
                                                <p>You haven't sent any friend requests yet</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Search Header */}
                            <div className={styles.searchHeader}>
                                <button
                                    className={styles.backBtn}
                                    onClick={handleBackToRequests}
                                >
                                    ← Back to Requests
                                </button>
                                <h1>Find People</h1>
                                <p>Discover and connect with new people</p>
                            </div>

                            {/* Search Bar */}
                            <div className={styles.searchSection}>
                                <div className={styles.searchBar}>
                                    <span className={styles.searchIcon}>🔍</span>
                                    <input
                                        type="text"
                                        placeholder="Search by name or profession..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={styles.searchInput}
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button
                                            className={styles.clearSearch}
                                            onClick={() => setSearchQuery('')}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Search Results */}
                            <div className={styles.searchResults}>
                                {isSearching ? (
                                    <div className={styles.loadingState}>
                                        <div className={styles.spinner}></div>
                                        <p>Searching...</p>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <div className={styles.usersList}>
                                        {searchResults.map(user => (
                                            <div key={user.email} className={styles.uCard}>
                                                <div className={styles.userAvatar}>
                                                    <span>{user.avatar}</span> 
                                                    {/* To be changed to use img with user.profilePic */}
                                                </div>
                                                <div className={styles.userInfo}>
                                                    <h4>{user.fullName}</h4>
                                                    <p className={styles.userBio}>{user.bio}</p>
                                                    <span className={styles.mutualFriends}>
                                                        {user.email} 
                                                    </span>
                                                </div>
                                                <div className={styles.userActions}>
                                                   
                                                        <button
                                                            className={styles.sendRequestBtn}
                                                            onClick={() => handleSendRequest(user.email)}
                                                        >
                                                            Add Friend
                                                        </button>
                                                   
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.noResults}>
                                        <span className={styles.noResultsIcon}>🔍</span>
                                        <p>No users found{searchQuery && ` matching "${searchQuery}"`}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Request;