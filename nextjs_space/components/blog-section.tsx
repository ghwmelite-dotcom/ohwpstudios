
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Calendar, ArrowRight, BookOpen, Video, Briefcase, Users } from 'lucide-react'

const BlogSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const posts = [
    {
      title: '4 Learning Management System Design Tips For Better eLearning',
      category: 'Video & Tips',
      icon: Video,
      color: 'from-purple-500 to-pink-500',
      date: 'Nov 5, 2024',
      readTime: '5 min read',
    },
    {
      title: 'The Importance Of Intrinsic Motivation for Students',
      category: 'Business',
      icon: Briefcase,
      color: 'from-blue-500 to-cyan-500',
      date: 'Nov 3, 2024',
      readTime: '7 min read',
    },
    {
      title: 'A Better Alternative To Grading Student Writing',
      category: 'HR and L&D',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      date: 'Oct 30, 2024',
      readTime: '6 min read',
    },
  ]

  return (
    <section id="blog" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            <span className="text-[#0073aa]">WP Insights</span>: The Latest from{' '}
            <span className="text-[#0073aa]">Hodges & Co.</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stay updated with the freshest news, tips, and trends in the WordPress world—straight from our experts at WP Studios.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {posts?.map?.((post, index) => (
            <motion.article
              key={post.title}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 overflow-hidden h-full">
                {/* Article Header */}
                <div className={`bg-gradient-to-r ${post.color} p-6 text-white`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <post.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{post.category}</span>
                    </div>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Article Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-[#0073aa] transition-colors leading-tight">
                    {post.title}
                  </h3>

                  {/* Article Meta */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{post.date}</span>
                    </div>
                    <span>{post.readTime}</span>
                  </div>

                  {/* Read More Button */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#0073aa] font-medium group-hover:underline">
                      Read More
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#0073aa] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Newsletter Signup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 bg-gradient-to-r from-[#0073aa] to-blue-600 rounded-2xl p-8 md:p-12 text-center text-white shadow-2xl"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Never Miss a WordPress Insight
          </h3>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter and get the latest WordPress tips, tutorials, and industry insights delivered straight to your inbox.
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
            View All Articles
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

export default BlogSection
