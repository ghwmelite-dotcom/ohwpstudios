
import Header from '@/components/header'
import HeroSection from '@/components/hero-section'
import AboutSection from '@/components/about-section'
import StatisticsSection from '@/components/statistics-section'
import ServicesSection from '@/components/services-section'
import WhyWordPressSection from '@/components/why-wordpress-section'
import CoursesSection from '@/components/courses-section'
import TestimonialsSection from '@/components/testimonials-section'
import BlogSection from '@/components/blog-section'
import ContactSection from '@/components/contact-section'
import Footer from '@/components/footer'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <AboutSection />
      <StatisticsSection />
      <ServicesSection />
      <WhyWordPressSection />
      <CoursesSection />
      <TestimonialsSection />
      <BlogSection />
      <ContactSection />
      <Footer />
    </main>
  )
}
