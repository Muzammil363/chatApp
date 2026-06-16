import React, { useEffect, useState } from 'react';
import styles from '../styles/Auth.module.css';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { authActions, privateKeyActions } from '../store/index.js';
import { getECDHKeyPairFromPIN } from '../services/Encryption.js';
import { apiRequest } from '../services/api.js';

const emptyForm = {
  email: '',
  password: '',
  fullName: '',
  pin: '',
  confirmPin: ''
};

const AuthComponent = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    document.title = isLogin ? 'Login | CipherChat' : 'Create Account | CipherChat';
  }, [isLogin]);

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.pin || formData.pin.length < 2) {
      toast.error('Please provide a valid PIN');
      return;
    }

    const keys = getECDHKeyPairFromPIN(formData.pin);

    if (isLogin) {
      try {
        const data = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });

        if (data.user?.publicKey && data.user.publicKey !== keys.publicKeyHex) {
          toast.error('Invalid PIN for this account');
          return;
        }

        dispatch(privateKeyActions.setPrivateKey({ privateKey: keys.privateKey }));
        dispatch(authActions.login({ user: data.user }));
        toast.success('Logged in successfully');
        navigate('/u/home');
      } catch (error) {
        toast.error(error.message);
      }
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      toast.error('Security PINs did not match');
      return;
    }

    try {
      const data = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          fullName: formData.fullName,
          password: formData.password,
          publicKey: keys.publicKeyHex
        })
      });

      dispatch(privateKeyActions.setPrivateKey({ privateKey: keys.privateKey }));
      dispatch(authActions.login({ user: data.user }));
      toast.success(data.message);
      navigate('/u/home');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const toggleForm = () => {
    setIsLogin(prev => !prev);
    setFormData(emptyForm);
  };

  return (
    <main className={styles.authContainer}>
      <section className={styles.authShell}>
        <aside className={styles.brandPanel}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>C</div>
            <h2 className={styles.brandName}>CipherChat</h2>
          </div>

          <div className={styles.brandCopy}>
            <span className={styles.kicker}>Encrypted messaging</span>
            <h1>Private chats, cleanly organized.</h1>
            <p>Continue direct and group conversations with cookie-based sessions and PIN-unlocked encryption keys.</p>
          </div>

          <div className={styles.valueList}>
            <span>Cookie sessions</span>
            <span>PIN key unlock</span>
            <span>Real-time chat</span>
          </div>
        </aside>

        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <span className={styles.formEyebrow}>{isLogin ? 'Welcome back' : 'Start secure'}</span>
            <h1 className={styles.authTitle}>
              {isLogin ? 'Sign in to CipherChat' : 'Create your account'}
            </h1>
            <p className={styles.authSubtitle}>
              {isLogin
                ? 'Use your account password and secret PIN to unlock messages.'
                : 'Your PIN creates the encryption key used for private messages.'}
            </p>
          </div>

          <form className={styles.authForm} onSubmit={handleSubmit}>
            {!isLogin && (
              <div className={styles.inputGroup}>
                <label htmlFor="fullName" className={styles.inputLabel}>Full name</label>
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
              <label htmlFor="email" className={styles.inputLabel}>Email address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={styles.inputField}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.inputLabel}>Password</label>
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

            <div className={styles.inputGroup}>
              <label htmlFor="pin" className={styles.inputLabel}>Secret PIN</label>
              <p className={styles.helperText}>Remember this PIN. It rebuilds your encryption key after refresh and is not stored.</p>
              <input
                type="password"
                id="pin"
                name="pin"
                value={formData.pin}
                onChange={handleInputChange}
                className={styles.inputField}
                placeholder="Enter your secret PIN"
                required
              />
            </div>

            {!isLogin && (
              <div className={styles.inputGroup}>
                <label htmlFor="confirmPin" className={styles.inputLabel}>Confirm secret PIN</label>
                <input
                  type="password"
                  id="confirmPin"
                  name="confirmPin"
                  value={formData.confirmPin}
                  onChange={handleInputChange}
                  className={styles.inputField}
                  placeholder="Confirm your secret PIN"
                  required={!isLogin}
                />
              </div>
            )}

            <button type="submit" className={styles.submitBtn}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className={styles.authSwitch}>
            <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
            <button type="button" onClick={toggleForm} className={styles.switchBtn}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AuthComponent;
