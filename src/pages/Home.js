import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
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
  Shield,
  ChevronRight,
  Mail,
  Phone,
  AlertTriangle,
  BookOpen,
  Video,
  Target,
  Cpu,
  Award,
  Activity
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
  const [scrolled, setScrolled] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Handle navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Example card component
  const ErrorPreventionCard = ({ tool, isActive, onClick }) => {
    const IconComponent = tool.icon;
    return (
      <div
        className={`p-6 rounded-2xl transition-all duration-300 cursor-pointer transform hover:translate-y-[-8px] ${
          isActive
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl scale-105'
            : 'bg-white text-gray-800 shadow-md hover:shadow-xl border border-gray-100'
        }`}
        onClick={onClick}
      >
        <div className="flex items-start mb-4">
          <div className={`p-3 rounded-full ${isActive ? 'bg-blue-500/30' : 'bg-blue-100'}`}>
            <IconComponent size={24} className={isActive ? 'text-white' : 'text-blue-600'} />
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} CoachCare.ai. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    );
  };

  const AppBar = () => (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-lg py-2' : 'bg-gradient-to-r from-blue-600 to-blue-700 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`flex-shrink-0 font-extrabold text-xl tracking-tight transition-colors ${
                scrolled ? 'text-blue-600' : 'text-white'
              }`}
            >
              <span className="flex items-center">
                <Shield size={24} className="mr-2" />
                CoachCare.ai
              </span>
            </div>
          </div>

          <div className="sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                scrolled ? 'text-blue-600 hover:bg-blue-50' : 'text-white hover:bg-blue-500'
              }`}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          <div className="hidden sm:flex sm:items-center sm:space-x-1">
            {['Home', 'Safety Module', 'Dashboard', 'Feedback'].map((item, index) => {
              const href =
                item === 'Home'
                  ? '/'
                  : item === 'Safety Module'
                  ? '/components'
                  : `/${item.toLowerCase().replace(' ', '-')}`;
              return (
                <Link
                  key={index}
                  href={href}
                  className={`px-4 py-2 mx-1 rounded-full text-sm font-medium transition-all duration-200 ${
                    scrolled
                      ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      : 'text-white hover:bg-blue-500'
                  }`}
                >
                  {item}
                </Link>
              );
            })}
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="sm:hidden mt-3 pb-3 space-y-1 animate-fadeIn">
            {['Home', 'Safety Module', 'Dashboard', 'Feedback'].map((item, index) => {
              const href =
                item === 'Home'
                  ? '/'
                  : item === 'Safety Module'
                  ? '/components'
                  : `/${item.toLowerCase().replace(' ', '-')}`;
              return (
                <Link
                  key={index}
                  href={href}
                  className={`block px-4 py-3 rounded-md text-base font-medium ${
                    scrolled
                      ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      : 'text-white hover:bg-blue-500'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );

  const Hero = () => (
    <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white pt-24 lg:pt-32 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-blue-900 opacity-20"></div>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23FFFFFF\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            backgroundSize: '60px 60px'
          }}
        ></div>
      </div>

      <div className="container mx-auto px-4 py-16 lg:py-24 relative">
        <div className="max-w-3xl lg:max-w-4xl">
          <div className="inline-block px-4 py-1 rounded-full bg-blue-500 bg-opacity-30 text-blue-100 text-sm font-semibold mb-6">
            Healthcare Safety Revolution
          </div>
          {/* Header text modified so it's all on one line before the highlighted text */}
          <h1 className="text-4xl lg:text-6xl font-extrabold mb-6 leading-tight">
  <span>The First LLM Healthcare Training Focused On Patient Safety. Eliminate Patient Harm and Avoid Medical Errors</span>
</h1>

          <p className="text-xl lg:text-2xl mb-10 text-blue-100 max-w-3xl leading-relaxed font-light">
            Over 200,000 patients die every year due to clinical mistakes that could be prevented
            by hardwiring safety behaviors into hospital culture.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="#demo"
              className="px-8 py-4 bg-white text-blue-700 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Schedule a Demo
            </a>
          </div>
        </div>
      </div>

      <div className="relative h-24 mt-16 lg:mt-20">
        <svg
          className="absolute bottom-0 w-full h-24 -mb-1 text-white"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
        >
          <path
            fill="currentColor"
            fillOpacity="1"
            d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,224C672,213,768,171,864,149.3
            C960,128,1056,128,1152,149.3C1248,171,1344,213,1392,234.7L1440,256L1440,320L1392,320
            C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320
            C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>
    </div>
  );

  const ComparisonDiagram = () => (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">
            Traditional Training vs <span className="text-blue-600">CoachCare.ai</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how our approach transforms healthcare safety education and training
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Traditional Training - Left Column */}
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-700 pb-2 border-b-2 border-red-200 inline-block">
                Traditional Training Challenges
              </h3>
            </div>

            <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
              <div className="flex items-start">
                <div className="bg-red-100 p-3 rounded-full mr-4">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg mb-2">Generic, One-Size-Fits-All</h4>
                  <p className="text-gray-600">
                    Not specialized for different roles, departments, or individual learning styles
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
              <div className="flex items-start">
                <div className="bg-red-100 p-3 rounded-full mr-4">
                  <BookOpen size={24} className="text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg mb-2">Lacks Critical Safety Focus</h4>
                  <p className="text-gray-600">
                    Fails to emphasize key behaviors proven to prevent the most common medical errors
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
              <div className="flex items-start">
                <div className="bg-red-100 p-3 rounded-full mr-4">
                  <HelpCircle size={24} className="text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg mb-2">Abstract, Not Real-World</h4>
                  <p className="text-gray-600">
                    Uses theoretical examples instead of authentic case studies from clinical
                    practice
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CoachCare.ai Approach - Right Column */}
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-blue-700 pb-2 border-b-2 border-blue-200 inline-block">
                CoachCare.ai AI Modules
              </h3>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
              <div className="flex items-start">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <Cpu size={24} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg mb-2">AI-Powered Personalization</h4>
                  <p className="text-gray-600">
                    Tailored case studies based on 1000+ real clinical scenarios relevant to each
                    practitioner.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
              <div className="flex items-start">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <Target size={24} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg mb-2">
                    Focus on 10 Key Safety Behaviors
                  </h4>
                  <p className="text-gray-600">
                    Concentrated training on the specific behaviors proven to prevent the majority
                    of clinical errors
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
              <div className="flex items-start">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <Video size={24} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg mb-2">
                    Interactive Multimedia Learning
                  </h4>
                  <p className="text-gray-600">
                    Engaging images, videos, and simulations for better retention and real-world
                    application
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // UPDATED SECTION: Heading centered above the two images, both images same size
  const InsightfulDepartmentStatistics = () => (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center mb-8">
          Insightful Performance Dashboard
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-center space-x-4">
          {/* Slightly increased the image dimensions and kept them equal */}
          <Image
            src="/dashboard.png"
            alt="Insightful Department Statistics - Image One"
            width={450}
            height={350}
            className="rounded shadow"
          />
          <Image
            src="/dashboard2.png"
            alt="Insightful Department Statistics - Image Two"
            width={450}
            height={350}
            className="rounded shadow"
          />
        </div>
      </div>
    </section>
  );

  const MarketingSection = () => {
    const marketingPoints = [
      {
        title: 'Our Vision: Advancing Healthcare Safety',
        description:
          'We\'re on a mission to reduce avoidable harm to patients. Our proven technology solution decreases liability risk for healthcare providers, making health systems safer for everyone.',
        icon: HeartPulse
      },
      {
        title: 'AI-Driven Personalized Training',
        description:
          'Our LLM is trained on 1000+ real medical case studies in order to generates life-like clinical scenarios customized to each user, reinforcing the 10 critical safety behaviors. Experience dynamic, engaging training that surpasses traditional methods.',
        icon: Layers
      },
      {
        title: 'Actionable Insights Dashboard',
        description:
          'Access intuitive analytics that reveal improvement opportunities by hospital, role, department, or behavior. Identify potential safety risks and implement targeted solutions based on real data.',
        icon: LineChart
      }
    ];

    return (
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">
              Why Healthcare Leaders Choose <span className="text-blue-600">CoachCare.ai</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform transforms healthcare safety culture through personalized
              learning and actionable insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {marketingPoints.map((point, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col h-full transform hover:-translate-y-2 duration-300"
              >
                <div className="bg-blue-50 p-4 rounded-2xl inline-flex w-16 h-16 items-center justify-center mb-6">
                  <point.icon size={32} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{point.title}</h3>
                <p className="text-gray-600 flex-grow mb-4 leading-relaxed">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const ProcessSection = () => {
    const steps = [
      {
        number: '01',
        title: 'Identify Risk Areas',
        description:
          'Our AI analyzes your clinical data to identify potential safety concerns specific to your healthcare facility.'
      },
      {
        number: '02',
        title: 'Personalize Training',
        description:
          'We generate custom scenarios based on real-world cases, tailored to different roles and departments.'
      },
      {
        number: '03',
        title: 'Implement Safety Behaviors',
        description:
          'Staff learn and practice the 10 key safety behaviors through engaging, realistic simulations.'
      },
      {
        number: '04',
        title: 'Monitor & Improve',
        description:
          'Track progress through our dashboard and continuously refine safety protocols based on performance data.'
      }
    ];

    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">How CoachCare.ai Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive approach to improving healthcare safety
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative p-6">
                <div className="text-7xl font-extrabold text-blue-50 absolute -top-6 -left-2 z-0">
                  {step.number}
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-gray-800 mb-3 mt-4">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
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
      setFormLoading(true);
      setError(null);
      setSuccess(null);

      try {
        await addDoc(collection(firestore, 'User Demo Request'), {
          name,
          role,
          organization,
          email,
          phone,
          createdAt: new Date().toISOString()
        });
        setSuccess(
          'Demo request submitted successfully! Our team will contact you shortly.'
        );
        setName('');
        setRole('');
        setOrganization('');
        setEmail('');
        setPhone('');
      } catch (error) {
        console.error('Error saving demo request:', error);
        setError(
          'Failed to submit demo request. Please try again or contact us directly.'
        );
      } finally {
        setFormLoading(false);
      }
    };

    return (
      <section id="demo" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
                Ready to transform your healthcare safety culture?
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Schedule a personalized demonstration to see how CoachCare.ai can help your
                organization reduce errors, improve patient outcomes, and create a stronger safety
                culture.
              </p>

              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle size={20} className="text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-800">Personalized Implementation</h3>
                    <p className="text-gray-600">
                      Tailored to your organization&apos;s specific needs and challenges
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle size={20} className="text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-800">Actionable Insights</h3>
                    <p className="text-gray-600">
                      Identify risk areas and track improvement with our intuitive dashboard
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle size={20} className="text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-800">Expert Support</h3>
                    <p className="text-gray-600">
                      Our healthcare safety specialists guide you through every step
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 text-center">
                  Schedule a Demo
                </h3>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                    <p>{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded">
                    <p>{success}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="John Smith"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="role"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Your Role
                      </label>
                      <input
                        type="text"
                        id="role"
                        name="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Chief Medical Officer"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="organization"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Organization
                      </label>
                      <input
                        type="text"
                        id="organization"
                        name="organization"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Memorial Healthcare"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="john.smith@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="(123) 456-7890"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className={`w-full py-4 px-6 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                      formLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {formLoading ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 
                              5.373 0 12h4zm2 5.291A7.962 7.962 
                              0 014 12H0c0 3.042 1.135 5.824 
                              3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Request Your Demo'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // Adjusted footer spacing: changed `gap-8` to `gap-4` to reduce spacing
  const Footer = () => (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center mb-4">
              <Shield size={24} className="mr-2 text-blue-400" />
              <span className="font-bold text-xl">CoachCare.ai</span>
            </div>
            <p className="text-gray-400 mb-4">
              Transforming healthcare safety through AI-powered training and insights.
            </p>
            <div className="flex space-x-4">
              {/* Example Social Icons */}
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 
                      6.477 2 12c0 4.991 3.657 9.128 
                      8.438 9.504v-6.987h-2.54V12h2.54V9.797
                      c0-2.506 1.492-3.89 3.777-3.89 1.094 
                      0 2.238.195 2.238.195v2.46h-1.26c-1.243 
                      0-1.63.771-1.63 1.562V12h2.773l-.443 
                      2.89h-2.33v6.988C18.343 21.128 22 
                      16.991 22 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M8.29 20.251c7.547 0 11.675-6.253 
                      11.675-11.675 0-.178 0-.355-.012-.53A8.348 
                      8.348 0 0022 5.92a8.19 8.19 0 
                      01-2.357.646 4.118 4.118 0 001.804-2.27 
                      8.224 8.224 0 01-2.605.996 4.107 4.107 
                      0 00-6.993 3.743 11.65 11.65 0 
                      01-8.457-4.287 4.106 4.106 0 001.27 
                      5.477A4.072 4.072 0 012.8 
                      9.713v.052a4.105 4.105 0 003.292 4.022 
                      4.095 4.095 0 01-1.853.07 4.108 4.108 
                      0 003.834 2.85A8.233 8.233 0 012 
                      18.407a11.616 11.616 0 006.29 1.84"
                  />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 
                      12.017c0 4.425 2.865 8.18 6.839 
                      9.504.5.092.682-.217.682-.483 
                      0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003 
                      .07 1.531 1.032 1.531 1.032.892 1.53 
                      2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22
                      -.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 
                      1.029-2.688-.103-.253-.446-1.272.098-2.65 
                      0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 
                      6.844c.85.004 1.705.115 2.504.337 
                      1.909-1.296 2.747-1.027 
                      2.747-1.027.546 1.379.202 2.398.1 
                      2.651.64.7 1.028 1.595 1.028 
                      2.688 0 3.848-2.339 4.695-4.566 
                      4.943.359.309.678.92.678 1.855 
                      0 1.338-.012 2.419-.012 
                      2.747 0 .268.18.58.688.482A10.019 
                      10.019 0 0022 12.017C22 6.484 17.522 2 
                      12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M19 0h-14c-2.761 0-5 2.239-5 
                      5v14c0 2.761 2.239 5 5 
                      5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 
                      19h-3v-11h3v11zm-1.5-12.268c-.966 
                      0-1.75-.79-1.75-1.764s.784-1.764 
                      1.75-1.764 1.75.79 1.75 1.764-.783 
                      1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 
                      0v5.604h-3v-11h3v1.765c1.396-2.586 
                      7-2.777 7 2.476v6.759z"
                  />
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/components" className="text-gray-400 hover:text-white transition-colors">
                  Safety Module
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="text-gray-400 hover:text-white transition-colors">
                  Feedback
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <Mail size={20} className="mt-1 mr-3 text-blue-400 flex-shrink-0" />
                <a
                  href="mailto:info@coachcare.ai"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  coachcareai@gmail.com
                </a>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen">
      <Head>
        <title>CoachCare.ai - Advanced Healthcare Safety Training Platform</title>
        <meta
          name="description"
          content="CoachCare.ai - AI-powered healthcare safety training platform that reduces patient harm 
            and medical errors through personalized learning and actionable insights."
        />
        <link rel="icon" href="/favicon.ico" />
        {/* Move custom fonts to pages/_document.js to avoid Next.js warnings. */}
        <meta property="og:title" content="CoachCare.ai - Advanced Healthcare Safety Training" />
        <meta
          property="og:description"
          content="AI-powered healthcare safety training that reduces patient harm and medical errors through personalized learning."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://coachcare.ai" />
        <meta property="og:image" content="/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <AppBar />
      <Hero />
      <ComparisonDiagram />
      {/* Updated section with heading above, both images same size */}
      <InsightfulDepartmentStatistics />
      <MarketingSection />
      <ProcessSection />
      <DemoForm />
      <Footer />
    </div>
  );
}
