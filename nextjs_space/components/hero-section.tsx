
'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Play, Code2, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

const HeroSection = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document?.getElementById?.(sectionId)
    element?.scrollIntoView?.({ behavior: 'smooth' })
  }

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#0073aa]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <span className="inline-flex items-center px-4 py-2 bg-[#0073aa]/10 text-[#0073aa] rounded-full text-sm font-medium">
                <Code2 className="w-4 h-4 mr-2" />
                We Speak WordPress Fluently
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight"
            >
              Let's Talk About Your{' '}
              <span className="text-[#0073aa] relative">
                Next Project
                <motion.div
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-[#0073aa]/30 rounded"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 1, duration: 0.8 }}
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0"
            >
              Welcome to <strong className="text-[#0073aa]">Hodges & Co. WP Studios</strong>, where passion meets expertise. We guide, teach, and inspire you every step of the way in your WordPress journey.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button
                size="lg"
                className="bg-[#0073aa] hover:bg-[#005a87] text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                onClick={() => scrollToSection('contact')}
              >
                Start Your Project
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#0073aa] text-[#0073aa] hover:bg-[#0073aa] hover:text-white px-8 py-4 rounded-xl transition-all duration-300"
                onClick={() => scrollToSection('services')}
              >
                <Play className="mr-2 w-5 h-5" />
                View Our Work
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-12 grid grid-cols-3 gap-6 text-center"
            >
              <div>
                <div className="text-2xl font-bold text-[#0073aa] mb-1">10+</div>
                <div className="text-sm text-gray-600">Years Experience</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#0073aa] mb-1">400+</div>
                <div className="text-sm text-gray-600">Happy Clients</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#0073aa] mb-1">100%</div>
                <div className="text-sm text-gray-600">WordPress Focused</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Visual Elements */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <div className="relative">
              {/* Main Visual Container */}
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-1 transition-transform duration-500">
                <div className="space-y-6">
                  {/* Code Editor Mockup */}
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex space-x-2 mb-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="text-blue-400">&lt;?php</div>
                      <div className="text-white ml-4">// WordPress Magic ✨</div>
                      <div className="text-green-400 ml-4">echo 'Hello World!';</div>
                      <div className="text-blue-400">?&gt;</div>
                    </div>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 p-3 bg-[#0073aa]/10 rounded-lg">
                      <Zap className="w-5 h-5 text-[#0073aa]" />
                      <span className="text-sm font-medium">Fast & Secure</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-green-100 rounded-lg">
                      <Users className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium">Expert Team</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-[#0073aa] text-white p-3 rounded-xl shadow-lg"
              >
                <Code2 className="w-6 h-6" />
              </motion.div>

              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-4 -left-4 bg-white p-3 rounded-xl shadow-lg border-2 border-[#0073aa]"
              >
                <span className="text-[#0073aa] font-bold">WP</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
