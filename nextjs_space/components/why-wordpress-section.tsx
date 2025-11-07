
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Shield, Wrench, TrendingUp, Users } from 'lucide-react'

const WhyWordPressSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const benefits = [
    {
      title: 'Security',
      description: 'WordPress is inherently a safe and secure platform. However, it is crucial to be vigilant when choosing plugins and assessing the development team behind them. Regular updates and best practices further enhance its security features.',
      icon: Shield,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Customization',
      description: 'With thousands of themes and plugins available, WordPress provides limitless customization options. You can tailor your site\'s design, functionality, and performance to perfectly align with your unique vision and brand identity.',
      icon: Wrench,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Scalability',
      description: 'WordPress offers unmatched scalability, allowing your website to grow with your business. Whether you start small or have an enterprise-level project, WordPress can adapt seamlessly to meet your evolving needs.',
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Community Support',
      description: 'WordPress boasts one of the largest and most active communities in the world. This means you\'ll always find tutorials, forums, and expert advice to help you overcome challenges and make the most out of your WordPress experience.',
      icon: Users,
      color: 'from-orange-500 to-red-500',
    },
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Why <span className="text-[#0073aa]">WordPress</span>? <br />
            Because It's the <span className="text-[#0073aa]">King of Content!</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Don't go it alone—let us be your trusted partner in harnessing the power of WordPress. With our expertise, you'll unlock its full potential without the stress or struggle.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {benefits?.map?.((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 h-full">
                <div className="flex items-start space-x-6">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <benefit.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-[#0073aa] transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-[#0073aa] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">WP</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Harness the Power of WordPress?
            </h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses who've transformed their online presence with WordPress. Let's build something amazing together.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const element = document?.getElementById?.('contact')
                element?.scrollIntoView?.({ behavior: 'smooth' })
              }}
              className="bg-[#0073aa] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:bg-[#005a87] transition-all duration-300"
            >
              Start Your WordPress Journey
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default WhyWordPressSection
