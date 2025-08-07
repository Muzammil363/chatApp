import React from 'react'
import styles from '../styles/Profile.module.css'

function SupportComp() {
    return (
        <div className={styles.actionSection}>
            <h3>Support</h3>
            <div className={styles.actionButtons}>
                <button className={styles.actionBtn}>
                    <span className={styles.actionIcon}>❓</span>
                    <div className={styles.actionText}>
                        <h4>Help Center</h4>
                        <p>Get help and support</p>
                    </div>
                    <span className={styles.actionArrow}>→</span>
                </button>

                <button className={styles.actionBtn}>
                    <span className={styles.actionIcon}>📞</span>
                    <div className={styles.actionText}>
                        <h4>Contact Support</h4>
                        <p>Reach out to our team</p>
                    </div>
                    <span className={styles.actionArrow}>→</span>
                </button>
            </div>
        </div>
    )
}

export default SupportComp
