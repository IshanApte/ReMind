/**
 * Onboarding Modal
 * ----------------
 * This React component displays a multi-step onboarding modal to educate users
 * about the app's key features (beyond RAG, heatmap visualization, etc.).
 * Steps provide descriptions, developer credits, and sample usage prompts.
 * Includes animated transitions, step navigation, progress, and visual illustrations.
 */

'use client';

import { useState } from 'react';
import HeatMapImage from './HeatMap.png';
import ChunksImage from './Chunks.png';
import ConfidenceScoreImage from './ConfidenceScore.png';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [displayStep, setDisplayStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Portfolio URLs for developer credits
  const developerPortfolios = {
    ishan: 'https://ishan.info/',
    prathamesh: 'https://www.prathamesh-more.com/'
  };

  // Onboarding steps content
  const steps = [
    {
      title: "Beyond RAG",
      subtitle: "Dynamic Memory That Adapts to Topic Flow",
      content: "Ask questions to explore your book while the system tracks what you've seen, filters out irrelevant sections, and keeps you focused on what matters most."
    },
    {
      title: "Zero Down on Topics",
      subtitle: "Focus Your Learning",
      content: "The more you explore a topic, the more it 'remembers' and prioritizes those areas—helping you dive deeper into what interests you."
    },
    {
      title: "The Heatmap",
      subtitle: "Visualize Relevance",
      content: "The heatmap shows where your questions hit the book, with brighter bars marking the most relevant chunks and darker areas showing low‑relevance sections. It helps you see which parts of the book your current topic is focusing on and how narrowly the system is zeroing in."
    },
    {
      title: "Source Chunks",
      subtitle: "See What the System Retrieved",
      content: "When you ask a question, the system retrieves relevant chunks from the book. Each chunk shows its similarity score, final relevance score, and decay score—helping you understand how the system found and prioritized the information."
    },
    {
      title: "Confidence Score",
      subtitle: "Trust the Answer",
      content: "Every answer comes with a confidence score that indicates how well it aligns with the source material. Higher scores mean lower risk of hallucination, helping you trust the information you receive."
    },
    {
      title: "Let's Get Started",
      subtitle: "Try it on the Human Biology textbook by Willy Cushwa",
      content: "\"Give me a high-level overview of the circulatory system.\"\n\n\"What's the difference between mitosis and meiosis?\"\n\n\"How does gas exchange work in the lungs?\""
    }
  ];

  // Go to next onboarding step or complete
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection('forward');
      setIsTransitioning(true);
      setTimeout(() => {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setDisplayStep(nextStep);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 250);
    } else {
      handleComplete();
    }
  };

  // Go to previous onboarding step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setDirection('backward');
      setIsTransitioning(true);
      setTimeout(() => {
        const prevStep = currentStep - 1;
        setCurrentStep(prevStep);
        setDisplayStep(prevStep);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 250);
    }
  };

  // Fade out and complete onboarding
  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = steps[displayStep];
  const isLastStep = displayStep === steps.length - 1;
  const isFirstStep = displayStep === 0;

  return (
    <div 
      className={`fixed inset-0 bg-slate-800/95 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div 
        className={`bg-white rounded-3xl shadow-lg max-w-2xl w-full p-12 transition-all duration-300 ease-out ${
          isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500 font-medium">
              Step {displayStep + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              Skip
            </button>
          </div>
          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-250 ease-out"
              style={{ width: `${((displayStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Onboarding Content Area */}
        <div className="text-center mb-12 relative overflow-hidden min-h-[320px]">
          <div
            key={displayStep}
            className={`transition-all duration-250 ease-out ${
              isTransitioning
                ? direction === 'forward'
                  ? 'opacity-0 translate-x-8'
                  : 'opacity-0 -translate-x-8'
                : 'opacity-100 translate-x-0'
            }`}
            style={{
              transition: 'opacity 250ms ease-out, transform 250ms ease-out'
            }}
          >
            <h2 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight">
              {step.title}
            </h2>
            <h3 className="text-2xl text-gray-600 mb-8 font-medium">
              {step.subtitle}
            </h3>
            <p className={`text-lg text-gray-700 leading-relaxed max-w-xl mx-auto ${displayStep === steps.length - 1 ? 'whitespace-pre-wrap' : ''}`}>
              {step.content}
            </p>
            
            {/* Illustrations for certain steps */}
            {displayStep === 2 && (
              <div className="mt-8 flex justify-center">
                <div className="relative w-full rounded-lg overflow-hidden shadow-lg" style={{ maxWidth: 'calc(42rem * 0.9)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={typeof HeatMapImage === 'string' ? HeatMapImage : HeatMapImage.src}
                    alt="Book heatmap visualization"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
            {displayStep === 3 && (
              <div className="mt-8 flex justify-center">
                <div className="relative w-full rounded-lg overflow-hidden shadow-lg" style={{ maxWidth: 'calc(42rem * 0.9)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={typeof ChunksImage === 'string' ? ChunksImage : ChunksImage.src}
                    alt="Source chunks visualization"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
            {displayStep === 4 && (
              <div className="mt-8 flex justify-center">
                <div className="relative w-full rounded-lg overflow-hidden shadow-lg" style={{ maxWidth: 'calc(42rem * 0.9)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={typeof ConfidenceScoreImage === 'string' ? ConfidenceScoreImage : ConfidenceScoreImage.src}
                    alt="Confidence score visualization"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {/* Developer credits, visible on first step */}
            {displayStep === 0 && (
              <div className="mt-10 pt-8">
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  Developers
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <a
                    href={developerPortfolios.ishan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium hover:underline underline-offset-4"
                  >
                    Ishan
                  </a>
                  <span className="text-gray-400">&</span>
                  <a
                    href={developerPortfolios.prathamesh}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium hover:underline underline-offset-4"
                  >
                    Prathamesh
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation buttons & mini stepper */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={`px-8 py-3 rounded-2xl font-medium transition-all ${
              isFirstStep
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
            }`}
          >
            Previous
          </button>

          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === displayStep
                    ? 'bg-blue-500 w-8'
                    : 'bg-gray-300 w-1.5'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-8 py-3 rounded-2xl font-medium bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all shadow-sm"
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
