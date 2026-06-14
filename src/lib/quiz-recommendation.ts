// src/lib/quiz-recommendation.ts
// Single source of truth for the quiz's recommendation — used by both the
// quiz page (client) and the submit endpoint (email). Pure, no deps.

export interface QuizAnswers {
  goal?: string;
  platform?: string;
  audience?: string;
  timeline?: string;
  features?: string;
  budget?: string;
  involvement?: string;
}

export interface Recommendation {
  key: string;        // stable id
  title: string;
  description: string;
  serviceUrl: string; // existing on-site page
  iconId: string;     // key into QuizIcon.astro's set
}

const CUSTOM: Recommendation = {
  key: 'custom-software',
  title: 'Custom Software Development',
  description:
    'A custom-built solution shaped around your exact goals — designed, built, and shipped by our team.',
  serviceUrl: '/services/custom-web-application-development',
  iconId: 'cpu',
};

/**
 * Maps the seven quiz answers to one recommended solution. Order matters:
 * the most specific signal (platform) wins, then goal, then a sensible default.
 */
export function recommendSolution(a: QuizAnswers): Recommendation {
  if (a.platform === 'mobile') {
    return {
      key: 'mobile-app',
      title: 'Mobile App Development',
      description:
        'A polished native or cross-platform mobile app your users will love — built for iOS and Android.',
      serviceUrl: '/estimate-project',
      iconId: 'smartphone',
    };
  }
  if (a.platform === 'both') {
    return {
      key: 'fullstack-web-mobile',
      title: 'Full-Stack Web & Mobile Solution',
      description:
        'A complete platform — web app plus mobile apps — for maximum reach across every device.',
      serviceUrl: '/technologies/fullstack-development',
      iconId: 'monitor',
    };
  }
  if (a.platform === 'enterprise') {
    return {
      key: 'enterprise-software',
      title: 'Enterprise Software Development',
      description:
        'A robust, scalable enterprise system designed to grow with your business and your team.',
      serviceUrl: '/services/saas-application-development',
      iconId: 'layers',
    };
  }
  if (a.goal === 'startup') {
    return {
      key: 'mvp-development',
      title: 'MVP Development',
      description:
        'Launch fast with a focused Minimum Viable Product to validate your idea and win early users.',
      serviceUrl: '/solutions/startup-mvp-development',
      iconId: 'zap',
    };
  }
  if (a.goal === 'transform') {
    return {
      key: 'digital-transformation',
      title: 'Digital Transformation',
      description:
        'Modernise legacy systems with current technology and streamlined, automation-ready processes.',
      serviceUrl: '/services/custom-web-application-development',
      iconId: 'refresh',
    };
  }
  return CUSTOM;
}
