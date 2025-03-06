import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Star } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '../../src/app/firebase';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    try {
      // Save formData to Firestore
      await addDoc(collection(firestore, 'feedback'), formData);
      console.log('Feedback submitted successfully:', formData);

      setSubmitted(true);
      setFormData({
        rating: '5',
        difficulty: '3',
        informational: '',
        interesting: '',
        comments: '',
      });
    } catch (error) {
      console.error('Error submitting feedback:', error.message);
      setError('Failed to submit feedback. Please try again.');
    }
  };

  const renderStars = (count) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 bg-gradient-to-r from-blue-700 to-indigo-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <span className="text-white text-xl font-bold tracking-tight">
                    CoachCare.ai
                  </span>
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white p-1 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-white"
                aria-expanded={isMobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex sm:items-center sm:space-x-2">
              <Link
                href="/"
                className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/components"
                className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Safety Module
              </Link>
              <Link
                href="/dashboard"
                className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/feedback"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
              >
                Feedback
              </Link>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="sm:hidden pb-3 pt-2 border-t border-blue-600">
              <div className="flex flex-col space-y-1">
                <Link
                  href="/"
                  className="text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-600 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/components"
                  className="text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-600 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Safety Module
                </Link>
                <Link
                  href="/dashboard"
                  className="text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-600 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/feedback"
                  className="bg-blue-600 text-white px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Feedback
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Feedback Form Container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Service Feedback</h1>
          </div>

          <div className="p-6">
            {submitted && (
              <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <p className="font-medium">Thank you for your feedback!</p>
                <p>Your input helps us improve our services.</p>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Overall Rating Field */}
              <div className="space-y-2">
                <label htmlFor="rating" className="block text-sm font-medium text-gray-700">
                  Overall Rating
                </label>
                <div className="flex items-center space-x-1 mb-2">
                  {renderStars(parseInt(formData.rating))}
                </div>
                <select
                  id="rating"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="5">★★★★★ - Excellent</option>
                  <option value="4">★★★★☆ - Very Good</option>
                  <option value="3">★★★☆☆ - Good</option>
                  <option value="2">★★☆☆☆ - Fair</option>
                  <option value="1">★☆☆☆☆ - Poor</option>
                </select>
              </div>

              {/* Difficulty of Questions Field */}
              <div className="space-y-2">
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                  Difficulty of Questions
                </label>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${(parseInt(formData.difficulty) / 5) * 100}%` }}
                  ></div>
                </div>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="1">1 - Very Easy</option>
                  <option value="2">2 - Easy</option>
                  <option value="3">3 - Moderate</option>
                  <option value="4">4 - Difficult</option>
                  <option value="5">5 - Very Difficult</option>
                </select>
              </div>

              {/* Yes/No Questions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informational Case Study Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Was the case study informational?
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        id="informational-yes"
                        type="radio"
                        name="informational"
                        value="Yes"
                        checked={formData.informational === 'Yes'}
                        onChange={handleChange}
                        required
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="informational-yes" className="ml-2 block text-sm text-gray-700">
                        Yes
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="informational-no"
                        type="radio"
                        name="informational"
                        value="No"
                        checked={formData.informational === 'No'}
                        onChange={handleChange}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="informational-no" className="ml-2 block text-sm text-gray-700">
                        No
                      </label>
                    </div>
                  </div>
                </div>

                {/* Interesting Case Study Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Was the case study interesting?
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        id="interesting-yes"
                        type="radio"
                        name="interesting"
                        value="Yes"
                        checked={formData.interesting === 'Yes'}
                        onChange={handleChange}
                        required
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="interesting-yes" className="ml-2 block text-sm text-gray-700">
                        Yes
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="interesting-no"
                        type="radio"
                        name="interesting"
                        value="No"
                        checked={formData.interesting === 'No'}
                        onChange={handleChange}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="interesting-no" className="ml-2 block text-sm text-gray-700">
                        No
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Field */}
              <div className="space-y-2">
                <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                  Additional Comments
                </label>
                <textarea
                  id="comments"
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  required
                  placeholder="Please share your thoughts and suggestions..."
                  rows="5"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                ></textarea>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
