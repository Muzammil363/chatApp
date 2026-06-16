import React, { useEffect, useMemo, useState } from 'react';
import styles from '../styles/Request.module.css';
import {
    acceptUser,
    cancelRequest,
    declineRequest,
    findRequests,
    findUser,
    sendRequest,
    suggestUsers
} from '../services/Request';
import toast from 'react-hot-toast';

const initialsFor = (name = '', email = '') => {
    const source = name || email;
    return source
        .split(/[.\s@_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('') || 'U';
};

const UserAvatar = ({ user }) => (
    <div className={styles.userAvatar}>
        {user.profilePic
            ? <img src={user.profilePic} alt={`${user.fullName || user.email} profile`} />
            : <span>{initialsFor(user.fullName, user.email)}</span>}
    </div>
);

const Request = () => {
    const [activeTab, setActiveTab] = useState('received');
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);

    const isSearchActive = debouncedTerm.trim().length > 0;
    const peopleToShow = isSearchActive ? searchResults : suggestedUsers;

    useEffect(() => {
        document.title = 'Requests | CipherChat';
        return () => {
            document.title = 'CipherChat';
        };
    }, []);

    useEffect(() => {
        async function loadRequests() {
            try {
                const data = await findRequests();
                setReceivedRequests(data.requests);
                setSentRequests(data.sentReq);
            } catch (error) {
                toast.error(error.message);
            }
        }
        loadRequests();
    }, [activeTab]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchQuery.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (!showSearch) return;

        async function loadSuggestions() {
            setIsLoadingSuggestions(true);
            try {
                const users = await suggestUsers(10);
                setSuggestedUsers(users);
            } catch (error) {
                toast.error(error.message);
            } finally {
                setIsLoadingSuggestions(false);
            }
        }

        if (!debouncedTerm) {
            setSearchResults([]);
            loadSuggestions();
        }
    }, [showSearch, debouncedTerm]);

    useEffect(() => {
        if (!showSearch || !debouncedTerm) return;

        async function loadData() {
            setIsSearching(true);
            try {
                const data = await findUser(debouncedTerm);
                setSearchResults(data);
            } catch (error) {
                toast.error(error.message);
            } finally {
                setIsSearching(false);
            }
        }
        loadData();
    }, [showSearch, debouncedTerm]);

    const handleShowSearch = () => {
        setShowSearch(true);
        setSearchQuery('');
        setDebouncedTerm('');
    };

    const handleBackToRequests = () => {
        setShowSearch(false);
        setSearchQuery('');
        setDebouncedTerm('');
        setSearchResults([]);
        setSuggestedUsers([]);
    };

    const handleAcceptRequest = async (email) => {
        try {
            await acceptUser(email);
            setReceivedRequests(prev => prev.filter(req => req.email !== email));
            toast.success(`Accepted ${email}'s request`);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDeclineRequest = async (email) => {
        try {
            await declineRequest(email);
            setReceivedRequests(prev => prev.filter(req => req.email !== email));
            toast.success(`Declined ${email}'s request`);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleCancelRequest = async (email) => {
        try {
            await cancelRequest(email);
            setSentRequests(prev => prev.filter(req => req.email !== email));
            toast.success('Canceled request');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleSendRequest = async (email) => {
        try {
            await sendRequest(email);
            setSuggestedUsers(prev => prev.filter(user => user.email !== email));
            setSearchResults(prev => prev.filter(user => user.email !== email));
            toast.success('Request sent');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const renderRequestCard = (request, variant) => (
        <div key={request.email || request._id} className={styles.personCard}>
            <UserAvatar user={request} />
            <div className={styles.personInfo}>
                <h4>{request.fullName || 'Unnamed user'}</h4>
                <p>{request.email}</p>
                {variant === 'sent' && <span className={styles.statusPill}>Pending</span>}
            </div>
            <div className={styles.personActions}>
                {variant === 'received' && (
                    <>
                        <button className={styles.primaryBtn} onClick={() => handleAcceptRequest(request.email)}>Accept</button>
                        <button className={styles.secondaryDangerBtn} onClick={() => handleDeclineRequest(request.email)}>Decline</button>
                    </>
                )}
                {variant === 'sent' && (
                    <button className={styles.secondaryDangerBtn} onClick={() => handleCancelRequest(request.email)}>Cancel</button>
                )}
            </div>
        </div>
    );

    const renderUserCard = (user) => (
        <div key={user.email} className={styles.personCard}>
            <UserAvatar user={user} />
            <div className={styles.personInfo}>
                <h4>{user.fullName || 'Unnamed user'}</h4>
                <p>{user.email}</p>
            </div>
            <div className={styles.personActions}>
                <button className={styles.primaryBtn} onClick={() => handleSendRequest(user.email)}>Add Friend</button>
            </div>
        </div>
    );

    const emptyCopy = useMemo(() => {
        if (isSearchActive) {
            return {
                title: 'No matching users',
                body: `No users found for "${debouncedTerm}".`
            };
        }
        return {
            title: 'No suggestions available',
            body: 'New people will appear here when more users join.'
        };
    }, [debouncedTerm, isSearchActive]);

    return (
        <div className={styles.requestContainer}>
            <div className={styles.requestContent}>
                <section className={styles.requestCard}>
                    {!showSearch ? (
                        <>
                            <div className={styles.requestHeader}>
                                <span className={styles.eyebrow}>Network</span>
                                <h1>Friend Requests</h1>
                                <p>Review pending invitations and discover people to message securely.</p>
                                <button className={styles.searchPeopleBtn} onClick={handleShowSearch}>
                                    <span className={styles.btnIcon}>+</span>
                                    Find people
                                </button>
                            </div>

                            <div className={styles.tabsContainer}>
                                <button
                                    className={`${styles.tab} ${activeTab === 'received' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('received')}
                                >
                                    Received <span>{receivedRequests.length}</span>
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === 'sent' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('sent')}
                                >
                                    Sent <span>{sentRequests.length}</span>
                                </button>
                            </div>

                            <div className={styles.requestsList}>
                                {activeTab === 'received' && (
                                    receivedRequests.length > 0
                                        ? receivedRequests.map(request => renderRequestCard(request, 'received'))
                                        : <div className={styles.emptyState}><h3>No pending requests</h3><p>You are all caught up.</p></div>
                                )}
                                {activeTab === 'sent' && (
                                    sentRequests.length > 0
                                        ? sentRequests.map(request => renderRequestCard(request, 'sent'))
                                        : <div className={styles.emptyState}><h3>No sent requests</h3><p>People you invite will appear here.</p></div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.searchHeader}>
                                <button className={styles.backBtn} onClick={handleBackToRequests}>
                                    <span aria-hidden="true">←</span>
                                    Back to requests
                                </button>
                                <span className={styles.eyebrow}>Discover</span>
                                <h1>Find People</h1>
                                <p>Search users by exact name or email, or start with suggested people.</p>
                            </div>

                            <div className={styles.searchSection}>
                                <div className={styles.searchBar}>
                                    <span className={styles.searchGlyph} aria-hidden="true"></span>
                                    <input
                                        type="text"
                                        placeholder="Search by name or email"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={styles.searchInput}
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button
                                            className={styles.clearSearch}
                                            onClick={() => setSearchQuery('')}
                                            aria-label="Clear search"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={styles.resultsHeader}>
                                <h2>{isSearchActive ? 'Search results' : 'Suggested people'}</h2>
                                <span>{peopleToShow.length} users</span>
                            </div>

                            <div className={styles.searchResults}>
                                {(isSearching || isLoadingSuggestions) ? (
                                    <div className={styles.loadingState}>
                                        <div className={styles.spinner}></div>
                                        <p>{isSearchActive ? 'Searching...' : 'Loading suggestions...'}</p>
                                    </div>
                                ) : peopleToShow.length > 0 ? (
                                    <div className={styles.usersList}>
                                        {peopleToShow.map(renderUserCard)}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <h3>{emptyCopy.title}</h3>
                                        <p>{emptyCopy.body}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Request;
