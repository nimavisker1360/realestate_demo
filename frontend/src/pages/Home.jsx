import React from 'react'
import { Link } from "react-router-dom";
import Hero from '../components/Hero'
import About from '../components/About'
import Properties from '../components/Properties'
import ConsultantsSection from '../components/ConsultantsSection'
import TestimonialsSection from '../components/TestimonialsSection'
import Blogs from '../components/Blogs'


const Home = () => {
    return (
        <main>
            <Hero />
            <About />
            {/* Divider Line */}
            <div className="w-full border-t border-gray-300"></div>
            <Properties />
            {/* Divider Line */}
            <div className="w-full border-t border-gray-300"></div>
            <ConsultantsSection />
            <TestimonialsSection autoScroll />
            <Blogs limit={4} showMore />
            <nav aria-label="SEO internal links" className="sr-only">
                <Link to="/listing">Listing</Link>
                <Link to="/projects">Projects</Link>
                <Link to="/istanbul-apartments">Istanbul Apartments</Link>
                <Link to="/kyrenia-apartments">Kyrenia Apartments</Link>
                <Link to="/turkey-property-investment">Turkey Property Investment</Link>
                <Link to="/turkish-citizenship-property">Turkish Citizenship Property</Link>
            </nav>
        </main>
    )
}

export default Home
