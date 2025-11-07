
'use client'

import { motion } from 'framer-motion'
import { Code, Heart, Mail, Phone, ArrowUp } from 'lucide-react'

const Footer = () => {
  const scrollToTop = () => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const scrollToSection = (sectionId: string) => {
    const element = document?.getElementById?.(sectionId)
    element?.scrollIntoView?.({ behavior: 'smooth' })
  }

  const footerLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'Courses', href: '#courses' },
    { label: 'Testimonials', href: '#testimonials' },
    { label: 'Contact', href: '#contact' },
  ]

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-[#0073aa] rounded-xl flex items-center justify-center">
                <Code className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Hodges & Co.</h3>
                <p className="text-[#0073aa] font-medium">WP Studios</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              We speak WordPress fluently. With over 10 years of experience, we guide, teach, and inspire you every step of the way in your WordPress journey.
            </p>
            <div className="flex items-center space-x-2 text-gray-300">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span>for WordPress</span>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="text-xl font-bold mb-6">Quick Links</h4>
            <nav className="space-y-3">
              {footerLinks?.map?.((link) => (
                <motion.button
                  key={link.href}
                  onClick={() => scrollToSection(link.href.replace('#', ''))}
                  className="block text-gray-300 hover:text-[#0073aa] transition-colors duration-200 hover:translate-x-2 transform"
                  whileHover={{ x: 8 }}
                >
                  {link.label}
                </motion.button>
              ))}
            </nav>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <h4 className="text-xl font-bold mb-6">Get in Touch</h4>
            <div className="space-y-4">
              <a
                href="tel:+233540125882"
                className="flex items-center space-x-3 text-gray-300 hover:text-[#0073aa] transition-colors group"
              >
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-[#0073aa] transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <span>(+233) 54 012 5882</span>
              </a>
              <a
                href="mailto:ohwpstudios@gmail.com"
                className="flex items-center space-x-3 text-gray-300 hover:text-[#0073aa] transition-colors group"
              >
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-[#0073aa] transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <span>ohwpstudios@gmail.com</span>
              </a>
            </div>

            {/* CTA */}
            <div className="mt-8 p-4 bg-[#0073aa]/10 rounded-xl border border-[#0073aa]/20">
              <p className="text-sm text-gray-300 mb-3">
                Ready to start your WordPress project?
              </p>
              <motion.button
                onClick={() => scrollToSection('contact')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#0073aa] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#005a87] transition-colors"
              >
                Get Started Today
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-gray-400 text-sm mb-4 md:mb-0"
            >
              © 2025 | ohwpstudios. All Rights Reserved
            </motion.p>

            {/* Back to Top Button */}
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex items-center space-x-2 text-gray-400 hover:text-[#0073aa] transition-colors group"
            >
              <span className="text-sm">Back to Top</span>
              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center group-hover:bg-[#0073aa] transition-colors">
                <ArrowUp className="w-4 h-4" />
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
