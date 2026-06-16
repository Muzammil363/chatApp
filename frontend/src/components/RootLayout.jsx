import React from 'react'
import Navbar from './Navbar'
import { Outlet } from 'react-router-dom'
import styles from '../styles/Home.module.css'

function RootLayout() {
  return (
    <div className={styles.appShell}>
      <Navbar/>
      <main className={styles.shellContent}>
        <Outlet/>
      </main>
    </div>
  )
}

export default RootLayout
