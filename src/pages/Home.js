// pages/index.js
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { 
  Icon, 
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
const errorPreventionTools = [
    {
      title: "Peer Checking and Coaching",
      definition: "Peer Checking involves asking colleagues to review your work and assisting in reviewing theirs. Peer Coaching encourages publicly celebrating correct actions and privately correcting mistakes.",
      icon: Users
    },
    {
      title: "Debrief",
      definition: "Reflect on successes, failures, improvements, and follow-through responsibilities. Debriefs are short discussions where everyone is encouraged to speak freely.",
      icon: ClipboardList
    },
    {
      title: "ARCC",
      definition: "ARCC involves asking questions to highlight safety concerns, requesting changes, and voicing concerns if risks remain. If necessary, escalate through the chain of command to prevent harm.",
      icon: GitMerge
    },
    {
      title: "Validate and Verify",
      definition: "Validate by internally checking if the information makes sense based on past experience or expectations. Verify by consulting an independent qualified source.",
      icon: CheckCircle
    },
    {
      title: "STAR",
      definition: "STAR stands for Stop, Think, Act, and Review, focusing on thoughtful and error-free task completion. Each step ensures tasks are carried out with attention and reviewed for accuracy.",
      icon: Star
    },
    {
      title: "No Distraction Zone",
      definition: "Avoid interruptions or distractions during critical tasks by setting clear boundaries. Use phrases like 'Stand by' or 'Hold on' to maintain focus.",
      icon: BellOff
    },
    {
      title: "Effective Handoffs",
      definition: "Effective handoffs follow six principles: standardization, minimal distractions, interactivity, acknowledgments, combining verbal and written communication, and allowing clarifications. These principles ensure smooth and safe transitions.",
      icon: RefreshCw
    },
    {
      title: "Read and Repeat Back",
      definition: "The sender communicates information, and the receiver repeats it back to confirm accuracy. This ensures clarity and prevents misunderstandings through a three-step process.",
      icon: Repeat
    },
    {
      title: "Ask Clarifying Questions",
      definition: "Request additional details or express concerns to avoid misinterpretation. This helps ensure clear and effective communication.",
      icon: HelpCircle
    },
    {
      title: "Using Alphanumeric Language",
      definition: "Alphanumeric language improves clarity by using phonetic alphabets and precise numerical terms. This avoids confusion in critical communication.",
      icon: Type
    },
    {
      title: "SBAR",
      definition: "SBAR is a framework for structured communication, including Situation, Background, Assessment, and Recommendations. It ensures clear, concise, and effective information sharing.",
      icon: Layers
    }
  ];
  

const stats = [
  { icon: Skull, label: "Leading Cause Of Death", value: "3rd" },
  { label: "Hospitals At Risk", value: "6K+", subtext: "In The U.S" },
  { label: "Patient Safety Score", value: "4.9/5", subtext: "Average rating" },
  { label: "Implementation Success", value: "95%", subtext: "Across facilities" }
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
                AI Personalized Healthcare Safety Module
              </span>
              <span className="block sm:hidden">AI Safety Module</span>
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
                Case Studies
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
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Elevate Patient Safety Through Prevention
          </h1>
          <p className="text-xl mb-8">
          Avoidable medical errors in hospitals are the third leading cause of death in the USA. 99% Of
avoidable medical errors can be traced back to the misuse or lack of use of the 4 safety
principles and corresponding 11 error prevention tools (EPTs). By understanding and using this
safety language, harm to patients can be drastically reduced.
          </p>
          <Link href="/components">
          <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold flex items-center hover:bg-blue-50 transition-colors">
            Start Patient Safety Module
            <ArrowRight className="ml-2" size={20} />
          </button>
          </Link>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-1/3 h-full bg-blue-500 opacity-50 clip-path-diagonal hidden lg:block"></div>
    </div>
  );

  const StatsSection = () => (
    <section className="py-12 bg-gray-50 rounded-xl">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          Medical Errors Statistics
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Head>
        <title>Healthcare Safety Training Module</title>
        <meta name="description" content="Healthcare Safety Training Module with Error Prevention Tools" />
      </Head>

      <AppBar />
      <Hero />

      <main className="container mx-auto px-4 py-12">
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
             Medical Error Prevention Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {errorPreventionTools.map((tool, index) => (
              <ErrorPreventionCard
                key={index}
                tool={tool}
                isActive={activeTab === index}
                onClick={() => setActiveTab(index)}
              />
            ))}
          </div>
        </section>

        <StatsSection />
      </main>
    </div>
  );
}
