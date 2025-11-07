
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Users, Briefcase, Coffee, Lightbulb } from 'lucide-react'

const StatisticsSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const statistics = [
    {
      label: 'Happy Clients',
      value: '400',
      suffix: '+',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Projects Completed',
      value: '500',
      suffix: '+',
      icon: Briefcase,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Cups of Coffee',
      value: '1000',
      suffix: '+',
      icon: Coffee,
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Innovations',
      value: '100',
      suffix: '+',
      icon: Lightbulb,
      color: 'from-purple-500 to-pink-500',
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
            Fun <span className="text-[#0073aa]">Facts</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Over the years we have done many things that we are proud of. This motivates us to continue looking for new challenges in order to improve our services.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {statistics?.map?.((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 + 0.5 }}
                >
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    <motion.span
                      initial={{ opacity: 0, y: 20 }}
                      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                      transition={{ duration: 0.8, delay: index * 0.2 + 0.7 }}
                      className="inline-block"
                    >
                      {stat.value}
                    </motion.span>
                    <span className="text-[#0073aa]">{stat.suffix}</span>
                  </div>
                  <p className="text-gray-600 font-medium text-sm">
                    {stat.label}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Achievement Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 text-center bg-white rounded-2xl p-8 shadow-lg"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Driving Success Through Innovation
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Every number tells a story of dedication, creativity, and partnership. We're not just building websites – we're crafting digital experiences that make a difference.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

export default StatisticsSection
