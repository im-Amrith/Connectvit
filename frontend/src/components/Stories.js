import React from 'react';
import { useAuth } from './AuthContext';
import './Stories.css';

const curatedStories = [
  {
    id: 'hackathon',
    title: 'VIT Hacks',
    subtitle: 'Live now',
    initials: 'VH',
    accent: 'linear-gradient(130deg, #6b8dff, #c284ff)',
  },
  {
    id: 'designlab',
    title: 'Design Lab',
    subtitle: 'UI/UX meet',
    initials: 'DL',
    accent: 'linear-gradient(140deg, #22d3ee, #818cf8)',
  },
  {
    id: 'research',
    title: 'AI Research',
    subtitle: 'Paper drop',
    initials: 'AI',
    accent: 'linear-gradient(135deg, #f472b6, #c084fc)',
  },
  {
    id: 'campuslife',
    title: 'Campus Life',
    subtitle: 'Stories',
    initials: 'CL',
    accent: 'linear-gradient(140deg, #facc15, #fb7185)',
  },
];

export default function Stories() {
  const { currentUser } = useAuth();

  const personalStory = currentUser
    ? {
        id: 'you',
        title: 'Your Story',
        subtitle: 'Share now',
        initials:
          currentUser.full_name
            ?.split(' ')
            .map(name => name[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) ||
          currentUser.username?.slice(0, 2).toUpperCase() ||
          'YOU',
        accent: 'linear-gradient(135deg, #22d3ee, #38bdf8)',
      }
    : null;

  const stories = personalStory ? [personalStory, ...curatedStories] : curatedStories;

  return (
    <section className="stories-rail">
      <div className="stories-header">
        <div>
          <p className="stories-title">Today on Campus</p>
          <span className="stories-subtitle">Highlights curated for VIT students</span>
        </div>
        <button type="button" className="stories-action">
          Share update
        </button>
      </div>

      <div className="stories-track">
        {stories.map(story => (
          <article key={story.id} className="story-card">
            <div className="story-ring" style={{ background: story.accent }}>
              <div className="story-avatar">{story.initials}</div>
            </div>
            <p className="story-title">{story.title}</p>
            <span className="story-caption">{story.subtitle}</span>
          </article>
        ))}
      </div>
    </section>
  );
}