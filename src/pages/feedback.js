import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const Feedback = () => {
  const [formData, setFormData] = useState({
    rating: '5',
    difficulty: '3',
    informational: '',
    interesting: '',
    comments: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let val = value;

    if (type === 'radio') {
      val = e.target.checked ? value : formData[name];
    }

    setFormData({ ...formData, [name]: val });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(formData);
    setSubmitted(true);
    setFormData({
      rating: '5',
      difficulty: '3',
      informational: '',
      interesting: '',
      comments: '',
    });
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Responsive App Bar */}
      <nav className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0 text-white font-bold">
              <span className="hidden sm:block">AI Personalized Healthcare Safety Module</span>
              <span className="block sm:hidden">AI Healthcare</span>
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

            {/* Mobile menu button */}
            <div className="sm:hidden">
              <button
                onClick={toggleMenu}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="sm:hidden pb-4">
              <div className="flex flex-col space-y-2">
                <Link
                  href="/"
                  className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/dashboard"
                  className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/feedback"
                  className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Feedback
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-[600px] mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Service Feedback</h1>
        {submitted && (
          <p className="text-green-600 mb-4">
            Thank you for your feedback!
          </p>
        )}
        {error && (
          <p className="text-red-600 mb-4">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating Field */}
          <div>
            <label
              htmlFor="rating"
              className="block mb-2 font-medium"
            >
              Overall Rating
            </label>
            <select
              id="rating"
              name="rating"
              value={formData.rating}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="5">★★★★★ - Excellent</option>
              <option value="4">★★★★☆ - Very Good</option>
              <option value="3">★★★☆☆ - Good</option>
              <option value="2">★★☆☆☆ - Fair</option>
              <option value="1">★☆☆☆☆ - Poor</option>
            </select>
          </div>

          {/* Difficulty of Questions Field */}
          <div>
            <label
              htmlFor="difficulty"
              className="block mb-2 font-medium"
            >
              Difficulty of Questions
            </label>
            <select
              id="difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="1">1 - Very Easy</option>
              <option value="2">2 - Easy</option>
              <option value="3">3 - Moderate</option>
              <option value="4">4 - Difficult</option>
              <option value="5">5 - Very Difficult</option>
            </select>
          </div>

          {/* Informational Case Study Field */}
          <div>
            <label className="block mb-2 font-medium">
              Was the case study informational?
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="informational"
                  value="Yes"
                  checked={formData.informational === 'Yes'}
                  onChange={handleChange}
                  required
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="informational"
                  value="No"
                  checked={formData.informational === 'No'}
                  onChange={handleChange}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* Interesting Case Study Field */}
          <div>
            <label className="block mb-2 font-medium">
              Was the case study interesting?
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="interesting"
                  value="Yes"
                  checked={formData.interesting === 'Yes'}
                  onChange={handleChange}
                  required
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="interesting"
                  value="No"
                  checked={formData.interesting === 'No'}
                  onChange={handleChange}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* Comments Field */}
          <div>
            <label
              htmlFor="comments"
              className="block mb-2 font-medium"
            >
              Additional Comments
            </label>
            <textarea
              id="comments"
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              required
              placeholder="Your feedback..."
              rows="5"
              className="w-full p-2 border border-gray-300 rounded-md"
            ></textarea>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-blue-700 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors"
          >
            Submit Feedback
          </button>
        </form>
      </div>
    </>
  );
};

export default Feedback;
