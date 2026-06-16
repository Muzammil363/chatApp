import React, { useEffect } from 'react'
import Hero from '../components/Hero'
import Features from '../components/Features'
import About from '../components/About'
import Testimonials from '../components/Testimonials'
import CTA from '../components/CTA'
import Footer from '../components/Footer'

function Landing() {
  useEffect(() => {
    document.title = 'CipherChat';
  }, []);

  return (
    <div className='App'>
      <Hero />
      <Features />
      <About />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  )
}

export default Landing
