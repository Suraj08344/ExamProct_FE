import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  VideoCameraIcon,
  ClockIcon,
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
  CheckCircleIcon,
  StarIcon,
  PlayIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const LandingPage: React.FC = () => {

  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Advanced Proctoring',
      description: 'AI-powered monitoring with webcam, screen recording, and behavior analysis to prevent cheating.',
      color: 'bg-blue-500'
    },
    {
      icon: VideoCameraIcon,
      title: 'Real-time Monitoring',
      description: 'Live video and audio monitoring with instant alerts for suspicious activities.',
      color: 'bg-green-500'
    },
    {
      icon: ClockIcon,
      title: 'Flexible Scheduling',
      description: 'Schedule exams with custom time limits, availability windows, and timezone support.',
      color: 'bg-purple-500'
    },
    {
      icon: ChartBarIcon,
      title: 'Comprehensive Analytics',
      description: 'Detailed reports on student performance, proctoring alerts, and exam analytics.',
      color: 'bg-yellow-500'
    },
    {
      icon: UserGroupIcon,
      title: 'Multi-user Support',
      description: 'Support for instructors, students, and administrators with role-based access.',
      color: 'bg-red-500'
    },
    {
      icon: CogIcon,
      title: 'Customizable Settings',
      description: 'Configure proctoring rules, exam settings, and security parameters.',
      color: 'bg-indigo-500'
    }
  ];

  const testimonials = [
    {
      name: 'Dr. Sarah Johnson',
      role: 'Computer Science Professor',
      university: 'Stanford University',
      content: 'This platform has revolutionized how we conduct online exams. The proctoring features are incredibly reliable and the interface is intuitive.',
      rating: 5
    },
    {
      name: 'Prof. Michael Chen',
      role: 'Mathematics Department Head',
      university: 'MIT',
      content: 'The analytics and reporting features help us understand student performance better. Highly recommended for any educational institution.',
      rating: 5
    },
    {
      name: 'Dr. Emily Rodriguez',
      role: 'Online Learning Director',
      university: 'Harvard University',
      content: 'Excellent platform with robust security features. Our students feel confident taking exams online with this system.',
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'Perfect for small institutions and individual instructors',
      features: [
        'Up to 100 students',
        'Basic proctoring features',
        'Email support',
        'Standard analytics',
        '5 concurrent exams'
      ],
      popular: false
    },
    {
      name: 'Professional',
      price: '$99',
      period: '/month',
      description: 'Ideal for medium-sized institutions and departments',
      features: [
        'Up to 500 students',
        'Advanced proctoring features',
        'Priority support',
        'Advanced analytics',
        'Unlimited concurrent exams',
        'Custom branding'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large institutions with custom requirements',
      features: [
        'Unlimited students',
        'All proctoring features',
        '24/7 dedicated support',
        'Custom integrations',
        'White-label solution',
        'SLA guarantee'
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-secondary-200">
        <div className="w-full p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-primary-600 mr-2" />
              <span className="text-xl font-bold text-secondary-900">ExamProctor</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-secondary-600 hover:text-secondary-900">Features</a>
              <a href="#pricing" className="text-secondary-600 hover:text-secondary-900">Pricing</a>
              <a href="#testimonials" className="text-secondary-600 hover:text-secondary-900">Testimonials</a>
              <Link to="/login" className="text-secondary-600 hover:text-secondary-900">Login</Link>
              <Link to="/university-registration" className="text-secondary-600 hover:text-secondary-900 flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-1" />
                For University
              </Link>
              <Link to="/register" className="btn-primary">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 py-20">
        <div className="w-full p-4 sm:p-6 lg:p-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 mb-6">
              Professional Online Exam
              <span className="text-primary-600"> Proctoring</span>
            </h1>
            <p className="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto">
              Secure, reliable, and intelligent exam proctoring platform designed for educational institutions. 
              Prevent cheating while providing a seamless experience for students and instructors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-8 py-3">
                Start Free Trial
              </Link>
              <Link to="/university-registration" className="bg-green-600 text-white text-lg px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors inline-flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                For University
              </Link>
              <button className="btn-secondary text-lg px-8 py-3 inline-flex items-center">
                <PlayIcon className="h-5 w-5 mr-2" />
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="w-full p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Advanced Proctoring Features
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Comprehensive exam security with AI-powered monitoring and real-time alerts
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card text-center hover:shadow-lg transition-shadow">
                <div className={`inline-flex p-3 rounded-lg ${feature.color} mb-4`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-secondary-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-secondary-50">
        <div className="w-full p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-secondary-600">
              Simple three-step process to secure your online exams
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">Create Exam</h3>
              <p className="text-secondary-600">
                Set up your exam with questions, time limits, and proctoring settings
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">Students Take Exam</h3>
              <p className="text-secondary-600">
                Students access the exam with real-time proctoring and monitoring
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">Get Results</h3>
              <p className="text-secondary-600">
                Receive detailed reports with scores, analytics, and proctoring alerts
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="w-full p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Trusted by Leading Institutions
            </h2>
            <p className="text-xl text-secondary-600">
              See what educators are saying about our platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-secondary-600 mb-4">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-secondary-900">{testimonial.name}</p>
                  <p className="text-sm text-secondary-600">{testimonial.role}</p>
                  <p className="text-sm text-secondary-600">{testimonial.university}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-secondary-50">
        <div className="w-full p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-secondary-600">
              Choose the plan that fits your institution's needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div key={index} className={`card relative ${plan.popular ? 'ring-2 ring-primary-500' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-secondary-900 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-secondary-900">{plan.price}</span>
                    <span className="text-secondary-600">{plan.period}</span>
                  </div>
                  <p className="text-secondary-600">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-secondary-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.popular 
                    ? 'bg-primary-600 text-white hover:bg-primary-700' 
                    : 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200'
                }`}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="w-full p-4 sm:p-6 lg:p-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Secure Your Online Exams?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of institutions already using our platform to conduct secure online assessments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-medium hover:bg-secondary-50 transition-colors">
              Start Free Trial
            </Link>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-medium hover:bg-white hover:text-primary-600 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-12">
        <div className="w-full p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-primary-400 mr-2" />
                <span className="text-xl font-bold">ExamProctor</span>
              </div>
              <p className="text-secondary-400">
                Professional online exam proctoring platform for educational institutions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-secondary-400">
                <li><button className="hover:text-white text-left">Features</button></li>
                <li><button className="hover:text-white text-left">Pricing</button></li>
                <li><button className="hover:text-white text-left">Security</button></li>
                <li><button className="hover:text-white text-left">API</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-secondary-400">
                <li><button className="hover:text-white text-left">Documentation</button></li>
                <li><button className="hover:text-white text-left">Help Center</button></li>
                <li><button className="hover:text-white text-left">Contact Us</button></li>
                <li><button className="hover:text-white text-left">Status</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-secondary-400">
                <li><button className="hover:text-white text-left">About</button></li>
                <li><button className="hover:text-white text-left">Blog</button></li>
                <li><button className="hover:text-white text-left">Careers</button></li>
                <li><button className="hover:text-white text-left">Privacy</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-secondary-800 mt-8 pt-8 text-center text-secondary-400">
            <p>&copy; 2024 ExamProctor. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 