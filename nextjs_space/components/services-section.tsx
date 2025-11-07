
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Code, Server, ShoppingCart, Search, Smartphone, Shield } from 'lucide-react'

const ServicesSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const services = [
    {
      id: 1,
      title: 'Custom WordPress Development',
      description: 'We build professional responsive websites optimized for the most popular search engines.',
      icon: Code,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 2,
      title: 'Optimized WordPress Hosting',
      description: 'The responsive websites we build are tailored to perform seamlessly on top-tier WordPress hosting platforms.',
      icon: Server,
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 3,
      title: 'Custom E-Commerce Development',
      description: 'Increase your sales with an incredible online store, full of features and functionality.',
      icon: ShoppingCart,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 4,
      title: 'Search Engine Optimization (SEO)',
      description: 'We build professional responsive websites optimized for the most popular search engines.',
      icon: Search,
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 5,
      title: 'Progressive Web App Integration (PWA)',
      description: 'Let\'s convert your WordPress website into a fully functional mobile app for Google & App Play Stores respectively.',
      icon: Smartphone,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      id: 6,
      title: 'WP Support & Maintenance',
      description: 'We keep your WordPress site secure, fast, and up-to-date with ongoing support and proactive maintenance.',
      icon: Shield,
      color: 'from-teal-500 to-blue-500',
    },
  ]

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Our <span className="text-[#0073aa]">Services</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            With over 10 years of combined industry experience, our incredible team is equipped to tackle unique WordPress projects of any complexity. We craft high-performing, visually stunning solutions that not only captivate your audience but also drive meaningful connections and conversions.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services?.map?.((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 h-full">
                <div className="flex flex-col items-start h-full">
                  {/* Service Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform`}>
                    <service.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Service Content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-[#0073aa] transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  {/* Service Number */}
                  <div className="mt-6 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-400">
                        Service #{service.id.toString().padStart(2, '0')}
                      </span>
                      <div className="w-8 h-8 bg-[#0073aa]/10 rounded-full flex items-center justify-center group-hover:bg-[#0073aa] transition-colors">
                        <span className="text-[#0073aa] group-hover:text-white text-sm font-bold">
                          {service.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-[#0073aa] to-blue-600 rounded-2xl p-8 md:p-12 text-white shadow-2xl">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Transform Your WordPress Vision?
            </h3>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Let's discuss how our services can elevate your online presence and drive real results for your business.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const element = document?.getElementById?.('contact')
                element?.scrollIntoView?.({ behavior: 'smooth' })
              }}
              className="bg-white text-[#0073aa] px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Get Your Free Consultation
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default ServicesSection
