
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Heart, Target, Users, Award } from 'lucide-react'

const AboutSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const coreValues = [
    {
      title: 'Dedication',
      description: 'Our passionate team of expert designers, developers, and project managers is fully committed to enhancing the WordPress core and ensuring exceptional results for every client.',
      icon: Heart,
      color: 'from-red-500 to-pink-500',
    },
    {
      title: 'Amazing Experiences',
      description: 'Our goal is to guide your business on a transformative journey, keeping your customers engaged and satisfied every step of the way. Because your success is our success.',
      icon: Target,
      color: 'from-blue-500 to-indigo-500',
    },
  ]

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-3">
              <span className="text-4xl">🤓</span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                It All Starts with <span className="text-[#0073aa]">Dedication</span>
              </h2>
            </div>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            For over <strong className="text-[#0073aa]">10 years</strong>, it's been our driving force—and it shows in every project we create.
          </p>
        </motion.div>

        {/* Core Values Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {coreValues?.map?.((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="group"
            >
              <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center shadow-lg`}>
                    <value.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#0073aa] transition-colors">
                      {value.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Experience Statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="bg-gradient-to-r from-[#0073aa] to-blue-600 rounded-2xl p-8 md:p-12 text-center text-white shadow-2xl"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Award className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Over 10 Years of WordPress Excellence
          </h3>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            With over 10 years of combined industry experience, our incredible team is equipped to tackle unique WordPress projects of any complexity.
          </p>
          <div className="flex items-center justify-center space-x-8 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold">10+</div>
              <div className="text-blue-200 text-sm">Years Experience</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-bold">400+</div>
              <div className="text-blue-200 text-sm">Happy Clients</div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-bold">∞</div>
              <div className="text-blue-200 text-sm">Possibilities</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default AboutSection
