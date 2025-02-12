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
  Skull
} from 'lucide-react';
 
const stats = [
  { label: "Leading Cause Of Death", value: "3rd" },
  { label: "Hospitals At Risk", value: "6K+", subtext: "In The U.S" },
  { label: "Patients Experiencing Preventable Harm", value: "400k+" },
  { label: "Annual Hospital Cost For Patient Harm", value: "$20bn - $45bn" }
];

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
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 text-white font-bold">
              <span className="hidden sm:block">
                CoachCare.ai
              </span>
              <span className="block sm:hidden">Coachcare.ai</span>
            </div>
          </div>

          {/* Mobile menu button */}
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

          {/* Desktop Navigation */}
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

        {/* Mobile Navigation */}
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
            Elevate Patient Safety Through AI-Driven Training
          </h1>
          <p className="text-xl mb-8">
            Mdical errors in hospitals are the third leading cause of death in the USA. 99% Of avoidable medical errors can be traced back to the misuse or lack of use of the 4 safety principles and corresponding 11 safety behaviors. Our studies have shown that these 11 safety behavior could have prevented 80% of the hospital safety errors.
          </p>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-1/3 h-full bg-blue-500 opacity-50 clip-path-diagonal hidden lg:block"></div>
    </div>
  );

  const MarketingSection = () => {
    const marketingPoints = [
      {
        title: "AI-Driven Personalized Safety Scenarios",
        description:
          "CoachCare.ai safety training module utilizes a  Large Language Model (LLM) trained on over 500+ hospital medical error case studies to generate personalized case scenarios and questions  tailored for your medical employees.",
        icon: Layers,
      },
      {
        title: "Our Vision: Patient Safety First",
        description:
          "We are dedicated to raising awareness about medical errors and providing training that reinforces 11 critical safety behaviors to decrease preventable harm to patients.",
        icon: Star,
      },
      {
        title: "Combatting the 3rd Leading Cause of Death",
        description:
          "CoachCare.ai training platform is designed to tackle medical errors—the third leading cause of death in the U.S.—by by equiping healthcare professioanls with pesonalized AI driven training.",
        icon: Skull,
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

  const StatsSection = () => (
    <section className="py-12 bg-gray-50 rounded-xl">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          Hospitals Medical Errors Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">{stat.value}</div>
              <div className="text-lg font-semibold text-gray-800 mb-1">{stat.label}</div>
              <div className="text-sm text-gray-600">{stat.subtext}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // New PoweredBySection Component
  const PoweredBySection = () => (
    <section className="py-6 bg-gray-100">
      <div className="container mx-auto px-4 text-center">
        <h3 className="text-xl font-bold mb-4">Powered By:</h3>
        <div className="flex justify-center items-center space-x-8">
          <img src="/OpenAI.png" alt="ChatGPT Logo" className="h-12" />
          <img src="/LumaAI.jpeg" alt="Luma Dream Machine Logo" className="h-12" />
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Head>
        <title>Coachcare.ai - Healthcare Safety Training</title>
        <meta name="description" content="Coachcare.ai Healthcare Safety Training Module with AI-driven personalized case scenarios and error prevention tools." />
      </Head>

      <AppBar />
      <Hero />
      <MarketingSection />

      <main className="container mx-auto px-4 py-12">
        <StatsSection />
        <PoweredBySection />
      </main>
    </div>
  );
}

