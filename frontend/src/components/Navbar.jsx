import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from '../styles/Home.module.css';

const navItems = [
  { to: '/u/home', label: 'Messages', icon: 'M' },
  { to: '/u/requests', label: 'Requests', icon: 'R' },
  { to: '/u/profile', label: 'Profile', icon: 'P' },
];

function Navbar() {
  return (
    <nav className={styles.navbar} aria-label="Primary">
      <div className={styles.logo}>
        <div className={styles.logoIcon}>C</div>
        <span className={styles.brandName}>CipherChat</span>
      </div>

      <div className={styles.navLinks}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            title={item.label}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default Navbar;
