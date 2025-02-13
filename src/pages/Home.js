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
  BarChart2
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
        className={`p-6 rounded-lg transition-all duration-300 cursor-pointer card-hover-effect ${
          isActive
            ? 'bg-blue-600 text-white shadow-lg scale-105'
            : 'bg-white text-gray-800 shadow-md hover:shadow-lg'
        }`}
        onClick={onClick}
      >
        <div className="flex items-start mb-4">
          <IconComponent size={24} className={isActive ? 'text-white' : 'text-blue-600'} />
          <h3 className="text-xl font-semibold ml-3">{tool.title}</h3>
        </div>
        <p className={`text-sm ${isActive ? 'text-blue-50' : 'text-gray-600'}`}>
          {tool.definition}
        </p>
      </div>
    );
  };

  const AppBar = () => (
    <nav className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-white font-bold">
              <span className="hidden sm:block">CoachCare.ai</span>
              <span className="block sm:hidden">Coachcare.ai</span>
            </div>
          </div>

          <div className="sm:hidden ml-4 mr-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-gray-200 focus:outline-none"
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
              className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/components"
              className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              Safety Module
            </Link>
            <Link
              href="/dashboard"
              className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/feedback"
              className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              Feedback
            </Link>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="sm:hidden pb-4">
            <div className="flex flex-col space-y-2">
              <Link
                href="/"
                className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/components"
                className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Safety Module
              </Link>
              <Link
                href="/dashboard"
                className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/feedback"
                className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Feedback
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );

  const Hero = () => (
    <div className="relative bg-blue-600 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Eliminate Patient Harm And Avoid Medical Errors
          </h1>
          <p className="text-xl mb-8">
            Over 200,000 patients die every year due to clinical mistakes that could be prevented by hardwiring safety behaviors into the hospital culture. We have developed a Large Language Model (LLM) that has been trained on hundreds of case studies where things have gone wrong in health delivery. 80% of the mistakes could have been prevented by practicing 10 safety behaviors that our LLM has identified.
          </p>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-1/3 h-full bg-blue-500 opacity-50 clip-path-diagonal hidden lg:block"></div>
    </div>
  );

  const MarketingSection = () => {
    const marketingPoints = [
      {
        title: "Customized training content driven by AI",
        description:
          "Our LLM is able to produce life-like clinical scenarios customized to the user type to reinforce the 10 safety behaviors. This allows for a more dynamic, engaging and effective training mechanism above and beyond current state methods.",
        icon: Layers,
      },
      {
        title: "Our Vision: Advancing Healthcare Safety",
        description:
          "We are on a mission to reduce avoidable harm to patients. Our technology solution has been proven to decrease the liability risk of healthcare providers, thus making health systems safer.",
        icon: HeartPulse,
      },
      {
        title: "Actionable insights at your fingertips",
        description:
          "An easy-to-use dashboard provides insights into the hospital, role, department, specialty, or safety behaviors that have the biggest improvement opportunity, allowing quality leaders to cross-pollinate best practices and drill down into areas to uncover potential safety risks.",
        icon: BarChart2,
      },
    ];
    return (
      <section className="py-12 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Why Choose CoachCare.ai?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {marketingPoints.map((point, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-center mb-4">
                  <point.icon size={48} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">
                  {point.title}
                </h3>
                <p className="text-gray-600 text-center">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

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
      <section className="demo-form-section">
        <div className="container mx-auto px-4">
          <h2 className="demo-form-header text-center">Schedule a Demo</h2>
          {error && <p className="text-red-600 mb-4 text-center">{error}</p>}
          <form className="demo-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Your name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="role" className="form-label">Role</label>
              <input
                type="text"
                id="role"
                name="role"
                placeholder="Your role"
                className="form-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="organization" className="form-label">
                Name of Health System or Organization
              </label>
              <input
                type="text"
                id="organization"
                name="organization"
                placeholder="Organization name"
                className="form-input"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone" className="form-label">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="(123) 456-7890"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="demo-form-button">
              Submit
            </button>
            {success && <p className="text-green-600 text-center mt-4">{success}</p>}
          </form>
        </div>
      </section>
    );
  };

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

      <main className="container mx-auto px-4 py-12">
        <DemoForm />
      </main>
    </div>
  );
}
