import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
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
  ChevronRight,
  Check,
  Mail,
  Phone,
  User,
  Briefcase,
  Building
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

  const ErrorPreventionCard = ({ tool, isActive, onClick }) => {
    const IconComponent = tool.icon;
    return (
      <div
        className={`p-6 rounded-xl transition-all duration-300 cursor-pointer card-hover-effect ${
          isActive
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl scale-105'
            : 'bg-white text-gray-800 shadow-md hover:shadow-lg border border-gray-100'
        }`}
        onClick={onClick}
      >
        <div className="flex items-start mb-4">
          <div className={`p-2 rounded-full ${isActive ? 'bg-blue-500 bg-opacity-30' : 'bg-blue-50'}`}>
            <IconComponent size={24} className={isActive ? 'text-white' : 'text-blue-600'} />
          </div>
          <h3 className="text-xl font-semibold ml-3">{tool.title}</h3>
        </div>
        <p className={`text-sm ${isActive ? 'text-blue-50' : 'text-gray-600'} leading-relaxed`}>
          {tool.definition}
        </p>
      </div>
    );
  };

  const AppBar = () => (
    <nav className="sticky top-0 z-10 bg-gradient-to-r from-blue-700 to-indigo-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-white font-bold">
              <span className="hidden sm:block text-xl tracking-tight">CoachCare.ai</span>
              <span className="block sm:hidden text-xl">Coachcare.ai</span>
            </div>
          </div>

          <div className="sm:hidden ml-4 mr-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 p-1 rounded-md"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          <div className="hidden sm:flex sm:items-center sm:space-x-4">
            <Link
              href="/"
              className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors hover:shadow-md flex items-center"
            >
              Home
            </Link>
            <Link
              href="/components"
              className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors hover:shadow-md flex items-center"
            >
              Safety Module
            </Link>
            <Link
              href="/dashboard"
              className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors hover:shadow-md flex items-center"
            >
              Dashboard
            </Link>
            <Link
              href="/feedback"
              className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-400 transition-colors hover:shadow-md flex items-center"
            >
              Feedback
            </Link>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="sm:hidden pb-4 animate-fadeIn">
            <div className="flex flex-col space-y-2 rounded-md bg-blue-800 bg-opacity-50 p-2 backdrop-blur-sm">
              <Link
                href="/"
                className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors flex items-center"
              >
                <ChevronRight className="h-4 w-4 mr-2" /> Home
              </Link>
              <Link
                href="/components"
                className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors flex items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ChevronRight className="h-4 w-4 mr-2" /> Safety Module
              </Link>
              <Link
                href="/dashboard"
                className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors flex items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ChevronRight className="h-4 w-4 mr-2" /> Dashboard
              </Link>
              <Link
                href="/feedback"
                className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors flex items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ChevronRight className="h-4 w-4 mr-2" /> Feedback
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );

  const Hero = () => (
    <div className="relative bg-gradient-to-br from-blue-700 to-indigo-900 text-white overflow-hidden">
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Eliminate Patient Harm And Avoid Medical Errors
          </h1>
          <p className="text-xl mb-8 text-blue-100 leading-relaxed">
            Over 200,000 patients die every year due to clinical mistakes that could be prevented by hardwiring safety behaviors into the hospital culture. We have developed a Large Language Model (LLM) that has been trained on hundreds of case studies where things have gone wrong in health delivery. 80% of the mistakes could have been prevented by practicing 10 safety behaviors that our LLM has identified.
          </p>
          <button className="bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-1 flex items-center">
            Learn More <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-full h-full bg-blue-500 opacity-10">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#hero-pattern)" />
        </svg>
        <defs>
          <pattern id="hero-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="1" fill="white" />
          </pattern>
        </defs>
      </div>
      <div className="absolute bottom-0 right-0 w-1/3 h-full bg-blue-500 opacity-30 clip-path-diagonal hidden lg:block"></div>
    </div>
  );

  const MarketingSection = () => {
    const marketingPoints = [
      {
        title: "Our Vision: Advancing Healthcare Safety",
        description:
          "We are on a mission to reduce avoidable harm to patients. Our technology solution has been proven to decrease the liability risk of healthcare providers, thus making health systems safer.",
        icon: HeartPulse,
      },     
      {
        title: "Customized training content driven by AI",
        description:
          "Our LLM is able to produce life-like clinical scenarios customized to the user type to reinforce the 10 safety behaviors. This allows for a more dynamic, engaging and effective training mechanism above and beyond current state methods.",
        icon: Layers,
      },
      {
        title: "Actionable insights at your fingertips",
        description:
          "An easy-to-use dashboard provides insights into the hospital, role, department, specialty, or safety behaviors that have the biggest improvement opportunity, allowing quality leaders to cross-pollinate best practices and drill down into areas to uncover potential safety risks.",
        icon: LineChart,
      },
    ];
    return (
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3 text-blue-800">
            Why Choose CoachCare.ai?
          </h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
            Our platform leverages AI to create safer healthcare environments and reduce preventable errors.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {marketingPoints.map((point, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100 transform hover:-translate-y-2 duration-300">
                <div className="flex items-center justify-center mb-6">
                  <div className="p-4 rounded-full bg-blue-100 text-blue-600">
                    <point.icon size={32} />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-blue-800 mb-4 text-center">
                  {point.title}
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const StatisticsSection = () => (
    <section className="py-16 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <h4 className="text-4xl font-bold mb-2">200K+</h4>
            <p className="text-blue-200">Annual Patient Deaths</p>
          </div>
          <div className="text-center">
            <h4 className="text-4xl font-bold mb-2">80%</h4>
            <p className="text-blue-200">Preventable Errors</p>
          </div>
          <div className="text-center">
            <h4 className="text-4xl font-bold mb-2">10</h4>
            <p className="text-blue-200">Key Safety Behaviors</p>
          </div>
          <div className="text-center">
            <h4 className="text-4xl font-bold mb-2">97%</h4>
            <p className="text-blue-200">Satisfaction Rate</p>
          </div>
        </div>
      </div>
    </section>
  );

  const DemoForm = () => {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [organization, setOrganization] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
      e.preventDefault();

      setError(null);
      setSuccess(null);

      try {
        await addDoc(collection(firestore, 'User Demo Request'), {
          name,
          role,
          organization,
          email,
          phone,
        });
        setSuccess('Demo request submitted successfully.');
        setName('');
        setRole('');
        setOrganization('');
        setEmail('');
        setPhone('');
      } catch (error) {
        console.error('Error saving demo request:', error);
        setError('Failed to submit demo request. Please try again.');
      }
    };

    return (
      <section className="demo-form-section py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="p-8 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
              <h2 className="text-3xl font-bold mb-2">Schedule a Demo</h2>
              <p className="text-blue-100">See how CoachCare.ai can transform patient safety at your organization</p>
            </div>
            
            <div className="p-8">
              {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center">
                <X className="h-5 w-5 mr-2" /> {error}
              </div>}
              {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6 flex items-center">
                <Check className="h-5 w-5 mr-2" /> {success}
              </div>}
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label htmlFor="name" className="form-label flex items-center text-gray-700 mb-2">
                      <User className="h-4 w-4 mr-2" /> Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      placeholder="Your name"
                      className="form-input w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="role" className="form-label flex items-center text-gray-700 mb-2">
                      <Briefcase className="h-4 w-4 mr-2" /> Job Role
                    </label>
                    <input
                      type="text"
                      id="role"
                      name="role"
                      placeholder="Your role"
                      className="form-input w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="organization" className="form-label flex items-center text-gray-700 mb-2">
                    <Building className="h-4 w-4 mr-2" /> Organization Name
                  </label>
                  <input
                    type="text"
                    id="organization"
                    name="organization"
                    placeholder="Name of Health System or Organization"
                    className="form-input w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label htmlFor="email" className="form-label flex items-center text-gray-700 mb-2">
                      <Mail className="h-4 w-4 mr-2" /> Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="you@example.com"
                      className="form-input w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label flex items-center text-gray-700 mb-2">
                      <Phone className="h-4 w-4 mr-2" /> Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="(123) 456-7890"
                      className="form-input w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <button type="submit" className="demo-form-button bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform transition-all duration-300 hover:-translate-y-1 w-full flex items-center justify-center">
                  <span>Request Your Demo</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const TestimonialSection = () => (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-blue-800">What Healthcare Leaders Say</h2>
        
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl shadow-md relative">
          <div className="absolute top-0 left-0 transform -translate-x-4 -translate-y-4 text-6xl text-blue-400 opacity-50">"</div>
          <div className="absolute bottom-0 right-0 transform translate-x-4 translate-y-4 text-6xl text-blue-400 opacity-50">"</div>
          <p className="text-lg text-gray-700 mb-6 relative z-10">
            The CoachCare.ai platform has transformed how we approach patient safety training at our hospital. The AI-generated scenarios and data-driven insights have helped us identify key areas for improvement, resulting in a 45% reduction in reportable incidents within just six months of implementation.
          </p>
          <div className="flex items-center">
            <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
              DR
            </div>
            <div className="ml-4">
              <p className="font-semibold text-blue-800">Dr. Rebecca Johnson</p>
              <p className="text-gray-600 text-sm">Chief Medical Officer, Memorial Healthcare System</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const Footer = () => (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">CoachCare.ai</h3>
            <p className="text-gray-400 mb-4">
              Advancing healthcare safety through AI-powered training and analytics.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/components" className="text-gray-400 hover:text-white transition-colors">Safety Module</Link></li>
              <li><Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link href="/feedback" className="text-gray-400 hover:text-white transition-colors">Feedback</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Contact Us</h3>
            <p className="text-gray-400 flex items-center mb-2">
              <Mail className="h-4 w-4 mr-2" /> info@coachcare.ai
            </p>
            <p className="text-gray-400 flex items-center">
              <Phone className="h-4 w-4 mr-2" /> (800) 555-0123
            </p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          &copy; {new Date().getFullYear()} CoachCare.ai. All rights reserved.
        </div>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Head>
        <title>Coachcare.ai - Healthcare Safety Training</title>
        <meta name="description" content="Coachcare.ai Healthcare Safety Training Module with AI-driven personalized case scenarios and error prevention tools." />
        <link rel="stylesheet" href="/styles/demoForm.css" />
      </Head>

      <AppBar />
      <Hero />
      <MarketingSection />
      <StatisticsSection />
      <TestimonialSection />

      <main className="container mx-auto px-4 py-12">
        <DemoForm />
      </main>

      <Footer />
    </div>
  );
}
