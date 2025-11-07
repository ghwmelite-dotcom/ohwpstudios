
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Star, Quote } from 'lucide-react'

const TestimonialsSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const testimonials = [
    {
      name: 'Oliver B.',
      title: 'Marketing Director, TechSolutions Inc.',
      testimonial: 'When we approached Hodges & Co. with a vision for our new website, they brought it to life in ways we didn\'t think possible. Their team listened carefully to our needs, provided creative solutions, and delivered a custom design that perfectly aligns with our brand identity.',
      rating: 5,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Sarah M.',
      title: 'GreenLeaf Organics',
      testimonial: 'Working with Hodges & Co. WP Studios was a game-changer for our online store. They transformed our outdated website into a sleek, high-performing e-commerce platform that increased our conversion rates by 40%.',
      rating: 5,
      color: 'from-green-500 to-emerald-500',
    },
    {
      name: 'Michael T.',
      title: 'CEO, BlueWave Consulting',
      testimonial: 'We\'ve been working with Hodges & Co. WP Studios for over three years. Their commitment to quality and innovation never wavers. They always go above and beyond to ensure our website stays ahead of the curve.',
      rating: 5,
      color: 'from-purple-500 to-pink-500',
    },
    {
      name: 'Johny T.',
      title: 'Blogger, Travel Tales',
      testimonial: 'As someone new to WordPress, I was overwhelmed at first. But thanks to Hodges & Co.\'s incredible learning resources, I\'ve gained the confidence to manage my own site. Their tutorials are clear, engaging, and packed with practical tips.',
      rating: 5,
      color: 'from-orange-500 to-red-500',
    },
  ]

  return (
    <section id="testimonials" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Loved by <span className="text-[#0073aa]">400+</span> Happy Clients
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Don't just take our word for it. Here's what our clients have to say about their experience working with Hodges & Co. WP Studios.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {testimonials?.map?.((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 h-full relative">
                {/* Quote Icon */}
                <div className={`absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br ${testimonial.color} rounded-full flex items-center justify-center shadow-lg`}>
                  <Quote className="w-6 h-6 text-white" />
                </div>

                {/* Rating */}
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)]?.map?.((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <blockquote className="text-gray-600 mb-6 leading-relaxed text-lg italic">
                  "{testimonial.testimonial}"
                </blockquote>

                {/* Author Info */}
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${testimonial.color} rounded-full flex items-center justify-center shadow-md`}>
                    <span className="text-white font-bold text-lg">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-[#0073aa] transition-colors">
                      {testimonial.name}
                    </h4>
                    <p className="text-gray-600 text-sm">
                      {testimonial.title}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16"
        >
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-[#0073aa] mb-2">4.9/5</div>
                <div className="text-gray-600">Average Rating</div>
                <div className="flex justify-center mt-2">
                  {[...Array(5)]?.map?.((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#0073aa] mb-2">400+</div>
                <div className="text-gray-600">Happy Clients</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#0073aa] mb-2">99%</div>
                <div className="text-gray-600">Would Recommend</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default TestimonialsSection
