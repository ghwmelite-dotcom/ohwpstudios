
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { BookOpen, Clock, Users, Star, Play } from 'lucide-react'

const CoursesSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const courses = [
    {
      price: 'Free',
      level: 'Beginner',
      category: 'WordPress Fundamentals',
      title: 'Getting Started With WordPress in 2025: Get Set Up',
      duration: '12 Lessons | 1 Hour',
      what_youll_learn: 'Choose a host, register a domain name, and set up your WordPress site.',
      color: 'from-green-500 to-emerald-500',
      rating: 4.9,
      students: 2500,
    },
    {
      price: 'Free',
      level: 'Beginner',
      category: 'Site Building Basics',
      title: 'Getting Started with WordPress in 2025: Get Familiar',
      duration: '5 Lessons',
      what_youll_learn: 'Familiarize yourself with WordPress basics.',
      color: 'from-blue-500 to-cyan-500',
      rating: 4.8,
      students: 1800,
    },
  ]

  return (
    <section id="courses" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Master <span className="text-[#0073aa]">WordPress</span>: <br />
            Courses to Elevate Your Skills
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            WordPress offers endless possibilities for crafting and growing your online presence. Our courses are designed to guide you through its vast potential, delivering content in engaging text and video formats.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {courses?.map?.((course, index) => (
            <motion.div
              key={course.title}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="group"
            >
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 overflow-hidden h-full">
                {/* Course Header */}
                <div className={`bg-gradient-to-r ${course.color} p-6 text-white`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                      {course.price}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-300 fill-current" />
                      <span className="text-sm font-medium">{course.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <BookOpen className="w-5 h-5" />
                    <span className="text-sm font-medium">{course.level}</span>
                  </div>
                  <p className="text-sm text-white/80 mb-4">{course.category}</p>
                </div>

                {/* Course Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-[#0073aa] transition-colors leading-tight">
                    {course.title}
                  </h3>

                  {/* Course Stats */}
                  <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{course.students?.toLocaleString?.()} students</span>
                    </div>
                  </div>

                  {/* What You'll Learn */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">What you'll learn:</h4>
                    <p className="text-gray-600 leading-relaxed">
                      {course.what_youll_learn}
                    </p>
                  </div>

                  {/* CTA Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const element = document?.getElementById?.('contact')
                      element?.scrollIntoView?.({ behavior: 'smooth' })
                    }}
                    className="w-full bg-[#0073aa] text-white py-3 px-6 rounded-xl font-medium hover:bg-[#005a87] transition-colors duration-300 flex items-center justify-center space-x-2"
                  >
                    <Play className="w-5 h-5" />
                    <span>Start Learning Free</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="bg-gradient-to-r from-[#0073aa] to-blue-600 rounded-2xl p-8 md:p-12 text-center text-white shadow-2xl"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Unlock Your WordPress Potential Today
          </h3>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of learners who've transformed their WordPress skills with our comprehensive courses. Start your journey to becoming a WordPress expert.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const element = document?.getElementById?.('contact')
                element?.scrollIntoView?.({ behavior: 'smooth' })
              }}
              className="bg-white text-[#0073aa] px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Browse All Courses
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const element = document?.getElementById?.('contact')
                element?.scrollIntoView?.({ behavior: 'smooth' })
              }}
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-[#0073aa] transition-all duration-300"
            >
              Get Personal Training
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default CoursesSection
