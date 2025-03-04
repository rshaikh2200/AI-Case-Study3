import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Users, 
  ClipboardList, 
  GitMerge, 
  CheckCircle, 
  Star, 
  BellOff, 
  RefreshCw, 
  Repeat, 
  HelpCircle, 
  Type, 
  Layers,
  Menu,
  X, 
  Skull,
  HeartPulse,
  LineChart,
  ArrowUpRight,
  Shield,
  Clock,
  Award
} from 'lucide-react';

import {
  collection,
  addDoc,
  writeBatch,
  getDocs,
  query,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,  
  where,       
} from 'firebase/firestore';
import { firestore } from '../../src/app/firebase';

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scrolling for navbar background transparency
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Safety tool cards component with improved design
  const ErrorPreventionCard = ({ tool, isActive, onClick }) => {
    const IconComponent = tool.icon;
    return (
      <div
        className={`p-8 rounded-xl transition-all duration-300 cursor-pointer shadow-lg transform hover:scale-105 ${
          isActive
            ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white'
            : 'bg-white text-gray-800 hover:shadow-xl'
        }`}
        onClick={onClick}
      >
        <div className="flex items-start mb-6">
          <div className={`p-3 rounded-lg ${isActive ? 'bg-blue-500 bg-opacity-30' : 'bg-blue-50'}`}>
            <IconComponent size={28} className={isActive ? 'text-white' : 'text-blue-600'} />
          </div>
          <h3 className="text-xl font-bold ml-4 mt-1">{tool.title}</h3>
        </div>
        <p className={`text-base ${isActive ? 'text-blue-50' : 'text-gray-600'} leading-relaxed`}>
          {tool.definition}
        </p>
      </div>
    );
  };

  // Enhanced AppBar with glass morphism effect
  const AppBar = () => (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white bg-opacity-90 backdrop-blur-md shadow-md' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <div className={`flex-shrink-0 font-bold text-2xl ${isScrolled ? 'text-blue-600' : 'text-white'}`}>
              <span className="hidden sm:block">CoachCare<span className="text-blue-500">.ai</span></span>
              <span className="block sm:hidden">CC<span className="text-blue-500">.ai</span></span>
            </div>
          </div>

          <div className="sm:hidden ml-4 mr-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`focus:outline-none transition-all ${isScrolled ? 'text-blue-600' : 'text-white'}`}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          <div className="hidden sm:flex sm:items-center sm:space-x-6">
            <Link
              href="/"
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors relative group ${
                isScrolled ? 'text-blue-900 hover:text-blue-600' : 'text-white hover:text-blue-100'
              }`}
            >
              Home
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="/components"
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors relative group ${
                isScrolled ? 'text-blue-900 hover:text-blue-600' : 'text-white hover:text-blue-100'
              }`}
            >
              Safety Module
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="/dashboard"
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors relative group ${
                isScrolled ? 'text-blue-900 hover:text-blue-600' : 'text-white hover:text-blue-100'
              }`}
            >
              Dashboard
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="/feedback"
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors relative group ${
                isScrolled ? 'text-blue-900 hover:text-blue-600' : 'text-white hover:text-blue-100'
              }`}
            >
              Feedback
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <button className={`ml-2 px-5 py-3 rounded-full text-sm font-bold transition-all ${
              isScrolled 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-white text-blue-600 hover:bg-blue-50'
            }`}>
              Get Started
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="sm:hidden py-4 px-2 bg-white rounded-lg shadow-lg mb-4 animate-slideDown">
            <div className="flex flex-col space-y-2">
              <Link
                href="/"
                className="text-blue-900 px-3 py-3 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/components"
                className="text-blue-900 px-3 py-3 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Safety Module
              </Link>
              <Link
                href="/dashboard"
                className="text-blue-900 px-3 py-3 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/feedback"
                className="text-blue-900 px-3 py-3 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Feedback
              </Link>
              <button className="mt-2 px-5 py-3 rounded-full text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all">
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );

  // Hero section with gradient overlay and pattern
  const Hero = () => (
    <div className="relative min-h-screen flex items-center bg-gradient-to-br from-blue-900 to-blue-700 text-white overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-grid-pattern"></div>
      </div>
      
      {/* Gradient overlay */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent"></div>
      
      <div className="container mx-auto px-4 py-32 pt-40 relative z-10">
        <div className="max-w-3xl animate-fadeIn">
          <div className="inline-block px-4 py-1 rounded-full bg-blue-500 bg-opacity-20 text-blue-100 text-sm font-semibold mb-6">
            Healthcare Safety Training Platform
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Eliminate Patient Harm <span className="text-blue-300">And Avoid Medical Errors</span>
          </h1>
          <p className="text-xl mb-10 text-blue-50 leading-relaxed">
            Over 200,000 patients die every year due to clinical mistakes that could be prevented by hardwiring safety behaviors into the hospital culture. Our AI-powered platform identifies the 10 safety behaviors that could prevent 80% of these mistakes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="px-8 py-4 rounded-full text-base font-bold bg-white text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg">
              Schedule Demo <ArrowUpRight size={18} />
            </button>
            <button className="px-8 py-4 rounded-full text-base font-bold bg-transparent border-2 border-white text-white hover:bg-white hover:bg-opacity-10 transition-all">
              Learn More
            </button>
          </div>
          
          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6">
            <div className="flex flex-col items-center text-center p-4">
              <p className="text-4xl font-bold text-white mb-2">200k+</p>
              <p className="text-blue-100">Annual Patient Deaths</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 border-l border-r border-blue-200 border-opacity-20">
              <p className="text-4xl font-bold text-white mb-2">80%</p>
              <p className="text-blue-100">Preventable Errors</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <p className="text-4xl font-bold text-white mb-2">10</p>
              <p className="text-blue-100">Key Safety Behaviors</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl opacity-20"></div>
      <div className="absolute -left-20 top-1/3 w-72 h-72 bg-blue-300 rounded-full filter blur-3xl opacity-20"></div>
    </div>
  );

  // Enhanced marketing section with better visuals
  const MarketingSection = () => {
    const marketingPoints = [
      {
        title: "Advancing Healthcare Safety",
        description:
          "We are on a mission to reduce avoidable harm to patients. Our technology solution has been proven to decrease the liability risk of healthcare providers, making health systems safer for everyone.",
        icon: Shield,
      },     
      {
        title: "AI-Driven Training Content",
        description:
          "Our LLM produces life-like clinical scenarios customized to each user type, reinforcing the 10 safety behaviors. This creates a more dynamic, engaging, and effective training mechanism.",
        icon: Layers,
      },
      {
        title: "Actionable Insights Dashboard",
        description:
          "Our intuitive dashboard provides insights into hospital departments and safety behaviors with the biggest improvement opportunities, allowing quality leaders to implement best practices.",
        icon: LineChart,
      },
    ];
    
    return (
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="block text-blue-600 text-sm font-bold tracking-widest uppercase mb-3">Why Choose Us</span>
            <h2 className="text-4xl font-bold mb-5 text-gray-800">
              Transforming Healthcare Safety
            </h2>
            <p className="max-w-2xl mx-auto text-gray-600 text-lg">
              Our platform leverages advanced AI technology to identify and reinforce critical safety behaviors, resulting in measurable improvements in patient outcomes.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {marketingPoints.map((point, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-100">
                <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <point.icon size={32} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  {point.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
          
          {/* Additional feature highlights */}
          <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="bg-blue-50 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-100 rounded-full"></div>
              <div className="absolute right-20 top-10 w-16 h-16 bg-blue-200 rounded-full"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="text-blue-500" size={24} />
                  <span className="text-blue-700 font-semibold">Real-time Analytics</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-6">Reduced Learning Time</h3>
                <p className="text-gray-700 mb-8 leading-relaxed">
                  Our platform reduces training time by 40% while improving retention through personalized, scenario-based learning that adapts to each healthcare professional's role and experience level.
                </p>
                <button className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition-colors">
                  Learn more about our methodology <ArrowRight size={16} />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-gray-100 rounded-full"></div>
              <div className="absolute left-20 top-10 w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <Award className="text-blue-500" size={24} />
                  <span className="text-blue-700 font-semibold">Proven Results</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-6">Measurable Outcomes</h3>
                <p className="text-gray-700 mb-8 leading-relaxed">
                  Hospitals using our platform have seen a 35% reduction in preventable medical errors and a significant decrease in liability claims within the first year of implementation.
                </p>
                <button className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition-colors">
                  View case studies <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // Enhanced demo form with better UX/UI
  const DemoForm = () => {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [organization, setOrganization] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      try {
        await addDoc(collection(firestore, 'User Demo Request'), {
          name,
          role,
          organization,
          email,
          phone,
          timestamp: new Date(),
        });
        setSuccess('Demo request submitted successfully! We\'ll contact you shortly.');
        setName('');
        setRole('');
        setOrganization('');
        setEmail('');
        setPhone('');
      } catch (error) {
        console.error('Error saving demo request:', error);
        setError('Failed to submit request. Please try again or contact our support team.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <section id="demo" className="py-24 bg-gradient-to-br from-gray-50 to-gray-100 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Form content */}
                <div className="p-6 sm:p-12">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Schedule a Demo</h2>
                  <p className="text-gray-600 mb-8">See how CoachCare.ai can transform safety training at your healthcare facility.</p>
                  
                  {error && <p className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 font-medium">{error}</p>}
                  {success && <p className="bg-green-50 text-green-600 p-4 rounded-lg mb-6 font-medium">{success}</p>}
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        id="name"
                        placeholder="John Smith"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Your Role</label>
                        <input
                          type="text"
                          id="role"
                          placeholder="Quality Director"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                        <input
                          type="text"
                          id="organization"
                          placeholder="Hospital Name"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        placeholder="(123) 456-7890"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      className={`w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                        isSubmitting ? 'opacity-70 cursor-wait' : 'hover:translate-y-px'
                      }`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Request Your Demo'}
                    </button>
                  </form>
                </div>
                
                {/* Image/visual side */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-12 flex items-center justify-center relative hidden md:block">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-grid-pattern-light"></div>
                  </div>
                  <div className="relative z-10 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white mb-6">
                      <HeartPulse size={32} className="text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">Why Request a Demo?</h3>
                    <ul className="space-y-4 text-left">
                      {[
                        'See personalized AI training scenarios',
                        'Preview our analytics dashboard',
                        'Discover implementation timeline',
                        'Get pricing tailored to your needs',
                        'Ask questions to our experts'
                      ].map((item, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="text-blue-300 mt-1 mr-2 flex-shrink-0" size={18} />
                          <span className="text-blue-50">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8 p-4 bg-white bg-opacity-10 rounded-lg">
                      <p className="text-blue-50 italic">"CoachCare.ai reduced our preventable errors by 42% within just 6 months of implementation."</p>
                      <p className="text-white font-medium mt-2">— Dr. Sarah Johnson, Chief Medical Officer</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // New testimonials section
  const TestimonialsSection = () => (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="block text-blue-600 text-sm font-bold tracking-widest uppercase mb-3">Testimonials</span>
          <h2 className="text-4xl font-bold mb-5 text-gray-800">Trusted by Leading Healthcare Providers</h2>
          <p className="max-w-2xl mx-auto text-gray-600 text-lg">
            See what healthcare professionals are saying about their experience with CoachCare.ai
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              quote: "The AI-generated scenarios are incredibly realistic and relevant to our daily challenges. This is not your typical safety training.",
              name: "Dr. Mark Wilson",
              role: "Chief of Surgery, Memorial Hospital",
              avatar: "/api/placeholder/80/80"
            },
            {
              quote: "Implementation was smooth and the analytics dashboard gives us actionable insights we never had before. Already seeing a 30% reduction in errors.",
              name: "Lisa Chen, RN",
              role: "Director of Nursing, Midwest Medical Center",
              avatar: "/api/placeholder/80/80"
            },
            {
              quote: "As a quality director, I've tried many safety programs. CoachCare.ai is the first one that actually changed behaviors among our staff.",
              name: "James Thompson",
              role: "Quality Improvement Director, City General",
              avatar: "/api/placeholder/80/80"
            }
          ].map((testimonial, index) => (
            <div key={index} className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="flex items-center mb-6">
                <Star className="text-yellow-400" size={24} />
                <Star className="text-yellow-400" size={24} />
                <Star className="text-yellow-400" size={24} />
                <Star className="text-yellow-400" size={24} />
                <Star className="text-yellow-400" size={24} />
              </div>
              <p className="text-gray-700 mb-6 italic">&quot;{testimonial.quote}&quot;</p>
              <div className="flex items-center">
              <Image 
                src={testimonial.avatar} 
                alt={testimonial.name} 
                width={48}
                height={48}
                className="rounded-full mr-4" 
              />
                <div>
                  <h4 className="font-bold text-gray-800">{testimonial.name}</h4>
                  <p className="text-gray-600 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <button className="inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition-colors">
            Read more success stories <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );

  // New footer section
  const Footer = () => (
    <footer className="bg-gray-900 text-white pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-1 md:col-span-1">
            <h2 className="text-2xl font-bold mb-6">CoachCare<span className="text-blue-400">.ai</span></h2>
            <p className="text-gray-400 mb-6">
              Transforming healthcare safety through AI-powered training and analytics.
            </p>
            <div className="flex space-x-4">
              {['Twitter', 'LinkedIn', 'Facebook'].map((social, i) => (
                <a key={i} href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {social}
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Platform</h3>
            <ul className="space-y-3">
              {['Features', 'Safety Module', 'Dashboard', 'Integrations'].map((item, i) => (
                <li key={i}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {['Case Studies', 'Blog', 'Documentation', 'Support'].map((item, i) => (
                <li key={i}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {['About Us', 'Careers', 'Contact', 'Privacy Policy'].map((item, i) => (
                <li key={i}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">© 2025 CoachCare.ai. All rights reserved.</p>
            <div className="mt-4 md:mt-0">
              <ul className="flex space-x-6">
                <li><a href="#" className="text-gray-500 hover:text-white text-sm">Terms</a></li>
                <li><a href="#" className="text-gray-500 hover:text-white text-sm">Privacy</a></li>
                <li><a href="#" className="text-gray-500 hover:text-white text-sm">Cookies</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>CoachCare.ai - Healthcare Safety Training</title>
        <meta name="description" content="CoachCare.ai provides AI-driven healthcare safety training with personalized case scenarios and error prevention tools to reduce patient harm." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>

      <AppBar />
      <Hero />
      <MarketingSection />
      <TestimonialsSection />
      <DemoForm />
      <Footer />
    </div>
  );
}
