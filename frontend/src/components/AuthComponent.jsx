import React, { useState } from 'react';
import styles from '../styles/Auth.module.css';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import connectSocket from '../socket.js';
import { authActions } from '../store/index.js';

const AuthComponent = () => {
    const navigate = useNavigate();
    const dispatch=useDispatch();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: ''
    });

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLogin) {
            console.log('Login attempt:', { email: formData.email, password: formData.password });
            let res = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });
            let data = await res.json();
            if (res.status == 200) {
                // store cookie and token 
                 localStorage.removeItem("accessToken");
                localStorage.setItem("accessToken", data.accessToken);
                // connectSocket();
                toast.success("Logged in Successfully");
                dispatch(authActions.login());
                navigate("/u/home");
            }
            else {
                toast.error(data.message);
            }

        } else {
            console.log('Signup attempt:', formData);
            if(formData.confirmPassword!=formData.password) {
                toast.error("Passwords did not match");
                return ;
            }
            let res=await fetch('http://localhost:3000/api/auth/signup',{
                method:'POST',
                headers:{
                    "Content-type":"application/json"
                },
                body:JSON.stringify({
                    email:formData.email,
                    fullName:formData.fullName,
                    password:formData.password
                })
            })
            let data=await res.json();
            if(res.status==200) {
                toast.success(data.message);
                localStorage.removeItem("accessToken");
                localStorage.setItem("accessToken",data.accessToken);
                // connectSocket();
                dispatch(authActions.login());
                navigate('/u/home');
            }
            else {
                toast.error(data.message);
                return ;
            }
        }
    };

    const toggleForm = () => {
        setIsLogin(!isLogin);
        setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            fullName: ''
        });
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>💬</div>
                        <h2 className={styles.brandName}>ChatApp</h2>
                    </div>
                    <h1 className={styles.authTitle}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className={styles.authSubtitle}>
                        {isLogin
                            ? 'Sign in to continue your conversations'
                            : 'Join millions of users worldwide'
                        }
                    </p>
                </div>

                <form className={styles.authForm} onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <label htmlFor="fullName" className={styles.inputLabel}>
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className={styles.inputField}
                                placeholder="Enter your full name"
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.inputLabel}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className={styles.inputField}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.inputLabel}>
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className={styles.inputField}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <label htmlFor="confirmPassword" className={styles.inputLabel}>
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className={styles.inputField}
                                placeholder="Confirm your password"
                                required={!isLogin}
                            />
                        </div>
                    )}

                    {isLogin && (
                        <div className={styles.forgotPassword}>
                            <a href="#" className={styles.forgotLink}>
                                Forgot your password?
                            </a>
                        </div>
                    )}

                    <button type="submit" className={styles.submitBtn}>
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span>or</span>
                </div>

                {isLogin && <div className={styles.socialAuth}>
                    <button className={styles.socialBtn}>
                        <span className={styles.socialIcon}>🔍</span>
                        Continue with Google
                    </button>
                    <button className={styles.socialBtn}>
                        <span className={styles.socialIcon}>📘</span>
                        Continue with Facebook
                    </button>
                </div>}

                <div className={styles.authSwitch}>
                    <p>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            type="button"
                            onClick={toggleForm}
                            className={styles.switchBtn}
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>

            <div className={styles.authBackground}>
                <div className={styles.floatingShape}></div>
                <div className={styles.floatingShape}></div>
                <div className={styles.floatingShape}></div>
            </div>
        </div>
    );
};

export default AuthComponent;